/**
 * ĐỒNG Ý VÀ GÓI GIỚI THIỆU (16/11/2026) — hàm thuần.
 *
 * Luật Bảo vệ dữ liệu cá nhân 2025 (hiệu lực 01/01/2026) + NĐ 356/2025: dữ liệu tài chính là dữ liệu nhạy cảm; đồng ý phải
 * rõ, cụ thể, không đánh dấu sẵn; việc phân tích/lập hồ sơ (profiling) phải được nói ra trong màn đồng ý; không mua bán
 * dữ liệu cá nhân. NĐ 91/2020: không gọi điện quảng cáo khi chưa được đồng ý. Vì vậy:
 *
 *   1. MIMI KHÔNG BAO GIỜ gửi danh sách người cho ngân hàng. Chỉ khi CHỦ chọn một gói cụ thể, đọc công bố phân tích, chọn
 *      đúng các trường muốn chia sẻ và bấm đồng ý, MỚI có một gói giới thiệu (bản nháp).
 *   2. Mặc định chỉ chia sẻ MỨC tăng trưởng + nhóm nhu cầu. Số liệu thật (doanh thu 12 tháng), danh tính, liên hệ chỉ đi
 *      khi chủ tự tích. Liên hệ chỉ được chọn khi chủ yêu cầu ngân hàng liên hệ — không yêu cầu thì không ai gọi.
 *   3. Gói chỉ dành cho pháp nhân của ngân hàng TẠI VIỆT NAM (không chuyển ra nước ngoài).
 *   4. Gói không tự gửi đi: chủ bấm "Gửi" (đổi trạng thái + xuất gói để chủ hoặc bộ phận vận hành MIMI chuyển). Không có
 *      lời gọi HTTP nào tới ngân hàng trong mã.
 *   5. Thu hồi: đồng ý hết hiệu lực, gói chuyển "đã rút" và NỘI DUNG GÓI BỊ XOÁ (giữ mã băm để đối chiếu).
 */
import { jsonOnDinh, sha256Hex } from '../tin-dung/cham-diem.ts';
import type { KetQuaTinHieu, MucTangTruong, Ngon } from './tin-hieu.ts';
import { TEN_MUC } from './tin-hieu.ts';
import type { NhuCau } from './khop-goi.ts';

export const PHIEN_BAN_GOI = 'mimi-goi-gioi-thieu-2026.11.16';
export const PHIEN_BAN_CONG_BO = 'cong-bo-phan-tich-2026.11.16';

export const TRUONG_CHIA_SE = [
  'muc_tang_truong', 'nhu_cau', 'khoang_doanh_thu', 'dau_hieu', 'doanh_thu_12_thang',
  'ten_doanh_nghiep', 'ma_so_thue', 'tinh_thanh', 'nganh', 'lien_he_email', 'lien_he_dien_thoai',
] as const;
export type TruongChiaSe = (typeof TRUONG_CHIA_SE)[number];
export const TRUONG_MAC_DINH: readonly TruongChiaSe[] = ['muc_tang_truong', 'nhu_cau'];
export const TRUONG_LIEN_HE: readonly TruongChiaSe[] = ['lien_he_email', 'lien_he_dien_thoai'];
/** Trường chứa SỐ LIỆU thật (không phải dải): chỉ đi khi chủ tự tích. */
export const TRUONG_SO_LIEU: readonly TruongChiaSe[] = ['doanh_thu_12_thang'];

export const TEN_TRUONG: Record<Ngon, Record<TruongChiaSe, string>> = {
  vi: {
    muc_tang_truong: 'Mức tăng trưởng của doanh nghiệp (vd. "Đang lên")',
    nhu_cau: 'Nhu cầu bạn đang quan tâm (vd. vốn lưu động)',
    khoang_doanh_thu: 'Dải doanh thu (vd. 1–3 tỷ), không phải con số',
    dau_hieu: 'Tên các dấu hiệu tăng trưởng (không kèm số tiền)',
    doanh_thu_12_thang: 'Con số tiền bán hàng 12 tháng (số thật)',
    ten_doanh_nghiep: 'Tên doanh nghiệp', ma_so_thue: 'Mã số thuế', tinh_thanh: 'Tỉnh/thành', nganh: 'Ngành',
    lien_he_email: 'Email để ngân hàng liên hệ', lien_he_dien_thoai: 'Số điện thoại để ngân hàng liên hệ',
  },
  en: {
    muc_tang_truong: 'Business growth tier (e.g. "Rising")',
    nhu_cau: 'Needs you are interested in (e.g. working capital)',
    khoang_doanh_thu: 'Revenue band (e.g. ₫1–3bn), not the figure',
    dau_hieu: 'Names of growth signals (no amounts)',
    doanh_thu_12_thang: 'Exact 12-month sales figure',
    ten_doanh_nghiep: 'Business name', ma_so_thue: 'Tax ID', tinh_thanh: 'Province', nganh: 'Industry',
    lien_he_email: 'Email for the bank to contact you', lien_he_dien_thoai: 'Phone for the bank to contact you',
  },
};

