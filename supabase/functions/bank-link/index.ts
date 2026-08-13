import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  bankhubConfigFromEnv,
  createGrantToken,
  createQrPay,
  exchangePublicToken,
  fetchTransactions,
  removeGrant,
  BankhubError,
} from "../_shared/bank/bankhub.ts";
import { ingestConnection } from "../_shared/bank/ingest.ts";
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
    async function hasBankConsent(): Promise<boolean> {
      const { data } = await supabase
        .from("consents")
        .select("id")
        .eq("user_id", user!.id)
        .eq("kind", "bank_data")
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

    switch (action) {
      // ── 1. Open Cas Link ──────────────────────────────────────────────────
      case "create-token": {
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
        const allowed = (Deno.env.get("BANKHUB_REDIRECT_URIS") ?? Deno.env.get("BANKHUB_REDIRECT_URI") ?? "")
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean);
        if (!allowed.length) return json({ error: "BANKHUB_REDIRECT_URIS is not set" }, 503);

        const origin = req.headers.get("Origin") ?? "";
        const redirectUri =
          allowed.find((u) => {
            try {
              return new URL(u).origin === origin;
            } catch {
              return false;
            }
          }) ?? allowed[0];

        if (origin && !redirectUri.startsWith(origin)) {
          console.warn(`origin ${origin} has no registered redirectUri; falling back to ${redirectUri}`);
        }

        const grant = await createGrantToken(cfg, {
          redirectUri,
          // `transaction` to read the statement, `qrpay` to raise a QR that
          // settles into the same account. Deliberately not `identity`: that
          // would also hand us the account holder's national ID number, date of
          // birth and address, which this product does not use and should
          // therefore not hold. Deliberately not `transfer` either — MIMI
          // records money in, it does not move money out.
          scopes: ["transaction", "qrpay"],
          language: "vi",
          // Cas caps this at 40 characters and shows it in their console, which
          // is what makes a support ticket traceable to one customer.
          name: `mimi-${company.id}`.slice(0, 40),
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
        });
      }

      // ── 2. Turn the Link result into stored connections ───────────────────
      case "exchange": {
        // Checked again here, not only at create-token. These are separate HTTP
        // calls and nothing stops a client skipping the first one.
        if (demoBlocked) {
          return json({ error: "Tài khoản demo không thể liên kết ngân hàng thật.", code: "DEMO_ACCOUNT" }, 403);
        }
        if (!(await hasBankConsent())) {
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
        const probe = await fetchTransactions(cfg, accessToken, {
          fromDate: isoDate(probeFromDate),
          toDate: probeTo,
        });
        const accounts = (probe.accounts ?? []).filter((a) => a.accountNumber);
        if (accounts.length === 0) {
          // Nothing to sync from, and storing a credential we cannot use is
          // pure liability, so hand it back to Cas immediately.
          await removeGrant(cfg, accessToken).catch(() => {});
          return json({ error: "Cas returned no accounts for this grant" }, 502);
        }

        const encrypted = await encryptField(accessToken, publicKey);
        // Cas does not tell us which institution the customer picked inside
        // Link, and neither /transactions nor /identity carries it. Rather than
        // print a bank name we have not been told, the row is labelled
        // generically and the UI leads with the account holder and number,
        // which are the parts Cas actually returns.
        const bankName = typeof body.bank_name === "string" ? body.bank_name : "Tài khoản ngân hàng";
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
        }));

        const { data: saved, error: saveError } = await supabase
          .from("bank_connections")
          .upsert(rows, { onConflict: "company_id,provider,account_number" })
          .select("id, account_number, account_name, bank_name");

        if (saveError) {
          console.error("failed to store grant:", saveError.message);
          // The grant exists at Cas but we cannot use it, so do not leave it
          // hanging against the customer's bank account.
          await removeGrant(cfg, accessToken).catch(() => {});
          return json({ error: "could not store connection" }, 500);
        }

        return json({ connections: saved, accountCount: saved?.length ?? 0 });
      }

      // ── 3. Pull transactions ──────────────────────────────────────────────
      case "sync": {
        let query = supabase
          .from("bank_connections")
          .select(
            "id, account_number, bank_name, access_token_enc, last_reference, direction_convention",
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

        const { data: conn } = await supabase
          .from("bank_connections")
          .select("id, access_token_enc, account_number")
          .eq("company_id", company.id)
          .eq("provider", "bankhub")
          .eq("status", "connected")
          .is("revoked_at", null)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!conn?.access_token_enc) {
          return json({ error: "Chưa có tài khoản ngân hàng nào đang kết nối." }, 404);
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
          if (e instanceof BankhubError && e.errorCode === "GRANT_NOT_FOUND") {
            // Almost always a grant issued before `qrpay` was requested rather
            // than a missing link, and the raw message would send the customer
            // hunting for the wrong problem.
            return json(
              {
                error:
                  "Liên kết hiện tại chưa có quyền tạo QR. Vui lòng liên kết lại tài khoản ngân hàng.",
                code: "QRPAY_SCOPE_MISSING",
                requestId: e.requestId,
              },
              409,
            );
          }
          throw e;
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
            await removeGrant(cfg, accessToken);
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
