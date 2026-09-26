import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { resolveCompany } from "../_shared/company.ts";
import { congTyLaDemo } from "../_shared/minh-hoa.ts";
import { thresholdStatus } from "../_shared/ledger/internal-transfer.ts";
import { CHUA_GOM, docSoLieuDoanhThu } from "../_shared/doanh-thu/so-lieu.ts";
import { docLichCongTy } from "../_shared/luat/doc-lich-thue.ts";
import { mocKeTiep } from "../_shared/luat/lich-thue.ts";

/**
 * "How much have I sold this year, and which obligations have I reached?"
 *
 * Two thresholds, met in this order as a business grows:
 *
 *   01 tỷ  At or below it, no VAT and no personal income tax. Above it, both,
 *          plus e-invoices with a tax-authority code. Nghị định 68/2026/NĐ-CP
 *          as amended by Nghị định 141/2026/NĐ-CP, from 01/01/2026.
 *   3 tỷ   Above it, the choice between a revenue rate and tax on income ends;
 *          income at 17% only. Luật Thuế TNCN 109/2025/QH15.
 *
 * The exemption line has been wrong here in both directions — 1 tỷ when the law
 * said 500 triệu, then 500 triệu for four months after Nghị định 141 moved it
 * to 01 tỷ. The constants live in `_shared/ledger/internal-transfer.ts`.
 *
 * Two numbers come back, and they are deliberately kept apart rather than
 * blended into one confident figure:
 *
 *   bank  — income that actually landed, minus transfers between the owner's
 *           own accounts, minus what a PERSON confirmed is not revenue (a loan,
 *           money from family), minus anything generated for a demo. An
 *           estimate. Inflows nobody has explained yet stay counted: a machine
 *           never lowers declared revenue on its own.
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
    // Giới hạn tần suất mỗi người (26/09/2026): chống bot và script dội yêu cầu.
    if (!(await duocGoi(supabase, user.id, [{ hanh_dong: "tax_summary_phut", cua_so_giay: 60, toi_da: 30 }], false))) return qua429(corsHeaders);

    /*
     * Công ty ĐANG CHỌN (sửa 25/09/2026): người thuộc nhiều công ty trước đây luôn nhận số của công ty
     * mặc định. Nhận `company_id` từ thân POST hoặc `?company_id=`; resolveCompany vẫn kiểm người
     * dùng có thuộc công ty đó không.
     */
    const chon = await (async () => {
      const q = new URL(req.url).searchParams.get("company_id");
      if (q) return q;
      if (req.method !== "POST") return null;
      const b = await req.clone().json().catch(() => null) as { company_id?: unknown } | null;
      return typeof b?.company_id === "string" ? b.company_id : null;
    })();
    const company = await resolveCompany<{ id: string; name: string }>(
      supabase,
      user.id,
      "id, name",
      chon,
    );
    if (!company) return json({ error: "No company found" }, 404);

    // The tax year, not a rolling 12 months. The threshold is assessed per
    // calendar year, so a rolling window would answer a different question.
    const now = new Date().getFullYear();
    const asked = new URL(req.url).searchParams.get("year");
    const year = asked === null ? now : Number(asked);
    if (!Number.isInteger(year) || year < 2020 || year > now + 1) {
      return json({ error: "Năm không hợp lệ." }, 400);
    }

    // One reading shared with the draft declaration (`docDoanhThuQuy`), so the
    // two screens cannot disagree — see _shared/doanh-thu/so-lieu.ts. Demo and
    // sandbox rows are excluded there, except in the demo company, whose whole
    // ledger is illustrative (_shared/minh-hoa.ts).
    const laDemo = await congTyLaDemo(supabase, company.id);
    const s = await docSoLieuDoanhThu(supabase, company.id, year, laDemo);

    /*
     * LỊCH THUẾ CỦA CHÍNH CÔNG TY NÀY (25/09/2026) — một nguồn cho Tổng quan, Nhắc thuế, trợ lý.
     * Trước đây các màn hình đọc lịch chung cả nước và hiện "Kỳ khai Quý 3 — còn 36 ngày" cho cả hộ
     * dưới ngưỡng, không phải khai quý. Xem `_shared/luat/lich-thue.ts`.
     */
    const homNay = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
    const { lich, loaiNguoiNop, sanSang } = await docLichCongTy(supabase, company.id, { nam: year, homNay, laDemo, s });

    // Measured on the strongest evidence available. An e-invoice total is the
    // tax authority's own record; bank income is a reading of what arrived.
    const basis = s.hoa_don !== null ? "gdt" : "bank";
    const status = thresholdStatus(s.hoa_don ?? s.uoc_tinh);

    return json({
      year,
      company: { id: company.id, name: company.name },
      basis,
      // Kept for older clients: the bank estimate.
      bankRevenue: s.uoc_tinh,
      // Four figures, never blended into one confident number.
      bankGrossInflow: s.tien_vao,
      bankEstimatedRevenue: s.uoc_tinh,
      bankConfirmedRevenue: s.da_xac_nhan,
      gdtRevenue: s.hoa_don,
      // Inflows nobody has confirmed yet — counted as revenue until someone does.
      unclassifiedAmount: s.chua_ro,
      unclassifiedCount: s.so_chua_ro,
      excludedByPerson: s.khong_phai_doanh_thu,
      internalTransferAmount: s.noi_bo,
      // Share of inflow value that has an explanation. Null with no inflow.
      coverage: s.ty_le_da_giai_thich,
      // A bank-based figure is always an estimate; say so on the number itself.
      isEstimate: basis === "bank",
      // Both present and disagreeing is worth surfacing rather than hiding.
      gap: s.hoa_don !== null ? s.hoa_don - s.uoc_tinh : null,
      ...status,
      internalTransfersExcluded: s.so_giao_dich_noi_bo,
      // Pairs inferred rather than proved. They reduce revenue, so anyone
      // relying on this figure deserves to know how many were guesses.
      needsReview: s.can_xem_lai,
      transactionsCounted: s.so_giao_dich,
      hasBankConnection: s.co_ket_noi_ngan_hang,
      notCovered: CHUA_GOM,
      // Lịch nghĩa vụ cá nhân hoá — mọi màn hình hiện hạn thuế đọc từ đây.
      loaiNguoiNop,
      lich,
      mocKeTiep: mocKeTiep(lich),
      sanSang,
      disclaimer:
        "Số liệu tham khảo, tính từ dữ liệu đã kết nối. Không phải kết luận về nghĩa vụ thuế.",
    });
  } catch (e) {
    // The message can name tables and columns; it stays in the log.
    console.error("tax-summary failed:", e instanceof Error ? e.message : e);
    return json({ error: "MIMI chưa tính được doanh thu lúc này. Thử lại sau ít phút." }, 500);
  }
});
