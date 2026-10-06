import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { daBiKhoaViSai, ghiLanSai, idTuIp, ipNguoiGoi } from "../_shared/an-ninh/gioi-han.ts";
import { mapSepayWebhook } from "../_shared/bank/sepay-map.ts";
import { doiSoatTienVeMimi, laTaiKhoanMimi } from "../_shared/billing/thu-tien.ts";

/**
 * Public endpoint SePay posts to when a transaction hits a linked bank account.
 *
 * Three things about this function are dictated by SePay's contract rather than
 * by taste, and getting any of them wrong causes duplicate transactions:
 *
 *  1. It must answer HTTP 200 with a body of {"success": true} inside 30
 *     seconds. Anything else — including a 500 with a helpful error message —
 *     is read as failure and retried up to 7 times over 5 hours.
 *  2. Because retries are guaranteed rather than exceptional, the write must be
 *     idempotent. That is the partial unique index on
 *     (company_id, reference_id) plus an upsert that ignores conflicts.
 *  3. A payload we cannot use is still answered 200. Retrying a malformed
 *     payload will never succeed; it would just occupy SePay's queue for five
 *     hours and bury real failures in the logs.
 *
 * There is no user JWT here, so `verify_jwt = false` is set for this function in
 * supabase/config.toml and authentication is the shared webhook key instead.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Always 200 + {"success": true} — see note 1 above. */
