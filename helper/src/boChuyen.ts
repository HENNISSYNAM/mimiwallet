/**
 * Bộ chuyển (adapter) phía bộ chạy: locator ổn định cho từng ô, cách xác nhận chủ thể và môi trường.
 *
 * Locator lấy từ trang ĐÃ QUAN SÁT (`thu/bieu-mau-thu.html`), theo `id` — không đoán selector, không theo toạ độ,
 * không "bấm kết quả đầu tiên". Mỗi locator phải khớp ĐÚNG MỘT phần tử; khớp 0 hay nhiều là dừng.
 *
 * Bộ chuyển cổng thật (`tkn-cnkd-cong-thue`) CHƯA có locator vì chưa ai quan sát cổng thật — để trống có chủ ý, và máy
 * chủ giữ nó ở trạng thái tắt. Không bịa locator cho trang chưa thấy.
 */
import type { TruongDien } from '../../supabase/functions/_shared/dien-cong/bo-chuyen.ts';

export interface O {
  khoa: string;
  /** CSS theo id đã quan sát. */
  css: string;
  kieu: TruongDien['kieu'];
}

export interface BoChuyenChay {
  id: string;
  phien_ban: string;
  o: Record<string, O>;
  /** Khoá được phép bấm (không ghi dữ liệu). Phiên bản đầu: không có. */
  duoc_bam: ReadonlySet<string>;
  /** Trang phải mang nhãn này — bộ chuyển thử không bao giờ chạy trên trang không có nhãn môi trường thử. */
  nhan_moi_truong: { css: string; thuoc_tinh: string; gia_tri: string } | null;
  /** Nơi đọc mã số thuế của tài khoản đang đăng nhập trên cổng. */
  css_mst: string;
}

const o = (khoa: string, css: string, kieu: TruongDien['kieu']): [string, O] => [khoa, { khoa, css, kieu }];

export const BO_CHUYEN_CHAY: Record<string, BoChuyenChay> = {
  'tkn-cnkd-thu': {
    id: 'tkn-cnkd-thu',
    phien_ban: '0.1.0',
    o: Object.fromEntries([
      o('ky_loai', '#ky-loai', 'chon'),
      o('ky_nam', '#ky-nam', 'chu'),
      o('dd_1', '#dd-1', 'danh_dau'),
      o('dd_2', '#dd-2', 'danh_dau'),
      o('dt_08a', '#dt-08a', 'so_tien'),
      o('dt_08b', '#dt-08b', 'so_tien'),
      o('dt_08c', '#dt-08c', 'so_tien'),
      o('dt_08d', '#dt-08d', 'so_tien'),
      o('dt_08e', '#dt-08e', 'so_tien'),
      o('dt_11', '#dt-11', 'so_tien'),
    ]),
    duoc_bam: new Set(),
    nhan_moi_truong: { css: '#nhan-moi-truong', thuoc_tinh: 'data-moi-truong', gia_tri: 'thu' },
    css_mst: '#mst-dang-nhap',
  },
};
