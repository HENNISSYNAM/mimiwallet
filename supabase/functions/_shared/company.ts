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
 * Nguồn sự thật giờ là `thanh_vien_cong_ty`. `companies.user_id` vẫn được chấp nhận như chủ sở
 * hữu để dữ liệu cũ (và công ty vừa tạo trong cùng một transaction) không bị khoá ngoài.
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

  // 2) Dự phòng: công ty do chính người này tạo nhưng chưa có dòng thành viên (dữ liệu cũ, hoặc
  //    trigger chưa chạy). Chủ tạo ra công ty là chủ sở hữu.
  let q2 = supabase
    .from("companies")
    .select(chonCot)
    .eq("user_id", userId);
  if (companyId) q2 = q2.eq("id", companyId);
  const { data: ct, error: loi } = await q2.order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (loi) {
    console.error(`resolveCompany failed for user ${userId}:`, loi.message);
    return null;
  }
  return ct ? { cong_ty: ct as unknown as T, vai_tro: "chu_so_huu" } : null;
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
