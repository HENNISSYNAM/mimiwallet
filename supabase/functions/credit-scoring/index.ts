import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeCreditModel,
  creditLimitMultiplier,
  coefficientOfVariation,
  linearRegressionSlope,
  type CreditFeatures,
  type MonthlyBucket,
} from "./scoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TRAILING_MONTHS = 12;

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function buildMonthlyBuckets(
  transactions: { type: string; amount: number; transaction_date: string }[]
): MonthlyBucket[] {
  const buckets = new Map<string, MonthlyBucket>();
  for (const t of transactions) {
    if (t.type !== "income" && t.type !== "expense") continue; // exclude loan disbursements from operating cash flow
    const key = monthKey(t.transaction_date);
    const bucket = buckets.get(key) ?? { month: key, income: 0, expense: 0 };
    if (t.type === "income") bucket.income += t.amount;
    else bucket.expense += Math.abs(t.amount);
    buckets.set(key, bucket);
  }
  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

function computeFeatures(
  monthlyBuckets: MonthlyBucket[],
  invoices: { status: string }[],
  loans: { status: string; amount: number; amount_repaid: number | null }[]
): CreditFeatures {
  const totalIncome = monthlyBuckets.reduce((s, b) => s + b.income, 0);
  const totalExpense = monthlyBuckets.reduce((s, b) => s + b.expense, 0);
  const avgMonthlyIncome = monthlyBuckets.length ? totalIncome / monthlyBuckets.length : 0;

  const incomeSlope = linearRegressionSlope(monthlyBuckets.map((b) => b.income));
  const revenueTrend = avgMonthlyIncome > 0 ? incomeSlope / avgMonthlyIncome : 0;

  const expenseToIncomeRatio = totalIncome > 0 ? totalExpense / totalIncome : totalExpense > 0 ? 1.2 : 0.75;

  const relevantInvoices = invoices.filter((i) => i.status === "paid" || i.status === "advanced" || i.status === "overdue");
  const onTimeInvoices = relevantInvoices.filter((i) => i.status === "paid" || i.status === "advanced").length;
  const invoicePunctuality = relevantInvoices.length > 0 ? onTimeInvoices / relevantInvoices.length : 0.5;

  const obligatedLoans = loans.filter((l) => l.status === "disbursed" || l.status === "completed");
  const totalLoanAmount = obligatedLoans.reduce((s, l) => s + l.amount, 0);
  const totalRepaid = obligatedLoans.reduce((s, l) => s + (l.amount_repaid ?? 0), 0);
  const loanRepaymentRatio = totalLoanAmount > 0 ? Math.min(1, totalRepaid / totalLoanAmount) : 0.6;

  const netCashFlows = monthlyBuckets.map((b) => b.income - b.expense);
  const cashFlowVolatility = netCashFlows.length >= 2 ? coefficientOfVariation(netCashFlows) : 0.75;

  return { revenueTrend, expenseToIncomeRatio, invoicePunctuality, loanRepaymentRatio, cashFlowVolatility };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, monthly_revenue")
      .eq("user_id", user.id)
      .single();

    if (!company) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action !== "compute") {
      return new Response(JSON.stringify({ error: "Invalid action. Use: compute" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - TRAILING_MONTHS);
    const sinceIso = sinceDate.toISOString().split("T")[0];

    const [{ data: transactions }, { data: invoices }, { data: loans }] = await Promise.all([
      supabase
        .from("transactions")
        .select("type, amount, transaction_date")
        .eq("company_id", company.id)
        .gte("transaction_date", sinceIso),
      supabase.from("invoices").select("status").eq("company_id", company.id),
      supabase.from("loan_applications").select("status, amount, amount_repaid").eq("company_id", company.id),
    ]);

    const monthlyBuckets = buildMonthlyBuckets(transactions ?? []);
    const features = computeFeatures(monthlyBuckets, invoices ?? [], loans ?? []);
    const modelResult = computeCreditModel(features);

    const avgMonthlyIncome = monthlyBuckets.length
      ? monthlyBuckets.reduce((s, b) => s + b.income, 0) / monthlyBuckets.length
      : 0;
    const revenueBase = company.monthly_revenue && company.monthly_revenue > 0 ? company.monthly_revenue : avgMonthlyIncome;
    const creditLimit = Math.round(revenueBase * creditLimitMultiplier(modelResult.score));

    // Fetch previous snapshot's factors to compute trend deltas.
    const { data: prevSnapshot } = await supabase
      .from("credit_score_snapshots")
      .select("id")
      .eq("company_id", company.id)
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevFactorsByName = new Map<string, number>();
    if (prevSnapshot) {
      const { data: prevFactors } = await supabase
        .from("credit_score_factors")
        .select("factor_name, normalized_score")
        .eq("snapshot_id", prevSnapshot.id);
      for (const f of prevFactors ?? []) prevFactorsByName.set(f.factor_name, f.normalized_score);
    }

    const { data: snapshot, error: snapshotError } = await supabase
      .from("credit_score_snapshots")
      .insert({
        company_id: company.id,
        score: modelResult.score,
        credit_limit: creditLimit,
        probability_of_default: modelResult.probabilityOfDefault,
        model_version: "v1",
      })
      .select()
      .single();

    if (snapshotError || !snapshot) {
      throw new Error(snapshotError?.message ?? "Failed to save credit score snapshot");
    }

    const factorRows = modelResult.factors.map((f) => ({
      snapshot_id: snapshot.id,
      factor_name: f.factor_name,
      raw_value: f.raw_value,
      normalized_score: f.normalized_score,
      weight: f.weight,
      trend: prevFactorsByName.has(f.factor_name)
        ? f.normalized_score - prevFactorsByName.get(f.factor_name)!
        : null,
    }));

    const { data: factors } = await supabase
      .from("credit_score_factors")
      .insert(factorRows)
      .select();

    await supabase
      .from("companies")
      .update({ credit_score: modelResult.score, credit_limit: creditLimit })
      .eq("id", company.id);

    return new Response(JSON.stringify({ data: { snapshot, factors } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Credit scoring error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
