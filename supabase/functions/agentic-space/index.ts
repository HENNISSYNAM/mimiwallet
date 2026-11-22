/**
 * Edge function `agentic-space` — AGENTIC AI SPACE (22/11/2026): người giao việc, agent nhận việc.
 *
 * Hành động (POST JSON `{ hanh_dong, ... }`, phiên đăng nhập):
 *   bang                         : bảng việc + trạng thái agent + danh sách khách người gọi làm sổ
 *   tin { id }                   : luồng tin của một việc
 *   tao { company_id, cau, han?, agent? } : giao việc bằng một câu; agent lập kế hoạch và chạy ngay
 *   tiep_tuc { id }              : chạy tiếp (sau khi người đã duyệt ở hàng duyệt)
 *   xong { id }                  : người xác nhận đã làm phần của mình (ví dụ đã nộp tờ khai)
 *   huy { id }                   : huỷ việc (và việc con đang mở)
 *
 * Luật ở `_shared/space/` (có test). Mô hình AI chỉ dùng ở Agent Phân loại để ĐỀ XUẤT loại cho khoản không có dấu hiệu
 * rõ; trừ xu theo chi phí thật; không đọc được xu / hết xu → không gọi, nói rõ trong luồng tin.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { chonCongMoHinh, coDo, nhaCungCapCua, type LanGoi } from "../_shared/ai/nha-cung-cap.ts";
import { docXuTruocLuot, truXuSauLuot } from "../_shared/xu/so-xu.ts";
import { homNayVN } from "../_shared/van-phong/danh-muc.ts";
import { cauHoiAi, docTraLoiAi, LOI_DAN_AI } from "../_shared/space/ai-phan-loai.ts";
import type { CongCuAgent } from "../_shared/space/dong-co.ts";
import { danhDauXong, docBangViec, docTinViec, huyViec, LoiSpace, taoViecSpace, tiepTucViec } from "../_shared/space/kho.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

// deno-lint-ignore no-explicit-any
type Db = any;

function taoCongCu(db: Db): (companyId: string) => CongCuAgent {
  const cong = chonCongMoHinh({
    stali: Deno.env.get("STALI_API_KEY"), moHinhStali: Deno.env.get("STALI_MODEL"),
    lovable: Deno.env.get("LOVABLE_API_KEY"),
    openrouter: Deno.env.get("OPENROUTER_API_KEY"), moHinhOpenRouter: Deno.env.get("OPENROUTER_MODEL"),
  });
  return (companyId) => ({
    aiPhanLoai: cong ? async (ds) => {
      const xu = await docXuTruocLuot(db, companyId, homNayVN(Date.now())).catch(() => null);
      if (!xu) return { y: [], ly_do_khong: "chưa đọc được số xu" };
      if (xu.so_du < 1) return { y: [], ly_do_khong: "hết xu tháng này" };
      const lanGoi: LanGoi[] = [];
      const ncc = coDo(nhaCungCapCua(cong), "phan_loai", (l) => {
        lanGoi.push(l);
        void db.from("lan_goi_mo_hinh").insert({ company_id: companyId, ...l }).then(({ error }: { error: { message: string } | null }) => {
          if (error) console.error("ghi lần gọi mô hình:", error.message);
        });
      });
      try {
        const r = await ncc.hoi({
          mo_hinh: cong.mo_hinh, han_ms: 20_000,
          tin: [{ vai: "he_thong", noi_dung: LOI_DAN_AI }, { vai: "nguoi_dung", noi_dung: cauHoiAi(ds) }],
        });
        return { y: docTraLoiAi(r.noi_dung, new Set(ds.map((d) => d.phan_loai!.transaction_id))) };
      } catch (e) {
        console.error("agentic-space ai:", e instanceof Error ? e.message : e);
        return { y: [], ly_do_khong: "mô hình không phản hồi" };
      } finally {
        if (lanGoi.length) await truXuSauLuot(db, companyId, xu, lanGoi, "agentic_space").catch((e) => console.error("space xu:", e instanceof Error ? e.message : e));
      }
    } : undefined,
  });
}

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
    const ghi = ["tao", "tiep_tuc", "xong", "huy"].includes(hanhDong);
    if (!(await duocGoi(db, user.id, ghi
      ? [{ hanh_dong: "space_ghi_phut", cua_so_giay: 60, toi_da: 12 }, { hanh_dong: "space_ghi_gio", cua_so_giay: 3600, toi_da: 200 }]
      : [{ hanh_dong: "space_doc_phut", cua_so_giay: 60, toi_da: 30 }]))) return qua429(corsHeaders);

    const id = String(body.id ?? "");
    const cc = taoCongCu(db);
    switch (hanhDong) {
      case "bang": return json(await docBangViec(db, user.id));
      case "tin": return json(await docTinViec(db, user.id, id));
      case "tao": {
        const moi = await taoViecSpace(db, user.id, { company_id: body.company_id, cau: body.cau, han: body.han }, cc, body.agent);
        return json({ id: moi });
      }
      case "tiep_tuc": await tiepTucViec(db, user.id, id, cc); return json({ ok: true });
      case "xong": await danhDauXong(db, user.id, id, cc); return json({ ok: true });
      case "huy": await huyViec(db, user.id, id); return json({ ok: true });
      default: return loi("THAM_SO", "Hành động không hợp lệ.", 400);
    }
  } catch (e) {
    if (e instanceof LoiSpace) return loi(e.ma, e.message, e.status);
    console.error("agentic-space:", e instanceof Error ? e.message : String(e));
    return loi("LOI_MAY_CHU", "Agentic AI Space chưa xử lý được. Thử lại sau ít phút.", 500);
  }
});
