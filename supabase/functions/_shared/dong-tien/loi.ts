/**
 * Lời giải thích của dự báo dòng tiền, bằng lời thường — tiếng Việt và tiếng Anh. Chỉ ghép số đã tính sẵn vào câu;
 * không có mô hình ngôn ngữ nào tính hay viết số ở đây.
 */
import type { TenMoHinh } from './mo-hinh.ts';
import type { ChuKy, LoaiDinhKy } from './dinh-ky.ts';

export type NgonDT = 'vi' | 'en';

const vnd = (n: number) => `${new Intl.NumberFormat('vi-VN').format(Math.round(n))} ₫`;
const ngay = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const pt = (x: number) => `${Math.round(x)}%`;

export const LOI_DT = {
  vi: {
    tenMoHinh: {
      mua_vu_ngay_thuong: 'lặp lại cùng thứ của tuần trước',
      holt_winters: 'làm mượt theo xu hướng và theo thứ trong tuần (Holt-Winters)',
      hoi_quy_ridge: 'hồi quy theo các tuần trước, thứ trong tuần và đầu/cuối tháng',
      trung_binh_thu: 'trung bình theo thứ trong tuần',
    } as Record<TenMoHinh, string>,
    chuKy: { tuan: 'hằng tuần', hai_tuan: 'hai tuần một lần', thang: 'hằng tháng', quy: 'mỗi quý' } as Record<ChuKy, string>,
    loaiDinhKy: {
      luong: 'Lương', mat_bang: 'Tiền thuê mặt bằng', tra_no: 'Trả nợ vay', thue: 'Thuế, phí', thue_bao: 'Thuê bao, dịch vụ',
      khach_quen: 'Khách quen trả đều', nha_cung_cap: 'Nhà cung cấp', dinh_ky_khac: 'Khoản đều đặn khác',
    } as Record<LoaiDinhKy, string>,
    khongCoGiaoDich: 'Chưa có giao dịch ngân hàng nào để dự báo. Kết nối ngân hàng hoặc nhập sao kê trước.',
    itQua: (soNgay: number) => `Mới có ${soNgay} ngày sao kê — cần ít nhất 14 ngày mới dự báo được.`,
    duPhong: (soTuan: number) => `Mới có ${soTuan} tuần sao kê, chưa đủ 8 tuần để thử và chọn mô hình. MIMI tạm dùng trung bình theo thứ trong tuần; khoảng dao động vì thế rộng hơn và kém chắc chắn hơn.`,
    tomTat: (vao: number, ra: number, rong: number, p10: number, p90: number) =>
      `13 tuần tới MIMI ước tiền vào khoảng ${vnd(vao)}, tiền ra khoảng ${vnd(ra)}, chênh lệch khoảng ${vnd(rong)} (8 trên 10 khả năng nằm trong ${vnd(p10)} đến ${vnd(p90)}).`,
    moHinh: (vao: TenMoHinh, ra: TenMoHinh, maseVao: number, maseRa: number, soMoc: number) =>
      `Cách dự báo được chọn bằng cách thử lại trên ${soMoc} mốc trong quá khứ: tiền vào dùng "${LOI_DT.vi.tenMoHinh[vao]}" (sai số tương đối ${maseVao.toFixed(2)}), tiền ra dùng "${LOI_DT.vi.tenMoHinh[ra]}" (${maseRa.toFixed(2)}). Sai số dưới 1 nghĩa là tốt hơn đoán "tuần sau giống tuần này".`,
    tuanRuiRo: (tu: string, den: string, cao: boolean) =>
      cao ? `Tuần ${ngay(tu)}–${ngay(den)}: nhiều khả năng số dư xuống dưới 0.` : `Tuần ${ngay(tu)}–${ngay(den)}: có khả năng (khoảng 1 trên 10) số dư xuống dưới 0.`,
    khongRuiRo: 'Với số dư hiện tại, 9 trên 10 khả năng tài khoản không xuống dưới 0 trong 13 tuần tới.',
    canGiu: (x: number) => x > 0
      ? `Chưa biết số dư hôm nay. Để không âm tiền trong 13 tuần tới (9 trên 10 khả năng), nên có ít nhất ${vnd(x)} trong tài khoản từ bây giờ. Nhập số dư để MIMI chỉ ra tuần nào cần chú ý.`
      : 'Chưa biết số dư hôm nay, nhưng dòng tiền 13 tuần tới dương trong 9 trên 10 khả năng.',
    dinhKy: (ten: string, loai: string, ck: string, tien: number, ke: string) => `${loai}: ${ten} — ${ck}, khoảng ${vnd(tien)}, lần tới khoảng ${ngay(ke)}.`,
    khongDuBaoTaiChinh: (x: number) => `Tiền vay, góp vốn, người nhà chuyển (${vnd(x)} trong lịch sử) không được coi là sẽ lặp lại.`,
    noiBo: (so: number) => `Đã bỏ ${so} khoản chuyển giữa các tài khoản của chính bạn.`,
    luuY: 'Đây là ước tính từ sao kê, không phải cam kết. MIMI không tự đổi phân loại hay doanh thu nào — mọi đề xuất chờ bạn xác nhận.',
  },
  en: {
    tenMoHinh: {
      mua_vu_ngay_thuong: 'repeat the same weekday from last week',
      holt_winters: 'smoothing by trend and weekday (Holt-Winters)',
      hoi_quy_ridge: 'regression on recent weeks, weekday and start/end of month',
      trung_binh_thu: 'average by weekday',
    } as Record<TenMoHinh, string>,
    chuKy: { tuan: 'weekly', hai_tuan: 'every two weeks', thang: 'monthly', quy: 'quarterly' } as Record<ChuKy, string>,
    loaiDinhKy: {
      luong: 'Payroll', mat_bang: 'Rent', tra_no: 'Loan repayment', thue: 'Tax and fees', thue_bao: 'Subscription / service',
      khach_quen: 'Regular customer', nha_cung_cap: 'Supplier', dinh_ky_khac: 'Other regular flow',
    } as Record<LoaiDinhKy, string>,
    khongCoGiaoDich: 'No bank transactions to forecast from yet. Connect a bank or import a statement first.',
    itQua: (soNgay: number) => `Only ${soNgay} days of statements — at least 14 days are needed to forecast.`,
    duPhong: (soTuan: number) => `Only ${soTuan} weeks of statements, fewer than the 8 needed to test and choose a model. MIMI uses a weekday average for now, so the range is wider and less certain.`,
    tomTat: (vao: number, ra: number, rong: number, p10: number, p90: number) =>
      `Over the next 13 weeks MIMI expects about ${vnd(vao)} in, about ${vnd(ra)} out, a net of about ${vnd(rong)} (8 in 10 chance between ${vnd(p10)} and ${vnd(p90)}).`,
    moHinh: (vao: TenMoHinh, ra: TenMoHinh, maseVao: number, maseRa: number, soMoc: number) =>
      `The method was chosen by re-running it on ${soMoc} past dates: money in uses "${LOI_DT.en.tenMoHinh[vao]}" (relative error ${maseVao.toFixed(2)}), money out uses "${LOI_DT.en.tenMoHinh[ra]}" (${maseRa.toFixed(2)}). Below 1 means better than guessing "next week equals this week".`,
    tuanRuiRo: (tu: string, den: string, cao: boolean) =>
      cao ? `Week ${ngay(tu)}–${ngay(den)}: the balance is likely to go below zero.` : `Week ${ngay(tu)}–${ngay(den)}: about a 1 in 10 chance the balance goes below zero.`,
    khongRuiRo: 'With the current balance, there is a 9 in 10 chance the account stays above zero for the next 13 weeks.',
    canGiu: (x: number) => x > 0
      ? `Today's balance is unknown. To stay above zero for 13 weeks (9 in 10 chance), keep at least ${vnd(x)} in the account from now. Enter your balance to see which weeks need attention.`
      : "Today's balance is unknown, but the next 13 weeks of cash flow are positive in 9 out of 10 cases.",
    dinhKy: (ten: string, loai: string, ck: string, tien: number, ke: string) => `${loai}: ${ten} — ${ck}, about ${vnd(tien)}, next around ${ngay(ke)}.`,
    khongDuBaoTaiChinh: (x: number) => `Loans, owner capital and family transfers (${vnd(x)} in the history) are not assumed to repeat.`,
    noiBo: (so: number) => `${so} transfers between your own accounts were left out.`,
    luuY: 'This is an estimate from your statements, not a promise. MIMI never changes a classification or revenue on its own — every suggestion waits for your confirmation.',
  },
} as const;

export { pt as phanTram };
