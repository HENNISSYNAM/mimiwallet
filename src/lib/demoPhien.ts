import { supabase } from '@/integrations/supabase/client';
import { DEMO_EMAIL } from '@/lib/env';

/**
 * LỊCH SỬ HỎI MIMI Ở BẢN DEMO SẠCH MỖI PHIÊN (06/10/2026).
 *
 * Bản demo là MỘT tài khoản dùng chung, nên trước đây ai vào cũng thấy câu hỏi của người vào trước. Máy chủ vẫn phải
 * lưu từng lượt (bước xác nhận tra lại đúng dòng đã lưu), nên ở máy khách:
 *   - chỉ hiện những lượt hỏi CỦA PHIÊN NÀY (nhớ mã trong sessionStorage — đóng tab là quên);
 *   - vào demo thì xoá các lượt cũ hơn 2 giờ (không xoá lượt của người đang dùng demo cùng lúc);
 *   - đăng xuất demo thì xoá luôn các lượt của phiên mình.
 */
const KHOA = 'mimi.demo.hoi_thoai';
const GIU_LAI_MS = 2 * 60 * 60 * 1000;

export const laEmailDemo = (email?: string | null): boolean =>
  !!DEMO_EMAIL && !!email && email.toLowerCase() === DEMO_EMAIL.toLowerCase();

export async function dangLaDemo(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return laEmailDemo(data.session?.user?.email);
}

export function idHoiThoaiPhienDemo(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(KHOA) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function ghiNhoHoiThoaiDemo(id: string): void {
  try {
    const ds = idHoiThoaiPhienDemo();
    if (!ds.includes(id)) sessionStorage.setItem(KHOA, JSON.stringify([...ds, id].slice(-300)));
  } catch { /* không nhớ được thì lịch sử phiên này trống — không hiện nhầm của người khác */ }
}

export async function batDauPhienDemo(): Promise<void> {
  try { sessionStorage.removeItem(KHOA); } catch { /* bỏ qua */ }
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;
  await supabase.from('hoi_thoai_tro_ly').delete().eq('user_id', uid)
    .lt('tao_luc', new Date(Date.now() - GIU_LAI_MS).toISOString());
}

export async function ketThucPhienDemo(): Promise<void> {
  const ids = idHoiThoaiPhienDemo();
  if (ids.length) await supabase.from('hoi_thoai_tro_ly').delete().in('id', ids);
  try { sessionStorage.removeItem(KHOA); } catch { /* bỏ qua */ }
}
