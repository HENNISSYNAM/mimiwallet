/**
 * Ảnh đại diện của công ty, kiểu tài khoản Google: có ảnh thì dùng ảnh, không thì một vòng
 * màu với chữ cái đầu. Màu cố định theo tên — cùng công ty luôn cùng màu, trên mọi màn.
 */

/** Hai chữ cái đầu từ tên thật; không có tên thì gạch ngang, không bịa. */
export function chuCaiDau(ten: string | null): string {
  const tu = (ten ?? '')
    .replace(/^(công ty|cty|tnhh|cổ phần|cp|hộ kinh doanh|hkd)\s+/gi, '')
    .replace(/\b(tnhh|cổ phần|mtv|jsc|co\.?,? ?ltd\.?)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tu.length) return '—';
  if (tu.length === 1) return tu[0].slice(0, 2).toUpperCase();
  return (tu[0][0] + tu[tu.length - 1][0]).toUpperCase();
}

/** Nền đậm vừa đủ để chữ trắng đọc được (tương phản ≥ 4.5:1). */
const MAU = ['#1a73e8', '#188038', '#c5221f', '#b06000', '#7b1fa2', '#00796b', '#3949ab', '#ad1457'];

export function mauTheoTen(ten: string | null): string {
  let h = 0;
  for (const c of ten ?? '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MAU[h % MAU.length];
}

/** Ảnh Google của người đăng nhập (Supabase chép claim OAuth vào user_metadata). */
export function anhGoogle(meta: Record<string, unknown> | undefined | null): string | null {
  const m = meta ?? {};
  if (typeof m.avatar_url === 'string' && m.avatar_url) return m.avatar_url;
  if (typeof m.picture === 'string' && m.picture) return m.picture;
  return null;
}
