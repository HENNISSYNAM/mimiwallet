/**
 * Một sự cố liên kết → một trạng thái → một việc người dùng phải làm.
 *
 * Trước 24/09/2026 mọi hỏng hóc đều thành `needs_relink` và giao diện khuyên "bấm Cập nhật" hoặc
 * "liên kết lại". Nhưng ba nhóm sự cố có ba việc phải làm khác hẳn nhau, và bảo sai thì người dùng
 * bấm mãi một nút không bao giờ chạy được — đúng chuyện đã mất một tuần với liên kết QR MB Bank.
 *
 *   paused        Người dùng tự tạm dừng grant trên Cas ID. Việc cần làm: bật lại. Dữ liệu còn nguyên.
 *   needs_reauth  Grant của MIMI vẫn tốt; vướng nằm trong app ngân hàng của họ (bật chặn đăng nhập
 *                 từ website, ngân hàng tạm dừng dịch vụ). Liên kết lại KHÔNG giải quyết.
 *                 Lưu ý: GRANT_LOGIN_REQUIRED KHÔNG thuộc nhóm này — tài liệu Cas chỉ rõ phải dùng
 *                 cơ chế cập nhật của Cas, tức là đi qua Cas Link.
 *   needs_relink  Quyền đã mất thật. Chỉ còn cách đi qua Cas Link lần nữa.
 *
 * Nguồn mã: `cas.so/general/api/webhook` (5 mã GRANT) và `cas.so/errors`, đọc 24/09/2026.
 * Bảng lời khuyên bằng tiếng Việt nằm ở `errors.ts` — ở đây chỉ quyết định TRẠNG THÁI.
 */
import { describeBankError } from './errors.ts';

export type TrangThaiLienKet = 'connected' | 'paused' | 'needs_reauth' | 'needs_relink' | 'disconnected';

/** Trạng thái nào còn coi là đang dùng được (chỉ tạm vướng), khác với đã mất quyền. */
export const CON_QUYEN: TrangThaiLienKet[] = ['connected', 'paused', 'needs_reauth'];

/** Mã webhook GRANT → trạng thái. Xem `webhookCode` trong tài liệu Cas. */
export function trangThaiTheoMaWebhook(ma: string | null | undefined): TrangThaiLienKet | null {
  switch (ma) {
    case 'GRANT_PAUSED': return 'paused';
    // Grant bị xoá: ở Cas ID hoặc ở chính giao diện của mình. Cả hai đều là mất quyền thật.
    case 'USER_PERMISSION_REVOKED':
    case 'GRANT_DELETED': return 'needs_relink';
    // Người dùng vừa cập nhật lại mật khẩu / OTP qua Update mode: đã kết nối lại.
    case 'DEFAULT_UPDATE': return 'connected';
    // ERROR mang theo `error.errorCode`; chính mã đó mới nói được việc cần làm.
    default: return null;
  }
}

/**
 * Mã lỗi Cas → trạng thái. Dựa trên `describeBankError` để một mã chỉ có một cách hiểu trong cả
 * ứng dụng: thêm mã mới vào `errors.ts` là tự động đúng ở đây.
 */
export function trangThaiTheoMaLoi(maLoi: string | null | undefined): TrangThaiLienKet | null {
  if (!maLoi) return null;
  const { action } = describeBankError(maLoi);
  if (action === 'reauth_in_bank_app') return 'needs_reauth';
  if (action === 'relink') return 'needs_relink';
  // 'wait', 'choose_other_bank', 'fix_input', 'contact_support', 'unknown': chưa biết grant hỏng hay
  // không, mà "không biết" khác với "đã hỏng" — không đổi trạng thái.
  return null;
}

/** Trạng thái sau một sự kiện GRANT. `null` = không đủ căn cứ để đổi, giữ nguyên trạng thái cũ. */
export function trangThaiSauSuKien(maWebhook: string | null | undefined, maLoi: string | null | undefined): TrangThaiLienKet | null {
  return trangThaiTheoMaLoi(maLoi) ?? trangThaiTheoMaWebhook(maWebhook);
}

/** Câu nói cho người dùng, theo trạng thái. Không dùng từ chuyên môn, nói đúng việc phải làm. */
export const VIEC_CAN_LAM: Record<Exclude<TrangThaiLienKet, 'connected'>, string> = {
  paused: 'Bạn đang tạm dừng liên kết này trong app Cas ID. Mở app và bật lại là MIMI đọc tiếp được.',
  needs_reauth: 'Cần mở app ngân hàng của bạn để xử lý (đăng nhập lại, hoặc tắt chặn đăng nhập từ website). Bấm liên kết lại ở đây không giải quyết được.',
  needs_relink: 'Quyền đọc đã bị thu hồi. Hãy liên kết lại tài khoản ngân hàng.',
  disconnected: 'Liên kết đã ngắt. Hãy liên kết lại nếu muốn MIMI tiếp tục đọc sao kê.',
};
