import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import {
  taoMaThamChieu,
  doiSoatThueBao,
  ketThucKy,
  type SubscriptionInvoice,
  type IncomingTransfer,
} from "../_shared/billing/subscription.ts";

/**
 * Thu phí MIMI bằng chuyển khoản ngân hàng.
 *
 * ĐÂY LÀ ĐƯỜNG THU TIỀN DUY NHẤT CHẠY ĐƯỢC Ở VIỆT NAM. `create-checkout` và
 * `check-subscription` đi qua Stripe, mà Stripe không nhận merchant Việt Nam —
 * nên trước hàm này, sản phẩm không thu được đồng nào từ chính tệp khách hàng
 * nó nhắm tới.
 *
 * Hai hành động:
 *
 *   `create`    — phát hành hoá đơn, trả về mã tham chiếu để khách ghi vào nội
 *                 dung chuyển khoản
 *   `reconcile` — đọc giao dịch tiền vào, khớp mã, kích hoạt thuê bao
 *
 * `reconcile` KHÔNG cần đăng nhập của khách và được gọi bởi cron. Nó chạy trên
 * toàn bộ hoá đơn đang chờ của mọi công ty, vì tiền vào tài khoản MIMI không
 * mang theo danh tính công ty nào — chỉ có mã tham chiếu trong nội dung để tra
 * ngược. Đó cũng là lý do `reference_code` phải duy nhất toàn hệ thống.
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

/**
 * Bảng giá.
 *
 * Nguồn sự thật nằm ở PHÍA MÁY CHỦ, không phải ở `useSubscriptionStore`. Giá do
 * trình duyệt gửi lên thì khách sửa được thành 1.000đ — và đối soát sẽ vui vẻ
 * coi 1.000đ là "trả đủ" vì nó chỉ so với con số trong hoá đơn.
 */
const GOI: Record<string, { amount: number; ten: string }> = {
  // Khoá phải khớp `TIERS` trong src/store/useSubscriptionStore.ts.
  starter: { amount: 149_000, ten: "Starter" },
  growth: { amount: 249_000, ten: "Growth" },
};

/**
 * Tài khoản nhận tiền của MIMI.
 *
 * Chưa cấu hình thì `create` trả 503 kèm câu nói rõ vì sao, thay vì phát hành
 * một hoá đơn không có chỗ nào để chuyển tiền tới. Một mã tham chiếu không kèm
 * số tài khoản là tờ giấy vô dụng.
 */
function taiKhoanNhan() {
  const soTaiKhoan = Deno.env.get("MIMI_BANK_ACCOUNT");
  const nganHang = Deno.env.get("MIMI_BANK_NAME");
  const chuTaiKhoan = Deno.env.get("MIMI_BANK_HOLDER");
  /* Mã BIN 6 số để giao diện tự dựng chuỗi VietQR ngay tại máy khách. */
  const bin = Deno.env.get("MIMI_BANK_BIN");
  if (!soTaiKhoan || !nganHang || !chuTaiKhoan || !bin) return null;
  return { soTaiKhoan, nganHang, chuTaiKhoan, bin };
}

