/**
 * DẤU HIỆU TĂNG TRƯỞNG CỦA DOANH NGHIỆP (16/11/2026) — hàm thuần, không đọc CSDL, không gọi mô hình ngôn ngữ.
 *
 * Bài toán (UOB FinLab "Find the right affluent customers"): chủ hộ kinh doanh và doanh nghiệp nhỏ đang giàu lên mà ngân
 * hàng không thấy, vì tiền bán hàng, tiền vay và tiền nhà trộn chung trong tài khoản cá nhân. MIMI đã làm sạch dòng tiền
 * đó (có sự đồng ý của chủ) — ở đây đọc ra những DẤU HIỆU giải thích được, cho CHÍNH CHỦ xem.
 *
 * KHÔNG PHẢI điểm tín dụng, không phải thông tin tín dụng (NĐ 58/2021): không có con số "điểm", không xếp hạng trả nợ.
 * Mỗi dấu hiệu có: giá trị, bằng chứng (tháng nào, bao nhiêu khoản — KHÔNG có tên người nhận lương hay người chuyển
 * tiền), độ tin cậy, và lời giải thích tiếng Việt + tiếng Anh. Mức tăng trưởng của DOANH NGHIỆP theo luật viết sẵn bên
 * dưới (`xepMuc`), có phiên bản; cùng dữ liệu cùng `hom_nay` → cùng kết quả (không đọc đồng hồ, không ngẫu nhiên).
 *
 * Nguồn số:
 *   - nhóm dòng tiền của từng khoản: `dong-tien/phan-nhom.ts` (chủ xác nhận thắng máy; vay/góp vốn/người nhà bị tách
 *     khỏi tiền bán hàng) — cùng luật với dự báo dòng tiền;
 *   - doanh thu năm dạng khoảng + ngưỡng 01 tỷ / 03 tỷ: `doanh-thu/do-chac-chan.ts` (nơi gọi truyền vào);
 *   - dự báo tháng tới: `tai-chinh/du-bao.ts` (kịch bản cơ sở = trung vị, kịch bản xấu = phân vị 25 tiền vào).
 *
 * Tất cả ngưỡng là THAM SỐ SẢN PHẨM có tên trong `NGUONG_TH`, chọn bảo thủ, chưa hiệu chỉnh trên dữ liệu thí điểm.
 */
import { boDau, nhomRa, nhomVao, NHOM_VAO_KINH_DOANH, soTk, type Nhom, type QuyetDinhChu } from '../dong-tien/phan-nhom.ts';
import { congThang, duBaoDongTien, trungVi } from '../tai-chinh/du-bao.ts';
import { chieuTien, doLonTien } from '../tien/chieu-tien.ts';

export const PHIEN_BAN_TIN_HIEU = 'mimi-dau-hieu-tang-truong-2026.11.16';

export type Ngon = 'vi' | 'en';

/** Ngưỡng doanh thu năm của hộ kinh doanh (đồng) — cùng giá trị với `NGUONG_HO_KINH_DOANH`, "vượt" là STRICTLY trên. */
export const NGUONG_DOANH_THU_TH = [1_000_000_000, 3_000_000_000] as const;

/** Tham số sản phẩm (không phải luật, chưa hiệu chỉnh trên dữ liệu thật). Đổi một chỗ, test đọc được ý định. */
export const NGUONG_TH = {
  /** Cần ít nhất ngần này tháng đã khép sổ để nói về xu hướng. */
  so_thang_toi_thieu: 6,
  /** Tăng trưởng: 3 tháng gần nhất so với 3 tháng trước đó. */
  tang_3_thang: 0.15,
  /** …và 6 tháng gần so với 6 tháng trước (khi có ≥ 12 tháng) không được thấp hơn mức này. */
  tang_6_thang: 0.05,
  /** …và so cùng kỳ năm trước (khi có ≥ 15 tháng) không thấp hơn mức này — tránh nhầm mùa vụ là tăng trưởng. */
  tang_cung_ky: 0.1,
  /** Tiền vào lớn một lần (không phải doanh thu): ≥ mức tối thiểu VÀ ≥ ngần này lần trung vị tiền bán hàng một tháng. */
  mot_lan_toi_thieu: 200_000_000,
  mot_lan_boi_trung_vi: 3,
  /** Trả nợ đều: có khoản trả nợ trong ít nhất ngần này tháng của 6 tháng gần nhất. */
  tra_no_so_thang: 3,
  /** Lương: tối thiểu số người nhận trung bình mỗi tháng (3 tháng gần) và mức tăng số người / tổng chi lương. */
  luong_so_nguoi_toi_thieu: 3,
  luong_tang: 0.2,
  /** Dòng tiền quốc tế: ít nhất ngần này khoản, trải trên ít nhất ngần này tháng (12 tháng gần nhất). */
  quoc_te_so_khoan: 3,
  quoc_te_so_thang: 2,
  /** Tiền dư: ròng dương ở ít nhất 5/6 tháng gần nhất và cộng dồn ≥ ngần này lần trung vị tiền ra một tháng. */
  du_thang_duong: 5,
  du_boi_chi_thang: 3,
  /** Khoảng trống vốn lưu động: ít nhất ngần này tháng ròng âm trong 12 tháng, dù cả năm vẫn dương. */
  thieu_von_thang_am: 2,
  /** Mùa vụ: tháng cao nhất / trung vị tiền bán hàng. */
  mua_vu_ty_le: 1.8,
  /** Cơ sở mới: mở trong 12 tháng qua và sau giao dịch đầu tiên của công ty ít nhất ngần này ngày. */
  co_so_cach_ngay: 90,
} as const;

export const MA_TIN_HIEU = [
  'da_vuot_nguong', 'sap_vuot_nguong', 'tang_truong_doanh_thu', 'mo_co_so_moi', 'tien_vao_lon_mot_lan',
  'giai_ngan_vay', 'tra_no_vay_deu', 'quy_luong_tang', 'dong_tien_quoc_te', 'tien_du_dong_lai', 'khoang_trong_von_luu_dong',
] as const;
export type MaTinHieu = (typeof MA_TIN_HIEU)[number];

