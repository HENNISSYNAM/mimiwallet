/**
 * Cổng của lớp kiểm soát chi cho agent AI — API HTTP.
 *
 * HAI LOẠI NGƯỜI GỌI, HAI BỘ QUYỀN KHÔNG CHỒNG NHAU.
 *
 *   Agent — gửi khoá ở header `x-mimi-agent-key`. Chỉ được: xem chính sách và
 *           hạn mức còn lại, xin chi, xem yêu cầu của chính nó. Phần này nằm ở
 *           `_shared/tac-tu/cong-tac-tu.ts`, dùng chung với cửa `mcp`.
 *   Chủ doanh nghiệp — JWT đăng nhập. Tạo agent, đặt chính sách, quản lý người
 *           nhận, duyệt/từ chối, tạm dừng/thu hồi. Phần này ở dưới.
 *
 * Một agent bị chiếm khoá thì kẻ chiếm cũng chỉ xin được những khoản trong trần,
 * tới người nhận đã duyệt, và vẫn cần một người trả bằng ứng dụng ngân hàng.
 *
 * MIMI KHÔNG CHUYỂN TIỀN. "Đã duyệt" trả về một lệnh trả VietQR. Tiền chỉ đi khi
 * người có quyền trả nó; `bank-webhook` đọc sao kê và chuyển yêu cầu sang
 * "đã chi". Giữ hay chuyển tiền hộ khách cần giấy phép trung gian thanh toán
 * theo Nghị định 52/2024/NĐ-CP.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import { DANH_SACH_NGAN_HANG } from "../_shared/bank/ngan-hang.ts";
import { NHOM_CHI } from "../_shared/tac-tu/chinh-sach.ts";
import { bamKhoa, HEADER_KHOA, hienKhoa, sinhKhoa } from "../_shared/tac-tu/khoa.ts";
import {
  docChinhSach,
  ghiNhatKy,
  goiTacTu,
  HAN_LENH_TRA_MS,
  raApi,
  TRAN_SO_TIEN,
  type Db,
  type Row,
} from "../_shared/tac-tu/cong-tac-tu.ts";

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

const laSoNguyenKhongAm = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= TRAN_SO_TIEN;

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
    if (khoa !== null) {
      const kq = await goiTacTu(db, khoa.trim(), hanhDong, body);
      return json(kq.body, kq.status);
    }

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
