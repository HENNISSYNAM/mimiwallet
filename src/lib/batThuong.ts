/**
 * TCCN-01 phía giao diện: dùng lại đúng kiểu dữ liệu của bộ phát hiện ở edge function, để
 * trình duyệt và máy chủ không bao giờ hiểu một dấu hiệu theo hai cách.
 */
export type { CanhBao, DauHieu, KhoanRa, MaDauHieu, MucDo } from '../../supabase/functions/_shared/bat-thuong/phat-hien.ts';
import type { DauHieu } from '../../supabase/functions/_shared/bat-thuong/phat-hien.ts';

/**
 * Lỗi này có phải là "khoản có dấu hiệu, cần xác minh trước khi duyệt" không; có thì trả dấu hiệu.
 *
 * Kiểm theo hình dạng (`ma`, `duLieu`) chứ không bằng `instanceof LoiGoiTacTu`: lớp lỗi có thể
 * bị thay khi giả lập module, và một phép `instanceof` hỏng ở đây sẽ nuốt mất hộp cảnh báo —
 * đúng chỗ không được phép im lặng.
 */
export function canXacMinh(e: unknown): { dauHieu: DauHieu[]; lichSuDu: boolean } | null {
  if (!e || typeof e !== 'object') return null;
  const loi = e as { ma?: unknown; duLieu?: Record<string, unknown> };
  if (loi.ma !== 'CAN_XAC_MINH') return null;
  const du = loi.duLieu ?? {};
  const ds = Array.isArray(du.dau_hieu) ? (du.dau_hieu as DauHieu[]) : [];
  return { dauHieu: ds, lichSuDu: du.lich_su_du !== false };
}
