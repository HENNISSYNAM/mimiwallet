/**
 * Lớp thực thi có kiểm soát — Prompt 5. Hàm thuần: trạng thái, chuyển trạng thái hợp lệ, cổng xác nhận,
 * khoá chống trùng. Không chạm CSDL, không gọi nhà cung cấp.
 *
 * CHUỖI: chuẩn bị → kiểm → người xác nhận → thực thi → nhận trạng thái ngoài → kiểm chứng → đối soát → xong.
 *
 * BA ĐIỀU KHÔNG BAO GIỜ GỘP:
 *   "đã gửi"            ≠ "đã xong";
 *   "nhà cung cấp nhận" ≠ "cơ quan nhận";
 *   "webhook tới"       ≠ "sự thật" — chỉ là gợi ý cho tới khi hỏi lại nguồn.
 */

export const LOAI_THUC_THI = [
  'tax_submission', 'document_signature', 'invoice_sync', 'invoice_status_check', 'authority_status_check', 'payment_reference_check',
] as const;
export type LoaiThucThi = (typeof LOAI_THUC_THI)[number];

export const TRANG_THAI = [
  'draft', 'needs_validation', 'needs_confirmation', 'ready', 'submitting', 'submitted', 'waiting_external',
  'accepted', 'rejected', 'failed', 'cancelled', 'resolved',
] as const;
export type TrangThaiThucThi = (typeof TRANG_THAI)[number];

/**
 * Chuyển trạng thái được phép. Không có đường tắt: `draft → accepted` là KHÔNG hợp lệ — mọi kết quả phải
 * đi qua "đã gửi" và "chờ bên ngoài", và mỗi bước có bằng chứng riêng.
 */
export const CHUYEN: Record<TrangThaiThucThi, readonly TrangThaiThucThi[]> = {
  draft: ['needs_validation', 'cancelled'],
  needs_validation: ['needs_confirmation', 'draft', 'cancelled'],
  needs_confirmation: ['ready', 'needs_validation', 'cancelled'],
  ready: ['submitting', 'needs_validation', 'cancelled'],
  submitting: ['submitted', 'failed'],
  submitted: ['waiting_external', 'accepted', 'rejected', 'failed'],
  waiting_external: ['accepted', 'rejected', 'failed', 'waiting_external'],
  accepted: ['resolved'],
  rejected: ['resolved', 'draft'],
  failed: ['ready', 'cancelled'],
  cancelled: [],
  resolved: [],
};

/** Bằng chứng bắt buộc để vào một trạng thái. Thiếu là không chuyển được. */
export const CAN_BANG_CHUNG: Partial<Record<TrangThaiThucThi, 'xac_nhan' | 'tham_chieu_ngoai' | 'ket_qua_co_quan'>> = {
  ready: 'xac_nhan',
  submitted: 'tham_chieu_ngoai',
  accepted: 'ket_qua_co_quan',
  rejected: 'ket_qua_co_quan',
};

export interface BangChungChuyen {
  xac_nhan_hop_le?: boolean;
  tham_chieu_ngoai?: string | null;
  ket_qua_co_quan?: string | null;
}

export function kiemChuyen(tu: TrangThaiThucThi, den: TrangThaiThucThi, bc: BangChungChuyen = {}): string | null {
  if (!CHUYEN[tu]?.includes(den)) return `Không chuyển được từ "${tu}" sang "${den}".`;
  const can = CAN_BANG_CHUNG[den];
  if (can === 'xac_nhan' && !bc.xac_nhan_hop_le) return 'Cần người có quyền xác nhận trước.';
  if (can === 'tham_chieu_ngoai' && !bc.tham_chieu_ngoai?.trim()) return 'Cần mã tham chiếu / biên nhận của nơi nhận.';
  if (can === 'ket_qua_co_quan' && !bc.ket_qua_co_quan?.trim()) return 'Cần kết quả của cơ quan (số thông báo, ngày) — không suy ra từ "đã gửi".';
  return null;
}

