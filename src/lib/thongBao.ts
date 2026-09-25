import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import type { HanhDongThongBao, LoaiThongBao } from '../../supabase/functions/_shared/thong-bao/sinh.ts';

export { LOAI_THONG_BAO, TEN_LOAI_THONG_BAO } from '../../supabase/functions/_shared/thong-bao/sinh.ts';
export type { HanhDongThongBao, LoaiThongBao };

/**
 * Thông báo của MIMI phía trình duyệt: đọc, đánh dấu, và bật đẩy lên điện thoại / máy tính.
 *
 * Đọc thẳng bảng `thong_bao` (RLS: chỉ thông báo của chính mình). Ghi thì không: thông báo do bộ
 * lọc ngầm ở máy chủ sinh ra, trình duyệt chỉ đánh dấu đã đọc qua hàm `danh_dau_thong_bao`.
 */

export interface ThongBao {
  id: string;
  company_id: string;
  loai: LoaiThongBao;
  muc_do: 'thong_tin' | 'can_chu_y' | 'gap';
  tieu_de: string;
  noi_dung: string;
  duong_dan: string | null;
  hanh_dong: HanhDongThongBao[];
  tao_luc: string;
  da_doc_luc: string | null;
  da_xu_ly_luc: string | null;
}

export const SU_KIEN_THONG_BAO = 'mimi:thong-bao-doi';

export async function docThongBao(gioiHan = 30): Promise<ThongBao[]> {
  const id = await idCongTyDangDung();
  if (!id) return [];
  const { data, error } = await supabase.from('thong_bao')
    .select('id, company_id, loai, muc_do, tieu_de, noi_dung, duong_dan, hanh_dong, tao_luc, da_doc_luc, da_xu_ly_luc')
    // Thông báo lỗi thời (trỏ tới khoản không còn tồn tại) được lưu lại, không hiện.
    .is('loi_thoi_luc', null)
    .eq('company_id', id).order('tao_luc', { ascending: false }).limit(gioiHan);
  if (error) throw error;
  return (data ?? []) as unknown as ThongBao[];
}

export async function danhDauThongBao(ids: string[], daXuLy = false): Promise<void> {
  if (!ids.length) return;
  await supabase.rpc('danh_dau_thong_bao', { p_ids: ids, p_da_xu_ly: daXuLy });
  window.dispatchEvent(new Event(SU_KIEN_THONG_BAO));
}

async function goiThongBao(hanhDong: string, du: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Phiên đăng nhập đã hết. Đăng nhập lại.');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/thong-bao`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, ...du }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.error) throw new Error(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`);
  return body;
}

// ── Đẩy lên thiết bị ──────────────────────────────────────────────────────────

export type TrangThaiDay = 'khong_ho_tro' | 'can_cai_app' | 'bi_chan' | 'chua_bat' | 'da_bat';

/** iPhone chỉ nhận đẩy khi app đã được "Thêm vào màn hình chính" (iOS 16.4 trở lên). */
const laIphoneChuaCai = () =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia?.('(display-mode: standalone)').matches;

export async function trangThaiDay(): Promise<TrangThaiDay> {
  if (laIphoneChuaCai()) return 'can_cai_app';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'khong_ho_tro';
  if (Notification.permission === 'denied') return 'bi_chan';
  const dk = await navigator.serviceWorker.getRegistration();
  const sub = await dk?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'da_bat' : 'chua_bat';
}

function khoaThanhByte(b64: string): Uint8Array {
  const dem = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + dem).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Xin quyền, đăng ký với trình duyệt, rồi báo máy chủ thiết bị này. */
export async function batDay(): Promise<TrangThaiDay> {
  const tt = await trangThaiDay();
  if (tt === 'khong_ho_tro' || tt === 'can_cai_app' || tt === 'bi_chan') return tt;
  const quyen = await Notification.requestPermission();
  if (quyen !== 'granted') return quyen === 'denied' ? 'bi_chan' : 'chua_bat';

  const { khoa } = await goiThongBao('khoa_cong_khai');
  if (typeof khoa !== 'string' || !khoa) throw new Error('Máy chủ chưa bật đẩy thông báo. Thông báo vẫn hiện ở chuông trong app.');
  const dk = await navigator.serviceWorker.ready;
  const sub = await dk.pushManager.getSubscription() ?? await dk.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: khoaThanhByte(khoa),
  });
  await goiThongBao('dang_ky', { subscription: sub.toJSON(), thiet_bi: navigator.userAgent.slice(0, 120) });
  return 'da_bat';
}

export async function tatDay(): Promise<void> {
  const dk = await navigator.serviceWorker?.getRegistration();
  const sub = await dk?.pushManager.getSubscription();
  if (!sub) return;
  await goiThongBao('huy', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

export const guiThu = () => goiThongBao('thu');

// ── Loại nào được đẩy ────────────────────────────────────────────────────────

export async function docLoaiTat(): Promise<LoaiThongBao[]> {
  const u = await nguoiDungHienTai();
  if (!u) return [];
  const { data } = await supabase.from('cai_dat_thong_bao').select('loai_tat').eq('user_id', u.id).maybeSingle();
  return ((data as { loai_tat?: LoaiThongBao[] } | null)?.loai_tat ?? []);
}

export async function luuLoaiTat(loaiTat: LoaiThongBao[]): Promise<void> {
  const u = await nguoiDungHienTai();
  if (!u) return;
  const { error } = await supabase.from('cai_dat_thong_bao')
    .upsert({ user_id: u.id, loai_tat: loaiTat, cap_nhat_luc: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw error;
}
