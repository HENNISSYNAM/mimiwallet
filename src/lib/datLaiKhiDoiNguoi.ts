import { useAuthStore } from '@/store/useAuthStore';
import { useNaoMimi } from '@/store/naoMimi';
import { lamMoiCongTy } from '@/lib/congTyDangDung';
import { xoaBoNhoCongTy } from '@/hooks/useCongTy';

/**
 * ĐỔI NGƯỜI DÙNG = XOÁ SẠCH (30/09/2026, sửa P0-1 và P0-2 của đợt kiểm trước go-live).
 *
 * Đăng xuất rồi đăng nhập tài khoản khác không tải lại trang, nên mọi bộ nhớ trong tab phải tự xoá:
 *   - "công ty đang dùng" (nếu không, B mang company_id của A → máy chủ trả 403, B thấy tên công ty của A);
 *   - bộ não MIMI dùng chung (nếu không, B thấy câu trả lời tài chính của A ở lần vẽ đầu).
 * Nghe thẳng kho đăng nhập ở cấp ứng dụng — không phụ thuộc layout còn gắn hay không — và chạy ĐỒNG BỘ ngay lúc
 * user đổi, trước khi màn hình mới kịp vẽ.
 */
let daGan = false;

export function ganDatLaiKhiDoiNguoi(): () => void {
  if (daGan) return () => {};
  daGan = true;
  let uidCu = useAuthStore.getState().user?.id ?? null;
  const huy = useAuthStore.subscribe((s) => {
    const uid = s.user?.id ?? null;
    if (uid === uidCu) return;
    uidCu = uid;
    useNaoMimi.getState().datPhamVi(null);
    xoaBoNhoCongTy();
    lamMoiCongTy();
  });
  return () => { daGan = false; huy(); };
}