function ack(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Compares in time independent of how many characters match, so an attacker
 * cannot recover the key one byte at a time by measuring response latency.
 */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  // Length still leaks, which is acceptable: the key length is not the secret.
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("SEPAY_WEBHOOK_KEY");
  if (!expected) {
    // Refusing to run unauthenticated is the point: a missing secret must not
    // silently downgrade a public write endpoint to no auth at all.
    console.error("SEPAY_WEBHOOK_KEY is not set — refusing every request");
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Chống dò khoá (26/09/2026): IP sai quá 20 lần / 10 phút bị từ chối trước cả khi so khoá.
  const gac = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const khoaIp = await idTuIp(ipNguoiGoi(req), "bank-webhook");
  if (await daBiKhoaViSai(gac, khoaIp, "sai_khoa_sepay")) return new Response(JSON.stringify({ error: "Thử sai quá nhiều lần. Đợi 10 phút." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "600" } });
  const auth = req.headers.get("authorization") ?? "";
  const presented = auth.replace(/^Apikey\s+/i, "").trim();
  if (!safeEqual(presented, expected)) {
    /*
     * NÓI RA HÌNH DẠNG, KHÔNG NÓI RA GIÁ TRỊ.
     *
     * Ngày 08/09/2026 SePay bị từ chối 401 ba lần liền và thông báo chỉ có một
     * chữ "unauthorized" — không cách nào biết là sai khoá, thiếu header, hay
     * thừa tiền tố. Người cấu hình phải đoán, và đoán sai thì thử lại mù.
     *
     * Nguyên nhân thật ở lần đó: hướng dẫn ban đầu bảo điền `Apikey <chuỗi>`
     * vào ô API Key, trong khi SePay TỰ thêm tiền tố — nên header thành
     * `Apikey Apikey <chuỗi>`, gỡ một lần vẫn còn dư một.
     *
     * Trả về độ dài và các dấu hiệu hình dạng là đủ để chỉ đúng lỗi, mà không
     * để lộ ký tự nào của khoá. Độ dài không phải bí mật; nội dung mới là.
     */
    const thuaTienTo = /^Apikey\s+Apikey\s+/i.test(auth);
    const chiTiet = !auth
      ? "không có header Authorization"
      : thuaTienTo
        ? 'header có "Apikey" hai lần — ô API Key bên SePay chỉ điền chuỗi trần, SePay tự thêm tiền tố'
        : presented.length !== expected.length
          ? `độ dài khoá lệch (nhận ${presented.length}, cần ${expected.length}) — nhiều khả năng hai bên lưu hai chuỗi khác nhau`
          : "khoá đúng độ dài nhưng khác nội dung — dán lại từ cùng một nguồn";

    console.warn(`rejected webhook: ${chiTiet}`);
    await ghiLanSai(gac, khoaIp, "sai_khoa_sepay");
    return new Response(JSON.stringify({ error: "unauthorized", detail: chiTiet }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    console.warn("rejected webhook: body is not JSON");
    return ack({ ignored: "invalid json" });
  }

  /*
   * GHI NHẬT KÝ TRƯỚC MỌI QUYẾT ĐỊNH.
   *
   * Trước 07/09/2026 hàm này không ghi gì vào `webhook_events` — bảng đó chỉ có
   * `cas-webhook` dùng. Hậu quả: màn hình "Nhật ký webhook" hiện trống cho mọi
   * sự kiện SePay, kể cả khi chúng chạy hoàn hảo. Người đọc thấy trống rồi kết
   * luận "SePay không gửi", đúng cái bẫy đã mất hai ngày để gỡ ở phía Cas.
   *
   * Một đường dẫn tiền vào mà không để lại dấu vết thì không chẩn đoán được, và
   * cái không chẩn đoán được thì sớm muộn cũng bị đổ lỗi nhầm cho ai đó.
   */
  const nhatKy = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { row, reason, accountNumber } = mapSepayWebhook(payload as never);

  const { data: suKien } = await nhatKy
    .from("webhook_events")
    .insert({
      provider: "sepay",
      event_type: "TRANSACTION",
      event_code: row ? (row.amount >= 0 ? "IN" : "OUT") : null,
      grant_id: null,
      payload: payload as Record<string, unknown>,
      outcome: "received",
    })
    .select("id")
    .maybeSingle();

  const ghiKetQua = async (outcome: string, note?: string) => {
    if (suKien?.id) {
      await nhatKy
        .from("webhook_events")
        .update({ outcome, note: note ?? null })
        .eq("id", suKien.id);
    }
  };

  if (!row) {
    console.warn(`ignored webhook for account ${accountNumber ?? "?"}: ${reason}`);
    await ghiKetQua("ignored", reason ?? "payload không đọc được");
    return ack({ ignored: reason });
  }

  // Service role, because there is no signed-in user on this path. RLS is
  // therefore bypassed, so every query below scopes itself to the company the
  // account number resolves to — the isolation has to come from this code.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  /*
   * TIỀN VỀ TÀI KHOẢN CỦA CHÍNH MIMI — khách trả tiền gói hoặc mua lượt xuất tờ khai.
   *
   * Xét TRƯỚC khi tra `bank_connections`, và không bao giờ ghi vào `transactions` của công ty
   * nào: đó là doanh thu của MIMI, không phải sổ của khách. Nếu để đi đường chung, ai khai số
   * tài khoản của MIMI vào công ty mình trước sẽ nhận được sao kê tiền về MIMI.
   *
   * Ghi vào `tien_ve_mimi` (chỉ máy chủ ghi được) rồi đối soát NGAY: khách vừa chuyển xong,
   * vài giây sau gói đã chạy. Cron 10 phút vẫn chạy làm lưới đỡ.
   */
  if (laTaiKhoanMimi(accountNumber, Deno.env.get("MIMI_BANK_ACCOUNT"))) {
    if (row.amount <= 0) {
      await ghiKetQua("ignored", "tiền ra từ tài khoản MIMI — không phải việc của đối soát thu phí");
      return ack({ ignored: "mimi outgoing" });
    }
    const { error: loiGhi } = await supabase.from("tien_ve_mimi").upsert({
      nguon: "sepay",
      ma_giao_dich: row.reference_id,
      so_tien: row.amount,
      noi_dung: [row.merchant_name, row.payment_reference].filter(Boolean).join(" ") || null,
      ngay_giao_dich: row.transaction_date,
    }, { onConflict: "nguon,ma_giao_dich", ignoreDuplicates: true });
    if (loiGhi) {
      console.error("ghi tien ve mimi:", loiGhi.message);
      return new Response(JSON.stringify({ error: "write failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const kq = await doiSoatTienVeMimi(supabase);
      await ghiKetQua(
        "verified",
        `tiền về MIMI ${row.amount}đ · kích hoạt ${kq.da_kich_hoat}, lệch số tiền ${kq.lech_so_tien}, chưa khớp ${kq.chua_khop}`,
      );
    } catch (e) {
      // Tiền đã ghi an toàn; cron 10 phút sẽ đối soát lại. Không bắt SePay gửi lại.
      console.error("doi soat tien ve mimi:", e instanceof Error ? e.message : e);
      await ghiKetQua("verified", "tiền về MIMI đã ghi; đối soát lỗi, cron sẽ chạy lại");
    }
    return ack();
  }

  /*
   * 06/10/2026: MIMI BỎ ĐƯỜNG SEPAY CHO KHÁCH. Khách từng tự khai số tài khoản SePay mà không có bước chứng minh
   * mình là chủ tài khoản — ai cũng khai được tài khoản của người khác và đọc tiền về của họ. Từ nay SePay chỉ còn
   * báo tiền về tài khoản nhận của chính MIMI (nhánh trên). Khách đọc sao kê qua Cas hoặc tải tệp sao kê.
   */
  await ghiKetQua("ignored", `tài khoản ${accountNumber} không phải tài khoản nhận của MIMI — MIMI không nhận sao kê khách qua SePay`);
  return ack({ ignored: "not mimi account" });
});
