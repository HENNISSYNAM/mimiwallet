import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  bankhubConfigFromEnv,
  createGrantToken,
  createUpdateGrantToken,
  createQrPay,
  simulateLoginError,
  type SimulatedLoginError,
  exchangePublicToken,
  fetchTransactions,
  fetchFiServices,
  fetchGdtInvoices,
  fetchQrPayIdentity,
  removeGrant,
  BankhubError,
} from "../_shared/bank/bankhub.ts";
import { ingestConnection } from "../_shared/bank/ingest.ts";
import { describeBankError } from "../_shared/bank/errors.ts";
import { mapGdtInvoices, revenueFromInvoices } from "../_shared/tax/gdt-invoice-map.ts";
import { reconcileCompanyQr } from "../_shared/ledger/qr-reconciler.ts";
import { resolveCompany } from "../_shared/company.ts";
import { encryptField, decryptField, type EncryptedBlob } from "../_shared/pqcCrypto.ts";

/**
 * Linking real bank accounts through Cas (BankHub), and pulling their history.
 *
 *   create-token → grantToken for Cas Link to open with
 *   exchange     → publicToken from Link becomes a stored, encrypted grant
 *   sync         → pull transactions into `transactions`
 *   disconnect   → end the grant at Cas and stop syncing
 *
 * This function holds credentials that read a real person's bank account, so
 * three rules run through all of it:
 *
 *  - The accessToken is encrypted before it is stored and is never put in a
 *    response body. The browser has no reason to hold it, and anything the
 *    browser holds ends up in logs and error reporters.
 *  - `redirectUri` comes from configuration, never from the request. If the
 *    caller could choose it, they could point Cas at a server they control and
 *    collect other people's publicTokens.
 *  - Every query is scoped by the company resolved from the caller's JWT. The
 *    service-role key bypasses RLS, so isolation is this code's job.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** How far back to reach on the first sync. The scoring model reads 12 months. */
