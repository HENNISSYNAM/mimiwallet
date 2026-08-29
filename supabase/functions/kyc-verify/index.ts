import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import { decryptJson, encryptJson, type EncryptedBlob } from "../_shared/pqcCrypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function getPqcKeys() {
  const publicKey = Deno.env.get("PQC_KYC_PUBLIC_KEY");
  const privateKey = Deno.env.get("PQC_KYC_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    throw new Error(
      "PQC_KYC_PUBLIC_KEY/PQC_KYC_PRIVATE_KEY not configured. Run scripts/generate-pqc-keypair.ts and set them via `supabase secrets set`."
    );
  }
  return { publicKey, privateKey };
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

    const company = await resolveCompany(supabase, user.id);

    if (!company) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method === "POST" ? await req.json() : {};

    let result: unknown;

    switch (action) {
      case "start": {
        // Create or get existing KYC record
        const { data: existing } = await supabase
          .from("kyc_verifications")
          .select("*")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (existing && existing.status === "verified") {
          result = existing;
        } else if (existing) {
          result = existing;
        } else {
          const { data: newKyc } = await supabase
            .from("kyc_verifications")
            .insert({ company_id: company.id, status: "pending" })
            .select()
            .single();
          result = newKyc;
        }
        break;
      }

      case "upload-id": {
        const { side, storagePath, ocr_data } = body;
        if (!storagePath) {
          return new Response(JSON.stringify({ error: "storagePath required (upload the file to secure-documents first)" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const updateData: Record<string, unknown> = {};

        if (side === "front") {
          updateData.id_front_url = storagePath;
        } else {
          updateData.id_back_url = storagePath;
        }

        if (ocr_data) {
          const { publicKey, privateKey } = getPqcKeys();

          // Get existing encrypted ocr_data and merge before re-encrypting
          const { data: existing } = await supabase
            .from("kyc_verifications")
            .select("ocr_data_encrypted")
            .eq("company_id", company.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const existingBlob = existing?.ocr_data_encrypted as EncryptedBlob | null;
          const existingOcrData = existingBlob
            ? await decryptJson<Record<string, unknown>>(existingBlob, privateKey)
            : {};

          updateData.ocr_data_encrypted = await encryptJson(
            { ...existingOcrData, ...ocr_data },
            publicKey
          );
        }

        updateData.status = "id_uploaded";

        const { data: updated } = await supabase
          .from("kyc_verifications")
          .update(updateData)
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .select()
          .single();

        result = updated;
        break;
      }

      case "face-scan": {
        /*
         * KHÔNG chấm điểm. Trước đây chỗ này là:
         *
         *     const faceMatchScore = 95 + Math.random() * 4.5;
         *
         * tức một số ngẫu nhiên 95–99,5% được ghi vào cơ sở dữ liệu rồi hiện
         * lên màn hình dưới dạng "Khuôn mặt khớp 97,3%". Không có khuôn mặt nào
         * được đối chiếu. Nếu từng có ai tin con số đó để chấp nhận một tài
         * khoản là thật, họ đã tin vào Math.random().
         *
         * Chưa tích hợp nhà cung cấp eKYC nào, nên câu trả lời trung thực duy
         * nhất là: đã nhận ảnh, CHƯA xác minh. Để null — null nghĩa là chưa đo,
         * khác hẳn một con số nghĩa là đã đo.
         */
        
        const { data: updated } = await supabase
          .from("kyc_verifications")
          .update({
            face_match_score: null,
            status: "face_pending_review",
          })
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .select()
          .single();

        result = {
          ...updated,
          face_match_score: null,
          verified: false,
          message: "Đã nhận ảnh. Chưa xác minh khuôn mặt — MIMI chưa tích hợp dịch vụ eKYC.",
        };
        break;
      }

      case "liveness": {
        const { data: updated } = await supabase
          .from("kyc_verifications")
          .update({
            // Cùng lý do khối trên: cờ này trước đây luôn được ghi true mà không có
            // phép kiểm nào chạy. Một cờ "đã qua kiểm tra sự sống" luôn đúng là
            // cờ không mang thông tin gì.
            liveness_passed: null,
            status: "liveness_pending_review",
          })
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .select()
          .single();

        result = updated;
        break;
      }

      case "verify-otp": {
        /*
         * ĐÃ GỠ. Bước này từng là chỗ nói dối nặng nhất của cả hàm.
         *
         * Mã cũ ghi `otp_verified: true` và `status: "verified"` — và
         * `"verified"` là trạng thái cuối duy nhất mà hàm này biết ghi. Nhưng
         * nó **không bao giờ đọc `body.otp`**: người dùng gõ sáu chữ số bất kỳ,
         * không mã nào được gửi đi đâu, không mã nào được so. Chú thích cũ ghi
         * thẳng "Mock OTP verification - always succeeds for demo", nghĩa là
         * mọi hồ sơ đi qua đây đều thành "đã xác minh danh tính" mà không có
         * một phép kiểm nào tồn tại.
         *
         * Hai bước `face-scan` và `liveness` đã được sửa cho trung thực trước
         * đó (ghi `null` thay vì số ngẫu nhiên), nên để bước này nguyên là giữ
         * lại đúng cái cửa sau mà hai bước kia vừa đóng.
         *
         * Chưa có nhà cung cấp SMS nào được tích hợp. Khi có, khôi phục bước này
         * kèm phép so mã thật; tới lúc đó hàm trả 501 để nơi gọi biết là chưa
         * làm được, thay vì tưởng đã xong.
         */
        return new Response(
          JSON.stringify({
            error: "Xác minh OTP chưa khả dụng — chưa tích hợp nhà cung cấp SMS.",
            remedy:
              "Hồ sơ của bạn đã được lưu và đang chờ người duyệt. Không cần làm gì thêm.",
          }),
          { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "status": {
        const { data: kyc } = await supabase
          .from("kyc_verifications")
          .select("*")
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (kyc?.ocr_data_encrypted) {
          const { privateKey } = getPqcKeys();
          const ocr_data = await decryptJson<Record<string, unknown>>(
            kyc.ocr_data_encrypted as EncryptedBlob,
            privateKey
          );
          result = { ...kyc, ocr_data };
        } else {
          result = kyc;
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action. Use: start, upload-id, face-scan, liveness, verify-otp, status" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("KYC error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
