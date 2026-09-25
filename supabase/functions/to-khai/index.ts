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
import { kiemQuyen, LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { cauTuChoi, type HanhDong, type VaiTro } from "../_shared/quyen/vai-tro.ts";
import { lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";
import { canCuDung, docHoSoThue, NAM_AP_DUNG, PHIEN_BAN_HE_LUAT, suyLuan } from "../_shared/luat/he-luat.ts";
import { kyGoiY, soanToKhai, type KyToKhai } from "../_shared/luat/to-khai.ts";
import { kiemCanCu } from "../_shared/luat/doc-can-cu.ts";
import { docDoanhThuQuy, docHoSo, dungSuKien, type HoSoCongTy } from "../_shared/luat/doc-su-kien.ts";
import { cauHinhXInvoice, dongBoMstCongTy } from "../_shared/mst/tra-cuu.ts";
import { docQuyenLoi, khoaKy } from "../_shared/billing/thu-tien.ts";
import { congTyLaDemo, locMinhHoa } from "../_shared/minh-hoa.ts";
import {
  anhHuong, docXacNhan, goiYPhanLoai, keHoachHoanTac, lapBangTienVao, TEN_PHAN_LOAI,
  type LoaiPhanLoai, type XacNhanPhanLoai,
} from "../_shared/doanh-thu/phan-loai.ts";
import { chieuTien } from "../_shared/tien/chieu-tien.ts";
import { docNguonTienVao } from "../_shared/doanh-thu/so-lieu.ts";
import { docHet } from "../_shared/doc-het.ts";
import { ghiNhieuSuKien } from "../_shared/do-luong/su-kien.ts";
import { goiYHoatDong, HOAT_DONG, type ChiaHoatDong, type NguonDoanhThuKhoan } from "../_shared/doanh-thu/theo-hoat-dong.ts";
import { docXacNhanHoatDong, keHoachHoanTacHoatDong, TOI_DA_MOT_LAN_HOAT_DONG } from "../_shared/doanh-thu/xac-nhan-hoat-dong.ts";
import { chuanHoaTrangThai } from "../_shared/doanh-nghiep/trang-thai.ts";
import { tinhNghiaVu } from "../_shared/nghia-vu/tinh.ts";
import { TEN_NHOM_NGANH } from "../_shared/luat/he-luat.ts";

/** Điều giao diện cần để khỏi hỏi lại những gì mã số thuế đã trả lời. */
const congTyChoGiaoDien = (c: HoSoCongTy) => ({
  ten: c.ten,
  mst: c.mst,
  loai_theo_mst: c.loai_theo_mst,
  theo_mst: c.theo_mst,
});

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
  xuat: { cuaSoGiay: 60, toiDa: 20 },
  tien_vao: { cuaSoGiay: 60, toiDa: 30 },
  xac_nhan_tien_vao: { cuaSoGiay: 60, toiDa: 120 },
  hoan_tac_tien_vao: { cuaSoGiay: 60, toiDa: 60 },
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
    dongBoMstCongTy(db, companyId, cauHinhXInvoice()).then(() => docHoSo(db, companyId)),
    congTyLaDemo(db, companyId).then((laDemo) => docDoanhThuQuy(db, companyId, n.nam, laDemo)),
  ]);
  const dung = dungSuKien({ nam: n.nam, homNay, congTy: cong_ty, hoSo: ho_so, doanhThu, tuNhap: tn.quy });
  const sl = suyLuan(dung.su_kien);
  const ky = k.ky ?? kyGoiY(dung.su_kien, sl);
  const trangThai = chuanHoaTrangThai(cong_ty.theo_mst?.trang_thai);
  const soan = soanToKhai(dung.su_kien, sl, { ten: cong_ty.ten, mst: cong_ty.mst }, ky, { trangThai: trangThai.trang_thai });

  // Xuất tờ khai được bằng gì: gói còn hạn, số lượt còn, và kỳ này đã trả chưa.
  const quyenLoi = await docQuyenLoi(db, companyId, homNay);
  const khoa = soan.ok ? khoaKy(soan.to_khai.mau, ky) : null;
  const { data: daTra } = khoa
    ? await db.from("luot_to_khai").select("id").eq("company_id", companyId).eq("ly_do", "xuat").eq("ky_khoa", khoa).limit(1)
    : { data: [] };

  /*
   * Phụ lục giải trình in kèm tờ khai: chỉ khi doanh thu tính từ sao kê, và chỉ những khoản NGƯỜI
   * đã xác nhận không phải doanh thu. Đây là chỗ bảng giải trình được in — không có trang riêng.
   */
  let phuLuc: Row[] = [];
  if (dung.nguon === "ngan_hang") {
    // Đọc HẾT: doanh thu đã trừ mọi khoản này, nên phụ lục phải kê đủ mọi khoản — thiếu một dòng là
    // có khoản bị trừ mà không có lời giải trình.
    const pl = await docHet((a, b) => db.from("revenue_classifications")
      .select("transaction_id, confirmed_type, ghi_chu, confirmed_role, confirmed_at, transactions!inner(transaction_date, amount, merchant_name, counter_account_name)")
      .eq("company_id", companyId).eq("revenue_effect", "exclude")
      .gte("transactions.transaction_date", `${n.nam}-01-01`).lte("transactions.transaction_date", `${n.nam}-12-31`)
      .order("transaction_id", { ascending: true }).range(a, b), "phụ lục giải trình");
    phuLuc = pl.map((r) => {
      const t = Array.isArray(r.transactions) ? r.transactions[0] : r.transactions;
      return {
        ngay: String(t?.transaction_date ?? "").slice(0, 10),
        so_tien: Math.abs(Number(t?.amount ?? 0)),
        noi_dung: [t?.counter_account_name, t?.merchant_name].filter(Boolean).join(" — "),
        loai: TEN_PHAN_LOAI[r.confirmed_type as LoaiPhanLoai] ?? r.confirmed_type,
        ghi_chu: r.ghi_chu ?? null,
        vai_tro: r.confirmed_role,
        xac_nhan_luc: r.confirmed_at,
      };
    }).sort((a, b) => a.ngay.localeCompare(b.ngay));
  }

  // P0-003: kiểm hiệu lực căn cứ theo đúng ngày hôm nay (giờ Việt Nam).
  const canCu = await kiemCanCu(db, [
    ...canCuDung(sl.ket_luan),
    ...(soan.ok ? soan.to_khai.can_cu : soan.can_cu),
  ], homNay);

  // Nghĩa vụ suy từ dữ kiện (bộ tối thiểu) — xem `_shared/nghia-vu/tinh.ts`.
  const { data: ctNguoi } = await db.from("companies").select("employee_count").eq("id", companyId).maybeSingle();
  const nghiaVu = tinhNghiaVu({
    homNay, loai: dung.su_kien.loai, trangThai: trangThai.trang_thai, suyLuan: sl,
    hoatDong: dung.su_kien.hoatDong ?? null, soNguoi: (ctNguoi?.employee_count as string | null) ?? null,
  });

  return {
    ket_qua: {
      nam: n.nam,
      nghia_vu: nghiaVu,
      trang_thai_doanh_nghiep: trangThai,
      hom_nay: homNay,
      cong_ty: congTyChoGiaoDien(cong_ty),
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
      het_hieu_luc: canCu.filter((c) => c.hieu_luc?.trang_thai === "het_hieu_luc").map((c) => c.id),
      phien_ban_he_luat: PHIEN_BAN_HE_LUAT,
      thanh_toan: { ...quyenLoi, da_tra_ky_nay: !!daTra?.length },
      phu_luc_giai_trinh: phuLuc,
    },
    soan,
    ky,
  };
}

