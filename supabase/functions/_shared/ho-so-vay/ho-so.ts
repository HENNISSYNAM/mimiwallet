/**
 * HỒ SƠ VAY TỰ ĐỘNG (10/11/2026) — hàm thuần, không đọc CSDL, không gọi mô hình ngôn ngữ.
 *
 * Chủ nhập số tiền, kỳ hạn, mục đích; MIMI ghép một hồ sơ để CHỦ TỰ in / tải và tự mang đi:
 *   danh tính (tên, mã số thuế) · bảng dòng tiền 12 tháng · khoảng doanh thu kèm bằng chứng · tình trạng tờ khai thuế ·
 *   khả năng trả nợ và trả góp tối đa (`tai-chinh/phuong-an.ts`) · dự báo 3 tháng (`tai-chinh/du-bao.ts`) · đánh giá
 *   sẵn sàng vay có lý do (`tin-dung/cham-diem.ts`) · danh sách giấy tờ còn thiếu · lời đồng ý.
 *
 * MIMI KHÔNG gửi hồ sơ cho bên cho vay nào, không cho vay, không môi giới, không hứa duyệt. Câu này nằm trong chính hồ sơ.
 */
import type { DongBangThang, KetQuaDanhGia, Ngon } from '../tin-dung/cham-diem.ts';
import { NHAN_TRUNG_THUC, PHIEN_BAN_DANH_GIA } from '../tin-dung/cham-diem.ts';
import type { KetQuaDuBao } from '../tai-chinh/du-bao.ts';

export const PHIEN_BAN_HO_SO = 'mimi-ho-so-vay-2026.11.10';

export const SO_TIEN_TOI_THIEU = 1_000_000;
export const SO_TIEN_TOI_DA = 100_000_000_000;
export const KY_HAN_TOI_DA_THANG = 120;

export interface DeNghiVay { so_tien: number; ky_han_thang: number; muc_dich: string }

/** Đọc đề nghị từ thân yêu cầu. Trả câu lỗi bằng lời thường. */
export function docDeNghi(b: Record<string, unknown>, canMucDich: boolean, ngon: Ngon = 'vi'):
  { ok: true; v: DeNghiVay } | { ok: false; cau: string } {
  const vi = ngon === 'vi';
  const soTien = Number(b.so_tien);
  if (!Number.isFinite(soTien) || !Number.isInteger(soTien) || soTien < SO_TIEN_TOI_THIEU || soTien > SO_TIEN_TOI_DA) {
    return { ok: false, cau: vi ? 'Số tiền vay là số nguyên từ 1 triệu tới 100 tỷ đồng.' : 'The amount must be a whole number between 1 million and 100 billion VND.' };
  }
  const kyHan = Number(b.ky_han_thang);
  if (!Number.isInteger(kyHan) || kyHan < 1 || kyHan > KY_HAN_TOI_DA_THANG) {
    return { ok: false, cau: vi ? 'Kỳ hạn từ 1 tới 120 tháng.' : 'The term must be 1 to 120 months.' };
  }
  const mucDich = String(b.muc_dich ?? '').replace(/\s+/g, ' ').trim();
  if (canMucDich && (mucDich.length < 3 || mucDich.length > 500)) {
    return { ok: false, cau: vi ? 'Ghi mục đích vay (3–500 ký tự), ví dụ "nhập hàng Tết".' : 'Describe the purpose (3–500 characters), e.g. "stock for Tet".' };
  }
  return { ok: true, v: { so_tien: soTien, ky_han_thang: kyHan, muc_dich: mucDich.slice(0, 500) } };
}

export interface CongTyHoSo {
  ten: string | null;
  ma_so_thue: string | null;
  ten_theo_mst: string | null;
  dia_chi_theo_mst: string | null;
  loai_theo_mst: string | null;
  trang_thai_mst: string | null;
  tinh: string | null;
  nganh: string | null;
}

export interface DoanhThuNam {
  nam: number;
  /** Ước tính từ ngân hàng và khoảng thật [can_duoi, can_tren] (`doanh-thu/do-chac-chan.ts`). */
  gia_tri: number;
  can_duoi: number;
  can_tren: number;
  trang_thai: 'chac' | 'can_xem' | 'chua_du_du_lieu';
  tien_vao: number;
  da_xac_nhan: number;
  chua_ro: number;
  so_chua_ro: number;
  khong_phai_doanh_thu: number;
  noi_bo: number;
  so_giao_dich: number;
  ty_le_da_giai_thich: number | null;
}

