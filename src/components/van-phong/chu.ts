/**
 * Chữ của trang Văn phòng kế toán, tiếng Việt và tiếng Anh. Viết cho kế toán: lời thường, không mã, không giờ UTC.
 * Giữ riêng ở đây (không thêm vào bộ dịch chung) để trang tự đủ và không đụng tệp dịch dùng chung.
 */
import type { KhachVanPhong, LyDo, MucKhach, TenAgentVP } from '@/lib/goiVanPhong';

export type NgonNgu = 'vi' | 'en';
export const ngonNguTu = (lng: string | undefined): NgonNgu => (lng?.toLowerCase().startsWith('en') ? 'en' : 'vi');

export interface MauAgent { ten: Record<NgonNgu, string>; viec: Record<NgonNgu, string>; mau: string }

/** Năm agent của MIMI — màu cố định ở mọi chế độ xem. */
export const AGENT: Record<TenAgentVP, MauAgent> = {
  phan_loai: { ten: { vi: 'Mèo Phân loại', en: 'Sorting Cat' }, viec: { vi: 'xếp tiền vào: doanh thu hay không', en: 'sorts incoming money: sales or not' }, mau: '#f59e0b' },
  thue: { ten: { vi: 'Mèo Thuế', en: 'Tax Cat' }, viec: { vi: 'lo hạn khai và tờ khai', en: 'watches filing deadlines and returns' }, mau: '#6366f1' },
  du_bao: { ten: { vi: 'Mèo Dòng tiền', en: 'Cash-flow Cat' }, viec: { vi: 'canh tiền ra nhiều hơn tiền vào', en: 'watches when more money goes out than comes in' }, mau: '#0ea5e9' },
  ban_hang: { ten: { vi: 'Mèo Bán hàng', en: 'Sales Cat' }, viec: { vi: 'ghi các lần bán tại quầy', en: 'records counter sales' }, mau: '#10b981' },
  tai_lieu: { ten: { vi: 'Mèo Hồ sơ', en: 'Paperwork Cat' }, viec: { vi: 'theo hồ sơ việc còn mở', en: 'follows open case files' }, mau: '#ec4899' },
};

export const MAU_DEN: Record<MucKhach, string> = { do: '#ef4444', vang: '#f59e0b', xanh: '#22c55e' };

