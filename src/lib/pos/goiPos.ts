import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';

/** Kiểu dữ liệu edge function `pos` trả về (xem supabase/functions/pos/index.ts). */
export interface BanPos {
  id: string;
  client_id: string;
  amount: number;
  method: 'cash' | 'transfer';
  reference: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_basis: string | null;
  note: string | null;
  items: { ten: string; so_luong: number; don_gia: number }[];
  account_number: string | null;
  bank_bin: string | null;
  auto_match: boolean;
  sold_at: string;
  paid_at: string | null;
  created_at: string;
}
export interface TaiKhoanNhan { account_number: string; account_name: string | null; bank_name: string | null; bin: string; tu_dong_khop: boolean }
export interface TongHop {
  so_lan: number; tong: number; dang_cho: number;
  tien_mat: { so_lan: number; tong: number }; chuyen_khoan: { so_lan: number; tong: number };
}
export interface SanPhamPos { id?: string; ten: string; gia: number }
export interface CauHinhPos {
  cong_ty: { id: string; ten: string | null };
  vai_tro: string;
  quyen: { xac_nhan_tay: boolean; sua_san_pham: boolean };
  tai_khoan_nhan: TaiKhoanNhan | null;
  san_pham: SanPhamPos[];
  ngay: string;
  tong_hop: TongHop;
  ban: BanPos[];
}

/** Gọi edge function `pos`. Mất mạng → LoiGoiHam status 0 (hàng đợi ngoại tuyến dựa vào đó để giữ lại). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function goiPos<T = Record<string, any>>(hanhDong: string, du: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/pos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
    });
  } catch {
    throw new LoiGoiHam('Mất kết nối mạng.', 0, {});
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  return body as T;
}
