/**
 * SẴN SÀNG KHAI THUẾ — một đối tượng cho Tổng quan, Nhắc thuế, trợ lý, lịch và Tờ khai (Prompt 4 mục 14).
 *
 * Hàm thuần, dựng từ lịch thuế (`lich-thue.ts`) và số liệu doanh thu một nguồn (`doanh-thu/so-lieu.ts`).
 * Không tự suy thêm nghĩa vụ nào: mọi mốc lấy từ lịch; ở đây chỉ trả lời "đã đủ để khai chưa, thiếu gì".
 */
import { mocKeTiep, type MocThue } from './lich-thue.ts';

export type TrangThaiSanSang = 'san_sang' | 'bi_chan' | 'thieu_du_lieu' | 'can_xac_minh' | 'khong_co_viec';

export interface SanSangThue {
  ky: string | null;
  loai_nghia_vu: MocThue['loai'] | null;
  ten_viec: string | null;
  trang_thai: TrangThaiSanSang;
  han: string | null;
  con_lai: number | null;
  /** Doanh thu năm nay đã biết (ước tính từ tiền vào, trừ khoản đã xác nhận không phải doanh thu). */
  doanh_thu_biet: number;
  doanh_thu_da_phan_loai: number;
  doanh_thu_chua_phan_loai: number;
  so_khoan_chua_phan_loai: number;
  giay_to_can: string[];
  giay_to_thieu: string[];
  /** Điều CHẶN tờ khai (vd. doanh thu chưa rõ nhóm hoạt động) — khác "thiếu giấy tờ". */
  chan: string[];
  du_kien_thieu: string[];
  viec_tiep: string[];
  do_tin_cay: 'cao' | 'trung_binh' | 'thap';
  nguon: string[];
}

export interface SoLieuSanSang {
  uoc_tinh: number;
  da_xac_nhan: number;
  chua_ro: number;
  so_chua_ro: number;
  co_ket_noi_ngan_hang: boolean;
  so_giao_dich: number;
}

const GIAY_TO: Partial<Record<MocThue['loai'], string[]>> = {
  khai_va_nop: ['Sao kê ngân hàng của kỳ', 'Hoá đơn bán ra của kỳ', 'Phân loại tiền vào (doanh thu / không phải doanh thu)'],
  tam_nop: ['Sao kê ngân hàng của quý', 'Hoá đơn bán ra và đầu vào của quý'],
  thong_bao_doanh_thu: ['Sao kê ngân hàng của kỳ', 'Phân loại tiền vào (doanh thu / không phải doanh thu)'],
  quyet_toan: ['Sổ doanh thu, chi phí cả năm', 'Hoá đơn đầu vào cả năm'],
};

/** Doanh thu chưa rõ nhóm hoạt động (chỉ hộ kinh doanh: mỗi nhóm một dòng, một tỷ lệ trên tờ khai). */
export interface HoatDongChuaRo { so_tien: number; so_khoan: number }

const tienGon = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

export function sanSangThue(lich: MocThue[], s: SoLieuSanSang, hoatDongChuaRo: HoatDongChuaRo | null = null): SanSangThue {
  const moc = mocKeTiep(lich);
  const giay_to_can = moc ? GIAY_TO[moc.loai] ?? [] : [];
  const giay_to_thieu: string[] = [];
  if (giay_to_can.some((g) => g.startsWith('Sao kê')) && !s.co_ket_noi_ngan_hang && s.so_giao_dich === 0) giay_to_thieu.push('Sao kê ngân hàng: chưa kết nối ngân hàng, chưa nhập file sao kê');
  if (giay_to_can.some((g) => g.startsWith('Phân loại')) && s.so_chua_ro > 0) giay_to_thieu.push(`Phân loại tiền vào: còn ${s.so_chua_ro} khoản chưa xác nhận`);
  const du_kien_thieu = [...new Set(lich.filter((m) => m.trang_thai === 'can_xac_minh' && m.cau_hoi).map((m) => m.cau_hoi as string))];

  const chan: string[] = [];
  if (moc && hoatDongChuaRo && hoatDongChuaRo.so_tien > 0) {
    chan.push(`${tienGon(hoatDongChuaRo.so_tien)} doanh thu chưa xác định nhóm hoạt động${hoatDongChuaRo.so_khoan ? ` (${hoatDongChuaRo.so_khoan} khoản)` : ''}`);
  }
  const viec_tiep: string[] = [];
  if (chan.length) viec_tiep.push(`Phân loại ${tienGon(hoatDongChuaRo!.so_tien)} doanh thu trước khi hoàn tất tờ khai`);
  if (moc?.cau_hoi) viec_tiep.push(`Trả lời: ${moc.cau_hoi}`);
  if (s.so_chua_ro > 0) viec_tiep.push(`Xác nhận ${s.so_chua_ro} khoản tiền vào chưa rõ`);
  if (giay_to_thieu.some((g) => g.startsWith('Sao kê'))) viec_tiep.push('Kết nối ngân hàng hoặc nhập file sao kê');
  if (moc && !viec_tiep.length) viec_tiep.push('Mở Tờ khai thuế, kiểm bản nháp rồi xác nhận trước khi nộp');

  const trang_thai: TrangThaiSanSang = !moc ? 'khong_co_viec'
    : chan.length ? 'bi_chan'
    : moc.trang_thai === 'can_xac_minh' ? 'can_xac_minh'
      : giay_to_thieu.length ? 'thieu_du_lieu' : 'san_sang';
  const tong = s.da_xac_nhan + s.chua_ro;
  const do_tin_cay = !s.so_giao_dich ? 'thap' : tong > 0 && s.chua_ro / tong <= 0.1 ? 'cao' : 'trung_binh';

  return {
    ky: moc?.khoa ?? null, loai_nghia_vu: moc?.loai ?? null, ten_viec: moc?.ten ?? null, trang_thai,
    han: moc?.han ?? null, con_lai: moc?.con_lai ?? null,
    doanh_thu_biet: s.uoc_tinh, doanh_thu_da_phan_loai: s.da_xac_nhan, doanh_thu_chua_phan_loai: s.chua_ro,
    so_khoan_chua_phan_loai: s.so_chua_ro, giay_to_can, giay_to_thieu, chan, du_kien_thieu, viec_tiep, do_tin_cay,
    nguon: ['Lịch thuế của công ty (hệ luật MIMI, NĐ 252/2026)', 'Tiền vào ngân hàng đã kết nối, đã bỏ dữ liệu thử', 'Phân loại tiền vào người dùng đã xác nhận'],
  };
}