/** Dấu hiệu nào nói về TĂNG TRƯỞNG (dùng để xếp mức); số còn lại là sự kiện hay đặc điểm dòng tiền. */
export const TIN_HIEU_TANG_TRUONG: readonly MaTinHieu[] = ['sap_vuot_nguong', 'tang_truong_doanh_thu', 'mo_co_so_moi', 'quy_luong_tang'];

export type DoTinCay = 'cao' | 'vua' | 'thap';
/** Độ tin cậy dạng số cho phép nhân ở `hanh-dong.ts` — quy ước, không phải xác suất đã hiệu chỉnh. */
export const SO_TIN_CAY: Record<DoTinCay, number> = { cao: 0.85, vua: 0.6, thap: 0.35 };

export interface BangChung {
  /** Các tháng (YYYY-MM) làm nên dấu hiệu. */
  thang: string[];
  /** Mã giao dịch làm bằng chứng (tối đa 10) — chỉ chủ thấy, không bao giờ vào gói giới thiệu. */
  giao_dich: string[];
  /** Số đo phụ (đều là số tổng, không có tên người). */
  so: Record<string, number | string | boolean | null>;
}

export interface TinHieu {
  ma: MaTinHieu;
  gia_tri: number | null;
  don_vi: 'dong' | 'ty_le' | 'so_khoan' | 'so_co_so';
  bang_chung: BangChung;
  do_tin_cay: DoTinCay;
  tin_cay_so: number;
  giai_thich: Record<Ngon, string>;
}

export type MucTangTruong = 'chua_du_du_lieu' | 'on_dinh' | 'moi_tang_truong' | 'dang_len' | 'san_sang_mo_rong';
export const THU_TU_MUC: readonly MucTangTruong[] = ['chua_du_du_lieu', 'on_dinh', 'moi_tang_truong', 'dang_len', 'san_sang_mo_rong'];

export const TEN_MUC: Record<Ngon, Record<MucTangTruong, string>> = {
  vi: {
    chua_du_du_lieu: 'Chưa đủ dữ liệu', on_dinh: 'Ổn định', moi_tang_truong: 'Mới tăng trưởng',
    dang_len: 'Đang lên', san_sang_mo_rong: 'Sẵn sàng mở rộng',
  },
  en: {
    chua_du_du_lieu: 'Not enough data', on_dinh: 'Steady', moi_tang_truong: 'Early growth',
    dang_len: 'Rising', san_sang_mo_rong: 'Ready to expand',
  },
};

/** Luật xếp mức, viết thành chữ để hiện cho chủ và đưa vào tài liệu. Thứ tự: điều kiện đầu tiên đúng thắng. */
export const LUAT_MUC: Record<Ngon, Record<MucTangTruong, string>> = {
  vi: {
    chua_du_du_lieu: `Dưới ${NGUONG_TH.so_thang_toi_thieu} tháng sao kê đã khép sổ.`,
    san_sang_mo_rong: 'Đã vượt 03 tỷ, hoặc sắp vượt 03 tỷ (độ tin cậy vừa trở lên), hoặc đã vượt 01 tỷ và đang mở cơ sở mới hay tăng người.',
    dang_len: 'Đã vượt 01 tỷ, hoặc sắp vượt 01 tỷ (độ tin cậy vừa trở lên), hoặc có từ hai dấu hiệu tăng trưởng.',
    moi_tang_truong: 'Có một dấu hiệu tăng trưởng (doanh thu tăng, sắp vượt ngưỡng, mở cơ sở, quỹ lương tăng).',
    on_dinh: 'Đủ dữ liệu nhưng chưa thấy dấu hiệu tăng trưởng nào.',
  },
  en: {
    chua_du_du_lieu: `Fewer than ${NGUONG_TH.so_thang_toi_thieu} closed months of statements.`,
    san_sang_mo_rong: 'Above ₫3bn, or projected to pass ₫3bn (medium confidence or better), or above ₫1bn while opening a branch or adding staff.',
    dang_len: 'Above ₫1bn, or projected to pass ₫1bn (medium confidence or better), or two or more growth signals.',
    moi_tang_truong: 'One growth signal (sales growth, approaching a threshold, new branch, rising payroll).',
    on_dinh: 'Enough data but no growth signal yet.',
  },
};

// ── Đầu vào ─────────────────────────────────────────────────────────────────

export interface GiaoDichNguon {
  id: string;
  amount: number;
  type: string | null;
  transaction_date: string;
  merchant_name?: string | null;
  counter_account_name?: string | null;
  payment_reference?: string | null;
  category?: string | null;
  account_number?: string | null;
  counter_account_number?: string | null;
}

export interface DoanhThuNamTH {
  nam: number;
  uoc_tinh: number;
  can_duoi: number;
  can_tren: number;
  trang_thai: 'chac' | 'can_xem' | 'chua_du_du_lieu';
}

export interface CoSoTH {
  id: string;
  ten: string;
  /** Ngày cơ sở được khai trong MIMI (YYYY-MM-DD hoặc ISO). */
  tao_luc: string;
  tai_khoan: string[];
}

export interface DauVaoTinHieu {
  /** YYYY-MM-DD theo giờ Việt Nam. Mọi "gần đây" tính từ ngày này. */
  hom_nay: string;
  giao_dich: GiaoDichNguon[];
  /** Quyết định của chủ cho tiền vào (`revenue_classifications`), theo mã giao dịch. */
  quyet_dinh_chu?: Record<string, QuyetDinhChu>;
  /** Số tài khoản của chính công ty: chuyển qua lại giữa chúng là nội bộ, bị loại. */
  tai_khoan_cua_minh?: string[];
  doanh_thu_nam?: DoanhThuNamTH | null;
  co_so?: CoSoTH[];
}

