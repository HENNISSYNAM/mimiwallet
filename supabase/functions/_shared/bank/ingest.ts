import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { coSaoKeDeDoc } from "./dong-bo.ts";
import { fetchTransactions, BankhubError, type BankhubConfig } from "./bankhub.ts";
import { describeBankError, type BankErrorAction } from "./errors.ts";
import {
  mapBankhubTransactions,
  latestReference,
  type ConventionReport,
  type DirectionConvention,
} from "./bankhub-map.ts";

/**
 * Pull one connection's transactions from Cas and store them.
 *
 * This lives here rather than inside `bank-link` because two callers need it
 * and they must behave identically:
 *
 *   bank-link?action=sync  — the customer pressed a button
 *   cas-webhook            — Cas told us something happened
 *
 * If those two had separate copies, a transaction arriving by push could be
 * written under different rules than the same transaction arriving by poll —
 * a different sign convention, a different dedupe key — and the difference
 * would show up as money appearing or vanishing depending on which path ran
 * first. One function, one set of rules.
 *
 * The caller supplies the decrypted accessToken. Decryption stays in the edge
 * functions that already hold the private key, so this module never touches it.
 */

export interface IngestConnection {
  id: string;
  company_id: string;
  account_number: string;
  bank_name: string | null;
  last_reference: string | null;
  direction_convention: string | null;
  /** `transaction` | `qrpay` | `gdt`. Quyết định có sao kê để đọc hay không. */
  scopes?: string | null;
}

export interface IngestResult {
  connection_id: string;
  account_number: string;
  fetched: number;
  inserted: number;
  skipped: number;
  directionConvention?: DirectionConvention;
  conventionEvidence?: ConventionReport;
  error?: string;
  errorCode?: string;
  needsRelink?: boolean;
  /**
   * What kind of failure this is, from `errors.ts`'s documented code table —
   * carried all the way to the UI so a connection that is fine on MIMI's side
   * but blocked on the bank's side (`reauth_in_bank_app`, e.g. the customer
   * turned on "block website login") gets a remedy that says so, rather than
   * `needsRelink: false` reading as "nothing wrong" the moment the one-shot
   * toast for it has scrolled away.
   */
  action?: BankErrorAction;
  remedy?: string;
}

export interface IngestWindow {
  fromDate: string;
  toDate: string;
}

