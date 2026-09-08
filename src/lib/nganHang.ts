/**
 * Danh sách ngân hàng dùng chung giữa giao diện và edge function.
 *
 * VÌ SAO CHỈ LÀ MỘT LỚP CHUYỂN TIẾP. Bảng thật nằm ở
 * `supabase/functions/_shared/bank/ngan-hang.ts` vì **cả hai phía đều cần nó**:
 * giao diện để dựng ô chọn ngân hàng, máy chủ để suy ra mã BIN từ tên ngân
 * hàng khi giao diện gửi lên bản cũ.
 *
 * Chép thành hai bản là mời hai bản lệch nhau, và bản lệch ở đây nghĩa là giao
 * diện hiện một ngân hàng còn máy chủ hiểu ra ngân hàng khác — tức mã QR trỏ
 * sai nơi mà không màn hình nào báo.
 *
 * Giữ đường dẫn `@/lib/nganHang` để những chỗ đang import không phải sửa.
 */
export {
  DANH_SACH_NGAN_HANG,
  chuanHoaTen,
  timNganHang,
  type NganHang,
} from '../../supabase/functions/_shared/bank/ngan-hang';
