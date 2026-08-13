import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import {
  classify,
  personalImpact,
  type CompanyContext,
  type Topic,
  type Impact,
} from "./analysis.ts";

/**
 * Macro news for SMEs: pulls public RSS, classifies it, and reads it against
 * the caller's own numbers.
 *
 * Replaces the previous `perplexity-news`, which required a paid
 * PERPLEXITY_API_KEY and returned HTTP 500 without one — the same failure mode
 * the chat function had before it was made self-sufficient. Public RSS costs
 * nothing, needs no key, and cannot stop working because a subscription lapsed.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Refresh window. The feed is shared by every tenant, so one fetch every few
 * hours covers everyone; anything more often just hammers the publishers for
 * headlines that have not changed.
 *
 * This TTL is what makes the feature self-updating. pg_cron would also work,
 * but it needs an extension enabled out-of-band and fails silently when it is
 * not — this path refreshes itself on first use after going stale and cannot
 * be left switched off by accident.
 */
const TTL_MINUTES = 180;
const MAX_ITEMS = 12;

const FEEDS = [
  { url: "https://vnexpress.net/rss/kinh-doanh.rss", source: "VnExpress" },
  { url: "https://cafef.vn/tai-chinh-ngan-hang.rss", source: "CafeF" },
];

/** Strip tags and unescape the handful of entities RSS actually uses. */
function cleanText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? cleanText(m[1]) : "";
}

interface RawItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string | null;
}

/**
 * Minimal RSS parse. A full XML parser is a heavy dependency for a format this
 * regular, and every field we read is a flat text node.
 */
function parseFeed(xml: string, source: string): RawItem[] {
  const items: RawItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks) {
    const title = tagValue(block, "title");
    const url = tagValue(block, "link");
    if (!title || !url) continue;
    const pub = tagValue(block, "pubDate");
    const parsed = pub ? new Date(pub) : null;
    items.push({
      title,
      summary: tagValue(block, "description").slice(0, 400),
      url,
      source,
      published_at:
        parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
    });
  }
  return items;
}

/**
 * Per-feed cap, applied before merging.
 *
 * Slicing the merged list instead let the first feed swallow the whole budget:
 * VnExpress returns 60 items, so a flat `slice(0, 40)` meant CafeF never
 * reached the table at all — and CafeF is the banking feed, the one that
 * carries the rate and credit stories this feature exists to surface.
 */
const PER_FEED = 20;

async function fetchFeeds(): Promise<RawItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (f) => {
      // One slow publisher should not hold up the whole response.
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await fetch(f.url, {
          signal: ctrl.signal,
          headers: { "User-Agent": "MimiWallet/1.0 (+macro-news)" },
        });
        if (!res.ok) throw new Error(`${f.source} HTTP ${res.status}`);
        return parseFeed(await res.text(), f.source).slice(0, PER_FEED);
      } finally {
        clearTimeout(timer);
      }
    })
  );

  const items: RawItem[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") items.push(...r.value);
    else console.error("feed failed:", r.reason);
  }
  return items;
}

/** Company numbers the personalised reading needs. Null when not signed in. */
async function loadCompanyContext(
  admin: ReturnType<typeof createClient>,
  authHeader: string | null
): Promise<CompanyContext | null> {
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (!user) return null;

  const companyId = (await resolveCompany(admin, user.id))?.id;
  if (!companyId) return null;

  const [{ data: loans }, { data: snapshots }, { data: txs }] = await Promise.all([
    // Outstanding = principal minus what has been repaid, over live loans only.
    // Matches how chat/index.ts derives the same figure, so the two features
    // cannot quote different debt for the same company.
    admin
      .from("loan_applications")
      .select("amount, amount_repaid")
      .eq("company_id", companyId)
      .in("status", ["disbursed", "approved"]),
    admin
      .from("credit_score_snapshots")
      .select("id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("transactions")
      .select("type, amount")
      .eq("company_id", companyId)
      .limit(2000),
  ]);

  const outstandingDebt = (loans ?? []).reduce(
    (s: number, l: { amount: number; amount_repaid: number | null }) =>
      s + (Number(l.amount) - Number(l.amount_repaid ?? 0)),
    0
  );

  let factorScores: Record<string, number> = {};
  const snapshotId = snapshots?.[0]?.id;
  if (snapshotId) {
    const { data: factors } = await admin
      .from("credit_score_factors")
      .select("factor_name, normalized_score")
      .eq("snapshot_id", snapshotId);
    factorScores = Object.fromEntries(
      (factors ?? []).map((f: { factor_name: string; normalized_score: number }) => [
        f.factor_name,
        Number(f.normalized_score),
      ])
    );
  }

  const netCashFlow = (txs ?? []).reduce(
    (s: number, t: { type: string; amount: number }) =>
      t.type === "income"
        ? s + Number(t.amount)
        : t.type === "expense"
        ? s - Math.abs(Number(t.amount))
        : s,
    0
  );

  return { outstandingDebt, factorScores, netCashFlow };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Is the stored feed still fresh?
    const { data: newest } = await admin
      .from("macro_news")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1);

    const lastFetched = newest?.[0]?.fetched_at
      ? new Date(newest[0].fetched_at).getTime()
      : 0;
    const ageMinutes = (Date.now() - lastFetched) / 60000;
    let refreshed = false;

    if (ageMinutes > TTL_MINUTES) {
      const raw = await fetchFeeds();
      if (raw.length > 0) {
        const rows = raw.map((item) => {
          const { topic, impact } = classify(item.title, item.summary);
          return { ...item, topic, impact, fetched_at: new Date().toISOString() };
        });
        // Conflict on url: the same story stays in a feed for hours, and we want
        // one row per story rather than a new copy on every refresh.
        const { error } = await admin
          .from("macro_news")
          .upsert(rows, { onConflict: "url" });
        if (error) console.error("upsert failed:", error.message);
        else refreshed = true;
      }
      // A failed fetch deliberately falls through to whatever is cached: stale
      // headlines beat an empty panel.
    }

    const { data: news } = await admin
      .from("macro_news")
      .select("title, summary, url, source, published_at, topic, impact")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(MAX_ITEMS);

    const ctx = await loadCompanyContext(admin, req.headers.get("Authorization"));

    const items = (news ?? []).map(
      (n: {
        title: string;
        summary: string | null;
        url: string;
        source: string;
        published_at: string | null;
        topic: string;
        impact: string;
      }) => ({
        ...n,
        personal: ctx
          ? personalImpact(n.topic as Topic, n.impact as Impact, ctx)
          : null,
      })
    );

    return new Response(
      JSON.stringify({
        items,
        refreshed,
        cachedAgeMinutes: Math.round(ageMinutes),
        // Stated plainly so the UI can label it: this is keyword classification
        // against the company's own figures, not a language model.
        method: "rule-based classification + company data",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("macro-news error:", e);
    return new Response(JSON.stringify({ error: "Không tải được tin tức" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
