/**
 * Edge function `gioi-thieu-ngan-hang` — CƠ HỘI PHÁT TRIỂN (16/11/2026).
 *
 * Hành động (POST, JSON `{ hanh_dong, company_id?, ngon?, ... }`):
 *   - tin_hieu           : dấu hiệu tăng trưởng + nhu cầu + gói khớp + bước tiếp theo, cho công ty đang chọn.
 *   - dong_y             : { goi_id, pham_vi[], yeu_cau_lien_he, dien_thoai?, so_ngay?, hieu_phan_tich: true } — lưu lời
 *                          đồng ý, rồi lập gói giới thiệu (bản nháp) chứa ĐÚNG các trường đã chọn.
 *   - gui                : { id } — chủ bấm "Gửi": đổi trạng thái sent_by_owner + xuất gói. KHÔNG gọi ngân hàng.
 *   - thu_hoi            : { id } — rút đồng ý; gói chuyển withdrawn, nội dung gói bị xoá.
 *   - ds                 : các đồng ý và gói của công ty đang chọn.
 *   - tong_hop_van_phong : mức tăng trưởng từng khách mà người gọi làm sổ (chủ / quản trị / kế toán), không số tiền.
 *
 * Không mô hình ngôn ngữ nào tính số: mọi thứ ở `_shared/gioi-thieu-ngan-hang` (hàm thuần, có test).
 * Quyền: chủ sở hữu / quản trị cho công ty đang chọn; thành viên bị giới hạn cơ sở bị từ chối (`xu-ly.ts`).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { resolveCompanyVaiTro } from "../_shared/company.ts";
import { GIOI_HAN, laHanhDong, tongHopVanPhong, xuLy } from "../_shared/gioi-thieu-ngan-hang/xu-ly.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return loi("THAM_SO", "Thân yêu cầu không phải JSON.", 400); }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const hanhDong = body.hanh_dong;
    if (!laHanhDong(hanhDong)) return loi("THAM_SO", "Hành động không hợp lệ.", 400);

    // Văn phòng kế toán: không nhận company_id, danh mục lấy theo phiên đăng nhập (giới hạn tần suất nằm trong hàm).
    if (hanhDong === "tong_hop_van_phong") {
      const kq = await tongHopVanPhong(db, user.id);
      return json(kq.body, kq.status);
    }

    const gh = GIOI_HAN[hanhDong];
    if (!(await duocGoi(db, user.id, [{ hanh_dong: `gt_ngan_hang_${hanhDong}`, cua_so_giay: gh.cua_so_giay, toi_da: gh.toi_da }], false))) return qua429(corsHeaders);

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string }>(db, user.id, "id", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);
    const companyId = ct.cong_ty.id;

    // Phạm vi cơ sở: đọc co_so_id của chính dòng thành viên. Lỗi đọc = đóng (từ chối), không mở.
    const tv = await db.from("thanh_vien_cong_ty").select("co_so_id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle();
    if (tv.error && !/co_so_id/.test(tv.error.message)) return loi("LOI", "Chưa kiểm được quyền. Thử lại sau.", 500);

    const kq = await xuLy(db, {
      userId: user.id, email: user.email ?? null, companyId, vaiTro: ct.vai_tro, coSoId: (tv.data?.co_so_id as string | null) ?? null,
    }, hanhDong, body);
    return json(kq.body, kq.status);
  } catch (e) {
    console.error("gioi-thieu-ngan-hang:", e instanceof Error ? e.message : String(e));
    return loi("LOI_MAY_CHU", "MIMI chưa đọc được cơ hội phát triển lúc này. Thử lại sau ít phút.", 500);
  }
});
