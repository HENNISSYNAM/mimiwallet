import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { mapSepayWebhook } from "../_shared/bank/sepay-map.ts";

/**
 * Public endpoint SePay posts to when a transaction hits a linked bank account.
 *
 * Three things about this function are dictated by SePay's contract rather than
 * by taste, and getting any of them wrong causes duplicate transactions:
 *
 *  1. It must answer HTTP 200 with a body of {"success": true} inside 30
 *     seconds. Anything else — including a 500 with a helpful error message —
 *     is read as failure and retried up to 7 times over 5 hours.
 *  2. Because retries are guaranteed rather than exceptional, the write must be
 *     idempotent. That is the partial unique index on
 *     (company_id, reference_id) plus an upsert that ignores conflicts.
 *  3. A payload we cannot use is still answered 200. Retrying a malformed
 *     payload will never succeed; it would just occupy SePay's queue for five
 *     hours and bury real failures in the logs.
 *
 * There is no user JWT here, so `verify_jwt = false` is set for this function in
 * supabase/config.toml and authentication is the shared webhook key instead.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Always 200 + {"success": true} — see note 1 above. */
function ack(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Compares in time independent of how many characters match, so an attacker
 * cannot recover the key one byte at a time by measuring response latency.
 */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Length still leaks, which is acceptable: the key length is not the secret.
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("SEPAY_WEBHOOK_KEY");
  if (!expected) {
    // Refusing to run unauthenticated is the point: a missing secret must not
    // silently downgrade a public write endpoint to no auth at all.
    console.error("SEPAY_WEBHOOK_KEY is not set — refusing every request");
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("authorization") ?? "";
  const presented = auth.replace(/^Apikey\s+/i, "").trim();
  if (!safeEqual(presented, expected)) {
    console.warn("rejected webhook: bad or missing Apikey");
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    console.warn("rejected webhook: body is not JSON");
    return ack({ ignored: "invalid json" });
  }

  const { row, reason, accountNumber } = mapSepayWebhook(payload as never);
  if (!row) {
    console.warn(`ignored webhook for account ${accountNumber ?? "?"}: ${reason}`);
    return ack({ ignored: reason });
  }

  // Service role, because there is no signed-in user on this path. RLS is
  // therefore bypassed, so every query below scopes itself to the company the
  // account number resolves to — the isolation has to come from this code.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: conn, error: connError } = await supabase
    .from("bank_connections")
    .select("id, company_id")
    .eq("provider", "sepay")
    .eq("account_number", accountNumber)
    .eq("status", "connected")
    .maybeSingle();

  if (connError) {
    // A database hiccup is worth retrying, unlike a bad payload, so this is the
    // one path that deliberately returns a non-200.
    console.error("lookup failed:", connError.message);
    return new Response(JSON.stringify({ error: "lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!conn) {
    console.warn(`no connected sepay account matches ${accountNumber}`);
    return ack({ ignored: "unknown account" });
  }

  const { error: writeError } = await supabase
    .from("transactions")
    .upsert(
      { ...row, company_id: conn.company_id },
      { onConflict: "company_id,reference_id", ignoreDuplicates: true },
    );

  if (writeError) {
    console.error("insert failed:", writeError.message);
    return new Response(JSON.stringify({ error: "write failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("bank_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", conn.id);

  console.log(
    `stored ${row.type} ${row.amount} for company ${conn.company_id} (${row.reference_id})`,
  );
  return ack();
});