const BACKFILL_MONTHS = 12;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    // Not `.single()`. Nothing stops a user owning several `companies` rows and
    // the demo account has four, three of them abandoned test entries. The
    // rule for picking one lives in _shared/company.ts so every function
    // resolves the same company for the same user.
    const company = await resolveCompany<{ id: string; name: string }>(
      supabase,
      user.id,
      "id, name",
    );
    if (!company) return json({ error: "No company found" }, 404);

    const action = new URL(req.url).searchParams.get("action");
    const body = await req.json().catch(() => ({}));

    // ── Two gates that must clear before any real bank account is touched ────
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_demo")
      .eq("user_id", user.id)
      .maybeSingle();

    /**
     * The demo account is shared and its password ships inside the JavaScript
     * bundle, on purpose, so that anyone can try the product. Linking a real
     * bank account to it would publish that person's statement to every visitor
     * of the site. The flag lives in the database precisely so the browser
     * cannot clear it.
     */
    const demoBlocked = profile?.is_demo === true;

    /**
     * Consent has to be recorded, not merely displayed. Nghị định 13/2023
     * requires it to be demonstrable afterwards — which means a row with a
     * timestamp and the version of the wording that was shown, not a checkbox
     * that left no trace.
     */
    /**
     * Consent is per data source, not one blanket yes.
     *
     * Reading bank statements and reading tax-authority invoices are separate
     * decisions about separate data, so agreeing to one must not silently admit
     * the other.
     */
    async function hasConsent(kind: "bank_data" | "tax_data"): Promise<boolean> {
      const { data } = await supabase
        .from("consents")
        .select("id")
        .eq("user_id", user!.id)
        .eq("kind", kind)
        .is("revoked_at", null)
        .limit(1);
      return !!data?.length;
    }

    const cfg = bankhubConfigFromEnv();
    const publicKey = Deno.env.get("PQC_KYC_PUBLIC_KEY");
    const privateKey = Deno.env.get("PQC_KYC_PRIVATE_KEY");
    if (!publicKey || !privateKey) {
      // Refusing to run is the point: without the keypair the only way to
      // continue would be to store the bank credential in clear text.
      console.error("PQC keypair missing — refusing to handle bank credentials");
      return json({ error: "server not configured for credential storage" }, 503);
    }

    const allowedRedirects = (
      Deno.env.get("BANKHUB_REDIRECT_URIS") ?? Deno.env.get("BANKHUB_REDIRECT_URI") ?? ""
    )
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    const requestOrigin = req.headers.get("Origin") ?? "";
    const redirectUri =
      allowedRedirects.find((u) => {
        try {
          return new URL(u).origin === requestOrigin;
        } catch {
          return false;
        }
      }) ?? allowedRedirects[0];
    if (requestOrigin && redirectUri && !redirectUri.startsWith(requestOrigin)) {
      console.warn(
        `origin ${requestOrigin} has no registered redirectUri; falling back to ${redirectUri}`,
      );
    }

    switch (action) {
      // ── 1. Open Cas Link ──────────────────────────────────────────────────
      case "create-token": {
        if (!allowedRedirects.length) return json({ error: "BANKHUB_REDIRECT_URIS is not set" }, 503);
        const forQrPay = body.feature === "qrpay";
        const forGdt = body.feature === "gdt";
        // Refused here rather than at `exchange`, so the customer is stopped
        // before Cas Link opens and asks them for their banking password.
        if (demoBlocked) {
          return json(
            { error: "Tài khoản demo không thể liên kết ngân hàng thật. Vui lòng đăng ký tài khoản riêng.", code: "DEMO_ACCOUNT" },
            403,
          );
        }
        /**
         * The redirect URI has to match the origin the customer is actually on.
         *
         * A single fixed value was set to localhost during development and left
         * there, so a link started from the deployed site handed Cas a
         * redirectUri pointing at a machine that was not the one browsing. Cas
         * completed the link, showed its success dialog, and then had nowhere to
         * return the publicToken to — the iframe simply stayed open and the
         * request log showed grant/token calls with no grant/exchange after
         * them.
         *
         * The Origin header is set by the browser and cannot be rewritten by
         * page script, so it is safe to key on. It is still checked against an
         * allow-list: every value here must also be registered in the Cas
         * console, and echoing back an arbitrary origin would turn this into a
         * way to point somebody else's grant at an attacker's page.
         */

        const grant = await createGrantToken(cfg, {
          redirectUri,
          /*
           * One grant per product, which is how Cas documents it.
           *
           * Asking for both at once looked economical and was wrong: the QR Pay
           * link screen collects an account number and holder name, and the
           * statement link screen collects a banking login. A grant demanding
           * `transaction` cannot be satisfied by a screen that never asks for a
           * login, so the QR link failed with a bare "Có lỗi xảy ra".
           *
           * Neither branch asks for `identity` — that would hand us the account
           * holder's national ID number, date of birth and address, which this
           * product does not use. Neither asks for `transfer`: MIMI records
           * money in, it does not move money out.
           */
          scopes: forGdt ? ["gdt"] : forQrPay ? ["qrpay"] : ["transaction"],
          language: "vi",
          // Opens Cas Link directly on one service instead of the bank picker.
          ...(typeof body.fi_service_id === "string" && body.fi_service_id
            ? { fiServiceId: body.fi_service_id }
            : {}),
          // Cas caps this at 40 characters and shows it in their console, which
          // is what makes a support ticket traceable to one customer.
          name: `mimi-${forQrPay ? "qr-" : ""}${company.id}`.slice(0, 40),
        });
        // The redirectUri travels back with the token deliberately. Cas Link
        // requires the browser to pass the same value the grant was created
        // with, and it must be one the Cas console has whitelisted — so it has
        // exactly one source of truth, here, rather than a copy in the frontend
        // build that can drift out of step.
        return json({
          grantToken: grant.grantToken,
          expiresAt: grant.expiredAt ?? grant.expiration ?? null,
          redirectUri,
          scopes: forGdt ? "gdt" : forQrPay ? "qrpay" : "transaction",
        });
      }

      // ── 2. Turn the Link result into stored connections ───────────────────
      case "exchange": {
        // Read before the consent gate below, so they must be declared first.
        const forQrPay = body.feature === "qrpay";
        const forGdt = body.feature === "gdt";
        // Checked again here, not only at create-token. These are separate HTTP
        // calls and nothing stops a client skipping the first one.
        if (demoBlocked) {
          return json({ error: "Tài khoản demo không thể liên kết ngân hàng thật.", code: "DEMO_ACCOUNT" }, 403);
        }
        if (!(await hasConsent(forGdt ? "tax_data" : "bank_data"))) {
          return json(
            { error: "Chưa ghi nhận sự đồng ý chia sẻ dữ liệu ngân hàng.", code: "CONSENT_REQUIRED" },
            403,
          );
        }

        const publicToken = typeof body.publicToken === "string" ? body.publicToken.trim() : "";
        if (!publicToken) return json({ error: "publicToken required" }, 400);

        const { accessToken, grantId } = await exchangePublicToken(cfg, publicToken);

        // One grant can cover several accounts, and each becomes its own
        // connection row so they can be synced and revoked independently.
        //
        // The account list comes from /transactions rather than /identity on
        // purpose. Both return it, but /identity also returns the holder's
        // legalId, birthday, address and phone — a national ID number that this
        // product has no use for. Not requesting the `identity` scope means Cas
        // never sends it, which is a stronger guarantee than receiving it and
        // choosing not to store it. A short window keeps the call cheap; the
        // real backfill happens in `sync`.
        const probeTo = isoDate(new Date());
        const probeFromDate = new Date();
        probeFromDate.setDate(probeFromDate.getDate() - 7);
        /*
         * The probe is best-effort, and its failure must not cost the grant.
         *
         * It used to call removeGrant and return 502 whenever no accounts came
         * back. That is right for a credential we can never use — but a QR Pay
         * link is exactly the case where it is wrong: that flow asks only for
         * an account number and holder name, so the bank may well report no
         * statement accounts while the grant is perfectly good for raising QR
         * codes. Destroying it would throw away a link the customer had just
         * finished making, and the message they would see blames Cas.
         */
        let accounts: Array<{ accountNumber?: string; accountName?: string }> = [];
        let qrBankName: string | null = null;
        try {
          if (forQrPay) {
            // Step 4 of Cas's QR Pay flow. /transactions has nothing to say
            // about a grant that never involved a banking login.
            const id = await fetchQrPayIdentity(cfg, accessToken);
            if (id.accountNumber) {
              accounts = [{ accountNumber: id.accountNumber, accountName: id.accountName }];
            }
            // Cas names the institution here, so a QR connection can show
            // "BIDV" instead of the generic label the statement flow has to
            // use — that flow is never told which bank was picked.
            qrBankName = id.fiService?.fiName ?? id.fiService?.name ?? null;
          } else {
            const probe = await fetchTransactions(cfg, accessToken, {
              fromDate: isoDate(probeFromDate),
              toDate: probeTo,
            });
            accounts = (probe.accounts ?? []).filter((a) => a.accountNumber);
          }
        } catch (e) {
          const code = e instanceof BankhubError ? e.errorCode : "unknown";
          console.warn(`grant ${grantId}: account probe failed (${code}); storing anyway`);
        }

        if (accounts.length === 0) {
          /*
           * Keyed on the grant rather than an account number, because
           * (company_id, provider, account_number) is unique and we have no
           * number to put there. `sync` skips rows without a real account
           * number; `create-qr` does not need one.
           */
          accounts = [{ accountNumber: `grant:${grantId}`, accountName: undefined }];
          console.log(`grant ${grantId}: no statement accounts, stored as QR-only connection`);
        }

        const encrypted = await encryptField(accessToken, publicKey);
        // Cas does not tell us which institution the customer picked inside
        // Link, and neither /transactions nor /identity carries it. Rather than
        // print a bank name we have not been told, the row is labelled
        // generically and the UI leads with the account holder and number,
        // which are the parts Cas actually returns.
        const bankName =
          qrBankName ?? (typeof body.bank_name === "string" ? body.bank_name : "Tài khoản ngân hàng");
        const bankCode = typeof body.bank_code === "string" ? body.bank_code : "CAS";

        const rows = accounts.map((a) => ({
          company_id: company.id,
          provider: "bankhub",
          // `bank_code` is still under a total unique index with company_id, and
          // a grant can return two accounts at the same bank, so the account
          // number is what keeps them apart. bank_name carries the readable one.
          bank_code: `${bankCode}:${a.accountNumber}`,
          bank_name: bankName ?? bankCode,
          account_number: a.accountNumber!,
          account_name: a.accountName ?? null,
          grant_id: grantId,
          access_token_enc: encrypted as unknown as Record<string, unknown>,
          status: "connected",
          consent_granted: true,
          revoked_at: null,
          scopes: forGdt ? "gdt" : forQrPay ? "qrpay" : "transaction",
        }));

        const { data: saved, error: saveError } = await supabase
          .from("bank_connections")
          /*
           * `scopes` nằm trong khoá xung đột, và đó là điểm mấu chốt.
           *
           * Một tài khoản cần hai liên kết: `qrpay` để phát mã, `transaction`
           * để thấy tiền về. Nếu khoá chỉ có `(company_id, provider,
           * account_number)` thì liên kết lần hai sẽ khớp dòng cũ và ghi đè
           * `scopes` — xoá mất grant QR mà không báo gì. Xem migration
           * 20260904220000.
           */
          .upsert(rows, { onConflict: "company_id,provider,account_number,scopes" })
          .select("id, account_number, account_name, bank_name");

        if (saveError) {
          console.error("failed to store grant:", saveError.message);
          // The grant exists at Cas but we cannot use it, so do not leave it
          // hanging against the customer's bank account.
          await removeGrant(cfg, accessToken).catch(() => {});
          return json({ error: "could not store connection" }, 500);
        }

        /*
         * Liên kết mới cùng loại thay thế liên kết cũ đã hỏng.
         *
         * VÌ SAO CẦN: arbiter của upsert là (company_id, provider,
         * account_number). Khi `fetchQrPayIdentity` thất bại, khối trên rơi về
         * khoá tổng hợp `grant:<grantId>` — mà `grantId` mới ở mỗi lần liên kết,
         * nên upsert KHÔNG khớp dòng cũ mà chèn dòng mới. Dòng `needs_relink` cũ
         * nằm lại vĩnh viễn: danh sách hiện hai dòng cho cùng một tài khoản, và
         * dải cảnh báo hổ phách sáng mãi dù người dùng vừa liên kết lại xong.
         *
         * Chỉ đổi trạng thái, KHÔNG xoá dòng: nó mang `revoked_at`, `grant_id`
         * cũ và dấu vết kiểm toán của một liên kết từng tồn tại thật. Giao diện
         * đã lọc `status != disconnected` nên nó tự biến khỏi danh sách.
         *
         * Giới hạn đúng `scopes` vừa ghi: một doanh nghiệp nhận QR từ hai ngân
         * hàng là hợp lệ, và liên kết đọc sao kê không liên quan gì tới việc
         * liên kết QR vừa được làm mới.
         */
        const scopeVuaGhi = forGdt ? "gdt" : forQrPay ? "qrpay" : "transaction";
        const idVuaGhi = (saved ?? []).map((r: { id: string }) => r.id);
        if (idVuaGhi.length) {
          const { error: supersedeError } = await supabase
            .from("bank_connections")
            .update({ status: "disconnected", revoked_at: new Date().toISOString() })
            .eq("company_id", company.id)
            .eq("provider", "bankhub")
            .eq("scopes", scopeVuaGhi)
            .eq("status", "needs_relink")
            .not("id", "in", `(${idVuaGhi.join(",")})`);
          // Không chặn phản hồi: liên kết mới đã lưu thành công rồi. Dọn dẹp
          // thất bại chỉ để lại một dòng thừa, không làm hỏng việc vừa làm.
          if (supersedeError) {
            console.error("supersede old connections:", supersedeError.message);
          }
        }

        return json({ connections: saved, accountCount: saved?.length ?? 0 });
      }

      // ── 3. Pull transactions ──────────────────────────────────────────────
      case "sync": {
        let query = supabase
          .from("bank_connections")
          .select(
            "id, account_number, bank_name, access_token_enc, last_reference, direction_convention, scopes",
          )
          .eq("company_id", company.id)
          .eq("provider", "bankhub")
          .eq("status", "connected")
          .is("revoked_at", null);
        if (typeof body.connection_id === "string") query = query.eq("id", body.connection_id);

        const { data: connections, error: connError } = await query;
        if (connError) return json({ error: connError.message }, 500);
        if (!connections?.length) return json({ error: "no connected Cas account" }, 404);

        const toDate = isoDate(new Date());
        const from = new Date();
        from.setMonth(from.getMonth() - BACKFILL_MONTHS);
        const fromDate = isoDate(from);

        const results: unknown[] = [];

        for (const conn of connections) {
          if (!conn.access_token_enc || !conn.account_number) continue;
          /*
           * Bộ chắn liên kết QR nay nằm trong `ingestConnection`, không nằm ở
           * đây nữa. Bản cũ hỏi `account_number.startsWith("grant:")` — tức đo
           * triệu chứng của một lần dò danh tính hỏng, không đo sự thật rằng
           * đây là liên kết QR. Ngày `fetchQrPayIdentity` chạy được và số tài
           * khoản thật được ghi vào, bộ chắn lặng lẽ ngừng bảo vệ, và grant QR
           * bị đập hỏng ngay sau khi tạo. Xem `_shared/bank/dong-bo.ts`.
           */

          let accessToken: string;
          try {
            accessToken = await decryptField(
              conn.access_token_enc as unknown as EncryptedBlob,
              privateKey,
            );
          } catch (e) {
            console.error(`connection ${conn.id}: cannot decrypt access token`, e);
            results.push({ connection_id: conn.id, error: "credential unreadable" });
            continue;
          }

          // Fetching, mapping and storing all live in _shared/bank/ingest.ts so
          // that a transaction arriving here by poll is written under exactly
          // the same rules as one arriving at cas-webhook by push.
          results.push(
            await ingestConnection(
              supabase,
              cfg,
              accessToken,
              { ...conn, company_id: company.id },
              { fromDate, toDate },
            ),
          );
        }

        // Payments that settled a QR may have just landed. Same call runs on
        // the webhook path, so an invoice closes identically either way.
        const reconciled = await reconcileCompanyQr(supabase, company.id);

        return json({ synced: results, reconciled });
      }

      // ── 5. Raise a QR that settles into the linked account ────────────────
      case "create-qr": {
        const amount = Math.round(Number(body.amount));
        if (!Number.isFinite(amount) || amount <= 0) {
          return json({ error: "amount phải là số nguyên dương (VND)" }, 400);
        }
        const description = typeof body.description === "string" ? body.description.trim() : "";
        if (!description) return json({ error: "description required" }, 400);
        /*
         * Giới hạn 9 ký tự của Cas/MB, phát hiện 04/09 qua requestId
         * `Bgv44JpvIbxfvfmr`: "description must has maximum 9 characters".
         * Không có trong tài liệu Cas.
         *
         * Chặn ở đây thay vì để Cas từ chối, vì Cas trả câu tiếng Anh còn chỗ
         * này biết nói tiếng Việt — và vì một lần gọi bị từ chối vẫn tính vào
         * giới hạn tần suất của grant.
         */
        if (description.length > 9) {
          return json({
            error: `Nội dung mã QR tối đa 9 ký tự — đang thừa ${description.length - 9}.`,
            errorCode: "INVALID_PARAM",
            action: "fix_input",
            remedy: "Rút ngắn nội dung. Đối soát không dựa vào ô này; MIMI khớp bằng mã tham chiếu riêng.",
          }, 400);
        }
        const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id : null;

        // An invoice from another company must not be payable through this one.
        if (invoiceId) {
          const { data: inv } = await supabase
            .from("invoices")
            .select("id")
            .eq("id", invoiceId)
            .eq("company_id", company.id)
            .maybeSingle();
          if (!inv) return json({ error: "invoice not found" }, 404);
        }

        /*
         * Only a connection linked for QR Pay can raise one. Taking the oldest
         * connection regardless — as this did — meant someone who linked a
         * QR-capable bank second was still told their bank does not support QR
         * Pay, with the wrong bank named.
         */
        const { data: conn } = await supabase
          .from("bank_connections")
          .select("id, access_token_enc, account_number")
          .eq("company_id", company.id)
          .eq("provider", "bankhub")
          .eq("status", "connected")
          .eq("scopes", "qrpay")
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!conn?.access_token_enc) {
          return json(
            {
              error: "Chưa có tài khoản ngân hàng nào được liên kết để nhận tiền QR.",
              action: "relink",
              remedy:
                'Vào Fintech Hub và bấm "Liên kết để nhận tiền QR" — QR Pay cần một liên kết riêng, không dùng chung với liên kết đọc sao kê.',
            },
            404,
          );
        }

        const accessToken = await decryptField(
          conn.access_token_enc as unknown as EncryptedBlob,
          privateKey,
        );

        /*
         * Generated here, never taken from the request. This value comes back
         * on the TRANSACTIONS webhook and is what marks an invoice paid, so a
         * caller who could choose it could settle someone else's invoice by
         * raising a QR that reuses their reference.
         *
         * Hex only: Cas does not document a charset, and the safest reading of
         * an undocumented field is the narrowest one.
         */
        const referenceNumber = crypto.randomUUID().replace(/-/g, "").slice(0, 20);

        let qr;
        try {
          qr = await createQrPay(cfg, accessToken, { amount, description, referenceNumber });
        } catch (e) {
          if (!(e instanceof BankhubError)) throw e;

          /*
           * Cas's own message, plus the remedy its documented code maps to.
           *
           * This used to name a cause: first "the link predates QR", then the
           * same line again when the real answer was that the bank does not
           * sell QR Pay at all. Two wrong diagnoses in a row, both stated as
           * fact. The remedy now comes from the code table, and an unknown code
           * gets no remedy rather than an invented one.
           */
          const { action, remedy } = describeBankError(e.errorCode);
          return json(
            {
              error: e.message,
              errorCode: e.errorCode,
              action,
              remedy,
              requestId: e.requestId,
            },
            action === 'wait' ? 429 : 409,
          );
        }

        const { data: saved, error: saveError } = await supabase
          .from("qr_payments")
          .insert({
            company_id: company.id,
            invoice_id: invoiceId,
            reference_number: referenceNumber,
            amount,
            description,
            account_number: qr.accountNumber ?? conn.account_number,
            virtual_account_number: qr.virtualAccountNumber ?? null,
            bin: qr.bin ?? null,
            qr_code: qr.qrCode ?? null,
          })
          .select("id, reference_number, amount, description, virtual_account_number, bin, qr_code, status")
          .single();

        if (saveError) {
          console.error("failed to store qr payment:", saveError.message);
          // The QR exists at Cas but we cannot reconcile a payment we have no
          // record of, so it is better to fail loudly than to show a QR that
          // will take money nobody can match.
          return json({ error: "could not store QR" }, 500);
        }

        return json({ qr: saved });
      }

      // ── 6. Re-authenticate an existing grant (Cas "Update Mode") ──────────
      case "update-token": {
        if (!allowedRedirects.length) return json({ error: "BANKHUB_REDIRECT_URIS is not set" }, 503);
        if (demoBlocked) {
          return json({ error: "Tài khoản demo không thể liên kết ngân hàng thật.", code: "DEMO_ACCOUNT" }, 403);
        }
        const connectionId = typeof body.connection_id === "string" ? body.connection_id : "";
        if (!connectionId) return json({ error: "connection_id required" }, 400);

        const { data: conn } = await supabase
          .from("bank_connections")
          .select("id, access_token_enc, scopes")
          .eq("id", connectionId)
          .eq("company_id", company.id)
          .maybeSingle();
        if (!conn?.access_token_enc) {
          return json({ error: "connection not found" }, 404);
        }

        const accessToken = await decryptField(
          conn.access_token_enc as unknown as EncryptedBlob,
          privateKey,
        );

        try {
          const grant = await createUpdateGrantToken(cfg, accessToken, {
            redirectUri,
            // The same products the grant already carries. Asking for more
            // here would quietly widen a consent the customer gave once.
            scopes: (conn.scopes ?? "transaction").split(","),
          });
          return json({
            grantToken: grant.grantToken,
            expiresAt: grant.expiredAt ?? grant.expiration ?? null,
            redirectUri,
            scopes: conn.scopes ?? "transaction",
          });
        } catch (e) {
          if (e instanceof BankhubError && e.errorCode === "FI_SERVICE_ACCOUNT_CONNECTING") {
            // Documented as "nothing to update", not a failure. The connection
            // was parked on a stale error, so let it go back to work.
            await supabase
              .from("bank_connections")
              .update({ status: "connected", revoked_at: null })
              .eq("id", conn.id)
              .eq("company_id", company.id);
            return json({ upToDate: true, message: "Liên kết vẫn hoạt động, không cần cập nhật." });
          }
          throw e;
        }
      }

      // ── Which banks this app can link, for a given product ────────────────
      case "fi-services": {
        const services = await fetchFiServices(cfg);
        const wantQr = body.feature === "qrpay";
        /*
         * Cas has no product field on a service — the product lives in the
         * `code` (`bidv_qrpay`, `vietcombank_biz_qrpay`). Matching on it is
         * blunt but it is the only signal there is, and getting it wrong only
         * means a service is missing from a picker rather than a wrong bank
         * being linked: the QR call would still fail loudly at Cas.
         */
        const filtered = wantQr ? services.filter((f) => /qrpay|vietqr/i.test(f.code)) : services;
        // Cas returns duplicate codes across PERSONAL/ENTERPRISE rows.
        const seen = new Set<string>();
        const unique = filtered.filter((f) => {
          const key = `${f.code}:${f.type ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return json({
          services: unique.map((f) => ({
            id: f.id,
            code: f.code,
            name: f.name,
            type: f.type,
            logo: f.logo,
            fiName: f.fiName,
          })),
        });
      }

      // ── Which Cas environment this deployment talks to ────────────────────
      case "env": {
        // The browser cannot know this on its own: the keys and base URL live
        // in edge-function secrets. Without it the sandbox-only controls would
        // have to be gated on a build flag, which would either hide them on the
        // deployed build people actually test with, or show them in production.
        return json({ environment: cfg.baseUrl.includes("sandbox") ? "sandbox" : "production" });
      }

      // ── 7. Sandbox only: break a grant on purpose ─────────────────────────
      case "sandbox-reset-login": {
        // The environment gate, not a feature flag. This action exists to break
        // a bank connection, so production must never be able to reach it —
        // and the check reads the same config the API calls use, so it cannot
        // drift out of step with which server we are actually talking to.
        if (!cfg.baseUrl.includes("sandbox")) {
          return json({ error: "Chỉ dùng được trên sandbox.", code: "SANDBOX_ONLY" }, 403);
        }

        const connectionId = typeof body.connection_id === "string" ? body.connection_id : "";
        const errorCode = body.error_code as SimulatedLoginError;
        if (!connectionId) return json({ error: "connection_id required" }, 400);
        if (!["GRANT_LOGIN_REQUIRED", "OTP_REQUIRED", "PREVENTED"].includes(errorCode)) {
          return json({ error: "error_code không hợp lệ" }, 400);
        }

        const { data: conn } = await supabase
          .from("bank_connections")
          .select("id, access_token_enc")
          .eq("id", connectionId)
          .eq("company_id", company.id)
          .maybeSingle();
        if (!conn?.access_token_enc) return json({ error: "connection not found" }, 404);

        const accessToken = await decryptField(
          conn.access_token_enc as unknown as EncryptedBlob,
          privateKey,
        );
        const res = await simulateLoginError(cfg, accessToken, errorCode);
        return json({ simulated: errorCode, requestId: res.requestId });
      }

      // ── 8. Pull e-invoices from the tax authority ─────────────────────────
      case "gdt-sync": {
        const { data: comp } = await supabase
          .from("companies")
          .select("tax_id")
          .eq("id", company.id)
          .maybeSingle();
        const companyTaxCode = comp?.tax_id ?? "";
        if (!companyTaxCode) {
          // Without it, an invoice cannot be told from a purchase. Better to
          // ask for the tax code than to book money on a guess.
          return json(
            {
              error: "Chưa có mã số thuế của doanh nghiệp.",
              action: "need_tax_id",
              remedy: "Vào Cài đặt và điền mã số thuế — thiếu nó thì không phân biệt được hoá đơn bán ra và mua vào.",
            },
            400,
          );
        }

        const { data: conn } = await supabase
          .from("bank_connections")
          .select("id, access_token_enc")
          .eq("company_id", company.id)
          .eq("provider", "bankhub")
          .eq("scopes", "gdt")
          .eq("status", "connected")
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!conn?.access_token_enc) {
          return json(
            {
              error: "Chưa kết nối Tổng Cục Thuế.",
              action: "relink",
              remedy: 'Vào Fintech Hub và bấm "Kết nối Tổng Cục Thuế".',
            },
            404,
          );
        }

        const accessToken = await decryptField(
          conn.access_token_enc as unknown as EncryptedBlob,
          privateKey,
        );

        const toDate = isoDate(new Date());
        const from = new Date();
        from.setMonth(from.getMonth() - BACKFILL_MONTHS);
        const fromDate = typeof body.from_date === "string" ? body.from_date : isoDate(from);

        const payload = await fetchGdtInvoices(cfg, accessToken, { fromDate, toDate });
        const { rows, rejected } = mapGdtInvoices(
          (payload.gdtInvoices ?? []) as never[],
          { companyTaxCode },
        );

        if (rejected.length) {
          console.warn(`gdt sync ${company.id}: skipped ${rejected.length}`, rejected.slice(0, 10));
        }

        let stored = 0;
        if (rows.length) {
          const { error: writeError } = await supabase
            .from("gdt_invoices")
            .upsert(
              rows.map((r) => ({ ...r, company_id: company.id, synced_at: new Date().toISOString() })),
              { onConflict: "company_id,gdt_id" },
            );
          if (writeError) {
            console.error("gdt invoice write failed:", writeError.message);
            return json({ error: "could not store invoices" }, 500);
          }
          stored = rows.length;
        }

        const issued = rows.filter((r) => r.direction === "issued");
        return json({
          fetched: payload.gdtInvoices?.length ?? 0,
          stored,
          skipped: rejected.length,
          issued: issued.length,
          received: rows.length - issued.length,
          // The figure the 1 tỷ threshold is measured against — now from the tax
          // authority's own record rather than inferred from bank descriptions.
          revenueFromInvoices: revenueFromInvoices(rows),
          window: { fromDate, toDate },
        });
      }

      // ── 4. Stop ───────────────────────────────────────────────────────────
      case "disconnect": {
        const connectionId = typeof body.connection_id === "string" ? body.connection_id : "";
        if (!connectionId) return json({ error: "connection_id required" }, 400);

        const { data: conn } = await supabase
          .from("bank_connections")
          .select("id, access_token_enc")
          .eq("id", connectionId)
          .eq("company_id", company.id)
          .maybeSingle();
        if (!conn) return json({ error: "connection not found" }, 404);

        if (conn.access_token_enc) {
          try {
            const accessToken = await decryptField(
              conn.access_token_enc as unknown as EncryptedBlob,
              privateKey,
            );
            const removal = await removeGrant(cfg, accessToken);

            /*
             * Some banks will not end an authorisation without the customer
             * confirming by OTP. Cas signals that by answering with a
             * grantToken instead of a completion — acceptance case 4.
             *
             * Nothing has been removed at this point, so the local row must NOT
             * be marked disconnected. Doing that would leave MIMI showing
             * "đã ngắt kết nối" while the bank still considers the data
             * authorised — telling the customer their access is closed when it
             * is open is the one failure mode this endpoint must never have.
             *
             * The grantToken goes back to the browser, which opens Cas Link on
             * it exactly as it does for a normal link. The customer finishes the
             * OTP there and calls disconnect again.
             */
            if (removal.otpRequired) {
              return json({
                otp_required: true,
                grant_token: removal.grantToken,
                // Same configured value every other Cas Link flow uses; the
                // browser needs it to open the OTP screen and must never be
                // allowed to supply its own.
                redirectUri,
                connection_id: connectionId,
                message:
                  "Ngân hàng yêu cầu xác thực OTP trước khi ngắt kết nối. Hãy hoàn tất bước xác thực, liên kết sẽ được gỡ ngay sau đó.",
              });
            }
          } catch (e) {
            // Log, but still disconnect on our side. A customer asking to
            // disconnect must not be blocked by Cas being unreachable.
            console.error(`connection ${connectionId}: remote revoke failed`, e);
          }
        }

        await supabase
          .from("bank_connections")
          .update({
            status: "disconnected",
            revoked_at: new Date().toISOString(),
            // The credential is useless now and keeping it is only risk.
            access_token_enc: null,
            grant_id: null,
          })
          .eq("id", connectionId)
          .eq("company_id", company.id);

        return json({ disconnected: connectionId });
      }

      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    if (e instanceof BankhubError) {
      console.error(`Cas error ${e.errorCode} (${e.requestId ?? "no request id"}): ${e.message}`);
      return json({ error: e.message, errorCode: e.errorCode, requestId: e.requestId }, 502);
    }
    console.error("bank-link failed:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
