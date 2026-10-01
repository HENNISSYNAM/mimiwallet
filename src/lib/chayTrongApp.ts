/**
 * Đang chạy trong app Android từ Google Play (TWA)? (30/09/2026)
 *
 * Play bắt app tài chính thu phí số qua Google Play Billing; MIMI thu bằng chuyển khoản VietQR trên web. Bản Play
 * đầu tiên vì thế CHỈ CHO DÙNG — phần mua gói bị ẩn, khách mua trên www.mimiwallet.online. App TWA mở với
 * `start_url=/?nguon=twa` (hoặc referrer `android-app://…`); nhớ lại để các lần mở sau không phụ thuộc địa chỉ.
 */
const KHOA = 'mimi.trong_app';

export function laTrongApp(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    const co = new URLSearchParams(window.location.search).get('nguon') === 'twa' || ref.startsWith('android-app://');
    if (co) localStorage.setItem(KHOA, '1');
    return co || localStorage.getItem(KHOA) === '1';
  } catch {
    return false;
  }
}
