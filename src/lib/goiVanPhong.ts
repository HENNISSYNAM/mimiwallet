import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import type {
  AgentDangLam, DanhMucKhach, KhachVanPhong, LyDo, MaLyDo, MucKhach, TenAgentVP,
} from '../../supabase/functions/_shared/van-phong/danh-muc.ts';

export type { AgentDangLam, DanhMucKhach, KhachVanPhong, LyDo, MaLyDo, MucKhach, TenAgentVP };

/**
 * Gọi edge function `van-phong` bằng phiên đăng nhập. Danh mục là của NGƯỜI GỌI (mọi công ty họ làm sổ), nên không gửi
 * `company_id`; máy chủ tự kiểm thành viên từng công ty. Mọi con số do máy chủ tính, giao diện chỉ hiện.
 */
export async function goiDanhMucKhach(o: { trang?: number; kich_thuoc?: number } = {}): Promise<DanhMucKhach> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/van-phong`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ hanh_dong: 'danh_muc_khach', ...o }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) {
    throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  }
  return body as unknown as DanhMucKhach;
}
