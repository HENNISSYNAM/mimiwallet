import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import type { VaiTro } from '../../supabase/functions/_shared/quyen/vai-tro.ts';

/**
 * "Công ty đang dùng" — MỘT chỗ cho cả giao diện (MIMI-P1-003, phần giao diện).
 *
 * Trước 21/09/2026, 17 chỗ trong giao diện tự đọc `companies.eq('user_id', user.id)`, tức là chỉ
 * NGƯỜI TẠO công ty mới thấy dữ liệu. Kế toán được mời vào (có dòng `thanh_vien_cong_ty`) mở
 * trang nào cũng trống, dù máy chủ đã cho họ quyền. Giờ mọi nơi hỏi ở đây:
 *
 *   1. Danh sách công ty lấy từ `thanh_vien_cong_ty` (RLS cho đọc dòng của chính mình).
 *   2. Công ty người dùng đã chọn (lưu trên máy này) nếu vẫn còn trong danh sách; không thì công
 *      ty tham gia sớm nhất — cùng quy tắc với `resolveCompanyVaiTro` ở máy chủ.
 *   3. Dự phòng cho dữ liệu cũ chưa có dòng thành viên: công ty do chính người này tạo.
 *
 * Lựa chọn chỉ lưu trong trình duyệt này (localStorage) và luôn được máy chủ kiểm lại: gửi một
 * `company_id` mình không thuộc về thì function trả 403.
 */

export interface CongTyCuaToi {
  id: string;
  ten: string | null;
  vai_tro: VaiTro;
}

const KHOA_LUU = 'mimi:cong-ty-dang-dung';
export const SU_KIEN_DOI_CONG_TY = 'mimi:cong-ty-doi';

function docLuaChon(): string | null {
  try { return localStorage.getItem(KHOA_LUU); } catch { return null; }
}

export function chonCongTy(id: string) {
  try { localStorage.setItem(KHOA_LUU, id); } catch { /* trình duyệt chặn lưu: lần sau về công ty mặc định */ }
  boNho = null;
  window.dispatchEvent(new Event(SU_KIEN_DOI_CONG_TY));
}

/** Gọi sau khi đổi tên công ty, được mời vào công ty mới… để mọi nơi đọc lại. */
export function lamMoiCongTy() {
  boNho = null;
  window.dispatchEvent(new Event(SU_KIEN_DOI_CONG_TY));
}

let boNho: Promise<{ ds: CongTyCuaToi[]; dangDung: CongTyCuaToi | null }> | null = null;

async function tai(): Promise<{ ds: CongTyCuaToi[]; dangDung: CongTyCuaToi | null }> {
  const user = await nguoiDungHienTai();
  if (!user) return { ds: [], dangDung: null };

  const { data, error } = await supabase
    .from('thanh_vien_cong_ty')
    .select('vai_tro, tao_luc, companies!inner(id, name)')
    .eq('user_id', user.id)
    .order('tao_luc', { ascending: true })
    .limit(50);
  let ds: CongTyCuaToi[] = error ? [] : ((data ?? []) as unknown as { vai_tro: VaiTro; companies: { id: string; name: string | null } | { id: string; name: string | null }[] }[])
    .flatMap((r) => {
      const ct = Array.isArray(r.companies) ? r.companies[0] : r.companies;
      return ct ? [{ id: ct.id, ten: ct.name ?? null, vai_tro: r.vai_tro }] : [];
    });

  if (!ds.length) {
    // Dữ liệu cũ: công ty do chính người này tạo, chưa có dòng thành viên.
    const { data: ct } = await supabase.from('companies').select('id, name').eq('user_id', user.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle();
    ds = ct ? [{ id: ct.id, ten: ct.name ?? null, vai_tro: 'chu_so_huu' }] : [];
  }

  const chon = docLuaChon();
  return { ds, dangDung: ds.find((c) => c.id === chon) ?? ds[0] ?? null };
}

export function danhSachCongTyCuaToi() {
  boNho ??= tai().catch((e) => { boNho = null; throw e; });
  return boNho;
}

/** Công ty đang dùng, hoặc null nếu người dùng chưa thuộc công ty nào. */
export async function congTyDangDung(): Promise<CongTyCuaToi | null> {
  return (await danhSachCongTyCuaToi()).dangDung;
}

/** Chỉ id — dùng cho các chỗ trước đây đọc `companies.select('id').eq('user_id', …)`. */
export async function idCongTyDangDung(): Promise<string | null> {
  return (await congTyDangDung())?.id ?? null;
}

/**
 * Thêm `company_id` của công ty đang chọn vào thân lời gọi edge function, nếu nơi gọi chưa tự
 * đặt. Không đọc được thì gửi như cũ — máy chủ khi đó dùng công ty mặc định (cùng quy tắc), nên
 * một lỗi đọc ở đây không bao giờ làm hỏng lời gọi.
 */
export async function kemCongTy(du: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (typeof du.company_id === 'string') return du;
  const id = await idCongTyDangDung().catch(() => null);
  return id ? { ...du, company_id: id } : du;
}
