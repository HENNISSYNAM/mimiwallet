/**
 * Khoản tiền vào này là gì — lớp phân loại giữa "tiền vào tài khoản" và "doanh thu".
 *
 * Bản chỉ đạo ra mắt (docs/KIEM_TOAN_RA_MAT.md): tiền vào ≠ doanh thu. Máy gợi ý (đọc nội dung
 * chuyển khoản, `phan-loai/tien-vao.ts`); NGƯỜI quyết; mọi lần đổi có lịch sử và hoàn tác được.
 *
 * Hàm thuần, dùng chung cho edge function và trình duyệt.
 */
import { goiYTienVao, type KhoanTienVao, type LoaiTienVao } from '../phan-loai/tien-vao.ts';

export const LOAI_PHAN_LOAI = [
  'business_revenue', 'internal_transfer', 'loan', 'capital_contribution', 'family_transfer',
  'personal', 'refund', 'deposit', 'collection_on_behalf', 'other', 'unknown',
] as const;
export type LoaiPhanLoai = typeof LOAI_PHAN_LOAI[number];
export type AnhHuong = 'include' | 'exclude' | 'pending';

/** Chữ người dùng đọc — đời thường, không thuật ngữ. */
export const TEN_PHAN_LOAI: Record<LoaiPhanLoai, string> = {
  business_revenue: 'Tiền bán hàng / dịch vụ',
  internal_transfer: 'Chuyển giữa tài khoản của tôi',
  loan: 'Tiền vay',
  capital_contribution: 'Góp vốn',
  family_transfer: 'Người nhà chuyển',
  personal: 'Tiền cá nhân',
  refund: 'Hoàn tiền',
  deposit: 'Đặt cọc',
  collection_on_behalf: 'Thu hộ',
  other: 'Khác',
  unknown: 'Tôi chưa chắc',
};

/**
 * Bốn nút đầu tiên (mục P-3): người dùng chính là ba mẹ lớn tuổi, 11 lựa chọn là quá nhiều.
 * "Không phải tiền bán hàng" bấm vào mới hiện các loại còn lại.
 */
export const NUT_CHINH: LoaiPhanLoai[] = ['business_revenue', 'internal_transfer', 'unknown'];
export const LOAI_KHONG_PHAI_DOANH_THU: LoaiPhanLoai[] = [
  'loan', 'family_transfer', 'capital_contribution', 'refund', 'deposit', 'collection_on_behalf', 'personal', 'other',
];

export function anhHuong(loai: LoaiPhanLoai): AnhHuong {
  if (loai === 'business_revenue') return 'include';
  if (loai === 'unknown') return 'pending';
  return 'exclude';
}

/** Gợi ý của bộ đọc nội dung chuyển khoản, đổi sang loại của lớp phân loại. */
export const TU_GOI_Y: Record<LoaiTienVao, LoaiPhanLoai> = {
  vay: 'loan', gop_von: 'capital_contribution', nguoi_nha: 'family_transfer', hoan_tien: 'refund', dat_coc: 'deposit',
};

export interface GoiYPhanLoai { loai: LoaiPhanLoai; ly_do: string }

export function goiYPhanLoai(t: KhoanTienVao): GoiYPhanLoai | null {
  const g = goiYTienVao(t);
  return g ? { loai: TU_GOI_Y[g.loai], ly_do: g.ly_do } : null;
}

export interface TienVao extends KhoanTienVao {
  id: string;
  amount: number;
  transaction_date: string;
}

export interface XacNhanPhanLoai {
  transaction_id: string;
  confirmed_type: LoaiPhanLoai;
  revenue_effect: AnhHuong;
  ghi_chu: string | null;
  confirmed_role: string;
  confirmed_at: string;
}

export interface DongTienVao {
  id: string;
  ngay: string;
  so_tien: number;
  /** Nguyên văn: tên người chuyển — nội dung chuyển khoản. */
  noi_dung: string;
  goi_y: GoiYPhanLoai | null;
  xac_nhan: XacNhanPhanLoai | null;
  noi_bo: boolean;
}

