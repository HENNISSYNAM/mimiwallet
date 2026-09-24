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
import { findInternalTransfers, type LedgerTx } from "../_shared/ledger/internal-transfer.ts";
import { chieuTien } from "../_shared/tien/chieu-tien.ts";

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
  const soan = soanToKhai(dung.su_kien, sl, { ten: cong_ty.ten, mst: cong_ty.mst }, ky);

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
    const { data: pl } = await db.from("revenue_classifications")
      .select("confirmed_type, ghi_chu, confirmed_role, confirmed_at, transactions!inner(transaction_date, amount, merchant_name, counter_account_name)")
      .eq("company_id", companyId).eq("revenue_effect", "exclude")
      .gte("transactions.transaction_date", `${n.nam}-01-01`).lte("transactions.transaction_date", `${n.nam}-12-31`)
      .limit(500);
    phuLuc = ((pl ?? []) as Row[]).map((r) => {
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

  return {
    ket_qua: {
      nam: n.nam,
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
  const [gd, kn, pl] = await Promise.all([
    locMinhHoa(db.from("transactions")
      .select("id, amount, type, transaction_date, merchant_name, counter_account_name, payment_reference, account_number, counter_account_number, is_synthetic")
      .eq("company_id", companyId), laDemo)
      .gte("transaction_date", `${n.nam}-01-01`).lte("transaction_date", `${n.nam}-12-31`).limit(20000),
    db.from("bank_connections").select("account_number").eq("company_id", companyId).is("revoked_at", null),
    db.from("revenue_classifications").select("transaction_id, confirmed_type, revenue_effect, ghi_chu, confirmed_role, confirmed_at").eq("company_id", companyId),
  ]);
  if (gd.error) throw gd.error;
  if (pl.error) throw pl.error;
  const rows = ((gd.data ?? []) as Row[]).map((t) => ({ ...t, amount: Number(t.amount) }));
  const taiKhoan = ((kn.data ?? []) as Row[]).map((c) => c.account_number).filter((a): a is string => typeof a === "string" && !!a && !a.startsWith("grant:"));
  const noiBo = findInternalTransfers(rows as LedgerTx[], { ownAccounts: taiKhoan });
  return {
    ...lapBangTienVao(n.nam, rows.filter((t) => chieuTien(t) === "vao") as never, (pl.data ?? []) as XacNhanPhanLoai[], noiBo.internalIds),
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
