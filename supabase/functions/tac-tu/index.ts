/**
 * Cổng của lớp kiểm soát chi cho agent AI.
 *
 * HAI LOẠI NGƯỜI GỌI, HAI BỘ QUYỀN KHÔNG CHỒNG NHAU.
 *
 *   Agent — gửi khoá ở header `x-mimi-agent-key`. Chỉ được: xem chính sách và
 *           hạn mức còn lại, xin chi, xem yêu cầu của chính nó. Không duyệt được,
 *           không sửa chính sách được, không thấy agent khác.
 *   Chủ doanh nghiệp — JWT đăng nhập. Tạo agent, đặt chính sách, quản lý người
 *           nhận, duyệt/từ chối, tạm dừng/thu hồi.
 *
 * Một agent bị chiếm khoá thì kẻ chiếm cũng chỉ xin được những khoản trong trần,
 * tới người nhận đã duyệt, và vẫn cần một người trả bằng ứng dụng ngân hàng.
 *
 * MIMI KHÔNG CHUYỂN TIỀN. "Đã duyệt" trả về một lệnh trả VietQR. Tiền chỉ đi khi
 * người có quyền trả nó; `bank-webhook` đọc sao kê và chuyển yêu cầu sang
 * "đã chi". Giữ hay chuyển tiền hộ khách cần giấy phép trung gian thanh toán
 * theo Nghị định 52/2024/NĐ-CP.
 *
 * GHI TRƯỚC, XÉT SAU. Yêu cầu được ghi ở `dang_xet` rồi mới đọc tổng hạn mức đã
 * giữ — xem `TRANG_THAI_GIU_HAN_MUC` trong `chinh-sach.ts` về vì sao cách này
 * không để hai yêu cầu đồng thời cùng lọt trần.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import { sinhMaThamChieu } from "../_shared/bank/ma-tham-chieu.ts";
import { DANH_SACH_NGAN_HANG } from "../_shared/bank/ngan-hang.ts";
import {
  dauNgayVN,
  dauThangVN,
  hanMucConLai,
  NHOM_CHI,
  TRANG_THAI_GIU_HAN_MUC,
  xetYeuCau,
  type ChinhSach,
  type LyDo,
  type TrangThaiTacTu,
} from "../_shared/tac-tu/chinh-sach.ts";
import { bamKhoa, HEADER_KHOA, hienKhoa, laKhoaTacTu, sinhKhoa } from "../_shared/tac-tu/khoa.ts";

// deno-lint-ignore no-explicit-any
type Db = SupabaseClient<any, any, any, any, any>;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": `authorization, x-client-info, apikey, content-type, ${HEADER_KHOA}`,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

/**
 * Lệnh trả còn hiệu lực 72 giờ. Một lệnh duyệt tuần trước mà hôm nay mới trả là
 * trả theo thông tin có thể đã cũ. Sao kê vẫn được đối soát sau hạn — tiền đã đi
 * thì ghi nhận sự thật — nhưng màn hình báo lệnh đã quá hạn.
 */
const HAN_LENH_TRA_MS = 72 * 3_600_000;

/** Khi chưa có dòng chính sách: chặt nhất. */
const CHINH_SACH_MAC_DINH: ChinhSach = {
  hanMucMoiLan: 2_000_000,
  hanMucNgay: 5_000_000,
  hanMucThang: 50_000_000,
  nguongCanDuyet: 0,
  nhomChiDuocPhep: null,
  chiTraNguoiNhanDaDuyet: true,
  hetHan: null,
};

const TRAN_SO_TIEN = 10_000_000_000_000;

function chinhSachTuDong(r: Row | null): ChinhSach {
  if (!r) return CHINH_SACH_MAC_DINH;
  return {
    hanMucMoiLan: Number(r.han_muc_moi_lan),
    hanMucNgay: Number(r.han_muc_ngay),
    hanMucThang: Number(r.han_muc_thang),
    nguongCanDuyet: Number(r.nguong_can_duyet),
    nhomChiDuocPhep: r.nhom_chi_duoc_phep ?? null,
    chiTraNguoiNhanDaDuyet: Boolean(r.chi_tra_nguoi_nhan_da_duyet),
    hetHan: r.het_han ?? null,
  };
}

