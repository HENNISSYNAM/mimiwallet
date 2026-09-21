/**
 * Edge function `cong-ty` — quản lý thành viên của công ty (MIMI-P1-003, phần còn thiếu).
 *
 * Hành động (POST, JSON `{ hanh_dong, company_id?, ... }`):
 *   - thanh_vien   : danh sách thành viên + email + vai trò. Mọi thành viên xem được.
 *   - moi          : { email, vai_tro } — thêm một người ĐÃ CÓ tài khoản MIMI vào công ty.
 *   - doi_vai_tro  : { user_id, vai_tro }
 *   - go_bo        : { user_id }
 *   - roi          : tự rời công ty.
 *
 * VÌ SAO CHỈ THÊM NGƯỜI ĐÃ CÓ TÀI KHOẢN. Bảng `invites` hiện có là lời mời cấp nền tảng, không
 * gắn công ty; một lời mời theo công ty cần bảng mới. Và gửi email mời lúc này cũng không tới:
 * dự án chưa có SMTP riêng. Nên bản đầu nói thẳng: người được mời đăng ký MIMI trước (Google
 * đăng nhập được ngay), rồi chủ công ty thêm họ bằng email.
 *
 * Luật ai được làm gì nằm ở `_shared/quyen/thanh-vien.ts` (có test). Mọi thay đổi ghi vào
 * `nhat_ky_quyet_dinh` — ai trao quyền cho ai, lúc nào — vì đây là chỗ quyết định ai được duyệt
 * chi tiền của công ty.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { laVaiTro, TEN_VAI_TRO, type VaiTro } from "../_shared/quyen/vai-tro.ts";
import { chuanEmail, kiemThaoTac, laEmail, type ThaoTacThanhVien } from "../_shared/quyen/thanh-vien.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

// deno-lint-ignore no-explicit-any
type Db = any;

const GIOI_HAN: Record<string, { cuaSoGiay: number; toiDa: number }> = {
  thanh_vien: { cuaSoGiay: 60, toiDa: 60 },
  moi: { cuaSoGiay: 60, toiDa: 10 },
  doi_vai_tro: { cuaSoGiay: 60, toiDa: 30 },
  go_bo: { cuaSoGiay: 60, toiDa: 30 },
  roi: { cuaSoGiay: 60, toiDa: 5 },
};

interface DongThanhVien { user_id: string; vai_tro: VaiTro; tao_luc: string; moi_boi: string | null }

async function docThanhVien(db: Db, companyId: string): Promise<DongThanhVien[]> {
  const { data, error } = await db.from("thanh_vien_cong_ty")
    .select("user_id, vai_tro, tao_luc, moi_boi").eq("company_id", companyId).order("tao_luc", { ascending: true }).limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((r: DongThanhVien) => laVaiTro(r.vai_tro));
}

/** Tìm tài khoản theo email bằng Admin API. Không có hàm tra thẳng theo email nên duyệt trang. */
async function timTheoEmail(db: Db, email: string): Promise<{ id: string; email: string } | null> {
  for (let trang = 1; trang <= 20; trang++) {
    const { data, error } = await db.auth.admin.listUsers({ page: trang, perPage: 1000 });
    if (error) throw new Error(error.message);
    const ds = (data?.users ?? []) as { id: string; email?: string | null }[];
    const u = ds.find((x) => x.email && chuanEmail(x.email) === email);
    if (u) return { id: u.id, email: String(u.email) };
    if (ds.length < 1000) return null;
  }
  return null;
}

