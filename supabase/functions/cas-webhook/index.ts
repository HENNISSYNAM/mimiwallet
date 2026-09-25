import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bankhubConfigFromEnv, fetchQrPayIdentity } from "../_shared/bank/bankhub.ts";
import { kiemGrantQr, nhanKetLuan } from "../_shared/bank/kiem-grant-qr.ts";
import { ingestConnection } from "../_shared/bank/ingest.ts";
import { reconcileCompanyQr } from "../_shared/ledger/qr-reconciler.ts";
import { coSaoKeDeDoc } from "../_shared/bank/dong-bo.ts";
import { decryptField, type EncryptedBlob } from "../_shared/pqcCrypto.ts";
import { docMaWebhookCas } from "../_shared/bank/ma-webhook-cas.ts";
import { docThanhToanQrCas } from "../_shared/bank/thanh-toan-qr-cas.ts";
import { anNhayCam, CACH_XU_LY, docPhongBi, dungMoiTruong, khoaChongTrung } from "../_shared/cas-webhook/phong-bi.ts";
import { trangThaiSauSuKien } from "../_shared/bank/trang-thai-lien-ket.ts";
import { quetVaGhiTienVao } from "../_shared/thong-bao/quet-tien-vao.ts";
import { congTyLaDemo } from "../_shared/minh-hoa.ts";
import { lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";

/**
 * Inbound webhooks from Cas (BankHub).
 *
 * Casso's webhook form has four fields — name, description, URL, category —
 * and no signing secret. So there is no way to prove a request came from them.
 * That single fact decides the whole design of this function:
 *
 *   **The payload is a hint to go and check, never an instruction.**
 *
 * A body claiming "grant X was revoked" does not revoke anything here. It makes
 * us call Cas and ask about grant X. If Cas says the grant is gone, we act on
 * Cas's answer. A forged webhook therefore costs one API call and changes
 * nothing — the worst it can do is make us re-confirm something that is true.
 *
 * A shared key is still required in the URL, as a cheap filter so random
 * internet noise never reaches the verification step. It is a filter, not the
 * security boundary; the verification call is the boundary.
 *
 * Everything that arrives is written to `webhook_events` before any decision,
 * including bodies we cannot parse. We do not have a schema for these payloads,
 * and guessing at an undocumented shape is exactly what cost four rounds of
 * wrong fixes on the Cas Link flow. The first real delivery will tell us.
 *
 * Like the SePay endpoint, this answers 200 to almost everything: a webhook a
 * provider considers failed gets retried, and retrying a payload that can never
 * be handled just buries real failures in their queue.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ack(extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ success: true, ...extra }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Constant-time compare, so the key cannot be recovered a byte at a time. */
function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/**
 * The key can travel as `?key=…` or as a trailing path segment, because it is
 * not yet known whether Casso's URL field accepts a query string. Supporting
 * both costs three lines and removes a round trip through their console.
 */
function presentedKey(url: URL): string {
  const q = url.searchParams.get("key");
  if (q) return q.trim();
  const parts = url.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("cas-webhook");
  return i >= 0 && parts.length > i + 1 ? parts[i + 1].trim() : "";
}

/** Pull a string out of a nested object by trying several plausible paths. */
function pick(obj: unknown, paths: string[][]): string | undefined {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path) {
      if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = undefined;
        break;
      }
    }
    if (typeof cur === "string" && cur) return cur;
  }
  return undefined;
}

/**
 * Mã tham chiếu của một khoản thu QR.
 *
 * Vì sao cần: sự kiện thanh toán QR lấy chủ thể là cái mã QR, không phải cái grant — nên payload có
 * thể KHÔNG mang `grantId`. Trước 06/09 mọi envelope thiếu `grantId` đều bị ném bỏ, kể cả khi nó
 * đang báo đúng khoản tiền mình đang chờ. Dò nhiều đường vì Cas không công bố hình dạng loại này.
 */
