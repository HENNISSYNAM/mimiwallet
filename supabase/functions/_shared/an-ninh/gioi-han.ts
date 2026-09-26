/**
 * Giới hạn tần suất dùng chung — chống bot, dò khoá, đốt chi phí (25/09/2026).
 *
 * Dùng lại bảng `gioi_han_goi` và hàm `tang_luot_goi` (chỉ service role gọi được). Khoá đếm:
 *   - người đã đăng nhập: `user_id`;
 *   - người chưa đăng nhập (webhook, agent key sai, bot): IP đã BĂM — không lưu IP thô. Băm có muối
 *     riêng theo mục đích nên không đảo ngược ra IP bằng bảng tra sẵn.
 *
 * `dongKhiLoi`: việc TỐN TIỀN (gọi API trả phí) thì lỗi bộ đếm = từ chối; việc thường thì lỗi bộ đếm =
 * cho qua, để sự cố của bộ đếm không làm sập cả app.
 */

// deno-lint-ignore no-explicit-any
type Db = any;

/** IP của người gọi. Supabase Edge đặt `x-forwarded-for`; lấy phần tử đầu (máy khách). */
export function ipNguoiGoi(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') ?? '';
  const ip = xff.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || '';
  return /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : 'khong-ro';
}

/** SHA-256(muối + IP) → dạng uuid, để dùng làm khoá đếm trong `gioi_han_goi`. */
export async function idTuIp(ip: string, muoi = 'mimi-gioi-han-v1'): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${muoi}|${ip}`)));
  const h = [...b.slice(0, 16)].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export interface Muc { hanh_dong: string; cua_so_giay: number; toi_da: number }

/** true = được đi tiếp. Kiểm lần lượt từng mức (vd. 20/10 phút VÀ 100/ngày); hỏng một mức là dừng. */
export async function duocGoi(db: Db, khoa: string, muc: Muc[], dongKhiLoi = false): Promise<boolean> {
  for (const m of muc) {
    const { data, error } = await db.rpc('tang_luot_goi', { p_user: khoa, p_hanh_dong: m.hanh_dong.slice(0, 40), p_cua_so_giay: m.cua_so_giay, p_toi_da: m.toi_da });
    if (error) {
      console.error('bộ đếm giới hạn:', error.message);
      if (dongKhiLoi) return false;
      continue;
    }
    if (data === false) return false;
  }
  return true;
}

/**
 * CHỐNG DÒ KHOÁ. Gọi `daBiKhoaViSai` TRƯỚC khi kiểm khoá; nếu khoá sai thì `ghiLanSai`. IP sai quá
 * `toiDa` lần trong cửa sổ bị từ chối — kể cả khi lần sau đoán đúng, để việc dò không bao giờ có lời.
 * Lỗi bộ đếm: cho qua (webhook thật của ngân hàng không được rơi vì bộ đếm hỏng).
 */
export const CUA_SO_SAI_KHOA = 600;
export const TOI_DA_SAI_KHOA = 20;

export async function daBiKhoaViSai(db: Db, khoa: string, hanhDong: string, toiDa = TOI_DA_SAI_KHOA, cuaSo = CUA_SO_SAI_KHOA): Promise<boolean> {
  const { data, error } = await db.rpc('so_luot_goi', { p_user: khoa, p_hanh_dong: hanhDong.slice(0, 40), p_cua_so_giay: cuaSo });
  if (error) { console.error('đọc bộ đếm sai khoá:', error.message); return false; }
  return Number(data) >= toiDa;
}

export async function ghiLanSai(db: Db, khoa: string, hanhDong: string, cuaSo = CUA_SO_SAI_KHOA): Promise<void> {
  const { error } = await db.rpc('tang_luot_goi', { p_user: khoa, p_hanh_dong: hanhDong.slice(0, 40), p_cua_so_giay: cuaSo, p_toi_da: 1_000_000 });
  if (error) console.error('ghi lần sai khoá:', error.message);
}

/** Trả 429 kèm Retry-After, câu cho người đọc. */
export function qua429(cors: Record<string, string>, giay = 60): Response {
  return new Response(JSON.stringify({ error: 'Thao tác hơi nhanh. Đợi một chút rồi thử lại.' }), {
    status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(giay) },
  });
}
