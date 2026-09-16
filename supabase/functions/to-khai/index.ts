/**
 * Soạn tờ khai thuế cho hộ kinh doanh, cá nhân kinh doanh — từ dữ liệu thật và văn bản thật.
 *
 * ĐƯỜNG ĐI. Đọc hồ sơ công ty + hồ sơ thuế + doanh thu (hoá đơn điện tử của cơ quan thuế, sao kê
 * đã bỏ chuyển khoản nội bộ và dữ liệu thử) → dựng `SuKienThue` → hệ luật `suyLuan` cho ra chuỗi
 * nghĩa vụ kèm căn cứ → `soanToKhai` điền mẫu 01/TKN-CNKD hoặc 01/CNKD (bản kèm TT 50/2026) →
 * `kiemCanCu` đối chiếu từng câu trích với kho Công báo trước khi trả về.
 *
 * CÁI GÌ KHÔNG LÀM. Không nộp tờ khai, không ký, không gửi cơ quan thuế: MIMI trả bản nháp để
 * người dùng in hoặc chép sang Cổng dịch vụ công. Không điền ô nào không tính được từ dữ liệu.
 * Không tin số liệu do trình duyệt gửi lên khi lưu: `luu_nhap` tính lại từ đầu ở máy chủ, chỉ
 * nhận phần doanh thu người dùng tự khai (có kiểm) và ghi rõ nguồn là "tự khai".
 *
 * Chỉ chủ doanh nghiệp (JWT). Đọc bằng service role, luôn lọc theo công ty đang dùng.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import { lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";
import { canCuDung, docHoSoThue, NAM_AP_DUNG, suyLuan } from "../_shared/luat/he-luat.ts";
import { kyGoiY, soanToKhai, type KyToKhai } from "../_shared/luat/to-khai.ts";
import { kiemCanCu } from "../_shared/luat/doc-can-cu.ts";
import { docDoanhThuQuy, docHoSo, dungSuKien } from "../_shared/luat/doc-su-kien.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const KICH_THUOC_THAN_TOI_DA = 100_000;

const GIOI_HAN: Record<string, { cuaSoGiay: number; toiDa: number }> = {
  ho_so: { cuaSoGiay: 60, toiDa: 60 },
  luu_ho_so: { cuaSoGiay: 60, toiDa: 20 },
  phan_tich: { cuaSoGiay: 60, toiDa: 30 },
  luu_nhap: { cuaSoGiay: 60, toiDa: 20 },
  ds_nhap: { cuaSoGiay: 60, toiDa: 60 },
  xoa_nhap: { cuaSoGiay: 60, toiDa: 30 },
};

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Doanh thu người dùng tự khai: 4 quý, số nguyên đồng, không âm. */
function docDoanhThuTuNhap(v: unknown): { ok: true; quy: [number, number, number, number] | null } | { ok: false; cau: string } {
  if (v === undefined || v === null) return { ok: true, quy: null };
  if (!Array.isArray(v) || v.length !== 4) return { ok: false, cau: "Doanh thu tự khai phải gồm đúng 4 quý." };
  const ds: number[] = [];
  for (const x of v) {
    const n = Number(x);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 1e15) return { ok: false, cau: "Doanh thu từng quý phải là số đồng, không âm." };
    ds.push(n);
  }
  return { ok: true, quy: [ds[0], ds[1], ds[2], ds[3]] };
}

function docKy(v: unknown, nam: number): { ok: true; ky: KyToKhai | null } | { ok: false; cau: string } {
  if (v === undefined || v === null) return { ok: true, ky: null };
  if (typeof v !== "object") return { ok: false, cau: "Kỳ tính thuế không hợp lệ." };
  const o = v as Row;
  if (o.loai === "nam") return { ok: true, ky: { loai: "nam", nam } };
  if (o.loai === "6_thang_dau") return { ok: true, ky: { loai: "6_thang_dau", nam } };
  if (o.loai === "quy") {
    const q = Number(o.quy);
    if (!Number.isInteger(q) || q < 1 || q > 4) return { ok: false, cau: "Quý phải từ 1 đến 4." };
    return { ok: true, ky: { loai: "quy", nam, quy: q } };
  }
  return { ok: false, cau: "Kỳ tính thuế không hợp lệ." };
}

