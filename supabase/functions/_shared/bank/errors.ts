/**
 * What each Cas error code means, and what the customer can actually do.
 *
 * This table exists because guessing was tried first and cost four rounds.
 * `create-qr` matched `GRANT_NOT_FOUND` to mean "missing scope"; the live
 * answer was `GRANT_NOT_PERMISSION`. Then the same handler blamed a stale link
 * when the real answer was `FI_SERVICE_NOT_FOUND` — the customer's bank simply
 * does not sell the product. Two different causes, two different remedies, and
 * a message that named the wrong one both times sends somebody to redo a link
 * that was never the problem.
 *
 * Codes and their Vietnamese meanings come from https://cas.so/errors.
 * Anything absent from that page is absent here too: an unknown code falls
 * through to Cas's own message rather than being given a remedy we invented.
 */

export type BankErrorAction =
  /** The grant is unusable. Send them through Cas Link again. */
  | 'relink'
  /** The grant is fine; the customer has to act in their own banking app. */
  | 'reauth_in_bank_app'
  /** The grant is fine; this bank does not offer the product. */
  | 'choose_other_bank'
  /** Transient. Try again shortly. */
  | 'wait'
  /** Nothing the customer can do. */
  | 'contact_support'
  /** The customer typed something the bank rejected; they can fix it here. */
  | 'fix_input'
  /** No remedy known — show Cas's message and nothing else. */
  | 'unknown';

export interface BankErrorInfo {
  action: BankErrorAction;
  /** Vietnamese, addressed to the person looking at the screen. */
  remedy: string;
}

const TABLE: Record<string, BankErrorInfo> = {
  // ── Grant ────────────────────────────────────────────────────────────────
  GRANT_NOT_FOUND: {
    action: 'relink',
    remedy: 'Liên kết không còn tồn tại hoặc đã bị thu hồi. Hãy liên kết lại tài khoản ngân hàng.',
  },
  GRANT_NOT_PERMISSION: {
    action: 'relink',
    // The grant is real but was issued without the scope this call needs —
    // every link made before QR existed asked for `transaction` alone.
    remedy:
      'Liên kết hiện tại chưa được cấp quyền cho tính năng này. Hãy liên kết lại tài khoản ngân hàng để cấp thêm quyền.',
  },
  GRANT_LOGIN_REQUIRED: {
    action: 'relink',
    remedy:
      'Thông tin đăng nhập ngân hàng đã thay đổi. Hãy liên kết lại để cập nhật.',
  },
  GRANT_TOKEN_EXPIRED: {
    action: 'relink',
    remedy: 'Mã phân quyền đã hết hạn. Hãy bắt đầu lại việc liên kết.',
  },
  GRANT_NOT_PERMIT_UPDATE: {
    action: 'relink',
    remedy: 'Liên kết này không có quyền cập nhật tài khoản. Hãy liên kết lại.',
  },

  // ── Financial institution ────────────────────────────────────────────────
  FI_NOT_FOUND: {
    action: 'choose_other_bank',
    remedy: 'Không tìm thấy tổ chức tài chính này. Hãy chọn ngân hàng khác.',
  },
  FI_SERVICE_NOT_FOUND: {
    action: 'choose_other_bank',
    // Not a fault on either side: QR Pay runs on virtual accounts and VietQR
    // Pro, and not every bank sells that.
    remedy:
      'Ngân hàng đang liên kết không hỗ trợ tính năng này. Hãy liên kết thêm một ngân hàng khác có hỗ trợ.',
  },
  FI_SERVICE_ACCOUNT_PAUSED: {
    action: 'reauth_in_bank_app',
    remedy:
      'Ngân hàng đang tạm dừng dịch vụ cho tài khoản này. Hãy mở ứng dụng ngân hàng để kết nối lại, rồi thử lại.',
  },
  /**
   * The customer switched on their bank's "block login from website" setting.
   *
   * Missing from this table until 18/08, and its absence is exactly what the
   * per-connection amber note was written to fix — yet the note never appeared
   * for it. `describeBankError` fell through to `unknown`, the UI only persists
   * a note for `reauth_in_bank_app`, so acceptance case 7 showed a toast that
   * vanished and left a plain green row behind. The fix and the case it was
   * built for missed each other by one missing key.
   *
   * `reauth_in_bank_app`, not `relink`: MIMI's grant is untouched and Update
   * Mode cannot help. The switch is in the bank's own app and only the customer
   * can turn it off.
   */
  PREVENTED: {
    action: 'reauth_in_bank_app',
    remedy:
      'Tài khoản đang bật chặn đăng nhập từ website. Hãy mở ứng dụng ngân hàng trên điện thoại, tắt tuỳ chọn đó, rồi bấm Đồng bộ lại.',
  },
  FI_SERVICE_ACCOUNT_CONNECTING: {
    action: 'wait',
    remedy: 'Tài khoản đang được kết nối. Chờ một lát rồi thử lại — không cần làm gì thêm.',
  },

  // ── Platform ─────────────────────────────────────────────────────────────
  RATE_LIMIT: {
    action: 'wait',
    remedy: 'Cas giới hạn khoảng một lần gọi mỗi phút cho mỗi liên kết. Thử lại sau một phút.',
  },
  IP_NOT_ALLOWED: {
    action: 'contact_support',
    remedy:
      'API này yêu cầu IP nằm trong danh sách cho phép. Máy chủ hiện không có IP cố định nên chưa dùng được.',
  },
  APP_NOT_FOUND: {
    action: 'contact_support',
    remedy: 'Cấu hình tài khoản nhà phát triển chưa đúng. Đây là lỗi hệ thống, không phải do bạn.',
  },
  /*
   * Trước 04/09 mã này được ghi là "lỗi hệ thống, không phải do bạn", và lúc đó
   * đúng: mọi tham số của lời gọi đều do máy chủ dựng. Nay người dùng tự gõ số
   * tiền và nội dung mã QR, nên `INVALID_PARAM` thường xuyên là chuyện họ sửa
   * được — ví dụ nội dung quá 9 ký tự. Nói "không phải do bạn" trong tình huống
   * đó là chặn đúng người có thể sửa.
   */
  INVALID_PARAM: {
    action: 'fix_input',
    remedy: 'Kiểm tra lại số tiền và nội dung. Nội dung mã QR tối đa 9 ký tự.',
  },
};

export function describeBankError(errorCode: string | undefined): BankErrorInfo {
  if (!errorCode) return { action: 'unknown', remedy: '' };
  return TABLE[errorCode] ?? { action: 'unknown', remedy: '' };
}

/** True when the only way forward is sending the customer through Cas Link again. */
export function requiresRelink(errorCode: string | undefined): boolean {
  return describeBankError(errorCode).action === 'relink';
}