export interface NhomGoiY {
  khoa: string;
  /** "17 khoản từ SHOPEE" — nói bằng lời. */
  mo_ta: string;
  so: number;
  tong: number;
  transaction_ids: string[];
  goi_y: LoaiPhanLoai | null;
}

export interface BangTienVao {
  nam: number;
  so_giao_dich: number;
  tong_vao: number;
  noi_bo: number;
  /** Người đã xác nhận là tiền bán hàng. */
  doanh_thu_da_xac_nhan: number;
  khong_phai_doanh_thu: number;
  /** Chưa ai xác nhận, hoặc "Tôi chưa chắc". */
  chua_ro: number;
  /** Khoản MIMI thấy đáng ngờ mà người dùng chưa quyết. */
  can_xem: { so: number; tong: number };
  dong: DongTienVao[];
  nhom: NhomGoiY[];
}

const soTien = (x: number) => Math.abs(Number(x) || 0);
const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();

/**
 * Mẫu nội dung: bỏ số và mã để "TT DON 1523" và "TT DON 1524" là một mẫu. Chỉ giữ chữ, nên hai khoản
 * cùng người chuyển, cùng kiểu nội dung gom được một nhóm — áp một lần cho cả nhóm.
 */
export function mauNoiDung(t: KhoanTienVao): string {
  const nd = boDau(t.merchant_name ?? t.payment_reference ?? '').replace(/[^A-Z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const nguoi = boDau(t.counter_account_name ?? '').replace(/\s+/g, ' ').trim();
  return `${nguoi}|${nd.split(' ').slice(0, 4).join(' ')}`;
}

export function lapBangTienVao(nam: number, vao: TienVao[], xacNhan: XacNhanPhanLoai[], noiBoIds: Set<string>): BangTienVao {
  const theoGd = new Map(xacNhan.map((x) => [x.transaction_id, x]));
  const trongNam = vao.filter((t) => t.transaction_date.startsWith(String(nam)));
  const dong: DongTienVao[] = trongNam.map((t) => ({
    id: t.id,
    ngay: t.transaction_date.slice(0, 10),
    so_tien: soTien(t.amount),
    noi_dung: [t.counter_account_name, t.merchant_name ?? t.payment_reference].filter(Boolean).join(' — ') || '—',
    goi_y: goiYPhanLoai(t),
    xac_nhan: theoGd.get(t.id) ?? null,
    noi_bo: noiBoIds.has(t.id),
  })).sort((a, b) => b.ngay.localeCompare(a.ngay) || b.so_tien - a.so_tien);

  const cong = (ds: DongTienVao[]) => ds.reduce((s, d) => s + d.so_tien, 0);
  const khongNoiBo = dong.filter((d) => !d.noi_bo);
  const canXem = khongNoiBo.filter((d) => d.goi_y && !d.xac_nhan);

  // Gom khoản chưa quyết theo mẫu (cùng người chuyển + cùng kiểu nội dung); chỉ nhóm từ 2 khoản.
  const theoMau = new Map<string, { ds: DongTienVao[]; t: TienVao }>();
  const dongTheoId = new Map(dong.map((d) => [d.id, d]));
  for (const t of trongNam) {
    const d = dongTheoId.get(t.id)!;
    if (d.noi_bo || d.xac_nhan) continue;
    const k = mauNoiDung(t);
    const cu = theoMau.get(k) ?? { ds: [], t };
    cu.ds.push(d);
    theoMau.set(k, cu);
  }
  const nhom: NhomGoiY[] = [...theoMau.entries()]
    .filter(([, v]) => v.ds.length >= 2)
    .map(([k, v]) => {
      const nguoi = v.t.counter_account_name?.trim();
      const goiY = v.ds.find((d) => d.goi_y)?.goi_y?.loai ?? null;
      return {
        khoa: k,
        mo_ta: `${v.ds.length} khoản ${nguoi ? `từ ${nguoi}` : 'cùng kiểu nội dung'} — “${(v.t.merchant_name ?? '').slice(0, 40)}”`,
        so: v.ds.length,
        tong: cong(v.ds),
        transaction_ids: v.ds.map((d) => d.id),
        goi_y: goiY,
      };
    })
    .sort((a, b) => b.tong - a.tong);

  return {
    nam,
    so_giao_dich: dong.length,
    tong_vao: cong(dong),
    noi_bo: cong(dong.filter((d) => d.noi_bo)),
    doanh_thu_da_xac_nhan: cong(khongNoiBo.filter((d) => d.xac_nhan?.revenue_effect === 'include')),
    khong_phai_doanh_thu: cong(khongNoiBo.filter((d) => d.xac_nhan?.revenue_effect === 'exclude')),
    chua_ro: cong(khongNoiBo.filter((d) => !d.xac_nhan || d.xac_nhan.revenue_effect === 'pending')),
    can_xem: { so: canXem.length, tong: cong(canXem) },
    dong,
    nhom,
  };
}

export const TOI_DA_MOT_LAN = 500;

/** Kiểm yêu cầu xác nhận gửi lên (một khoản hoặc cả nhóm). */
export function docXacNhan(v: unknown):
  | { ok: true; loai: LoaiPhanLoai; ghi_chu: string | null; transaction_ids: string[] }
  | { ok: false; cau: string } {
  if (!v || typeof v !== 'object') return { ok: false, cau: 'Thiếu nội dung xác nhận.' };
  const o = v as Record<string, unknown>;
  const loai = String(o.loai ?? '');
  if (!(LOAI_PHAN_LOAI as readonly string[]).includes(loai)) return { ok: false, cau: 'Chọn khoản tiền này là gì.' };
  const ids = Array.isArray(o.transaction_ids) ? o.transaction_ids.filter((x): x is string => typeof x === 'string' && !!x) : [];
  if (!ids.length) return { ok: false, cau: 'Thiếu khoản tiền cần xác nhận.' };
  if (ids.length > TOI_DA_MOT_LAN) return { ok: false, cau: `Mỗi lần xác nhận tối đa ${TOI_DA_MOT_LAN} khoản.` };
  const ghiChu = typeof o.ghi_chu === 'string' && o.ghi_chu.trim() ? o.ghi_chu.trim() : null;
  if (ghiChu && ghiChu.length > 500) return { ok: false, cau: 'Ghi chú tối đa 500 ký tự.' };
  if (loai === 'other' && !ghiChu) return { ok: false, cau: 'Chọn "Khác" thì ghi rõ đó là khoản gì.' };
  return { ok: true, loai: loai as LoaiPhanLoai, ghi_chu: ghiChu, transaction_ids: [...new Set(ids)] };
}

export interface SuKienPhanLoai {
  transaction_id: string;
  from_type: string | null;
  from_effect: string | null;
  at: string;
}

/**
 * Hoàn tác: đưa mỗi khoản về trạng thái TRƯỚC lần xác nhận bị hoàn tác. `from_type` null nghĩa là
 * trước đó chưa ai phân loại → gỡ phân loại (khoản quay lại "chưa rõ").
 */
export function keHoachHoanTac(suKien: SuKienPhanLoai[]): { transaction_id: string; ve: { loai: LoaiPhanLoai; anh_huong: AnhHuong } | null }[] {
  const moiNhat = new Map<string, SuKienPhanLoai>();
  for (const s of suKien) {
    const cu = moiNhat.get(s.transaction_id);
    if (!cu || s.at > cu.at) moiNhat.set(s.transaction_id, s);
  }
  return [...moiNhat.values()].map((s) => ({
    transaction_id: s.transaction_id,
    ve: s.from_type && (LOAI_PHAN_LOAI as readonly string[]).includes(s.from_type)
      ? { loai: s.from_type as LoaiPhanLoai, anh_huong: anhHuong(s.from_type as LoaiPhanLoai) }
      : null,
  }));
}
