import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reconcileCompanyQr } from "../_shared/ledger/qr-reconciler.ts";
import { mapSepayWebhook } from "../_shared/bank/sepay-map.ts";

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

  const { data: conn, error: connError } = await supabase
    .from("bank_connections")
    .select("id, company_id, bank_name")
    .eq("provider", "sepay")
    .eq("account_number", accountNumber)
    .eq("status", "connected")
    .maybeSingle();

  if (connError) {
    // A database hiccup is worth retrying, unlike a bad payload, so this is the
    // one path that deliberately returns a non-200.
    console.error("lookup failed:", connError.message);
    return new Response(JSON.stringify({ error: "lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!conn) {
    console.warn(`no connected sepay account matches ${accountNumber}`);
    await ghiKetQua(
      "ignored",
      `chưa khai tài khoản ${accountNumber} trong MIMI — vào Fintech Hub, khối SePay`,
    );
    return ack({ ignored: "unknown account" });
  }

  const { error: writeError } = await supabase
    .from("transactions")
    .upsert(
      { ...row, company_id: conn.company_id },
      { onConflict: "company_id,reference_id", ignoreDuplicates: true },
    );

  if (writeError) {
    console.error("insert failed:", writeError.message);
    return new Response(JSON.stringify({ error: "write failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase
    .from("bank_connections")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", conn.id);

  /*
   * ĐỐI SOÁT MÃ QR NGAY SAU KHI GHI GIAO DỊCH.
   *
   * Mắt xích thiếu, tìm ra 07/09/2026. Đường SePay vốn đã đầy đủ: nhận webhook,
   * ánh xạ, ghi vào `transactions`. Nhưng nó dừng ở đó — không ai gọi
   * `reconcileCompanyQr`, nên một khoản tiền vào khớp đúng mã tham chiếu của
   * một mã QR đang chờ vẫn để mã đó ở `pending` vĩnh viễn.
   *
   * VÌ SAO ĐÁNG GIÁ HƠN MỘT BẢN VÁ NHỎ. Đường Cas hiện đang tắc: `/transactions`
   * trả về rỗng cho tài khoản hợp lệ, và không có webhook nào khi tiền thật về.
   * Cả hai đều nằm ngoài tầm sửa của mình. Nhưng SePay là một đường HOÀN TOÀN
   * ĐỘC LẬP cho cùng một việc — nó canh tài khoản và đẩy thông báo kèm nội dung
   * chuyển khoản, đúng cách đối soát của Việt Nam. Mã QR thì `lib/vietqr.ts`
   * dựng ngay tại máy khách, cũng không cần Cas.
   *
   * Nối một dòng này là vòng "khách quét mã → tiền về → hoá đơn tự tất toán"
   * đóng lại được mà không phụ thuộc bên nào trả lời.
   */
  const kq = await reconcileCompanyQr(supabase, conn.company_id);
  if (kq.settled || kq.mismatched) {
    console.log(`sepay qr reconcile: ${kq.settled} settled, ${kq.mismatched} mismatch`);
  }
  await ghiKetQua(
    "verified",
    `ghi 1 giao dịch cho ${conn.bank_name ?? accountNumber}` +
      (kq.settled || kq.mismatched
        ? ` · khớp QR: ${kq.settled} xong, ${kq.mismatched} lệch`
        : " · không có mã QR nào đang chờ khớp"),
  );

  console.log(
    `stored ${row.type} ${row.amount} for company ${conn.company_id} (${row.reference_id})`,
  );
  return ack();
});