export interface ThangTH { khoa: string; vao_kd: number; vao_khac: number; ra: number; rong: number }

export interface KetQuaTinHieu {
  phien_ban: string;
  hom_nay: string;
  so_thang: number;
  muc: MucTangTruong;
  ten_muc: Record<Ngon, string>;
  ly_do_muc: Record<Ngon, string>;
  tin_hieu: TinHieu[];
  /** Tổng tiền bán hàng 12 tháng đã khép gần nhất (null khi chưa đủ 12 tháng). Không gồm tiền mặt. */
  doanh_thu_12_thang: number | null;
  chuoi_thang: ThangTH[];
  du_bao: { thang_co_so: number; thang_xau: number } | null;
  /** Câu trung thực luôn đi kèm. */
  nhan: Record<Ngon, string>;
}

export const NHAN_TRUNG_THUC: Record<Ngon, string> = {
  vi: 'Đây là dấu hiệu tăng trưởng của doanh nghiệp bạn, đọc từ sao kê bạn đã kết nối — không phải điểm tín dụng, không phải lời khuyên đầu tư, và MIMI không gửi cho ngân hàng nào nếu bạn chưa bấm Gửi.',
  en: 'These are growth signals of your business, read from the statements you connected — not a credit score, not investment advice, and MIMI sends nothing to any bank until you press Send.',
};

// ── Tiện ích ────────────────────────────────────────────────────────────────