/** Sinh mã chưa từng dùng. Va chạm cực hiếm nhưng hậu quả là kích hoạt nhầm. */
async function maChuaDung(supabase: ReturnType<typeof createClient>): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const ma = taoMaThamChieu();
    const { data } = await supabase
      .from("subscription_invoices")
      .select("id")
      .eq("reference_code", ma)
      .maybeSingle();
    if (!data) return ma;
  }
  throw new Error("Không sinh được mã tham chiếu chưa dùng");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const action = body?.action ?? "create";

    // ── reconcile ─────────────────────────────────────────────────────────
    if (action === "reconcile") {
      /*
       * Bảo vệ bằng secret riêng, không bằng JWT người dùng: đây là việc của hệ
       * thống, chạy theo lịch. Để mở thì bất kỳ ai cũng gọi được vòng đối soát.
       */
      const secret = Deno.env.get("BILLING_CRON_SECRET");
      if (!secret || req.headers.get("x-cron-secret") !== secret) {
        return json({ error: "Unauthorized" }, 401);
      }

      const { data: hoaDon } = await supabase
        .from("subscription_invoices")
        .select("id, company_id, reference_code, amount, status, plan")
        .eq("status", "pending");

      if (!hoaDon?.length) return json({ matched: 0, mismatched: 0, checked: 0 });

      /*
       * Chỉ lấy tiền VÀO trong 60 ngày gần đây. Khách chuyển khoản trước khi
       * hoá đơn được phát hành là chuyện không xảy ra, còn quét cả lịch sử thì
       * mỗi lần cron chạy lại nặng thêm mãi.
       */
      const tu = new Date();
      tu.setDate(tu.getDate() - 60);
      const { data: giaoDich } = await supabase
        .from("transactions")
        .select("id, amount, description")
        .gt("amount", 0)
        .gte("transaction_date", tu.toISOString().slice(0, 10));

      const ketQua = doiSoatThueBao(
        hoaDon as unknown as SubscriptionInvoice[],
        (giaoDich ?? []) as unknown as IncomingTransfer[],
      );

      const hoaDonTheoId = new Map(hoaDon.map((h) => [h.id, h]));

      for (const m of ketQua.matched) {
        const h = hoaDonTheoId.get(m.invoice_id);
        if (!h) continue;
        const batDau = new Date();
        const ketThuc = ketThucKy(batDau);

        await supabase
          .from("subscription_invoices")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            matched_transaction_id: m.transaction_id,
            received_amount: h.amount,
            period_start: batDau.toISOString().slice(0, 10),
            period_end: ketThuc.toISOString().slice(0, 10),
            updated_at: new Date().toISOString(),
          })
          .eq("id", h.id);

        /*
         * Gia hạn cộng dồn từ ngày hết hạn CŨ nếu thuê bao còn hiệu lực, không
         * phải từ hôm nay. Trả sớm mà bị cắt mất những ngày còn lại thì lần sau
         * khách sẽ đợi tới sát hạn mới trả — tự tạo ra rủi ro gián đoạn.
         */
        const { data: dangCo } = await supabase
          .from("subscriptions")
          .select("current_period_end")
          .eq("company_id", h.company_id)
          .maybeSingle();

        const moc =
          dangCo?.current_period_end && new Date(dangCo.current_period_end) > batDau
            ? new Date(dangCo.current_period_end)
            : batDau;

        await supabase.from("subscriptions").upsert(
          {
            company_id: h.company_id,
            plan: h.plan,
            current_period_end: ketThucKy(moc).toISOString().slice(0, 10),
            last_invoice_id: h.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id" },
        );
      }

      /*
       * Trả sai số tiền: ghi nhận trạng thái nhưng KHÔNG kích hoạt. Quy tắc này
       * đã khoá bằng test trong subscription.ts — trả sai gần như luôn là gõ
       * nhầm, và quyết hộ khách chuyện tiền là việc không nên làm. Ghi lại để
       * có người nhìn và liên hệ.
       */
      for (const m of ketQua.mismatched) {
        await supabase
          .from("subscription_invoices")
          .update({
            status: m.delta > 0 ? "overpaid" : "underpaid",
            received_amount: m.amount,
            matched_transaction_id: m.transaction_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", m.invoice_id);
      }

      return json({
        checked: hoaDon.length,
        matched: ketQua.matched.length,
        mismatched: ketQua.mismatched.length,
        unmatched: ketQua.unmatched.length,
      });
    }

    // ── create ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const company = await resolveCompany<{ id: string }>(supabase, user.id);
    if (!company) return json({ error: "No company found" }, 404);

    const goi = GOI[body?.plan];
    if (!goi) return json({ error: "Gói không hợp lệ" }, 400);

    const bank = taiKhoanNhan();
    if (!bank) {
      return json(
        {
          error:
            "Chưa cấu hình tài khoản nhận tiền của MIMI. Cần đặt MIMI_BANK_ACCOUNT, " +
            "MIMI_BANK_NAME, MIMI_BANK_HOLDER, MIMI_BANK_BIN trước khi phát hành hoá đơn.",
        },
        503,
      );
    }

    /*
     * Tái dùng hoá đơn đang chờ thay vì phát hành cái mới.
     *
     * Khách mở màn hình thanh toán ba lần thì có ba mã khác nhau, họ chuyển
     * khoản ghi mã của lần đầu, còn hai hoá đơn kia treo `pending` mãi. Tệ hơn:
     * nếu họ ghi mã của lần thứ ba mà đã chuyển theo lần đầu thì không mã nào
     * khớp đúng.
     */
    const { data: dangCho } = await supabase
      .from("subscription_invoices")
      .select("id, reference_code, amount, plan, created_at")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .eq("plan", body.plan)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let hoaDon = dangCho;
    if (!hoaDon) {
      const ma = await maChuaDung(supabase);
      const { data, error } = await supabase
        .from("subscription_invoices")
        .insert({
          company_id: company.id,
          reference_code: ma,
          plan: body.plan,
          amount: goi.amount,
        })
        .select("id, reference_code, amount, plan, created_at")
        .single();
      if (error) throw error;
      hoaDon = data;
    }

    return json({
      invoice_id: hoaDon.id,
      reference_code: hoaDon.reference_code,
      amount: hoaDon.amount,
      plan_name: goi.ten,
      bank: bank,
      /* Câu khách phải gõ đúng vào nội dung chuyển khoản. */
      transfer_note: hoaDon.reference_code,
      huong_dan:
        "Chuyển đúng số tiền và ghi mã tham chiếu vào nội dung chuyển khoản. " +
        "Hệ thống đối soát tự động; thuê bao kích hoạt trong vòng vài phút sau khi tiền vào.",
    });
  } catch (e) {
    console.error("subscription-billing lỗi", e);
    return json({ error: (e as Error)?.message ?? "Lỗi không xác định" }, 500);
  }
});
