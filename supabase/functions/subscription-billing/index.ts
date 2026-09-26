import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { kiemQuyen, LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { cauTuChoi } from "../_shared/quyen/vai-tro.ts";
import { taoMaThamChieu } from "../_shared/billing/subscription.ts";
import { doiSoatTienVeMimi, GIA_MOT_TO_KHAI, GOI, TOI_DA_LUOT_MOT_LAN } from "../_shared/billing/thu-tien.ts";

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
 *   `create`    — phát hành hoá đơn cho một gói tháng (`plan`), hoặc cho N lượt
 *                 xuất tờ khai (`so_luot`, 10.000đ một lượt); trả về mã tham chiếu
 *                 để khách ghi vào nội dung chuyển khoản
 *   `reconcile` — lưới đỡ của cron: khớp tiền về tài khoản MIMI với hoá đơn đang
 *                 chờ. Đường chính là `bank-webhook`, chạy ngay khi tiền về.
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

/* Bảng giá nằm ở `_shared/billing/thu-tien.ts` — một chỗ cho cả phát hành lẫn đối soát. */

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
// deno-lint-ignore no-explicit-any
async function maChuaDung(supabase: any): Promise<string> {
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

      /*
       * Chỉ đọc `tien_ve_mimi` — tiền về tài khoản nhận của MIMI, do máy chủ ghi.
       *
       * Trước 24/09/2026 chỗ này đọc bảng `transactions` của MỌI công ty. Chủ công ty tự chèn
       * được dòng vào bảng đó, nên tự ghi một khoản 149.000đ mang mã hoá đơn của mình là gói
       * trả phí kích hoạt — không ai trả đồng nào. Xem migration 20260924140000.
       */
      const kq = await doiSoatTienVeMimi(supabase);
      return json(kq);
    }

    // ── create ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid token" }, 401);
    // Giới hạn tần suất mỗi người (26/09/2026): chống bot và script dội yêu cầu.
    if (!(await duocGoi(supabase, user.id, [{ hanh_dong: "thanh_toan_phut", cua_so_giay: 60, toi_da: 20 }, { hanh_dong: "thanh_toan_ngay", cua_so_giay: 86400, toi_da: 200 }], false))) return qua429(corsHeaders);

    const chonCty = typeof body?.company_id === "string" ? body.company_id : null;
    const ctVai = await resolveCompanyVaiTro<{ id: string }>(supabase, user.id, "id", chonCty);
    if (!ctVai) return json({ error: chonCty ? "Bạn không thuộc công ty này." : "No company found" }, chonCty ? 403 : 404);
    const company = ctVai.cong_ty;
    // MIMI-P1-003: mua/đổi gói là việc chạm tiền của công ty.
    kiemQuyen(ctVai.vai_tro, "thanh_toan_goi", cauTuChoi(ctVai.vai_tro, "thanh_toan_goi"));

    /*
     * Hai thứ bán: gói tháng (`plan`), hoặc lượt xuất tờ khai (`so_luot`) — 10.000đ một tờ.
     * Số tiền luôn tính ở đây, không nhận từ trình duyệt.
     */
    const muaLuot = body?.loai === "luot_to_khai";
    const soLuot = muaLuot ? Number(body?.so_luot) : null;
    if (muaLuot && (!Number.isInteger(soLuot) || (soLuot as number) < 1 || (soLuot as number) > TOI_DA_LUOT_MOT_LAN)) {
      return json({ error: `Mua từ 1 đến ${TOI_DA_LUOT_MOT_LAN} lượt một lần.` }, 400);
    }
    const goi = muaLuot
      ? { amount: (soLuot as number) * GIA_MOT_TO_KHAI, ten: `${soLuot} lượt xuất tờ khai` }
      : GOI[body?.plan];
    if (!goi) return json({ error: "Gói không hợp lệ" }, 400);
    const khoaGoi = muaLuot ? "luot_to_khai" : String(body.plan);

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
    // Mua lượt: chỉ dùng lại hoá đơn đang chờ khi CÙNG số lượt — khác số lượt là khác số tiền.
    let timCho = supabase
      .from("subscription_invoices")
      .select("id, reference_code, amount, plan, created_at")
      .eq("company_id", company.id)
      .eq("status", "pending")
      .eq("plan", khoaGoi);
    if (muaLuot) timCho = timCho.eq("so_luot", soLuot);
    const { data: dangCho } = await timCho
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
          plan: khoaGoi,
          amount: goi.amount,
          so_luot: soLuot,
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
    if (e instanceof LoiQuyen) return json({ error: e.message, ma: "KHONG_DU_QUYEN" }, 403);
    console.error("subscription-billing lỗi", e);
    return json({ error: (e as Error)?.message ?? "Lỗi không xác định" }, 500);
  }
});