async function docChinhSach(db: Db, tacTuId: string): Promise<ChinhSach> {
  const { data, error } = await db.from("chinh_sach_chi").select("*").eq("tac_tu_id", tacTuId).maybeSingle();
  if (error) throw error;
  return chinhSachTuDong(data);
}

/** Tổng các yêu cầu đang giữ hạn mức trong ngày và tháng (giờ VN), trừ `truId`. */
async function tongDaGiu(db: Db, tacTuId: string, truId: string | null, luc: Date) {
  const { data, error } = await db
    .from("yeu_cau_chi")
    .select("id, so_tien, created_at")
    .eq("tac_tu_id", tacTuId)
    .in("trang_thai", [...TRANG_THAI_GIU_HAN_MUC])
    .gte("created_at", dauThangVN(luc).toISOString());
  if (error) throw error;

  const dauNgay = dauNgayVN(luc).getTime();
  let ngay = 0;
  let thang = 0;
  for (const r of data ?? []) {
    if (r.id === truId) continue;
    const t = Number(r.so_tien);
    thang += t;
    if (new Date(r.created_at).getTime() >= dauNgay) ngay += t;
  }
  return { ngay, thang };
}

async function ghiNhatKy(db: Db, dong: Row) {
  const { error } = await db.from("nhat_ky_tac_tu").insert(dong);
  if (error) console.error("nhật ký agent không ghi được:", error.message, dong.su_kien);
}

/** Hình dạng trả cho agent. Không có khoá, không có gì của agent khác. */
function raApi(r: Row) {
  return {
    id: r.id,
    ma_yeu_cau: r.ma_yeu_cau,
    trang_thai: r.trang_thai,
    so_tien: Number(r.so_tien),
    nhom_chi: r.nhom_chi,
    muc_dich: r.muc_dich,
    ly_do: r.ly_do,
    ma_tham_chieu: r.ma_tham_chieu,
    tao_luc: r.created_at,
    lenh_tra:
      r.trang_thai === "da_duyet"
        ? {
            ngan_hang_bin: r.ngan_hang_bin,
            so_tai_khoan: r.so_tai_khoan,
            ten_nguoi_nhan: r.ten_nguoi_nhan,
            so_tien: Number(r.so_tien),
            noi_dung_chuyen_khoan: r.ma_tham_chieu,
            het_han_luc: r.het_han_luc,
            ghi_chu:
              "MIMI không chuyển tiền. Người có quyền trả khoản này bằng ứng dụng ngân hàng, giữ nguyên nội dung chuyển khoản để sao kê tự xác nhận.",
          }
        : null,
    da_chi:
      r.trang_thai === "da_chi"
        ? { giao_dich_id: r.giao_dich_id, so_tien: Number(r.so_tien_thuc_chi), luc: r.da_chi_luc }
        : null,
  };
}

const laSoNguyenKhongAm = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= TRAN_SO_TIEN;

// ───────────────────────────── Agent ─────────────────────────────

async function xuLyTacTu(db: Db, khoa: string, hanhDong: string, body: Row): Promise<Response> {
  if (!laKhoaTacTu(khoa)) return loi("KHOA_SAI", "Khoá agent không đúng khuôn.", 401);

  const { data: tt, error } = await db
    .from("tac_tu")
    .select("id, company_id, ten, trang_thai")
    .eq("khoa_bam", await bamKhoa(khoa))
    .maybeSingle();
  if (error) throw error;
  if (!tt) return loi("KHOA_SAI", "Khoá agent không hợp lệ.", 401);
  if (tt.trang_thai === "thu_hoi") return loi("TAC_TU_DA_THU_HOI", "Khoá này đã bị thu hồi.", 403);

  await db.from("tac_tu").update({ dung_lan_cuoi: new Date().toISOString() }).eq("id", tt.id);

  switch (hanhDong) {
    case "xem_chinh_sach": {
      const bayGio = new Date();
      const [cs, giu] = await Promise.all([docChinhSach(db, tt.id), tongDaGiu(db, tt.id, null, bayGio)]);
      return json({
        tac_tu: { id: tt.id, ten: tt.ten, trang_thai: tt.trang_thai },
        chinh_sach: {
          han_muc_moi_lan: cs.hanMucMoiLan,
          han_muc_ngay: cs.hanMucNgay,
          han_muc_thang: cs.hanMucThang,
          nguong_can_duyet: cs.nguongCanDuyet,
          nhom_chi_duoc_phep: cs.nhomChiDuocPhep,
          chi_tra_nguoi_nhan_da_duyet: cs.chiTraNguoiNhanDaDuyet,
          het_han: cs.hetHan,
        },
        han_muc_con_lai: hanMucConLai(cs, giu.ngay, giu.thang),
        nhom_chi: NHOM_CHI,
      });
    }

    case "xin_chi":
      return await xinChi(db, tt, body);

    case "xem_yeu_cau": {
      let q = db.from("yeu_cau_chi").select("*").eq("tac_tu_id", tt.id);
      if (body.id) q = q.eq("id", String(body.id));
      else if (body.ma_yeu_cau) q = q.eq("ma_yeu_cau", String(body.ma_yeu_cau));
      else return loi("THIEU_ID", "Gửi id hoặc ma_yeu_cau.", 400);
      const { data, error: e } = await q.maybeSingle();
      if (e) throw e;
      if (!data) return loi("KHONG_THAY", "Không có yêu cầu này.", 404);
      return json({ yeu_cau: raApi(data) });
    }

    default:
      return loi("HANH_DONG", "Agent dùng được: xem_chinh_sach, xin_chi, xem_yeu_cau.", 400);
  }
}

