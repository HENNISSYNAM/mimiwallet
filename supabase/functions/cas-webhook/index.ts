import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  bankhubConfigFromEnv,
  fetchTransactions,
  BankhubError,
} from "../_shared/bank/bankhub.ts";
import { decryptField, type EncryptedBlob } from "../_shared/pqcCrypto.ts";

/**
 * Inbound webhooks from Cas (BankHub).
 *
 * Casso's webhook form has four fields — name, description, URL, category —
 * and no signing secret. So there is no way to prove a request came from them.
 * That single fact decides the whole design of this function:
 *
 *   **The payload is a hint to go and check, never an instruction.**
 *
 * A body claiming "grant X was revoked" does not revoke anything here. It makes
 * us call Cas and ask about grant X. If Cas says the grant is gone, we act on
 * Cas's answer. A forged webhook therefore costs one API call and changes
 * nothing — the worst it can do is make us re-confirm something that is true.
 *
 * A shared key is still required in the URL, as a cheap filter so random
 * internet noise never reaches the verification step. It is a filter, not the
 * security boundary; the verification call is the boundary.
 *
 * Everything that arrives is written to `webhook_events` before any decision,
 * including bodies we cannot parse. We do not have a schema for these payloads,
 * and guessing at an undocumented shape is exactly what cost four rounds of
 * wrong fixes on the Cas Link flow. The first real delivery will tell us.
 *
 * Like the SePay endpoint, this answers 200 to almost everything: a webhook a
 * provider considers failed gets retried, and retrying a payload that can never
 * be handled just buries real failures in their queue.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ack(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Constant-time compare, so the key cannot be recovered a byte at a time. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/**
 * The key can travel as `?key=…` or as a trailing path segment, because it is
 * not yet known whether Casso's URL field accepts a query string. Supporting
 * both costs three lines and removes a round trip through their console.
 */
function presentedKey(url: URL): string {
  const q = url.searchParams.get("key");
  if (q) return q.trim();
  const parts = url.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("cas-webhook");
  return i >= 0 && parts.length > i + 1 ? parts[i + 1].trim() : "";
}

/** Pull a string out of a nested object by trying several plausible paths. */
function pick(obj: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = undefined;
        break;
      }
    }
    if (typeof cur === "string" && cur) return cur;
  }
  return undefined;
}

/**
 * Cas's envelope is undocumented in the material we have, so read defensively
 * rather than assume. Anything not found stays undefined and is recorded as
 * such — an unparsed field must look unparsed, not like an absent event.
 */
