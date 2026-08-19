import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bankhubConfigFromEnv, removeGrant } from "../_shared/bank/bankhub.ts";
import { decryptField, type EncryptedBlob } from "../_shared/pqcCrypto.ts";

/**
 * Người dùng tự xoá tài khoản và toàn bộ dữ liệu.
 *
 * BẮT BUỘC PHẢI CÓ, không phải tính năng thêm cho đẹp: App Store Guideline
 * 5.1.1(v) yêu cầu ứng dụng nào cho tạo tài khoản thì phải cho xoá ngay trong
 * ứng dụng, không được bắt người dùng gửi email xin xoá. Google Play có yêu cầu
 * tương đương. Ngoài ra Chính sách bảo mật của MIMI đã hứa điều này, nên nếu
 * không có nó thì văn bản đó thành một lời hứa suông.
 *
 * THỨ TỰ XOÁ, và vì sao thứ tự lại quan trọng:
 *
 *   1. Thu hồi uỷ quyền đọc sao kê ở phía nhà cung cấp ngân hàng — TRƯỚC.
 *   2. Xoá các bản ghi giữ dữ liệu bên thứ ba mà khoá ngoại không cuốn theo.
 *   3. Xoá người dùng trong auth, để khoá ngoại CASCADE dọn phần còn lại.
 *
 * Nếu làm ngược, tức xoá người dùng trước, thì mã truy cập ngân hàng biến mất
 * cùng dữ liệu và KHÔNG CÒN CÁCH NÀO thu hồi uỷ quyền nữa. Uỷ quyền đó sẽ sống
 * tiếp ở phía nhà cung cấp trong khi tài khoản đã không còn — nghĩa là một
 * quyền đọc tài khoản ngân hàng còn hiệu lực mà không ai còn quản. Đó là hỏng
 * về quyền riêng tư, không phải một chi tiết dọn dẹp.
 *
 * Bước 1 là "cố gắng hết sức" chứ không chặn: nếu nhà cung cấp đang lỗi, quyền
 * được xoá tài khoản của người dùng vẫn phải được tôn trọng. Nhưng kết quả trả
 * về nói rõ liên kết nào chưa thu hồi được, để người dùng biết mà vào ứng dụng
 * ngân hàng huỷ tay — nói thật còn hơn báo thành công rồi im lặng.
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
 * Câu người dùng phải gõ đúng để xác nhận.
 *
 * Không dấu, viết hoa, để gõ được trên mọi bàn phím. Đây là hàng rào chống bấm
 * nhầm: một hộp thoại "Bạn chắc chứ?" bị bấm Đồng ý theo phản xạ, còn gõ lại
 * một câu thì buộc phải đọc.
 */
const CAU_XAC_NHAN = "XOA TAI KHOAN CUA TOI";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== CAU_XAC_NHAN) {
      return json(
        { error: `Cần xác nhận bằng đúng câu: "${CAU_XAC_NHAN}"` },
        400,
      );
    }

    /*
     * Lấy mọi công ty của người dùng, không phải công ty đầu tiên.
     *
     * `resolveCompany` cố ý trả về một công ty cũ nhất, đúng cho các nghiệp vụ
     * khác. Ở đây dùng nó là sai: người dùng có thể sở hữu nhiều công ty, và
     * xoá tài khoản phải quét hết — bỏ sót một công ty là bỏ sót các liên kết
     * ngân hàng của công ty đó.
     */
    const { data: companies } = await supabase
      .from("companies")
      .select("id")
      .eq("user_id", user.id);
    const companyIds = (companies ?? []).map((c: { id: string }) => c.id);

    // ---- Bước 1: thu hồi uỷ quyền ngân hàng -------------------------------
    const chuaThuHoi: { connection_id: string; ly_do: string }[] = [];

    if (companyIds.length) {
      const { data: conns } = await supabase
        .from("bank_connections")
        .select("id, access_token_enc")
        .in("company_id", companyIds)
        .neq("status", "disconnected");

      const privateKey = Deno.env.get("PQC_KYC_PRIVATE_KEY");

      for (const conn of conns ?? []) {
        const c = conn as { id: string; access_token_enc: unknown };
        if (!c.access_token_enc || !privateKey) {
          chuaThuHoi.push({ connection_id: c.id, ly_do: "không đọc được mã truy cập" });
          continue;
        }
        try {
          const cfg = bankhubConfigFromEnv();
          const accessToken = await decryptField(
            c.access_token_enc as unknown as EncryptedBlob,
            privateKey,
          );
          const kq = await removeGrant(cfg, accessToken);
          /*
           * Ngân hàng đòi OTP để huỷ uỷ quyền. Không thể hỏi OTP ở đây — người
           * dùng đang xoá tài khoản, luồng này không có chỗ nhập. Ghi lại để
           * báo cho họ tự vào ứng dụng ngân hàng huỷ, thay vì lặng lẽ bỏ qua.
           */
          if (kq.otpRequired) {
            chuaThuHoi.push({
              connection_id: c.id,
              ly_do: "ngân hàng yêu cầu OTP để huỷ uỷ quyền",
            });
          }
        } catch (e) {
          chuaThuHoi.push({
            connection_id: c.id,
            ly_do: (e as Error)?.message ?? "lỗi không xác định",
          });
        }
      }
    }

    // ---- Bước 2: dọn dữ liệu bên thứ ba mà CASCADE không cuốn theo ---------
    /*
     * `invites.invited_by` và `invites.accepted_by` là ON DELETE SET NULL, nên
     * dòng lời mời SỐNG SÓT sau khi người dùng bị xoá — và nó mang địa chỉ
     * email của người được mời. Xoá tài khoản mà để lại email của người khác
     * là xoá chưa xong.
     */
    await supabase.from("invites").delete().eq("invited_by", user.id);
    await supabase.from("invites").delete().eq("accepted_by", user.id);

    // ---- Bước 3: xoá người dùng, CASCADE dọn phần còn lại ------------------
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("delete-account: không xoá được auth user", delErr);
      return json({ error: "Không xoá được tài khoản. Vui lòng thử lại." }, 500);
    }

    return json({
      deleted: true,
      companies_removed: companyIds.length,
      /* Rỗng nghĩa là đã thu hồi sạch. Có phần tử nghĩa là còn việc người dùng
         phải tự làm trong ứng dụng ngân hàng. */
      bank_grants_not_revoked: chuaThuHoi,
    });
  } catch (e) {
    console.error("delete-account lỗi", e);
    return json({ error: (e as Error)?.message ?? "Lỗi không xác định" }, 500);
  }
});
