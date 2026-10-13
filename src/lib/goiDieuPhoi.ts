import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { kemCongTy } from '@/lib/congTyDangDung';

/** Khuôn nhiệm vụ máy chủ trả (`_shared/agent/dieu-phoi.ts` → `hienThi`). Giá trị ô điền đã bị che ở máy chủ. */
export interface NhiemVuAgent {
  id: string;
  agent: 'thue' | 'tai_chinh' | 'tai_lieu' | 'trinh_duyet';
  ten_agent: string;
  muc_tieu: string;
  trang_thai: 'cho' | 'dang_chay' | 'cho_duyet' | 'ban_giao' | 'xong' | 'loi' | 'huy' | 'het_han';
  buoc: { chi_so: number; mo_ta: string; cong_cu: string; xong: boolean; can_duyet: boolean }[];
  buoc_tiep: number;
  url_hien_tai: string | null;
  loi: string | null;
  tom_tat: string | null;
  nguon: { url: string; tieu_de: string | null }[];
  can_duyet: { buoc: number; mo_ta: string } | null;
  ke_hoach_tu: 'mau' | 'mo_hinh' | null;
}

/**
 * Gọi edge function `agent-dieu-phoi` (Orchestrator agent cloud) bằng phiên người dùng. Lỗi giữ mã + thân để giao diện
 * nói đúng (ví dụ 503 RUNTIME_CHUA_CAU_HINH: "runtime chưa cấu hình", không giả vờ chạy).
 */
export async function goiDieuPhoi(hanhDong: 'tao' | 'chay' | 'duyet_buoc' | 'huy' | 'xem' | 'ds', du: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new LoiGoiHam('Phiên đăng nhập đã hết. Đăng nhập lại.', 401, {});
  const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-dieu-phoi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, ...(await kemCongTy(du)) }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body?.error) throw new LoiGoiHam(typeof body.error === 'string' ? body.error : `Lỗi ${res.status}`, res.status, body);
  return body as { nhiem_vu?: NhiemVuAgent; ds?: NhiemVuAgent[]; mo_ta?: string };
}

/** Khoá chống trùng cho một lần tạo: bấm hai lần / mạng gửi lại không tạo hai nhiệm vụ. */
export const khoaChongTrungMoi = () => `nv-${crypto.randomUUID()}`;
