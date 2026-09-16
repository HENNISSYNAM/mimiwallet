/**
 * MIMI Assistant — một ô hỏi cho mọi việc tài chính của doanh nghiệp.
 *
 * Người dùng chỉ thấy một trợ lý; phía sau là các năng lực (`_shared/tro-ly/tinh-toan.ts`)
 * chia 7 nhóm: trợ lý & agent, chi phí, hoá đơn & chứng từ, ngân hàng & đối soát, AI &
 * token, báo cáo, kết nối. Luồng: câu hỏi → hiểu → đọc dữ liệu → tính → đề xuất → người
 * dùng xác nhận trên màn hình → giao diện gọi đúng backend đã có (tac-tu, chi-phi-ai,
 * bank-link, hoặc `luu_chung_tu` ở đây).
 *
 * HAI CHẾ ĐỘ HIỂU CÂU HỎI:
 *   - `mo_hinh`: có `LOVABLE_API_KEY` → Gemini chọn năng lực và viết lời (`mo-hinh.ts`).
 *   - `co_dinh`: không có khoá, hoặc cổng lỗi → bộ nhận ý định (`y-dinh.ts`). Tới 15/09/2026
 *     production chưa có khoá nên đây là đường đang chạy.
 *
 * HÀNH ĐỘNG. Function này KHÔNG duyệt, không đồng bộ, không đổi agent — chỉ trả đề xuất.
 * Việc duy nhất nó ghi là chứng từ quét người dùng đã xác nhận (`luu_chung_tu`).
 *
 * Chỉ chủ doanh nghiệp (JWT). Đọc bằng service role, luôn lọc theo công ty đang dùng.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import type { NhomNangLuc } from "../_shared/tro-ly/kieu.ts";
import { NHOM_NANG_LUC } from "../_shared/tro-ly/kieu.ts";
import { nhanYDinh } from "../_shared/tro-ly/y-dinh.ts";
import { dungTraLoi } from "../_shared/tro-ly/tra-loi.ts";
import { docAnhChungTu, docKetQuaQuet, giaiMaAnh, hoiMoHinh, kiemAnh, LoiMoHinh, type TinNhanCu } from "../_shared/tro-ly/mo-hinh.ts";
import {
  congNgay,
  danhSachKetNoi,
  duLieuTrong,
  NANG_LUC,
  phanTichNhanh,
  SO_THANG_BIEU_DO_AI,
  thangLui,
  viecHomNay,
  type DuLieu,
  type NguonCan,
} from "../_shared/tro-ly/tinh-toan.ts";
import { khoangNgayKyKeKhai, kyKeKhaiKeTiep, lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";
import { CAN_CU } from "../_shared/luat/he-luat.ts";
import { kiemCanCu } from "../_shared/luat/doc-can-cu.ts";
import { docDoanhThuQuy, docHoSo, dungSuKien } from "../_shared/luat/doc-su-kien.ts";
import { chieuTien, doLonTien } from "../_shared/tien/chieu-tien.ts";
import { LECH_TIEN } from "../_shared/chung-tu/khop-chung-tu.ts";

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

const KICH_THUOC_THAN_TOI_DA = 8_000_000;

/**
 * Giới hạn mỗi người dùng, mỗi phút. Đủ rộng cho người thật bấm liên tục, đủ chặt để một
 * phiên bị chiếm không dò hết dữ liệu hay đốt hạn mức mô hình. Lỗi đếm (ví dụ migration chưa
 * chạy) thì cho qua và ghi log — không khoá người dùng thật vì lỗi hạ tầng.
 */
const GIOI_HAN: Record<string, { cuaSoGiay: number; toiDa: number }> = {
  hoi: { cuaSoGiay: 60, toiDa: 30 },
  quet_chung_tu: { cuaSoGiay: 60, toiDa: 10 },
  luu_chung_tu: { cuaSoGiay: 60, toiDa: 30 },
  xoa_chung_tu: { cuaSoGiay: 60, toiDa: 30 },
  boi_canh: { cuaSoGiay: 60, toiDa: 60 },
  trang_thai: { cuaSoGiay: 60, toiDa: 120 },
};