export interface ToKhaiNhap { mau: string; nam: number; ky_loai: string; quy: number | null; han_nop: string; tao_luc: string; da_xuat_luc: string | null }
export interface ToKhaiNop { ky: string | null; trang_thai: string; ngay_nop: string | null; tao_luc: string }

export interface DauVaoHoSo {
  de_nghi: DeNghiVay;
  cong_ty: CongTyHoSo;
  homNay: string;
  bang_thang: DongBangThang[];
  tien_vao_bi_loai: { so_tien: number; so_khoan: number };
  hoa_don_qua_han: { tong: number; so: number };
  danh_gia: KetQuaDanhGia;
  du_bao: KetQuaDuBao;
  doanh_thu: DoanhThuNam[];
  to_khai: { nhap: ToKhaiNhap[]; nop: ToKhaiNop[] };
  co_ket_noi_ngan_hang: boolean;
  ngon?: Ngon;
}

export type TrangThaiMuc = 'co' | 'can_xem' | 'thieu';
export interface MucKiemTra { ma: string; ten: string; trang_thai: TrangThaiMuc; ghi_chu: string; bat_buoc: boolean }

export interface HoSoVay {
  phien_ban: string;
  phien_ban_danh_gia: string;
  nhan: string;
  lap_ngay: string;
  de_nghi: DeNghiVay;
  danh_tinh: CongTyHoSo;
  dong_tien: { thang: DongBangThang[]; tong_vao: number; tong_ra: number; tong_rong: number; so_thang_co_du_lieu: number; tien_vao_bi_loai: { so_tien: number; so_khoan: number } };
  doanh_thu: DoanhThuNam[];
  thue: { nhap: ToKhaiNhap[]; nop: ToKhaiNop[]; tom_tat: string };
  kha_nang_tra: {
    tra_gop_thang: { thap: number; cao: number } | null;
    tra_toi_da_thang: number | null;
    goc_toi_da: { thap: number; cao: number } | null;
    ty_le_tra_no: number | null;
    vua_suc: boolean | null;
    gia_dinh: string;
  };
  du_bao: KetQuaDuBao;
  danh_gia: KetQuaDanhGia;
  kiem_tra: MucKiemTra[];
  giay_to_tu_chuan_bi: string[];
  /** Đủ mọi mục BẮT BUỘC (không mục bắt buộc nào "thiếu"). */
  hoan_chinh: boolean;
  dong_y: string;
  tuyen_bo: string[];
}

