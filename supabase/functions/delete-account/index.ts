import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { bankhubConfigFromEnv, removeGrant } from "../_shared/bank/bankhub.ts";
import { decryptField, type EncryptedBlob } from "../_shared/pqcCrypto.ts";
import { tuSupabase, xoaKhoTep } from "../_shared/xoa-tai-khoan/kho-tep.ts";
import { lapKeHoachXoaTaiKhoan, thuMucCanDon } from "../_shared/xoa-tai-khoan/ke-hoach.ts";

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
 *   0. Xoá tệp trong Storage (chung-tu, tai-lieu, secure-documents) — TRƯỚC HẾT, và nếu lỗi thì DỪNG.
 *   1. Thu hồi uỷ quyền đọc sao kê ở phía nhà cung cấp ngân hàng.
 *   2. Xoá các bản ghi giữ dữ liệu bên thứ ba mà khoá ngoại không cuốn theo.
 *   2b. Công ty còn thành viên khác: chuyển `companies.user_id` cho người ở lại (không thì CASCADE xoá
 *      luôn công ty của họ).
 *   3. Xoá người dùng trong auth, để khoá ngoại CASCADE dọn phần còn lại.
 *
 * Vì sao Storage đứng đầu: tệp nằm dưới `{company_id}/…` và không có khoá ngoại nào cuốn theo.
 * Đợi CASCADE xoá dòng công ty xong thì không còn id nào để liệt kê, tệp mồ côi vĩnh viễn. Và vì lỗi
 * Storage thì dừng ngay khi tài khoản còn nguyên, người dùng bấm lại được (mỗi bước chạy lại an toàn);
 * không bao giờ trả "đã xoá" khi còn tệp.
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
    // Giới hạn tần suất mỗi người (26/09/2026): chống bot và script dội yêu cầu.
    if (!(await duocGoi(supabase, user.id, [{ hanh_dong: "xoa_tai_khoan_gio", cua_so_giay: 3600, toi_da: 5 }], false))) return qua429(corsHeaders);

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
    const congTyDoNguoiTao = (companies ?? []).map((c: { id: string }) => c.id);

    // ---- Kế hoạch: công ty nào chết theo, công ty nào còn người khác ----------
    const { data: tvRows, error: tvErr } = congTyDoNguoiTao.length
      ? await supabase.from("thanh_vien_cong_ty").select("company_id, user_id, vai_tro, tao_luc").in("company_id", congTyDoNguoiTao)
      : { data: [], error: null };
    if (tvErr) {
      console.error("delete-account: không đọc được thành viên công ty", tvErr);
      return json({ deleted: false, error: "Không đọc được danh sách thành viên công ty. Tài khoản CHƯA bị xoá, vui lòng thử lại." }, 500);
    }
    const keHoach = lapKeHoachXoaTaiKhoan({ userId: user.id, congTyDoNguoiTao, thanhVien: tvRows ?? [] });
    // Chỉ những công ty chết theo mới bị thu hồi ngân hàng: công ty còn người khác vẫn dùng liên kết đó.
    const companyIds = keHoach.cong_ty_xoa;

    // ---- Bước 0: xoá tệp Storage, lỗi thì dừng ---------------------------------
    const baoCaoKho = await xoaKhoTep(tuSupabase(supabase), { thuMuc: thuMucCanDon(user.id, keHoach) });
    if (!baoCaoKho.ok) {
      console.error("delete-account: xoá Storage chưa xong", JSON.stringify(baoCaoKho.that_bai));
      return json({
        deleted: false,
        error: "Chưa xoá hết tệp đã tải lên nên tài khoản CHƯA bị xoá. Vui lòng thử lại; phần đã xoá được giữ nguyên.",
        storage: { ok: false, files_deleted: baoCaoKho.so_tep_da_xoa, failed: baoCaoKho.that_bai },
      }, 502);
    }

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

    // ---- Bước 2b: công ty còn người khác thì đổi người tạo, để CASCADE không cuốn công ty đi -------
    for (const c of keHoach.chuyen_nguoi_tao) {
      const { error: chuyenErr } = await supabase
        .from("companies")
        .update({ user_id: c.user_id_moi })
        .eq("id", c.company_id)
        .eq("user_id", user.id);
      if (chuyenErr) {
        console.error("delete-account: không chuyển được người tạo công ty", chuyenErr);
        return json({ deleted: false, error: "Không chuyển được quyền sở hữu công ty còn người khác. Tài khoản CHƯA bị xoá, vui lòng thử lại." }, 500);
      }
    }

    // ---- Bước 3: xoá người dùng, CASCADE dọn phần còn lại ------------------
    const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("delete-account: không xoá được auth user", delErr);
      return json({ deleted: false, error: "Không xoá được tài khoản. Vui lòng thử lại.", storage: { ok: true, files_deleted: baoCaoKho.so_tep_da_xoa } }, 500);
    }

    return json({
      deleted: true,
      companies_removed: keHoach.cong_ty_xoa.length,
      /* Công ty còn người khác: giữ nguyên, quyền tạo chuyển cho người ở lại. */
      companies_kept: keHoach.chuyen_nguoi_tao.length,
      /* Trong số đó, công ty không còn chủ doanh nghiệp nào — cần người ở lại được trao quyền chủ. */
      companies_without_owner: keHoach.can_chu_moi,
      storage: { ok: true, files_deleted: baoCaoKho.so_tep_da_xoa },
      /* Rỗng nghĩa là đã thu hồi sạch. Có phần tử nghĩa là còn việc người dùng
         phải tự làm trong ứng dụng ngân hàng. */
      bank_grants_not_revoked: chuaThuHoi,
    });
  } catch (e) {
    console.error("delete-account lỗi", e);
    return json({ error: (e as Error)?.message ?? "Lỗi không xác định" }, 500);
  }
});
