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

// ── Prompt 4B: hồ sơ việc chuẩn — MỘT danh sách cho Tổng quan, Trợ lý, pet, lịch ─────────────────
import type { KetQuaViecCanLam, ChiTietViec, HoSoViecDong } from '../../supabase/functions/_shared/viec/luu.ts';
export type { KetQuaViecCanLam, ChiTietViec, HoSoViecDong } from '../../supabase/functions/_shared/viec/luu.ts';
export type { ViecCanLam, HanhDongTiep, MucLich, LoaiNgay } from '../../supabase/functions/_shared/viec/dong-co-viec.ts';
export { TEN_LOAI_NGAY, TEN_MUC } from '../../supabase/functions/_shared/viec/dong-co-viec.ts';
export { laDangMo, TEN_LOAI_BANG_CHUNG, TEN_TRANG_THAI_VIEC as TEN_TRANG_THAI_HO_SO, TEN_XAC_MINH } from '../../supabase/functions/_shared/viec/trang-thai.ts';

export const dsViecCanLam = async () => (await goiTroLy('viec_can_lam')) as KetQuaViecCanLam & { duoc_sua: boolean };
export const docChiTietViec = async (id: string) => (await goiTroLy('viec_doc', { id })) as ChiTietViec & { duoc_sua: boolean };
type KetQuaGhi = { hanh_trinh: HanhTrinhDay | null; viec: HoSoViecDong | null };
/** "Tôi đã nộp": ghi là BẠN xác nhận đã nộp (kèm mã hồ sơ nếu có) — chưa phải xác nhận của cơ quan. */
export const ghiDaNopViec = async (id: string, maHoSo?: string) => (await goiTroLy('viec_da_nop', { id, ma_ho_so: maHoSo })) as KetQuaGhi;
/** Ghi phản hồi của cơ quan (số thông báo, biên nhận) — mức "theo xác nhận của bạn". */
export const ghiPhanHoiViec = async (id: string, noiDung: string) => (await goiTroLy('viec_phan_hoi', { id, noi_dung: noiDung })) as KetQuaGhi;
export const huyViec = async (id: string) => (await goiTroLy('viec_huy', { id })) as { viec: HoSoViecDong | null };

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

// ── Prompt 5: nộp có kiểm soát (kênh: người dùng tự nộp, MIMI theo dõi) ─────────────────────────
export type { YeuCauNop } from '../../supabase/functions/_shared/thuc-thi/luu.ts';
import type { YeuCauNop } from '../../supabase/functions/_shared/thuc-thi/luu.ts';

export const dsNop = async () => (await goiTroLy('nop_ds')) as { yeu_cau: YeuCauNop[]; vai_tro: string };
export const chuanBiNop = async (tai_lieu_id: string) => ((await goiTroLy('nop_chuan_bi', { tai_lieu_id })) as { yeu_cau: YeuCauNop }).yeu_cau;
export const xacNhanNop = async (id: string) => ((await goiTroLy('nop_xac_nhan', { id, xac_nhan: true })) as { yeu_cau: YeuCauNop }).yeu_cau;
export const ghiDaNop = async (id: string, bien_nhan: string, ngay_nop: string) => ((await goiTroLy('nop_da_nop', { id, bien_nhan, ngay_nop })) as { yeu_cau: YeuCauNop }).yeu_cau;
export const ghiKetQuaNop = async (id: string, ket_qua: 'accepted' | 'rejected', thong_bao: string) => ((await goiTroLy('nop_ket_qua', { id, ket_qua, thong_bao })) as { yeu_cau: YeuCauNop }).yeu_cau;
export const huyNop = async (id: string) => ((await goiTroLy('nop_huy', { id })) as { yeu_cau: YeuCauNop }).yeu_cau;

export const TEN_TRANG_THAI_NOP: Record<string, string> = {
  draft: 'Nháp', needs_validation: 'Cần kiểm lại', needs_confirmation: 'Chờ xác nhận', ready: 'Đã xác nhận — chờ bạn nộp',
  submitting: 'Đang ghi', submitted: 'Đã nộp', waiting_external: 'Chờ cơ quan thuế', accepted: 'Được chấp nhận',
  rejected: 'Không được chấp nhận', failed: 'Lỗi', cancelled: 'Đã huỷ', resolved: 'Xong',
};

/** Thứ tự hiện, như trung tâm hoạt động (mục 31): việc cần bạn trước. */
export const THU_TU_NOP = ['needs_confirmation', 'needs_validation', 'ready', 'waiting_external', 'submitted', 'rejected', 'failed', 'accepted', 'resolved', 'cancelled'];

export const XEM_TRUOC_NHAN: [string, string][] = [
  ['se_xay_ra', 'Điều gì sẽ xảy ra'], ['nguoi_nhan', 'Ai nhận'], ['tai_lieu', 'Tài liệu nộp'], ['du_lieu_chia_se', 'Dữ liệu chia sẻ'],
  ['khong_hoan_tac', 'Không hoàn tác được'], ['ket_qua_mong_doi', 'Kết quả mong đợi'], ['rui_ro', 'Rủi ro đã biết'],
];
