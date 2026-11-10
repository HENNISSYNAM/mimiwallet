/**
 * Edge function `ho-so-vay` — đánh giá sẵn sàng vay + hồ sơ vay tự động (10/11/2026).
 *
 * Hành động (POST, JSON `{ hanh_dong, company_id?, ngon?, ... }`):
 *   - danh_gia  : { so_tien, ky_han_thang } — chạy bảng điểm, lưu vào credit_score_snapshots/_factors.
 *   - tao_ho_so : { so_tien, ky_han_thang, muc_dich, dong_y: true } — đánh giá + ghép hồ sơ, lưu ho_so_vay.
 *   - xem       : { id } — một hồ sơ của công ty đang chọn.
 *   - ds        : danh sách hồ sơ (mới nhất trước).
 *   - xuat      : { id, da_gui? } — dữ liệu in được; `da_gui: true` = chủ đánh dấu đã tự gửi đi (trạng thái shared).
 *
 * KHÔNG có mô hình ngôn ngữ nào ở đây: mọi con số từ `_shared/tin-dung` và `_shared/ho-so-vay` (hàm thuần, có test).
 * MIMI không gửi hồ sơ cho bên cho vay nào và không cho vay — `xuat` chỉ trả dữ liệu cho chính chủ tự in.
 * Quyền: chỉ chủ sở hữu / quản trị (`QUYEN.lap_ho_so_vay`), kế toán cơ sở bị từ chối (`_shared/ho-so-vay/cong.ts`).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { resolveCompanyVaiTro } from "../_shared/company.ts";
import { congTyLaDemo, locMinhHoa } from "../_shared/minh-hoa.ts";
import { docHet } from "../_shared/doc-het.ts";
import { docSoLieuDoanhThu } from "../_shared/doanh-thu/so-lieu.ts";
import { duBaoDongTien } from "../_shared/tai-chinh/du-bao.ts";
import { bamDauVao, danhGiaSanSangVay, jsonOnDinh, sha256Hex, type KetQuaDanhGia, type Ngon } from "../_shared/tin-dung/cham-diem.ts";
import { chuanBiDauVao, type PhanLoaiTien } from "../_shared/tin-dung/du-lieu.ts";
import { docDeNghi, lapHoSoVay, type DoanhThuNam, type ToKhaiNhap, type ToKhaiNop } from "../_shared/ho-so-vay/ho-so.ts";
import { GIOI_HAN_HO_SO_VAY, kiemCuaHoSoVay, laHanhDong, thuocCongTy } from "../_shared/ho-so-vay/cong.ts";
import type { GiaoDichTL, HoaDonBanTL } from "../_shared/tro-ly/tinh-toan.ts";

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

const homNayVN = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Đọc dữ liệu cho bảng điểm: 13 tháng giao dịch, phân loại tiền vào, hoá đơn bán ra. */
async function docDuLieu(db: Db, companyId: string, laDemo: boolean, homNay: string) {
  const [y, m] = homNay.slice(0, 7).split("-").map(Number);
  const tu = `${y - 1}-${String(m).padStart(2, "0")}-01`;
  const [gd, pl, hd] = await Promise.all([
    docHet((a, b) => locMinhHoa(db.from("transactions")
      .select("id, amount, type, transaction_date, merchant_name, category, counter_account_name, payment_reference, is_synthetic, account_number, counter_account_number")
      .eq("company_id", companyId), laDemo)
      .gte("transaction_date", tu)
      .order("transaction_date", { ascending: true }).order("id", { ascending: true })
      .range(a, b), "giao dịch"),
    docHet((a, b) => db.from("revenue_classifications").select("transaction_id, revenue_effect")
      .eq("company_id", companyId).order("transaction_id", { ascending: true }).range(a, b), "phân loại tiền vào"),
    docHet((a, b) => locMinhHoa(db.from("invoices")
      .select("id, invoice_number, client_name, total, issued_date, due_date, status, is_synthetic, co_so_id")
      .eq("company_id", companyId), laDemo).order("due_date", { ascending: true }).order("id", { ascending: true }).range(a, b), "hoá đơn bán ra", 5000),
  ]);
  return {
    giaoDich: gd.map((t) => ({ ...t, id: String(t.id), amount: Number(t.amount) })) as GiaoDichTL[],
    phanLoai: Object.fromEntries(pl.map((r) => [String(r.transaction_id), r.revenue_effect])) as PhanLoaiTien,
    hoaDonBan: hd.map((h) => ({ ...h, total: Number(h.total) })) as HoaDonBanTL[],
  };
}

