/**
 * Kiểm JWT người dùng bằng chính Supabase Auth (`GET /auth/v1/user`).
 *
 * Vì sao không tự giải mã JWT: runtime không giữ bí mật (không có JWT secret), và Supabase còn biết phiên đã bị thu hồi
 * hay chưa — tự kiểm chữ ký JWT không biết điều đó.
 *
 * URL và khoá publishable chép từ `src/lib/env.ts` (giá trị CÔNG KHAI, vốn nằm trong bundle web). Không import file đó vì
 * nó đọc `import.meta.env` của Vite, không có trong Node. Không cho ghi đè bằng biến môi trường: ai đổi được env thì
 * trỏ được việc kiểm phiên sang máy chủ giả.
 */
export const SUPABASE_URL = 'https://xzymxgdavepvygdcmfup.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_r4reA2kLO6rzvF5EgkaYfg_Fz3UQBBt';

export type KetQuaXacThuc = { ok: true; nguoi_dung_id: string } | { ok: false; ma: 401 | 503; loi: string };

export async function xacThucNguoiDung(
  authorization: string | null,
  fetchFn: typeof fetch = fetch,
): Promise<KetQuaXacThuc> {
  const m = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(authorization?.trim() ?? '');
  if (!m) return { ok: false, ma: 401, loi: 'Thiếu hoặc sai dạng JWT người dùng.' };
  let r: Response;
  try {
    r = await fetchFn(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${m[1]}` },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { ok: false, ma: 503, loi: 'Không kiểm được phiên người dùng (Supabase Auth không trả lời).' };
  }
  if (r.status === 401 || r.status === 403) return { ok: false, ma: 401, loi: 'JWT không hợp lệ hoặc đã hết hạn.' };
  if (!r.ok) return { ok: false, ma: 503, loi: `Supabase Auth trả ${r.status}.` };
  const u = (await r.json().catch(() => null)) as { id?: unknown } | null;
  if (!u || typeof u.id !== 'string') return { ok: false, ma: 401, loi: 'Phiên không có người dùng.' };
  return { ok: true, nguoi_dung_id: u.id };
}
