import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';

async function phien() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  return session;
}

/** Gọi edge function `tro-ly` (MIMI Assistant) bằng phiên của chủ doanh nghiệp. */
export async function goiTroLy(hanhDong: string, du: Record<string, unknown> = {}) {
  const session = await phien();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/tro-ly`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) {
    throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return body as Record<string, any>;
}

/**
 * Đồng bộ sao kê — cùng lời gọi nút "Đồng bộ" ở trang Kết nối dùng (`bank-link?action=sync`).
 * Lỗi mang `remedy` (việc người dùng cần làm) thì ghép vào câu lỗi.
 */
export async function dongBoSaoKe() {
  const session = await phien();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/bank-link?action=sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) {
    const cau = [body.error, body.remedy].filter((x) => typeof x === 'string').join(' ');
    throw new LoiGoiHam(cau || `Lỗi ${res.status}`, res.status, body);
  }
  return body;
}