/**
 * Tiền vào của năm + phân loại người đã xác nhận → bảng tiền vào (tiền vào / đã xác nhận / không
 * phải doanh thu / chưa rõ) kèm nhóm để xác nhận hàng loạt. Xem miễn phí, xác nhận miễn phí.
 */
async function docBangTienVao(db: Db, companyId: string, body: Row) {
  const homNay = iso(lucGioVietNam());
  const n = docNam(body.nam, homNay);
  if (!n.ok) return { loi: n.cau };
  const laDemo = await congTyLaDemo(db, companyId);
  // Cùng nguồn đọc với doanh thu tờ khai và mốc 1 tỷ — xem `_shared/doanh-thu/so-lieu.ts`.
  const nguon = await docNguonTienVao(db, companyId, n.nam, laDemo, ", merchant_name, counter_account_name, payment_reference");
  return {
    ...lapBangTienVao(n.nam, nguon.giao_dich.filter((t) => chieuTien(t) === "vao") as never, nguon.xac_nhan as XacNhanPhanLoai[], nguon.noi_bo.internalIds),
    la_demo: laDemo,
  };
}

/** Chia theo nhóm hoạt động của một nguồn. `tu_nhap` dựng từ số tự nhập (nếu có). */
function chiaCuaNguon(
  hd: { ngan_hang: ChiaHoatDong; hoa_don: ChiaHoatDong | null } | undefined,
  nguon: NguonDoanhThuKhoan,
  _nam: number,
  _tuNhap: unknown,
): ChiaHoatDong | null {
  if (!hd) return null;
  if (nguon === "giao_dich") return hd.ngan_hang;
  if (nguon === "hoa_don") return hd.hoa_don;
  return null;
}

