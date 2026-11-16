/**
 * NHU CẦU → GÓI DỊCH VỤ NGÂN HÀNG (16/11/2026) — hàm thuần, tất định.
 *
 * Từ dấu hiệu tăng trưởng (`tin-hieu.ts`) suy ra NHU CẦU của doanh nghiệp (vốn lưu động, tài khoản/quản lý dòng tiền,
 * ngoại tệ, tiền gửi cho tiền dư, dịch vụ ưu tiên cho chủ, bảo hiểm), rồi ghép với danh mục gói của ngân hàng
 * (`goi_ngan_hang`, bảng cấu hình — không gắn cứng ngân hàng nào).
 *
 * KHÔNG khuyến nghị đầu tư: danh mục chỉ nhận các nhóm nhu cầu ở `NHU_CAU_CO_GOI`; gói nào có tên/mô tả giống sản phẩm
 * đầu tư (quỹ, chứng khoán, trái phiếu, bảo hiểm liên kết…) bị loại khỏi kết quả dù cấu hình sai. Nhu cầu "bảo hiểm" chỉ
 * được NÊU (có lý do) và KHÔNG bao giờ ghép gói cụ thể — MIMI không tư vấn bảo hiểm.
 *
 * Gói CHƯA XÁC MINH (`da_xac_minh = false`) không bao giờ hiện điều kiện hay ngưỡng: `tieu_chi` trả về null, kèm nhãn
 * "chưa xác minh". Gói đã xác minh mang URL nguồn công khai.
 */
import type { DoTinCay, KetQuaTinHieu, MaTinHieu, Ngon, TinHieu } from './tin-hieu.ts';
import { boDau } from '../dong-tien/phan-nhom.ts';

export const NHU_CAU = ['von_luu_dong', 'tai_khoan_doanh_nghiep', 'ngoai_te', 'tien_gui', 'uu_tien_chu', 'bao_hiem'] as const;
export type NhuCau = (typeof NHU_CAU)[number];
/** Nhóm nhu cầu được phép ghép gói. Bảo hiểm: chỉ nêu nhu cầu. */
export const NHU_CAU_CO_GOI: readonly NhuCau[] = ['von_luu_dong', 'tai_khoan_doanh_nghiep', 'ngoai_te', 'tien_gui', 'uu_tien_chu'];

export const TEN_NHU_CAU: Record<Ngon, Record<NhuCau, string>> = {
  vi: {
    von_luu_dong: 'Vốn lưu động', tai_khoan_doanh_nghiep: 'Tài khoản và quản lý dòng tiền doanh nghiệp',
    ngoai_te: 'Ngoại tệ và thanh toán quốc tế', tien_gui: 'Tiền gửi cho khoản tiền dư',
    uu_tien_chu: 'Dịch vụ ưu tiên cho chủ doanh nghiệp', bao_hiem: 'Bảo hiểm',
  },
  en: {
    von_luu_dong: 'Working-capital loan', tai_khoan_doanh_nghiep: 'Business account and cash management',
    ngoai_te: 'FX and cross-border payments', tien_gui: 'Deposit for surplus cash',
    uu_tien_chu: 'Premium banking for the owner', bao_hiem: 'Insurance',
  },
};

/** Dấu hiệu → nhu cầu, kèm độ mạnh 0..1 (quy ước sản phẩm, chưa hiệu chỉnh). */
export const BANG_NHU_CAU: Record<MaTinHieu, Partial<Record<NhuCau, number>>> = {
  da_vuot_nguong: { tai_khoan_doanh_nghiep: 0.8, uu_tien_chu: 0.5 },
  sap_vuot_nguong: { tai_khoan_doanh_nghiep: 0.7, von_luu_dong: 0.5 },
  tang_truong_doanh_thu: { von_luu_dong: 0.6, tai_khoan_doanh_nghiep: 0.5 },
  mo_co_so_moi: { tai_khoan_doanh_nghiep: 0.8, von_luu_dong: 0.6, bao_hiem: 0.5 },
  tien_vao_lon_mot_lan: { tien_gui: 0.6, uu_tien_chu: 0.6 },
  giai_ngan_vay: { von_luu_dong: 0.4 },
  tra_no_vay_deu: { von_luu_dong: 0.5 },
  quy_luong_tang: { tai_khoan_doanh_nghiep: 0.7, bao_hiem: 0.5 },
  dong_tien_quoc_te: { ngoai_te: 0.8 },
  tien_du_dong_lai: { tien_gui: 0.8, uu_tien_chu: 0.5 },
  khoang_trong_von_luu_dong: { von_luu_dong: 0.9 },
};
/** Mỗi dấu hiệu ủng hộ thêm cộng ngần này vào độ mạnh (trần 1). */
export const CONG_THEM_MOI_DAU_HIEU = 0.1;