const lam3 = (x: number) => Math.round(x * 1000) / 1000;
const tb = (a: readonly number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const tong = (a: readonly number[]) => a.reduce((s, x) => s + x, 0);
const ngayCua = (s: string) => String(s).slice(0, 10);
const soNgay = (ymd: string) => Math.floor(Date.parse(`${ymd}T00:00:00Z`) / 86_400_000);
const vnd = (n: number, ngon: Ngon) => ngon === 'vi'
  ? `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`
  : `${new Intl.NumberFormat('en-US').format(Math.round(n))} VND`;
const ty = (n: number, ngon: Ngon) => (ngon === 'vi' ? `${(n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : `₫${(n / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })}bn`);
const pt = (x: number) => `${Math.round(x * 100)}%`;
const thangChu = (k: string) => `${k.slice(5, 7)}/${k.slice(0, 4)}`;

/** Đối tác giống TỔ CHỨC (không phải một người): không coi là người nhận lương. */
const MAU_TO_CHUC = /\b(cong ty|cty|tnhh|co phan|jsc|ltd|company|corp|doanh nghiep|dntn|hop tac xa|htx|ngan hang|bank|chi nhanh|cua hang|sieu thi|kho bac|tong cuc|cuc thue|chi cuc|benh vien|truong|vien|trung tam|shop|store|mart|group|tap doan)\b/;
/** Ngoại tệ / chuyển tiền quốc tế. Bảo thủ: mã tiền tệ đứng riêng, từ khoá kiều hối; KHÔNG dựa vào tên ngân hàng. */
const MAU_QUOC_TE = /\b(usd|eur|jpy|krw|sgd|aud|cny|rmb|twd|thb|ngoai te|swift|kieu hoi|remittance|western union|moneygram|payoneer)\b/;
const MAU_HAN_QUOC = /\b(krw|han quoc|korea|korean|seoul|busan|incheon)\b/;

export function laNguoi(ten: string | null | undefined): boolean {
  const s = boDau(String(ten ?? '')).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return false;
  const tu = s.split(' ');
  return tu.length >= 2 && tu.length <= 5 && !MAU_TO_CHUC.test(` ${s} `);
}

interface Khoan {
  id: string; khoa: string; ngay: string; chieu: 'vao' | 'ra'; tien: number; nhom: Nhom; chu: string;
  doi_tac: string; nguoi: boolean; chu_xac_nhan: boolean; la_vay_type: boolean; tai_khoan: string;
}

function chuanHoa(d: DauVaoTinHieu): Khoan[] {
  const cuaMinh = new Set((d.tai_khoan_cua_minh ?? []).map(soTk).filter(Boolean));
  const qd = d.quyet_dinh_chu ?? {};
  const ra: Khoan[] = [];
  for (const t of d.giao_dich) {
    const c = chieuTien(t);
    if (!c) continue;
    const tien = doLonTien(t);
    if (!(tien > 0)) continue;
    const doiTk = soTk(t.counter_account_number);
    if (doiTk && cuaMinh.has(doiTk)) continue; // chuyển giữa tài khoản của chính mình
    const ngay = ngayCua(t.transaction_date);
    const chu = qd[String(t.id)] ?? null;
    const nhom = c === 'vao' ? nhomVao(t, chu) : nhomRa(t);
    if (nhom === 'noi_bo') continue;
    ra.push({
      id: String(t.id), khoa: ngay.slice(0, 7), ngay, chieu: c, tien, nhom,
      chu: ` ${boDau([t.merchant_name, t.counter_account_name, t.payment_reference, t.category].filter(Boolean).join(' '))} `,
      doi_tac: doiTk || boDau(String(t.counter_account_name ?? '')).replace(/\s+/g, ' ').trim(),
      nguoi: laNguoi(t.counter_account_name), chu_xac_nhan: !!(chu && (chu.loai || chu.hieu_luc)), la_vay_type: t.type === 'loan',
      tai_khoan: soTk(t.account_number),
    });
  }
  // Thứ tự ổn định: ngày rồi mã — mọi vòng lặp sau đều tất định.
  return ra.sort((a, b) => (a.ngay < b.ngay ? -1 : a.ngay > b.ngay ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function chuoiThang(ds: Khoan[], khoaNay: string): ThangTH[] {
  const daKhep = ds.filter((k) => k.khoa < khoaNay);
  if (!daKhep.length) return [];
  const dau = daKhep[0].khoa;
  const tu = dau < congThang(khoaNay, -24) ? congThang(khoaNay, -24) : dau;
  const m = new Map<string, ThangTH>();
  for (let k = tu; k < khoaNay; k = congThang(k, 1)) m.set(k, { khoa: k, vao_kd: 0, vao_khac: 0, ra: 0, rong: 0 });
  for (const k of daKhep) {
    const t = m.get(k.khoa);
    if (!t) continue;
    if (k.chieu === 'ra') t.ra += k.tien;
    else if ((NHOM_VAO_KINH_DOANH as readonly string[]).includes(k.nhom)) t.vao_kd += k.tien;
    else t.vao_khac += k.tien;
  }
  return [...m.values()].map((t) => ({ ...t, vao_kd: Math.round(t.vao_kd), vao_khac: Math.round(t.vao_khac), ra: Math.round(t.ra), rong: Math.round(t.vao_kd - t.ra) }));
}

const tinHieu = (
  ma: MaTinHieu, gia_tri: number | null, don_vi: TinHieu['don_vi'], do_tin_cay: DoTinCay,
  bang_chung: Partial<BangChung>, giai_thich: Record<Ngon, string>,
): TinHieu => ({
  ma, gia_tri, don_vi, do_tin_cay, tin_cay_so: SO_TIN_CAY[do_tin_cay],
  bang_chung: { thang: bang_chung.thang ?? [], giao_dich: (bang_chung.giao_dich ?? []).slice(0, 10), so: bang_chung.so ?? {} },
  giai_thich,
});

// ── Từng dấu hiệu ───────────────────────────────────────────────────────────

/** Tháng đầu tiên (tính từ tháng đang chạy) mà tổng 12 tháng trượt vượt ngưỡng, nếu mỗi tháng tới bằng `moiThang`. */
export function thangVuot(t12: readonly number[], moiThang: number, nguong: number, khoaNay: string): string | null {
  const cua = [...t12];
  while (cua.length < 12) cua.unshift(0); // thiếu tháng coi như 0 — bảo thủ
  for (let i = 1; i <= 12; i++) {
    cua.shift();
    cua.push(moiThang);
    if (tong(cua) > nguong) return congThang(khoaNay, i - 1);
  }
  return null;
}

function nguongDoanhThu(d: DauVaoTinHieu, chuoi: ThangTH[], khoaNay: string, duBao: { thang_co_so: number; thang_xau: number } | null): TinHieu[] {
  const ra: TinHieu[] = [];
  const t12 = chuoi.slice(-12).map((t) => t.vao_kd);
  const doanhThu12 = chuoi.length >= 12 ? tong(t12) : null;
  const dt = d.doanh_thu_nam ?? null;

  // Đã vượt: ưu tiên doanh thu năm có khoảng (cùng con số với tờ khai); không có thì dùng 12 tháng tiền bán hàng.
  let daVuot: { nguong: number; tin: DoTinCay; nguon: 'nam' | '12_thang' } | null = null;
  for (const n of NGUONG_DOANH_THU_TH) {
    if (dt && dt.trang_thai !== 'chua_du_du_lieu' && dt.can_duoi > n) daVuot = { nguong: n, tin: 'cao', nguon: 'nam' };
    else if (dt && dt.trang_thai !== 'chua_du_du_lieu' && dt.uoc_tinh > n) daVuot = { nguong: n, tin: 'vua', nguon: 'nam' };
    else if (doanhThu12 !== null && doanhThu12 > n) daVuot = { nguong: n, tin: 'vua', nguon: '12_thang' };
  }
  if (daVuot) {
    const n = daVuot.nguong;
    const giaTri = daVuot.nguon === 'nam' ? dt!.uoc_tinh : doanhThu12!;
    ra.push(tinHieu('da_vuot_nguong', n, 'dong', daVuot.tin, {
      thang: daVuot.nguon === '12_thang' ? chuoi.slice(-12).map((t) => t.khoa) : [],
      so: { nguon: daVuot.nguon, nam: dt?.nam ?? null, uoc_tinh: Math.round(giaTri), can_duoi: dt?.can_duoi ?? null, can_tren: dt?.can_tren ?? null },
    }, daVuot.nguon === 'nam'
      ? {
        vi: `Doanh thu năm ${dt!.nam} ước ${ty(dt!.uoc_tinh, 'vi')} (khoảng ${ty(dt!.can_duoi, 'vi')} – ${ty(dt!.can_tren, 'vi')}), đã qua mốc ${ty(n, 'vi')}.`,
        en: `Revenue for ${dt!.nam} is estimated at ${ty(dt!.uoc_tinh, 'en')} (range ${ty(dt!.can_duoi, 'en')} – ${ty(dt!.can_tren, 'en')}), past the ${ty(n, 'en')} mark.`,
      }
      : {
        vi: `Tiền bán hàng 12 tháng gần nhất là ${ty(doanhThu12!, 'vi')}, đã qua mốc ${ty(n, 'vi')} (chỉ tính tiền qua tài khoản đã kết nối).`,
        en: `Sales received over the last 12 months total ${ty(doanhThu12!, 'en')}, past the ${ty(n, 'en')} mark (connected accounts only).`,
      }));
  }

  // Sắp vượt: ngưỡng kế tiếp chưa qua, dự báo cơ sở đưa tổng 12 tháng trượt qua ngưỡng trong 12 tháng tới.
  const keTiep = NGUONG_DOANH_THU_TH.find((n) => !daVuot || n > daVuot.nguong);
  if (keTiep && duBao && chuoi.length >= 3) {
    const thangCoSo = thangVuot(t12, duBao.thang_co_so, keTiep, khoaNay);
    if (thangCoSo) {
      const thangXau = thangVuot(t12, duBao.thang_xau, keTiep, khoaNay);
      const tin: DoTinCay = chuoi.length < NGUONG_TH.so_thang_toi_thieu ? 'thap' : thangXau ? 'cao' : 'vua';
      ra.push(tinHieu('sap_vuot_nguong', keTiep, 'dong', tin, {
        thang: chuoi.slice(-12).map((t) => t.khoa),
        so: { thang_du_kien: thangCoSo, thang_neu_yeu: thangXau, moi_thang_co_so: duBao.thang_co_so, moi_thang_xau: duBao.thang_xau, tong_12_thang_hien_tai: Math.round(tong(t12)) },
      }, {
        vi: `Nếu mỗi tháng tới bán như mức giữa của 6 tháng gần đây (${vnd(duBao.thang_co_so, 'vi')}), tiền bán hàng 12 tháng sẽ qua mốc ${ty(keTiep, 'vi')} vào khoảng tháng ${thangChu(thangCoSo)}${thangXau ? `; kể cả khi bán như tháng yếu thì vẫn qua (khoảng ${thangChu(thangXau)})` : '; nếu bán như tháng yếu thì chưa qua trong 12 tháng'}.`,
        en: `If each coming month sells like the middle of the last 6 months (${vnd(duBao.thang_co_so, 'en')}), 12-month sales pass ${ty(keTiep, 'en')} around ${thangChu(thangCoSo)}${thangXau ? `; even at a weak month's pace it still passes (around ${thangChu(thangXau)})` : '; at a weak month\'s pace it does not pass within 12 months'}.`,
      }));
    }
  }
  return ra;
}

function tangTruongDoanhThu(chuoi: ThangTH[]): TinHieu | null {
  const n = chuoi.length;
  if (n < NGUONG_TH.so_thang_toi_thieu) return null;
  const v = chuoi.map((t) => t.vao_kd);
  const tbTruoc3 = tb(v.slice(-6, -3));
  if (tbTruoc3 <= 0) return null;
  const g3 = (tb(v.slice(-3)) - tbTruoc3) / tbTruoc3;
  const tbTruoc6 = n >= 12 ? tb(v.slice(-12, -6)) : 0;
  const g6 = n >= 12 && tbTruoc6 > 0 ? (tb(v.slice(-6)) - tbTruoc6) / tbTruoc6 : null;
  const tbCungKy = n >= 15 ? tb(v.slice(-15, -12)) : 0;
  const yoy = n >= 15 && tbCungKy > 0 ? (tb(v.slice(-3)) - tbCungKy) / tbCungKy : null;
  if (g3 < NGUONG_TH.tang_3_thang) return null;
  if (g6 !== null && g6 < NGUONG_TH.tang_6_thang) return null;
  if (yoy !== null && yoy < NGUONG_TH.tang_cung_ky) return null;
  const tin: DoTinCay = yoy !== null && g6 !== null && g6 >= 0.1 ? 'cao' : g6 !== null ? 'vua' : 'thap';
  const gt = lam3(yoy ?? g3);
  return tinHieu('tang_truong_doanh_thu', gt, 'ty_le', tin, {
    thang: chuoi.slice(-6).map((t) => t.khoa),
    so: { tang_3_thang: lam3(g3), tang_6_thang: g6 === null ? null : lam3(g6), tang_cung_ky: yoy === null ? null : lam3(yoy) },
  }, {
    vi: `Tiền bán hàng 3 tháng gần nhất cao hơn 3 tháng trước đó ${pt(g3)}${g6 !== null ? `; 6 tháng gần so với 6 tháng trước: ${pt(g6)}` : ''}${yoy !== null ? `; so với cùng kỳ năm trước: ${pt(yoy)}` : ''}.`,
    en: `Sales in the last 3 months are ${pt(g3)} above the 3 months before${g6 !== null ? `; last 6 vs previous 6 months: ${pt(g6)}` : ''}${yoy !== null ? `; vs the same months last year: ${pt(yoy)}` : ''}.`,
  });
}

function coSoMoi(d: DauVaoTinHieu, ds: Khoan[]): TinHieu | null {
  const coSo = d.co_so ?? [];
  if (coSo.length < 2 || !ds.length) return null;
  const homNay = soNgay(d.hom_nay);
  const dauCongTy = soNgay(ds[0].ngay);
  const moi: { ten: string; ngay: string; tin: DoTinCay }[] = [];
  for (const c of [...coSo].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const tk = new Set(c.tai_khoan.map(soTk).filter(Boolean));
    const dauTk = ds.find((k) => k.tai_khoan && tk.has(k.tai_khoan));
    if (dauTk) {
      const ngay = soNgay(dauTk.ngay);
      if (homNay - ngay <= 365 && ngay - dauCongTy >= NGUONG_TH.co_so_cach_ngay) moi.push({ ten: c.ten, ngay: dauTk.ngay, tin: 'cao' });
    } else {
      const ngay = soNgay(ngayCua(c.tao_luc));
      if (Number.isFinite(ngay) && homNay - ngay <= 365 && ngay - dauCongTy >= NGUONG_TH.co_so_cach_ngay) moi.push({ ten: c.ten, ngay: ngayCua(c.tao_luc), tin: 'thap' });
    }
  }
  if (!moi.length) return null;
  const tin: DoTinCay = moi.some((m) => m.tin === 'cao') ? 'cao' : 'thap';
  const ngay = moi.map((m) => m.ngay).sort();
  return tinHieu('mo_co_so_moi', moi.length, 'so_co_so', tin, {
    thang: [...new Set(ngay.map((x) => x.slice(0, 7)))],
    so: { tong_co_so: coSo.length, co_so_moi: moi.length, co_giao_dich: moi.some((m) => m.tin === 'cao') },
  }, {
    vi: tin === 'cao'
      ? `${moi.length} cơ sở bắt đầu có tiền qua tài khoản riêng trong 12 tháng qua (sớm nhất ${ngay[0].split('-').reverse().join('/')}).`
      : `${moi.length} cơ sở được khai thêm trong MIMI trong 12 tháng qua; chưa thấy tiền qua tài khoản của cơ sở đó.`,
    en: tin === 'cao'
      ? `${moi.length} branch(es) started receiving money on their own account in the last 12 months (first on ${ngay[0]}).`
      : `${moi.length} branch(es) were added in MIMI in the last 12 months; no money seen on their accounts yet.`,
  });
}

function tienVaoLon(ds: Khoan[], chuoi: ThangTH[], tu12: string, khoaNay: string): TinHieu | null {
  const tv = trungVi(chuoi.slice(-12).map((t) => t.vao_kd));
  const nguong = Math.max(NGUONG_TH.mot_lan_toi_thieu, NGUONG_TH.mot_lan_boi_trung_vi * tv);
  const lon = ds.filter((k) => k.chieu === 'vao' && k.khoa >= tu12 && k.khoa <= khoaNay
    && (k.nhom === 'gop_von' || k.nhom === 'nguoi_nha' || k.nhom === 'ngoai_kd') && k.tien >= nguong);
  if (!lon.length) return null;
  const max = Math.max(...lon.map((k) => k.tien));
  const tin: DoTinCay = lon.every((k) => k.chu_xac_nhan) ? 'vua' : 'thap';
  return tinHieu('tien_vao_lon_mot_lan', Math.round(max), 'dong', tin, {
    thang: [...new Set(lon.map((k) => k.khoa))],
    giao_dich: lon.map((k) => k.id),
    so: { so_khoan: lon.length, tong: Math.round(tong(lon.map((k) => k.tien))), nguong: Math.round(nguong), chu_da_xac_nhan: tin === 'vua' },
  }, {
    vi: `${lon.length} khoản tiền vào lớn không phải tiền bán hàng (lớn nhất ${vnd(max, 'vi')}) trong 12 tháng qua — có thể là tiền bán tài sản hoặc góp thêm vốn${tin === 'thap' ? '; MIMI đoán theo nội dung chuyển khoản, bạn chưa xác nhận' : ''}.`,
    en: `${lon.length} large non-sales inflow(s) (largest ${vnd(max, 'en')}) in the last 12 months — possibly an asset sale or new capital${tin === 'thap' ? '; MIMI inferred this from the transfer memo, not yet confirmed by you' : ''}.`,
  });
}

function vay(ds: Khoan[], chuoi: ThangTH[], tu12: string, khoaNay: string): TinHieu[] {
  const ra: TinHieu[] = [];
  const giaiNgan = ds.filter((k) => k.chieu === 'vao' && k.nhom === 'vay' && k.khoa >= tu12 && k.khoa <= khoaNay);
  if (giaiNgan.length) {
    const t = tong(giaiNgan.map((k) => k.tien));
    const tin: DoTinCay = giaiNgan.every((k) => k.la_vay_type || k.chu_xac_nhan) ? 'cao' : 'vua';
    ra.push(tinHieu('giai_ngan_vay', Math.round(t), 'dong', tin, {
      thang: [...new Set(giaiNgan.map((k) => k.khoa))], giao_dich: giaiNgan.map((k) => k.id), so: { so_khoan: giaiNgan.length },
    }, {
      vi: `${giaiNgan.length} khoản tiền vay về tài khoản trong 12 tháng qua, tổng ${vnd(t, 'vi')}.`,
      en: `${giaiNgan.length} loan disbursement(s) received in the last 12 months, totalling ${vnd(t, 'en')}.`,
    }));
  }
  const sau = new Set(chuoi.slice(-6).map((c) => c.khoa));
  const traNo = ds.filter((k) => k.chieu === 'ra' && k.nhom === 'tra_no' && sau.has(k.khoa));
  const thang = [...new Set(traNo.map((k) => k.khoa))];
  if (thang.length >= NGUONG_TH.tra_no_so_thang) {
    const moiThang = tong(traNo.map((k) => k.tien)) / thang.length;
    ra.push(tinHieu('tra_no_vay_deu', Math.round(moiThang), 'dong', thang.length >= 5 ? 'cao' : 'vua', {
      thang, giao_dich: traNo.map((k) => k.id), so: { so_thang: thang.length, tren_so_thang: sau.size },
    }, {
      vi: `Trả nợ vay đều ${thang.length}/${sau.size} tháng gần nhất, trung bình ${vnd(moiThang, 'vi')} mỗi tháng có trả.`,
      en: `Loan repayments in ${thang.length} of the last ${sau.size} months, averaging ${vnd(moiThang, 'en')} per paying month.`,
    }));
  }
  return ra;
}

function quyLuong(ds: Khoan[], chuoi: ThangTH[]): TinHieu | null {
  if (chuoi.length < NGUONG_TH.so_thang_toi_thieu) return null;
  const khoa12 = new Set(chuoi.slice(-12).map((c) => c.khoa));
  const sau = chuoi.slice(-6).map((c) => c.khoa);
  const ra12 = ds.filter((k) => k.chieu === 'ra' && khoa12.has(k.khoa));
  // Người nhận lương: chi ghi rõ lương, hoặc một NGƯỜI (không phải tổ chức) nhận tiền ở ≥ 2 tháng khác nhau.
  const thangTheoNguoi = new Map<string, Set<string>>();
  for (const k of ra12) if (k.nguoi && k.doi_tac) (thangTheoNguoi.get(k.doi_tac) ?? thangTheoNguoi.set(k.doi_tac, new Set()).get(k.doi_tac)!).add(k.khoa);
  const laLuong = (k: Khoan) => k.nhom === 'luong' || (k.nguoi && !!k.doi_tac && (thangTheoNguoi.get(k.doi_tac)?.size ?? 0) >= 2);
  const moiThang = sau.map((kh) => {
    const ks = ra12.filter((k) => k.khoa === kh && laLuong(k));
    return { khoa: kh, tong: tong(ks.map((k) => k.tien)), nguoi: new Set(ks.map((k) => k.doi_tac || `#${k.id}`)).size, ghi_ro: tong(ks.filter((k) => k.nhom === 'luong').map((k) => k.tien)) };
  });
  const gan = moiThang.slice(-3);
  const truoc = moiThang.slice(0, 3);
  const nguoiGan = tb(gan.map((m) => m.nguoi));
  const nguoiTruoc = tb(truoc.map((m) => m.nguoi));
  const tongGan = tb(gan.map((m) => m.tong));
  const tongTruoc = tb(truoc.map((m) => m.tong));
  if (nguoiGan < NGUONG_TH.luong_so_nguoi_toi_thieu || tongTruoc <= 0) return null;
  const tangNguoi = nguoiTruoc > 0 ? (nguoiGan - nguoiTruoc) / nguoiTruoc : null;
  const tangTien = (tongGan - tongTruoc) / tongTruoc;
  const du = (tangNguoi !== null && tangNguoi >= NGUONG_TH.luong_tang && nguoiGan - nguoiTruoc >= 1) || tangTien >= NGUONG_TH.luong_tang;
  if (!du) return null;
  const ghiRo = tong(moiThang.map((m) => m.ghi_ro)) / Math.max(1, tong(moiThang.map((m) => m.tong)));
  return tinHieu('quy_luong_tang', lam3(tangTien), 'ty_le', ghiRo >= 0.5 ? 'vua' : 'thap', {
    thang: sau,
    so: { so_nguoi_truoc: lam3(nguoiTruoc), so_nguoi_gan: lam3(nguoiGan), chi_luong_truoc: Math.round(tongTruoc), chi_luong_gan: Math.round(tongGan), ty_le_ghi_ro_luong: lam3(ghiRo) },
  }, {
    vi: `Chi trả cho người lao động 3 tháng gần nhất trung bình ${vnd(tongGan, 'vi')}/tháng cho khoảng ${Math.round(nguoiGan)} người, so với ${vnd(tongTruoc, 'vi')} cho khoảng ${Math.round(nguoiTruoc)} người 3 tháng trước đó${ghiRo < 0.5 ? ' (phần lớn suy ra từ khoản chuyển đều cho cá nhân, không ghi chữ "lương")' : ''}.`,
    en: `Payments to staff averaged ${vnd(tongGan, 'en')}/month to about ${Math.round(nguoiGan)} people in the last 3 months, vs ${vnd(tongTruoc, 'en')} to about ${Math.round(nguoiTruoc)} people in the 3 months before${ghiRo < 0.5 ? ' (mostly inferred from regular transfers to individuals not labelled "salary")' : ''}.`,
  });
}