export async function ingestConnection(
  supabase: SupabaseClient,
  cfg: BankhubConfig,
  accessToken: string,
  conn: IngestConnection,
  window: IngestWindow,
): Promise<IngestResult> {
  /*
   * CHỐT CHẶN, VÀ NÓ PHẢI Ở ĐÂY CHỨ KHÔNG Ở NƠI GỌI.
   *
   * Grant `qrpay` không có scope `transaction`. Gọi `/transactions` lên nó thì
   * Cas từ chối, lỗi rơi vào nhánh `needsRelink` bên dưới, và liên kết QR vừa
   * tạo xong bị đánh dấu hỏng. Casso đẩy `DEFAULT_UPDATE` rất dày nên chuyện
   * này lặp lại vài giây một lần — người dùng liên kết lại bao nhiêu lần cũng
   * thua. Đó đúng là sự việc ngày 04/09.
   *
   * Hai đường tới hàm này: `bank-link` (đồng bộ theo yêu cầu) và `cas-webhook`
   * (đẩy từ Casso). Đường thứ hai chưa từng có bộ chắn nào. Đặt ở đây thì cả
   * hai, và mọi đường viết sau, đều đi qua.
   *
   * Trả về kết quả rỗng chứ KHÔNG phải lỗi: không có gì để đọc không phải là
   * hỏng, và ghi nó thành lỗi là quay lại đúng cái bẫy vừa thoát.
   */
  if (!coSaoKeDeDoc(conn)) {
    return {
      connection_id: conn.id,
      account_number: conn.account_number,
      fetched: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const base = {
    connection_id: conn.id,
    account_number: conn.account_number,
    fetched: 0,
    inserted: 0,
    skipped: 0,
  };

  let payload;
  try {
    /*
     * `accounts` is omitted entirely on a first sync. Cas documents
     * `fromReference` as an optional cursor, but an entry inside `accounts`
     * is rejected without one — "fromReference là bắt buộc". With no previous
     * reference there is nothing to send, so the date window does the work and
     * Cas returns every account on the grant; the mapper filters to this
     * connection's own account, which it does anyway.
     */
    payload = await fetchTransactions(cfg, accessToken, {
      fromDate: window.fromDate,
      toDate: window.toDate,
      ...(conn.last_reference
        ? { accounts: [{ accountNumber: conn.account_number, fromReference: conn.last_reference }] }
        : {}),
    });
  } catch (e) {
    if (e instanceof BankhubError && e.needsRelink) {
      // The customer's authorisation lapsed or was withdrawn. Mark it so the
      // UI can ask them to re-link instead of retrying forever.
      await supabase
        .from("bank_connections")
        .update({ status: "needs_relink", revoked_at: new Date().toISOString() })
        .eq("id", conn.id);
      return { ...base, errorCode: e.errorCode, needsRelink: true };
    }
    if (e instanceof BankhubError) {
      console.error(`connection ${conn.id}: Cas said ${e.errorCode}`, e.message);
      const { action, remedy } = describeBankError(e.errorCode);
      return { ...base, error: e.message, errorCode: e.errorCode, action, remedy };
    }
    console.error(`connection ${conn.id}: transaction fetch failed`, e);
    return { ...base, error: (e as Error).message };
  }

  const pinned = (conn.direction_convention ?? undefined) as DirectionConvention | undefined;
  const { rows, rejected, report, applied } = mapBankhubTransactions(payload, {
    sourceBank: conn.bank_name ?? undefined,
    accountNumber: conn.account_number,
    convention: pinned,
  });

  if (rejected.length) {
    console.warn(`connection ${conn.id}: skipped ${rejected.length}`, rejected.slice(0, 10));
  }

  /**
   * The Cas sandbox invents a new batch of transactions on every call.
   *
   * Verified rather than assumed: three identical 7-day requests each stored 8
   * more rows, the table grew 375 → 383, every reference was distinct, and no
   * two rows shared a (date, amount, description). The descriptions come from a
   * fixed pool — one of them appears 15 times across a full year with a
   * different amount each time — so the pool is real-looking but the rows are
   * generated per request.
   *
   * That means dedupe can never fire here: there is nothing to dedupe. It also
   * means these rows are not this company's money, and summing them as revenue
   * is the same mistake `is_synthetic` was added to stop — arriving through the
   * "real" door instead of the demo one. Marking them at write time is the only
   * place the environment is still known.
   *
   * When production credentials replace the sandbox ones, this flips off by
   * itself and real rows count as real.
   */
  const synthetic = cfg.baseUrl.includes("sandbox");

  /**
   * Counted before and after the write rather than read from `count: "exact"`.
   *
   * Whether `count` reports rows sent or rows stored was never settled — no
   * duplicate ever occurred against this sandbox, so the two numbers were never
   * observed to differ. The difference between two counts is unambiguous, and
   * two index-backed COUNTs cost nothing next to the Cas round trip that just
   * happened. It can undercount if a webhook and a manual sync overlap, which
   * costs an accurate log line and nothing more.
   */
  const countRows = async () => {
    const { count } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("company_id", conn.company_id);
    return count ?? 0;
  };

  let inserted = 0;
  if (rows.length) {
    const before = await countRows();
    const { error: writeError } = await supabase
      .from("transactions")
      .upsert(
        rows.map((r) => ({ ...r, company_id: conn.company_id, is_synthetic: synthetic })),
        { onConflict: "company_id,reference_id", ignoreDuplicates: true },
      );
    if (writeError) {
      console.error(`connection ${conn.id}: insert failed`, writeError.message);
      return { ...base, fetched: payload.transactions?.length ?? 0, error: "write failed" };
    }
    inserted = Math.max(0, (await countRows()) - before);
  }

  const update: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
  const cursor = latestReference(payload.transactions ?? [], conn.account_number);
  if (cursor) update.last_reference = cursor;
  // Only pin the convention once the data actually settled it. Writing the
  // fallback here would turn a guess into a stored fact.
  if (!pinned && report.convention !== "unknown") {
    update.direction_convention = report.convention;
  }

  await supabase.from("bank_connections").update(update).eq("id", conn.id);

  return {
    connection_id: conn.id,
    account_number: conn.account_number,
    fetched: payload.transactions?.length ?? 0,
    inserted,
    skipped: rejected.length,
    // Surfaced so a wrong reading is visible in the response rather than only
    // in the numbers on a dashboard.
    directionConvention: applied,
    conventionEvidence: report,
  };
}
