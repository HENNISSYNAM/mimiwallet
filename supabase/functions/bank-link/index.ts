import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  bankhubConfigFromEnv,
  createGrantToken,
  exchangePublicToken,
  fetchTransactions,
  removeGrant,
  BankhubError,
} from "../_shared/bank/bankhub.ts";
import {
  mapBankhubTransactions,
  latestReference,
  type DirectionConvention,
} from "../_shared/bank/bankhub-map.ts";
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
    // the demo account has four, three of them abandoned test entries — under
    // `.single()` PostgREST returns an error for >1 row and the caller sees
    // "No company found", which is both wrong and impossible to diagnose from
    // the message. Oldest row wins, so the choice is stable between calls
    // rather than depending on whatever order the planner happens to return.
    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
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
          // `transaction` only. Adding `identity` would also hand us the
          // account holder's national ID number, date of birth and address,
          // which this product does not use and should therefore not hold.
          scopes: ["transaction"],
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

          let payload;
          try {
            payload = await fetchTransactions(cfg, accessToken, {
              fromDate,
              toDate,
              accounts: [
                {
                  accountNumber: conn.account_number,
                  // Resume from what we already have; absent on the first run,
                  // which is what makes that run a full backfill.
                  ...(conn.last_reference ? { fromReference: conn.last_reference } : {}),
                },
              ],
            });
          } catch (e) {
            if (e instanceof BankhubError && e.needsRelink) {
              // The customer's authorisation lapsed or was withdrawn. Mark it
              // so the UI can ask them to re-link instead of retrying forever.
              await supabase
                .from("bank_connections")
                .update({ status: "needs_relink", revoked_at: new Date().toISOString() })
                .eq("id", conn.id)
                .eq("company_id", company.id);
              results.push({ connection_id: conn.id, error: e.errorCode, needsRelink: true });
              continue;
            }
            console.error(`connection ${conn.id}: transaction fetch failed`, e);
            results.push({ connection_id: conn.id, error: (e as Error).message });
            continue;
          }

          const pinned = (conn.direction_convention ?? undefined) as DirectionConvention | undefined;
          const { rows, rejected, report, applied } = mapBankhubTransactions(payload, {
            sourceBank: conn.bank_name,
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
                rows.map((r) => ({ ...r, company_id: company.id })),
                { onConflict: "company_id,reference_id", ignoreDuplicates: true, count: "exact" },
              );
            if (writeError) {
              console.error(`connection ${conn.id}: insert failed`, writeError.message);
              results.push({ connection_id: conn.id, error: "write failed" });
              continue;
            }
            inserted = count ?? rows.length;
          }

          const update: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
          const cursor = latestReference(payload.transactions ?? [], conn.account_number);
          if (cursor) update.last_reference = cursor;
          // Only pin the convention once the data actually settled it. Writing
          // the fallback here would turn a guess into a stored fact.
          if (!pinned && report.convention !== "unknown") {
            update.direction_convention = report.convention;
          }

          await supabase
            .from("bank_connections")
            .update(update)
            .eq("id", conn.id)
            .eq("company_id", company.id);

          results.push({
            connection_id: conn.id,
            account_number: conn.account_number,
            fetched: payload.transactions?.length ?? 0,
            inserted,
            skipped: rejected.length,
            // Surfaced so a wrong reading is visible in the response rather
            // than only in the numbers on a dashboard.
            directionConvention: applied,
            conventionEvidence: report,
          });
        }

        return json({ synced: results });
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