const L = {
  vi: {
    mstTen: 'Mã số thuế', mstCo: (m: string) => `Mã số thuế ${m}.`, mstKhong: 'Chưa có mã số thuế trong MIMI. Thêm ở Cài đặt → Doanh nghiệp.',
    dtTen: 'Danh tính theo cơ quan thuế', dtCo: (t: string, tt: string | null) => `Tên theo cơ quan thuế: ${t}${tt ? ` (${tt})` : ''}.`, dtKhong: 'Chưa tra mã số thuế với cơ quan thuế — bên cho vay sẽ đối chiếu tên và địa chỉ.',
    skTen: 'Sao kê 12 tháng', skCo: (n: number) => `${n}/12 tháng gần nhất có sao kê.`, skThieu: (n: number) => `Mới có ${n}/12 tháng sao kê; bên cho vay thường cần ít nhất 6.`,
    nhTen: 'Kết nối ngân hàng trực tiếp', nhCo: 'Sao kê đọc thẳng từ ngân hàng đã kết nối.', nhKhong: 'Sao kê là tệp tải lên, chưa kết nối trực tiếp — bên cho vay có thể xin sao kê có dấu ngân hàng.',
    dthuTen: 'Doanh thu đã giải thích', dthuChac: 'Doanh thu năm nay đủ chắc chắn (phần chưa rõ nhỏ).', dthuCanXem: (s: number) => `Còn ${s} khoản tiền vào chưa rõ có phải doanh thu — xác nhận trong MIMI để khoảng doanh thu hẹp lại.`, dthuChua: 'Chưa đủ dữ liệu để nói doanh thu năm nay.',
    tkTen: 'Tờ khai thuế', tkNop: (n: number) => `${n} tờ khai đã nộp trong 12 tháng qua (theo ghi nhận trong MIMI).`, tkNhap: (n: number) => `Có ${n} bản nháp tờ khai nhưng MIMI chưa thấy ghi nhận đã nộp — mang theo biên nhận nộp nếu có.`, tkKhong: 'Chưa có tờ khai nào trong MIMI. Nếu bạn nộp ở nơi khác, mang theo bản đã nộp.',
    mdTen: 'Mục đích vay rõ ràng', mdCo: (m: string) => `Mục đích: ${m}.`, mdKhong: 'Mục đích vay quá ngắn — ghi rõ dùng tiền vào việc gì.',
    stTen: 'Số tiền trong sức trả', stCo: (g: string) => `Số tiền đề nghị nằm trong sức trả ước tính (tối đa khoảng ${g}).`, stQua: (g: string) => `Số tiền đề nghị vượt sức trả ước tính (tối đa khoảng ${g}) — cân nhắc giảm số tiền hoặc kéo dài kỳ hạn.`, stKhong: 'Chưa tính được sức trả (thiếu dữ liệu hoặc dòng tiền ròng không dương).',
    giayTo: [
      'Căn cước công dân của chủ hộ / người đại diện theo pháp luật',
      'Giấy chứng nhận đăng ký hộ kinh doanh / doanh nghiệp',
      'Sao kê có xác nhận của ngân hàng (nếu bên cho vay yêu cầu bản có dấu)',
      'Giấy tờ tài sản bảo đảm (nếu khoản vay cần thế chấp)',
      'Hợp đồng, đơn hàng hoặc báo giá chứng minh mục đích vay',
    ],
    dongY: 'Tôi là chủ / người đại diện của doanh nghiệp này. Tôi tự lập hồ sơ này từ dữ liệu tôi đã kết nối với MIMI, tự xem lại, và tự quyết định gửi cho ai. MIMI không gửi hồ sơ cho bất kỳ bên cho vay nào, không cho vay, không môi giới và không hứa khoản vay được duyệt.',
    tuyenBo: [
      'Số liệu dòng tiền tính từ sao kê ngân hàng đã kết nối hoặc tải lên MIMI; không gồm tiền mặt và tài khoản chưa kết nối.',
      'Tiền vào đã loại khoản nghi là tiền vay, góp vốn, người nhà chuyển, hoàn tiền (trừ khi chủ xác nhận là doanh thu).',
      'Trả góp và sức trả dùng giả định minh hoạ (lãi năm, tỷ lệ dòng tiền dành trả nợ) — không phải lãi suất hay điều kiện của tổ chức nào.',
      'Doanh thu là ước tính từ ngân hàng kèm khoảng chắc chắn; không phải số liệu đã kiểm toán, không phải kết luận nghĩa vụ thuế.',
    ],
    thueTom: (nop: number, nhap: number) => `${nop} tờ khai đã nộp, ${nhap} bản nháp trong 12 tháng qua.`,
    giaDinh: (ty: number, thap: number, cao: number) => `Trả nợ tối đa ${ty}% dòng tiền ròng; lãi năm minh hoạ ${thap}%–${cao}%.`,
  },
  en: {
    mstTen: 'Tax code', mstCo: (m: string) => `Tax code ${m}.`, mstKhong: 'No tax code in MIMI yet. Add it under Settings → Business.',
    dtTen: 'Identity per tax authority', dtCo: (t: string, tt: string | null) => `Registered name: ${t}${tt ? ` (${tt})` : ''}.`, dtKhong: 'Tax code not yet looked up with the tax authority — lenders will check name and address.',
    skTen: '12 months of statements', skCo: (n: number) => `${n}/12 recent months have statements.`, skThieu: (n: number) => `Only ${n}/12 months of statements; lenders usually need at least 6.`,
    nhTen: 'Direct bank connection', nhCo: 'Statements read directly from a connected bank.', nhKhong: 'Statements are uploaded files, not a direct connection — a lender may ask for bank-stamped statements.',
    dthuTen: 'Explained revenue', dthuChac: "This year's revenue is certain enough (small unexplained part).", dthuCanXem: (s: number) => `${s} inflows are still unexplained — confirm them in MIMI to narrow the revenue range.`, dthuChua: "Not enough data to state this year's revenue.",
    tkTen: 'Tax returns', tkNop: (n: number) => `${n} returns filed in the last 12 months (as recorded in MIMI).`, tkNhap: (n: number) => `${n} draft returns but no filing recorded in MIMI — bring your filing receipts if you have them.`, tkKhong: 'No tax returns in MIMI. If you filed elsewhere, bring the filed copies.',
    mdTen: 'Clear purpose', mdCo: (m: string) => `Purpose: ${m}.`, mdKhong: 'The purpose is too short — say what the money is for.',
    stTen: 'Amount within repayment capacity', stCo: (g: string) => `The amount is within estimated capacity (up to about ${g}).`, stQua: (g: string) => `The amount exceeds estimated capacity (up to about ${g}) — consider a smaller amount or longer term.`, stKhong: 'Repayment capacity could not be computed (missing data or non-positive net cash flow).',
    giayTo: [
      "Owner's / legal representative's national ID card",
      'Household business / enterprise registration certificate',
      'Bank-certified statements (if the lender asks for stamped copies)',
      'Collateral documents (if the loan requires security)',
      'Contracts, orders or quotes supporting the loan purpose',
    ],
    dongY: 'I am the owner / representative of this business. I prepared this file from data I connected to MIMI, reviewed it myself, and I alone decide whom to send it to. MIMI does not send this file to any lender, does not lend, does not broker and does not promise approval.',
    tuyenBo: [
      'Cash-flow figures come from bank statements connected or uploaded to MIMI; cash and unconnected accounts are not included.',
      'Money in excludes suspected loans, capital contributions, family transfers and refunds (unless the owner confirmed them as revenue).',
      'Instalments and capacity use illustrative assumptions (annual rate, share of cash flow for repayment) — not any institution’s rates or terms.',
      'Revenue is a bank-based estimate with a certainty range; it is not audited and not a tax determination.',
    ],
    thueTom: (nop: number, nhap: number) => `${nop} returns filed, ${nhap} drafts in the last 12 months.`,
    giaDinh: (ty: number, thap: number, cao: number) => `Repayment capped at ${ty}% of net cash flow; illustrative annual rate ${thap}%–${cao}%.`,
  },
} as const;