function docNam(v: unknown, homNay: string): { ok: true; nam: number } | { ok: false; cau: string } {
  const namNay = Number(homNay.slice(0, 4));
  if (v === undefined || v === null || v === "") return { ok: true, nam: namNay };
  const n = Number(v);
  if (!Number.isInteger(n) || n < NAM_AP_DUNG || n > namNay + 1) {
    return { ok: false, cau: `Năm tính thuế phải từ ${NAM_AP_DUNG} đến ${namNay + 1}.` };
  }
  return { ok: true, nam: n };
}

async function phanTich(db: Db, companyId: string, body: Row) {
  const homNay = iso(lucGioVietNam());
  const n = docNam(body.nam, homNay);
  if (!n.ok) return { loi: n.cau };
  const tn = docDoanhThuTuNhap(body.doanh_thu_quy);
  if (!tn.ok) return { loi: tn.cau };
  const k = docKy(body.ky, n.nam);
  if (!k.ok) return { loi: k.cau };

  const [{ cong_ty, ho_so }, doanhThu] = await Promise.all([
    docHoSo(db, companyId),
    docDoanhThuQuy(db, companyId, n.nam),
  ]);
  const dung = dungSuKien({ nam: n.nam, homNay, congTy: cong_ty, hoSo: ho_so, doanhThu, tuNhap: tn.quy });
  const sl = suyLuan(dung.su_kien);
  const ky = k.ky ?? kyGoiY(dung.su_kien, sl);
  const soan = soanToKhai(dung.su_kien, sl, { ten: cong_ty.ten, mst: cong_ty.mst }, ky);

  const canCu = await kiemCanCu(db, [
    ...canCuDung(sl.ket_luan),
    ...(soan.ok ? soan.to_khai.can_cu : soan.can_cu),
  ]);

  return {
    ket_qua: {
      nam: n.nam,
      hom_nay: homNay,
      cong_ty: { ten: cong_ty.ten, mst: cong_ty.mst },
      ho_so,
      su_kien: dung.su_kien,
      doanh_thu: {
        hoa_don: doanhThu.hoa_don,
        ngan_hang: doanhThu.ngan_hang,
        so_hoa_don: doanhThu.so_hoa_don,
        co_ket_noi_ngan_hang: doanhThu.co_ket_noi_ngan_hang,
        quy: dung.su_kien.doanhThuQuy,
        nguon: dung.nguon,
      },
      suy_luan: sl,
      ky,
      ky_goi_y: kyGoiY(dung.su_kien, sl),
      to_khai: soan.ok ? soan.to_khai : null,
      ly_do_khong_soan: soan.ok ? null : soan.ly_do,
      canh_bao: dung.canh_bao,
      can_cu: canCu,
      chua_doi_chieu: canCu.filter((c) => !c.da_doi_chieu).map((c) => c.id),
    },
    soan,
    ky,
  };
}