/** Công bố bắt buộc trong màn đồng ý (NĐ 356/2025: phải nói rõ việc phân tích/lập hồ sơ). */
export const CONG_BO_PHAN_TICH: Record<Ngon, string[]> = {
  vi: [
    'MIMI phân tích dữ liệu ngân hàng bạn đã kết nối (tiền vào, tiền ra theo tháng) để tính các dấu hiệu tăng trưởng và mức tăng trưởng của doanh nghiệp. Đây là việc phân tích, lập hồ sơ tự động bằng quy tắc viết sẵn, không phải điểm tín dụng.',
    'Chỉ những trường bạn tích bên dưới được đưa vào gói giới thiệu; giao dịch chi tiết không bao giờ được chia sẻ.',
    'Gói chỉ dành cho pháp nhân của ngân hàng tại Việt Nam, chỉ dùng cho mục đích ghi trên gói, và không được chuyển ra nước ngoài.',
    'MIMI không bán dữ liệu và không nhận tiền theo từng người được giới thiệu.',
    'Gói chưa đi đâu cho tới khi bạn bấm "Gửi". Bạn rút lại đồng ý bất cứ lúc nào; khi rút, MIMI xoá nội dung gói.',
  ],
  en: [
    'MIMI analyses the bank data you connected (monthly inflows and outflows) to compute growth signals and a growth tier for your business. This is automated, rule-based profiling — not a credit score.',
    'Only the fields you tick below go into the referral package; detailed transactions are never shared.',
    'The package is only for the bank\'s legal entity in Vietnam, only for the purpose stated, and is not transferred abroad.',
    'MIMI does not sell data and is not paid per person referred.',
    'Nothing is sent until you press "Send". You can withdraw consent at any time; MIMI then deletes the package content.',
  ],
};

export const SO_NGAY_MAC_DINH = 30;
export const SO_NGAY_TOI_THIEU = 7;
export const SO_NGAY_TOI_DA = 90;

export type KetQuaKiem<T> = { ok: true; v: T } | { ok: false; cau: string };

export interface YeuCauDongY {
  pham_vi: TruongChiaSe[];
  yeu_cau_lien_he: boolean;
  dien_thoai: string | null;
  so_ngay: number;
}

const DT = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;