function quocTe(ds: Khoan[], tu12: string, khoaNay: string): TinHieu | null {
  const k = ds.filter((x) => x.khoa >= tu12 && x.khoa < khoaNay && MAU_QUOC_TE.test(x.chu));
  const thang = [...new Set(k.map((x) => x.khoa))];
  if (k.length < NGUONG_TH.quoc_te_so_khoan || thang.length < NGUONG_TH.quoc_te_so_thang) return null;
  const han = k.filter((x) => MAU_HAN_QUOC.test(x.chu)).length;
  const vao = k.filter((x) => x.chieu === 'vao').length;
  return tinHieu('dong_tien_quoc_te', k.length, 'so_khoan', k.length >= 6 && thang.length >= 4 ? 'vua' : 'thap', {
    thang, giao_dich: k.map((x) => x.id), so: { so_khoan_vao: vao, so_khoan_ra: k.length - vao, lien_quan_han_quoc: han >= 2 },
  }, {
    vi: `${k.length} khoản có nội dung ngoại tệ hoặc chuyển tiền quốc tế trong ${thang.length} tháng (${vao} tiền vào, ${k.length - vao} tiền ra)${han >= 2 ? ', một phần liên quan Hàn Quốc' : ''}. MIMI chỉ đọc nội dung chuyển khoản nên có thể sót.`,
    en: `${k.length} transfers mention foreign currency or cross-border payment across ${thang.length} months (${vao} in, ${k.length - vao} out)${han >= 2 ? ', some Korea-linked' : ''}. MIMI only reads transfer memos, so it may miss some.`,
  });
}