async function xuLy(db: Db, userId: string, company: { id: string; name: string | null }, hanhDong: string, body: Row): Promise<Response> {
  switch (hanhDong) {
    case "ho_so": {
      const { cong_ty, ho_so } = await docHoSo(db, company.id);
      return json({ cong_ty: { ten: cong_ty.ten, mst: cong_ty.mst, loai_tai_khoan: cong_ty.account_type }, ho_so });
    }

    case "luu_ho_so": {
      const r = docHoSoThue(body.ho_so);
      if (!r.ok) return loi("HO_SO", r.cau, 400);
      const { error } = await db.from("ho_so_thue").upsert({
        company_id: company.id,
        loai_nguoi_nop: r.ho_so.loai_nguoi_nop,
        nhom_nganh: r.ho_so.nhom_nganh,
        kenh: r.ho_so.kenh,
        phuong_phap_tncn: r.ho_so.phuong_phap_tncn,
        bat_dau_kinh_doanh: r.ho_so.bat_dau_kinh_doanh,
        da_nop_thue_trong_nam: r.ho_so.da_nop_thue_trong_nam,
        nganh_dac_thu: r.ho_so.nganh_dac_thu,
        doanh_thu_nam_truoc: r.ho_so.doanh_thu_nam_truoc,
        co_quan_he_lien_ket: r.ho_so.co_quan_he_lien_ket,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: "company_id" });
      if (error) throw error;
      return json({ ok: true, ho_so: r.ho_so });
    }

    case "phan_tich": {
      const r = await phanTich(db, company.id, body);
      if (r.loi) return loi("THAM_SO", r.loi, 400);
      return json(r.ket_qua);
    }

    case "luu_nhap": {
      // Tính lại ở máy chủ: không lưu tờ khai do trình duyệt gửi lên.
      const r = await phanTich(db, company.id, body);
      if (r.loi) return loi("THAM_SO", r.loi, 400);
      if (!r.soan || !r.soan.ok) return loi("CHUA_SOAN_DUOC", r.soan?.ly_do ?? "Chưa soạn được tờ khai.", 409);
      const tk = r.soan.to_khai;
      const ky = r.ky as KyToKhai;
      const noiDung = JSON.stringify({ to_khai: tk, can_cu: r.ket_qua.can_cu });
      const bam = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(noiDung))),
        (x) => x.toString(16).padStart(2, "0"),
      ).join("");
      const { data, error } = await db.from("to_khai_nhap").insert({
        company_id: company.id,
        mau: tk.mau,
        nam: ky.nam,
        ky_loai: ky.loai,
        quy: ky.loai === "quy" ? ky.quy : null,
        han_nop: tk.han_nop,
        du_lieu: tk,
        can_cu: r.ket_qua.can_cu,
        ma_bam: bam,
        user_id: userId,
      }).select("id, created_at").single();
      if (error) throw error;
      return json({ id: data.id, created_at: data.created_at, ma_bam: bam });
    }

    case "ds_nhap": {
      const { data, error } = await db.from("to_khai_nhap")
        .select("id, mau, nam, ky_loai, quy, han_nop, ma_bam, created_at")
        .eq("company_id", company.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return json({ ds: data ?? [] });
    }

    case "xoa_nhap": {
      const id = String(body.id ?? "");
      if (!id) return loi("THAM_SO", "Thiếu mã bản nháp.", 400);
      const { error } = await db.from("to_khai_nhap").delete().eq("id", id).eq("company_id", company.id);
      if (error) throw error;
      return json({ ok: true });
    }

    default:
      return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  if (Number(req.headers.get("content-length") ?? 0) > KICH_THUOC_THAN_TOI_DA) return loi("QUA_LON", "Dữ liệu gửi lên quá lớn.", 413);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let body: Row;
    try {
      body = await req.json();
    } catch {
      return loi("JSON", "Thân yêu cầu không phải JSON.", 400);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const company = await resolveCompany<{ id: string; name: string | null }>(db, user.id, "id, name");
    if (!company) return loi("KHONG_CO_CONG_TY", "Chưa có công ty.", 404);

    const hanhDong = String(body.hanh_dong ?? "");
    const gioiHan = GIOI_HAN[hanhDong];
    if (gioiHan) {
      const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
        p_user: user.id, p_hanh_dong: `to_khai_${hanhDong}`, p_cua_so_giay: gioiHan.cuaSoGiay, p_toi_da: gioiHan.toiDa,
      });
      if (loiDem) console.error("to-khai gioi han:", loiDem.message);
      else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);
    }

    return await xuLy(db, user.id, company, hanhDong, body);
  } catch (e) {
    // Không in thân yêu cầu: có thể chứa doanh thu, mã số thuế của khách.
    console.error("to-khai:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "MIMI gặp lỗi khi soạn tờ khai. Thử lại sau ít phút.", 500);
  }
});