function docMaThamChieu(payload: unknown): string | undefined {
  return pick(payload, [
    ["referenceNumber"], ["reference_number"], ["reference"],
    ["data", "referenceNumber"], ["data", "reference_number"], ["data", "reference"],
    ["invoice", "referenceNumber"], ["qrPay", "referenceNumber"],
    // Hình dạng thật, thấy lần đầu 14/09/2026 — xem `thanh-toan-qr-cas.ts`.
    ["transaction", "paymentMeta", "referenceNumber"],
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("CAS_WEBHOOK_KEY");
  if (!expected) {
    // Refusing to run is the point. A missing secret must never quietly turn a
    // public endpoint into an unauthenticated one — that is the same shape of
    // bug as the demo-credential defaults that once signed every visitor in.
    console.error("CAS_WEBHOOK_KEY is not set — refusing every request");
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!safeEqual(presentedKey(new URL(req.url)), expected)) {
    console.warn("rejected cas webhook: bad or missing key");
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { unparsed: raw.slice(0, 4000) };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const pb = docPhongBi(payload);
  const type = pb.loai === "RONG" || pb.loai === "KHONG_RO" ? undefined : pb.loai;
  const code = pb.ma ?? undefined;
  const grantId = pb.grantId ?? undefined;
  const reference = docMaThamChieu(payload);
  const batDau = Date.now();

  /*
   * GHI TRƯỚC MỌI QUYẾT ĐỊNH, NHƯNG BỎ DỮ LIỆU ĐỊNH DANH TRƯỚC KHI GHI.
   *
   * Payload SIGN mang `identityKey` (khoá tra định danh người ký), eSign mang số CCCD. Nhật ký
   * webhook để gỡ lỗi, không phải chỗ lưu giấy tờ tuỳ thân — xem `_shared/cas-webhook/phong-bi.ts`.
   */
  const sach = anNhayCam(payload) as Record<string, unknown>;

  /*
   * CHỐNG TRÙNG. Cas gửi lại webhook lỗi tới 17 lần trong 24 giờ (INVOICE/TVAN 3 lần, cách 1 phút)
   * và KHÔNG gửi mã sự kiện nào, nên khoá duy nhất là mã băm của chính nội dung. CSDL từ chối dòng
   * trùng, và lời từ chối đó chính là câu "đã xử lý rồi".
   */
  const bam = await khoaChongTrung(sach);
  const { data: event, error: loiGhi } = await supabase
    .from("webhook_events")
    .insert({
      provider: "bankhub",
      event_type: type ?? null,
      event_code: code ?? null,
      grant_id: grantId ?? null,
      environment: pb.moiTruong,
      subject_type: pb.chuThe?.kieu ?? null,
      subject_id: pb.chuThe?.id ?? null,
      payload_hash: bam,
      payload: sach,
      outcome: "received",
    })
    .select("id")
    .maybeSingle();

  if (loiGhi) {
    if (/duplicate|unique/i.test(loiGhi.message)) {
      await supabase.rpc("dem_lan_nhan_webhook", { p_provider: "bankhub", p_hash: bam });
      console.log(`cas webhook ${type ?? "?"}/${code ?? "?"}: trùng, đã xử lý trước đó`);
      return ack({ outcome: "duplicate" });
    }
    // Không ghi được thì cũng không xử lý: xử lý mà không có dấu vết là chỗ khó lần nhất về sau.
    console.error("cas webhook: không ghi được webhook_events:", loiGhi.message);
    return new Response(JSON.stringify({ error: "log failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const finish = async (outcome: string, note?: string, handler?: string) => {
    if (event?.id) {
      await supabase
        .from("webhook_events")
        .update({
          outcome,
          note: note ?? null,
          handler: handler ?? null,
          processed_at: new Date().toISOString(),
          duration_ms: Date.now() - batDau,
        })
        .eq("id", event.id);
    }
    console.log(`cas webhook ${type ?? "?"}/${code ?? "?"} grant=${grantId ?? "?"}: ${outcome}`);
    return ack({ outcome, detail: note });
  };

  /*
   * THÂN RỖNG `{}` LÀ LẦN CAS CONSOLE GỬI THỬ khi lưu cấu hình — không phải lỗi, không phải sự kiện
   * bị bỏ sót. Gọi đúng tên để nhật ký không lẫn 12 lần bấm Lưu với 12 sự kiện thật bị mất.
   */
  if (pb.loai === "RONG") return await finish("kiem_tra_console", "thân rỗng — Cas Console gửi thử");

  /*
   * SỰ KIỆN SANDBOX KHÔNG ĐƯỢC CHẠM DỮ LIỆU THẬT (và ngược lại). Cas gửi `environment` trong mọi
   * payload; bản trước không đọc trường đó, nên chỉ cần một `grantId` trùng giữa hai môi trường là
   * tiền giả của sandbox đi thẳng vào sổ công ty thật.
   */
  if (!dungMoiTruong(pb.moiTruong, Deno.env.get("BANKHUB_ENV") ?? "sandbox")) {
    return await finish("sai_moi_truong", `sự kiện thuộc môi trường ${pb.moiTruong}`);
  }

  /*
   * BỐN LOẠI CHỈ GHI NHẬN: INVOICE, TVAN, SIGN, AUTO_DEBIT.
   *
   * MIMI chưa gọi Invoice Hub, TVAN, eSign hay Auto Debit, nên không có gì để đối chiếu và không có
   * đường hỏi lại Cas cho các loại này. Webhook Cas lại không có chữ ký — đổi trạng thái nghiệp vụ
   * chỉ vì một lời báo không kiểm được là tự mở cửa cho payload giả.
   * Xem `docs/KIEM_TOAN_CAS_WEBHOOK.md` mục O.
   */
  if (pb.loai !== "GRANT" && pb.loai !== "TRANSACTIONS" && pb.loai !== "KHONG_RO") {
    return await finish("chua_dung", CACH_XU_LY[pb.loai].ket_qua_san_pham, `ghiNhan:${pb.loai}`);
  }

  if (!grantId) {
    /*
     * KHÔNG CÒN NÉM BỎ NGAY. Sửa 06/09/2026.
     *
     * Sự kiện thanh toán QR lấy chủ thể là cái mã QR chứ không phải cái grant,
     * nên payload có thể không mang `grantId`. Bản cũ ném bỏ tất cả — nghĩa là
     * Casso có thể đã gửi đúng thông báo "tiền đã về" và MIMI vứt nó đi, rồi
     * mình đi báo với Casso là không nhận được hook.
     *
     * Trước khi bỏ, thử khớp bằng mã tham chiếu: nó do chính máy chủ này sinh
     * ra lúc tạo QR (`bank-link`, nhánh create-qr) và được lưu ở
     * `qr_payments.reference_number`, nên khớp được là chắc chắn đúng khoản.
     */
    if (reference) {
      const { data: qr } = await supabase
        .from("qr_payments")
        .select("id, company_id, status")
        .eq("reference_number", reference)
        .maybeSingle();

      if (qr?.company_id) {
        const r = await reconcileCompanyQr(supabase, qr.company_id);
        return await finish(
          "verified",
          `qr ref ${reference}: ${r.settled} settled / ${r.mismatched} mismatch`,
        );
      }
      return await finish("ignored", `no qr payment for reference ${reference}`);
    }

    // Hết đường khớp. Vẫn trả 200: gửi lại cũng không làm payload có thêm id.
    return await finish("ignored", "no grant id and no reference in payload");
  }

  const { data: conns, error: lookupError } = await supabase
    .from("bank_connections")
    .select(
      "id, company_id, status, access_token_enc, account_number, bank_name, last_reference, direction_convention, scopes",
    )
    .eq("provider", "bankhub")
    .eq("grant_id", grantId);

  if (lookupError) {
    // A database hiccup is genuinely worth retrying, unlike a bad payload.
    console.error("cas webhook lookup failed:", lookupError.message);
    return new Response(JSON.stringify({ error: "lookup failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!conns || conns.length === 0) {
    // Kèm mã: grant không còn liên kết thường là grant vừa bị thu hồi, và mã là
    // thứ phân biệt "người dùng ngắt quyền" với "cập nhật định kỳ của grant cũ".
    return await finish("ignored", `no connection for grant ${grantId}${code ? ` · ${code}` : ""}`);
  }

  const privateKey = Deno.env.get("PQC_KYC_PRIVATE_KEY");
  if (!privateKey) {
    console.error("PQC_KYC_PRIVATE_KEY is not set — cannot verify grant state");
    return await finish("unverifiable", "decryption key unavailable");
  }

  let cfg;
  try {
    cfg = bankhubConfigFromEnv();
  } catch (e) {
    console.error("cas webhook: bankhub not configured", e);
    return await finish("unverifiable", (e as Error).message);
  }

  // ── Ask Cas what is actually true ──────────────────────────────────────────
  //
  // The same ingest path the customer's own "sync" button uses. Cas has to be
  // called either way to check the grant, and the call returns transactions, so
  // throwing them away would waste the one request per grant per minute that
  // Cas allows. A GRANT event therefore also picks up anything recent; a
  // TRANSACTIONS event reaches back a week in case a delivery was missed.
  const today = new Date().toISOString().slice(0, 10);
  const back = new Date();
  back.setDate(back.getDate() - (type === "TRANSACTIONS" ? 7 : 1));
  const window = { fromDate: back.toISOString().slice(0, 10), toDate: today };

  const outcomes: string[] = [];
  /** Có ghi thêm giao dịch nào không — chỉ khi có mới đi hỏi người dùng. */
  let daGhiThem = false;

  for (const conn of conns) {
    /*
     * LIÊN KẾT ĐÃ NGẮT THÌ KHÔNG XỬ LÝ, VÀ NÓI RÕ LÀ ĐÃ NGẮT.
     *
     * Trước 07/09 vòng này không nhìn `status`, nên một grant đã ngắt vẫn được
     * hỏi lại Cas và ghi `verified` vào nhật ký. Ngày 07/09 hai dòng
     * `TRANSACTIONS ... verified` khiến cả nhóm tin rằng webhook đang chạy
     * đúng vào liên kết đang sống — trong khi nó chạy vào một liên kết `qrpay`
     * đã ngắt của một công ty khác.
     *
     * `verified` cho một liên kết đã ngắt là một câu nói sai: nó khẳng định
     * mọi thứ ổn ở đúng chỗ không còn gì để ổn. Người đọc nhật ký dựa vào đó
     * để quyết định đi hỏi ai.
     */
    if (conn.status === "disconnected") {
      outcomes.push(`${conn.id}:da-ngat`);
      continue;
    }

    if (!conn.access_token_enc || !conn.account_number) {
      outcomes.push(`${conn.id}:no-token`);
      continue;
    }

    let accessToken: string;
    try {
      accessToken = await decryptField(conn.access_token_enc as unknown as EncryptedBlob, privateKey);
    } catch (e) {
      console.error(`connection ${conn.id}: decrypt failed`, e);
      outcomes.push(`${conn.id}:decrypt-failed`);
      continue;
    }

    /*
     * LIÊN KẾT QR: HỎI CAS, KHÔNG MẶC ĐỊNH "CÒN SỐNG".
     *
     * Liên kết QR không có sao kê nên `ingestConnection` không gọi Cas, và bản
     * trước ghi `alive` cho mọi webhook tới nó — kể cả `USER_PERMISSION_REVOKED`
     * thật ngày 12/09/2026. Xem `_shared/bank/kiem-grant-qr.ts`.
     */
    /*
     * NGƯỜI DÙNG TẠM DỪNG GRANT (`GRANT_PAUSED`): KHÔNG phải mất quyền. Họ mở app Cas ID bật lại là
     * xong; bảo họ "liên kết lại" là chỉ sai đường. Xem `_shared/bank/trang-thai-lien-ket.ts`.
     */
    if (trangThaiSauSuKien(code, pb.maLoi) === "paused") {
      await supabase.from("bank_connections")
        .update({ status: "paused", last_error_code: pb.maLoi ?? null, last_error_at: new Date().toISOString() })
        .eq("id", conn.id);
      outcomes.push(`${conn.id}:tam-dung`);
      continue;
    }

    if (conn.scopes === "qrpay") {
      const kl = await kiemGrantQr(() => fetchQrPayIdentity(cfg, accessToken));
      if (kl.trangThai === "da_thu_hoi") {
        await supabase
          .from("bank_connections")
          .update({
            status: "disconnected",
            revoked_at: new Date().toISOString(),
            access_token_enc: null,
            grant_id: null,
          })
          .eq("id", conn.id);
      } else if (kl.trangThai === "song" && conn.status !== "connected") {
        await supabase.from("bank_connections").update({ status: "connected", revoked_at: null }).eq("id", conn.id);
      }
      outcomes.push(`${conn.id}:${nhanKetLuan(kl)}`);

      /*
       * THANH TOÁN QR: GHI NHẬN LỜI BÁO, TẤT TOÁN CHỈ KHI CÓ TIỀN THẬT.
       *
       * Từ 14/09/2026 (case 15) biết chắc Casso gửi `paymentMeta.referenceNumber`
       * — mã do chính máy chủ này sinh lúc tạo QR. Nhưng webhook không có chữ ký,
       * nên nó KHÔNG tự đánh dấu mã QR đã trả: chỉ ghi vào nhật ký rồi chạy đối
       * soát, và đối soát chỉ tất toán khi một giao dịch ngân hàng thật (SePay,
       * sao kê) khớp mã hoặc tài khoản ảo. Tiền về SePay sau webhook này thì chính
       * `bank-webhook` sẽ tất toán.
       */
      const tt = kl.trangThai === "song" ? docThanhToanQrCas(payload) : null;
      if (tt) {
        const { data: maQr } = await supabase
          .from("qr_payments")
          .select("status, amount")
          .eq("company_id", conn.company_id)
          .eq("reference_number", tt.maThamChieu)
          .maybeSingle();
        const r = maQr ? await reconcileCompanyQr(supabase, conn.company_id) : null;
        outcomes.push(
          maQr
            ? `qr ${tt.maThamChieu} (${tt.soTien ?? "?"}đ, ${tt.maNganHang ?? "?"}): ` +
                (r?.settled ? `tất toán ${r.settled}` : r?.mismatched ? `lệch ${r.mismatched}` : `${maQr.status}, chờ tiền về sổ`)
            : `qr ${tt.maThamChieu}: không thuộc công ty này`,
        );
      }
      continue;
    }

    const result = await ingestConnection(supabase, cfg, accessToken, conn, window);

    /*
     * GRANT ĐÃ MẤT: `ingestConnection` đã ngắt và xoá token, giống liên kết QR ở
     * trên. Nhánh này phải đứng TRƯỚC `needsRelink` — bản cũ kiểm GRANT_NOT_FOUND
     * sau `needsRelink`, mà GRANT_NOT_FOUND cũng mang `needsRelink`, nên liên kết
     * đọc sao kê bị thu hồi trên Cas ID không bao giờ được ngắt (Casso 15/09/2026).
     */
    if (result.revoked) {
      outcomes.push(`${conn.id}:da-thu-hoi:${result.errorCode ?? "?"}`);
      continue;
    }

    if (result.needsRelink) {
      // ingestConnection already parked the connection; CasLink.tsx surfaces
      // that status as a prompt to link again.
      outcomes.push(`${conn.id}:needs-relink`);
      continue;
    }

    if (result.errorCode === "RATE_LIMIT") {
      // Cas allows roughly one call per grant per minute. Not knowing is not
      // the same as knowing the grant is dead, so nothing changes here.
      outcomes.push(`${conn.id}:rate-limited`);
      continue;
    }

    if (result.error || result.errorCode) {
      outcomes.push(`${conn.id}:${result.errorCode ?? "error"}`);
      continue;
    }

    // Cas answered, so the grant is alive whatever the payload claimed. If it
    // had previously been parked, this is the signal to bring it back — which
    // is exactly what a DEFAULT_UPDATE event means.
    if (conn.status !== "connected") {
      await supabase
        .from("bank_connections")
        .update({ status: "connected", revoked_at: null })
        .eq("id", conn.id);
      outcomes.push(`${conn.id}:restored+${result.inserted}`);
      if (result.inserted) daGhiThem = true;
    } else {
      /*
       * PHÂN BIỆT "KHÔNG CÓ GÌ" VỚI "KHÔNG HỎI".
       *
       * `alive+0` trước nay gộp hai chuyện khác hẳn nhau:
       *   - Đã hỏi Cas, Cas trả về không giao dịch nào.
       *   - Không hỏi Cas, vì đây là liên kết `qrpay` không có sao kê để đọc
       *     (`coSaoKeDeDoc` trong `_shared/bank/dong-bo.ts`).
       *
       * Hai ca đó dẫn tới hai kết luận trái ngược — một cái là "Casso không có
       * dữ liệu", cái kia là "mình cố ý bỏ qua". Ngày 07/09 chính sự mơ hồ này
       * suýt làm đọc sai một dòng nhật ký thành bằng chứng chống lại đối tác.
       */
      // Tới đây mà không có sao kê thì là liên kết thuế: KHÔNG hỏi Cas, nên không
      // được ghi "alive" — ghi đúng là không hỏi.
      const nhan = coSaoKeDeDoc(conn) ? `alive+${result.inserted}` : "khong-hoi-cas:khong-co-sao-ke";
      outcomes.push(`${conn.id}:${nhan}`);
      if (result.inserted) daGhiThem = true;
    }
  }

  // One reconcile per company touched, after everything is stored.
  for (const companyId of new Set(conns.map((c) => c.company_id))) {
    const r = await reconcileCompanyQr(supabase, companyId);
    if (r.settled || r.mismatched) {
      outcomes.push(`qr:${r.settled}settled/${r.mismatched}mismatch`);
    }

    /*
     * TIỀN VỪA VỀ THÌ HỎI NGAY, KHÔNG ĐỂ NGƯỜI DÙNG CHỜ HẾT GIỜ.
     *
     * Trước 25/09/2026 khoản tiền vào chưa rõ chỉ được hỏi ở lượt quét đầu giờ sau. Khoá chống
     * trùng của `thong_bao` lo phần lặp, nên chạy thêm ở đây không sinh thông báo trùng.
     *
     * Đo lường và thông báo KHÔNG BAO GIỜ được làm hỏng việc chính: giao dịch đã ghi xong rồi,
     * hỏng ở đây chỉ ghi log.
     */
    if (daGhiThem) {
      try {
        const moi = await quetVaGhiTienVao(supabase, companyId, lucGioVietNam(), await congTyLaDemo(supabase, companyId));
        if (moi) outcomes.push(`thong-bao:${moi}`);
      } catch (e) {
        console.error("cas webhook: quét tiền vào lỗi", e instanceof Error ? e.message : e);
      }
    }
  }

  return await finish("verified", outcomes.join(", "), pb.loai === "TRANSACTIONS" ? "xuLyGiaoDich" : "xuLyGrant");
});
