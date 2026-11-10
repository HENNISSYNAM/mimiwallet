/**
 * ĐÁNH GIÁ SẴN SÀNG VAY (10/11/2026) — bảng điểm 0–100 GIẢI THÍCH ĐƯỢC cho hộ kinh doanh, hàm thuần.
 *
 * ĐÁNH GIÁ SẴN SÀNG VAY CỦA MIMI — KHÔNG PHẢI ĐIỂM TÍN DỤNG CỦA TỔ CHỨC CÓ GIẤY PHÉP (NĐ 58/2021/NĐ-CP).
 * Chấm điểm tín dụng cho bên thứ ba là hoạt động thông tin tín dụng cần giấy phép của Ngân hàng Nhà nước; MIMI không có
 * giấy phép đó, không đọc CIC, không gửi điểm cho ai và không cho vay. Điểm này chỉ để CHÍNH CHỦ doanh nghiệp tự xem
 * hồ sơ dòng tiền của mình trông thế nào trước khi tự mang đi vay. Trọng số là đề xuất minh hoạ, chưa kiểm định với dữ
 * liệu trả nợ thật — câu này đi cùng mọi kết quả (`NHAN_TRUNG_THUC`).
 *
 * KHÁC `tai-chinh/diem-san-sang.ts` (sức khoẻ tài chính 6 yếu tố) ở chỗ: điểm này gắn với MỘT KHOẢN ĐỀ NGHỊ cụ thể
 * (số tiền + kỳ hạn). Cùng một cửa hàng, đề nghị 50 triệu và 2 tỷ cho hai kết quả khác nhau — vì câu bên cho vay hỏi
 * là "trả nổi khoản NÀY không", không phải "cửa hàng có tốt không".
 *
 * NGUYÊN TẮC:
 *  - Không có mô hình ngôn ngữ nào tính hay quyết định ở đây. Mọi con số là phép tính công khai trên dòng tiền đã làm
 *    sạch (tiền vay, góp vốn, người nhà, hoàn tiền bị loại ở nơi gọi — `du-lieu.ts`).
 *  - Tái lập được: cùng đầu vào → cùng đầu ra, có `phien_ban`. Đổi trọng số/ngưỡng là đổi phiên bản.
 *  - Dưới 3 tháng đã khép sổ: KHÔNG chấm. Nói thiếu gì.
 *  - Mỗi yếu tố trả giá trị đo được, điểm, trọng số, mã lý do, một câu lý do bằng lời thường và một gợi ý cải thiện.
 *    Ba lý do khiến bên cho vay ngần ngại nhất được xếp riêng (kiểu "adverse action notice").
 *  - Có hai điều kiện CHẶN (dòng tiền ròng không dương; trả góp ước tính vượt cả dòng tiền ròng): khi đó mức tối đa là
 *    "Chưa nên đề nghị khoản này" dù cộng điểm ra bao nhiêu.
 */
import { GIA_DINH, sucChuaGoc } from '../tai-chinh/phuong-an.ts';

export const PHIEN_BAN_DANH_GIA = 'mimi-san-sang-vay-2026.11.10';

export type Ngon = 'vi' | 'en';

export const NHAN_TRUNG_THUC: Record<Ngon, string> = {
  vi: 'Đánh giá sẵn sàng vay của MIMI — không phải điểm tín dụng của tổ chức có giấy phép (NĐ 58/2021)',
  en: "MIMI's loan-readiness assessment — not a credit score from a licensed credit bureau (Decree 58/2021)",
};

export const GHI_CHU_TRONG_SO: Record<Ngon, string> = {
  vi: 'MIMI không đọc dữ liệu CIC, không gửi kết quả này cho ai và không cho vay. Trọng số là đề xuất minh hoạ, chưa kiểm định với dữ liệu trả nợ thật; mỗi bên cho vay có tiêu chí riêng.',
  en: 'MIMI does not read credit-bureau (CIC) data, does not send this result to anyone and does not lend. Weights are illustrative and not validated against real repayment data; every lender has its own criteria.',
};

export const SO_THANG_TOI_THIEU = 3;
export const KY_HAN_TOI_DA = 120;

export interface ThangDongTien { khoa: string; vao: number; ra: number }

/** Một dòng bảng dòng tiền 12 tháng của hồ sơ. null = tháng không có giao dịch nào (không phải 0 đồng). */
export interface DongBangThang { khoa: string; vao: number | null; ra: number | null; rong: number | null }

