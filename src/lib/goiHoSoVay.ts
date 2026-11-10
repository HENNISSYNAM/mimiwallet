import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';
import type { KetQuaDanhGia } from '../../supabase/functions/_shared/tin-dung/cham-diem.ts';
import type { HoSoVay } from '../../supabase/functions/_shared/ho-so-vay/ho-so.ts';

export type { KetQuaDanhGia, HoSoVay };

/** Dòng hồ sơ vay như máy chủ trả về (không kèm file_json ở danh sách). */
export interface DongHoSoVay {
  id: string;
  so_tien: number;
  ky_han_thang: number;
  muc_dich: string;
  trang_thai: 'draft' | 'ready' | 'shared';
  hoan_chinh: boolean;
  created_at: string;
  xuat_luc?: string | null;
  so_lan_xuat?: number;
}

/**
 * Gọi edge function `ho-so-vay` bằng phiên đăng nhập. Mọi con số do máy chủ tính bằng hàm thuần
 * (`_shared/tin-dung`, `_shared/ho-so-vay`); giao diện chỉ hiện.
 */
export async function goiHoSoVay(hanhDong: 'danh_gia' | 'tao_ho_so' | 'xem' | 'ds' | 'xuat', du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ho-so-vay`, {
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
