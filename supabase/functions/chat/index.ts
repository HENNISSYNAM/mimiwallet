import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

const FACTOR_LABELS: Record<string, string> = {
  revenueTrend: "xu hướng doanh thu",
  expenseToIncomeRatio: "tỷ lệ chi phí/doanh thu",
  invoicePunctuality: "độ đúng hạn thanh toán hóa đơn",
  loanRepaymentRatio: "tỷ lệ trả nợ vay",
  cashFlowVolatility: "ổn định dòng tiền",
};

/** Concrete, actionable advice per weak credit factor (mirrors the Learn lessons). */
const FACTOR_ADVICE: Record<string, string> = {
  revenueTrend:
    "Giữ đà tăng doanh thu đều đặn thay vì tăng vọt rồi tụt: ưu tiên giữ chân khách cũ, bán kèm/nâng cấp để tăng giá trị đơn hàng, và đảm bảo mọi khoản thu đều được ghi nhận vào hệ thống.",
  expenseToIncomeRatio:
    "Kéo tỷ lệ chi phí xuống dưới ~60% doanh thu: rà soát chi phí cố định lớn nhất để đàm phán lại, cắt các dịch vụ không dùng, và gộp đơn nhập hàng để lấy chiết khấu.",
  invoicePunctuality:
    "Siết quy trình thu hồi công nợ: ghi rõ hạn thanh toán, nhắc khách trước hạn 3 ngày, nhắc ngay ngày quá hạn đầu tiên, và cân nhắc chiết khấu nhỏ cho khách trả sớm.",
  loanRepaymentRatio:
    "Duy trì kỷ luật trả nợ đúng tiến độ: đặt nhắc/tự động trích trả, chỉ vay trong khả năng dòng tiền, và chủ động thương lượng giãn nợ TRƯỚC khi trễ hạn.",
  cashFlowVolatility:
    "Làm phẳng dòng tiền: xây nguồn thu định kỳ (hợp đồng dài hạn), rải lịch thu–chi tránh dồn cục, và giữ quỹ dự phòng 1–3 tháng chi phí.",
};

interface BizContext {
  companyName: string;
  score: number | null;
  pd: number | null;
  creditLimit: number | null;
  factors: { name: string; label: string; score: number }[]; // ascending (weakest first)
  income3m: number;
  expense3m: number;
  overdueCount: number;
  overdueTotal: number;
  pendingCount: number;
  pendingTotal: number;
  loanCount: number;
  loanOutstanding: number;
}

/**
 * Reads the caller's real business data (credit score + factors, 3-month cash
 * flow, invoices, loans) so answers are grounded in their own numbers.
 * Never touches KYC / identity data. Returns null if the user isn't identifiable.
 */
async function buildContext(authHeader: string | null): Promise<BizContext | null> {
  try {
    if (!authHeader) return null;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return null;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return null;

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("user_id", user.id)
      .single();
    if (!company) return null;

    const ctx: BizContext = {
      companyName: company.name,
      score: null, pd: null, creditLimit: null, factors: [],
      income3m: 0, expense3m: 0,
      overdueCount: 0, overdueTotal: 0, pendingCount: 0, pendingTotal: 0,
      loanCount: 0, loanOutstanding: 0,
    };

    const { data: snap } = await supabase
      .from("credit_score_snapshots")
      .select("id, score, credit_limit, probability_of_default")
      .eq("company_id", company.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snap) {
      ctx.score = snap.score;
      ctx.pd = snap.probability_of_default;
      ctx.creditLimit = snap.credit_limit;
      const { data: factors } = await supabase
        .from("credit_score_factors")
        .select("factor_name, normalized_score")
        .eq("snapshot_id", snap.id);
      ctx.factors = (factors ?? [])
        .map((f) => ({ name: f.factor_name, label: FACTOR_LABELS[f.factor_name] ?? f.factor_name, score: f.normalized_score }))
        .sort((a, b) => a.score - b.score);
    }

    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("company_id", company.id)
      .gte("transaction_date", since.toISOString().slice(0, 10));
    for (const t of txs ?? []) {
      if (t.type === "income") ctx.income3m += t.amount;
      else if (t.type === "expense") ctx.expense3m += Math.abs(t.amount);
    }

    const { data: invoices } = await supabase
      .from("invoices").select("status, total").eq("company_id", company.id);
    for (const i of invoices ?? []) {
      if (i.status === "overdue") { ctx.overdueCount++; ctx.overdueTotal += i.total; }
      else if (i.status === "pending") { ctx.pendingCount++; ctx.pendingTotal += i.total; }
    }

    const { data: loans } = await supabase
      .from("loan_applications").select("amount, amount_repaid")
      .eq("company_id", company.id).in("status", ["disbursed", "approved"]);
    ctx.loanCount = (loans ?? []).length;
    ctx.loanOutstanding = (loans ?? []).reduce((s, l) => s + (l.amount - (l.amount_repaid ?? 0)), 0);

    return ctx;
  } catch (_e) {
    return null;
  }
}

