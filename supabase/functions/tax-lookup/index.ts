import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cauHinhXInvoice, traCuuMst } from "../_shared/mst/tra-cuu.ts";

// Cùng bộ header với các function khác trong repo; chưa có module dùng chung.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Tra cứu người nộp thuế qua XInvoice (dữ liệu từ Tổng cục Thuế).
 *
 * Thay cho cách cũ: gọi Firecrawl scrape trang masothue.com rồi bắt tên bằng regex trên
 * markdown — hỏng im lặng theo ba đường (trang đổi bố cục, hết hạn mức, regex bắt nhầm dòng).
 *
 * Phần tra và chọn bản ghi nằm ở `_shared/mst/tra-cuu.ts` (có test, dữ liệu mẫu Vinamilk),
 * dùng chung với `to-khai` — nơi ghi kết quả vào hồ sơ công ty để MIMI không hỏi lại.
 *
 * PHẢI ĐĂNG NHẬP (24/09/2026). Trước đó ai cầm khoá công khai của trang web cũng gọi được,
 * không giới hạn — tức là một cổng miễn phí vào API trả phí của MIMI, và một công cụ dò hàng
 * loạt mã số thuế. Giờ cần phiên đăng nhập và mỗi người tối đa 30 lần mỗi phút.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Cần đăng nhập." }, 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);

    const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
      p_user: user.id, p_hanh_dong: "tax_lookup", p_cua_so_giay: 60, p_toi_da: 30,
    });
    if (loiDem) console.error("tax-lookup gioi han:", loiDem.message);
    else if (duoc === false) return json({ error: "Tra hơi nhanh. Đợi khoảng một phút rồi thử lại." }, 429);

    const { taxCode } = await req.json().catch(() => ({ taxCode: "" }));
    const ma = String(taxCode ?? "").trim();

    const cfg = cauHinhXInvoice();
    if (!cfg) {
      console.error("thiếu XINVOICE_CLIENT_ID hoặc XINVOICE_API_KEY");
      return json({ error: "Chưa cấu hình tra cứu mã số thuế" }, 503);
    }

    const kq = await traCuuMst(ma, cfg);
    if (kq.trang_thai === "loi") {
      // Không in mã số thuế vào log: với hộ kinh doanh đó là số định danh cá nhân.
      console.error("tax-lookup:", kq.cau);
      return json({ found: false, error: kq.cau }, kq.ma_http ?? 502);
    }
    if (kq.trang_thai === "khong_thay") return json({ found: false });

    const r = kq.ban_ghi;
    return json({
      found: true,
      record: {
        taxID: r.taxID ?? ma,
        name: r.name ?? "",
        address: r.address ?? "",
        orgType: r.orgType ?? "",
        taxDepartment: r.taxDepartment ?? "",
        status: r.status ?? "",
      },
      // Phía giao diện dùng hai số này để nói thật với khách thay vì âm thầm
      // điền: bao nhiêu bản ghi cùng mã, và bản đang điền có còn hiệu lực không.
      tongSoBanGhi: kq.tong_so_ban_ghi,
      soConHoatDong: kq.so_con_hoat_dong,
      conHoatDong: kq.con_hoat_dong,
    });
  } catch (e) {
    console.error("tax-lookup lỗi", e instanceof Error ? e.message : e);
    return json({ error: "Lỗi không xác định" }, 500);
  }
});
