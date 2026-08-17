/**
 * Minimal RSS parsing — pure, no network, no Deno APIs — so it can be
 * exercised with the same vitest suite as `analysis.ts` instead of only
 * getting a type-check from `deno check`. `index.ts` does the fetching; this
 * file only turns feed XML into rows.
 */

export interface RawItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string | null;
}

/**
 * Strip tags and unescape the handful of entities RSS actually uses.
 *
 * `&amp;amp;` before `&amp;`: some Vietnamese news CMSes double-encode an
 * ampersand in the title before publishing it, so "T&T Group" arrives as
 * "T&amp;amp;T Group". A single decode pass turns that into "T&amp;T Group" —
 * one layer peeled, one left, showing up verbatim on screen. Ordering the
 * double-encoded case first means the trailing `&amp;` line only ever meets a
 * genuinely single-encoded ampersand.
 */
export function cleanText(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function tagValue(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? cleanText(m[1]) : "";
}

/**
 * Minimal RSS parse. A full XML parser is a heavy dependency for a format this
 * regular, and every field we read is a flat text node.
 */
export function parseFeed(xml: string, source: string): RawItem[] {
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