/** Ghi một lần đánh giá + từng yếu tố. Lỗi ghi không chặn kết quả (đã tính xong), nhưng phải thấy trong log. */
async function luuDanhGia(db: Db, companyId: string, userId: string, dg: KetQuaDanhGia, maBam: string): Promise<string | null> {
  const { data, error } = await db.from("credit_score_snapshots").insert({
    company_id: companyId,
    score: dg.co_diem ? dg.diem : null,
    credit_limit: dg.co_diem ? Math.max(0, dg.so_lieu.goc_toi_da.cao) : 0,
    probability_of_default: null,
    model_version: dg.phien_ban,
    phien_ban: dg.phien_ban,
    co_diem: dg.co_diem,
    muc: dg.co_diem ? dg.muc : null,
    so_tien_de_nghi: dg.de_nghi.so_tien,
    ky_han_thang: dg.de_nghi.ky_han_thang,
    ma_bam_dau_vao: maBam,
    ket_qua: dg,
    tao_boi: userId,
  }).select("id").single();
  if (error || !data) { console.error("ho-so-vay: không lưu được đánh giá:", error?.message); return null; }
  if (dg.co_diem) {
    const { error: e2 } = await db.from("credit_score_factors").insert(dg.yeu_to.map((y) => ({
      snapshot_id: data.id, factor_name: y.khoa, khoa: y.khoa, raw_value: y.gia_tri, normalized_score: y.toi_da ? y.diem / y.toi_da : 0,
      weight: y.toi_da, diem: y.diem, toi_da: y.toi_da, muc: y.muc, ma_ly_do: y.ma_ly_do, ly_do: y.ly_do, goi_y: y.goi_y, gia_tri_chu: y.gia_tri_chu,
    })));
    if (e2) console.error("ho-so-vay: không lưu được yếu tố:", e2.message);
  }
  return String(data.id);
}

