import { describe, it, expect } from 'vitest';
import { cleanText, tagValue, parseFeed } from './rss';

describe('cleanText', () => {
  it('unescapes a normally single-encoded ampersand', () => {
    expect(cleanText('T&amp;T Group')).toBe('T&T Group');
  });

  it('unescapes a double-encoded ampersand rather than leaving one layer', () => {
    // The bug seen live: VnExpress served "T&amp;amp;T Group", and the old
    // single-pass replace left "T&amp;T Group" on screen — a literal "&amp;"
    // a reader has no reason to understand.
    expect(cleanText('T&amp;amp;T Group')).toBe('T&T Group');
  });

  it('strips CDATA wrapping without losing the text inside', () => {
    expect(cleanText('<![CDATA[Lãi suất tăng]]>')).toBe('Lãi suất tăng');
  });

  it('strips inline tags a publisher left in a title', () => {
    expect(cleanText('Tin <b>nóng</b> hôm nay')).toBe('Tin nóng hôm nay');
  });

  it('unescapes quotes and apostrophes', () => {
    expect(cleanText('&quot;Tăng trưởng&quot; &#39;chậm lại&#39;')).toBe('"Tăng trưởng" \'chậm lại\'');
  });

  it('collapses runs of whitespace left behind by tag stripping', () => {
    expect(cleanText('A   <br/>   B')).toBe('A B');
  });
});

describe('tagValue', () => {
  it('extracts and cleans a simple tag', () => {
    expect(tagValue('<title>Lãi suất &amp; tỷ giá</title>', 'title')).toBe('Lãi suất & tỷ giá');
  });

  it('returns empty string when the tag is absent, not throws', () => {
    expect(tagValue('<title>A</title>', 'link')).toBe('');
  });
});

describe('parseFeed', () => {
  const xml = `
    <rss><channel>
      <item>
        <title><![CDATA[T&amp;amp;T Group mở rộng]]></title>
        <link>https://example.com/1</link>
        <description>Tóm tắt &amp; chi tiết</description>
        <pubDate>Thu, 13 Aug 2026 10:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Thiếu link nên bị bỏ qua</title>
      </item>
    </channel></rss>
  `;

  it('parses a well-formed item and decodes its double-encoded title', () => {
    const items = parseFeed(xml, 'VnExpress');
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('T&T Group mở rộng');
    expect(items[0].url).toBe('https://example.com/1');
    expect(items[0].source).toBe('VnExpress');
    expect(items[0].published_at).toBe(new Date('Thu, 13 Aug 2026 10:00:00 GMT').toISOString());
  });

  it('drops an item with no link rather than passing through a dead URL', () => {
    const items = parseFeed(xml, 'VnExpress');
    expect(items.every((i) => i.url)).toBe(true);
  });

  it('returns an empty array for XML with no items, instead of throwing', () => {
    expect(parseFeed('<rss><channel></channel></rss>', 'X')).toEqual([]);
  });

  it('treats an unparseable pubDate as null rather than an invalid Date', () => {
    const oneItem = xml.replace('Thu, 13 Aug 2026 10:00:00 GMT', 'not-a-date');
    expect(parseFeed(oneItem, 'VnExpress')[0].published_at).toBeNull();
  });
});

describe('cleanText — entity chữ có dấu', () => {
  it('giải mã entity có tên, trường hợp thật từ macro_news', () => {
    // Nguyên văn quan sát được trên bảng ngày 20/08/2026.
    expect(cleanText('Gi&aacute; USD h&ocirc;m nay 20.8.2026'))
      .toBe('Giá USD hôm nay 20.8.2026');
  });

  it('giải mã entity theo số — nhánh bao chữ Việt có dấu thanh', () => {
    expect(cleanText('&#7855;n')).toBe('ắn');
    expect(cleanText('&#x1EAF;n')).toBe('ắn');
  });

  it('giữ nguyên entity không nhận ra thay vì nuốt mất chữ', () => {
    expect(cleanText('a &khongcothat; b')).toBe('a &khongcothat; b');
  });

  it('&amp; vẫn giải mã sau cùng, không tạo thêm một tầng giả', () => {
    // Đổi thứ tự sẽ biến "&amp;#225;" thành "á" — một tầng giải mã không có thật.
    expect(cleanText('T&amp;T Group')).toBe('T&T Group');
    expect(cleanText('&amp;#225;')).toBe('&#225;');
  });
});
