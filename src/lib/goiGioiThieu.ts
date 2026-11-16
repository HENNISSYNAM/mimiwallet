import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';
import type { KetQuaTinHieu, TinHieu } from '../../supabase/functions/_shared/gioi-thieu-ngan-hang/tin-hieu.ts';
import type { NhuCauKhop, GoiHien } from '../../supabase/functions/_shared/gioi-thieu-ngan-hang/khop-goi.ts';
import type { HanhDongDeXuat } from '../../supabase/functions/_shared/gioi-thieu-ngan-hang/hanh-dong.ts';
import type { TruongChiaSe } from '../../supabase/functions/_shared/gioi-thieu-ngan-hang/dong-y.ts';

export type { KetQuaTinHieu, TinHieu, NhuCauKhop, GoiHien, HanhDongDeXuat, TruongChiaSe };

export interface KetQuaCoHoi {
  tin_hieu: KetQuaTinHieu;
  nhu_cau: NhuCauKhop[];
  hanh_dong: HanhDongDeXuat[];
  ghi_chu_thu_tu: string;
  cong_bo: string[];
  truong_chia_se: { ma: TruongChiaSe; ten: string; mac_dinh: boolean }[];
}

export interface DongDongY {
  id: string;
  offer_id: string;
  data_scope: TruongChiaSe[];
  purpose: string;
  yeu_cau_lien_he: boolean;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  trang_thai?: 'con_hieu_luc' | 'het_han' | 'da_thu_hoi';
}

export interface DongGioiThieu {
  id: string;
  consent_id: string;
  offer_id: string;
  status: 'draft' | 'sent_by_owner' | 'withdrawn';
  payload: Record<string, unknown> | null;
  payload_sha256: string;
  created_at: string;
  sent_at: string | null;
  withdrawn_at: string | null;
}

export type HanhDongCoHoi = 'tin_hieu' | 'dong_y' | 'gui' | 'thu_hoi' | 'ds';

/**
 * Gọi edge function `gioi-thieu-ngan-hang` bằng phiên đăng nhập. Mọi con số do máy chủ tính bằng hàm thuần
 * (`_shared/gioi-thieu-ngan-hang`); giao diện chỉ hiện. Không có gì đi tới ngân hàng từ trình duyệt.
 */
export async function goiCoHoi(hanhDong: HanhDongCoHoi, du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/gioi-thieu-ngan-hang`, {
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
