import { goiTroLy } from '@/lib/goiTroLy';
import type { HanhTrinhDay } from '../../supabase/functions/_shared/hanh-trinh/luu.ts';
export type { HanhTrinhDay } from '../../supabase/functions/_shared/hanh-trinh/luu.ts';
export type { Buoc, CauHoi } from '../../supabase/functions/_shared/hanh-trinh/dong-co.ts';
export { LOAI_HANH_TRINH, MAU_HANH_TRINH, type LoaiHanhTrinh } from '../../supabase/functions/_shared/hanh-trinh/mau.ts';

/**
 * Việc cần làm (hồ sơ việc + hành trình) — mọi lời gọi đi qua edge function `tro-ly`, nơi kiểm vai trò
 * và ghi dấu vết. Trình duyệt không ghi thẳng bảng nào (RLS chỉ cho đọc).
 */
export interface HoSoViec {
  id: string; loai: string; tieu_de: string; trang_thai: string; muc_do: string;
  tao_luc: string; cap_nhat_luc: string; giai_quyet_luc: string | null; ket_qua: string | null;
}
export interface TaiLieuTom {
  id: string; loai: string; tieu_de: string; mo_ta?: string; nhan?: string; trang_thai: string; do_day: string | null;
  ky?: string | null; phien_ban_hien_tai?: number; tao_luc: string; cap_nhat_luc?: string;
}

export const dsViec = async () =>
  (await goiTroLy('hanh_trinh_ds')) as { hanh_trinh: HanhTrinhDay[]; ho_so_viec: HoSoViec[]; duoc_sua: boolean };
export const docViec = async (id: string) =>
  (await goiTroLy('hanh_trinh_doc', { id })) as { hanh_trinh: HanhTrinhDay; tai_lieu: TaiLieuTom[]; duoc_sua: boolean };
export const moViec = async (loai: string) =>
  ((await goiTroLy('hanh_trinh_mo', { loai })) as { hanh_trinh: HanhTrinhDay }).hanh_trinh;
export const traLoiViec = async (id: string, khoa: string, gia_tri: string) =>
  ((await goiTroLy('hanh_trinh_tra_loi', { id, khoa, gia_tri })) as { hanh_trinh: HanhTrinhDay }).hanh_trinh;
export const danhDauBuoc = async (id: string, khoa: string, trang_thai: string, ket_qua?: string) =>
  ((await goiTroLy('hanh_trinh_danh_dau', { id, khoa, trang_thai, ket_qua })) as { hanh_trinh: HanhTrinhDay }).hanh_trinh;
export const soanBuoc = async (id: string, khoa: string) =>
  (await goiTroLy('hanh_trinh_soan', { id, khoa })) as { tai_lieu: TaiLieuTom; hanh_trinh: HanhTrinhDay };

export const dsTaiLieu = async () => (await goiTroLy('tai_lieu_ds')) as { tai_lieu: TaiLieuTom[]; vai_tro: string };
export const moTaiLieu = async (id: string) => (await goiTroLy('tai_lieu_mo', { id })) as { url: string; so: number; ma_bam: string };
export const duyetTaiLieu = async (id: string, ket_qua: string, nhan_xet?: string, xac_nhan?: boolean) =>
  ((await goiTroLy('tai_lieu_duyet', { id, ket_qua, nhan_xet, xac_nhan })) as { tai_lieu: TaiLieuTom }).tai_lieu;
export const daNopTaiLieu = async (id: string) =>
  ((await goiTroLy('tai_lieu_da_nop', { id, xac_nhan: true })) as { tai_lieu: TaiLieuTom }).tai_lieu;

export const TEN_TRANG_THAI_BUOC: Record<string, string> = {
  not_started: 'Chưa bắt đầu', blocked: 'Chờ dữ kiện', ready: 'Làm được ngay', in_progress: 'Đang làm',
  waiting_external: 'Chờ cơ quan / bên ngoài', completed: 'Xong', skipped: 'Không áp dụng',
};
export const TEN_TRANG_THAI_VIEC: Record<string, string> = {
  dang_mo: 'Đang làm', bi_chan: 'Chờ dữ kiện', cho_ben_ngoai: 'Chờ kết quả', hoan_tat: 'Xong', da_huy: 'Đã huỷ',
  mo: 'Mới mở', dang_xu_ly: 'Đang xử lý', da_giai_quyet: 'Đã giải quyết',
};
export const TEN_TRANG_THAI_TAI_LIEU: Record<string, string> = {
  generated: 'MIMI vừa soạn', edited: 'Đã sửa', needs_review: 'Cần xem lại', reviewed: 'Đã xem', approved: 'Đã duyệt',
  rejected: 'Không duyệt', signed: 'Đã ký', submitted: 'Đã nộp', accepted: 'Được chấp nhận',
};
export const TEN_DO_DAY: Record<string, string> = { COMPLETE: 'Đủ', INCOMPLETE: 'Còn thiếu', NEEDS_REVIEW: 'Cần xem lại' };
export const TEN_LOAI_TAI_LIEU: Record<string, string> = {
  financial_review_memo: 'Báo cáo phân tích', tax_readiness_pack: 'Gói sẵn sàng khai thuế', audit_pack: 'Gói bằng chứng',
  explanation_letter: 'Công văn giải trình', reconciliation_report: 'Báo cáo đối soát', other: 'Khác',
};

/** Tỷ lệ bước đã xong (bước không áp dụng tính là xong). */
export const tienDo = (h: HanhTrinhDay) => {
  const xong = h.buoc.filter((b) => b.trang_thai === 'completed' || b.trang_thai === 'skipped').length;
  return { xong, tong: h.buoc.length };
};

/** Câu hỏi gửi trợ lý để tra thủ tục của một bước — dạng câu hỏi thông tin, không mở việc mới. */
export const cauTraThuTuc = (tieuDe: string) => `${tieuDe} cần hồ sơ gì?`;