function contextToPrompt(c: BizContext): string {
  const lines = [`Doanh nghiệp: ${c.companyName}`];
  if (c.score != null) {
    lines.push(`Điểm tín dụng: ${c.score}/850; xác suất vỡ nợ ${((c.pd ?? 0) * 100).toFixed(1)}%; hạn mức ${fmtVND(c.creditLimit ?? 0)}.`);
    if (c.factors.length) lines.push(`Yếu tố yếu nhất: ${c.factors.slice(0, 2).map((f) => `${f.label} (${Math.round(f.score)}/100)`).join(", ")}.`);
  } else lines.push("Chưa có điểm tín dụng.");
  lines.push(`Dòng tiền 3 tháng: thu ${fmtVND(c.income3m)}, chi ${fmtVND(c.expense3m)}, ròng ${fmtVND(c.income3m - c.expense3m)}.`);
  lines.push(`Hóa đơn: ${c.overdueCount} quá hạn (${fmtVND(c.overdueTotal)}), ${c.pendingCount} chưa thu (${fmtVND(c.pendingTotal)}).`);
  if (c.loanCount) lines.push(`${c.loanCount} khoản vay, dư nợ ${fmtVND(c.loanOutstanding)}.`);
  return lines.join("\n");
}

// ── Internal (no external API) assistant ─────────────────────────────────────
const strip = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

const has = (t: string, words: string[]) => words.some((w) => t.includes(w));

/**
 * Deterministic Vietnamese financial assistant. Matches the user's intent and
 * answers using the company's own numbers — no external LLM required, so it
 * always works. Used when no LLM key is configured.
 */
