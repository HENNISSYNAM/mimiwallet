/**
 * BẢNG GIÁ — MỘT NGUỒN cho máy chủ thu tiền, trang Cài đặt và trang chủ (25/09/2026).
 *
 * Trước đây giá nằm ở ba chỗ: `thu-tien.ts` (máy chủ), `TIERS` trong store, và chữ cứng "249,000₫"
 * trên Landing. Ba chỗ từng lệch nhau (Landing 249.000đ, trang thu tiền 990.000đ). Giờ cả ba đọc
 * từ đây; test `bang-gia.test.ts` chặn Landing viết cứng lại một con số.
 *
 * Số tiền là quyết định kinh doanh của chủ sản phẩm — đổi ở đây là đổi giá thật ở mọi nơi.
 */

/**
 * Giá một lượt xuất tờ khai — ĐÃ NGỪNG BÁN 11/10/2026 (chủ sản phẩm: "bỏ vụ 10k tờ đi"). Chỉ còn để
 * tôn trọng lượt khách đã mua trước đó và hoàn tiền lượt chưa dùng. Không tạo hoá đơn lượt mới.
 */
export const GIA_MOT_TO_KHAI = 10_000;
export const DANG_BAN_LUOT = false;

/**
 * DOANH NGHIỆP MIỄN PHÍ TRỌN ĐỜI (11/10/2026, chủ sản phẩm: "free trọn đời với doanh nghiệp startup";
 * "mã số doanh nghiệp là check được"). Điều kiện: mã số thuế 10 số (có thể kèm -xxx), MÁY CHỦ đã tra
 * Tổng cục Thuế và thấy là DOANH NGHIỆP, đang hoạt động. Dữ liệu `*_theo_mst` chỉ máy chủ ghi được
 * (trigger `giu_thong_tin_theo_mst`) — người dùng không tự khai mình là doanh nghiệp để được miễn phí.
 * Hộ kinh doanh (mã 12 số / 10 số của cá nhân) dùng gói tháng.
 */
export const GOI_DOANH_NGHIEP_TRON_DOI = 'doanh_nghiep_tron_doi';
export const HET_HAN_TRON_DOI = '9999-12-31';

export interface CongTyTheoMstGia {
  tax_id?: string | null;
  loai_theo_mst?: string | null;
  trang_thai_mst?: string | null;
}

export function mienPhiTronDoi(ct: CongTyTheoMstGia | null | undefined): boolean {
  if (!ct) return false;
  const ma = (ct.tax_id ?? '').replace(/\s/g, '');
  return /^\d{10}(-\d{3})?$/.test(ma)
    && ct.loai_theo_mst === 'doanh_nghiep'
    && (ct.trang_thai_mst ?? '').startsWith('NNT đang hoạt động');
}

/** Gói tháng mua được hôm nay. Khoá khớp cột `subscriptions.plan`. */
export const GOI_THANG = {
  starter: { amount: 149_000, ten: 'Starter' },
  growth: { amount: 249_000, ten: 'Growth' },
} as const;

export type KhoaGoi = keyof typeof GOI_THANG;

export const giaVND = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`;
