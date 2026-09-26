/**
 * MCP server của MIMI, chạy trên Supabase Edge Functions.
 *
 * Địa chỉ: https://<project>.supabase.co/functions/v1/mcp
 * Khoá:    header `x-mimi-agent-key: mimi_ak_…` hoặc `Authorization: Bearer mimi_ak_…`
 *
 * Nối vào Claude Code:
 *   claude mcp add --transport http mimi <địa chỉ> --header "x-mimi-agent-key: mimi_ak_…"
 *
 * Giao thức nằm ở `_shared/mcp/may-chu.ts` (có test). Việc thật — xét chính
 * sách, ghi yêu cầu, nhật ký — nằm ở `_shared/tac-tu/cong-tac-tu.ts`, dùng chung
 * với API HTTP `tac-tu`. File này chỉ nối hai thứ đó với HTTP.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { daBiKhoaViSai, ghiLanSai, idTuIp, ipNguoiGoi } from "../_shared/an-ninh/gioi-han.ts";
import { xuLyMcp, type KetQuaChay } from "../_shared/mcp/may-chu.ts";
import { goiTacTu } from "../_shared/tac-tu/cong-tac-tu.ts";
import { HEADER_KHOA } from "../_shared/tac-tu/khoa.ts";
import { DANH_SACH_NGAN_HANG, timNganHang } from "../_shared/bank/ngan-hang.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    `authorization, content-type, accept, mcp-session-id, mcp-protocol-version, last-event-id, ${HEADER_KHOA}`,
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Khoá có thể tới bằng header riêng, hoặc Bearer — nhiều client MCP chỉ cho đặt Bearer. */
function docKhoa(req: Request): string | null {
  const rieng = req.headers.get(HEADER_KHOA)?.trim();
  if (rieng) return rieng;
  const auth = req.headers.get("Authorization")?.trim() ?? "";
  const m = auth.match(/^Bearer\s+(mimi_ak_\S+)$/i);
  return m ? m[1] : null;
}

function traNganHang(doiSo: Record<string, unknown>): KetQuaChay {
  const ten = String(doiSo.ten ?? "").trim();
  const gon = (n: { bin: string; ten: string; tenDayDu: string }) => ({ bin: n.bin, ten: n.ten, ten_day_du: n.tenDayDu });
  if (!ten) return { status: 200, body: { ngan_hang: DANH_SACH_NGAN_HANG.map(gon) } };
  const n = timNganHang(ten);
  if (!n) {
    return {
      status: 404,
      body: { error: `Không nhận ra ngân hàng "${ten}".`, co_the_la: DANH_SACH_NGAN_HANG.map((x) => x.ten) },
    };
  }
  return { status: 200, body: { ngan_hang: [gon(n)] } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  // Không mở luồng SSE: GET trả 405 đúng như giao thức cho phép.
  if (req.method !== "POST") {
    return new Response(null, { status: 405, headers: { ...corsHeaders, Allow: "POST, OPTIONS" } });
  }

  let tin: unknown;
  try {
    tin = await req.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400);
  }

  const khoa = docKhoa(req);
  // Tạo client khi thật sự cần: bắt tay và liệt kê công cụ không chạm database.
  let db: ReturnType<typeof createClient> | null = null;
  const layDb = () =>
    (db ??= createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""));

  try {
    const ra = await xuLyMcp(tin, {
      coKhoa: Boolean(khoa),
      chay: async (ten, doiSo) => {
        if (ten === "tra_ma_ngan_hang") return traNganHang(doiSo);
        // Chống dò khoá agent — cùng bộ đếm với `tac-tu`, nên đổi cửa không lách được.
        const khoaIp = await idTuIp(ipNguoiGoi(req), "tac-tu");
        if (await daBiKhoaViSai(layDb(), khoaIp, "sai_khoa_agent")) return { status: 429, body: { error: "Thử sai quá nhiều lần. Đợi 10 phút.", ma: "THU_SAI_QUA_NHIEU" } };
        const kq = await goiTacTu(layDb(), khoa!, ten, doiSo);
        if ((kq.body as { ma?: string })?.ma === "KHOA_SAI") await ghiLanSai(layDb(), khoaIp, "sai_khoa_agent");
        return kq;
      },
    });
    if (ra === null) return new Response(null, { status: 202, headers: corsHeaders });
    return json(ra);
  } catch (e) {
    console.error("mcp:", e);
    return json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal error" } }, 500);
  }
});