const C = {
  vi: {
    tieuDe: 'Văn phòng kế toán',
    moTa: 'Mỗi bàn là một khách. Đèn đỏ: hạn gần hoặc doanh thu sát ngưỡng — làm trước. Đèn vàng: có việc cần xem. Đèn xanh: ổn.',
    che3d: 'Văn phòng 3D', cheLuoi: 'Lưới bàn', cheDs: 'Danh sách',
    dangTai: 'Đang mở văn phòng…', taiLai: 'Tải lại', loi: 'Chưa mở được văn phòng.',
    rong: 'Bạn chưa làm sổ cho khách nào. Khi chủ một công ty thêm bạn với vai Kế toán, khách đó hiện ở đây.',
    den: { do: 'Cần làm ngay', vang: 'Cần xem', xanh: 'Ổn' } as Record<MucKhach, string>,
    khongWebgl: 'Máy này không vẽ được 3D nên văn phòng hiện dạng lưới — số liệu vẫn y như vậy.',
    giamChuyenDong: 'Bạn đã bật giảm chuyển động nên văn phòng hiện dạng lưới. Bấm "Văn phòng 3D" nếu vẫn muốn xem.',
    trang: (a: number, b: number) => `Trang ${a}/${b}`, truoc: 'Trang trước', sau: 'Trang sau',
    loaiTruCoSo: (n: number) => `${n} khách không hiện vì bạn chỉ phụ trách một cơ sở của họ — số cả công ty không thuộc phạm vi của bạn.`,
    vuotTran: (n: number) => `Còn ${n} khách chưa tính lần này (mỗi lần tính tối đa 100 khách, theo tên).`,
    agentDangO: 'đang làm ở', agentNghi: 'đang nghỉ — chưa có việc', agentChoViec: 'đến xem việc đang chờ', agentMoi: 'vừa làm',
    agentTrangKhac: '(ở trang khác)',
    doanhThu: 'Doanh thu năm nay', khoang: (a: string, b: string) => `từ ${a} đến ${b}`,
    choXacNhan: 'Tiền vào chờ chủ xác nhận', khoan: (n: number) => `${n} khoản`,
    thue: 'Khai thuế', hanKeTiep: 'Hạn kế tiếp', conNgay: (n: number) => (n === 0 ? 'hôm nay' : `còn ${n} ngày`),
    viecMo: 'Hồ sơ việc còn mở', banHomNay: 'Bán tại quầy hôm nay', chuaCoPos: 'chưa dùng bán tại quầy',
    dongTien: 'Dòng tiền 30 ngày', vao: 'vào', ra: 'ra',
    hoatDong: 'MIMI làm gì trong 24 giờ qua', khongHoatDong: 'Chưa có việc mới trong 24 giờ.',
    moKhach: 'Mở sổ khách này', xemTienVao: 'Xem tiền vào chờ xác nhận', soanToKhai: 'Soạn tờ khai',
    dong: 'Đóng', vaiTro: { chu_so_huu: 'Chủ', quan_tri: 'Quản trị', ke_toan: 'Kế toán', nguoi_duyet: 'Người duyệt', nguoi_xem: 'Người xem' } as Record<string, string>,
    khongDocDuoc: 'Chưa đọc được số của khách này lúc này.',
    sanSang: {
      san_sang: 'Đủ để khai', bi_chan: 'Đang bị chặn', thieu_du_lieu: 'Còn thiếu số liệu', can_xac_minh: 'Cần trả lời vài câu', khong_co_viec: 'Chưa có kỳ phải khai',
    } as Record<string, string>,
    cot: { khach: 'Khách', den: 'Tình trạng', viec: 'Việc cần làm', han: 'Hạn kế tiếp', doanhThu: 'Doanh thu (ước)' },
    demo: 'minh hoạ',
    phut: (n: number) => (n < 1 ? 'vừa xong' : n < 60 ? `${n} phút trước` : `${Math.floor(n / 60)} giờ trước`),
    khachSo: (n: number) => `${n} khách`,
    banGhi: (n: number, t: string) => `${n} lần · ${t}`,
  },
  en: {
    tieuDe: 'Accounting office',
    moTa: 'Each desk is a client. Red: a deadline is close or sales are near a tax threshold — do these first. Amber: something to review. Green: all good.',
    che3d: '3D office', cheLuoi: 'Desk grid', cheDs: 'List',
    dangTai: 'Opening the office…', taiLai: 'Reload', loi: 'Could not open the office.',
    rong: 'You do not keep the books for any client yet. When an owner adds you as Accountant, that client appears here.',
    den: { do: 'Act now', vang: 'Review', xanh: 'OK' } as Record<MucKhach, string>,
    khongWebgl: 'This device cannot draw 3D, so the office is shown as a grid — the numbers are the same.',
    giamChuyenDong: 'Reduced motion is on, so the office is shown as a grid. Press "3D office" if you still want it.',
    trang: (a: number, b: number) => `Page ${a} of ${b}`, truoc: 'Previous page', sau: 'Next page',
    loaiTruCoSo: (n: number) => `${n} clients are hidden because you only handle one of their branches — company-wide numbers are outside your access.`,
    vuotTran: (n: number) => `${n} more clients were not included this time (up to 100 clients per load, by name).`,
    agentDangO: 'working at', agentNghi: 'resting — nothing to do', agentChoViec: 'checking waiting work at', agentMoi: 'just worked',
    agentTrangKhac: '(on another page)',
    doanhThu: 'Sales this year', khoang: (a: string, b: string) => `between ${a} and ${b}`,
    choXacNhan: 'Incoming money waiting for the owner', khoan: (n: number) => `${n} item${n === 1 ? '' : 's'}`,
    thue: 'Tax filing', hanKeTiep: 'Next deadline', conNgay: (n: number) => (n === 0 ? 'today' : `${n} day${n === 1 ? '' : 's'} left`),
    viecMo: 'Open case files', banHomNay: 'Counter sales today', chuaCoPos: 'counter sales not in use',
    dongTien: 'Cash flow, 30 days', vao: 'in', ra: 'out',
    hoatDong: 'What MIMI did in the last 24 hours', khongHoatDong: 'Nothing new in the last 24 hours.',
    moKhach: 'Open this client', xemTienVao: 'Review incoming money', soanToKhai: 'Draft tax return',
    dong: 'Close', vaiTro: { chu_so_huu: 'Owner', quan_tri: 'Admin', ke_toan: 'Accountant', nguoi_duyet: 'Approver', nguoi_xem: 'Viewer' } as Record<string, string>,
    khongDocDuoc: 'Could not read this client’s numbers right now.',
    sanSang: {
      san_sang: 'Ready to file', bi_chan: 'Blocked', thieu_du_lieu: 'Missing numbers', can_xac_minh: 'A few questions to answer', khong_co_viec: 'Nothing to file yet',
    } as Record<string, string>,
    cot: { khach: 'Client', den: 'Status', viec: 'To do', han: 'Next deadline', doanhThu: 'Sales (est.)' },
    demo: 'sample',
    phut: (n: number) => (n < 1 ? 'just now' : n < 60 ? `${n} min ago` : `${Math.floor(n / 60)} h ago`),
    khachSo: (n: number) => `${n} client${n === 1 ? '' : 's'}`,
    banGhi: (n: number, t: string) => `${n} sale${n === 1 ? '' : 's'} · ${t}`,
  },
};
export type Chu = typeof C.vi;
export const chu = (n: NgonNgu): Chu => C[n] as Chu;

