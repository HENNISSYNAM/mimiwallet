/**
 * Doanh thu đã xác minh (10/11/2026) — báo cáo doanh thu chủ hộ lập từ sổ MIMI, băm SHA-256, neo mã băm lên
 * OpenTimestamps, chia sẻ có đồng ý cho một người nhận. Xử lý nằm ở `_shared/xac-minh/xu-ly.ts` (có test).
 *
 * Ba nhóm người gọi:
 *   - Chủ sở hữu / quản trị (JWT người dùng): `tao_bao_cao`, `ds`, `chia_se` (trả mã MỘT lần), `thu_hoi`,
 *     `neo_lai_bao_cao`. Thành viên khác chỉ `ds` (không thấy chia sẻ). Thành viên bị giới hạn một cơ sở: từ chối hết.
 *   - Người nhận (không đăng nhập, khoá anon): `xem_cong_khai` với mã trong đường dẫn. Chỉ báo cáo, mã băm, trạng thái
 *     neo. Giới hạn tần suất theo IP đã băm, chống dò mã, ghi nhật ký mở.
 *   - Lịch chạy (pg_cron → `goi_doanh_thu_xac_minh`, header `x-cron-secret`): `neo_lai`.
 *
 * Không mô hình ngôn ngữ nào ở đây. Chỉ mã băm 32 byte rời MIMI.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompanyVaiTro } from "../_shared/company.ts";
import { idTuIp, ipNguoiGoi } from "../_shared/an-ninh/gioi-han.ts";
import { neoLai, xemCongKhai, xuLyNguoiDung, type KetQua } from "../_shared/xac-minh/xu-ly.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...(status === 429 ? { "Retry-After": "60" } : {}) },
  });
const tra = (k: KetQua) => json(k.body, k.status);
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

function bangNhau(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  if (Number(req.headers.get("content-length") ?? 0) > 10_000) return loi("QUA_LON", "Dữ liệu gửi lên quá lớn.", 413);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // deno-lint-ignore no-explicit-any
    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      return loi("JSON", "Thân yêu cầu không phải JSON.", 400);
    }
    const hanhDong = String(body.hanh_dong ?? "");

    if (hanhDong === "neo_lai") {
      const biMat = Deno.env.get("BILLING_CRON_SECRET") ?? "";
      if (!biMat || !bangNhau(req.headers.get("x-cron-secret") ?? "", biMat)) return loi("KHONG_QUYEN", "Không có quyền.", 401);
      return json({ ket_qua: await neoLai(db) });
    }

    if (hanhDong === "xem_cong_khai") return tra(await xemCongKhai(db, await idTuIp(ipNguoiGoi(req), "mimi-xac-minh-v1"), body));

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);
    const ctVai = await resolveCompanyVaiTro<{ id: string }>(db, user.id, "id", typeof body.company_id === "string" ? body.company_id : null);
    if (!ctVai) return loi("KHONG_CO_CONG_TY", "Chưa có công ty.", 404);
    const companyId = ctVai.cong_ty.id;
    const { data: tv } = await db.from("thanh_vien_cong_ty").select("co_so_id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle();

    return tra(await xuLyNguoiDung(db, { userId: user.id, companyId, vaiTro: ctVai.vai_tro, coSoId: tv?.co_so_id ?? null }, hanhDong, body));
  } catch (e) {
    console.error("doanh-thu-xac-minh:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "Lỗi hệ thống khi lập báo cáo doanh thu.", 500);
  }
});
