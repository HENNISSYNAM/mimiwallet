/**
 * Phía agent của lớp kiểm soát chi — dùng chung cho hai cửa vào.
 *
 *   `tac-tu` — API HTTP thường, cho agent tự viết lệnh gọi.
 *   `mcp`    — Model Context Protocol, cho Claude, Cursor, ChatGPT… tự thấy công
 *              cụ và tự gọi.
 *
 * Hai cửa, MỘT bộ xử lý. Nếu mỗi cửa tự chép cách xin chi, sẽ có ngày một cửa
 * kiểm hạn mức còn cửa kia quên — và agent nào khôn sẽ đi cửa quên.
 *
 * Trả `{ status, body }` thay vì `Response` để cửa MCP bọc lại theo giao thức
 * của nó.
 *
 * MIMI KHÔNG CHUYỂN TIỀN. "Đã duyệt" trả về một lệnh trả VietQR; tiền chỉ đi khi
 * người có quyền trả nó. Xem `chinh-sach.ts`.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sinhMaThamChieu } from "../bank/ma-tham-chieu.ts";
import { DANH_SACH_NGAN_HANG } from "../bank/ngan-hang.ts";
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
} from "./chinh-sach.ts";
import { bamKhoa, laKhoaTacTu } from "./khoa.ts";

// deno-lint-ignore no-explicit-any
export type Db = SupabaseClient<any, any, any, any, any>;
// deno-lint-ignore no-explicit-any
export type Row = Record<string, any>;

export interface KetQuaGoi {
  status: number;
  body: Row;
}

export const loiGoi = (ma: string, cau: string, status: number): KetQuaGoi => ({
  status,
  body: { error: cau, ma },
});

/**
 * Lệnh trả còn hiệu lực 72 giờ. Một lệnh duyệt tuần trước mà hôm nay mới trả là
 * trả theo thông tin có thể đã cũ. Sao kê vẫn được đối soát sau hạn — tiền đã đi
 * thì ghi nhận sự thật — nhưng màn hình báo lệnh đã quá hạn.
 */
export const HAN_LENH_TRA_MS = 72 * 3_600_000;

/** Khi chưa có dòng chính sách: chặt nhất. */
export const CHINH_SACH_MAC_DINH: ChinhSach = {
  hanMucMoiLan: 2_000_000,
  hanMucNgay: 5_000_000,
  hanMucThang: 50_000_000,
  nguongCanDuyet: 0,
  nhomChiDuocPhep: null,
  chiTraNguoiNhanDaDuyet: true,
  hetHan: null,
};

export const TRAN_SO_TIEN = 10_000_000_000_000;

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

export async function docChinhSach(db: Db, tacTuId: string): Promise<ChinhSach> {
  const { data, error } = await db.from("chinh_sach_chi").select("*").eq("tac_tu_id", tacTuId).maybeSingle();
  if (error) throw error;
  return chinhSachTuDong(data);
}

/** Tổng các yêu cầu đang giữ hạn mức trong ngày và tháng (giờ VN), trừ `truId`. */
export async function tongDaGiu(db: Db, tacTuId: string, truId: string | null, luc: Date) {
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

export async function ghiNhatKy(db: Db, dong: Row) {
  const { error } = await db.from("nhat_ky_tac_tu").insert(dong);
  if (error) console.error("nhật ký agent không ghi được:", error.message, dong.su_kien);
}

/** Hình dạng trả cho agent. Không có khoá, không có gì của agent khác. */
export function raApi(r: Row) {
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

/** Cửa vào duy nhất của phía agent. */
export async function goiTacTu(db: Db, khoa: string, hanhDong: string, body: Row): Promise<KetQuaGoi> {
  if (!laKhoaTacTu(khoa)) return loiGoi("KHOA_SAI", "Khoá agent không đúng khuôn.", 401);

  const { data: tt, error } = await db
    .from("tac_tu")
    .select("id, company_id, ten, trang_thai")
    .eq("khoa_bam", await bamKhoa(khoa))
    .maybeSingle();
  if (error) throw error;
  if (!tt) return loiGoi("KHOA_SAI", "Khoá agent không hợp lệ.", 401);
  if (tt.trang_thai === "thu_hoi") return loiGoi("TAC_TU_DA_THU_HOI", "Khoá này đã bị thu hồi.", 403);

  await db.from("tac_tu").update({ dung_lan_cuoi: new Date().toISOString() }).eq("id", tt.id);

  switch (hanhDong) {
    case "xem_chinh_sach": {
      const bayGio = new Date();
      const [cs, giu] = await Promise.all([docChinhSach(db, tt.id), tongDaGiu(db, tt.id, null, bayGio)]);
      return {
        status: 200,
        body: {
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
          // Đổi sang snake_case như mọi trường khác của API. Trả thẳng kết quả
          // của `hanMucConLai` từng làm lộ `moiLan` giữa một object toàn `moi_lan`.
          han_muc_con_lai: (({ moiLan, ngay, thang }) => ({ moi_lan: moiLan, ngay, thang }))(
            hanMucConLai(cs, giu.ngay, giu.thang),
          ),
          nhom_chi: NHOM_CHI,
        },
      };
    }

    case "xin_chi":
      return await xinChi(db, tt, body);

    case "xem_yeu_cau": {
      let q = db.from("yeu_cau_chi").select("*").eq("tac_tu_id", tt.id);
      if (body.id) q = q.eq("id", String(body.id));
      else if (body.ma_yeu_cau) q = q.eq("ma_yeu_cau", String(body.ma_yeu_cau));
      else return loiGoi("THIEU_ID", "Gửi id hoặc ma_yeu_cau.", 400);
      const { data, error: e } = await q.maybeSingle();
      if (e) throw e;
      if (!data) return loiGoi("KHONG_THAY", "Không có yêu cầu này.", 404);
      return { status: 200, body: { yeu_cau: raApi(data) } };
    }

    default:
      return loiGoi("HANH_DONG", "Agent dùng được: xem_chinh_sach, xin_chi, xem_yeu_cau.", 400);
  }
}

async function xinChi(db: Db, tt: Row, body: Row): Promise<KetQuaGoi> {
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
    if (cu) return { status: 200, body: { yeu_cau: raApi(cu), trung_lap: true } };
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
    return { status: 422, body: { ket_qua: "tu_choi", ly_do: q.lyDo } };
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
      if (cu) return { status: 200, body: { yeu_cau: raApi(cu), trung_lap: true } };
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

    return { status: trangThai === "tu_choi" ? 422 : 200, body: { yeu_cau: raApi(xong) } };
  } catch (e) {
    const lyDo = [{ ma: "LOI_HE_THONG", cau: "MIMI gặp lỗi khi xét yêu cầu. Chưa có khoản nào được duyệt; gửi lại sau." }];
    await db.from("yeu_cau_chi")
      .update({ trang_thai: "tu_choi", ly_do: lyDo, updated_at: new Date().toISOString() })
      .eq("id", dong.id).eq("trang_thai", "dang_xet");
    throw e;
  }
}
