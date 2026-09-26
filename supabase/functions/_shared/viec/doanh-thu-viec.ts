/**
 * Doanh thu chưa rõ nhóm hoạt động → MỘT hồ sơ việc chặn tờ khai (Prompt 4B mục 11, 26/09/2026). Hàm thuần.
 *
 * Nguồn: bộ chia doanh thu theo nhóm hoạt động (`doanh-thu/theo-hoat-dong.ts`) của ĐÚNG nguồn đang dùng để
 * khai, và lịch thuế của công ty (`luat/lich-thue.ts`). Không tính lại doanh thu ở đây.
 *
 * Chỉ hộ kinh doanh: tờ khai của hộ (01/CNKD, mẫu khai năm) có mỗi nhóm hoạt động một dòng và một tỷ lệ
 * riêng — phần chưa rõ nhóm chặn tờ khai (`luat/to-khai.ts`, CHUA_RO_HOAT_DONG). Doanh nghiệp khai GTGT
 * theo hoá đơn; MIMI không dùng nhóm hoạt động để chặn tờ khai của doanh nghiệp.
 *
 * Danh tính: `phan_loai_hoat_dong:<năm>` — một việc cho một năm, dù chưa rõ bao nhiêu khoản, dù tiền về
 * thêm. Số tiền thay đổi thì TIÊU ĐỀ cập nhật, không mở việc mới.
 */
import type { MocThue } from '../luat/lich-thue.ts';
import { congNgay } from './dong-co-viec.ts';

export const LOAI_VIEC_PHAN_LOAI = 'phan_loai_hoat_dong';
export const dauVanTayPhanLoai = (nam: number) => `${LOAI_VIEC_PHAN_LOAI}:${nam}`;

/** 101983000 → "101.983.000đ" (cách viết tiền quen thuộc, không phụ thuộc bản ICU của máy chủ). */
export const tienGon = (n: number): string => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;

/** Mốc cần doanh thu theo nhóm hoạt động: khai và nộp, thông báo doanh thu, quyết toán. */
const MOC_CAN_NHOM: ReadonlyArray<MocThue['loai']> = ['khai_va_nop', 'thong_bao_doanh_thu', 'quyet_toan', 'khai_thue'];

export interface ViecPhanLoaiMongMuon {
  dau_van_tay: string;
  loai: typeof LOAI_VIEC_PHAN_LOAI;
  ky: string;
  tieu_de: string;
  so_tien: number;
  so_khoan: number;
  han_luat: string | null;
  han_luat_nguon: string | null;
  ngay_nen_lam: string | null;
  ngay_nen_lam_ly_do: string | null;
}

/**
 * Việc phân loại cần có (hoặc `null` nếu không cần). `chuaRo`: phần doanh thu năm `nam` chưa ai xác nhận
 * nhóm hoạt động. Hạn luật = mốc khai kế tiếp cần nhóm hoạt động (từ lịch thuế đã đối chiếu).
 */
export function viecPhanLoaiDoanhThu(o: {
  nam: number;
  laHoKinhDoanh: boolean;
  chuaRo: { so_tien: number; so_khoan: number } | null;
  lich: readonly MocThue[];
  homNay: string;
}): ViecPhanLoaiMongMuon | null {
  if (!o.laHoKinhDoanh || !o.chuaRo || o.chuaRo.so_tien <= 0) return null;
  const moc = o.lich.find((m) => MOC_CAN_NHOM.includes(m.loai) && m.trang_thai === 'phai_lam' && !!m.han && m.han >= o.homNay) ?? null;
  const han = moc?.han ?? null;
  const nenLam = han ? congNgay(han, -7) : null;
  return {
    dau_van_tay: dauVanTayPhanLoai(o.nam),
    loai: LOAI_VIEC_PHAN_LOAI,
    ky: String(o.nam),
    tieu_de: `Phân loại ${tienGon(o.chuaRo.so_tien)} doanh thu trước khi hoàn tất tờ khai`,
    so_tien: o.chuaRo.so_tien,
    so_khoan: o.chuaRo.so_khoan,
    han_luat: han,
    han_luat_nguon: moc ? `${moc.ten} — lịch thuế của công ty (hệ luật MIMI đã đối chiếu)` : null,
    ngay_nen_lam: nenLam && nenLam >= o.homNay ? nenLam : null,
    ngay_nen_lam_ly_do: nenLam && nenLam >= o.homNay ? 'MIMI khuyên phân loại xong trước hạn một tuần để kịp kiểm tờ khai' : null,
  };
}

/** Câu bằng chứng khi hệ thống tính lại và thấy không còn phần chưa rõ — nói rõ MIMI kiểm trên dữ liệu gì. */
export const cauDaPhanLoaiHet = (nam: number, tongDoanhThu: number) =>
  `MIMI tính lại doanh thu năm ${nam} (${tienGon(tongDoanhThu)}) theo nhóm hoạt động: không còn khoản nào chưa rõ nhóm. Kiểm trên dữ liệu của bạn trong MIMI, không phải xác nhận của cơ quan thuế.`;
