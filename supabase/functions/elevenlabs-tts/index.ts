/**
 * Đọc câu trả lời thành giọng nói (ElevenLabs — API TRẢ TIỀN theo ký tự).
 *
 * Lỗ đã vá 25/09/2026: function này chỉ dựa vào `verify_jwt`, mà khoá anon công khai trong trang web cũng
 * là một JWT hợp lệ — ai mở trang lấy được khoá là gọi được, văn bản dài tuỳ ý, không giới hạn lần. Bot
 * có thể đốt hết hạn mức ElevenLabs. Giờ:
 *   - bắt buộc phiên người dùng thật (`auth.getUser`), khoá anon bị từ chối;
 *   - tối đa 1000 ký tự một lần;
 *   - 20 lần / 10 phút và 100 lần / ngày mỗi người, 60 lần / 10 phút mỗi IP;
 *   - bộ đếm lỗi thì TỪ CHỐI (việc tốn tiền).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, idTuIp, ipNguoiGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const DO_DAI_TOI_DA = 1000;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Chỉ nhận POST." }, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // IP trước cả xác thực: chặn bot dội yêu cầu kể cả khi không có phiên.
    if (!(await duocGoi(db, await idTuIp(ipNguoiGoi(req)), [{ hanh_dong: "tts_ip", cua_so_giay: 600, toi_da: 60 }], true))) return qua429(corsHeaders, 600);

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Cần đăng nhập." }, 401);
    const { data: { user }, error: loiAuth } = await db.auth.getUser(token);
    if (loiAuth || !user) return json({ error: "Cần đăng nhập." }, 401);

    const body = await req.json().catch(() => null) as { text?: unknown } | null;
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return json({ error: "Không có nội dung để đọc." }, 400);
    if (text.length > DO_DAI_TOI_DA) return json({ error: `Tối đa ${DO_DAI_TOI_DA} ký tự một lần.` }, 400);

    if (!(await duocGoi(db, user.id, [
      { hanh_dong: "tts_10p", cua_so_giay: 600, toi_da: 20 },
      { hanh_dong: "tts_ngay", cua_so_giay: 86_400, toi_da: 100 },
    ], true))) return qua429(corsHeaders, 600);

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) return json({ error: "Chưa bật đọc giọng nói." }, 503);

    // Giọng Sarah — đọc tiếng Việt tốt.
    const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL?output_format=mp3_44100_128", {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: 1.0 },
      }),
    });
    if (!response.ok) {
      console.error("ElevenLabs:", response.status);
      return json({ error: "Chưa đọc được lúc này." }, 502);
    }
    return new Response(await response.arrayBuffer(), { headers: { ...corsHeaders, "Content-Type": "audio/mpeg" } });
  } catch (e) {
    console.error("tts:", e instanceof Error ? e.message : e);
    return json({ error: "Chưa đọc được lúc này." }, 500);
  }
});