function tienDu(chuoi: ThangTH[], duBao: ReturnType<typeof duBaoDongTien> | null): TinHieu | null {
  if (chuoi.length < NGUONG_TH.so_thang_toi_thieu || !duBao?.du_du_lieu) return null;
  const sau = chuoi.slice(-6);
  const duong = sau.filter((t) => t.rong > 0).length;
  const cong = tong(sau.map((t) => t.rong));
  const chi = trungVi(sau.map((t) => t.ra));
  if (duong < NGUONG_TH.du_thang_duong || chi <= 0 || cong < NGUONG_TH.du_boi_chi_thang * chi) return null;
  const coSo = duBao.kich_ban.find((k) => k.ten === 'co_so')?.tong_rong ?? 0;
  const xau = duBao.kich_ban.find((k) => k.ten === 'xau')?.tong_rong ?? 0;
  if (coSo <= 0) return null;
  const tin: DoTinCay = xau >= 0 ? 'cao' : 'vua';
  return tinHieu('tien_du_dong_lai', Math.round(cong), 'dong', tin, {
    thang: sau.map((t) => t.khoa), so: { thang_duong: duong, chi_trung_vi_thang: Math.round(chi), du_bao_3_thang_co_so: coSo, du_bao_3_thang_xau: xau },
  }, {
    vi: `${duong}/6 tháng gần nhất tiền bán hàng vượt tiền chi; phần dư cộng lại ${vnd(cong, 'vi')}, bằng ${Math.round((cong / chi) * 10) / 10} tháng chi điển hình${xau >= 0 ? ', và dự báo kể cả kịch bản yếu vẫn dư' : ''}. MIMI không thấy số dư tài khoản — đây là chênh lệch tiền vào, tiền ra.`,
    en: `In ${duong} of the last 6 months sales exceeded spending; the surplus adds up to ${vnd(cong, 'en')}, about ${Math.round((cong / chi) * 10) / 10} months of typical spending${xau >= 0 ? ', and even the weak forecast scenario stays positive' : ''}. MIMI does not see account balances — this is inflow minus outflow.`,
  });
}