const LY_DO: Record<Ngon, Record<NhuCau, string>> = {
  vi: {
    von_luu_dong: 'Doanh nghiệp đang lớn hoặc có tháng hụt tiền theo mùa — vốn lưu động giúp nhập hàng, trả lương đúng hạn.',
    tai_khoan_doanh_nghiep: 'Tiền qua tài khoản ngày càng nhiều (hoặc nhiều cơ sở, nhiều người nhận lương) — tài khoản riêng cho kinh doanh giúp tách bạch và chi trả hàng loạt.',
    ngoai_te: 'Có tiền vào/ra liên quan ngoại tệ hoặc nước ngoài — nên hỏi phí chuyển và tỷ giá.',
    tien_gui: 'Có phần tiền dư đều đặn vượt nhu cầu chi — có thể để ở tài khoản tiền gửi thay vì nằm yên.',
    uu_tien_chu: 'Quy mô tiền qua doanh nghiệp đủ lớn để chủ hỏi về dịch vụ khách hàng ưu tiên.',
    bao_hiem: 'Có thêm cơ sở hoặc thêm người lao động — nên tự tìm hiểu bảo hiểm tài sản và người lao động; MIMI không gợi ý sản phẩm bảo hiểm cụ thể.',
  },
  en: {
    von_luu_dong: 'The business is growing or has seasonal cash gaps — working capital helps buy stock and pay staff on time.',
    tai_khoan_doanh_nghiep: 'More money flows through your accounts (or several branches and payees) — a dedicated business account keeps things separate and supports bulk payments.',
    ngoai_te: 'Some inflows/outflows involve foreign currency or other countries — worth asking about transfer fees and FX rates.',
    tien_gui: 'There is a steady surplus above spending needs — it could sit in a deposit account instead of idling.',
    uu_tien_chu: 'Money flowing through the business is large enough for the owner to ask about premium banking.',
    bao_hiem: 'New branch or more staff — consider looking into property and staff insurance yourself; MIMI does not suggest specific insurance products.',
  },
};

// ── Danh mục gói ────────────────────────────────────────────────────────────

export interface GoiNganHang {
  id: string;
  ma: string;
  ngan_hang: string;
  /** Pháp nhân nhận dữ liệu — luôn tại Việt Nam. */
  phap_nhan_nhan: string;
  ten_goi: string;
  nhu_cau: string;
  mo_ta: string;
  /** Điều kiện công bố (null khi chưa xác minh — CSDL cũng chặn: chưa xác minh thì phải null). */
  tieu_chi: Record<string, unknown> | null;
  da_xac_minh: boolean;
  nguon: string | null;
  dang_hoat_dong: boolean;
}

export type PhuHop = 'phu_hop' | 'chua_kiem_duoc' | 'chua_dat';

export interface GoiHien {
  id: string;
  ma: string;
  ngan_hang: string;
  phap_nhan_nhan: string;
  ten_goi: string;
  mo_ta: string;
  da_xac_minh: boolean;
  nguon: string | null;
  /** Chỉ có khi đã xác minh. */
  tieu_chi: Record<string, unknown> | null;
  nhan_xac_minh: string;
  phu_hop: PhuHop;
  ly_do_dieu_kien: string[];
}

export interface NhuCauKhop {
  nhu_cau: NhuCau;
  ten: string;
  do_manh: number;
  /** Độ tin cậy cao nhất trong các dấu hiệu tạo ra nhu cầu (số, 0..1). */
  tin_cay: number;
  muc_tin_cay: DoTinCay;
  tu_dau_hieu: MaTinHieu[];
  ly_do: string;
  goi: GoiHien[];
}

