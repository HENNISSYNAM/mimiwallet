/**
 * Trạng thái của MỘT hồ sơ việc (Prompt 4B, 26/09/2026) — nguồn sự thật duy nhất mà Tổng quan, Trợ lý,
 * Pet và Lịch cùng đọc. Hàm thuần; CSDL giữ đúng các quy tắc này bằng trigger `ho_so_viec_kiem_chuyen`
 * (migration 20260926120000) — ở đây kiểm sớm để báo lỗi bằng lời thường và để test không cần CSDL.
 *
 * "BẠN NÓI ĐÃ XONG" ≠ "MIMI XÁC MINH ĐÃ XONG". Hai trạng thái giải quyết riêng; bằng chứng do người dùng
 * đưa không bao giờ là `system_verified`.
 */

export const TRANG_THAI_VIEC = [
  'needs_information', 'ready_to_act', 'in_progress', 'waiting_external', 'needs_review',
  'resolved_user_confirmed', 'resolved_system_verified', 'cancelled',
] as const;
export type TrangThaiViec = (typeof TRANG_THAI_VIEC)[number];

export const DANG_MO: readonly TrangThaiViec[] = ['needs_information', 'ready_to_act', 'in_progress', 'waiting_external', 'needs_review'];
export const laDangMo = (t: string): boolean => (DANG_MO as readonly string[]).includes(t);
export const laDaGiaiQuyet = (t: string): boolean => t === 'resolved_user_confirmed' || t === 'resolved_system_verified';

export const TEN_TRANG_THAI_VIEC: Record<TrangThaiViec, string> = {
  needs_information: 'Cần thêm thông tin',
  ready_to_act: 'Sẵn sàng làm',
  in_progress: 'Đang làm',
  waiting_external: 'Đang chờ phản hồi bên ngoài',
  needs_review: 'Cần xem lại',
  resolved_user_confirmed: 'Đã xong — theo xác nhận của bạn',
  resolved_system_verified: 'Đã xong — MIMI đã kiểm trên dữ liệu',
  cancelled: 'Đã huỷ',
};

// ── Bằng chứng ───────────────────────────────────────────────────────────────────────────────────
export const LOAI_BANG_CHUNG = [
  'user_confirmation', 'uploaded_document', 'reference_number', 'official_response', 'transaction_reference', 'system_verified_event',
] as const;
export type LoaiBangChung = (typeof LOAI_BANG_CHUNG)[number];
export type XacMinh = 'unverified' | 'user_confirmed' | 'system_verified' | 'needs_review';
export type NguonBangChung = 'nguoi_dung' | 'mimi_he_thong';

export interface BangChung {
  loai: LoaiBangChung;
  nguon: NguonBangChung;
  gia_tri: string | null;
  trang_thai_xac_minh: XacMinh;
  khoa_trung: string;
  tai_lieu_id?: string | null;
  tao_luc: string;
}

export const TEN_LOAI_BANG_CHUNG: Record<LoaiBangChung, string> = {
  user_confirmation: 'Bạn xác nhận',
  uploaded_document: 'Tài liệu tải lên',
  reference_number: 'Mã hồ sơ / số biên nhận',
  official_response: 'Phản hồi của cơ quan',
  transaction_reference: 'Giao dịch đối chiếu',
  system_verified_event: 'MIMI kiểm trên dữ liệu',
};

/** Nhãn độ chắc chắn — hiện cạnh mọi bằng chứng; KHÔNG gọi "bạn xác nhận" là "đã xác minh". */
export const TEN_XAC_MINH: Record<XacMinh, string> = {
  unverified: 'Chưa xác minh',
  user_confirmed: 'Theo xác nhận của bạn — MIMI chưa kiểm được',
  system_verified: 'MIMI đã kiểm trên dữ liệu',
  needs_review: 'Cần xem lại',
};

/** Kiểm một bằng chứng trước khi ghi — cùng quy tắc với CHECK của bảng `bang_chung_viec`. */
export function kiemBangChung(b: Pick<BangChung, 'loai' | 'nguon' | 'trang_thai_xac_minh'>): string | null {
  if (b.trang_thai_xac_minh === 'system_verified' && b.nguon !== 'mimi_he_thong') return 'Chỉ MIMI (máy chủ) ghi được bằng chứng đã xác minh.';
  if (b.loai === 'system_verified_event' && (b.nguon !== 'mimi_he_thong' || b.trang_thai_xac_minh !== 'system_verified')) return 'Sự kiện xác minh phải do máy chủ MIMI ghi.';
  return null;
}

/**
 * Chuyển trạng thái hợp lệ? `null` = được; không thì câu lý do. Cùng quy tắc với trigger CSDL:
 * đang mở ↔ đang mở; đang mở → huỷ; → đã xong (bạn xác nhận) cần bằng chứng xác nhận trở lên;
 * → đã xong (hệ thống) cần bằng chứng hệ thống; huỷ và "hệ thống đã xác minh" là cuối.
 */
export function kiemChuyenViec(tu: TrangThaiViec, den: TrangThaiViec, bc: readonly Pick<BangChung, 'trang_thai_xac_minh'>[]): string | null {
  if (tu === den) return null;
  if (tu === 'cancelled' || tu === 'resolved_system_verified') return 'Việc đã đóng, không đổi trạng thái được.';
  if (tu === 'resolved_user_confirmed' && den !== 'resolved_system_verified') return 'Việc đã xong theo xác nhận của bạn; chỉ nâng lên được khi MIMI xác minh.';
  if (den === 'resolved_system_verified' && !bc.some((b) => b.trang_thai_xac_minh === 'system_verified')) return 'Chưa có bằng chứng MIMI xác minh được.';
  if (den === 'resolved_user_confirmed' && !bc.some((b) => b.trang_thai_xac_minh === 'user_confirmed' || b.trang_thai_xac_minh === 'system_verified')) return 'Chưa có bằng chứng xác nhận.';
  return null;
}
