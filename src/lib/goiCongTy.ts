import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';

/** Gọi edge function `cong-ty` (thành viên công ty) bằng phiên đăng nhập. */
export async function goiCongTy(hanhDong: string, du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/cong-ty`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) {
    throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return body as Record<string, any>;
}