function extract(payload: unknown) {
  return {
    type: pick(payload, [["type"], ["webhookType"], ["event"], ["eventType"], ["data", "type"]]),
    code: pick(payload, [
      ["code"], ["errorCode"], ["eventCode"], ["status"],
      ["data", "code"], ["data", "status"],
    ]),
    grantId: pick(payload, [
      ["grantId"], ["grant_id"], ["grant", "id"],
      ["data", "grantId"], ["data", "grant_id"], ["data", "grant", "id"],
    ]),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("CAS_WEBHOOK_KEY");
  if (!expected) {
    // Refusing to run is the point. A missing secret must never quietly turn a
    // public endpoint into an unauthenticated one — that is the same shape of
    // bug as the demo-credential defaults that once signed every visitor in.
    console.error("CAS_WEBHOOK_KEY is not set — refusing every request");
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!safeEqual(presentedKey(new URL(req.url)), expected)) {
    console.warn("rejected cas webhook: bad or missing key");
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { unparsed: raw.slice(0, 4000) };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { type, code, grantId } = extract(payload);

  // Recorded before any decision, so even a body we handle badly is auditable.
  const { data: event } = await supabase
    .from("webhook_events")
    .insert({
      provider: "bankhub",
      event_type: type ?? null,
      event_code: code ?? null,
      grant_id: grantId ?? null,
      payload: payload as Record<string, unknown>,
      outcome: "received",
    })
    .select("id")
    .maybeSingle();

  const finish = async (outcome: string, note?: string) => {
    if (event?.id) {
      await supabase
        .from("webhook_events")
        .update({ outcome, note: note ?? null })
        .eq("id", event.id);
    }
    console.log(`cas webhook ${type ?? "?"}/${code ?? "?"} grant=${grantId ?? "?"}: ${outcome}`);
    return ack({ outcome });
  };

  if (!grantId) {
    // Nothing to verify against. Still 200: retrying will not add a grant id.
    return await finish("ignored", "no grant id in payload");
  }

  const { data: conns, error: lookupError } = await supabase
    .from("bank_connections")
    .select("id, company_id, status, access_token_enc")
    .eq("provider", "bankhub")
    .eq("grant_id", grantId);

  if (lookupError) {
    // A database hiccup is genuinely worth retrying, unlike a bad payload.
    console.error("cas webhook lookup failed:", lookupError.message);
    return new Response(JSON.stringify({ error: "lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!conns || conns.length === 0) {
    return await finish("ignored", `no connection for grant ${grantId}`);
  }

  const privateKey = Deno.env.get("PQC_KYC_PRIVATE_KEY");
  if (!privateKey) {
    console.error("PQC_KYC_PRIVATE_KEY is not set — cannot verify grant state");
    return await finish("unverifiable", "decryption key unavailable");
  }

  let cfg;
  try {
    cfg = bankhubConfigFromEnv();
  } catch (e) {
    console.error("cas webhook: bankhub not configured", e);
    return await finish("unverifiable", (e as Error).message);
  }

  // ── Ask Cas what is actually true ──────────────────────────────────────────
  //
  // One cheap call per connection. A one-day window is the smallest request
  // that exercises the grant; the result itself is discarded, only the outcome
  // matters. /identity would also work but the `identity` scope is deliberately
  // not requested, so it would fail for a reason unrelated to grant health.
  const today = new Date().toISOString().slice(0, 10);
  const outcomes: string[] = [];

  for (const conn of conns) {
    if (!conn.access_token_enc) {
      outcomes.push(`${conn.id}:no-token`);
      continue;
    }

    let accessToken: string;
    try {
      accessToken = await decryptField(conn.access_token_enc as unknown as EncryptedBlob, privateKey);
    } catch (e) {
      console.error(`connection ${conn.id}: decrypt failed`, e);
      outcomes.push(`${conn.id}:decrypt-failed`);
      continue;
    }

    try {
      await fetchTransactions(cfg, accessToken, { fromDate: today, toDate: today });
      // The grant answered, so it is alive whatever the payload claimed. If we
      // had previously parked it, this is the signal to bring it back — which
      // is exactly what a DEFAULT_UPDATE event means.
      if (conn.status !== "connected") {
        await supabase
          .from("bank_connections")
          .update({ status: "connected", revoked_at: null })
          .eq("id", conn.id);
        outcomes.push(`${conn.id}:restored`);
      } else {
        outcomes.push(`${conn.id}:alive`);
      }
    } catch (e) {
      if (!(e instanceof BankhubError)) {
        console.error(`connection ${conn.id}: verification call failed`, e);
        outcomes.push(`${conn.id}:unverifiable`);
        continue;
      }

      if (e.errorCode === "RATE_LIMIT") {
        // Cas allows roughly one call per grant per minute. Not knowing is not
        // the same as knowing the grant is dead, so nothing changes here.
        outcomes.push(`${conn.id}:rate-limited`);
        continue;
      }

      if (e.errorCode === "GRANT_NOT_FOUND") {
        // The grant is gone at Cas. The stored credential can never work again
        // and keeping it is only liability.
        await supabase
          .from("bank_connections")
          .update({
            status: "disconnected",
            revoked_at: new Date().toISOString(),
            access_token_enc: null,
            grant_id: null,
          })
          .eq("id", conn.id);
        outcomes.push(`${conn.id}:disconnected`);
        continue;
      }

      if (e.needsRelink) {
        // Still exists, but the customer has to go through Cas Link again.
        // CasLink.tsx already surfaces this status as a prompt to re-link.
        await supabase
          .from("bank_connections")
          .update({ status: "needs_relink", revoked_at: new Date().toISOString() })
          .eq("id", conn.id);
        outcomes.push(`${conn.id}:needs-relink`);
        continue;
      }

      console.error(`connection ${conn.id}: Cas said ${e.errorCode}`, e.message);
      outcomes.push(`${conn.id}:${e.errorCode}`);
    }
  }

  return await finish("verified", outcomes.join(", "));
});
