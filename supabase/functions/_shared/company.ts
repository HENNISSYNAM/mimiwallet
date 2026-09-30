/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocLam, laVaiTro, type HanhDong, type VaiTro } from "./quyen/vai-tro.ts";

/**
 * Wide generics on purpose.
 *
 * The default instantiation is `SupabaseClient<any, "public", "public", …>`, and
 * a caller whose client was built from a slightly different specifier resolves
 * to a different one — same library, two incompatible shapes, and the helper
 * stopped accepting a perfectly good client. This helper only reads one table
 * with one filter, so it has no business caring which instantiation it is given.
 */
type AnySupabaseClient = SupabaseClient<any, any, any, any, any>;

/**
 * Công ty người dùng đang làm việc cùng, KÈM vai trò của họ trong công ty đó (MIMI-P1-003).
 *
 * Trước 18/09/2026 hàm này chỉ trả công ty cũ nhất mà `companies.user_id` trỏ tới, nên:
 *   - người thuộc nhiều công ty không chọn được công ty đang làm;
 *   - mọi thành viên đều có quyền như chủ, vì không có vai trò nào để kiểm.
 *
 * Nguồn sự thật DUY NHẤT là `thanh_vien_cong_ty` (từ 30/09/2026 không còn dự phòng theo `companies.user_id`:
 * người tạo công ty đã bị gỡ thì không được vào lại).
 *
 * `columns` được truyền thẳng cho `.select()` để nơi gọi cần thêm cột không phải truy vấn hai lần.
 */
export interface CongTyDangDung<T> {
  cong_ty: T;
  vai_tro: VaiTro;
}

export async function resolveCompanyVaiTro<T extends { id: string }>(
  supabase: AnySupabaseClient,
  userId: string,
  columns = "id",
  /** Công ty người dùng chọn trên giao diện; không thuộc công ty đó thì trả null. */
  companyId?: string | null,
): Promise<CongTyDangDung<T> | null> {
  const chonCot = columns.includes("id") ? columns : `id, ${columns}`;

  // 1) Thành viên: nguồn sự thật cho vai trò.
  let q = supabase
    .from("thanh_vien_cong_ty")
    .select(`vai_tro, tao_luc, companies!inner(${chonCot})`)
    .eq("user_id", userId);
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q.order("tao_luc", { ascending: true }).limit(1).maybeSingle();

  if (error) {
    console.error(`resolveCompany (thanh_vien) failed for user ${userId}:`, error.message);
  } else if (data) {
    const dong = data as unknown as { vai_tro: string; companies: T | T[] };
    const ct = (Array.isArray(dong.companies) ? dong.companies[0] : dong.companies) as T | undefined;
    if (ct && laVaiTro(dong.vai_tro)) return { cong_ty: ct, vai_tro: dong.vai_tro };
  }

  // Không có dòng thành viên thì KHÔNG có quyền. Trước 30/09/2026 ở đây có đường dự phòng theo
  // `companies.user_id`, nhưng đó là người TẠO công ty chứ không phải thành viên hiện tại: chủ khác gỡ
  // người tạo khỏi `thanh_vien_cong_ty` mà họ vẫn vào lại được với vai chủ sở hữu. Công ty cũ đã được
  // backfill dòng thành viên (migration 18/09 và 30/09), nên không còn ai cần đường này.
  // Truy vấn thành viên lỗi cũng trả null: lỗi thì đóng, không mở.
  return null;
}

/** Bản cũ: chỉ cần công ty, không cần vai trò. Giữ cho các function chưa kiểm quyền. */
export async function resolveCompany<T extends { id: string }>(
  supabase: AnySupabaseClient,
  userId: string,
  columns = "id",
  companyId?: string | null,
): Promise<T | null> {
  const r = await resolveCompanyVaiTro<T>(supabase, userId, columns, companyId);
  return r?.cong_ty ?? null;
}

/** Danh sách công ty người dùng thuộc về, để giao diện cho chọn. */
export async function danhSachCongTy(
  supabase: AnySupabaseClient,
  userId: string,
): Promise<{ id: string; ten: string | null; vai_tro: VaiTro }[]> {
  const { data, error } = await supabase
    .from("thanh_vien_cong_ty")
    .select("vai_tro, tao_luc, companies!inner(id, name)")
    .eq("user_id", userId)
    .order("tao_luc", { ascending: true })
    .limit(50);
  if (error) {
    console.error(`danhSachCongTy failed for user ${userId}:`, error.message);
    return [];
  }
  return (data ?? []).flatMap((r: any) => {
    const ct = Array.isArray(r.companies) ? r.companies[0] : r.companies;
    if (!ct || !laVaiTro(r.vai_tro)) return [];
    return [{ id: String(ct.id), ten: ct.name ?? null, vai_tro: r.vai_tro as VaiTro }];
  });
}

/** Lỗi quyền — edge function bắt và trả 403 kèm câu nói rõ vai trò nào làm được. */
export class LoiQuyen extends Error {
  constructor(public vai_tro: VaiTro, public hanh_dong: HanhDong, cau: string) {
    super(cau);
    this.name = "LoiQuyen";
  }
}

/** Cửa kiểm quyền ở backend. Ném `LoiQuyen` khi vai trò không được phép. */
export function kiemQuyen(vai: VaiTro, hanhDong: HanhDong, cau: string): void {
  if (!duocLam(vai, hanhDong)) throw new LoiQuyen(vai, hanhDong, cau);
}