const TRANG_THAI_DA_NOP = new Set(['submitted', 'waiting_external', 'accepted', 'resolved']);

const tienChu = (n: number, ngon: Ngon) =>
  ngon === 'vi' ? `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫` : `${new Intl.NumberFormat('en-US').format(Math.round(n))} VND`;

/** Ngày lùi 12 tháng (YYYY-MM-DD). */
const lui12Thang = (ymd: string) => `${Number(ymd.slice(0, 4)) - 1}${ymd.slice(4, 10)}`;

export function lapHoSoVay(v: DauVaoHoSo): HoSoVay {
  const ngon: Ngon = v.ngon ?? 'vi';
  const X = L[ngon];
  const dg = v.danh_gia;

  const coDuLieu = v.bang_thang.filter((t) => t.vao !== null);
  const tongVao = coDuLieu.reduce((s, t) => s + (t.vao ?? 0), 0);
  const tongRa = coDuLieu.reduce((s, t) => s + (t.ra ?? 0), 0);

  const tu12 = lui12Thang(v.homNay);
  const nhap = [...v.to_khai.nhap].filter((t) => t.tao_luc.slice(0, 10) >= tu12).sort((a, b) => b.tao_luc.localeCompare(a.tao_luc));
  const nop = [...v.to_khai.nop].filter((t) => TRANG_THAI_DA_NOP.has(t.trang_thai) && (t.ngay_nop ?? t.tao_luc).slice(0, 10) >= tu12)
    .sort((a, b) => (b.ngay_nop ?? b.tao_luc).localeCompare(a.ngay_nop ?? a.tao_luc));

  const kn = dg.co_diem ? {
    tra_gop_thang: dg.so_lieu.tra_gop_thang,
    tra_toi_da_thang: dg.so_lieu.tra_toi_da_thang,
    goc_toi_da: dg.so_lieu.rong_tb > 0 ? dg.so_lieu.goc_toi_da : null,
    ty_le_tra_no: dg.so_lieu.ty_le_tra_no,
    vua_suc: dg.so_lieu.rong_tb > 0 ? dg.so_lieu.tra_gop_thang.cao <= dg.so_lieu.tra_toi_da_thang : false,
  } : { tra_gop_thang: null, tra_toi_da_thang: null, goc_toi_da: null, ty_le_tra_no: null, vua_suc: null };
  const g = dg.co_diem ? dg.gia_dinh : null;

  // ── Danh sách kiểm (giấy tờ còn thiếu) ──
  const kt: MucKiemTra[] = [];
  const mst = (v.cong_ty.ma_so_thue ?? '').replace(/\s/g, '');
  const mstHopLe = /^\d{10}(-?\d{3})?$/.test(mst);
  kt.push({ ma: 'ma_so_thue', ten: X.mstTen, trang_thai: mstHopLe ? 'co' : 'thieu', ghi_chu: mstHopLe ? X.mstCo(mst) : X.mstKhong, bat_buoc: true });
  kt.push({ ma: 'danh_tinh_mst', ten: X.dtTen, trang_thai: v.cong_ty.ten_theo_mst ? 'co' : 'can_xem',
    ghi_chu: v.cong_ty.ten_theo_mst ? X.dtCo(v.cong_ty.ten_theo_mst, v.cong_ty.trang_thai_mst) : X.dtKhong, bat_buoc: false });
  const nThang = coDuLieu.length;
  kt.push({ ma: 'sao_ke_12_thang', ten: X.skTen, trang_thai: nThang >= 12 ? 'co' : nThang >= 6 ? 'can_xem' : 'thieu',
    ghi_chu: nThang >= 6 ? X.skCo(nThang) : X.skThieu(nThang), bat_buoc: true });
  kt.push({ ma: 'ket_noi_ngan_hang', ten: X.nhTen, trang_thai: v.co_ket_noi_ngan_hang ? 'co' : 'can_xem', ghi_chu: v.co_ket_noi_ngan_hang ? X.nhCo : X.nhKhong, bat_buoc: false });
  const dtNay = [...v.doanh_thu].sort((a, b) => b.nam - a.nam)[0];
  kt.push({
    ma: 'doanh_thu_xac_nhan', ten: X.dthuTen,
    trang_thai: !dtNay || dtNay.trang_thai === 'chua_du_du_lieu' ? 'thieu' : dtNay.trang_thai === 'chac' ? 'co' : 'can_xem',
    ghi_chu: !dtNay || dtNay.trang_thai === 'chua_du_du_lieu' ? X.dthuChua : dtNay.trang_thai === 'chac' ? X.dthuChac : X.dthuCanXem(dtNay.so_chua_ro),
    bat_buoc: true,
  });
  kt.push({ ma: 'to_khai_thue', ten: X.tkTen, trang_thai: nop.length ? 'co' : 'can_xem',
    ghi_chu: nop.length ? X.tkNop(nop.length) : nhap.length ? X.tkNhap(nhap.length) : X.tkKhong, bat_buoc: false });
  const mdRo = v.de_nghi.muc_dich.trim().length >= 10;
  kt.push({ ma: 'muc_dich', ten: X.mdTen, trang_thai: mdRo ? 'co' : 'can_xem', ghi_chu: mdRo ? X.mdCo(v.de_nghi.muc_dich) : X.mdKhong, bat_buoc: false });
  kt.push({
    ma: 'trong_suc_tra', ten: X.stTen,
    // Thận trọng: so với gốc tối đa ở LÃI CAO (`thap`) — cùng phía với `vua_suc`.
    trang_thai: kn.goc_toi_da === null ? 'thieu' : v.de_nghi.so_tien <= kn.goc_toi_da.thap ? 'co' : 'can_xem',
    ghi_chu: kn.goc_toi_da === null ? X.stKhong
      : v.de_nghi.so_tien <= kn.goc_toi_da.thap ? X.stCo(tienChu(kn.goc_toi_da.thap, ngon)) : X.stQua(tienChu(kn.goc_toi_da.thap, ngon)),
    bat_buoc: true,
  });

  return {
    phien_ban: PHIEN_BAN_HO_SO,
    phien_ban_danh_gia: PHIEN_BAN_DANH_GIA,
    nhan: NHAN_TRUNG_THUC[ngon],
    lap_ngay: v.homNay,
    de_nghi: v.de_nghi,
    danh_tinh: v.cong_ty,
    dong_tien: {
      thang: v.bang_thang, tong_vao: Math.round(tongVao), tong_ra: Math.round(tongRa), tong_rong: Math.round(tongVao - tongRa),
      so_thang_co_du_lieu: nThang, tien_vao_bi_loai: v.tien_vao_bi_loai,
    },
    doanh_thu: [...v.doanh_thu].sort((a, b) => b.nam - a.nam),
    thue: { nhap, nop, tom_tat: X.thueTom(nop.length, nhap.length) },
    kha_nang_tra: {
      ...kn,
      gia_dinh: g ? X.giaDinh(Math.round(g.ty_le_tra_no_tren_dong_tien_rong * 100), Math.round(g.lai_nam_thap * 100), Math.round(g.lai_nam_cao * 100)) : '',
    },
    du_bao: v.du_bao,
    danh_gia: dg,
    kiem_tra: kt,
    giay_to_tu_chuan_bi: [...X.giayTo],
    hoan_chinh: !kt.some((m) => m.bat_buoc && m.trang_thai === 'thieu'),
    dong_y: X.dongY,
    tuyen_bo: [...X.tuyenBo],
  };
}
