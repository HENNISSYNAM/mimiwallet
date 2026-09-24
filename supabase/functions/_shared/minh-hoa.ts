/**
 * Dữ liệu minh hoạ (`is_synthetic = true`) chỉ hiện trong CÔNG TY DEMO.
 *
 * Quy tắc cũ là "không bao giờ hiện dòng thử" — đúng với công ty thật, nhưng làm tài khoản demo
 * trống trơn: toàn bộ sổ của demo là dòng thử. Quy tắc mới xét theo công ty, không theo người xem:
 * `companies.la_demo` do máy chủ đặt (trigger `giu_co_demo` chặn trình duyệt sửa), và mọi thứ ghi
 * vào công ty demo đều tự mang cờ minh hoạ (`danh_dau_minh_hoa`). Công ty thật lọc như cũ.
 *
 * Không dùng cho chỗ chạm tiền thật: đối soát chi của agent, khớp hoá đơn với tiền về — ở đó
 * dòng minh hoạ luôn bị loại, kể cả trong demo.
 */

// deno-lint-ignore no-explicit-any
type Db = any;

export async function congTyLaDemo(db: Db, companyId: string): Promise<boolean> {
  const { data } = await db.from('companies').select('la_demo').eq('id', companyId).maybeSingle();
  return data?.la_demo === true;
}

/**
 * Bỏ dòng minh hoạ khỏi truy vấn, trừ khi đang đọc công ty demo.
 * Kiểu để trống ràng buộc: ràng buộc theo `.eq` làm trình kiểm kiểu của supabase-js suy vô tận.
 */
export function locMinhHoa<Q>(q: Q, laDemo: boolean): Q {
  // deno-lint-ignore no-explicit-any
  return laDemo ? q : (q as any).eq('is_synthetic', false);
}

/** Cùng quy tắc cho danh sách đã đọc về. */
export const duocHien = (laDemo: boolean) => (r: { is_synthetic?: boolean | null }) => laDemo || !r.is_synthetic;
