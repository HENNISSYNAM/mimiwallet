/**
 * `ai-trung-gian` — chuyển câu hỏi từ máy chủ MIMI thật sang Lovable AI (26/09/2026).
 *
 * CHẠY Ở ĐÂU. Function này dành cho dự án Lovable Cloud (nơi Lovable tự cấp `LOVABLE_API_KEY`). Deploy lên
 * dự án khác không có khoá đó thì nó chỉ trả 503 — không làm gì.
 *
 * AI ĐƯỢC GỌI. Chỉ máy chủ MIMI (`tro-ly`), bằng mã bí mật chung `MIMI_TRUNG_GIAN_KEY` trong
 * `Authorization: Bearer …` — so sánh thời gian không đổi. Tắt verify_jwt ở config.toml vì người gọi là
 * máy chủ khác, không có phiên người dùng của dự án này.
 *
 * KHÔNG LOG NỘI DUNG. Câu hỏi có số liệu của công ty: chỉ ghi mã trạng thái và độ trễ.
 * Phần kiểm và lọc thân yêu cầu ở `_shared/ai/trung-gian.ts` (có test).
 */
import { DO_DAI_KHOA_TOI_THIEU, khoaNguoiGoi, kiemYeuCauTrungGian, safeEqual, TOI_DA_BYTE } from "../_shared/ai/trung-gian.ts";

const DIEM_GOI_LOVABLE = "https://ai.gateway.lovable.dev/v1/chat/completions";
const HET_GIO_MS = 60_000;

const traLoi = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return traLoi(405, { error: "Chỉ nhận POST." });

  const khoaChung = Deno.env.get("MIMI_TRUNG_GIAN_KEY") ?? "";
  const khoaLovable = Deno.env.get("LOVABLE_API_KEY") ?? "";
  // Thiếu cấu hình: không nói thiếu cái nào (không giúp kẻ dò).
  if (khoaChung.length < DO_DAI_KHOA_TOI_THIEU || !khoaLovable) return traLoi(503, { error: "Trung gian chưa được cấu hình." });

  const presented = khoaNguoiGoi(req.headers.get("authorization"));
  if (!safeEqual(presented, khoaChung)) return traLoi(401, { error: "Không được phép." });

  if (Number(req.headers.get("content-length") ?? "0") > TOI_DA_BYTE) return traLoi(413, { error: "Yêu cầu quá lớn." });
  const tho = await req.text();
  if (tho.length > TOI_DA_BYTE) return traLoi(413, { error: "Yêu cầu quá lớn." });

  let duLieu: unknown;
  try { duLieu = JSON.parse(tho); } catch { return traLoi(400, { error: "Thân yêu cầu không phải JSON." }); }
  const k = kiemYeuCauTrungGian(duLieu);
  if (k.ok === false) return traLoi(k.status, { error: k.cau });

  const batDau = Date.now();
  try {
    const res = await fetch(DIEM_GOI_LOVABLE, {
      method: "POST",
      headers: { Authorization: `Bearer ${khoaLovable}`, "Content-Type": "application/json" },
      body: JSON.stringify(k.body),
      signal: AbortSignal.timeout(HET_GIO_MS),
    });
    const noiDung = await res.text();
    console.log(`ai-trung-gian: ${res.status} ${Date.now() - batDau}ms`);
    // Trả nguyên mã trạng thái (402/429 để tro-ly quay về chế độ dự phòng đúng cách) và thân phản hồi.
    return new Response(noiDung, { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(`ai-trung-gian: lỗi mạng ${e instanceof Error ? e.name : "?"} ${Date.now() - batDau}ms`);
    return traLoi(502, { error: "Không gọi được Lovable AI." });
  }
});
