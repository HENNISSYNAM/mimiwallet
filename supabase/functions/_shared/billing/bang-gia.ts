/**
 * BẢNG GIÁ — MỘT NGUỒN cho máy chủ thu tiền, trang Cài đặt và trang chủ (25/09/2026).
 *
 * Trước đây giá nằm ở ba chỗ: `thu-tien.ts` (máy chủ), `TIERS` trong store, và chữ cứng "249,000₫"
 * trên Landing. Ba chỗ từng lệch nhau (Landing 249.000đ, trang thu tiền 990.000đ). Giờ cả ba đọc
 * từ đây; test `bang-gia.test.ts` chặn Landing viết cứng lại một con số.
 *
 * Số tiền là quyết định kinh doanh của chủ sản phẩm — đổi ở đây là đổi giá thật ở mọi nơi.
 */

/** Giá một lượt xuất tờ khai. Người dùng chốt ngày 24/09/2026: "khoảng 10k một tờ". */
export const GIA_MOT_TO_KHAI = 10_000;

/** Gói tháng mua được hôm nay. Khoá khớp cột `subscriptions.plan`. */
export const GOI_THANG = {
  starter: { amount: 149_000, ten: 'Starter' },
  growth: { amount: 249_000, ten: 'Growth' },
} as const;

export type KhoaGoi = keyof typeof GOI_THANG;

export const giaVND = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}₫`;