async function emailCua(db: Db, userId: string): Promise<string | null> {
  const { data } = await db.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function ghiNhatKy(db: Db, p: {
  companyId: string; nguoiLam: string; vaiTro: VaiTro; thaoTac: ThaoTacThanhVien; doiTuong: string;
  thamSo: Record<string, unknown>; moTa: string;
}) {
  const { error } = await db.from("nhat_ky_quyet_dinh").insert({
    company_id: p.companyId,
    user_id: p.nguoiLam,
    vai_tro: p.vaiTro,
    de_xuat_khoa: `thanh_vien:${p.thaoTac}:${p.doiTuong}`,
    loai: "quan_ly_thanh_vien",
    tham_so: p.thamSo,
    mo_ta_da_xac_nhan: p.moTa.slice(0, 2000),
    ket_qua: "thanh_cong",
    xong_luc: new Date().toISOString(),
  });
  // Không chặn thao tác vì ghi nhật ký hỏng — nhưng phải thấy được trong log.
  if (error) console.error("cong-ty: không ghi được nhật ký:", error.message);
}

const demChu = (ds: DongThanhVien[]) => ds.filter((r) => r.vai_tro === "chu_so_huu").length;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // deno-lint-ignore no-explicit-any
    let body: Record<string, any>;
    try { body = await req.json(); } catch { return loi("THAM_SO", "Thân yêu cầu không phải JSON.", 400); }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string; name: string | null }>(db, user.id, "id, name", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);
    const companyId = ct.cong_ty.id;
    const toi = { id: user.id, vai_tro: ct.vai_tro };

    const hanhDong = String(body.hanh_dong ?? "");
    const gh = GIOI_HAN[hanhDong];
    if (!gh) return loi("THAM_SO", "Hành động không hợp lệ.", 400);
    const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
      p_user: user.id, p_hanh_dong: `cong_ty:${hanhDong}`, p_cua_so_giay: gh.cuaSoGiay, p_toi_da: gh.toiDa,
    });
    if (loiDem) console.error("cong-ty gioi han:", loiDem.message);
    else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);

    const ds = await docThanhVien(db, companyId);

    if (hanhDong === "thanh_vien") {
      const coEmail = await Promise.all(ds.map(async (r) => ({
        user_id: r.user_id, vai_tro: r.vai_tro, tao_luc: r.tao_luc, email: await emailCua(db, r.user_id),
        la_toi: r.user_id === user.id,
      })));
      return json({ cong_ty: { id: companyId, ten: ct.cong_ty.name }, vai_tro_cua_toi: ct.vai_tro, thanh_vien: coEmail });
    }

    if (hanhDong === "moi") {
      const email = chuanEmail(String(body.email ?? "")).slice(0, 320);
      const vaiTro = body.vai_tro;
      if (!laEmail(email)) return loi("THAM_SO", "Email chưa đúng.", 400);
      if (!laVaiTro(vaiTro)) return loi("THAM_SO", "Vai trò không hợp lệ.", 400);
      // Kiểm quyền trước khi tra email: người không có quyền không dò được email nào đã có tài khoản.
      const truoc = kiemThaoTac({ thaoTac: "moi", nguoiLam: toi, doiTuong: null, vaiTroMoi: vaiTro, soChuSoHuu: demChu(ds) });
      if (truoc) return loi(truoc.ma, truoc.cau, truoc.ma === "KHONG_DU_QUYEN" ? 403 : 409);

      const nguoi = await timTheoEmail(db, email);
      if (!nguoi) {
        return loi("CHUA_CO_TAI_KHOAN", "Email này chưa có tài khoản MIMI. Nhờ người đó đăng ký MIMI trước (đăng nhập bằng Google là nhanh nhất), rồi thêm lại.", 404);
      }
      const daCo = ds.find((r) => r.user_id === nguoi.id) ?? null;
      const kt = kiemThaoTac({ thaoTac: "moi", nguoiLam: toi, doiTuong: daCo && { id: daCo.user_id, vai_tro: daCo.vai_tro }, vaiTroMoi: vaiTro, soChuSoHuu: demChu(ds) });
      if (kt) return loi(kt.ma, kt.cau, kt.ma === "KHONG_DU_QUYEN" ? 403 : 409);

      const { error } = await db.from("thanh_vien_cong_ty").insert({ company_id: companyId, user_id: nguoi.id, vai_tro: vaiTro, moi_boi: user.id });
      if (error?.code === "23505") return loi("DA_LA_THANH_VIEN", "Người này đã là thành viên của công ty.", 409);
      if (error) throw new Error(error.message);
      await ghiNhatKy(db, {
        companyId, nguoiLam: user.id, vaiTro: ct.vai_tro, thaoTac: "moi", doiTuong: nguoi.id,
        thamSo: { vai_tro: vaiTro }, moTa: `Thêm ${email} vào công ty với vai trò ${TEN_VAI_TRO[vaiTro]}.`,
      });
      return json({ ok: true, user_id: nguoi.id, vai_tro: vaiTro });
    }

    // Ba thao tác còn lại tác động lên một thành viên đã có.
    const thaoTac = hanhDong as Exclude<ThaoTacThanhVien, "moi">;
    const doiTuongId = thaoTac === "roi" ? user.id : String(body.user_id ?? "");
    const dong = ds.find((r) => r.user_id === doiTuongId) ?? null;
    const vaiTroMoi = thaoTac === "doi_vai_tro" ? (laVaiTro(body.vai_tro) ? body.vai_tro as VaiTro : null) : null;
    if (thaoTac === "doi_vai_tro" && !vaiTroMoi) return loi("THAM_SO", "Vai trò không hợp lệ.", 400);

    const kt = kiemThaoTac({
      thaoTac, nguoiLam: toi, doiTuong: thaoTac === "roi" ? null : dong && { id: dong.user_id, vai_tro: dong.vai_tro },
      vaiTroMoi, soChuSoHuu: demChu(ds),
    });
    if (kt) return loi(kt.ma, kt.cau, kt.ma === "KHONG_DU_QUYEN" ? 403 : kt.ma === "KHONG_THAY" ? 404 : 409);
    if (!dong) return loi("KHONG_THAY", "Không có thành viên này.", 404);

    if (thaoTac === "doi_vai_tro") {
      const { error } = await db.from("thanh_vien_cong_ty").update({ vai_tro: vaiTroMoi, sua_luc: new Date().toISOString() })
        .eq("company_id", companyId).eq("user_id", doiTuongId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("thanh_vien_cong_ty").delete().eq("company_id", companyId).eq("user_id", doiTuongId);
      if (error) throw new Error(error.message);
    }

    // Hai chủ doanh nghiệp cùng gỡ nhau một lúc: mỗi bên đều thấy còn 2 chủ nên đều được. Đếm lại sau
    // khi ghi; không còn chủ nào thì trả lại đúng dòng cũ.
    if (demChu(await docThanhVien(db, companyId)) === 0) {
      await db.from("thanh_vien_cong_ty").upsert({ company_id: companyId, user_id: dong.user_id, vai_tro: dong.vai_tro, moi_boi: dong.moi_boi, tao_luc: dong.tao_luc });
      return loi("CHU_CUOI", "Công ty phải còn ít nhất một chủ doanh nghiệp.", 409);
    }

    const email = await emailCua(db, doiTuongId);
    const moTa = thaoTac === "doi_vai_tro"
      ? `Đổi vai trò của ${email ?? doiTuongId} từ ${TEN_VAI_TRO[dong.vai_tro]} sang ${TEN_VAI_TRO[vaiTroMoi as VaiTro]}.`
      : thaoTac === "go_bo" ? `Gỡ ${email ?? doiTuongId} (${TEN_VAI_TRO[dong.vai_tro]}) khỏi công ty.`
      : `${email ?? doiTuongId} tự rời công ty.`;
    await ghiNhatKy(db, {
      companyId, nguoiLam: user.id, vaiTro: ct.vai_tro, thaoTac, doiTuong: doiTuongId,
      thamSo: { vai_tro_cu: dong.vai_tro, ...(vaiTroMoi ? { vai_tro_moi: vaiTroMoi } : {}) }, moTa,
    });
    return json({ ok: true });
  } catch (e) {
    if (e instanceof LoiQuyen) return loi("KHONG_DU_QUYEN", e.message, 403);
    console.error("cong-ty:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "Chưa làm được. Thử lại sau ít phút.", 500);
  }
});