function answerInternally(message: string, c: BizContext | null): string {
  const t = strip(message);

  if (!c) {
    return "Mình cần bạn đăng nhập để đọc dữ liệu doanh nghiệp và tư vấn chính xác theo số liệu của bạn. Sau khi đăng nhập, bạn có thể hỏi: điểm tín dụng, dòng tiền, hóa đơn quá hạn, hoặc cách tăng hạn mức vay.";
  }

  const weakest = c.factors.slice(0, 2);
  const net3m = c.income3m - c.expense3m;
  const expenseRatio = c.income3m > 0 ? (c.expense3m / c.income3m) * 100 : null;

  // 1) Cách cải thiện điểm
  if (has(t, ["cai thien", "tang diem", "nang diem", "lam sao", "cach nao", "improve"])) {
    if (!c.factors.length) return "Bạn chưa có điểm tín dụng. Hãy vào trang Điểm tín dụng và tải dữ liệu giao dịch (CSV) để hệ thống tính điểm — chỉ mất vài giây.";
    const tips = weakest.map((f, i) => `${i + 1}. ${f.label.charAt(0).toUpperCase() + f.label.slice(1)} (${Math.round(f.score)}/100): ${FACTOR_ADVICE[f.name] ?? "Cải thiện chỉ số này để tăng điểm."}`).join("\n\n");
    return `Điểm hiện tại của bạn là ${c.score}/850. Hai yếu tố đang kéo điểm xuống nhiều nhất:\n\n${tips}\n\nGợi ý: vào mục "Học Fintech" — hệ thống đã tự xếp sẵn bài học đúng 2 điểm yếu này cho bạn.`;
  }

  // 2) Điểm tín dụng
  if (has(t, ["diem tin dung", "diem cua toi", "credit", "score", "diem so", "hang tin dung", "vi sao diem"])) {
    if (c.score == null) return "Bạn chưa có điểm tín dụng. Vào trang Điểm tín dụng → tải dữ liệu giao dịch (CSV) → hệ thống tính điểm trong vài giây kèm phân tích từng yếu tố.";
    const grade = c.score >= 750 ? "A (Xuất sắc)" : c.score >= 650 ? "B (Tốt)" : c.score >= 550 ? "C (Trung bình)" : "D (Cần cải thiện)";
    const weak = weakest.length ? `\n\nĐiểm yếu lớn nhất: ${weakest.map((f) => `${f.label} (${Math.round(f.score)}/100)`).join(" và ")}.` : "";
    return `Điểm tín dụng của bạn là ${c.score}/850 — hạng ${grade}. Xác suất vỡ nợ ước tính ${((c.pd ?? 0) * 100).toFixed(1)}%, hạn mức khả dụng ${fmtVND(c.creditLimit ?? 0)}.${weak}\n\nBạn muốn biết cách cải thiện? Hỏi mình "làm sao để tăng điểm".`;
  }

  // 3) Hóa đơn / công nợ
  if (has(t, ["hoa don", "cong no", "qua han", "invoice", "khach no", "thu tien"])) {
    if (c.overdueCount === 0 && c.pendingCount === 0) return "Hiện bạn không có hóa đơn quá hạn hay chờ thu. Rất tốt — giữ nguyên kỷ luật này giúp điểm tín dụng tăng đều.";
    const parts: string[] = [];
    if (c.overdueCount) parts.push(`${c.overdueCount} hóa đơn QUÁ HẠN, tổng ${fmtVND(c.overdueTotal)}`);
    if (c.pendingCount) parts.push(`${c.pendingCount} hóa đơn chưa tới hạn, tổng ${fmtVND(c.pendingTotal)}`);
    const advance = c.overdueTotal + c.pendingTotal > 0 ? `\n\nNếu cần tiền gấp, bạn có thể ứng vốn ~80% giá trị hóa đơn ngay trong mục Hóa đơn thay vì chờ khách thanh toán.` : "";
    return `Tình trạng hóa đơn: ${parts.join("; ")}.${c.overdueCount ? "\n\nƯu tiên xử lý nhóm quá hạn trước — vừa giải phóng dòng tiền, vừa cải thiện chỉ số đúng hạn (đang ảnh hưởng trực tiếp tới điểm tín dụng)." : ""}${advance}`;
  }

  // 4) Vay / hạn mức
  if (has(t, ["vay", "han muc", "loan", "no ", "du no", "co nen vay"])) {
    const limit = c.creditLimit != null ? `Hạn mức khả dụng hiện tại: ${fmtVND(c.creditLimit)}.` : "Bạn chưa có điểm tín dụng nên chưa có hạn mức — hãy tính điểm trước.";
    const debt = c.loanCount ? `\n\nBạn đang có ${c.loanCount} khoản vay với dư nợ ${fmtVND(c.loanOutstanding)}.` : "\n\nHiện bạn chưa có khoản vay nào đang hoạt động.";
    const advice = net3m < 0
      ? "\n\nLưu ý: dòng tiền ròng 3 tháng gần đây đang ÂM, nên cân nhắc kỹ khả năng trả nợ trước khi vay thêm."
      : "\n\nDòng tiền ròng 3 tháng gần đây dương — bạn có dư địa trả nợ, nhưng chỉ nên vay trong khả năng dòng tiền.";
    return `${limit}${debt}${advice}`;
  }

  // 5) Chi phí
  if (has(t, ["chi phi", "tiet kiem", "cat giam", "cost", "ty le chi"])) {
    const ratio = expenseRatio != null ? `Tỷ lệ chi phí/doanh thu 3 tháng gần đây của bạn là ${expenseRatio.toFixed(1)}%.` : "Chưa đủ dữ liệu để tính tỷ lệ chi phí.";
    const verdict = expenseRatio == null ? "" : expenseRatio > 60
      ? " Con số này đang cao hơn ngưỡng lành mạnh (~60%), là dư địa cải thiện điểm rõ nhất."
      : " Con số này nằm trong vùng lành mạnh — hãy duy trì.";
    return `${ratio}${verdict}\n\n${FACTOR_ADVICE.expenseToIncomeRatio}`;
  }

  // 6) Dòng tiền
  if (has(t, ["dong tien", "cash", "thu chi", "doanh thu", "revenue", "thang nay"])) {
    const trend = net3m >= 0 ? "dương" : "âm";
    const warn = net3m < 0 ? "\n\nDòng tiền ròng đang âm — ưu tiên thu hồi công nợ và giãn các khoản chi chưa cấp thiết." : "";
    return `Dòng tiền 3 tháng gần nhất của ${c.companyName}:\n• Thu: ${fmtVND(c.income3m)}\n• Chi: ${fmtVND(c.expense3m)}\n• Ròng: ${fmtVND(net3m)} (${trend})${warn}`;
  }

  // 7) Chào hỏi / mặc định
  const scoreLine = c.score != null ? `điểm tín dụng ${c.score}/850` : "chưa có điểm tín dụng";
  return `Chào bạn! Mình đang đọc được dữ liệu của ${c.companyName}: ${scoreLine}, dòng tiền ròng 3 tháng ${fmtVND(net3m)}, ${c.overdueCount} hóa đơn quá hạn.\n\nBạn có thể hỏi mình:\n• "Vì sao điểm tín dụng của tôi như vậy?"\n• "Làm sao để tăng điểm nhanh nhất?"\n• "Dòng tiền tháng này thế nào?"\n• "Tôi có nên vay thêm không?"`;
}