function thieuVon(chuoi: ThangTH[]): TinHieu | null {
  const n12 = chuoi.slice(-12);
  if (n12.length < 9) return null;
  const am = n12.filter((t) => t.rong < 0);
  if (am.length < NGUONG_TH.thieu_von_thang_am || tong(n12.map((t) => t.rong)) <= 0) return null;
  const tv = trungVi(n12.map((t) => t.vao_kd));
  const cao = n12.reduce((a, t) => (t.vao_kd > a.vao_kd ? t : a), n12[0]);
  const muaVu = tv > 0 ? cao.vao_kd / tv : null;
  const hut = Math.max(...am.map((t) => -t.rong));
  const tin: DoTinCay = am.length >= 3 || (muaVu !== null && muaVu >= NGUONG_TH.mua_vu_ty_le) ? 'vua' : 'thap';
  return tinHieu('khoang_trong_von_luu_dong', Math.round(hut), 'dong', tin, {
    thang: am.map((t) => t.khoa), so: { so_thang_am: am.length, thang_ban_cao_nhat: cao.khoa, ty_le_mua_vu: muaVu === null ? null : lam3(muaVu) },
  }, {
    vi: `Cả năm vẫn dư nhưng ${am.length} tháng (${am.map((t) => thangChu(t.khoa)).join(', ')}) tiền chi vượt tiền bán; tháng hụt nhiều nhất ${vnd(hut, 'vi')}${muaVu !== null && muaVu >= NGUONG_TH.mua_vu_ty_le ? `. Bán theo mùa: tháng cao nhất (${thangChu(cao.khoa)}) gấp ${Math.round(muaVu * 10) / 10} lần tháng thường` : ''}.`,
    en: `The year is positive overall, but in ${am.length} months (${am.map((t) => t.khoa).join(', ')}) spending exceeded sales; the largest gap was ${vnd(hut, 'en')}${muaVu !== null && muaVu >= NGUONG_TH.mua_vu_ty_le ? `. Seasonal sales: the peak month (${cao.khoa}) is ${Math.round(muaVu * 10) / 10}× a typical month` : ''}.`,
  });
}