/**
 * Doanh thu theo nhóm hoạt động của NGUỒN ĐANG DÙNG ĐỂ KHAI, kèm danh sách khoản chưa rõ nhóm để
 * người xác nhận. Không trả mã khoản của nhóm đã rõ (có thể hàng nghìn) — chỉ tổng.
 */
async function docHoatDong(db: Db, companyId: string, body: Row) {
  const homNay = iso(lucGioVietNam());
  const n = docNam(body.nam, homNay);
  if (!n.ok) return { loi: n.cau };
  const laDemo = await congTyLaDemo(db, companyId);
  const [{ cong_ty, ho_so }, doanhThu] = await Promise.all([docHoSo(db, companyId), docDoanhThuQuy(db, companyId, n.nam, laDemo)]);
  const dung = dungSuKien({ nam: n.nam, homNay, congTy: cong_ty, hoSo: ho_so, doanhThu });
  const chia = dung.su_kien.hoatDong ?? null;
  const tomTat = chia
    ? Object.fromEntries(Object.entries(chia.nhom).map(([k, o]) => [k, { so_tien: o.so_tien, so_khoan: o.so_khoan }]))
    : null;

  // Khoản chưa rõ: kèm nội dung để người đọc mà quyết (chỉ nguồn ngân hàng có nội dung chuyển khoản).
  let chuaRo: Row[] = [];
  const idsChuaRo = chia?.nhom.chua_ro.ids ?? [];
  if (chia?.nguon === "giao_dich" && idsChuaRo.length) {
    const { data } = await locMinhHoa(db.from("transactions")
      .select("id, amount, transaction_date, merchant_name, counter_account_name, payment_reference, is_synthetic")
      .eq("company_id", companyId).in("id", idsChuaRo.slice(0, 200)), laDemo);
    chuaRo = ((data ?? []) as Row[]).map((t) => ({
      id: t.id, ngay: String(t.transaction_date).slice(0, 10), so_tien: Math.abs(Number(t.amount)),
      noi_dung: [t.counter_account_name, t.merchant_name ?? t.payment_reference].filter(Boolean).join(" — ") || "—",
    })).sort((a, b) => b.so_tien - a.so_tien);
  } else if (chia?.nguon === "hoa_don" && idsChuaRo.length) {
    const { data } = await db.from("gdt_invoices").select("id, total_amount, issuance_period, counterparty_name, invoice_serial, invoice_number")
      .eq("company_id", companyId).in("id", idsChuaRo.slice(0, 200));
    chuaRo = ((data ?? []) as Row[]).map((h) => ({
      id: h.id, ngay: `${String(h.issuance_period).slice(0, 4)}-${String(h.issuance_period).slice(4, 6)}`,
      so_tien: Number(h.total_amount ?? 0),
      noi_dung: [h.invoice_number ? `HĐ ${h.invoice_serial ?? ""}${h.invoice_number}` : null, h.counterparty_name].filter(Boolean).join(" — ") || "Hoá đơn đã xuất",
    })).sort((a, b) => b.so_tien - a.so_tien);
  }

  return {
    nam: n.nam,
    // Nhóm hoạt động chỉ quyết định dòng tờ khai của hộ kinh doanh; giao diện ẩn với doanh nghiệp.
    loai: dung.su_kien.loai,
    nguon: chia?.nguon ?? null,
    nguon_doanh_thu: dung.su_kien.nguonDoanhThu,
    tong: chia?.tong ?? 0,
    nhom: tomTat,
    chua_ro: { so_tien: chia?.nhom.chua_ro.so_tien ?? 0, so_khoan: idsChuaRo.length, khoan: chuaRo },
    goi_y: goiYHoatDong(ho_so.nhom_nganh),
    nganh_dang_ky: ho_so.nhom_nganh,
    cac_nhom: HOAT_DONG.map((k) => ({ ma: k, ten: TEN_NHOM_NGANH[k] })),
    la_demo: laDemo,
  };
}

