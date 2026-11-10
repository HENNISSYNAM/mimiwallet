/**
 * DÒNG TIỀN — HIỂU TỪNG KHOẢN (10/11/2026). Hàm thuần, không import Deno/Supabase: Vitest và edge function cùng chạy.
 *
 * Mỗi giao dịch được xếp vào MỘT nhóm dòng tiền. Nhóm chỉ dùng cho dự báo và để giải thích "tiền đi đâu" — KHÔNG đổi
 * doanh thu tính thuế (doanh thu do `doanh-thu/so-lieu.ts` + người xác nhận quyết, không phải ở đây).
 *
 * Thứ tự ưu tiên khi xếp tiền VÀO:
 *   1. Chủ đã xác nhận (`revenue_classifications`) — người thắng máy.
 *   2. type = 'loan' → tiền vay.
 *   3. Bộ luật nội dung (`phan-loai/tien-vao.ts`) — cùng bộ luật mà doanh thu dùng để GỢI Ý.
 *   4. Còn lại: tiền bán hàng.
 * Tiền RA: luật từ khoá trên nội dung đã bỏ dấu (lương, thuế, mặt bằng, trả nợ, nhà cung cấp), còn lại "chi khác".
 * Chuyển giữa các tài khoản của chính công ty: nhóm `noi_bo`, bị loại khỏi mọi chuỗi.
 */
import { goiYTienVao } from '../phan-loai/tien-vao.ts';

export const NHOM = [
  // Tiền vào kinh doanh — được mô hình hoá.
  'ban_hang', 'dat_coc', 'hoan_tien', 'vao_khac',
  // Tiền vào tài chính / không kinh doanh — có trong lịch sử, KHÔNG ngoại suy ra tương lai (trừ khi lặp lại đều).
  'vay', 'gop_von', 'nguoi_nha', 'thu_ho', 'ngoai_kd',
  // Tiền ra.
  'nha_cung_cap', 'luong', 'mat_bang', 'thue', 'tra_no', 'chi_khac',
  // Chuyển nội bộ — loại.
  'noi_bo',
] as const;
export type Nhom = (typeof NHOM)[number];
export const CHI_SO_NHOM: Record<Nhom, number> = Object.fromEntries(NHOM.map((n, i) => [n, i])) as Record<Nhom, number>;
export const SO_NHOM = NHOM.length;
export const NHOM_NOI_BO = CHI_SO_NHOM.noi_bo;

/** Tiền vào được coi là dòng tiền kinh doanh thường xuyên (đưa vào mô hình). */
export const NHOM_VAO_KINH_DOANH: readonly Nhom[] = ['ban_hang', 'dat_coc', 'hoan_tien', 'vao_khac'];
export const NHOM_VAO_TAI_CHINH: readonly Nhom[] = ['vay', 'gop_von', 'nguoi_nha', 'thu_ho', 'ngoai_kd'];
export const NHOM_RA: readonly Nhom[] = ['nha_cung_cap', 'luong', 'mat_bang', 'thue', 'tra_no', 'chi_khac'];

export const TEN_NHOM: Record<'vi' | 'en', Record<Nhom, string>> = {
  vi: {
    ban_hang: 'Tiền bán hàng', dat_coc: 'Tiền đặt cọc', hoan_tien: 'Tiền được hoàn', vao_khac: 'Tiền vào khác',
    vay: 'Tiền vay', gop_von: 'Góp vốn', nguoi_nha: 'Người nhà chuyển', thu_ho: 'Thu hộ', ngoai_kd: 'Không phải doanh thu (chủ xác nhận)',
    nha_cung_cap: 'Trả nhà cung cấp', luong: 'Lương', mat_bang: 'Thuê mặt bằng', thue: 'Thuế, phí', tra_no: 'Trả nợ vay', chi_khac: 'Chi khác',
    noi_bo: 'Chuyển giữa tài khoản của mình',
  },
  en: {
    ban_hang: 'Sales', dat_coc: 'Deposits received', hoan_tien: 'Refunds received', vao_khac: 'Other inflow',
    vay: 'Loan disbursement', gop_von: 'Owner capital', nguoi_nha: 'Family transfer', thu_ho: 'Collected on behalf', ngoai_kd: 'Not revenue (owner confirmed)',
    nha_cung_cap: 'Supplier payments', luong: 'Payroll', mat_bang: 'Rent', thue: 'Tax and fees', tra_no: 'Loan repayment', chi_khac: 'Other spending',
    noi_bo: 'Transfer between own accounts',
  },
};