/** Kiểm yêu cầu đồng ý từ thân yêu cầu. Không có mặc định ngầm: phạm vi rỗng là lỗi, không phải "chia sẻ tất cả". */
export function docYeuCauDongY(body: Record<string, unknown>, ngon: Ngon): KetQuaKiem<YeuCauDongY> {
  const vi = ngon === 'vi';
  if (body.hieu_phan_tich !== true) return { ok: false, cau: vi ? 'Cần xác nhận bạn đã đọc phần công bố MIMI phân tích dữ liệu của bạn.' : 'Please confirm you have read how MIMI analyses your data.' };
  if (!Array.isArray(body.pham_vi) || body.pham_vi.length === 0) return { ok: false, cau: vi ? 'Chọn ít nhất một thông tin để chia sẻ.' : 'Choose at least one field to share.' };
  const phamVi = [...new Set(body.pham_vi.map(String))];
  const la = phamVi.filter((x) => !(TRUONG_CHIA_SE as readonly string[]).includes(x));
  if (la.length) return { ok: false, cau: vi ? `Trường không hợp lệ: ${la.join(', ')}.` : `Unknown field(s): ${la.join(', ')}.` };
  const yeuCauLienHe = body.yeu_cau_lien_he === true;
  const coLienHe = phamVi.some((x) => (TRUONG_LIEN_HE as readonly string[]).includes(x));
  if (coLienHe && !yeuCauLienHe) return { ok: false, cau: vi ? 'Thông tin liên hệ chỉ được chia sẻ khi bạn muốn ngân hàng liên hệ.' : 'Contact details are shared only if you ask the bank to contact you.' };
  if (yeuCauLienHe && !coLienHe) return { ok: false, cau: vi ? 'Muốn ngân hàng liên hệ thì chọn email hoặc số điện thoại.' : 'To be contacted, choose email or phone.' };
  let dienThoai: string | null = null;
  if (phamVi.includes('lien_he_dien_thoai')) {
    const s = String(body.dien_thoai ?? '').replace(/[\s.-]/g, '');
    if (!DT.test(s)) return { ok: false, cau: vi ? 'Số điện thoại không hợp lệ.' : 'Invalid phone number.' };
    dienThoai = s;
  }
  const soNgay = body.so_ngay === undefined ? SO_NGAY_MAC_DINH : Number(body.so_ngay);
  if (!Number.isInteger(soNgay) || soNgay < SO_NGAY_TOI_THIEU || soNgay > SO_NGAY_TOI_DA) {
    return { ok: false, cau: vi ? `Thời hạn đồng ý từ ${SO_NGAY_TOI_THIEU} đến ${SO_NGAY_TOI_DA} ngày.` : `Consent must last ${SO_NGAY_TOI_THIEU}–${SO_NGAY_TOI_DA} days.` };
  }
  const thuTu = (x: string) => (TRUONG_CHIA_SE as readonly string[]).indexOf(x);
  return { ok: true, v: { pham_vi: (phamVi as TruongChiaSe[]).sort((a, b) => thuTu(a) - thuTu(b)), yeu_cau_lien_he: yeuCauLienHe, dien_thoai: dienThoai, so_ngay: soNgay } };
}

export type KhoangDoanhThu = 'duoi_1_ty' | 'tu_1_den_3_ty' | 'tu_3_den_10_ty' | 'tren_10_ty';
export function khoangDoanhThu(gt: number | null): KhoangDoanhThu | null {
  if (gt === null || !Number.isFinite(gt)) return null;
  if (gt <= 1e9) return 'duoi_1_ty';
  if (gt <= 3e9) return 'tu_1_den_3_ty';
  if (gt <= 10e9) return 'tu_3_den_10_ty';
  return 'tren_10_ty';
}

/** Toàn bộ những gì MIMI CÓ THỂ đưa vào gói. `lapGoi` chỉ chép những trường đã được đồng ý. */
export interface HoSoDayDu {
  muc_tang_truong: { ma: MucTangTruong; ten: string };
  nhu_cau: NhuCau[];
  khoang_doanh_thu: KhoangDoanhThu | null;
  dau_hieu: { ma: string; do_tin_cay: string }[];
  doanh_thu_12_thang: number | null;
  ten_doanh_nghiep: string | null;
  ma_so_thue: string | null;
  tinh_thanh: string | null;
  nganh: string | null;
  lien_he_email: string | null;
  lien_he_dien_thoai: string | null;
}

export function dungHoSoDayDu(th: KetQuaTinHieu, nhuCau: NhuCau[], ct: {
  ten: string | null; ma_so_thue: string | null; tinh_thanh: string | null; nganh: string | null; email: string | null; dien_thoai: string | null;
}, ngon: Ngon): HoSoDayDu {
  const dt = th.tin_hieu.find((t) => t.ma === 'da_vuot_nguong');
  const ocDt = th.doanh_thu_12_thang ?? (dt?.bang_chung.so.uoc_tinh as number | undefined) ?? null;
  return {
    muc_tang_truong: { ma: th.muc, ten: TEN_MUC[ngon][th.muc] },
    nhu_cau: nhuCau,
    khoang_doanh_thu: khoangDoanhThu(ocDt),
    // Chỉ tên dấu hiệu và mức tin cậy — không kèm số tiền, tháng hay mã giao dịch.
    dau_hieu: th.tin_hieu.map((t) => ({ ma: t.ma, do_tin_cay: t.do_tin_cay })),
    doanh_thu_12_thang: th.doanh_thu_12_thang,
    ten_doanh_nghiep: ct.ten, ma_so_thue: ct.ma_so_thue, tinh_thanh: ct.tinh_thanh, nganh: ct.nganh,
    lien_he_email: ct.email, lien_he_dien_thoai: ct.dien_thoai,
  };
}