/** Khoản vay đang có, nhận ra từ sao kê (`du-lieu.ts`). Chỉ là những gì MIMI THẤY trong tài khoản đã kết nối. */
export interface VayHienCo {
  tien_vay_vao: number;
  so_khoan_vay_vao: number;
  tra_no_ra: number;
  so_khoan_tra_no: number;
}

export interface DauVaoDanhGia {
  /** Tiền vào kinh doanh ĐÃ LÀM SẠCH và tiền ra của các tháng ĐÃ KHÉP SỔ (tối đa 12). */
  thang: ThangDongTien[];
  so_tien_de_nghi: number;
  ky_han_thang: number;
  cong_no_qua_han: number;
  /** Tỷ lệ tiền vào của khách lớn nhất (0..1); null = sao kê không có tên người trả. */
  ty_le_khach_lon_nhat: number | null;
  /** Tiền vào nghi không phải doanh thu mà chủ chưa xác nhận, và tổng tiền vào (chưa làm sạch) cùng kỳ. */
  tien_nghi_chua_xac_nhan: number;
  tong_tien_vao: number;
  vay_hien_co: VayHienCo;
}

export type KhoaYeuTo =
  | 'tra_no' | 'dong_tien_rong' | 'lich_su' | 'on_dinh' | 'xu_huong' | 'thu_no' | 'tap_trung' | 'minh_bach' | 'no_hien_co';

/** Trọng số — cộng đúng 100. Thứ tự là thứ tự hiện và thứ tự phá hoà khi xếp lý do. */
export const TRONG_SO: Record<KhoaYeuTo, number> = {
  tra_no: 25, dong_tien_rong: 15, lich_su: 15, on_dinh: 10, xu_huong: 10, thu_no: 10, tap_trung: 5, minh_bach: 5, no_hien_co: 5,
};
export const THU_TU_YEU_TO = Object.keys(TRONG_SO) as KhoaYeuTo[];

export type MucYeuTo = 'tot' | 'vua' | 'yeu' | 'khong_do';

export interface YeuToDanhGia {
  khoa: KhoaYeuTo;
  ten: string;
  diem: number;
  toi_da: number;
  /** Con số thô đứng sau điểm (tỷ lệ 0..1, số tháng…), làm tròn 4 chữ số; null = không đo được. */
  gia_tri: number | null;
  /** Con số đó viết thành chữ. */
  gia_tri_chu: string;
  muc: MucYeuTo;
  /** Mã lý do ổn định, ví dụ `tra_no.yeu`, để giao diện/bên đọc tra cứu. */
  ma_ly_do: string;
  ly_do: string;
  /** Rỗng khi đã đạt tối đa. */
  goi_y: string;
}

export interface LyDoNganNgai { khoa: KhoaYeuTo; ma_ly_do: string; diem_mat: number; cau: string; goi_y: string }

export type MucDanhGia = 'vung' | 'kha' | 'can_cai_thien' | 'chua_nen';
export type MaChan = 'dong_tien_khong_duong' | 'vuot_suc_tra';

export interface SoLieuDanhGia {
  so_thang: number;
  vao_tb: number;
  ra_tb: number;
  rong_tb: number;
  he_so_bien_dong: number | null;
  tang_truong: number | null;
  /** Trả góp mỗi tháng ước tính cho khoản đề nghị, ở lãi thấp và lãi cao của `GIA_DINH`. */
  tra_gop_thang: { thap: number; cao: number };
  /** Trả tối đa mỗi tháng mà không tự làm mình ngộp: `GIA_DINH.ty_le_tra_no_tren_dong_tien_rong` × dòng tiền ròng. */
  tra_toi_da_thang: number;
  /** Gốc tối đa vay được với kỳ hạn đề nghị, cùng hai mức lãi. */
  goc_toi_da: { thap: number; cao: number };
  /** Trả góp (lãi cao) / dòng tiền ròng trung bình. null khi ròng ≤ 0. */
  ty_le_tra_no: number | null;
  tra_no_hien_co_thang: number;
}

interface Chung { phien_ban: string; nhan: string; ghi_chu: string; de_nghi: { so_tien: number; ky_han_thang: number } }

export type KetQuaDanhGia =
  | (Chung & {
    co_diem: true;
    diem: number;
    muc: MucDanhGia;
    ten_muc: string;
    mo_ta_muc: string;
    chan: { ma: MaChan; cau: string }[];
    yeu_to: YeuToDanhGia[];
    ly_do_chinh: LyDoNganNgai[];
    so_lieu: SoLieuDanhGia;
    gia_dinh: { ty_le_tra_no_tren_dong_tien_rong: number; lai_nam_thap: number; lai_nam_cao: number };
  })
  | (Chung & { co_diem: false; so_thang: number; ly_do: string; goi_y: string[] });