/** MIMI-P1-003: sửa hồ sơ thuế và lưu bản nháp tờ khai là việc của kế toán trở lên. */
const QUYEN_HANH_DONG: Record<string, HanhDong> = {
  luu_ho_so: "sua_ho_so_thue",
  luu_nhap: "soan_to_khai",
  xuat: "soan_to_khai",
  xoa_nhap: "soan_to_khai",
  // Xác nhận làm GIẢM doanh thu khai thuế: cùng mức quyền với sửa hồ sơ thuế.
  xac_nhan_tien_vao: "sua_ho_so_thue",
  hoan_tac_tien_vao: "sua_ho_so_thue",
  // Nhóm hoạt động quyết định dòng và tỷ lệ thuế trên tờ khai: cùng mức quyền.
  xac_nhan_hoat_dong: "sua_ho_so_thue",
  hoan_tac_hoat_dong: "sua_ho_so_thue",
};

async function xuLy(db: Db, userId: string, company: { id: string; name: string | null }, vaiTro: VaiTro, hanhDong: string, body: Row): Promise<Response> {
  const can = QUYEN_HANH_DONG[hanhDong];
  if (can) kiemQuyen(vaiTro, can, cauTuChoi(vaiTro, can));
  switch (hanhDong) {
    case "ho_so": {
      // Cài đặt gọi hành động này ngay sau khi lưu mã số thuế: tra lần đầu ở đây.
      await dongBoMstCongTy(db, company.id, cauHinhXInvoice());
      const { cong_ty, ho_so } = await docHoSo(db, company.id);
      return json({ cong_ty: { ...congTyChoGiaoDien(cong_ty), loai_tai_khoan: cong_ty.account_type }, ho_so });
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
      // Ảnh chụp pháp lý (P0-003): căn cứ kèm tình trạng hiệu lực lúc soạn + phiên bản bộ quy tắc, cùng vào mã băm.
      const noiDung = JSON.stringify({ to_khai: tk, can_cu: r.ket_qua.can_cu, phien_ban_he_luat: PHIEN_BAN_HE_LUAT });
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
        du_lieu: { ...tk, phien_ban_he_luat: PHIEN_BAN_HE_LUAT },
        can_cu: r.ket_qua.can_cu,
        ma_bam: bam,
        user_id: userId,
      }).select("id, created_at").single();
      if (error) throw error;
      return json({ id: data.id, created_at: data.created_at, ma_bam: bam });
    }

    /*
     * XUẤT TỜ KHAI — chỗ MIMI thu tiền: 10.000đ một tờ, hoặc miễn phí khi gói còn hạn.
     *
     * Xem trước, sửa số, lưu nháp đều miễn phí: người dùng thấy đủ giá trị trước khi trả. Tiền
     * tính ở lúc lấy bản sạch để nộp. Một kỳ khai chỉ tính một lần — sửa số rồi xuất lại cùng
     * kỳ thì không mất thêm (`luot_to_khai_mot_lan_moi_ky`).
     *
     * Trừ lượt TRƯỚC khi lưu bản xuất, bằng hàm nguyên tử ở CSDL: hai lần bấm cùng lúc không
     * cùng thấy "còn 1 lượt".
     */
    case "xuat": {
      const r = await phanTich(db, company.id, body);
      if (r.loi) return loi("THAM_SO", r.loi, 400);
      if (!r.soan || !r.soan.ok) return loi("CHUA_SOAN_DUOC", r.soan?.ly_do ?? "Chưa soạn được tờ khai.", 409);
      const tk = r.soan.to_khai;
      /*
       * KHÔNG XUẤT KHI CÒN VƯỚNG CHẶN. Kiểm TRƯỚC khi trừ lượt: người dùng không trả tiền cho một tờ
       * khai MIMI biết là chưa đúng (ví dụ còn doanh thu chưa rõ nhóm hoạt động).
       */
      if (tk.san_sang.trang_thai === "bi_chan") {
        return json({
          error: tk.san_sang.vuong.filter((v) => v.chan).map((v) => v.cau).join(" "),
          ma: "CHUA_SAN_SANG",
          san_sang: tk.san_sang,
        }, 409);
      }
      const ky = r.ky as KyToKhai;
      const khoa = khoaKy(tk.mau, ky);
      const tt = r.ket_qua.thanh_toan;

      let cachTra: "goi" | "luot" | "da_tra_ky_nay";
      if (tt.goi) cachTra = "goi";
      else {
        const { data: kq, error: loiTru } = await db.rpc("tru_luot_to_khai", { p_company: company.id, p_ky_khoa: khoa, p_to_khai_nhap: null });
        if (loiTru) throw loiTru;
        if (kq === "het_luot") {
          return json({
            error: `Xuất tờ khai này cần ${tt.gia_mot_to.toLocaleString("vi-VN")}đ. Mua lượt xuất hoặc gói tháng để tiếp tục.`,
            ma: "CAN_THANH_TOAN",
            gia_mot_to: tt.gia_mot_to,
          }, 402);
        }
        cachTra = kq === "da_tru" ? "luot" : "da_tra_ky_nay";
      }

      const noiDung = JSON.stringify({ to_khai: tk, can_cu: r.ket_qua.can_cu, phien_ban_he_luat: PHIEN_BAN_HE_LUAT });
      const bam = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(noiDung))),
        (x) => x.toString(16).padStart(2, "0"),
      ).join("");
      const bayGio = new Date().toISOString();
      const { data, error } = await db.from("to_khai_nhap").insert({
        company_id: company.id,
        mau: tk.mau,
        nam: ky.nam,
        ky_loai: ky.loai,
        quy: ky.loai === "quy" ? ky.quy : null,
        han_nop: tk.han_nop,
        du_lieu: { ...tk, phien_ban_he_luat: PHIEN_BAN_HE_LUAT },
        can_cu: r.ket_qua.can_cu,
        ma_bam: bam,
        user_id: userId,
        da_xuat_luc: bayGio,
        cach_tra: cachTra,
      }).select("id, created_at").single();
      if (error) throw error;
      if (cachTra === "luot") {
        await db.from("luot_to_khai").update({ to_khai_nhap_id: data.id })
          .eq("company_id", company.id).eq("ly_do", "xuat").eq("ky_khoa", khoa).is("to_khai_nhap_id", null);
      }
      return json({
        id: data.id,
        ma_bam: bam,
        cach_tra: cachTra,
        con_luot: cachTra === "luot" ? tt.con_luot - 1 : tt.con_luot,
      });
    }

    /*
     * TIỀN VÀO — khoản nào là tiền bán hàng, khoản nào không. MIỄN PHÍ (docs/KIEM_TOAN_RA_MAT.md,
     * mục P-4): xác nhận là bước kích hoạt, không phải chỗ thu tiền. Máy gợi ý, người quyết; mỗi
     * lần đổi ghi một dòng vào `revenue_classification_events` và hoàn tác được.
     */
    case "tien_vao": {
      const bang = await docBangTienVao(db, company.id, body);
      if ("loi" in bang && bang.loi) return loi("THAM_SO", bang.loi, 400);
      // Đo kích hoạt: lần quét đầu, lần đầu MIMI thấy điều người dùng chưa biết.
      if (!("loi" in bang) || !bang.loi) {
        const b = bang as { so_giao_dich: number; can_xem: { so: number } };
        if (b.so_giao_dich > 0) {
          await ghiNhieuSuKien(db, company.id, userId, [
            ["first_scan_completed", { so_giao_dich: b.so_giao_dich }],
            ...(b.can_xem.so > 0 ? [["first_exception_detected", { so: b.can_xem.so }] as ["first_exception_detected", Record<string, unknown>]] : []),
          ]);
        }
      }
      return json(bang);
    }

    case "xac_nhan_tien_vao": {
      const x = docXacNhan(body);
      if (!x.ok) return loi("THAM_SO", x.cau, 400);
      const laDemo = await congTyLaDemo(db, company.id);
      const { data: gds, error: loiGd } = await locMinhHoa(db.from("transactions")
        .select("id, amount, type, transaction_date, merchant_name, counter_account_name, payment_reference, is_synthetic")
        .eq("company_id", company.id).in("id", x.transaction_ids), laDemo);
      if (loiGd) throw loiGd;
      const vao = ((gds ?? []) as Row[]).filter((g) => chieuTien(g) === "vao");
      if (vao.length !== x.transaction_ids.length) return loi("KHONG_THAY", "Có khoản không thuộc công ty này, hoặc không phải tiền vào.", 404);

      const { data: cu } = await db.from("revenue_classifications").select("transaction_id, confirmed_type, revenue_effect").in("transaction_id", x.transaction_ids);
      const cuTheoGd = new Map(((cu ?? []) as Row[]).map((r) => [r.transaction_id, r]));
      const bayGio = new Date().toISOString();
      const nhom = x.transaction_ids.length > 1 ? crypto.randomUUID() : null;
      const hieuLuc = anhHuong(x.loai);

      const { error: loiGhi } = await db.from("revenue_classifications").upsert(vao.map((g) => {
        const goiY = goiYPhanLoai(g as { merchant_name: string | null; counter_account_name: string | null; payment_reference: string | null });
        return {
          company_id: company.id, transaction_id: g.id,
          suggested_type: goiY?.loai ?? null, suggestion_source: goiY ? "pattern" : "human",
          reason_text: goiY?.ly_do ?? null,
          confirmed_type: x.loai, revenue_effect: hieuLuc, requires_review: x.loai === "unknown",
          ghi_chu: x.ghi_chu, confirmed_by: userId, confirmed_role: vaiTro, confirmed_at: bayGio, updated_at: bayGio,
        };
      }), { onConflict: "transaction_id" });
      if (loiGhi) throw loiGhi;

      const { error: loiLs } = await db.from("revenue_classification_events").insert(vao.map((g) => ({
        company_id: company.id, transaction_id: g.id,
        from_type: cuTheoGd.get(g.id)?.confirmed_type ?? null, from_effect: cuTheoGd.get(g.id)?.revenue_effect ?? null,
        to_type: x.loai, to_effect: hieuLuc, bulk_group_id: nhom, actor: userId, actor_role: vaiTro, at: bayGio,
      })));
      if (loiLs) throw loiLs;

      const tong = vao.reduce((s, g) => s + Math.abs(Number(g.amount)), 0);
      const moTa = `${vao.length} khoản, tổng ${tong.toLocaleString("vi-VN")}đ: ${TEN_PHAN_LOAI[x.loai]}${hieuLuc === "exclude" ? " — không cộng vào doanh thu" : hieuLuc === "include" ? " — cộng vào doanh thu" : " — để chưa rõ"}.`;
      await db.from("nhat_ky_quyet_dinh").insert({
        company_id: company.id, user_id: userId, vai_tro: vaiTro,
        de_xuat_khoa: `phan_loai:${nhom ?? vao[0].id}`, loai: "phan_loai_tien_vao",
        tham_so: { transaction_ids: x.transaction_ids, loai: x.loai, bulk_group_id: nhom },
        mo_ta_da_xac_nhan: moTa.slice(0, 2000), ket_qua: "thanh_cong", ket_qua_cau: moTa.slice(0, 2000), xong_luc: bayGio,
      });
      await ghiNhieuSuKien(db, company.id, userId, [
        ["first_classification_confirmed", { loai: x.loai }],
        ["classification_confirmed", { loai: x.loai, so: vao.length, hang_loat: !!nhom }],
      ]);
      return json({ ok: true, so: vao.length, bulk_group_id: nhom });
    }

    case "hoan_tac_tien_vao": {
      const nhom = typeof body.bulk_group_id === "string" ? body.bulk_group_id : null;
      const gdId = typeof body.transaction_id === "string" ? body.transaction_id : null;
      if (!nhom && !gdId) return loi("THAM_SO", "Thiếu lần xác nhận cần hoàn tác.", 400);
      let q = db.from("revenue_classification_events").select("transaction_id, from_type, from_effect, at")
        .eq("company_id", company.id).eq("la_hoan_tac", false);
      q = nhom ? q.eq("bulk_group_id", nhom) : q.eq("transaction_id", gdId);
      const { data: ls, error: loiLs } = await q.order("at", { ascending: false }).limit(nhom ? 500 : 1);
      if (loiLs) throw loiLs;
      if (!ls?.length) return loi("KHONG_THAY", "Không có gì để hoàn tác.", 404);

      const { data: hienTai } = await db.from("revenue_classifications").select("transaction_id, confirmed_type, revenue_effect")
        .in("transaction_id", ls.map((s: Row) => s.transaction_id));
      const htTheoGd = new Map(((hienTai ?? []) as Row[]).map((r) => [r.transaction_id, r]));
      const bayGio = new Date().toISOString();
      for (const k of keHoachHoanTac(ls as never)) {
        if (k.ve) {
          await db.from("revenue_classifications").update({ confirmed_type: k.ve.loai, revenue_effect: k.ve.anh_huong, confirmed_by: userId, confirmed_role: vaiTro, confirmed_at: bayGio, updated_at: bayGio })
            .eq("transaction_id", k.transaction_id).eq("company_id", company.id);
        } else {
          await db.from("revenue_classifications").delete().eq("transaction_id", k.transaction_id).eq("company_id", company.id);
        }
        await db.from("revenue_classification_events").insert({
          company_id: company.id, transaction_id: k.transaction_id,
          from_type: htTheoGd.get(k.transaction_id)?.confirmed_type ?? null, from_effect: htTheoGd.get(k.transaction_id)?.revenue_effect ?? null,
          to_type: k.ve?.loai ?? null, to_effect: k.ve?.anh_huong ?? null,
          bulk_group_id: nhom, la_hoan_tac: true, actor: userId, actor_role: vaiTro, at: bayGio,
        });
      }
      return json({ ok: true, so: ls.length });
    }

    /*
     * NHÓM HOẠT ĐỘNG — khoản doanh thu thuộc dòng nào trên tờ khai. MIỄN PHÍ như xác nhận tiền vào.
     * Máy chỉ gợi ý (ngành đăng ký nếu có đúng một); người quyết. Xem `doanh-thu/theo-hoat-dong.ts`.
     */
    case "hoat_dong": {
      const r = await docHoatDong(db, company.id, body);
      if ("loi" in r) return loi("THAM_SO", r.loi as string, 400);
      return json(r);
    }

    case "xac_nhan_hoat_dong": {
      const homNay = iso(lucGioVietNam());
      const x = docXacNhanHoatDong(body, Number(homNay.slice(0, 4)));
      if (!x.ok) return loi("THAM_SO", x.cau, 400);

      // Khoản nào: hoặc danh sách người chọn (kiểm từng mã thuộc công ty + là doanh thu của nguồn),
      // hoặc MỌI khoản còn chưa rõ của năm — máy chủ tự lấy lúc bấm.
      const laDemo = await congTyLaDemo(db, company.id);
      const dt = await docDoanhThuQuy(db, company.id, x.nam, laDemo);
      const chia = chiaCuaNguon(dt.hoat_dong, x.nguon, x.nam, null);
      const hopLe = new Set(chia ? Object.values(chia.nhom).flatMap((o) => o.ids) : []);
      const ids = x.tat_ca_chua_ro ? (chia?.nhom.chua_ro.ids ?? []) : (x.ids ?? []);
      if (!ids.length) return loi("KHONG_THAY", "Không còn khoản nào chưa rõ nhóm hoạt động.", 404);
      if (x.nguon !== "tu_nhap" && ids.some((id) => !hopLe.has(id))) {
        return loi("KHONG_THAY", "Có khoản không thuộc công ty này, hoặc không phải doanh thu của năm đã chọn.", 404);
      }

      const { data: cu } = await db.from("phan_loai_hoat_dong").select("nguon_id, hoat_dong")
        .eq("company_id", company.id).eq("nguon", x.nguon).in("nguon_id", ids.slice(0, 1000));
      const cuTheo = new Map(((cu ?? []) as Row[]).map((r) => [r.nguon_id, r.hoat_dong]));
      const bayGio = new Date().toISOString();
      const nhom = crypto.randomUUID();
      const goiY = goiYHoatDong((await docHoSo(db, company.id)).ho_so.nhom_nganh);

      for (let i = 0; i < ids.length; i += TOI_DA_MOT_LAN_HOAT_DONG) {
        const phan = ids.slice(i, i + TOI_DA_MOT_LAN_HOAT_DONG);
        const { error: loiGhi } = await db.from("phan_loai_hoat_dong").upsert(phan.map((id) => ({
          company_id: company.id, nguon: x.nguon, nguon_id: id, hoat_dong: x.hoat_dong,
          nguon_xac_dinh: "nguoi_dung", goi_y: goiY,
          confirmed_by: userId, confirmed_role: vaiTro, confirmed_at: bayGio, updated_at: bayGio,
        })), { onConflict: "company_id,nguon,nguon_id" });
        if (loiGhi) throw loiGhi;
        const { error: loiLs } = await db.from("phan_loai_hoat_dong_su_kien").insert(phan.map((id) => ({
          company_id: company.id, nguon: x.nguon, nguon_id: id,
          tu_hoat_dong: cuTheo.get(id) ?? null, sang_hoat_dong: x.hoat_dong,
          nhom_hang_loat: nhom, actor: userId, actor_role: vaiTro, at: bayGio,
        })));
        if (loiLs) throw loiLs;
      }

      const moTa = `${ids.length} khoản doanh thu (${x.nguon === "giao_dich" ? "ngân hàng" : x.nguon === "hoa_don" ? "hoá đơn" : "tự nhập"}, năm ${x.nam}) thuộc nhóm ${TEN_NHOM_NGANH[x.hoat_dong]}.`;
      await db.from("nhat_ky_quyet_dinh").insert({
        company_id: company.id, user_id: userId, vai_tro: vaiTro,
        de_xuat_khoa: `hoat_dong:${nhom}`, loai: "phan_loai_hoat_dong",
        tham_so: { nguon: x.nguon, nam: x.nam, hoat_dong: x.hoat_dong, so: ids.length, tat_ca_chua_ro: x.tat_ca_chua_ro, nhom_hang_loat: nhom },
        mo_ta_da_xac_nhan: moTa, ket_qua: "thanh_cong", ket_qua_cau: moTa, xong_luc: bayGio,
      });
      return json({ ok: true, so: ids.length, nhom_hang_loat: nhom });
    }

    case "hoan_tac_hoat_dong": {
      const nhom = typeof body.nhom_hang_loat === "string" ? body.nhom_hang_loat : null;
      if (!nhom) return loi("THAM_SO", "Thiếu lần xác nhận cần hoàn tác.", 400);
      const ls = await docHet((a, b) => db.from("phan_loai_hoat_dong_su_kien")
        .select("nguon, nguon_id, tu_hoat_dong, at").eq("company_id", company.id)
        .eq("nhom_hang_loat", nhom).eq("la_hoan_tac", false).order("id", { ascending: true }).range(a, b), "lịch sử nhóm hoạt động");
      if (!ls.length) return loi("KHONG_THAY", "Không có gì để hoàn tác.", 404);
      const bayGio = new Date().toISOString();
      for (const k of keHoachHoanTacHoatDong(ls as never)) {
        const q = db.from("phan_loai_hoat_dong");
        if (k.ve) {
          await q.update({ hoat_dong: k.ve, confirmed_by: userId, confirmed_role: vaiTro, confirmed_at: bayGio, updated_at: bayGio })
            .eq("company_id", company.id).eq("nguon", k.nguon).eq("nguon_id", k.nguon_id);
        } else {
          await q.delete().eq("company_id", company.id).eq("nguon", k.nguon).eq("nguon_id", k.nguon_id);
        }
        await db.from("phan_loai_hoat_dong_su_kien").insert({
          company_id: company.id, nguon: k.nguon, nguon_id: k.nguon_id, tu_hoat_dong: null, sang_hoat_dong: k.ve,
          nhom_hang_loat: nhom, la_hoan_tac: true, actor: userId, actor_role: vaiTro, at: bayGio,
        });
      }
      return json({ ok: true, so: ls.length });
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

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string; name: string | null }>(db, user.id, "id, name", chon);
    const company = ct?.cong_ty ?? null;
    if (!ct || !company) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);

    const hanhDong = String(body.hanh_dong ?? "");
    const gioiHan = GIOI_HAN[hanhDong];
    if (gioiHan) {
      const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
        p_user: user.id, p_hanh_dong: `to_khai_${hanhDong}`, p_cua_so_giay: gioiHan.cuaSoGiay, p_toi_da: gioiHan.toiDa,
      });
      if (loiDem) console.error("to-khai gioi han:", loiDem.message);
      else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);
    }

    return await xuLy(db, user.id, company, ct.vai_tro, hanhDong, body);
  } catch (e) {
    if (e instanceof LoiQuyen) return loi("KHONG_DU_QUYEN", e.message, 403);
    // Không in thân yêu cầu: có thể chứa doanh thu, mã số thuế của khách.
    console.error("to-khai:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "MIMI gặp lỗi khi soạn tờ khai. Thử lại sau ít phút.", 500);
  }
});
