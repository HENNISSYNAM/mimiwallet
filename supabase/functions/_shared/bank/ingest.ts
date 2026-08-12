import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchTransactions, BankhubError, type BankhubConfig } from "./bankhub.ts";
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
      return { ...base, error: e.message, errorCode: e.errorCode };
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

  let inserted = 0;
  if (rows.length) {
    const { error: writeError, count } = await supabase
      .from("transactions")
      .upsert(
        rows.map((r) => ({ ...r, company_id: conn.company_id })),
        { onConflict: "company_id,reference_id", ignoreDuplicates: true, count: "exact" },
      );
    if (writeError) {
      console.error(`connection ${conn.id}: insert failed`, writeError.message);
      return { ...base, fetched: payload.transactions?.length ?? 0, error: "write failed" };
    }
    inserted = count ?? rows.length;
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
