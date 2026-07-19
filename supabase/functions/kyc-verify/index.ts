import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    const { data: company } = await supabase
      .from("companies")
      .select("id")
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
        // Simulate face matching - returns mock score
        const faceMatchScore = 95 + Math.random() * 4.5; // 95-99.5%
        
        const { data: updated } = await supabase
          .from("kyc_verifications")
          .update({
            face_match_score: Math.round(faceMatchScore * 10) / 10,
            status: "face_verified",
          })
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .select()
          .single();

        result = { ...updated, face_match_score: Math.round(faceMatchScore * 10) / 10 };
        break;
      }

      case "liveness": {
        const { data: updated } = await supabase
          .from("kyc_verifications")
          .update({
            liveness_passed: true,
            status: "liveness_passed",
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
        // Mock OTP verification - always succeeds for demo
        const { data: updated } = await supabase
          .from("kyc_verifications")
          .update({
            otp_verified: true,
            status: "verified",
            verified_at: new Date().toISOString(),
          })
          .eq("company_id", company.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .select()
          .single();

        result = updated;
        break;
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
