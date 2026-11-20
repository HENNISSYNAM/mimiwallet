import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';
import type { Den, LyDo } from '../../supabase/functions/_shared/soat-bill/cau-noi.ts';
import type { BillDoc } from '../../supabase/functions/_shared/soat-bill/doi-chieu.ts';

/** Một ca soát bill — xem supabase/functions/soat-bill/index.ts. */
export interface CaSoat {
  id: string;
  ban_id: string | null;
  doc: BillDoc;
  den: Den;
  ly_do: LyDo;
  cau_noi: string;
  so_tien: number | null;
  thuc_te: number | null;
  giao_dich_id: string | null;
  nha_cung_cap: 'bedrock' | 'openrouter' | null;
  mo_hinh: string | null;
  do_tre_ms: number | null;
  bat_dau: string;
  quyet: 'cho_qua' | 'tu_choi' | null;
  quyet_luc: string | null;
  ly_do_quyet: string | null;
  created_at: string;
}

export interface HomNay {
  ca: CaSoat[];
  hang_cho: CaSoat[];
  dem: Partial<Record<Den, number>>;
  duoc_quyet: boolean;
  la_demo: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function goiSoatBill<T = Record<string, any>>(hanhDong: string, du: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/soat-bill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
    });
  } catch {
    throw new LoiGoiHam('Mất kết nối mạng. Mở app ngân hàng để kiểm.', 0, {});
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  return body as T;
}

/** Cạnh dài tối đa của ảnh gửi đi: đủ để đọc chữ trên bill, nhẹ để gửi qua 4G ở quầy. */
export const CANH_TOI_DA = 1600;

/** Thu nhỏ + nén ảnh bill thành JPEG base64 (không có tiền tố data:). Ảnh không rời máy theo đường nào khác. */
export async function nenAnh(tep: File, canhToiDa = CANH_TOI_DA): Promise<{ base64: string; mime: 'image/jpeg' }> {
  const url = URL.createObjectURL(tep);
  try {
    const img = await new Promise<HTMLImageElement>((ok, hong) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => hong(new Error('Không mở được ảnh.'));
      i.src = url;
    });
    const tiLe = Math.min(1, canhToiDa / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * tiLe));
    const h = Math.max(1, Math.round(img.naturalHeight * tiLe));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Máy không xử lý được ảnh.');
    ctx.drawImage(img, 0, 0, w, h);
    const duLieu = c.toDataURL('image/jpeg', 0.85);
    return { base64: duLieu.slice(duLieu.indexOf(',') + 1), mime: 'image/jpeg' };
  } finally {
    URL.revokeObjectURL(url);
  }
}