async function xinChi(db: Db, tt: Row, body: Row): Promise<Response> {
  const soTien = Number(body.so_tien);
  const nganHangBin = String(body.ngan_hang_bin ?? "").trim();
  const soTaiKhoan = String(body.so_tai_khoan ?? "").replace(/\s/g, "");
  const nhomChi = String(body.nhom_chi ?? "");
  const mucDich = String(body.muc_dich ?? "").slice(0, 300);
  const maYeuCau = body.ma_yeu_cau ? String(body.ma_yeu_cau).slice(0, 100) : null;
  const soHoaDon = body.so_hoa_don ? String(body.so_hoa_don).slice(0, 60) : null;
  const tenGui = body.ten_nguoi_nhan ? String(body.ten_nguoi_nhan).slice(0, 120) : null;
  const nganHang = DANH_SACH_NGAN_HANG.find((n) => n.bin === nganHangBin);
  const yc = { soTien, nganHangBin, soTaiKhoan, nhomChi, mucDich };

  // Gọi lại cùng `ma_yeu_cau` (mất mạng, agent thử lại) thì trả đúng yêu cầu cũ.
  if (maYeuCau) {
    const { data: cu, error } = await db
      .from("yeu_cau_chi").select("*").eq("tac_tu_id", tt.id).eq("ma_yeu_cau", maYeuCau).maybeSingle();
    if (error) throw error;
    if (cu) return json({ yeu_cau: raApi(cu), trung_lap: true });
  }

  // Số tiền sai khuôn thì không ghi được vào bảng (CHECK so_tien > 0): xét luôn,
  // ghi nhật ký, trả lời — không có dòng yêu cầu nào.
  if (!Number.isInteger(soTien) || soTien <= 0 || soTien > TRAN_SO_TIEN) {
    const q = xetYeuCau(yc, CHINH_SACH_MAC_DINH, {
      trangThaiTacTu: tt.trang_thai as TrangThaiTacTu,
      daGiuNgay: 0,
      daGiuThang: 0,
      nguoiNhanDaDuyet: [],
      nganHangHopLe: Boolean(nganHang),
      luc: new Date(),
    });
    await ghiNhatKy(db, {
      company_id: tt.company_id, tac_tu_id: tt.id, su_kien: "xin_chi_sai_khuon", nguoi: "tac_tu",
      chi_tiet: { so_tien: body.so_tien ?? null, ly_do: q.lyDo.map((l) => l.ma) },
    });
    return json({ ket_qua: "tu_choi", ly_do: q.lyDo }, 422);
  }

  // 1. Ghi trước để giữ chỗ hạn mức.
  let dong: Row | null = null;
  for (let lan = 0; lan < 3 && !dong; lan++) {
    const { data, error } = await db
      .from("yeu_cau_chi")
      .insert({
        company_id: tt.company_id,
        tac_tu_id: tt.id,
        ma_yeu_cau: maYeuCau,
        so_tien: soTien,
        ngan_hang_bin: nganHangBin,
        so_tai_khoan: soTaiKhoan,
        ten_nguoi_nhan: tenGui,
        muc_dich: mucDich || "(trống)",
        nhom_chi: nhomChi,
        so_hoa_don: soHoaDon,
        trang_thai: "dang_xet",
        ma_tham_chieu: sinhMaThamChieu(),
      })
      .select("*")
      .single();

    if (!error) {
      dong = data;
      break;
    }
    if (error.code === "23505" && String(error.message).includes("ma_yeu_cau") && maYeuCau) {
      // Hai lần gọi cùng khoá chống trùng chạy đè nhau: lần kia đã ghi.
      const { data: cu } = await db
        .from("yeu_cau_chi").select("*").eq("tac_tu_id", tt.id).eq("ma_yeu_cau", maYeuCau).maybeSingle();
      if (cu) return json({ yeu_cau: raApi(cu), trung_lap: true });
    }
    if (error.code !== "23505") throw error;
    // Trùng mã tham chiếu (rất hiếm): sinh mã khác, thử lại.
  }
  if (!dong) throw new Error("Không sinh được mã tham chiếu không trùng.");

  // 2. Xét. Hỏng giữa chừng thì nhả chỗ hạn mức thay vì để dòng kẹt ở `dang_xet`.
  try {
    const luc = new Date();
    const [cs, giu, dsNhan] = await Promise.all([
      docChinhSach(db, tt.id),
      tongDaGiu(db, tt.id, dong.id, luc),
      db.from("nguoi_nhan_duoc_phep").select("ngan_hang_bin, so_tai_khoan, ten_chu_tai_khoan").eq("company_id", tt.company_id),
    ]);
    if (dsNhan.error) throw dsNhan.error;

    const q = xetYeuCau(yc, cs, {
      trangThaiTacTu: tt.trang_thai as TrangThaiTacTu,
      daGiuNgay: giu.ngay,
      daGiuThang: giu.thang,
      nguoiNhanDaDuyet: (dsNhan.data ?? []).map((n) => ({ nganHangBin: n.ngan_hang_bin, soTaiKhoan: n.so_tai_khoan })),
      nganHangHopLe: Boolean(nganHang),
      luc,
    });

    const daBiet = (dsNhan.data ?? []).find((n) => n.ngan_hang_bin === nganHangBin && n.so_tai_khoan === soTaiKhoan);
    const trangThai = q.ketQua === "tu_choi" ? "tu_choi" : q.ketQua === "cho_duyet" ? "cho_duyet" : "da_duyet";
    const bayGio = new Date();

    const { data: xong, error } = await db
      .from("yeu_cau_chi")
      .update({
        trang_thai: trangThai,
        ly_do: q.lyDo,
        cach_quyet: q.ketQua === "tu_dong_duyet" ? "tu_dong" : null,
        quyet_luc: q.ketQua === "cho_duyet" ? null : bayGio.toISOString(),
        het_han_luc: trangThai === "da_duyet" ? new Date(bayGio.getTime() + HAN_LENH_TRA_MS).toISOString() : null,
        // Tên trong danh sách đã duyệt thắng tên agent tự khai.
        ten_nguoi_nhan: daBiet?.ten_chu_tai_khoan ?? tenGui,
        updated_at: bayGio.toISOString(),
      })
      .eq("id", dong.id)
      .eq("trang_thai", "dang_xet")
      .select("*")
      .single();
    if (error) throw error;

    await ghiNhatKy(db, {
      company_id: tt.company_id, tac_tu_id: tt.id, yeu_cau_id: dong.id, su_kien: "xin_chi", nguoi: "tac_tu",
      chi_tiet: { ket_qua: q.ketQua, so_tien: soTien, nhom_chi: nhomChi, ly_do: q.lyDo.map((l: LyDo) => l.ma) },
    });

    return json({ yeu_cau: raApi(xong) }, trangThai === "tu_choi" ? 422 : 200);
  } catch (e) {
    const lyDo = [{ ma: "LOI_HE_THONG", cau: "MIMI gặp lỗi khi xét yêu cầu. Chưa có khoản nào được duyệt; gửi lại sau." }];
    await db.from("yeu_cau_chi")
      .update({ trang_thai: "tu_choi", ly_do: lyDo, updated_at: new Date().toISOString() })
      .eq("id", dong.id).eq("trang_thai", "dang_xet");
    throw e;
  }
}