function doanhThuNam(s: Row, nam: number): DoanhThuNam {
  const dc = s.do_chac_chan ?? {};
  return {
    nam, gia_tri: Number(dc.gia_tri ?? s.uoc_tinh ?? 0), can_duoi: Number(dc.can_duoi ?? 0), can_tren: Number(dc.can_tren ?? 0),
    trang_thai: (dc.trang_thai ?? "chua_du_du_lieu") as DoanhThuNam["trang_thai"],
    tien_vao: Number(s.tien_vao ?? 0), da_xac_nhan: Number(s.da_xac_nhan ?? 0), chua_ro: Number(s.chua_ro ?? 0), so_chua_ro: Number(s.so_chua_ro ?? 0),
    khong_phai_doanh_thu: Number(s.khong_phai_doanh_thu ?? 0), noi_bo: Number(s.noi_bo ?? 0), so_giao_dich: Number(s.so_giao_dich ?? 0),
    ty_le_da_giai_thich: s.ty_le_da_giai_thich ?? null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return loi("THAM_SO", "Thân yêu cầu không phải JSON.", 400); }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const hanhDong = body.hanh_dong;
    if (!laHanhDong(hanhDong)) return loi("THAM_SO", "Hành động không hợp lệ.", 400);
    const gh = GIOI_HAN_HO_SO_VAY[hanhDong];
    if (!(await duocGoi(db, user.id, [{ hanh_dong: `ho_so_vay_${hanhDong}`, cua_so_giay: gh.cua_so_giay, toi_da: gh.toi_da }], false))) return qua429(corsHeaders);

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    type Cty = { id: string; name: string | null; tax_id: string | null; ten_theo_mst: string | null; dia_chi_theo_mst: string | null; loai_theo_mst: string | null; trang_thai_mst: string | null; province: string | null; industry: string | null };
    const ct = await resolveCompanyVaiTro<Cty>(db, user.id, "id, name, tax_id, ten_theo_mst, dia_chi_theo_mst, loai_theo_mst, trang_thai_mst, province, industry", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);
    const companyId = ct.cong_ty.id;

    // Kế toán cơ sở: đọc co_so_id của chính dòng thành viên. Lỗi đọc = đóng (từ chối), không mở.
    const tv = await db.from("thanh_vien_cong_ty").select("co_so_id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle();
    if (tv.error && !/co_so_id/.test(tv.error.message)) return loi("LOI", "Chưa kiểm được quyền. Thử lại sau.", 500);
    const cua = kiemCuaHoSoVay(ct.vai_tro, (tv.data?.co_so_id as string | null) ?? null);
    if (!cua.ok) return loi(cua.ma, cua.cau, cua.status);

    const ngon: Ngon = body.ngon === "en" ? "en" : "vi";

    if (hanhDong === "ds") {
      const { data, error } = await db.from("ho_so_vay")
        .select("id, company_id, so_tien, ky_han_thang, muc_dich, trang_thai, hoan_chinh, created_at, xuat_luc, so_lan_xuat, snapshot_id")
        .eq("company_id", companyId).order("created_at", { ascending: false }).limit(50);
      if (error) throw new Error(error.message);
      return json({ ho_so: data ?? [] });
    }

    if (hanhDong === "xem" || hanhDong === "xuat") {
      const id = String(body.id ?? "");
      if (!UUID.test(id)) return loi("THAM_SO", "Thiếu mã hồ sơ.", 400);
      const { data, error } = await db.from("ho_so_vay").select("*").eq("company_id", companyId).eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data || !thuocCongTy(data, companyId)) return loi("KHONG_THAY", "Không thấy hồ sơ này trong công ty đang chọn.", 404);
      if (hanhDong === "xem") return json({ ho_so: data });
      // Xuất: kiểm mã băm (hồ sơ không bị sửa sau khi lập), ghi lần xuất. MIMI không gửi đi đâu cả.
      const nguyenVen = (await sha256Hex(jsonOnDinh(data.file_json))) === data.ma_bam;
      const capNhat: Row = { xuat_luc: new Date().toISOString(), so_lan_xuat: Number(data.so_lan_xuat ?? 0) + 1, updated_at: new Date().toISOString() };
      if (body.da_gui === true) capNhat.trang_thai = "shared";
      const { error: e2 } = await db.from("ho_so_vay").update(capNhat).eq("company_id", companyId).eq("id", id);
      if (e2) console.error("ho-so-vay: không ghi được lần xuất:", e2.message);
      return json({ ho_so: { ...data, ...capNhat }, nguyen_ven: nguyenVen, file: data.file_json });
    }

    // danh_gia / tao_ho_so
    const dn = docDeNghi(body, hanhDong === "tao_ho_so", ngon);
    if (!dn.ok) return loi("THAM_SO", dn.cau, 400);
    if (hanhDong === "tao_ho_so" && body.dong_y !== true) {
      return loi("CHUA_DONG_Y", ngon === "vi" ? "Cần đánh dấu đồng ý: bạn tự gửi hồ sơ, MIMI không gửi và không cho vay." : "Please tick the consent: you send the file yourself; MIMI does not send it or lend.", 400);
    }

    const homNay = homNayVN();
    const laDemo = await congTyLaDemo(db, companyId);
    const tho = await docDuLieu(db, companyId, laDemo, homNay);
    const cb = chuanBiDauVao({ homNay, ...tho }, dn.v);
    const dg = danhGiaSanSangVay(cb.dau_vao, ngon);
    const maBam = await bamDauVao(cb.dau_vao);
    const snapshotId = await luuDanhGia(db, companyId, user.id, dg, maBam);

    if (hanhDong === "danh_gia") return json({ snapshot_id: snapshotId, ma_bam_dau_vao: maBam, danh_gia: dg });

    const namNay = Number(homNay.slice(0, 4));
    const tu12 = `${namNay - 1}${homNay.slice(4, 10)}`;
    const [slNay, slTruoc, tkNhap, tkNop, kn] = await Promise.all([
      docSoLieuDoanhThu(db, companyId, namNay, laDemo),
      docSoLieuDoanhThu(db, companyId, namNay - 1, laDemo),
      db.from("to_khai_nhap").select("mau, nam, ky_loai, quy, han_nop, created_at, da_xuat_luc")
        .eq("company_id", companyId).gte("created_at", tu12).order("created_at", { ascending: false }).limit(100),
      db.from("yeu_cau_thuc_thi").select("ky, trang_thai, ngay_nop, tao_luc")
        .eq("company_id", companyId).eq("loai", "tax_submission").gte("tao_luc", tu12).order("tao_luc", { ascending: false }).limit(100),
      db.from("bank_connections").select("id").eq("company_id", companyId).eq("status", "connected").is("revoked_at", null).limit(1),
    ]);
    if (tkNhap.error) console.error("ho-so-vay: tờ khai nháp:", tkNhap.error.message);
    if (tkNop.error) console.error("ho-so-vay: tờ khai nộp:", tkNop.error.message);

    const duBao = duBaoDongTien(cb.thang_lam_sach, { homNay, congNoQuaHan: cb.hoa_don_qua_han.tong, khachTop: null, ngon });
    const c = ct.cong_ty;
    const file = lapHoSoVay({
      de_nghi: dn.v,
      cong_ty: { ten: c.name, ma_so_thue: c.tax_id, ten_theo_mst: c.ten_theo_mst, dia_chi_theo_mst: c.dia_chi_theo_mst, loai_theo_mst: c.loai_theo_mst, trang_thai_mst: c.trang_thai_mst, tinh: c.province, nganh: c.industry },
      homNay,
      bang_thang: cb.bang_thang,
      tien_vao_bi_loai: cb.tien_vao_bi_loai,
      hoa_don_qua_han: cb.hoa_don_qua_han,
      danh_gia: dg,
      du_bao: duBao,
      doanh_thu: [doanhThuNam(slNay as Row, namNay), doanhThuNam(slTruoc as Row, namNay - 1)].filter((d) => d.so_giao_dich > 0 || d.nam === namNay),
      to_khai: {
        nhap: ((tkNhap.data ?? []) as Row[]).map((r): ToKhaiNhap => ({ mau: r.mau, nam: r.nam, ky_loai: r.ky_loai, quy: r.quy ?? null, han_nop: r.han_nop, tao_luc: r.created_at, da_xuat_luc: r.da_xuat_luc ?? null })),
        nop: ((tkNop.data ?? []) as Row[]).map((r): ToKhaiNop => ({ ky: r.ky ?? null, trang_thai: r.trang_thai, ngay_nop: r.ngay_nop ?? null, tao_luc: r.tao_luc })),
      },
      co_ket_noi_ngan_hang: !kn.error && (kn.data ?? []).length > 0,
      ngon,
    });
    const maBamFile = await sha256Hex(jsonOnDinh(file));
    const bayGio = new Date().toISOString();
    const { data: hs, error: eIns } = await db.from("ho_so_vay").insert({
      company_id: companyId, so_tien: dn.v.so_tien, ky_han_thang: dn.v.ky_han_thang, muc_dich: dn.v.muc_dich,
      snapshot_id: snapshotId, file_json: file, ma_bam: maBamFile, phien_ban: file.phien_ban, hoan_chinh: file.hoan_chinh,
      trang_thai: file.hoan_chinh ? "ready" : "draft", dong_y_luc: bayGio, created_by: user.id,
    }).select("id, company_id, so_tien, ky_han_thang, muc_dich, trang_thai, hoan_chinh, created_at, snapshot_id").single();
    if (eIns) throw new Error(eIns.message);
    return json({ ho_so: hs, file, danh_gia: dg });
  } catch (e) {
    console.error("ho-so-vay failed:", e instanceof Error ? e.message : e);
    return json({ error: "MIMI chưa lập được hồ sơ lúc này. Thử lại sau ít phút." }, 500);
  }
});
