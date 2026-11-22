/**
 * MCP server của MIMI cho BÀN KẾ TOÁN (22/11/2026), chạy trên Supabase Edge Functions.
 *
 * Địa chỉ: https://<project>.supabase.co/functions/v1/mcp
 * Khoá:    header `x-mimi-key: mimi_ak_…` hoặc `Authorization: Bearer mimi_ak_…` — tạo ở Văn phòng kế toán → Kết nối agent.
 *
 * Nối vào Claude Code:
 *   claude mcp add --transport http mimi <địa chỉ> --header "x-mimi-key: mimi_ak_…"
 *
 * Giao thức ở `_shared/mcp/may-chu.ts`; xác thực khoá + công cụ ở `_shared/mcp/ban-ke-toan.ts` (đều có test).
 * File này chỉ nối chúng với HTTP, chống dò khoá theo IP và giới hạn tần suất theo người.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { daBiKhoaViSai, duocGoi, ghiLanSai, idTuIp, ipNguoiGoi } from "../_shared/an-ninh/gioi-han.ts";
import { HEADER_KHOA_MCP, xuLyMcp, type KetQuaChay } from "../_shared/mcp/may-chu.ts";
import { chayCongCuMcp, xacThucKhoaMcp } from "../_shared/mcp/ban-ke-toan.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    `authorization, content-type, accept, mcp-session-id, mcp-protocol-version, last-event-id, ${HEADER_KHOA_MCP}`,
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Khoá tới bằng header riêng, hoặc Bearer — nhiều client MCP chỉ cho đặt Bearer. */
function docKhoa(req: Request): string | null {
  const rieng = req.headers.get(HEADER_KHOA_MCP)?.trim();
  if (rieng) return rieng;
  const auth = req.headers.get("Authorization")?.trim() ?? "";
  const m = auth.match(/^Bearer\s+(mimi_ak_\S+)$/i);
  return m ? m[1] : null;
}

const loi = (ma: string, cau: string, status: number): KetQuaChay => ({ status, body: { error: cau, ma } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  // Không mở luồng SSE: GET trả 405 đúng như giao thức cho phép.
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...corsHeaders, Allow: "POST, OPTIONS" } });

  let tin: unknown;
  try { tin = await req.json(); } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const khoa = docKhoa(req);
  // Bắt tay và liệt kê công cụ không chạm database.
  let db: ReturnType<typeof createClient> | null = null;
  const layDb = () => (db ??= createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""));

  try {
    const ra = await xuLyMcp(tin, {
      coKhoa: Boolean(khoa),
      chay: async (ten, doiSo) => {
        const khoaIp = await idTuIp(ipNguoiGoi(req), "mcp");
        if (await daBiKhoaViSai(layDb(), khoaIp, "sai_khoa_mcp")) return loi("THU_SAI_QUA_NHIEU", "Thử sai quá nhiều lần. Đợi 10 phút.", 429);
        const k = await xacThucKhoaMcp(layDb(), khoa);
        if (!k) {
          await ghiLanSai(layDb(), khoaIp, "sai_khoa_mcp");
          return loi("KHOA_SAI", "Khoá MCP không đúng hoặc đã bị thu hồi.", 401);
        }
        // Mỗi lần đọc danh mục là đọc sổ của nhiều khách: giới hạn theo NGƯỜI (mọi khoá của họ chung một bộ đếm).
        if (!(await duocGoi(layDb(), k.user_id, [
          { hanh_dong: "mcp_phut", cua_so_giay: 60, toi_da: 30 },
          { hanh_dong: "mcp_gio", cua_so_giay: 3600, toi_da: 600 },
        ]))) return loi("QUA_NHIEU", "Gọi hơi dồn. Đợi một phút rồi thử lại.", 429);
        return await chayCongCuMcp(layDb(), k, ten, doiSo);
      },
    });
    if (ra === null) return new Response(null, { status: 202, headers: corsHeaders });
    return json(ra);
  } catch (e) {
    console.error("mcp:", e instanceof Error ? e.message : String(e));
    return json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal error" } }, 500);
  }
});