// ── Mức tăng trưởng ─────────────────────────────────────────────────────────

export function xepMuc(soThang: number, ds: readonly TinHieu[]): MucTangTruong {
  if (soThang < NGUONG_TH.so_thang_toi_thieu) return 'chua_du_du_lieu';
  const co = (m: MaTinHieu) => ds.find((t) => t.ma === m) ?? null;
  const vuot = co('da_vuot_nguong');
  const sap = co('sap_vuot_nguong');
  const sapChac = sap && sap.do_tin_cay !== 'thap' ? sap.gia_tri : null;
  const vuot1 = !!vuot && (vuot.gia_tri ?? 0) >= 1e9;
  const vuot3 = !!vuot && (vuot.gia_tri ?? 0) >= 3e9;
  const soTangTruong = ds.filter((t) => TIN_HIEU_TANG_TRUONG.includes(t.ma)).length;
  if (vuot3 || sapChac === 3e9 || (vuot1 && (!!co('mo_co_so_moi') || !!co('quy_luong_tang')))) return 'san_sang_mo_rong';
  if (vuot1 || sapChac === 1e9 || soTangTruong >= 2) return 'dang_len';
  if (soTangTruong >= 1) return 'moi_tang_truong';
  return 'on_dinh';
}

// ── Điểm vào ────────────────────────────────────────────────────────────────

export function tinhTinHieu(d: DauVaoTinHieu): KetQuaTinHieu {
  const khoaNay = d.hom_nay.slice(0, 7);
  const tu12 = congThang(khoaNay, -12);
  const ds = chuanHoa(d);
  const chuoi = chuoiThang(ds, khoaNay);
  const db = chuoi.length >= 3
    ? duBaoDongTien(chuoi.map((t) => ({ khoa: t.khoa, vao: t.vao_kd, ra: t.ra })), { homNay: d.hom_nay, congNoQuaHan: 0, ngon: 'vi' })
    : null;
  const coSoKb = db?.du_du_lieu ? db.kich_ban.find((k) => k.ten === 'co_so')?.thang[0] : null;
  const xauKb = db?.du_du_lieu ? db.kich_ban.find((k) => k.ten === 'xau')?.thang[0] : null;
  const duBao = coSoKb && xauKb ? { thang_co_so: coSoKb.vao, thang_xau: xauKb.vao } : null;

  const tinHieuDs: TinHieu[] = [
    ...nguongDoanhThu(d, chuoi, khoaNay, duBao),
    tangTruongDoanhThu(chuoi),
    coSoMoi(d, ds),
    tienVaoLon(ds, chuoi, tu12, khoaNay),
    ...vay(ds, chuoi, tu12, khoaNay),
    quyLuong(ds, chuoi),
    quocTe(ds, tu12, khoaNay),
    tienDu(chuoi, db),
    thieuVon(chuoi),
  ].filter((x): x is TinHieu => !!x);
  // Thứ tự cố định theo danh mục mã.
  tinHieuDs.sort((a, b) => MA_TIN_HIEU.indexOf(a.ma) - MA_TIN_HIEU.indexOf(b.ma));

  const muc = xepMuc(chuoi.length, tinHieuDs);
  return {
    phien_ban: PHIEN_BAN_TIN_HIEU,
    hom_nay: d.hom_nay,
    so_thang: chuoi.length,
    muc,
    ten_muc: { vi: TEN_MUC.vi[muc], en: TEN_MUC.en[muc] },
    ly_do_muc: { vi: LUAT_MUC.vi[muc], en: LUAT_MUC.en[muc] },
    tin_hieu: tinHieuDs,
    doanh_thu_12_thang: chuoi.length >= 12 ? Math.round(tong(chuoi.slice(-12).map((t) => t.vao_kd))) : null,
    chuoi_thang: chuoi.slice(-12),
    du_bao: duBao,
    nhan: NHAN_TRUNG_THUC,
  };
}