/** Tiền gọn cho kế toán: 1,05 tỷ · 950 triệu · 45.000 ₫ / VND 1.05bn. */
export function tienGon(v: number, n: NgonNgu): string {
  const a = Math.abs(v), dau = v < 0 ? '−' : '';
  if (n === 'en') {
    if (a >= 1e9) return `${dau}VND ${(a / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 })}bn`;
    if (a >= 1e6) return `${dau}VND ${(a / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1 })}m`;
    return `${dau}VND ${Math.round(a).toLocaleString('en-US')}`;
  }
  if (a >= 1e9) return `${dau}${(a / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (a >= 1e6) return `${dau}${(a / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
  return `${dau}${Math.round(a).toLocaleString('vi-VN')} ₫`;
}

/** Ngày lịch "YYYY-MM-DD" → 15/11/2026 hoặc 15 Nov 2026 (không đổi múi giờ: đó đã là ngày Việt Nam). */
export function ngayGon(ymd: string | null | undefined, n: NgonNgu): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}/.test(ymd)) return '—';
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  if (n === 'en') return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/** Mốc thời gian máy chủ → "3 giờ trước" theo đồng hồ máy người xem. */
export function luc(iso: string | null | undefined, n: NgonNgu, bayGio = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '—';
  return chu(n).phut(Math.max(0, Math.floor((bayGio - t) / 60_000)));
}

/** Một lý do thành câu thường. */
export function cauLyDo(l: LyDo, n: NgonNgu): string {
  const ty = (v?: number) => (v ? tienGon(v, n) : '');
  if (n === 'en') {
    switch (l.ma) {
      case 'khong_doc_duoc': return 'Numbers could not be read right now';
      case 'han_gan_chua_san_sang': return `Deadline ${ngayGon(l.ngay, n)} (${chu(n).conNgay(l.so ?? 0)}) and not ready to file`;
      case 'viec_chan': return `${l.so} case file${l.so === 1 ? '' : 's'} blocking the work`;
      case 'nguong_chua_chac': return `Sales may be above or below ${ty(l.nguong)} — confirm incoming money before deciding`;
      case 'to_khai_bi_chan': return 'Tax return is blocked';
      case 'tien_vao_cho_xac_nhan': return `${l.so} incoming payment${l.so === 1 ? '' : 's'} waiting for the owner to confirm`;
      case 'han_trong_30_ngay': return `Next deadline ${ngayGon(l.ngay, n)} (${chu(n).conNgay(l.so ?? 0)})`;
      case 'viec_mo': return `${l.so} open case file${l.so === 1 ? '' : 's'}`;
      case 'dong_tien_am_30_ngay': return `${ty(l.so)} more went out than came in over 30 days`;
      case 'to_khai_thieu_du_lieu': return 'Tax return is missing numbers';
      case 'can_xac_minh_nghia_vu': return 'A few questions decide what must be filed';
      case 'da_vuot_nguong': return `Sales are above ${ty(l.nguong)} this year`;
    }
  }
  switch (l.ma) {
    case 'khong_doc_duoc': return 'Chưa đọc được số liệu lúc này';
    case 'han_gan_chua_san_sang': return `Hạn ${ngayGon(l.ngay, n)} (${chu(n).conNgay(l.so ?? 0)}) mà chưa đủ để khai`;
    case 'viec_chan': return `${l.so} hồ sơ việc đang chặn`;
    case 'nguong_chua_chac': return `Doanh thu có thể trên hoặc dưới ${ty(l.nguong)} — cần xác nhận tiền vào trước khi kết luận`;
    case 'to_khai_bi_chan': return 'Tờ khai đang bị chặn';
    case 'tien_vao_cho_xac_nhan': return `${l.so} khoản tiền vào chờ chủ xác nhận`;
    case 'han_trong_30_ngay': return `Hạn kế tiếp ${ngayGon(l.ngay, n)} (${chu(n).conNgay(l.so ?? 0)})`;
    case 'viec_mo': return `${l.so} hồ sơ việc còn mở`;
    case 'dong_tien_am_30_ngay': return `30 ngày qua tiền ra nhiều hơn tiền vào ${ty(l.so)}`;
    case 'to_khai_thieu_du_lieu': return 'Tờ khai còn thiếu số liệu';
    case 'can_xac_minh_nghia_vu': return 'Cần trả lời vài câu để biết phải khai gì';
    case 'da_vuot_nguong': return `Doanh thu năm nay đã trên ${ty(l.nguong)}`;
  }
  return '';
}

/** Câu ngắn nhất cho bàn: lý do nặng nhất, hoặc "Ổn". */
export const cauNgan = (k: KhachVanPhong, n: NgonNgu) => (k.ly_do[0] && k.ly_do[0].muc !== 'xanh' ? cauLyDo(k.ly_do[0], n) : chu(n).den.xanh);