const NGAY_LICH_SU = 180;
const TOI_DA_GIAO_DICH = 10_000;
const DO_DAI_CAU_HOI = 1000;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function mocThoiGian() {
  const vn = lucGioVietNam();
  const ky = kyKeKhaiKeTiep(vn);
  const khoang = khoangNgayKyKeKhai(ky);
  return { homNay: iso(vn), ky: { ...khoang, nhan: `quý ${ky.quy}/${ky.nam}` } };
}

/** Mọi lỗi truy vấn đều ném: truy vấn hỏng trông y hệt "không có dữ liệu", và trợ lý sẽ nói sai. */
function kiem<T>(r: { data: T; error: { message: string } | null }, ten: string): T {
  if (r.error) throw new Error(`Không đọc được ${ten}: ${r.error.message}`);
  return r.data;
}

async function docGiaoDich(db: Db, companyId: string, tu: string) {
  const ds: Row[] = [];
  for (let tuDong = 0; tuDong < TOI_DA_GIAO_DICH; tuDong += 1000) {
    const trang = kiem(
      await db.from("transactions")
        .select("id, amount, type, transaction_date, merchant_name, category, counter_account_name, payment_reference")
        .eq("company_id", companyId)
        // Không bao giờ để dữ liệu thử vào lời trợ lý.
        .eq("is_synthetic", false)
        .gte("transaction_date", tu)
        .order("transaction_date", { ascending: true })
        .order("id", { ascending: true })
        .range(tuDong, tuDong + 999),
      "giao dịch",
    ) as Row[];
    ds.push(...trang);
    if (trang.length < 1000) break;
  }
  return ds.map((t) => ({ ...t, amount: Number(t.amount) }));
}