export const DA_KET_THUC = (t: TrangThaiThucThi) => t === 'cancelled' || t === 'resolved';

// ── Cổng xác nhận (mục 4–5) ─────────────────────────────────────────────────────────────────────
/**
 * Lời xác nhận GẮN VỚI đúng gói: phiên bản tài liệu + mã băm nội dung + mã băm dữ liệu gửi đi.
 * Tài liệu đổi (phiên bản mới, băm khác) sau khi xác nhận → xác nhận MẤT HIỆU LỰC.
 */
export interface GoiNop { tai_lieu_id: string; phien_ban: number; ma_bam_noi_dung: string; ma_bam_du_lieu: string }
export interface XacNhan extends GoiNop { boi: string; luc: string }

export function xacNhanConHieuLuc(xn: XacNhan | null, hienTai: GoiNop): { ok: true } | { ok: false; ly_do: string } {
  if (!xn) return { ok: false, ly_do: 'Chưa có xác nhận.' };
  if (xn.tai_lieu_id !== hienTai.tai_lieu_id) return { ok: false, ly_do: 'Xác nhận thuộc tài liệu khác.' };
  if (xn.phien_ban !== hienTai.phien_ban || xn.ma_bam_noi_dung !== hienTai.ma_bam_noi_dung) {
    return { ok: false, ly_do: 'Tài liệu đã đổi sau khi xác nhận — cần xác nhận lại bản mới.' };
  }
  if (xn.ma_bam_du_lieu !== hienTai.ma_bam_du_lieu) return { ok: false, ly_do: 'Dữ liệu gửi đi đã đổi sau khi xác nhận — cần xác nhận lại.' };
  return { ok: true };
}

/** Khoá chống trùng (mục 24): bấm "Nộp" hai lần không thành hai lần nộp. */
export function khoaChongTrung(o: { companyId: string; loai: LoaiThucThi; maBamNoiDung: string; ky?: string | null; dich?: string | null }): string {
  return [o.companyId, o.loai, o.maBamNoiDung, o.ky ?? '-', o.dich ?? '-'].join('|');
}

// ── Kết quả nộp thuế (mục 14–15) ─────────────────────────────────────────────────────────────────
export type KetQuaNop = 'provider_received' | 'authority_received' | 'accepted' | 'rejected' | 'needs_amendment' | 'unknown';

/**
 * Nhà cung cấp nhận ≠ cơ quan nhận. Chỉ `accepted` / `rejected` (có thông báo của cơ quan) mới đóng được
 * việc; hai trạng thái "nhận" chỉ giữ việc ở chờ bên ngoài.
 */
export function trangThaiTuKetQua(k: KetQuaNop): TrangThaiThucThi {
  switch (k) {
    case 'accepted': return 'accepted';
    case 'rejected': case 'needs_amendment': return 'rejected';
    case 'provider_received': case 'authority_received': case 'unknown': return 'waiting_external';
  }
}

/** Mục 33: nộp đúng hạn rồi mới chờ kết quả thì KHÔNG phải quá hạn. */
export function quaHan(o: { han: string | null; nop_luc: string | null; homNay: string; trang_thai: TrangThaiThucThi }): boolean {
  if (!o.han) return false;
  if (o.nop_luc) return o.nop_luc.slice(0, 10) > o.han;
  return o.homNay > o.han && !DA_KET_THUC(o.trang_thai);
}

/** Mục 25: chỉ thử lại lỗi đường truyền, không bao giờ thử lại việc không đảo ngược được sau khi đã gửi. */
export function thuLaiDuoc(o: { ma_loi: string | null; da_gui: boolean }): boolean {
  if (o.da_gui) return false;
  return o.ma_loi === 'MANG' || o.ma_loi === 'HET_GIO' || o.ma_loi === 'NHA_CUNG_CAP_TAM_LOI';
}