/** Từ ngữ của sản phẩm đầu tư / bảo hiểm (đã bỏ dấu). Gói nào khớp bị loại — MIMI không tư vấn đầu tư. */
const MAU_DAU_TU = /\b(dau tu|chung khoan|co phieu|trai phieu|chung chi quy|quy dau tu|quy mo|lien ket dau tu|bao hiem|invest|investment|securities|stock|stocks|equity|bond|bonds|mutual fund|unit trust|fund|funds|crypto|tien so|vang|gold|insurance|bancassurance|wealthforward)\b/;
export const laSanPhamDauTu = (g: Pick<GoiNganHang, 'ten_goi' | 'mo_ta'>) => MAU_DAU_TU.test(` ${boDau(`${g.ten_goi} ${g.mo_ta}`)} `);

export interface BoiCanh {
  ngon: Ngon;
  /** Tỉnh/thành của doanh nghiệp (để so điều kiện cư trú công bố, nếu có). */
  tinh_thanh: string | null;
}

/** So điều kiện công bố với những gì MIMI biết. MIMI KHÔNG thấy số dư hay thu nhập cá nhân của chủ → "chưa kiểm được". */
export function kiemDieuKien(g: GoiNganHang, th: KetQuaTinHieu, bc: BoiCanh): { phu_hop: PhuHop; ly_do: string[] } {
  if (!g.da_xac_minh || !g.tieu_chi) return { phu_hop: 'chua_kiem_duoc', ly_do: [bc.ngon === 'vi' ? 'Điều kiện chưa được xác minh từ nguồn công khai.' : 'Eligibility not yet verified from public sources.'] };
  const tc = g.tieu_chi;
  const ly: string[] = [];
  let dat = true;
  let kiemDuoc = true;
  const tinh = Array.isArray(tc.tinh_thanh) ? (tc.tinh_thanh as string[]) : null;
  if (tinh) {
    if (!bc.tinh_thanh) { kiemDuoc = false; ly.push(bc.ngon === 'vi' ? 'Chưa biết tỉnh/thành của bạn để so điều kiện nơi cư trú.' : 'Your province is unknown, so residency cannot be checked.'); }
    else if (!tinh.some((t) => boDau(bc.tinh_thanh!).includes(boDau(t)))) { dat = false; ly.push(bc.ngon === 'vi' ? `Gói chỉ dành cho người ở ${tinh.join(', ')}.` : `Only for residents of ${tinh.join(', ')}.`); }
  }
  if (typeof tc.doanh_thu_nam_toi_thieu === 'number') {
    const dt = th.doanh_thu_12_thang;
    if (dt === null) { kiemDuoc = false; ly.push(bc.ngon === 'vi' ? 'Chưa đủ 12 tháng để so doanh thu tối thiểu.' : 'Fewer than 12 months to compare minimum revenue.'); }
    else if (dt < tc.doanh_thu_nam_toi_thieu) { dat = false; ly.push(bc.ngon === 'vi' ? 'Tiền bán hàng 12 tháng thấp hơn mức tối thiểu công bố.' : '12-month sales are below the published minimum.'); }
  }
  // Điều kiện về số dư / thu nhập cá nhân tại ngân hàng: MIMI không thấy, không đoán.
  for (const k of ['so_du_binh_quan_thang_toi_thieu', 'thu_nhap_thang_toi_thieu']) {
    if (typeof tc[k] === 'number') { kiemDuoc = false; ly.push(bc.ngon === 'vi' ? 'Điều kiện tính trên tài khoản cá nhân của bạn tại ngân hàng — MIMI không thấy, ngân hàng sẽ tự kiểm.' : 'This condition is about your personal account at the bank — MIMI cannot see it; the bank checks it.'); }
  }
  if (!dat) return { phu_hop: 'chua_dat', ly_do: ly };
  return { phu_hop: kiemDuoc ? 'phu_hop' : 'chua_kiem_duoc', ly_do: [...new Set(ly)] };
}

