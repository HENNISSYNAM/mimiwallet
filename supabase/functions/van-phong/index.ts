/**
 * Edge function `van-phong` — VĂN PHÒNG KẾ TOÁN (11/11/2026).
 *
 * Hành động (POST, JSON `{ hanh_dong, trang?, kich_thuoc? }`):
 *   - danh_muc_khach : mọi khách (công ty) người gọi làm sổ — chủ sở hữu, quản trị, kế toán — kèm doanh thu dạng
 *                      khoảng, tiền vào chờ xác nhận, sẵn sàng khai thuế + hạn kế tiếp, hồ sơ việc mở, bán tại quầy
 *                      hôm nay, hoạt động agent 24 giờ, và agent nào đang ở bàn khách nào. Xếp "cần làm trước".
 *
 *   - khoa_mcp_ds / khoa_mcp_tao { ten } / khoa_mcp_thu_hoi { id } : khoá MCP của CHÍNH người gọi, để agent ngoài (Claude,
 *                      Cursor…) đọc văn phòng và gửi đề xuất phân loại (22/11/2026, `_shared/mcp/ban-ke-toan.ts`).
 *
 * Không nhận `company_id`: danh mục là của NGƯỜI GỌI, lấy từ `thanh_vien_cong_ty` theo phiên đăng nhập. Không có tham
 * số nào của người gửi đi vào bộ lọc công ty. Luật và cách tính nằm ở `_shared/van-phong/danh-muc.ts` (có test).
 * Danh mục chỉ đọc; chỉ hành động khoá MCP ghi (bảng `khoa_mcp`, lọc theo người gọi).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { docDanhMucKhach, KICH_THUOC_TOI_DA } from "../_shared/van-phong/danh-muc.ts";
import { danhSachKhoaMcp, taoKhoaMcp, thuHoiKhoaMcp } from "../_shared/mcp/ban-ke-toan.ts";

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
    // deno-lint-ignore no-explicit-any
    let body: Record<string, any>;
    try { body = await req.json(); } catch { return loi("THAM_SO", "Thân yêu cầu không phải JSON.", 400); }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const hanhDong = String(body.hanh_dong ?? "");
    if (hanhDong.startsWith("khoa_mcp_")) {
      if (!(await duocGoi(db, user.id, [{ hanh_dong: "khoa_mcp", cua_so_giay: 60, toi_da: 20 }]))) return qua429(corsHeaders);
      if (hanhDong === "khoa_mcp_ds") return json({ khoa: await danhSachKhoaMcp(db, user.id) });
      const kq = hanhDong === "khoa_mcp_tao" ? await taoKhoaMcp(db, user.id, body.ten)
        : hanhDong === "khoa_mcp_thu_hoi" ? await thuHoiKhoaMcp(db, user.id, body.id)
        : null;
      if (!kq) return loi("THAM_SO", "Hành động không hợp lệ.", 400);
      return json(kq.body, kq.status);
    }
    if (hanhDong !== "danh_muc_khach") return loi("THAM_SO", "Hành động không hợp lệ.", 400);

    // Mỗi lần mở văn phòng đọc sổ của nhiều khách: giới hạn chặt hơn một trang thường.
    if (!(await duocGoi(db, user.id, [
      { hanh_dong: "van_phong_phut", cua_so_giay: 60, toi_da: 12 },
      { hanh_dong: "van_phong_gio", cua_so_giay: 3600, toi_da: 240 },
    ]))) return qua429(corsHeaders);

    const trang = Number.isInteger(body.trang) && body.trang >= 1 && body.trang <= 1000 ? body.trang : 1;
    const kichThuoc = Number.isInteger(body.kich_thuoc) && body.kich_thuoc >= 1 && body.kich_thuoc <= KICH_THUOC_TOI_DA ? body.kich_thuoc : undefined;

    const kq = await docDanhMucKhach(db, user.id, { trang, kichThuoc });
    return json(kq);
  } catch (e) {
    console.error("van-phong:", e instanceof Error ? e.message : String(e));
    return loi("LOI_MAY_CHU", "Văn phòng chưa xử lý được yêu cầu. Thử lại sau ít phút.", 500);
  }
});
