import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';
import type { BaoCaoXacMinh } from '../../supabase/functions/_shared/xac-minh/bao-cao.ts';

/** Edge function `doanh-thu-xac-minh`: báo cáo doanh thu đã xác minh, neo dấu thời gian, chia sẻ có đồng ý. */
const DUONG = `${SUPABASE_URL}/functions/v1/doanh-thu-xac-minh`;

export type TrangThaiNeo = 'not_anchored' | 'pending' | 'confirmed' | 'failed';

export interface DongBaoCaoXacMinh {
  id: string;
  ky_loai: 'nam' | '12_thang';
  tu_ngay: string;
  den_ngay: string;
  report_json: BaoCaoXacMinh;
  sha256: string;
  anchor_status: TrangThaiNeo;
  anchored_at: string | null;
  confirmed_at: string | null;
  bitcoin_block: number | null;
  created_at: string;
}

export interface DongChiaSeXacMinh {
  id: string;
  report_id: string;
  recipient_name: string;
  purpose: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  trang_thai: 'con_han' | 'het_han' | 'da_thu_hoi';
  so_lan_xem: number;
  xem_gan_nhat: string | null;
}

export interface GoiCongKhai {
  bao_cao: BaoCaoXacMinh;
  sha256: string;
  neo: { trang_thai: TrangThaiNeo; neo_luc: string | null; xac_nhan_luc: string | null; khoi_bitcoin: number | null; ots: string | null };
  chia_se: { nguoi_nhan: string; muc_dich: string; het_han: string };
}

async function guiLen(du: Record<string, unknown>, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(DUONG, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(du),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  return body;
}

/** Hành động của chủ doanh nghiệp, bằng phiên đăng nhập. */
export async function goiXacMinh(hanhDong: string, du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (await guiLen(await kemCongTy({ hanh_dong: hanhDong, ...du }), session.access_token)) as Record<string, any>;
}

/** Người nhận mở đường dẫn — không đăng nhập, dùng khoá công khai. */
export async function xemBaoCaoCongKhai(token: string): Promise<GoiCongKhai> {
  return (await guiLen({ hanh_dong: 'xem_cong_khai', token }, SUPABASE_PUBLISHABLE_KEY)) as unknown as GoiCongKhai;
}

export const duongDanChiaSe = (token: string) => `${window.location.origin}/xac-minh/${token}`;
