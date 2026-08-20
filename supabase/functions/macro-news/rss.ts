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
/**
 * Entity có tên cho các ký tự Latin-1 có dấu.
 *
 * Bắt buộc phải có với nguồn tiếng Việt: một số CMS mã hoá toàn bộ chữ có dấu
 * theo kiểu này. Không giải mã thì tiêu đề tới tay người đọc nguyên văn dạng
 * "Gi&aacute; USD h&ocirc;m nay" — quan sát thật trên bảng `macro_news` ngày
 * 20/08/2026, và nó hiện thẳng lên thẻ tin hằng ngày.
 *
 * Chỉ liệt kê nhóm Latin-1; phần còn lại do nhánh giải mã theo số phía dưới lo,
 * và đó mới là nhánh bao được chữ Việt có dấu thanh (ắ, ề, ộ…) vốn không có
 * entity tên riêng.
 */
const ENTITY_CO_TEN: Record<string, string> = {
  aacute: "á", agrave: "à", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  iacute: "í", igrave: "ì", icirc: "î", iuml: "ï",
  oacute: "ó", ograve: "ò", ocirc: "ô", otilde: "õ", ouml: "ö",
  uacute: "ú", ugrave: "ù", ucirc: "û", uuml: "ü",
  yacute: "ý", ntilde: "ñ", ccedil: "ç", eth: "đ",
  Aacute: "Á", Agrave: "À", Acirc: "Â", Atilde: "Ã",
  Eacute: "É", Egrave: "È", Ecirc: "Ê",
  Iacute: "Í", Igrave: "Ì",
  Oacute: "Ó", Ograve: "Ò", Ocirc: "Ô", Otilde: "Õ",
  Uacute: "Ú", Ugrave: "Ù",
  Yacute: "Ý", Ntilde: "Ñ", Ccedil: "Ç", ETH: "Đ",
  hellip: "…", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", laquo: "«", raquo: "»",
};

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
    // Theo số, thập phân và thập lục phân. Nhánh này bao được chữ Việt có dấu
    // thanh, thứ không có entity tên riêng.
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-zA-Z]+);/g, (khop, ten) => ENTITY_CO_TEN[ten] ?? khop)
    /*
     * `&amp;` giải mã SAU CÙNG, giữ nguyên thứ tự của bản gốc.
     *
     * Đổi chỗ nó lên trước sẽ biến "&amp;#225;" thành "&#225;" rồi thành "á" —
     * tức là giải mã một tầng không có thật, và một dấu & viết đúng trong tiêu
     * đề sẽ kéo theo ký tự sau nó biến mất.
     */
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