// ── Phép tính ───────────────────────────────────────────────────────────────

/** Nội suy tuyến tính, kẹp 0..1: x ở `xau` → 0, ở `tot` → 1 (xau có thể lớn hơn tot). */
export const thang01 = (x: number, xau: number, tot: number) => Math.min(1, Math.max(0, (x - xau) / (tot - xau)));
const lam4 = (x: number) => Math.round(x * 1e4) / 1e4;
const tb = (a: readonly number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/** Trả góp đều (gốc + lãi) mỗi tháng cho `goc` trong `n` tháng, lãi năm `laiNam`. */
export function traGopThang(goc: number, n: number, laiNam: number): number {
  if (goc <= 0 || n <= 0) return 0;
  const r = laiNam / 12;
  if (r === 0) return goc / n;
  return (goc * r) / (1 - (1 + r) ** -n);
}

/** Tăng trưởng tiền vào: trung bình k tháng gần nhất so với k tháng trước đó (k = min(3, ⌊n/2⌋)). */
export function tangTruong(vao: readonly number[]): number | null {
  const k = Math.min(3, Math.floor(vao.length / 2));
  if (k < 1) return null;
  const gan = tb(vao.slice(-k));
  const truoc = tb(vao.slice(-2 * k, -k));
  return truoc > 0 ? (gan - truoc) / truoc : null;
}

// ── Lời (vi / en) ───────────────────────────────────────────────────────────

const tien = (n: number, ngon: Ngon) =>
  ngon === 'vi' ? `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫` : `${new Intl.NumberFormat('en-US').format(Math.round(n))} VND`;
const pt = (x: number) => `${Math.round(x * 100)}%`;

const TEN_YEU_TO: Record<Ngon, Record<KhoaYeuTo, string>> = {
  vi: {
    tra_no: 'Khả năng trả khoản này', dong_tien_rong: 'Dòng tiền ròng', lich_su: 'Độ dài lịch sử', on_dinh: 'Độ ổn định doanh thu',
    xu_huong: 'Xu hướng doanh thu', thu_no: 'Công nợ quá hạn', tap_trung: 'Phụ thuộc khách lớn', minh_bach: 'Doanh thu đã xác nhận', no_hien_co: 'Nợ vay đang trả',
  },
  en: {
    tra_no: 'Ability to repay this loan', dong_tien_rong: 'Net cash flow', lich_su: 'Length of history', on_dinh: 'Revenue stability',
    xu_huong: 'Revenue trend', thu_no: 'Overdue receivables', tap_trung: 'Customer concentration', minh_bach: 'Confirmed revenue', no_hien_co: 'Existing loan repayments',
  },
};

const TEN_MUC: Record<Ngon, Record<MucDanhGia, { ten: string; mo_ta: string }>> = {
  vi: {
    vung: { ten: 'Sẵn sàng', mo_ta: 'Dòng tiền đủ vững cho khoản đề nghị này. Mang hồ sơ đi nói chuyện với bên cho vay được rồi.' },
    kha: { ten: 'Khá', mo_ta: 'Có thể đề nghị, nhưng nên chuẩn bị giải thích các điểm yếu bên dưới trước khi gặp bên cho vay.' },
    can_cai_thien: { ten: 'Nên cải thiện trước', mo_ta: 'Bên cho vay nhiều khả năng sẽ ngần ngại. Làm các gợi ý bên dưới, hoặc đề nghị số tiền nhỏ hơn / kỳ hạn dài hơn.' },
    chua_nen: { ten: 'Chưa nên đề nghị khoản này', mo_ta: 'Với dòng tiền hiện tại, khoản này dễ làm bạn ngộp. Xem lại số tiền, kỳ hạn hoặc cải thiện dòng tiền trước.' },
  },
  en: {
    vung: { ten: 'Ready', mo_ta: 'Cash flow is solid enough for this request. You can take this file to a lender.' },
    kha: { ten: 'Fair', mo_ta: 'You can apply, but prepare to explain the weak points below before meeting a lender.' },
    can_cai_thien: { ten: 'Improve first', mo_ta: 'A lender is likely to hesitate. Work on the tips below, or ask for a smaller amount / longer term.' },
    chua_nen: { ten: 'Not advisable for this amount yet', mo_ta: 'With current cash flow this loan could strain you. Revisit the amount or term, or improve cash flow first.' },
  },
};

const CAU_CHAN: Record<Ngon, Record<MaChan, (x: { tra: string; rong: string }) => string>> = {
  vi: {
    dong_tien_khong_duong: ({ rong }) => `Dòng tiền ròng trung bình mỗi tháng là ${rong} — không còn tiền dư để trả nợ.`,
    vuot_suc_tra: ({ tra, rong }) => `Trả góp ước tính ${tra}/tháng lớn hơn cả dòng tiền ròng trung bình ${rong}/tháng.`,
  },
  en: {
    dong_tien_khong_duong: ({ rong }) => `Average monthly net cash flow is ${rong} — there is nothing left over to repay a loan.`,
    vuot_suc_tra: ({ tra, rong }) => `The estimated instalment of ${tra}/month exceeds your average net cash flow of ${rong}/month.`,
  },
};

const THIEU_THANG: Record<Ngon, (n: number) => { ly_do: string; goi_y: string[] }> = {
  vi: (n) => ({
    ly_do: `Cần ít nhất ${SO_THANG_TOI_THIEU} tháng sao kê đã khép sổ để đánh giá; hiện có ${n}. MIMI không chấm khi chưa đủ dữ liệu.`,
    goi_y: [
      'Kết nối tài khoản ngân hàng kinh doanh, hoặc tải thêm sao kê các tháng trước.',
      'Bên cho vay thường xem 6–12 tháng sao kê — tải càng đủ càng tốt.',
    ],
  }),
  en: (n) => ({
    ly_do: `At least ${SO_THANG_TOI_THIEU} closed months of bank statements are needed; you have ${n}. MIMI does not score without enough data.`,
    goi_y: [
      'Connect your business bank account, or upload statements for earlier months.',
      'Lenders usually look at 6–12 months of statements — the more complete, the better.',
    ],
  }),
};

type V = Record<string, string>;
interface CauYeuTo { tot: (v: V) => string; chua: (v: V) => string; goi_y: (v: V) => string; khong_do?: (v: V) => string }

/** Câu lý do cho từng yếu tố. `chua` là điều bên cho vay sẽ ngần ngại khi yếu tố chưa tốt. */
const CAU: Record<Ngon, Record<KhoaYeuTo, CauYeuTo>> = {
  vi: {
    tra_no: {
      tot: (v) => `Trả góp ước tính ${v.tra}/tháng chiếm ${v.ty} dòng tiền ròng — trong mức an toàn ${v.nguong}.`,
      chua: (v) => `Trả góp ước tính ${v.tra}/tháng chiếm ${v.ty} dòng tiền ròng, vượt mức an toàn ${v.nguong}.`,
      goi_y: (v) => `Với kỳ hạn này nên đề nghị tối đa khoảng ${v.goc}, hoặc kéo dài kỳ hạn để trả mỗi tháng nhẹ hơn.`,
      khong_do: () => 'Dòng tiền ròng không dương nên chưa có tiền dư để trả khoản này.',
    },
    dong_tien_rong: {
      tot: (v) => `Dòng tiền ròng trung bình ${v.rong}/tháng, bằng ${v.ty} tiền vào — dư ra đều.`,
      chua: (v) => `Dòng tiền ròng trung bình ${v.rong}/tháng, chỉ ${v.ty} tiền vào — biên dư mỏng.`,
      goi_y: () => 'Giảm chi cố định hoặc thu nợ trước để mỗi tháng dư ra nhiều hơn — đây là điều đầu tiên bên cho vay xem.',
    },
    lich_su: {
      tot: (v) => `Có ${v.n} tháng sao kê đã khép sổ — đủ để bên cho vay thấy cả năm.`,
      chua: (v) => `Mới có ${v.n} tháng sao kê đã khép sổ; bên cho vay thường muốn xem 6–12 tháng.`,
      goi_y: () => 'Kết nối hoặc tải thêm sao kê các tháng trước.',
    },
    on_dinh: {
      tot: (v) => `Tiền vào khá đều: lệch trung bình ${v.cv} giữa các tháng.`,
      chua: (v) => `Tiền vào dao động mạnh: lệch trung bình ${v.cv} giữa các tháng.`,
      goi_y: () => 'Hợp đồng định kỳ hoặc khách quen giúp doanh thu đều hơn; chuẩn bị giải thích tháng thấp (mùa vụ, sửa chữa…).',
    },
    xu_huong: {
      tot: (v) => `Tiền vào các tháng gần đây ${v.huong} ${v.g} so với trước đó.`,
      chua: (v) => `Tiền vào các tháng gần đây ${v.huong} ${v.g} so với trước đó.`,
      goi_y: () => 'Nếu doanh thu đang giảm vì lý do tạm thời, ghi rõ lý do trong hồ sơ; nếu không, cân nhắc đợi doanh thu hồi lại.',
      khong_do: () => 'Chưa đủ tháng để đo xu hướng doanh thu.',
    },
    thu_no: {
      tot: (v) => (v.no === '0' ? 'Không có hoá đơn bán ra quá hạn.' : `Công nợ quá hạn ${v.tien}, bằng ${v.ty} tiền vào một tháng — nhỏ.`),
      chua: (v) => `Khách còn nợ quá hạn ${v.tien}, bằng ${v.ty} tiền vào một tháng.`,
      goi_y: () => 'Nhắc khách trả hoá đơn quá hạn trước — vừa có tiền ngay, vừa có khi không cần vay nhiều như vậy.',
    },
    tap_trung: {
      tot: (v) => `Khách lớn nhất chiếm ${v.ty} tiền vào — không phụ thuộc một khách.`,
      chua: (v) => `Khách lớn nhất chiếm ${v.ty} tiền vào — mất khách này là mất phần lớn doanh thu.`,
      goi_y: () => 'Mở thêm khách hoặc kênh bán; nếu có hợp đồng dài hạn với khách lớn, mang theo hợp đồng.',
      khong_do: () => 'Sao kê không có tên người trả tiền nên chưa đo được mức phụ thuộc một khách.',
    },
    minh_bach: {
      tot: (v) => (v.ty === '0%' ? 'Mọi khoản tiền vào đáng ngờ đã được bạn xác nhận.' : `Chỉ ${v.ty} tiền vào là khoản nghi chưa xác nhận.`),
      chua: (v) => `${v.ty} tiền vào là khoản nghi (vay, người nhà, góp vốn…) bạn chưa xác nhận — bên cho vay không biết đâu là doanh thu thật.`,
      goi_y: () => 'Xác nhận các khoản MIMI chỉ ra để doanh thu trên hồ sơ là số thật.',
    },
    no_hien_co: {
      tot: (v) => (v.thay === '0' ? 'Không thấy khoản trả nợ vay nào trong sao kê đã kết nối.' : `Đang trả nợ khoảng ${v.tra}/tháng, bằng ${v.ty} tiền vào — nhẹ.`),
      chua: (v) => `Đang trả nợ vay khoảng ${v.tra}/tháng, bằng ${v.ty} tiền vào — thêm khoản mới sẽ chồng nợ.`,
      goi_y: () => 'Ghi rõ các khoản vay đang trả trong hồ sơ; bên cho vay sẽ tra CIC và thấy chúng dù bạn không ghi.',
      khong_do: (v) => `Có ${v.vay} tiền giải ngân vay trong sao kê nhưng chưa thấy khoản trả nợ nào — bên cho vay sẽ hỏi khoản đó trả từ đâu.`,
    },
  },
  en: {
    tra_no: {
      tot: (v) => `The estimated instalment of ${v.tra}/month is ${v.ty} of net cash flow — within the safe level of ${v.nguong}.`,
      chua: (v) => `The estimated instalment of ${v.tra}/month is ${v.ty} of net cash flow, above the safe level of ${v.nguong}.`,
      goi_y: (v) => `For this term, ask for at most about ${v.goc}, or choose a longer term to lower the monthly payment.`,
      khong_do: () => 'Net cash flow is not positive, so there is no surplus to repay this loan.',
    },
    dong_tien_rong: {
      tot: (v) => `Average net cash flow is ${v.rong}/month, ${v.ty} of money in — a steady surplus.`,
      chua: (v) => `Average net cash flow is ${v.rong}/month, only ${v.ty} of money in — a thin margin.`,
      goi_y: () => 'Cut fixed costs or collect receivables first so more is left each month — this is the first thing lenders check.',
    },
    lich_su: {
      tot: (v) => `${v.n} closed months of statements — enough for a lender to see the full year.`,
      chua: (v) => `Only ${v.n} closed months of statements; lenders usually want 6–12 months.`,
      goi_y: () => 'Connect or upload statements for earlier months.',
    },
    on_dinh: {
      tot: (v) => `Money in is steady: ${v.cv} average deviation between months.`,
      chua: (v) => `Money in swings a lot: ${v.cv} average deviation between months.`,
      goi_y: () => 'Recurring contracts or regular customers smooth revenue; be ready to explain low months (seasonality, repairs…).',
    },
    xu_huong: {
      tot: (v) => `Money in over recent months is ${v.huong} ${v.g} versus the months before.`,
      chua: (v) => `Money in over recent months is ${v.huong} ${v.g} versus the months before.`,
      goi_y: () => 'If revenue is down for a temporary reason, say so in the file; otherwise consider waiting for it to recover.',
      khong_do: () => 'Not enough months yet to measure the revenue trend.',
    },
    thu_no: {
      tot: (v) => (v.no === '0' ? 'No overdue sales invoices.' : `Overdue receivables of ${v.tien}, ${v.ty} of one month's money in — small.`),
      chua: (v) => `Customers owe ${v.tien} overdue, ${v.ty} of one month's money in.`,
      goi_y: () => 'Chase overdue invoices first — cash now, and you may not need to borrow as much.',
    },
    tap_trung: {
      tot: (v) => `Your largest customer is ${v.ty} of money in — no single-customer dependence.`,
      chua: (v) => `Your largest customer is ${v.ty} of money in — losing them would cost most of your revenue.`,
      goi_y: () => 'Add customers or sales channels; if you have a long-term contract with the big customer, bring it.',
      khong_do: () => 'Statements carry no payer names, so customer concentration could not be measured.',
    },
    minh_bach: {
      tot: (v) => (v.ty === '0%' ? 'You have confirmed every questionable inflow.' : `Only ${v.ty} of money in is unconfirmed and questionable.`),
      chua: (v) => `${v.ty} of money in is questionable (loans, family, capital…) and unconfirmed — a lender cannot tell real revenue.`,
      goi_y: () => 'Confirm the items MIMI flags so the revenue in your file is the real figure.',
    },
    no_hien_co: {
      tot: (v) => (v.thay === '0' ? 'No loan repayments seen in the connected statements.' : `Repaying about ${v.tra}/month on loans, ${v.ty} of money in — light.`),
      chua: (v) => `Repaying about ${v.tra}/month on loans, ${v.ty} of money in — a new loan would stack on top.`,
      goi_y: () => 'List your existing loans in the file; lenders will see them in the credit bureau anyway.',
      khong_do: (v) => `There is ${v.vay} of loan disbursement in your statements but no repayment seen — a lender will ask how it is repaid.`,
    },
  },
};

const NHAN_HUONG: Record<Ngon, { tang: string; giam: string }> = { vi: { tang: 'tăng', giam: 'giảm' }, en: { tang: 'up', giam: 'down' } };

// ── Bảng điểm ───────────────────────────────────────────────────────────────

/** Mức chữ của một yếu tố theo tỷ lệ điểm đạt được. */
const mucTheoTy = (ty: number): MucYeuTo => (ty >= 0.8 ? 'tot' : ty >= 0.4 ? 'vua' : 'yeu');

export function danhGiaSanSangVay(dv: DauVaoDanhGia, ngon: Ngon = 'vi'): KetQuaDanhGia {
  const chung: Chung = {
    phien_ban: PHIEN_BAN_DANH_GIA, nhan: NHAN_TRUNG_THUC[ngon], ghi_chu: GHI_CHU_TRONG_SO[ngon],
    de_nghi: { so_tien: Math.round(dv.so_tien_de_nghi), ky_han_thang: Math.round(dv.ky_han_thang) },
  };
  const thang = [...dv.thang].sort((a, b) => a.khoa.localeCompare(b.khoa)).slice(-12);
  const n = thang.length;
  if (n < SO_THANG_TOI_THIEU) {
    const t = THIEU_THANG[ngon](n);
    return { ...chung, co_diem: false, so_thang: n, ly_do: t.ly_do, goi_y: t.goi_y };
  }

  const g = GIA_DINH;
  const T = (x: number) => tien(x, ngon);
  const vao = thang.map((t) => t.vao);
  const vaoTb = tb(vao);
  const raTb = tb(thang.map((t) => t.ra));
  const rongTb = vaoTb - raTb;
  const bien = vaoTb > 0 ? rongTb / vaoTb : -1;
  const lech = Math.sqrt(tb(vao.map((x) => (x - vaoTb) ** 2)));
  const cv = vaoTb > 0 ? lech / vaoTb : null;
  const tang = tangTruong(vao);
  const kyHan = Math.max(1, Math.round(dv.ky_han_thang));
  const goc = Math.max(0, dv.so_tien_de_nghi);
  const traThap = traGopThang(goc, kyHan, g.lai_nam_thap);
  const traCao = traGopThang(goc, kyHan, g.lai_nam_cao);
  const traToiDa = Math.max(0, rongTb) * g.ty_le_tra_no_tren_dong_tien_rong;
  const tyTraNo = rongTb > 0 ? traCao / rongTb : null;
  const traNoHienCo = dv.vay_hien_co.tra_no_ra / n;

  const yeu: YeuToDanhGia[] = [];
  const them = (khoa: KhoaYeuTo, ty: number | null, giaTri: number | null, giaTriChu: string, v: V, khongDo = false) => {
    const toi_da = TRONG_SO[khoa];
    const c = CAU[ngon][khoa];
    const tyDung = ty ?? 0.5;
    const diem = Math.round(toi_da * tyDung);
    const muc: MucYeuTo = khongDo ? 'khong_do' : mucTheoTy(tyDung);
    const ly_do = khongDo && c.khong_do ? c.khong_do(v) : muc === 'tot' ? c.tot(v) : c.chua(v);
    yeu.push({
      khoa, ten: TEN_YEU_TO[ngon][khoa], diem, toi_da, gia_tri: giaTri === null ? null : lam4(giaTri), gia_tri_chu: giaTriChu,
      muc, ma_ly_do: `${khoa}.${muc}`, ly_do, goi_y: diem >= toi_da ? '' : c.goi_y(v),
    });
  };

  // 1. Khả năng trả khoản này — trả góp (lãi cao, thận trọng) so với dòng tiền ròng.
  const gocToiDaCao = Math.round(sucChuaGoc(traToiDa, kyHan, g.lai_nam_cao));
  const vTra = { tra: T(traCao), ty: tyTraNo === null ? '—' : pt(tyTraNo), nguong: pt(g.ty_le_tra_no_tren_dong_tien_rong), goc: T(gocToiDaCao) };
  if (tyTraNo === null) them('tra_no', 0, null, ngon === 'vi' ? 'Không tính được' : 'Not computable', vTra, true);
  else them('tra_no', thang01(tyTraNo, 1, g.ty_le_tra_no_tren_dong_tien_rong), tyTraNo, pt(tyTraNo), vTra);

  // 2. Dòng tiền ròng.
  them('dong_tien_rong', thang01(bien, -0.1, 0.15), bien, pt(bien), { rong: T(rongTb), ty: pt(bien) });

  // 3. Độ dài lịch sử.
  them('lich_su', thang01(n, SO_THANG_TOI_THIEU - 1, 12), n, ngon === 'vi' ? `${n} tháng` : `${n} months`, { n: String(n) });

  // 4. Độ ổn định (hệ số biến động tiền vào).
  them('on_dinh', cv === null ? 0 : thang01(cv, 0.6, 0.15), cv, cv === null ? '—' : pt(cv), { cv: cv === null ? '—' : pt(cv) });

  // 5. Xu hướng.
  if (tang === null) them('xu_huong', null, null, '—', {}, true);
  else them('xu_huong', thang01(tang, -0.3, 0.05), tang, `${tang >= 0 ? '+' : '−'}${pt(Math.abs(tang))}`, { huong: tang >= 0 ? NHAN_HUONG[ngon].tang : NHAN_HUONG[ngon].giam, g: pt(Math.abs(tang)) });

  // 6. Công nợ quá hạn.
  const tyNo = vaoTb > 0 ? dv.cong_no_qua_han / vaoTb : (dv.cong_no_qua_han > 0 ? 1 : 0);
  them('thu_no', thang01(tyNo, 0.5, 0), tyNo, pt(tyNo), { tien: T(dv.cong_no_qua_han), ty: pt(tyNo), no: dv.cong_no_qua_han > 0 ? '1' : '0' });

  // 7. Phụ thuộc khách lớn.
  if (dv.ty_le_khach_lon_nhat === null) them('tap_trung', null, null, '—', {}, true);
  else them('tap_trung', thang01(dv.ty_le_khach_lon_nhat, 0.6, 0.2), dv.ty_le_khach_lon_nhat, pt(dv.ty_le_khach_lon_nhat), { ty: pt(dv.ty_le_khach_lon_nhat) });

  // 8. Doanh thu đã xác nhận.
  const tyNghi = dv.tong_tien_vao > 0 ? dv.tien_nghi_chua_xac_nhan / dv.tong_tien_vao : 0;
  them('minh_bach', thang01(tyNghi, 0.2, 0), tyNghi, pt(tyNghi), { ty: pt(tyNghi) });

  // 9. Nợ vay đang trả (nhận ra từ sao kê).
  const tyHienCo = vaoTb > 0 ? traNoHienCo / vaoTb : (traNoHienCo > 0 ? 1 : 0);
  const vNo = { tra: T(traNoHienCo), ty: pt(tyHienCo), thay: dv.vay_hien_co.so_khoan_tra_no > 0 ? '1' : '0', vay: T(dv.vay_hien_co.tien_vay_vao) };
  if (dv.vay_hien_co.tien_vay_vao > 0 && dv.vay_hien_co.so_khoan_tra_no === 0) them('no_hien_co', 0.5, 0, pt(0), vNo, true);
  else them('no_hien_co', thang01(tyHienCo, 0.3, 0), tyHienCo, pt(tyHienCo), vNo);

  // Điều kiện chặn.
  const chan: { ma: MaChan; cau: string }[] = [];
  const vChan = { tra: T(traCao), rong: T(rongTb) };
  if (rongTb <= 0) chan.push({ ma: 'dong_tien_khong_duong', cau: CAU_CHAN[ngon].dong_tien_khong_duong(vChan) });
  else if (traCao > rongTb) chan.push({ ma: 'vuot_suc_tra', cau: CAU_CHAN[ngon].vuot_suc_tra(vChan) });

  const diem = yeu.reduce((s, y) => s + y.diem, 0);
  let muc: MucDanhGia = diem >= 75 ? 'vung' : diem >= 60 ? 'kha' : diem >= 40 ? 'can_cai_thien' : 'chua_nen';
  if (chan.length) muc = 'chua_nen';

  const ly_do_chinh: LyDoNganNgai[] = yeu
    .map((y, i) => ({ y, i, mat: y.toi_da - y.diem }))
    .filter((x) => x.mat > 0 && x.y.muc !== 'tot')
    .sort((a, b) => b.mat - a.mat || b.y.toi_da - a.y.toi_da || a.i - b.i)
    .slice(0, 3)
    .map(({ y, mat }) => ({ khoa: y.khoa, ma_ly_do: y.ma_ly_do, diem_mat: mat, cau: y.ly_do, goi_y: y.goi_y }));

  return {
    ...chung, co_diem: true, diem, muc, ten_muc: TEN_MUC[ngon][muc].ten, mo_ta_muc: TEN_MUC[ngon][muc].mo_ta,
    chan, yeu_to: yeu, ly_do_chinh,
    so_lieu: {
      so_thang: n, vao_tb: Math.round(vaoTb), ra_tb: Math.round(raTb), rong_tb: Math.round(rongTb),
      he_so_bien_dong: cv === null ? null : lam4(cv), tang_truong: tang === null ? null : lam4(tang),
      tra_gop_thang: { thap: Math.round(traThap), cao: Math.round(traCao) },
      tra_toi_da_thang: Math.round(traToiDa),
      goc_toi_da: { thap: gocToiDaCao, cao: Math.round(sucChuaGoc(traToiDa, kyHan, g.lai_nam_thap)) },
      ty_le_tra_no: tyTraNo === null ? null : lam4(tyTraNo),
      tra_no_hien_co_thang: Math.round(traNoHienCo),
    },
    gia_dinh: { ty_le_tra_no_tren_dong_tien_rong: g.ty_le_tra_no_tren_dong_tien_rong, lai_nam_thap: g.lai_nam_thap, lai_nam_cao: g.lai_nam_cao },
  };
}

// ── Tái lập: băm đầu vào ─────────────────────────────────────────────────────

/** JSON với khoá xếp theo thứ tự — cùng dữ liệu thì cùng chuỗi, bất kể thứ tự khai báo. */
export function jsonOnDinh(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonOnDinh).join(',')}]`;
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${jsonOnDinh(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(x ?? null);
}

export async function sha256Hex(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Mã băm của đầu vào + phiên bản: hai lần chạy cùng mã băm phải ra cùng kết quả. */
export const bamDauVao = (dv: DauVaoDanhGia) => sha256Hex(jsonOnDinh({ phien_ban: PHIEN_BAN_DANH_GIA, dv }));

