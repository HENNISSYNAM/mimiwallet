import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import type { BangViec, DongViec, TrangThaiAgent } from '../../supabase/functions/_shared/space/kho.ts';
import type { TenAgentSpace, Viec } from '../../supabase/functions/_shared/space/dong-co.ts';

export type { BangViec, DongViec, TenAgentSpace, TrangThaiAgent, Viec };

export interface TinSpace { id: number; tu: string; den: string | null; loai: string; noi_dung: string; lien_ket: string | null; luc: string }

/** Gọi edge function `agentic-space` bằng phiên đăng nhập. Mọi quyền kiểm ở máy chủ. */
export async function goi(hanhDong: string, o: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agentic-space`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, ...o }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  return body;
}

export const docBang = async () => (await goi('bang')) as unknown as BangViec;
export const docTin = async (id: string) => (await goi('tin', { id })) as unknown as { viec: Viec; tin: TinSpace[] };
export const giaoViec = async (o: { company_id: string; cau: string; han?: string | null; agent?: TenAgentSpace }) =>
  String((await goi('tao', o)).id);
export const tiepTuc = async (id: string) => { await goi('tiep_tuc', { id }); };
export const danhDauXong = async (id: string) => { await goi('xong', { id }); };
export const huyViec = async (id: string) => { await goi('huy', { id }); };
