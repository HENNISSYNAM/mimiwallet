/**
 * `chat` — ĐÃ GỘP vào `tro-ly` (MIMI-P0-001, 17/09/2026).
 *
 * Trước đây đây là bộ não thứ hai của trợ lý: prompt riêng, nguồn dữ liệu riêng, định nghĩa
 * số liệu riêng (gọi dòng tiền ngân hàng là "doanh thu", còn khuyên vay và ứng vốn hoá đơn —
 * định vị đã bỏ từ 17/08/2026), và tổng giao dịch không phân trang. Cùng câu hỏi có thể ra hai
 * câu trả lời khác nhau.
 *
 * Giờ function này không còn logic tài chính nào. Nó chỉ giữ tương thích cho bản giao diện cũ
 * còn nằm trong bộ nhớ đệm trình duyệt: chuyển câu hỏi cuối sang `tro-ly` (hành động `hoi`, cùng
 * phiên đăng nhập, cùng kiểm quyền và giới hạn tần suất), rồi trả lời theo dạng SSE cũ.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TinNhan = { role?: unknown; content?: unknown };

/** Trả văn bản theo dạng SSE delta mà widget cũ đọc được. */
function traSse(text: string, status = 200): Response {
  const enc = new TextEncoder();
  const body = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(enc.encode(body), { status, headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

/** Lịch sử dạng OpenAI → dạng `tro-ly` (tối đa 6 tin, như `tro-ly` tự cắt). */
export function doiLichSu(ds: TinNhan[]): { vai: "nguoi_dung" | "tro_ly"; noi_dung: string }[] {
  return ds
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ vai: m.role === "user" ? "nguoi_dung" as const : "tro_ly" as const, noi_dung: String(m.content).slice(0, 1000) }))
    .slice(-6);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(null, { status: 405, headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth) return traSse("Cần đăng nhập để MIMI đọc dữ liệu công ty.", 401);

  let tin: TinNhan[] = [];
  try {
    const body = await req.json();
    tin = Array.isArray(body?.messages) ? body.messages : [];
  } catch {
    return traSse("Yêu cầu không hợp lệ.", 400);
  }
  const iCuoi = tin.map((m) => m.role).lastIndexOf("user");
  const cau = iCuoi >= 0 && typeof tin[iCuoi].content === "string" ? String(tin[iCuoi].content).trim() : "";
  if (!cau) return traSse("Bạn chưa nhập câu hỏi.", 400);

  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/tro-ly`, {
      method: "POST",
      headers: {
        Authorization: auth,
        apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ hanh_dong: "hoi", cau: cau.slice(0, 1000), pham_vi: null, lich_su: doiLichSu(tin.slice(0, iCuoi)) }),
      signal: AbortSignal.timeout(25_000),
    });
    const kq = await res.json().catch(() => ({}));
    if (!res.ok || typeof kq?.cau !== "string") {
      return traSse(typeof kq?.error === "string" ? kq.error : "MIMI chưa trả lời được. Thử lại sau ít phút.", res.ok ? 502 : res.status);
    }
    return traSse(kq.cau);
  } catch (e) {
    console.error("chat -> tro-ly:", e instanceof Error ? e.message : e);
    return traSse("MIMI chưa trả lời được. Thử lại sau ít phút.", 502);
  }
});
