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

// ── ĐỀ XUẤT CHỜ CHỦ SẢN PHẨM CHỐT (11/10/2026) ────────────────────────────────────────────────
//
// Mọi con số dưới đây là ĐỀ XUẤT của kỹ sư để tính năng chạy được và test được — CHƯA PHẢI GIÁ
// ĐÃ CHỐT. Đổi ở đây là đổi ở mọi nơi (máy chủ trừ xu, thanh năng lượng, số trỏ). Chủ sản phẩm
// chốt xong thì bỏ chữ DE_XUAT khỏi tên và ghi ngày chốt.

/**
 * XU — "năng lượng" của MIMI: đơn vị đo phần việc dùng mô hình AI, CHỈ dùng trong MIMI. Không đổi
 * ngược ra tiền, không chuyển cho người khác, không hoàn thành tiền mặt.
 *
 * Vì sao quy theo USD: chi phí token THẬT của mỗi lượt gọi mô hình tính bằng USD (bảng giá
 * OpenRouter trong `bang_gia_model`). 1 xu = 0,001 USD chi phí token (ĐỀ XUẤT) — một câu hỏi
 * thường trên mô hình rẻ tốn vài xu; câu nhiều lượt gọi công cụ trên mô hình đắt tốn vài chục.
 */
export const USD_MOT_XU_DE_XUAT = 0.001;

/**
 * Không tra được giá mô hình (cổng Stali/Lovable, mô hình chưa có trong bảng giá): tính bao nhiêu xu
 * MỖI LẦN GỌI THÀNH CÔNG. ĐỀ XUẤT. Không tính 0 — gọi mô hình không bao giờ miễn phí với MIMI.
 */
export const XU_MOT_LAN_GOI_KHONG_RO_GIA_DE_XUAT = 5;

/**
 * Hạn mức xu mỗi tháng theo gói — đầu mỗi tháng (giờ Việt Nam) sổ được NẠP ĐẦY TỚI hạn mức này
 * (không cộng dồn qua tháng). ĐỀ XUẤT.
 */
export const HAN_MUC_XU_THANG_DE_XUAT = {
  mien_phi: 300,
  goi_thang: 3_000,
  doanh_nghiep_tron_doi: 3_000,
} as const;

/** Khoá gói (cột `subscriptions.plan`, hoặc `GOI_DOANH_NGHIEP_TRON_DOI`, hoặc null = chưa có gói) → nhóm. */
function nhomGoi(goi: string | null | undefined): keyof typeof HAN_MUC_XU_THANG_DE_XUAT {
  if (goi === GOI_DOANH_NGHIEP_TRON_DOI) return 'doanh_nghiep_tron_doi';
  if (goi && goi in GOI_THANG) return 'goi_thang';
  return 'mien_phi';
}

export function hanMucXuThang(goi: string | null | undefined): number {
  return HAN_MUC_XU_THANG_DE_XUAT[nhomGoi(goi)];
}

/**
 * Số con trỏ MIMI (mỗi trỏ là một agent người dùng đã tạo) được chạy SONG SONG theo gói. ĐỀ XUẤT.
 * Chưa có gói: 1; gói tháng: 2; doanh nghiệp miễn phí trọn đời: 3.
 */
export const SO_TRO_DE_XUAT = {
  mien_phi: 1,
  goi_thang: 2,
  doanh_nghiep_tron_doi: 3,
} as const;

export function soTroToiDa(goi: string | null | undefined): number {
  return SO_TRO_DE_XUAT[nhomGoi(goi)];
}

/**
 * GÓI XU MUA THÊM (12/10/2026, chủ sản phẩm: khách mua gói, chuyển khoản vào tài khoản MIMI có liên kết SePay,
 * webhook đẩy về, đối chiếu là nhận hạn mức; giá "phải liên kết rất chặt với số token mình tiêu qua API").
 *
 * GIÁ TÍNH TỪ CHI PHÍ TOKEN, không đặt tay: giá = số xu × USD_MOT_XU × tỷ giá × hệ số biên, làm tròn LÊN
 * nghìn đồng. Một xu luôn đổi ra đúng 0,001 USD tiền token MIMI trả cho cổng mô hình (`xuCuaLuot` lấy
 * `usage.cost` OpenRouter báo), nên mỗi gói xu bán ra luôn có lãi bằng (hệ số − 1) trên tiền token.
 * Tỷ giá, hệ số và cỡ gói đều là ĐỀ XUẤT chờ chủ chốt.
 */
export const TY_GIA_USD_VND_DE_XUAT = 26_500;
export const HE_SO_BIEN_XU_DE_XUAT = 2;

export const GOI_XU_DE_XUAT = {
  xu_1000: { so_xu: 1_000, ten: '1.000 xu' },
  xu_5000: { so_xu: 5_000, ten: '5.000 xu' },
  xu_20000: { so_xu: 20_000, ten: '20.000 xu' },
} as const;
export type KhoaGoiXu = keyof typeof GOI_XU_DE_XUAT;

/** Giá (đồng, số nguyên, tròn nghìn) của `soXu` xu — chỉ máy chủ dùng số này để phát hành hoá đơn. */
export function giaXu(soXu: number): number {
  const dong = soXu * USD_MOT_XU_DE_XUAT * TY_GIA_USD_VND_DE_XUAT * HE_SO_BIEN_XU_DE_XUAT;
  return Math.ceil(Math.round(dong) / 1000) * 1000;
}

export function goiXu(khoa: string | null | undefined): { so_xu: number; ten: string; amount: number } | null {
  if (!khoa || !(khoa in GOI_XU_DE_XUAT)) return null;
  const g = GOI_XU_DE_XUAT[khoa as KhoaGoiXu];
  return { so_xu: g.so_xu, ten: g.ten, amount: giaXu(g.so_xu) };
}