function hienGoi(g: GoiNganHang, th: KetQuaTinHieu, bc: BoiCanh): GoiHien {
  const dk = kiemDieuKien(g, th, bc);
  return {
    id: g.id, ma: g.ma, ngan_hang: g.ngan_hang, phap_nhan_nhan: g.phap_nhan_nhan, ten_goi: g.ten_goi, mo_ta: g.mo_ta,
    da_xac_minh: g.da_xac_minh, nguon: g.da_xac_minh ? g.nguon : null,
    // Chưa xác minh: KHÔNG bao giờ trả ngưỡng, dù hàng trong CSDL có dữ liệu.
    tieu_chi: g.da_xac_minh ? g.tieu_chi : null,
    nhan_xac_minh: g.da_xac_minh
      ? (bc.ngon === 'vi' ? 'Đã đối chiếu với trang công khai của ngân hàng' : 'Checked against the bank\'s public page')
      : (bc.ngon === 'vi' ? 'Chưa xác minh — tên gói và điều kiện cần hỏi lại ngân hàng' : 'Unverified — confirm the product name and terms with the bank'),
    phu_hop: dk.phu_hop,
    ly_do_dieu_kien: dk.ly_do,
  };
}

/** Gói có đòi một dấu hiệu cụ thể không (vd. tư vấn đầu tư trực tiếp nước ngoài chỉ khi có dòng tiền liên quan Hàn Quốc). */
function canDauHieu(g: GoiNganHang, th: KetQuaTinHieu): boolean {
  const tc = g.tieu_chi ?? {};
  if (tc.can_lien_quan_han_quoc === true) {
    return th.tin_hieu.some((t) => t.ma === 'dong_tien_quoc_te' && t.bang_chung.so.lien_quan_han_quoc === true);
  }
  return true;
}

export function khopNhuCau(th: KetQuaTinHieu, danhMuc: readonly GoiNganHang[], bc: BoiCanh): NhuCauKhop[] {
  const theoNhuCau = new Map<NhuCau, { manh: number[]; tin: TinHieu[] }>();
  for (const t of th.tin_hieu) {
    for (const [n, w] of Object.entries(BANG_NHU_CAU[t.ma] ?? {}) as [NhuCau, number][]) {
      const m = theoNhuCau.get(n) ?? { manh: [], tin: [] };
      m.manh.push(w); m.tin.push(t);
      theoNhuCau.set(n, m);
    }
  }
  const goiHopLe = [...danhMuc]
    .filter((g) => g.dang_hoat_dong && (NHU_CAU_CO_GOI as readonly string[]).includes(g.nhu_cau) && !laSanPhamDauTu(g))
    .sort((a, b) => (a.ma < b.ma ? -1 : a.ma > b.ma ? 1 : 0));

  const ra: NhuCauKhop[] = [];
  for (const n of NHU_CAU) {
    const m = theoNhuCau.get(n);
    if (!m) continue;
    const doManh = Math.min(1, Math.max(...m.manh) + CONG_THEM_MOI_DAU_HIEU * (m.manh.length - 1));
    const caoNhat = m.tin.reduce((a, t) => (t.tin_cay_so > a.tin_cay_so ? t : a), m.tin[0]);
    const goi = (NHU_CAU_CO_GOI as readonly string[]).includes(n)
      ? goiHopLe.filter((g) => g.nhu_cau === n && canDauHieu(g, th)).map((g) => hienGoi(g, th, bc)).filter((g) => g.phu_hop !== 'chua_dat')
      : [];
    ra.push({
      nhu_cau: n, ten: TEN_NHU_CAU[bc.ngon][n], do_manh: Math.round(doManh * 1000) / 1000,
      tin_cay: caoNhat.tin_cay_so, muc_tin_cay: caoNhat.do_tin_cay,
      tu_dau_hieu: [...new Set(m.tin.map((t) => t.ma))], ly_do: LY_DO[bc.ngon][n], goi,
    });
  }
  return ra.sort((a, b) => b.do_manh * b.tin_cay - a.do_manh * a.tin_cay || NHU_CAU.indexOf(a.nhu_cau) - NHU_CAU.indexOf(b.nhu_cau));
}
