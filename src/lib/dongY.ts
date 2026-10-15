import { supabase } from '@/integrations/supabase/client';

/**
 * Đồng ý điều khoản lúc vào lần đầu (15/10/2026). Nghị định 13/2023 đòi sự đồng ý phải CHỨNG MINH được: ghi ai đồng ý,
 * điều gì, phiên bản nào, lúc nào, vào bảng `consents` (chỉ thêm, thu hồi bằng revoked_at — không xoá lịch sử).
 *
 * Đổi nội dung điều khoản/quyền riêng tư thì TĂNG số phiên bản ở đây: mọi người dùng sẽ được hỏi lại một lần.
 */
export const PHIEN_BAN_DIEU_KHOAN = '2026-10-15';
const LOAI_CAN: ReadonlyArray<'tos' | 'privacy'> = ['tos', 'privacy'];

interface DongConsent { kind: string; version: string; revoked_at: string | null }

/** Thuần: các dòng consent hiện có đã đủ điều khoản + quyền riêng tư của phiên bản hiện hành, còn hiệu lực chưa? */
export function daDongYDayDu(dong: DongConsent[], phienBan = PHIEN_BAN_DIEU_KHOAN): boolean {
  return LOAI_CAN.every((k) => dong.some((d) => d.kind === k && d.version === phienBan && !d.revoked_at));
}

/** null = không đọc được (đừng chặn người dùng chỉ vì lỗi mạng). */
export async function docDaDongY(userId: string): Promise<boolean | null> {
  const { data, error } = await supabase.from('consents').select('kind, version, revoked_at').eq('user_id', userId);
  if (error) return null;
  return daDongYDayDu((data ?? []) as DongConsent[]);
}

/** Ghi đồng ý. Ném lỗi nếu không ghi được — giao diện báo và cho thử lại, không cho đi tiếp khi chưa có dấu vết. */
export async function ghiDongY(userId: string): Promise<void> {
  const { error } = await supabase.from('consents').insert(LOAI_CAN.map((kind) => ({ user_id: userId, kind, version: PHIEN_BAN_DIEU_KHOAN })));
  if (error) throw new Error(error.message);
}

const KHOA_HUONG_DAN = (userId: string) => `mimi:huong-dan:${userId}`;
export function daXemHuongDan(userId: string): boolean {
  try { return localStorage.getItem(KHOA_HUONG_DAN(userId)) === '1'; } catch { return false; }
}
export function ghiDaXemHuongDan(userId: string) {
  try { localStorage.setItem(KHOA_HUONG_DAN(userId), '1'); } catch { /* chế độ riêng tư: hỏi lại lần sau cũng không sao */ }
}
