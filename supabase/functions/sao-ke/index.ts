/**
 * Edge function `sao-ke` — nhập sao kê ngân hàng người dùng tải lên.
 *
 * Hành động (POST, JSON `{ hanh_dong, company_id?, ... }`):
 *   - nhap : { tai_khoan, ten_tep?, dong: DongSaoKe[] (≤ 3000), import_id? } — ghi các dòng chưa có.
 *            Tệp lớn thì trình duyệt gửi nhiều lần, lần sau kèm `import_id` của lần đầu.
 *   - ds   : các đợt nhập gần đây.
 *
 * Trình duyệt đọc tệp và xem trước (`_shared/sao-ke/doc-sao-ke.ts`); máy chủ KHÔNG tin kết quả đó —
 * kiểm lại từng dòng bằng chính `kiemDong`, tự tính mã chống trùng, và ghi `source = 'import'`.
 * Không sửa, không xoá dòng đã có: nhập lại cùng tệp thì dòng trùng bị bỏ qua.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kiemQuyen, LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { cauTuChoi } from "../_shared/quyen/vai-tro.ts";
import { lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";
import { chuoiChongTrung, danhSoLan, kiemDong, type DongSaoKe } from "../_shared/sao-ke/doc-sao-ke.ts";
import { ghiNhieuSuKien } from "../_shared/do-luong/su-kien.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

const TOI_DA_DONG = 3000;
const KICH_THUOC_TOI_DA = 3_000_000;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function bam(s: string): Promise<string> {
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  if (Number(req.headers.get("content-length") ?? 0) > KICH_THUOC_TOI_DA) return loi("QUA_LON", "Tệp quá lớn — chia nhỏ theo tháng rồi tải lại.", 413);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: loiAuth } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (loiAuth || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return loi("JSON", "Thân yêu cầu không phải JSON.", 400); }

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string }>(db, user.id, "id", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);
    const companyId = ct.cong_ty.id;

    const hanhDong = String(body.hanh_dong ?? "");
    const { data: duoc } = await db.rpc("tang_luot_goi", { p_user: user.id, p_hanh_dong: `sao_ke_${hanhDong}`, p_cua_so_giay: 60, p_toi_da: hanhDong === "nhap" ? 40 : 60 });
    if (duoc === false) return loi("QUA_NHIEU", "Thao tác hơi nhanh. Đợi một phút rồi thử lại.", 429);

    if (hanhDong === "ds") {
      const { data, error } = await db.from("sao_ke_nhap")
        .select("id, ten_tep, tai_khoan, so_dong_doc, so_dong_moi, so_dong_trung, tu_ngay, den_ngay, tao_luc")
        .eq("company_id", companyId).order("tao_luc", { ascending: false }).limit(50);
      if (error) throw error;
      return json({ ds: data ?? [] });
    }

    if (hanhDong !== "nhap") return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
    kiemQuyen(ct.vai_tro, "dong_bo_du_lieu", cauTuChoi(ct.vai_tro, "dong_bo_du_lieu"));

    const taiKhoan = typeof body.tai_khoan === "string" ? body.tai_khoan.replace(/\s/g, "").slice(0, 60) : "";
    if (!taiKhoan) return loi("THAM_SO", "Cho MIMI biết sao kê này của tài khoản nào (số tài khoản hoặc tên gợi nhớ).", 400);
    const ds = Array.isArray(body.dong) ? body.dong : [];
    if (!ds.length) return loi("THAM_SO", "Tệp không có dòng giao dịch nào.", 400);
    if (ds.length > TOI_DA_DONG) return loi("QUA_LON", `Mỗi lần gửi tối đa ${TOI_DA_DONG} dòng.`, 413);

    const homNay = iso(lucGioVietNam());
    const hopLe: DongSaoKe[] = [];
    const hong: { dong: number; cau: string }[] = [];
    ds.forEach((d: unknown, i: number) => {
      const c = kiemDong(d, homNay);
      if (c) hong.push({ dong: i + 1, cau: c });
      else hopLe.push(d as DongSaoKe);
    });
    if (!hopLe.length) return json({ error: "Không dòng nào dùng được.", ma: "KHONG_DONG_HOP_LE", hong: hong.slice(0, 20) }, 400);

    // Đợt nhập: lần đầu tạo, các lần sau (tệp lớn chia nhiều lần) dùng lại — chỉ khi đúng công ty.
    let importId = typeof body.import_id === "string" ? body.import_id : null;
    if (importId) {
      const { data: cu } = await db.from("sao_ke_nhap").select("id").eq("id", importId).eq("company_id", companyId).maybeSingle();
      if (!cu) importId = null;
    }
    if (!importId) {
      const { data: moi, error } = await db.from("sao_ke_nhap").insert({
        company_id: companyId, tao_boi: user.id, tai_khoan: taiKhoan,
        ten_tep: typeof body.ten_tep === "string" ? body.ten_tep.slice(0, 200) : null,
      }).select("id").single();
      if (error) throw error;
      importId = moi.id;
    }

    const lan = danhSoLan(hopLe, taiKhoan);
    const dong = await Promise.all(hopLe.map(async (d, i) => ({
      company_id: companyId,
      amount: d.amount,
      type: d.type,
      transaction_date: d.transaction_date,
      merchant_name: d.merchant_name,
      counter_account_name: d.counter_account_name,
      counter_account_number: d.counter_account_number,
      account_number: taiKhoan,
      reference_id: `import:${await bam(chuoiChongTrung(taiKhoan, d, lan[i]))}`,
      source: "import",
      import_id: importId,
      is_synthetic: false,
    })));

    let moiGhi = 0;
    for (let i = 0; i < dong.length; i += 500) {
      const { data, error } = await db.from("transactions")
        .upsert(dong.slice(i, i + 500), { onConflict: "company_id,reference_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw error;
      moiGhi += (data ?? []).length;
    }

    const ngays = hopLe.map((d) => d.transaction_date).sort();
    const { data: dot } = await db.from("sao_ke_nhap").select("so_dong_doc, so_dong_moi, so_dong_trung, tu_ngay, den_ngay").eq("id", importId).single();
    await db.from("sao_ke_nhap").update({
      so_dong_doc: (dot?.so_dong_doc ?? 0) + ds.length,
      so_dong_moi: (dot?.so_dong_moi ?? 0) + moiGhi,
      so_dong_trung: (dot?.so_dong_trung ?? 0) + (hopLe.length - moiGhi),
      tu_ngay: [dot?.tu_ngay, ngays[0]].filter(Boolean).sort()[0],
      den_ngay: [dot?.den_ngay, ngays[ngays.length - 1]].filter(Boolean).sort().at(-1),
    }).eq("id", importId);

    await ghiNhieuSuKien(db, companyId, user.id, [
      ["financial_source_connected", { nguon: "import" }],
      ["statement_imported", { moi: moiGhi, trung: hopLe.length - moiGhi }],
    ]);
    return json({ import_id: importId, moi: moiGhi, trung: hopLe.length - moiGhi, hong: hong.slice(0, 20), so_hong: hong.length });
  } catch (e) {
    if (e instanceof LoiQuyen) return loi("KHONG_DU_QUYEN", e.message, 403);
    // Không in thân yêu cầu: sao kê là dữ liệu tài chính của khách.
    console.error("sao-ke:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "MIMI gặp lỗi khi nhập sao kê. Thử lại sau ít phút.", 500);
  }
});
