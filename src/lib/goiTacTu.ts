import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';

/**
 * Gọi edge function `tac-tu` bằng phiên của chủ doanh nghiệp.
 *
 * Dùng chung cho màn Kiểm soát agent và màn Chính sách chi: hai bản chép tay của
 * cùng một lời gọi sẽ lệch nhau vào ngày ai đó đổi cách báo lỗi ở một bên.
 */
export const DIEM_GOI_TAC_TU = `${SUPABASE_URL}/functions/v1/tac-tu`;

export async function goiTacTu(hanhDong: string, du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Phiên đăng nhập đã hết. Đăng nhập lại.');
  const res = await fetch(DIEM_GOI_TAC_TU, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hanh_dong: hanhDong, ...du }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) throw new Error(body?.error ?? `Lỗi ${res.status}`);
  return body;
}