/** Streams plain text back in the OpenAI SSE delta shape the widget already parses. */
function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Chunk by ~3 words to preserve the typing effect on the client.
      const parts = text.match(/\S+\s*/g) ?? [text];
      let buf = "";
      for (let i = 0; i < parts.length; i++) {
        buf += parts[i];
        if ((i + 1) % 3 === 0 || i === parts.length - 1) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: buf } }] })}\n\n`));
          buf = "";
          await new Promise((r) => setTimeout(r, 18));
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const context = await buildContext(req.headers.get("Authorization"));
    const lastUser = [...(messages ?? [])].reverse().find((m: { role: string }) => m.role === "user")?.content ?? "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // No external key configured → answer internally from the user's own data.
    if (!LOVABLE_API_KEY) {
      return streamText(answerInternally(lastUser, context));
    }

    // Key present → richer LLM answers, still grounded in the same context.
    const systemPrompt = `Bạn là trợ lý tài chính AI của MIMI WALLET — nền tảng tín dụng số cho doanh nghiệp nhỏ (SME) Việt Nam.
Trả lời bằng tiếng Việt, ngắn gọn, thực tế, thân thiện nhưng chuyên nghiệp. Ưu tiên câu trả lời hành động được.
Khi có số liệu doanh nghiệp bên dưới, HÃY dùng đúng các con số đó và cá nhân hóa lời khuyên; đừng bịa số.
${context ? `\n=== DỮ LIỆU DOANH NGHIỆP HIỆN TẠI ===\n${contextToPrompt(context)}\n=== HẾT DỮ LIỆU ===` : "\n(Chưa truy cập được dữ liệu cụ thể — hãy tư vấn tổng quát.)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    // Any upstream problem → fall back to the internal assistant instead of erroring out.
    if (!response.ok || !response.body) {
      console.error("AI gateway error:", response.status, await response.text().catch(() => ""));
      return streamText(answerInternally(lastUser, context));
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return streamText("Xin lỗi, mình gặp sự cố khi xử lý yêu cầu. Bạn thử hỏi lại giúp mình nhé.");
  }
});
