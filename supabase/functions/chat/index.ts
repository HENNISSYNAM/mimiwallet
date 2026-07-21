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

/**
 * Builds a compact, non-PII snapshot of the caller's business so the AI can
 * give advice grounded in their real numbers (credit score, cash flow, overdue
 * invoices, outstanding loans). Returns "" if the user isn't identifiable.
 * Never includes KYC / identity data.
 */
async function buildContext(authHeader: string | null): Promise<string> {
  try {
    if (!authHeader) return "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return "";
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return "";

    const { data: company } = await supabase
      .from("companies")
      .select("id, name, monthly_revenue, credit_score, credit_limit")
      .eq("user_id", user.id)
      .single();
    if (!company) return "";

    const lines: string[] = [`Doanh nghiệp: ${company.name}`];

    // Latest credit score snapshot + weakest factors
    const { data: snap } = await supabase
      .from("credit_score_snapshots")
      .select("id, score, credit_limit, probability_of_default")
      .eq("company_id", company.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snap) {
      lines.push(
        `Điểm tín dụng: ${snap.score}/850; xác suất vỡ nợ ${(snap.probability_of_default * 100).toFixed(1)}%; hạn mức khả dụng ${fmtVND(snap.credit_limit)}.`
      );
      const { data: factors } = await supabase
        .from("credit_score_factors")
        .select("factor_name, normalized_score")
        .eq("snapshot_id", snap.id);
      if (factors?.length) {
        const weakest = [...factors].sort((a, b) => a.normalized_score - b.normalized_score).slice(0, 2);
        lines.push(
          `Yếu tố cần cải thiện nhất: ${weakest.map((f) => `${FACTOR_LABELS[f.factor_name] ?? f.factor_name} (${Math.round(f.normalized_score)}/100)`).join(", ")}.`
        );
      }
    } else {
      lines.push("Chưa có điểm tín dụng (cần tải dữ liệu giao dịch để tính).");
    }

    // Cash flow — last 3 months of transactions
    const since = new Date();
    since.setMonth(since.getMonth() - 3);
    const { data: txs } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("company_id", company.id)
      .gte("transaction_date", since.toISOString().slice(0, 10));
    if (txs?.length) {
      const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
      lines.push(`Dòng tiền 3 tháng gần nhất: thu ${fmtVND(income)}, chi ${fmtVND(expense)}, ròng ${fmtVND(income - expense)}.`);
    }

    // Invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("status, total")
      .eq("company_id", company.id);
    if (invoices?.length) {
      const overdue = invoices.filter((i) => i.status === "overdue");
      const pending = invoices.filter((i) => i.status === "pending");
      lines.push(
        `Hóa đơn: ${overdue.length} quá hạn (${fmtVND(overdue.reduce((s, i) => s + i.total, 0))}), ${pending.length} chưa thu (${fmtVND(pending.reduce((s, i) => s + i.total, 0))}).`
      );
    }

    // Loans
    const { data: loans } = await supabase
      .from("loan_applications")
      .select("status, amount, amount_repaid")
      .eq("company_id", company.id)
      .in("status", ["disbursed", "approved"]);
    if (loans?.length) {
      const outstanding = loans.reduce((s, l) => s + (l.amount - (l.amount_repaid ?? 0)), 0);
      lines.push(`Đang có ${loans.length} khoản vay, dư nợ còn lại ${fmtVND(outstanding)}.`);
    }

    return lines.join("\n");
  } catch (_e) {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const context = await buildContext(req.headers.get("Authorization"));

    const systemPrompt = `Bạn là trợ lý tài chính AI của MIMI WALLET — nền tảng tín dụng số cho doanh nghiệp nhỏ (SME) Việt Nam.
Trả lời bằng tiếng Việt, ngắn gọn, thực tế, thân thiện nhưng chuyên nghiệp. Ưu tiên câu trả lời hành động được.
Bạn có thể: phân tích dòng tiền, tư vấn vay vốn và ứng vốn hóa đơn, giải thích điểm tín dụng và cách cải thiện.
Khi có số liệu doanh nghiệp bên dưới, HÃY dùng đúng các con số đó và cá nhân hóa lời khuyên; đừng bịa số.
${context ? `\n=== DỮ LIỆU DOANH NGHIỆP HIỆN TẠI ===\n${context}\n=== HẾT DỮ LIỆU ===` : "\n(Chưa truy cập được dữ liệu cụ thể — hãy tư vấn tổng quát và gợi ý người dùng cập nhật dữ liệu.)"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Quá nhiều yêu cầu, vui lòng thử lại sau." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Cần nạp thêm credits AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Lỗi AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
