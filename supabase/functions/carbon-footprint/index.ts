import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  computeFootprint,
  reductionTips,
  EMISSION_FACTORS,
  FACTOR_SOURCE,
  type CarbonTransaction,
} from "./carbon.ts";

/**
 * Estimates a company's carbon footprint from its own transactions and stores a
 * snapshot so the trend survives between visits.
 *
 * The arithmetic lives in carbon.ts with no Deno imports, so it stays unit
 * testable — the same split credit-scoring uses. This file is only I/O and auth.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MONTHS = 12;
const FACTOR_VERSION = "eeio-v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Chưa đăng nhập" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Identify the caller from their own JWT, then only ever touch that user's
    // company — the service role bypasses RLS, so this scoping is the guard.
    const { data: userData } = await admin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Phiên không hợp lệ" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: companies } = await admin
      .from("companies")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);
    const companyId = companies?.[0]?.id;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "Chưa có hồ sơ doanh nghiệp" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date();
    since.setMonth(since.getMonth() - MONTHS);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: txs, error: txError } = await admin
      .from("transactions")
      .select("amount, type, category, transaction_date")
      .eq("company_id", companyId)
      .gte("transaction_date", sinceStr)
      .order("transaction_date", { ascending: true });

    if (txError) throw txError;

    const footprint = computeFootprint((txs ?? []) as CarbonTransaction[]);
    const tips = reductionTips(footprint);

    const { error: insertError } = await admin.from("carbon_snapshots").insert({
      company_id: companyId,
      total_emissions: footprint.totalEmissions,
      total_spend: footprint.totalSpend,
      total_revenue: footprint.totalRevenue,
      intensity_per_revenue: footprint.intensityPerRevenue,
      by_category: footprint.byCategory,
      by_month: footprint.byMonth,
      factor_version: FACTOR_VERSION,
      months_analysed: MONTHS,
    });
    if (insertError) console.error("snapshot insert failed:", insertError.message);

    return new Response(
      JSON.stringify({
        ...footprint,
        tips,
        transactionsAnalysed: (txs ?? []).length,
        monthsAnalysed: MONTHS,
        factorVersion: FACTOR_VERSION,
        factors: EMISSION_FACTORS,
        // Surfaced so the UI can state the basis rather than implying these are
        // metered readings.
        method:
          "Ước tính theo phương pháp spend-based (GHG Protocol Scope 3) — không phải số đo trực tiếp",
        factorSource: FACTOR_SOURCE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("carbon-footprint error:", e);
    return new Response(JSON.stringify({ error: "Không tính được phát thải" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
