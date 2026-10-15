/**
 * Phân luồng đăng nhập / đăng ký (15/10/2026).
 *
 * MỘT nút Google làm cả hai việc: người đã có tài khoản thì vào, người mới thì được mở tài khoản (luật "chỉ Google tự
 * mở tài khoản" nằm ở máy chủ, xem migration 20261015100000). Người dùng không phải đoán mình đã đăng ký chưa.
 *
 * Các kỹ thuật làm luồng mượt, mỗi cái ứng với một chỗ hay hỏng thật:
 *  1. Trình duyệt nhúng của Zalo/Facebook/Messenger/Instagram/TikTok bị Google chặn đăng nhập (disallowed_useragent) —
 *     người dùng Việt Nam hay mở link từ chính các app đó. Phát hiện trước và chỉ đường mở bằng Chrome/Safari, thay vì
 *     để họ bấm rồi gặp trang lỗi của Google.
 *  2. Nhớ đích đến qua lần chuyển hướng (`ghiDichSauDangNhap`), nên đăng ký xong vào đúng nơi đang định tới.
 *  3. `prompt=select_account`: máy dùng chung nhiều tài khoản Google không tự đăng nhập nhầm tài khoản.
 *  4. Tải trước: khi ngón tay/chuột tới gần nút, mở sẵn kết nối tới Google và nạp trước màn làm việc — lúc quay về
 *     màn hình hiện ngay, không chờ tải.
 *  5. Lỗi được dịch ra một câu người thường hiểu và cho biết làm gì tiếp; người tự bấm "huỷ" ở Google không bị báo lỗi.
 */

const NHUNG = /(Zalo|FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|MicroMessenger|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat)/i;

/** Tên app đang bọc trình duyệt, hoặc null nếu là trình duyệt thường. `ua` truyền vào để kiểm thử được. */
export function trinhDuyetNhung(ua: string = typeof navigator === 'undefined' ? '' : navigator.userAgent): string | null {
  const m = NHUNG.exec(ua);
  if (!m) return null;
  const t = m[1].toLowerCase();
  if (t.startsWith('fb') || t === 'messenger') return 'Facebook';
  if (t === 'micromessenger') return 'WeChat';
  if (t === 'musical_ly' || t === 'bytedancewebview') return 'TikTok';
  return m[1].replace(/\/$/, '');
}

export type LoaiLoi = 'huy' | 'dongChua' | 'nhieu' | 'mang' | 'khongMoDuoc' | 'khac';

/** Phân loại lỗi trả về từ Supabase/Google (chuỗi tiếng Anh) để giao diện chọn câu dịch đúng. */
export function phanLoaiLoi(moTa: string | null | undefined): LoaiLoi {
  const l = (moTa ?? '').toLowerCase();
  if (!l) return 'khac';
  if (l.includes('access_denied') || l.includes('user denied') || l.includes('user cancelled') || l.includes('popup_closed')) return 'huy';
  if (l.includes('rate limit') || l.includes('security purposes') || l.includes('too many')) return 'nhieu';
  if (l.includes('failed to fetch') || l.includes('network') || l.includes('load failed')) return 'mang';
  // Trigger chặn đăng ký ngoài Google trả "Database error saving new user"; công tắc tắt đăng ký trả "signups not allowed".
  if (l.includes('signup') || l.includes('signups not allowed') || l.includes('database error saving new user') || l.includes('chỉ đăng ký bằng google')) return 'khongMoDuoc';
  if (l.includes('invalid login') || l.includes('invalid credentials')) return 'dongChua';
  return 'khac';
}

/** Tải trước kết nối và màn làm việc khi người dùng sắp bấm. Mỗi lần chạy chỉ làm một lần. */
let daTaiTruoc = false;
export function taiTruocGoogle() {
  if (daTaiTruoc || typeof document === 'undefined') return;
  daTaiTruoc = true;
  for (const href of ['https://accounts.google.com', 'https://lh3.googleusercontent.com']) {
    const l = document.createElement('link');
    l.rel = 'preconnect';
    l.href = href;
    document.head.appendChild(l);
  }
  // Chunk màn làm việc: nạp ngầm để lúc Google đưa về, trang dựng ngay. Lỗi mạng ở bước này không ảnh hưởng gì.
  void import('@/pages/TroLyPage').catch(() => {});
  void import('@/components/layout/DashboardLayout').catch(() => {});
}

/** Chỉ dùng cho kiểm thử: cho phép chạy lại `taiTruocGoogle`. */
export function datLaiTaiTruoc() { daTaiTruoc = false; }