// ──────────────────────── Chủ doanh nghiệp ────────────────────────

async function layTacTu(db: Db, companyId: string, id: unknown) {
  if (typeof id !== "string") return null;
  const { data, error } = await db.from("tac_tu").select("*").eq("id", id).eq("company_id", companyId).maybeSingle();
  if (error) throw error;
  return data;
}

async function xuLyChu(db: Db, userId: string, companyId: string, hanhDong: string, body: Row): Promise<Response> {
  const bayGio = () => new Date().toISOString();
  const nk = (dong: Row) => ghiNhatKy(db, { company_id: companyId, nguoi: "nguoi_dung", user_id: userId, ...dong });

  switch (hanhDong) {
    case "tao_tac_tu": {
      const ten = String(body.ten ?? "").trim();
      if (ten.length < 2 || ten.length > 80) return loi("TEN", "Tên agent dài 2 đến 80 ký tự.", 400);
      const khoa = sinhKhoa();
      const { data: tt, error } = await db
        .from("tac_tu")
        .insert({
          company_id: companyId,
          ten,
          mo_ta: body.mo_ta ? String(body.mo_ta).slice(0, 300) : null,
          khoa_bam: await bamKhoa(khoa),
          khoa_hien: hienKhoa(khoa),
        })
        .select("id, ten, trang_thai, khoa_hien, created_at")
        .single();
      if (error) throw error;
      const { error: e2 } = await db.from("chinh_sach_chi").insert({ tac_tu_id: tt.id, company_id: companyId });
      if (e2) throw e2;
      await nk({ tac_tu_id: tt.id, su_kien: "tao_tac_tu", chi_tiet: { ten } });
      // Khoá chỉ đi ra đúng lần này.
      return json({ tac_tu: tt, khoa });
    }

    case "xoay_khoa": {
      const tt = await layTacTu(db, companyId, body.tac_tu_id);
      if (!tt) return loi("KHONG_THAY", "Không có agent này.", 404);
      if (tt.trang_thai === "thu_hoi") return loi("DA_THU_HOI", "Agent đã thu hồi thì không cấp khoá mới.", 409);
      const khoa = sinhKhoa();
      const { error } = await db.from("tac_tu")
        .update({ khoa_bam: await bamKhoa(khoa), khoa_hien: hienKhoa(khoa), updated_at: bayGio() })
        .eq("id", tt.id);
      if (error) throw error;
      await nk({ tac_tu_id: tt.id, su_kien: "xoay_khoa", chi_tiet: { khoa_cu: tt.khoa_hien } });
      return json({ khoa });
    }

    case "doi_trang_thai": {
      const tt = await layTacTu(db, companyId, body.tac_tu_id);
      if (!tt) return loi("KHONG_THAY", "Không có agent này.", 404);
      const moi = String(body.trang_thai ?? "");
      if (!["hoat_dong", "tam_dung", "thu_hoi"].includes(moi)) return loi("TRANG_THAI", "Trạng thái không hợp lệ.", 400);
      if (tt.trang_thai === "thu_hoi") return loi("DA_THU_HOI", "Thu hồi là vĩnh viễn. Tạo agent mới nếu cần.", 409);

      const { error } = await db.from("tac_tu").update({ trang_thai: moi, updated_at: bayGio() }).eq("id", tt.id);
      if (error) throw error;

      let daHuy = 0;
      if (moi === "thu_hoi") {
        // Khoá có thể đã lộ: mọi khoản của nó chưa trả đều huỷ, kể cả khoản đã duyệt.
        const { data } = await db.from("yeu_cau_chi")
          .update({ trang_thai: "huy", updated_at: bayGio() })
          .eq("tac_tu_id", tt.id)
          .in("trang_thai", ["dang_xet", "cho_duyet", "da_duyet"])
          .select("id");
        daHuy = data?.length ?? 0;
      }
      await nk({ tac_tu_id: tt.id, su_kien: "doi_trang_thai", chi_tiet: { tu: tt.trang_thai, sang: moi, huy_yeu_cau: daHuy } });
      return json({ ok: true, huy_yeu_cau: daHuy });
    }

    case "luu_chinh_sach": {
      const tt = await layTacTu(db, companyId, body.tac_tu_id);
      if (!tt) return loi("KHONG_THAY", "Không có agent này.", 404);
      const { han_muc_moi_lan: moiLan, han_muc_ngay: ngay, han_muc_thang: thang, nguong_can_duyet: nguong } = body;
      if (![moiLan, ngay, thang, nguong].every(laSoNguyenKhongAm)) {
        return loi("SO_TIEN", "Hạn mức và ngưỡng là số nguyên đồng, không âm.", 400);
      }
      if (!(moiLan <= ngay && ngay <= thang)) {
        return loi("THU_TU", "Hạn mức mỗi lần ≤ hạn mức ngày ≤ hạn mức tháng.", 400);
      }
      const nhom = body.nhom_chi_duoc_phep;
      if (nhom !== null && (!Array.isArray(nhom) || nhom.some((x) => !(NHOM_CHI as readonly string[]).includes(x)))) {
        return loi("NHOM_CHI", "Nhóm chi không hợp lệ.", 400);
      }
      if (Array.isArray(nhom) && nhom.length === 0) {
        return loi("NHOM_CHI", "Chọn ít nhất một nhóm, hoặc cho phép mọi nhóm.", 400);
      }
      const hetHan = body.het_han ? new Date(String(body.het_han)) : null;
      if (hetHan && Number.isNaN(hetHan.getTime())) return loi("HET_HAN", "Ngày hết hạn không hợp lệ.", 400);

      const truoc = await docChinhSach(db, tt.id);
      const { error } = await db.from("chinh_sach_chi").upsert({
        tac_tu_id: tt.id,
        company_id: companyId,
        han_muc_moi_lan: moiLan,
        han_muc_ngay: ngay,
        han_muc_thang: thang,
        nguong_can_duyet: nguong,
        nhom_chi_duoc_phep: nhom,
        chi_tra_nguoi_nhan_da_duyet: Boolean(body.chi_tra_nguoi_nhan_da_duyet),
        het_han: hetHan?.toISOString() ?? null,
        updated_at: bayGio(),
      });
      if (error) throw error;
      await nk({ tac_tu_id: tt.id, su_kien: "luu_chinh_sach", chi_tiet: { truoc, sau: body } });
      return json({ ok: true });
    }

    case "them_nguoi_nhan": {
      const bin = String(body.ngan_hang_bin ?? "");
      const stk = String(body.so_tai_khoan ?? "").replace(/\s/g, "");
      const ten = String(body.ten_chu_tai_khoan ?? "").trim();
      if (!DANH_SACH_NGAN_HANG.some((n) => n.bin === bin)) return loi("NGAN_HANG", "Chọn ngân hàng trong danh sách.", 400);
      if (!/^\d{6,19}$/.test(stk)) return loi("SO_TAI_KHOAN", "Số tài khoản chỉ gồm chữ số, 6 đến 19 số.", 400);
      if (ten.length < 2) return loi("TEN", "Nhập tên chủ tài khoản.", 400);
      const { data, error } = await db.from("nguoi_nhan_duoc_phep")
        .insert({ company_id: companyId, ngan_hang_bin: bin, so_tai_khoan: stk, ten_chu_tai_khoan: ten, ghi_chu: body.ghi_chu ? String(body.ghi_chu).slice(0, 200) : null })
        .select("id").single();
      if (error?.code === "23505") return loi("DA_CO", "Người nhận này đã có trong danh sách.", 409);
      if (error) throw error;
      await nk({ su_kien: "them_nguoi_nhan", chi_tiet: { ngan_hang_bin: bin, so_tai_khoan: stk, ten } });
      return json({ id: data.id });
    }

    case "xoa_nguoi_nhan": {
      const { data, error } = await db.from("nguoi_nhan_duoc_phep")
        .delete().eq("id", String(body.id ?? "")).eq("company_id", companyId)
        .select("ngan_hang_bin, so_tai_khoan, ten_chu_tai_khoan").maybeSingle();
      if (error) throw error;
      if (!data) return loi("KHONG_THAY", "Không có người nhận này.", 404);
      await nk({ su_kien: "xoa_nguoi_nhan", chi_tiet: data });
      return json({ ok: true });
    }

    case "duyet": {
      const { data: y, error } = await db.from("yeu_cau_chi")
        .update({
          trang_thai: "da_duyet",
          cach_quyet: "nguoi_duyet",
          nguoi_quyet: userId,
          quyet_luc: bayGio(),
          het_han_luc: new Date(Date.now() + HAN_LENH_TRA_MS).toISOString(),
          updated_at: bayGio(),
        })
        .eq("id", String(body.yeu_cau_id ?? ""))
        .eq("company_id", companyId)
        .eq("trang_thai", "cho_duyet")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!y) return loi("KHONG_CON_CHO", "Yêu cầu không còn ở trạng thái chờ duyệt.", 409);

      if (body.them_nguoi_nhan === true) {
        await db.from("nguoi_nhan_duoc_phep").upsert(
          {
            company_id: companyId,
            ngan_hang_bin: y.ngan_hang_bin,
            so_tai_khoan: y.so_tai_khoan,
            ten_chu_tai_khoan: (y.ten_nguoi_nhan && String(y.ten_nguoi_nhan).length >= 2) ? y.ten_nguoi_nhan : "Chưa rõ tên",
          },
          { onConflict: "company_id,ngan_hang_bin,so_tai_khoan", ignoreDuplicates: true },
        );
      }
      await nk({ tac_tu_id: y.tac_tu_id, yeu_cau_id: y.id, su_kien: "duyet", chi_tiet: { so_tien: y.so_tien, them_nguoi_nhan: body.them_nguoi_nhan === true } });
      return json({ yeu_cau: raApi(y) });
    }

    case "tu_choi": {
      const { data: cu } = await db.from("yeu_cau_chi").select("ly_do")
        .eq("id", String(body.yeu_cau_id ?? "")).eq("company_id", companyId).maybeSingle();
      const ghiChu = body.ghi_chu ? String(body.ghi_chu).slice(0, 200) : "Chủ doanh nghiệp từ chối.";
      const { data: y, error } = await db.from("yeu_cau_chi")
        .update({
          trang_thai: "tu_choi",
          cach_quyet: "nguoi_duyet",
          nguoi_quyet: userId,
          quyet_luc: bayGio(),
          ly_do: [...((cu?.ly_do as unknown[]) ?? []), { ma: "NGUOI_DUYET_TU_CHOI", cau: ghiChu }],
          updated_at: bayGio(),
        })
        .eq("id", String(body.yeu_cau_id ?? ""))
        .eq("company_id", companyId)
        .eq("trang_thai", "cho_duyet")
        .select("id, tac_tu_id, so_tien")
        .maybeSingle();
      if (error) throw error;
      if (!y) return loi("KHONG_CON_CHO", "Yêu cầu không còn ở trạng thái chờ duyệt.", 409);
      await nk({ tac_tu_id: y.tac_tu_id, yeu_cau_id: y.id, su_kien: "tu_choi", chi_tiet: { so_tien: y.so_tien, ghi_chu: ghiChu } });
      return json({ ok: true });
    }

    case "huy": {
      const { data: y, error } = await db.from("yeu_cau_chi")
        .update({ trang_thai: "huy", updated_at: bayGio() })
        .eq("id", String(body.yeu_cau_id ?? ""))
        .eq("company_id", companyId)
        .in("trang_thai", ["cho_duyet", "da_duyet"])
        .select("id, tac_tu_id, so_tien")
        .maybeSingle();
      if (error) throw error;
      if (!y) return loi("KHONG_HUY_DUOC", "Chỉ huỷ được khoản đang chờ duyệt hoặc đã duyệt mà chưa chi.", 409);
      await nk({ tac_tu_id: y.tac_tu_id, yeu_cau_id: y.id, su_kien: "huy", chi_tiet: { so_tien: y.so_tien } });
      return json({ ok: true });
    }

    default:
      return loi("HANH_DONG", "Hành động không có.", 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);

  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    let body: Row;
    try {
      body = await req.json();
    } catch {
      return loi("JSON", "Body phải là JSON.", 400);
    }
    const hanhDong = String(body?.hanh_dong ?? "");

    const khoa = req.headers.get(HEADER_KHOA);
    if (khoa !== null) return await xuLyTacTu(db, khoa.trim(), hanhDong, body);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", `Thiếu JWT đăng nhập hoặc header ${HEADER_KHOA}.`, 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const company = await resolveCompany<{ id: string }>(db, user.id);
    if (!company) return loi("KHONG_CO_CONG_TY", "Chưa có công ty.", 404);

    return await xuLyChu(db, user.id, company.id, hanhDong, body);
  } catch (e) {
    console.error("tac-tu:", e);
    return loi("LOI_HE_THONG", e instanceof Error ? e.message : "Lỗi không rõ.", 500);
  }
});