/** Đọc đúng những nguồn các năng lực cần. Một lần hỏi đọc mỗi nguồn nhiều nhất một lần. */
async function docDuLieu(
  db: Db,
  companyId: string,
  can: Set<NguonCan>,
  moc: ReturnType<typeof mocThoiGian>,
  tuyChon: { soThangAi?: number } = {},
): Promise<DuLieu> {
  const d = duLieuTrong(moc.homNay, moc.ky);
  const tuLichSu = [congNgay(moc.homNay, -NGAY_LICH_SU), moc.ky.tu].sort()[0];
  // Mặc định từ đầu tháng trước (so cùng kỳ) hoặc 31 ngày (token); biểu đồ màn đầu cần 5 tháng.
  const tuAi = [
    congNgay(moc.homNay, -31),
    `${thangLui(moc.homNay, Math.max(1, (tuyChon.soThangAi ?? 2) - 1))}-01`,
  ].sort()[0];
  const viec: Promise<void>[] = [];

  if (can.has("giao_dich")) viec.push(docGiaoDich(db, companyId, tuLichSu).then((r) => { d.giaoDich = r as DuLieu["giaoDich"]; }));
  if (can.has("hoa_don_vao")) {
    viec.push(db.from("gdt_invoices")
      .select("id, total_amount, issued_at, invoice_number, counterparty_name, counterparty_tax_code")
      .eq("company_id", companyId).eq("direction", "received").gte("issued_at", tuLichSu).limit(5000)
      .then((r: Row) => { d.hoaDonVao = (kiem(r, "hoá đơn đầu vào") as Row[]).map((h) => ({ ...h, total_amount: Number(h.total_amount) })) as DuLieu["hoaDonVao"]; }));
  }
  if (can.has("hoa_don_ban")) {
    viec.push(db.from("invoices")
      .select("id, invoice_number, client_name, total, issued_date, due_date, status")
      .eq("company_id", companyId).order("due_date", { ascending: true }).limit(5000)
      .then((r: Row) => { d.hoaDonBan = (kiem(r, "hoá đơn bán ra") as Row[]).map((h) => ({ ...h, total: Number(h.total) })) as DuLieu["hoaDonBan"]; }));
  }
  if (can.has("yeu_cau")) {
    viec.push(Promise.all([
      db.from("yeu_cau_chi")
        .select("id, tac_tu_id, so_tien, ten_nguoi_nhan, muc_dich, trang_thai, created_at, so_tien_thuc_chi, ly_do")
        .eq("company_id", companyId).gte("created_at", `${congNgay(moc.homNay, -62)}T00:00:00Z`).limit(5000),
      // Khoản chờ duyệt cũ hơn 62 ngày vẫn phải hiện.
      db.from("yeu_cau_chi")
        .select("id, tac_tu_id, so_tien, ten_nguoi_nhan, muc_dich, trang_thai, created_at, so_tien_thuc_chi, ly_do")
        .eq("company_id", companyId).eq("trang_thai", "cho_duyet").limit(1000),
      db.from("tac_tu").select("id, ten, trang_thai").eq("company_id", companyId),
      db.from("chinh_sach_chi").select("tac_tu_id, han_muc_thang").eq("company_id", companyId),
    ]).then(([yc, cho, tt, cs]) => {
      const m = new Map<string, Row>();
      for (const y of [...(kiem(yc, "yêu cầu chi") as Row[]), ...(kiem(cho, "yêu cầu chờ duyệt") as Row[])]) m.set(y.id, y);
      d.yeuCau = [...m.values()].map((y) => ({ ...y, so_tien: Number(y.so_tien), so_tien_thuc_chi: y.so_tien_thuc_chi == null ? null : Number(y.so_tien_thuc_chi) })) as DuLieu["yeuCau"];
      d.tacTu = kiem(tt, "agent") as DuLieu["tacTu"];
      d.chinhSach = (kiem(cs, "chính sách chi") as Row[]).map((c) => ({ ...c, han_muc_thang: Number(c.han_muc_thang) })) as DuLieu["chinhSach"];
    }));
  }
  if (can.has("ket_noi_ngan_hang")) {
    viec.push(db.from("bank_connections")
      .select("id, bank_name, account_number, status, scopes, provider, last_synced_at")
      .eq("company_id", companyId).neq("status", "disconnected").is("revoked_at", null)
      .then((r: Row) => { d.ketNoiNganHang = kiem(r, "kết nối ngân hàng") as DuLieu["ketNoiNganHang"]; }));
  }
  if (can.has("chi_phi_ai")) {
    viec.push(Promise.all([
      db.from("chi_phi_ai").select("nha_cung_cap, ngay, hang_muc, so_tien_usd, nguon").eq("company_id", companyId).gte("ngay", tuAi).limit(20000),
      db.from("ngan_sach_chi_phi_ai").select("han_muc_thang_usd, canh_bao_phan_tram").eq("company_id", companyId).maybeSingle(),
      db.from("ket_noi_chi_phi_ai").select("nha_cung_cap, trang_thai, dong_bo_luc, loi_cuoi").eq("company_id", companyId).neq("trang_thai", "da_go"),
      db.from("lo_nhap_chi_phi_ai").select("nha_cung_cap").eq("company_id", companyId).limit(500),
    ]).then(([cp, ns, kn, lo]) => {
      d.chiPhiAi = (kiem(cp, "chi phí AI") as Row[]).map((r) => ({ ...r, so_tien_usd: Number(r.so_tien_usd) })) as DuLieu["chiPhiAi"];
      const n = kiem(ns, "ngân sách AI") as Row | null;
      d.nganSachAi = n ? { han_muc_thang_usd: Number(n.han_muc_thang_usd), canh_bao_phan_tram: Number(n.canh_bao_phan_tram) } : null;
      d.ketNoiAi = kiem(kn, "kết nối AI") as DuLieu["ketNoiAi"];
      d.nhapFileAi = [...new Set((kiem(lo, "lần nhập file AI") as Row[]).map((r) => String(r.nha_cung_cap)))];
    }));
  }
  if (can.has("token_ai")) {
    viec.push(db.from("token_ai").select("nha_cung_cap, ngay, model, token_vao, token_vao_cache, token_ra, so_lan_goi")
      .eq("company_id", companyId).gte("ngay", congNgay(moc.homNay, -31)).limit(20000)
      .then((r: Row) => {
        d.tokenAi = (kiem(r, "token AI") as Row[]).map((t) => ({
          ...t, token_vao: Number(t.token_vao), token_vao_cache: Number(t.token_vao_cache), token_ra: Number(t.token_ra), so_lan_goi: Number(t.so_lan_goi),
        })) as DuLieu["tokenAi"];
      }));
  }
  if (can.has("bang_gia")) {
    viec.push(db.from("bang_gia_model").select("model_id, ten, gia_vao_usd_moi_trieu, gia_ra_usd_moi_trieu, lay_luc").limit(5000)
      .then((r: Row) => {
        const ds = kiem(r, "bảng giá model") as Row[];
        d.bangGia = ds.map((g) => ({ model_id: g.model_id, ten: g.ten, gia_vao_usd_moi_trieu: Number(g.gia_vao_usd_moi_trieu), gia_ra_usd_moi_trieu: Number(g.gia_ra_usd_moi_trieu) }));
        d.bangGiaLuc = ds.map((g) => String(g.lay_luc)).sort().at(-1) ?? null;
      }));
  }
  if (can.has("thue")) {
    viec.push((async () => {
      const [hs, dt] = await Promise.all([
        docHoSo(db, companyId),
        docDoanhThuQuy(db, companyId, Number(moc.homNay.slice(0, 4))),
      ]);
      const dung = dungSuKien({ nam: Number(moc.homNay.slice(0, 4)), homNay: moc.homNay, congTy: hs.cong_ty, hoSo: hs.ho_so, doanhThu: dt });
      // Đối chiếu trước cả bộ căn cứ: năng lực là hàm thuần, không gọi được CSDL.
      const kiem = await kiemCanCu(db, Object.keys(CAN_CU));
      d.thue = {
        suKien: dung.su_kien,
        canhBao: dung.canh_bao,
        canCuDaKiem: Object.fromEntries(kiem.map((c) => [c.id, c.da_doi_chieu])),
      };
    })());
  }
  if (can.has("chung_tu_quet")) {
    viec.push(db.from("chung_tu_quet").select("id, tong_tien, ngay, giao_dich_id").eq("company_id", companyId).limit(5000)
      .then((r: Row) => { d.chungTuQuet = (kiem(r, "chứng từ quét") as Row[]).map((c) => ({ ...c, tong_tien: Number(c.tong_tien) })) as DuLieu["chungTuQuet"]; }));
  }
  await Promise.all(viec);
  return d;
}