export interface GoiGioiThieu {
  phien_ban: string;
  lap_ngay: string;
  ngan_hang: string;
  phap_nhan_nhan: string;
  pham_vi_lanh_tho: 'viet_nam';
  goi: { ma: string; ten_goi: string };
  muc_dich: string;
  yeu_cau_lien_he: boolean;
  het_han: string;
  du_lieu: Partial<Record<TruongChiaSe, unknown>>;
}

export function mucDich(goi: { ngan_hang: string; ten_goi: string }, yeuCauLienHe: boolean, ngon: Ngon): string {
  return ngon === 'vi'
    ? `Để ${goi.ngan_hang} xem nhu cầu của doanh nghiệp đối với "${goi.ten_goi}"${yeuCauLienHe ? ' và liên hệ lại theo yêu cầu của chủ doanh nghiệp' : ''}. Không dùng cho mục đích khác, không chuyển cho bên thứ ba, không chuyển ra nước ngoài.`
    : `For ${goi.ngan_hang} to review the business's interest in "${goi.ten_goi}"${yeuCauLienHe ? ' and contact the owner as requested' : ''}. No other use, no third parties, no transfer abroad.`;
}

/** Gói giới thiệu chứa ĐÚNG các trường đã được đồng ý, không hơn. */
export function lapGoi(hs: HoSoDayDu, yc: YeuCauDongY, goi: { ma: string; ngan_hang: string; phap_nhan_nhan: string; ten_goi: string }, lapNgay: string, hetHan: string, ngon: Ngon): GoiGioiThieu {
  const duLieu: Partial<Record<TruongChiaSe, unknown>> = {};
  for (const k of yc.pham_vi) duLieu[k] = k === 'lien_he_dien_thoai' ? yc.dien_thoai : hs[k];
  return {
    phien_ban: PHIEN_BAN_GOI,
    lap_ngay: lapNgay,
    ngan_hang: goi.ngan_hang,
    phap_nhan_nhan: goi.phap_nhan_nhan,
    pham_vi_lanh_tho: 'viet_nam',
    goi: { ma: goi.ma, ten_goi: goi.ten_goi },
    muc_dich: mucDich(goi, yc.yeu_cau_lien_he, ngon),
    yeu_cau_lien_he: yc.yeu_cau_lien_he,
    het_han: hetHan,
    du_lieu: duLieu,
  };
}

export const bamGoi = (g: GoiGioiThieu) => sha256Hex(jsonOnDinh(g));

export function hanDongY(bayGio: Date, soNgay: number): string {
  return new Date(bayGio.getTime() + soNgay * 86_400_000).toISOString();
}

export type TrangThaiDongY = 'con_hieu_luc' | 'het_han' | 'da_thu_hoi';
export function trangThaiDongY(d: { expires_at: string; revoked_at: string | null }, bayGio: Date): TrangThaiDongY {
  if (d.revoked_at) return 'da_thu_hoi';
  return Date.parse(d.expires_at) <= bayGio.getTime() ? 'het_han' : 'con_hieu_luc';
}

/** Bản chữ của gói để chủ đọc lại / in / gửi — chỉ dựng từ chính gói đã lưu. */
export function vanBanGoi(g: GoiGioiThieu, ngon: Ngon): string {
  const vi = ngon === 'vi';
  const dong = [
    vi ? 'GÓI GIỚI THIỆU DO CHỦ DOANH NGHIỆP ĐỒNG Ý' : 'REFERRAL PACKAGE APPROVED BY THE BUSINESS OWNER',
    `${vi ? 'Ngân hàng nhận' : 'Receiving bank'}: ${g.phap_nhan_nhan}`,
    `${vi ? 'Gói dịch vụ' : 'Product'}: ${g.goi.ten_goi}`,
    `${vi ? 'Mục đích' : 'Purpose'}: ${g.muc_dich}`,
    `${vi ? 'Hiệu lực tới' : 'Valid until'}: ${g.het_han.slice(0, 10)}`,
    '',
  ];
  for (const [k, v] of Object.entries(g.du_lieu)) {
    const ten = TEN_TRUONG[ngon][k as TruongChiaSe] ?? k;
    const gt = v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    dong.push(`- ${ten}: ${gt}`);
  }
  dong.push('', vi ? 'Không phải điểm tín dụng. Không phải lời khuyên đầu tư. Chỉ dùng tại Việt Nam.' : 'Not a credit score. Not investment advice. For use in Vietnam only.');
  return dong.join('\n');
}
