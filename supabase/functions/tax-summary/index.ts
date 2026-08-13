import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import {
  findInternalTransfers,
  revenueExcludingInternal,
  thresholdStatus,
  type LedgerTx,
} from "../_shared/ledger/internal-transfer.ts";
import { revenueFromInvoices, type GdtInvoiceRow } from "../_shared/tax/gdt-invoice-map.ts";

/**
 * "How much have I sold this year, and which obligations have I reached?"
 *
 * Two thresholds, from two different laws, met in this order as a business
 * grows:
 *
 *   500 triệu  Below it, no VAT and no personal income tax. Luật Thuế TNCN
 *              (sửa đổi), passed 10/12/2025, raising the 200 triệu set by
 *              Luật Thuế GTGT 2024. Applies from 01/01/2026.
 *   1 tỷ       At or above it, sales must be invoiced from a cash register
 *              connected to the tax authority. Nghị định 70/2025/NĐ-CP, in
 *              force from 01/06/2025. About *how* sales are recorded, not how
 *              much tax is owed.
 *
 * They were once collapsed into one constant of 1 tỷ called "the exemption
 * threshold". That told a household at 800 triệu they owed nothing, when they
 * had owed tax since 500 triệu.
 *
 * Two numbers come back, and they are deliberately kept apart rather than
 * blended into one confident figure:
 *
 *   bank  — income that actually landed, minus transfers between the owner's
 *           own accounts, minus anything generated for a demo. An estimate.
 *   gdt   — the total of e-invoices this company issued, as held by the tax
 *           authority. Not an estimate.
 *
 * When both exist and disagree, that gap is information, not an error to
 * paper over: cash sales with no invoice, or invoices issued but unpaid.
 * Averaging them would destroy the one thing worth saying.
 *
 * This computes a figure. It is not a tax determination, and the response says
 * so — the caller is expected to show that, not bury it.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const company = await resolveCompany<{ id: string; name: string }>(
      supabase,
      user.id,
      "id, name",
    );
    if (!company) return json({ error: "No company found" }, 404);

    // The tax year, not a rolling 12 months. The threshold is assessed per
    // calendar year, so a rolling window would answer a different question.
    const year = Number(new URL(req.url).searchParams.get("year")) || new Date().getFullYear();
    const from = `${year}-01-01`;
    const to = `${year}-12-31`;

    const { data: txs } = await supabase
      .from("transactions")
      .select("id, amount, type, transaction_date, account_number, counter_account_number, is_synthetic")
      .eq("company_id", company.id)
      .gte("transaction_date", from)
      .lte("transaction_date", to);

    // Demo and sandbox rows are excluded before anything is counted. They are
    // invented money, and this is the number that decides whether somebody
    // owes tax.
    const real = ((txs ?? []) as Array<LedgerTx & { is_synthetic?: boolean }>).filter(
      (t) => !t.is_synthetic,
    );

    const { data: conns } = await supabase
      .from("bank_connections")
      .select("account_number")
      .eq("company_id", company.id)
      .is("revoked_at", null);
    const ownAccounts = (conns ?? [])
      .map((c) => c.account_number as string | null)
      .filter((a): a is string => !!a && !a.startsWith("grant:"));

    const internal = findInternalTransfers(real, { ownAccounts });
    const bankRevenue = revenueExcludingInternal(real, internal.internalIds, { from, to });

    const { data: gdtRows } = await supabase
      .from("gdt_invoices")
      .select("direction, total_amount, invoice_status, issuance_period")
      .eq("company_id", company.id)
      .gte("issuance_period", year * 100 + 1)
      .lte("issuance_period", year * 100 + 12);
    const gdtRevenue = gdtRows?.length
      ? revenueFromInvoices(gdtRows as unknown as GdtInvoiceRow[])
      : null;

    // Measured on the strongest evidence available. An e-invoice total is the
    // tax authority's own record; bank income is a reading of what arrived.
    const basis = gdtRevenue !== null ? "gdt" : "bank";
    const status = thresholdStatus(gdtRevenue ?? bankRevenue);

    return json({
      year,
      company: { id: company.id, name: company.name },
      basis,
      bankRevenue,
      gdtRevenue,
      // Both present and disagreeing is worth surfacing rather than hiding.
      gap: gdtRevenue !== null ? gdtRevenue - bankRevenue : null,
      ...status,
      internalTransfersExcluded: internal.internalIds.size,
      // Pairs inferred rather than proved. They reduce revenue, so anyone
      // relying on this figure deserves to know how many were guesses.
      needsReview: internal.needsReview.length,
      transactionsCounted: real.length,
      hasBankConnection: ownAccounts.length > 0,
      disclaimer:
        "Số liệu tham khảo, tính từ dữ liệu đã kết nối. Không phải kết luận về nghĩa vụ thuế.",
    });
  } catch (e) {
    console.error("tax-summary failed:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
