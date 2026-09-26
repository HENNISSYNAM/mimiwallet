/**
 * Đọc câu trả lời gõ trong Trợ lý (hoặc nói từ pet) cho câu hỏi đang chờ của MỘT hồ sơ việc — Prompt 4B
 * mục 6, 12. Hàm thuần, tất định: "01/10/2026", "từ 1/10 đến 31/12/2026", "hộ kinh doanh", "có", "chưa".
 * Không chắc → `null`, và trợ lý hỏi lại bằng câu hỏi gốc; KHÔNG đoán.
 *
 * Cũng nhận hai câu báo việc: "tôi đã nộp rồi, mã hồ sơ …" và "đã nhận thông báo chấp nhận số …". Đó là
 * lời NGƯỜI DÙNG — ghi thành bằng chứng mức "theo xác nhận của bạn", không bao giờ "đã xác minh".
 */
import type { CauHoi } from '../hanh-trinh/dong-co.ts';

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const pad = (n: number) => String(n).padStart(2, '0');

function ngayHopLe(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null; // 31/02 → không hợp lệ
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Mọi ngày trong câu, theo thứ tự xuất hiện. Thiếu năm → năm của `homNay`. */
export function docNgay(cau: string, homNay: string): string[] {
  const s = boDau(cau);
  const namNay = Number(homNay.slice(0, 4));
  const ra: { i: number; v: string }[] = [];
  // Khoảng chữ đã thuộc về một ngày (ISO, "ngày … tháng …") — dạng d/m không bắt lại bên trong.
  const daBat: [number, number][] = [];
  const them = (i: number, dai: number, v: string | null) => {
    daBat.push([i, i + dai]);
    if (v && !ra.some((x) => x.i === i)) ra.push({ i, v });
  };
  for (const m of s.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) them(m.index ?? 0, m[0].length, ngayHopLe(+m[1], +m[2], +m[3]));
  for (const m of s.matchAll(/\bngay\s+(\d{1,2})\s+thang\s+(\d{1,2})(?:\s+nam\s+(\d{4}))?/g)) them(m.index ?? 0, m[0].length, ngayHopLe(m[3] ? +m[3] : namNay, +m[2], +m[1]));
  for (const m of s.matchAll(/(?<![\d-])(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}))?(?![\d/.-])/g)) {
    const i = m.index ?? 0;
    if (daBat.some(([a, b]) => i >= a && i < b)) continue;
    them(i, m[0].length, ngayHopLe(m[3] ? +m[3] : namNay, +m[2], +m[1]));
  }
  // Rải năm về phía trước: "từ 1/10 đến 31/12/2026" → cả hai năm 2026.
  const coNam = [...s.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]);
  return ra.sort((a, b) => a.i - b.i).map((x) => (coNam.length === 1 ? `${coNam[0]}${x.v.slice(4)}` : x.v));
}

/** Tháng: "04/2026", "tháng 4/2026", "tháng 4 năm 2026", "2026-04". */
export function docThang(cau: string): string[] {
  const s = boDau(cau);
  const ra: string[] = [];
  for (const m of s.matchAll(/\b(\d{4})-(\d{1,2})\b(?!-)/g)) if (+m[2] >= 1 && +m[2] <= 12) ra.push(`${m[1]}-${pad(+m[2])}`);
  for (const m of s.matchAll(/(?:\bthang\s+)?\b(\d{1,2})\s*(?:\/|nam\s+)\s*(\d{4})\b/g)) if (+m[1] >= 1 && +m[1] <= 12) ra.push(`${m[2]}-${pad(+m[1])}`);
  return [...new Set(ra)];
}

const CO = /^(co|co roi|roi|da co|dung|vang|u|yes|ok|da)\b/;
const KHONG = /^(khong|chua|chua co|ko|k|no|khong co)\b/;
const CHUA_RO = /\b(chua ro|khong ro|khong biet|chua biet)\b/;

/** Chọn một lựa chọn: khớp nhãn/giá trị (bỏ dấu), hoặc có/không/chưa rõ cho câu hỏi có–không. */
export function docLuaChon(cau: string, luaChon: { gia_tri: string; nhan: string }[]): string | null {
  const s = boDau(cau).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  const gt = new Set(luaChon.map((l) => l.gia_tri));
  if (gt.has('chua_ro') && CHUA_RO.test(s)) return 'chua_ro';
  const khop = luaChon.filter((l) => {
    const n = boDau(l.nhan).replace(/[^a-z0-9 ]+/g, ' ').trim();
    return s === n || s === l.gia_tri.replace(/_/g, ' ') || (n.length >= 4 && s.includes(n));
  });
  if (khop.length === 1) return khop[0].gia_tri;
  if (gt.has('co') && gt.has('khong')) {
    if (KHONG.test(s)) return 'khong';
    if (CO.test(s)) return 'co';
  }
  return null;
}

/** Giá trị cho câu hỏi đang chờ, hoặc `null` nếu câu nói không trả lời được nó. */
export function docCauTraLoi(cau: string, q: Pick<CauHoi, 'kieu' | 'lua_chon'>, homNay: string): string | null {
  if (q.kieu === 'ngay') return docNgay(cau, homNay)[0] ?? null;
  if (q.kieu === 'thang') return docThang(cau)[0] ?? null;
  if (q.kieu === 'lua_chon') return docLuaChon(cau, q.lua_chon ?? []);
  return null; // câu trả lời tự do: chỉ nhận ở ô trả lời của việc, không đoán từ câu chat
}

// ── Câu báo việc ─────────────────────────────────────────────────────────────────────────────────
export type BaoViec =
  | { loai: 'da_nop'; ma_ho_so: string | null }
  | { loai: 'co_phan_hoi'; noi_dung: string };

/** Mã hồ sơ / số biên nhận / số thông báo có ít nhất một chữ số. */
export function docMaHoSo(cau: string): string | null {
  const m = cau.match(/(?:mã|ma|số|so)(?:\s+(?:hồ sơ|ho so|biên nhận|bien nhan|giao dịch|giao dich|thông báo|thong bao|văn bản|van ban))?\s*(?:là|la|:|#)?\s*([A-Za-z0-9][A-Za-z0-9\-/.]{3,39})/i);
  const v = m?.[1]?.replace(/[.]+$/, '') ?? null;
  return v && /\d/.test(v) ? v : null;
}

export function nhanBaoViec(cau: string): BaoViec | null {
  const s = boDau(cau).replace(/\s+/g, ' ').trim();
  if (!s || /\?|\b(chua|khi nao|bao gio|lam sao|the nao|co phai)\b/.test(s)) return null; // câu hỏi, không phải báo
  if (/\b(duoc chap nhan|da chap nhan|chap nhan roi|(da|vua) (nhan|co|duoc) (thong bao|phan hoi|ket qua|bien nhan|van ban)|co quan thue (da )?(tra loi|phan hoi|chap nhan))\b/.test(s)) {
    return { loai: 'co_phan_hoi', noi_dung: cau.trim().slice(0, 500) };
  }
  if (/\b(toi|minh|em|anh|chi)?\s*(da|vua) (nop|gui) (xong|roi|ho so|to khai|thong bao|giai trinh|len)\b|\b(da|vua) nop\b|\bnop (xong|roi)\b/.test(s)) {
    return { loai: 'da_nop', ma_ho_so: docMaHoSo(cau) };
  }
  return null;
}