// `boi_canh` (màn đầu) không cần hệ luật thuế: nó chỉ chạy khi người dùng hỏi về thuế.
const TAT_CA_NGUON: NguonCan[] = ["giao_dich", "hoa_don_vao", "hoa_don_ban", "yeu_cau", "ket_noi_ngan_hang", "chi_phi_ai", "token_ai", "bang_gia", "chung_tu_quet"];

function docLichSu(v: unknown): TinNhanCu[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((m): m is Row => !!m && typeof m === "object" && (m.vai === "nguoi_dung" || m.vai === "tro_ly") && typeof m.noi_dung === "string")
    .slice(-6)
    .map((m) => ({ vai: m.vai, noi_dung: String(m.noi_dung).slice(0, DO_DAI_CAU_HOI) }));
}

async function xuLy(db: Db, userId: string, company: { id: string; name: string | null }, hanhDong: string, body: Row): Promise<Response> {
  const khoaMoHinh = Deno.env.get("LOVABLE_API_KEY") ?? "";
  const moc = mocThoiGian();

  switch (hanhDong) {
    case "boi_canh": {
      const d = await docDuLieu(db, company.id, new Set(TAT_CA_NGUON), moc, { soThangAi: SO_THANG_BIEU_DO_AI });
      return json({
        cong_ty: company.name,
        viec: viecHomNay(d),
        ket_noi: danhSachKetNoi(d),
        phan_tich: phanTichNhanh(d),
        co_mo_hinh: !!khoaMoHinh,
      });
    }

    case "hoi": {
      const cau = String(body.cau ?? "").trim();
      if (!cau) return loi("CAU_HOI", "Bạn chưa nhập câu hỏi.", 400);
      if (cau.length > DO_DAI_CAU_HOI) return loi("CAU_HOI", `Câu hỏi dài tối đa ${DO_DAI_CAU_HOI} ký tự.`, 400);
      const phamVi = (NHOM_NANG_LUC as readonly string[]).includes(String(body.pham_vi)) ? (body.pham_vi as NhomNangLuc) : null;
      const yDinh = nhanYDinh(cau, phamVi);

      // Dữ liệu đọc một lần cho cả câu hỏi, dù mô hình gọi mấy năng lực.
      let dl: Promise<DuLieu> | null = null;
      const nguonDaDoc = new Set<NguonCan>();
      const chay = async (id: string) => {
        const nl = NANG_LUC[id];
        const thieu = nl.can.filter((n) => !nguonDaDoc.has(n));
        if (thieu.length) {
          // Đọc lại đủ các nguồn đã cần từ trước cộng nguồn mới: gọn hơn ghép hai lần đọc.
          thieu.forEach((n) => nguonDaDoc.add(n));
          dl = docDuLieu(db, company.id, new Set(nguonDaDoc), moc);
        }
        return nl.chay(await (dl as Promise<DuLieu>));
      };

      if (khoaMoHinh) {
        try {
          const r = await hoiMoHinh({
            khoa: khoaMoHinh,
            cau,
            lichSu: docLichSu(body.lich_su),
            congCu: Object.entries(NANG_LUC).map(([id, nl]) => ({ id, mo_ta: nl.mo_ta })),
            chay,
            congTy: company.name,
            homNay: moc.homNay,
            goiY: yDinh,
          });
          return json(dungTraLoi({ ketQua: r.ket_qua, cheDo: "mo_hinh", cauMoHinh: r.cau }));
        } catch (e) {
          // Cổng lỗi không làm người dùng mất câu trả lời: chạy tiếp bằng bộ luật cố định.
          if (!(e instanceof LoiMoHinh)) throw e;
          console.error("tro-ly mo hinh:", e.status, e.message);
        }
      }

      const ketQua = [];
      for (const id of yDinh) ketQua.push(await chay(id));
      return json(dungTraLoi({ ketQua, cheDo: "co_dinh" }));
    }

    case "quet_chung_tu": {
      if (!khoaMoHinh) {
        return loi("CHUA_CO_MO_HINH", "MIMI chưa bật đọc ảnh chứng từ. Bạn vẫn nhập tay được ở trang Chứng từ chi phí.", 503);
      }
      const k = kiemAnh(body.anh);
      if (!k.ok) return loi("ANH", k.cau, 400);
      let ketQua;
      try {
        ketQua = await docAnhChungTu({ khoa: khoaMoHinh, anh: body.anh as string, homNay: moc.homNay });
      } catch (e) {
        if (e instanceof LoiMoHinh) return loi("DOC_ANH", "Chưa đọc được ảnh này. Chụp lại rõ hơn, đủ sáng, thấy cả tổng tiền.", 502);
        throw e;
      }

      // Gợi ý khoản chi đi kèm: đúng một khoản khớp số tiền trong ±7 ngày thì mới gợi ý.
      let goiY: Row | null = null;
      if (ketQua.tong_tien) {
        const moc90 = congNgay(moc.homNay, -90);
        const gd = await docGiaoDich(db, company.id, ketQua.ngay ? [congNgay(ketQua.ngay, -7), moc90].sort()[1] : moc90);
        const khop = gd.filter((t) =>
          chieuTien(t) === "ra" &&
          Math.abs(doLonTien(t) - (ketQua.tong_tien as number)) <= LECH_TIEN &&
          (!ketQua.ngay || Math.abs((Date.parse(t.transaction_date) - Date.parse(ketQua.ngay)) / 86_400_000) <= 7));
        if (khop.length === 1) {
          const t = khop[0];
          goiY = { id: t.id, ngay: t.transaction_date, nguoi_nhan: t.counter_account_name || t.merchant_name || null, so_tien: doLonTien(t) };
        }
      }
      return json({ ket_qua: ketQua, giao_dich_goi_y: goiY });
    }

    case "luu_chung_tu": {
      // Kiểm lại bằng đúng bộ kiểm dùng cho kết quả mô hình: người dùng có thể đã sửa tay.
      const r = docKetQuaQuet(body, moc.homNay);
      if (!r.tong_tien) return loi("TONG_TIEN", "Cần tổng tiền lớn hơn 0.", 400);
      if (body.ngay && !r.ngay) return loi("NGAY", "Ngày chứng từ không hợp lệ hoặc nằm ở tương lai.", 400);
      if (body.ma_so_thue_ben_ban && !r.ma_so_thue_ben_ban) return loi("MST", "Mã số thuế gồm 10 chữ số, hoặc 10 chữ số kèm -XXX.", 400);

      let giaoDichId: string | null = null;
      if (typeof body.giao_dich_id === "string" && body.giao_dich_id) {
        const t = kiem(
          // Chỉ gắn chứng từ vào giao dịch thật: dòng thử của sandbox không cần giấy tờ.
          await db.from("transactions").select("id").eq("id", body.giao_dich_id).eq("company_id", company.id).eq("is_synthetic", false).maybeSingle(),
          "giao dịch",
        );
        if (!t) return loi("GIAO_DICH", "Không có khoản chi này trong công ty.", 404);
        giaoDichId = body.giao_dich_id;
      }
      const { data, error } = await db.from("chung_tu_quet").insert({
        company_id: company.id,
        loai: r.loai,
        so_hoa_don: r.so_hoa_don,
        ky_hieu: r.ky_hieu,
        ngay: r.ngay,
        ben_ban: r.ben_ban,
        ma_so_thue_ben_ban: r.ma_so_thue_ben_ban,
        tien_truoc_thue: r.tien_truoc_thue,
        tien_thue: r.tien_thue,
        tong_tien: r.tong_tien,
        giao_dich_id: giaoDichId,
        user_id: userId,
      }).select("id").single();
      if (error) throw error;

      // Ảnh gốc là tuỳ chọn. Hỏng ảnh không làm mất các trường người dùng vừa kiểm.
      let anhPath: string | null = null;
      let canhBao: string | null = null;
      if (typeof body.anh === "string" && body.anh) {
        const k = kiemAnh(body.anh);
        // Chữ ký nhị phân đã kiểm trong `kiemAnh`; đường dẫn chỉ ghép từ id công ty và id dòng (uuid).
        const anh = k.ok ? giaiMaAnh(body.anh as string) : null;
        if (!k.ok || !anh) {
          canhBao = `Đã lưu chứng từ nhưng không lưu ảnh: ${k.ok ? "ảnh không đọc được." : k.cau}`;
        } else {
          const duongDan = `${company.id}/${data.id}.${anh.duoi}`;
          const { error: loiAnh } = await db.storage.from("chung-tu").upload(duongDan, anh.bytes, { contentType: anh.mime, upsert: true });
          if (loiAnh) {
            console.error("tro-ly luu anh:", loiAnh.message);
            canhBao = "Đã lưu chứng từ nhưng chưa lưu được ảnh. Chụp lại sau nếu cần ảnh.";
          } else {
            // Mã băm ảnh vào nội dung chuẩn hoá → sổ cái ghi cả ảnh: đổi ảnh gốc là lộ.
            const bamAnh = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", anh.bytes)), (x) => x.toString(16).padStart(2, "0")).join("");
            const { error: loiCapNhat } = await db.from("chung_tu_quet").update({ anh_path: duongDan, anh_sha256: bamAnh }).eq("id", data.id);
            if (loiCapNhat) throw loiCapNhat;
            anhPath = duongDan;
          }
        }
      }
      return json({ id: data.id, anh_path: anhPath, canh_bao: canhBao });
    }

    case "trang_thai": {
      // Nhẹ: cho các trang chỉ cần biết có đọc được ảnh chứng từ không.
      return json({ cong_ty: company.name, co_mo_hinh: !!khoaMoHinh });
    }

    case "xoa_chung_tu": {
      const { data: ct, error } = await db.from("chung_tu_quet").select("id, anh_path")
        .eq("id", String(body.id ?? "")).eq("company_id", company.id).maybeSingle();
      if (error) throw error;
      if (!ct) return loi("KHONG_THAY", "Không có chứng từ này.", 404);
      if (ct.anh_path) {
        const { error: loiAnh } = await db.storage.from("chung-tu").remove([ct.anh_path]);
        if (loiAnh) console.error("tro-ly xoa anh:", loiAnh.message);
      }
      const { error: loiXoa } = await db.from("chung_tu_quet").delete().eq("id", ct.id).eq("company_id", company.id);
      if (loiXoa) throw loiXoa;
      return json({ ok: true });
    }

    default:
      return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  // Ảnh tối đa 5 MB (~6,7 MB base64) cộng vài trường: thân lớn hơn là bất thường.
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
      // Chặn gọi dồn (dò dữ liệu, đốt tiền mô hình). Đếm ở CSDL vì edge function không giữ trạng thái.
      const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
        p_user: user.id, p_hanh_dong: hanhDong, p_cua_so_giay: gioiHan.cuaSoGiay, p_toi_da: gioiHan.toiDa,
      });
      if (loiDem) console.error("tro-ly gioi han:", loiDem.message);
      else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);
    }

    return await xuLy(db, user.id, company, hanhDong, body);
  } catch (e) {
    // Không in thân yêu cầu: có thể chứa ảnh chứng từ hoặc câu hỏi về tiền của khách.
    console.error("tro-ly:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "MIMI gặp lỗi khi đọc dữ liệu. Thử lại sau ít phút.", 500);
  }
});
