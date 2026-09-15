/**
 * Nhớ người dùng muốn tới đâu sau khi bấm link đăng nhập trong email hoặc đăng nhập Google.
 *
 * VÌ SAO KHÔNG ĐỔI THẲNG `emailRedirectTo`. Supabase chỉ cho quay về những URL đã khai
 * trong cài đặt xác thực của dự án; `/dashboard` đã khai và đang chạy. Đổi sang một đường
 * chưa khai thì Supabase lặng lẽ đưa người dùng về Site URL — tức trang chủ, như thể đăng
 * nhập hỏng. Nên link vẫn về `/dashboard`, còn trình duyệt nhớ đích thật.
 *
 * Mở link bằng trình duyệt khác (app email trên điện thoại) thì không có dấu này, và người
 * dùng ở Tổng quan — vẫn đúng tài khoản, chỉ lệch một bấm.
 */
const KHOA = 'mimi:sau-dang-nhap';
const HAN_MS = 60 * 60 * 1000;
const DICH_HOP_LE = /^\/dashboard(\/[a-z0-9-]+)*$/;

export function ghiDichSauDangNhap(duongDan: string, luc = Date.now()) {
  if (!DICH_HOP_LE.test(duongDan)) return;
  try {
    localStorage.setItem(KHOA, JSON.stringify({ duongDan, luc }));
  } catch { /* chế độ riêng tư: bỏ qua, người dùng vào Tổng quan */ }
}

/** Lấy rồi xoá luôn — chỉ dùng một lần. Quá một giờ thì coi như không có. */
export function layDichSauDangNhap(luc = Date.now()): string | null {
  try {
    const tho = localStorage.getItem(KHOA);
    if (!tho) return null;
    localStorage.removeItem(KHOA);
    const v = JSON.parse(tho) as { duongDan?: unknown; luc?: unknown };
    if (typeof v.duongDan !== 'string' || !DICH_HOP_LE.test(v.duongDan)) return null;
    if (typeof v.luc !== 'number' || luc - v.luc > HAN_MS) return null;
    return v.duongDan;
  } catch {
    return null;
  }
}

const EMAIL_CA_NHAN = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.com.vn', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'zoho.com', 'yandex.com', 'mail.ru',
]);

/** Đuôi email công ty ("thinhphat.vn"), hoặc null nếu là email cá nhân hay sai khuôn. */
export function duoiEmailCongTy(email: string): string | null {
  const m = email.trim().toLowerCase().match(/^[^\s@]+@([a-z0-9-]+(\.[a-z0-9-]+)+)$/);
  if (!m) return null;
  return EMAIL_CA_NHAN.has(m[1]) ? null : m[1];
}

export const laEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