export const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Loại chủ đã xác nhận (`revenue_classifications.confirmed_type`) → nhóm dòng tiền. */
const TU_LOAI_CHU: Record<string, Nhom> = {
  business_revenue: 'ban_hang', loan: 'vay', capital_contribution: 'gop_von', family_transfer: 'nguoi_nha',
  personal: 'nguoi_nha', refund: 'hoan_tien', deposit: 'dat_coc', collection_on_behalf: 'thu_ho',
  internal_transfer: 'noi_bo', other: 'vao_khac', unknown: 'vao_khac',
};
const TU_GOI_Y: Record<string, Nhom> = { vay: 'vay', gop_von: 'gop_von', nguoi_nha: 'nguoi_nha', hoan_tien: 'hoan_tien', dat_coc: 'dat_coc' };

/** Quyết định của chủ cho một khoản tiền vào: loại cụ thể và/hoặc tác động doanh thu. */
export interface QuyetDinhChu { loai?: string | null; hieu_luc?: 'include' | 'exclude' | 'pending' | null }

export interface DongNoiDung {
  type?: string | null;
  merchant_name?: string | null;
  counter_account_name?: string | null;
  payment_reference?: string | null;
  category?: string | null;
}

const RA: { nhom: Nhom; mau: RegExp }[] = [
  { nhom: 'luong', mau: /\b(luong|tra luong|chi luong|thuong nhan vien|bhxh|bao hiem xa hoi|salary|payroll|wage|wages)\b/ },
  { nhom: 'thue', mau: /\b(nop thue|thue gtgt|thue tncn|thue tndn|thue mon bai|le phi mon bai|nsnn|ngan sach nha nuoc|kho bac|tax)\b/ },
  { nhom: 'mat_bang', mau: /\b(thue nha|tien nha|thue mat bang|mat bang|thue cua hang|thue kho|thue van phong|rent)\b/ },
  { nhom: 'tra_no', mau: /\b(tra no|tra goc|tra lai|lai vay|tat toan|thu no|tra gop|hdtd|loan|repayment)\b/ },
  { nhom: 'nha_cung_cap', mau: /\b(tien hang|nhap hang|thanh toan hd|thanh toan hoa don|don hang|cong no|ncc|nha cung cap|mua hang|supplier)\b/ },
];

export function chuNoiDung(t: DongNoiDung): string {
  return ` ${boDau([t.merchant_name, t.counter_account_name, t.payment_reference, t.category].filter(Boolean).join(' '))} `;
}

/** Nhóm của một khoản tiền VÀO. */
export function nhomVao(t: DongNoiDung, chu?: QuyetDinhChu | null): Nhom {
  if (chu?.loai && TU_LOAI_CHU[chu.loai]) return TU_LOAI_CHU[chu.loai];
  if (chu?.hieu_luc === 'include') return 'ban_hang';
  if (chu?.hieu_luc === 'exclude') return 'ngoai_kd';
  if (t.type === 'loan') return 'vay';
  const g = goiYTienVao({ merchant_name: t.merchant_name ?? null, counter_account_name: t.counter_account_name ?? null, payment_reference: t.payment_reference ?? null });
  return g ? TU_GOI_Y[g.loai] ?? 'vao_khac' : 'ban_hang';
}

/** Nhóm của một khoản tiền RA. */
export function nhomRa(t: DongNoiDung): Nhom {
  const chu = chuNoiDung(t);
  for (const r of RA) if (r.mau.test(chu)) return r.nhom;
  return 'chi_khac';
}

/** Chỉ chữ số — để so số tài khoản. */
export const soTk = (s: unknown): string => (typeof s === 'string' || typeof s === 'number' ? String(s).replace(/\D/g, '') : '');
