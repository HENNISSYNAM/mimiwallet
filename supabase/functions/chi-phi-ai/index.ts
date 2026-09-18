/**
 * Chi phí AI — đọc chi phí và số token thật của OpenAI, Anthropic, OpenRouter, Gemini.
 *
 * HAI ĐƯỜNG VÀO (người dùng chọn 15/09/2026):
 *   - `nhap_file`: dòng chi phí người dùng đọc từ file CSV xuất của nhà cung cấp.
 *     Không lưu khoá nào. Là đường duy nhất cho Gemini (Google không có API chi phí).
 *     File không có số token.
 *   - `ket_noi` + `dong_bo`: khoá quản trị của Anthropic, OpenAI (Admin API key) hoặc
 *     OpenRouter (Management key), tự đồng bộ chi phí VÀ số token. Khoá có quyền quản trị
 *     cả tổ chức của khách, nên: gọi thử trước khi lưu (khoá sai thì không lưu gì), lưu mã
 *     hoá PQC, không bao giờ trả về trình duyệt, không ghi vào log, và `go_ket_noi` xoá bản
 *     mã hoá.
 *
 * `cap_nhat_bang_gia` tải bảng giá niêm yết của OpenRouter vào `bang_gia_model` (dùng chung)
 * để MIMI Assistant ước tính đổi model tiết kiệm bao nhiêu.
 *
 * Chỉ chủ doanh nghiệp (JWT). Mọi ghi bằng service role; bảng chỉ có policy đọc.
 * Tiền là USD — đơn vị nhà cung cấp tính. Không quy đổi, không ước tính tiền từ token.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kiemQuyen, LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { cauTuChoi, type HanhDong, type VaiTro } from "../_shared/quyen/vai-tro.ts";
import { decryptField, encryptField, type EncryptedBlob } from "../_shared/pqcCrypto.ts";
import {
  gopDong,
  hienKhoa,
  kiemDongNhap,
  laKhoaAdmin,
  LoiNhaCungCap,
  NHA_CUNG_CAP_KET_NOI,
  NHA_CUNG_CAP_NHAP,
  taiChiPhi,
  type DongChiPhi,
  type NhaCungCapApi,
} from "../_shared/chi-phi-ai/nguon.ts";
import { gopToken, taiHoatDongOpenRouter, taiToken, type DongTokenNgay } from "../_shared/chi-phi-ai/token.ts";
import { docBangGiaOpenRouter } from "../_shared/chi-phi-ai/bang-gia.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const loi = (ma: string, cau: string, status: number, them: Record<string, unknown> = {}) =>
  json({ error: cau, ma, ...them }, status);

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

type NhaCungCapKetNoi = NhaCungCapApi | "openrouter";

const NGAY_MS = 86_400_000;
/** Cost API của Anthropic trả tối đa 31 bucket ngày một trang; đồng bộ lại cả cửa sổ để bắt số được sửa muộn. */
const CUA_SO_DONG_BO_NGAY = 31;
/** Anthropic khuyên hỏi không quá mỗi phút một lần. */
const GIAN_CACH_DONG_BO_MS = 60_000;
/** Bảng giá niêm yết đổi chậm; lấy lại quá dày chỉ tốn lượt gọi. */
const GIAN_CACH_BANG_GIA_MS = 3_600_000;
const TOI_DA_DONG_NHAP = 20_000;
const LO_CHEN = 500;

const dauNgayMaiUTC = (luc: Date) => new Date(Date.UTC(luc.getUTCFullYear(), luc.getUTCMonth(), luc.getUTCDate() + 1));
const ngay = (d: Date) => d.toISOString().slice(0, 10);

async function chenTheoLo(db: Db, bang: string, dong: Row[]) {
  for (let i = 0; i < dong.length; i += LO_CHEN) {
    const { error } = await db.from(bang).insert(dong.slice(i, i + LO_CHEN));
    if (error) throw error;
  }
}

/** PostgREST trả tối đa 1.000 dòng mỗi lần: đọc theo trang, không cắt cụt tổng tiền. */
async function docTheoTrang(db: Db, bang: string, cot: string, companyId: string, tuNgay: string) {
  const ds: Row[] = [];
  for (let tu = 0; tu < 200_000; tu += 1000) {
    const { data, error } = await db
      .from(bang)
      .select(cot)
      .eq("company_id", companyId)
      .gte("ngay", tuNgay)
      .order("ngay", { ascending: true })
      .order("id", { ascending: true })
      .range(tu, tu + 999);
    if (error) throw error;
    ds.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }
  return ds;
}

/** Thay cả cửa sổ ngày của một nhà cung cấp: nhà cung cấp có thể sửa số của những ngày đã qua. */
async function thayCuaSo(db: Db, companyId: string, ncc: string, tu: Date, chiPhi: DongChiPhi[] | null, token: DongTokenNgay[] | null) {
  if (chiPhi) {
    const { error } = await db.from("chi_phi_ai").delete()
      .eq("company_id", companyId).eq("nha_cung_cap", ncc).eq("nguon", "api").gte("ngay", ngay(tu));
    if (error) throw error;
    await chenTheoLo(db, "chi_phi_ai", chiPhi.map((d) => ({ ...d, company_id: companyId, nha_cung_cap: ncc, nguon: "api", lo_nhap_id: null })));
  }
  if (token) {
    const { error } = await db.from("token_ai").delete()
      .eq("company_id", companyId).eq("nha_cung_cap", ncc).gte("ngay", ngay(tu));
    if (error) throw error;
    await chenTheoLo(db, "token_ai", token.map((t) => ({ ...t, company_id: companyId, nha_cung_cap: ncc })));
  }
}

/** Gọi thử khoá trước khi lưu. Ném `LoiNhaCungCap` nếu nhà cung cấp từ chối. */
async function goiThu(ncc: NhaCungCapKetNoi, khoa: string) {
  if (ncc === "openrouter") {
    await taiHoatDongOpenRouter(khoa);
    return;
  }
  const den = dauNgayMaiUTC(new Date());
  await taiChiPhi(ncc, khoa, new Date(den.getTime() - 2 * NGAY_MS), den);
}

async function dongBoMot(db: Db, kn: Row, privateKey: string, boQuaGianCach = false) {
  const ncc = kn.nha_cung_cap as NhaCungCapKetNoi;
  const bayGio = new Date();
  if (!boQuaGianCach && kn.dong_bo_luc && bayGio.getTime() - new Date(kn.dong_bo_luc).getTime() < GIAN_CACH_DONG_BO_MS) {
    return { nha_cung_cap: ncc, bo_qua: true, loi: "Vừa đồng bộ dưới một phút trước — nhà cung cấp giới hạn tần suất." };
  }

  let khoa: string;
  try {
    khoa = await decryptField(kn.khoa_enc as EncryptedBlob, privateKey);
  } catch {
    const cau = "Không giải mã được khoá đã lưu. Gỡ kết nối rồi kết nối lại.";
    await db.from("ket_noi_chi_phi_ai").update({ trang_thai: "loi", loi_cuoi: cau, updated_at: bayGio.toISOString() }).eq("id", kn.id);
    return { nha_cung_cap: ncc, loi: cau };
  }

  const den = dauNgayMaiUTC(bayGio);
  const tu = new Date(den.getTime() - CUA_SO_DONG_BO_NGAY * NGAY_MS);
  try {
    let chiPhi: DongChiPhi[];
    let token: DongTokenNgay[] | null = null;
    let loiToken: string | null = null;
    if (ncc === "openrouter") {
      // Một lần gọi cho cả tiền lẫn token (30 ngày UTC gần nhất đã xong).
      const hd = await taiHoatDongOpenRouter(khoa);
      chiPhi = gopDong(hd.chi_phi);
      token = gopToken(hd.token);
    } else {
      chiPhi = gopDong(await taiChiPhi(ncc, khoa, tu, den));
      try {
        token = gopToken(await taiToken(ncc, khoa, tu, den));
      } catch (e) {
        // Không có số token thì vẫn giữ số tiền: tiền là thứ người dùng cần trước.
        loiToken = e instanceof LoiNhaCungCap ? e.message : "Không đọc được số token.";
        if (!(e instanceof LoiNhaCungCap)) console.error(`chi-phi-ai token ${ncc}:`, e instanceof Error ? e.message : e);
      }
    }
    await thayCuaSo(db, kn.company_id, ncc, tu, chiPhi, token);
    const duLieuToi = chiPhi.reduce<string | null>((m, d) => (m === null || d.ngay > m ? d.ngay : m), null);
    await db.from("ket_noi_chi_phi_ai").update({
      trang_thai: "hoat_dong", loi_cuoi: loiToken, dong_bo_luc: bayGio.toISOString(),
      du_lieu_toi: duLieuToi ?? kn.du_lieu_toi ?? null, updated_at: bayGio.toISOString(),
    }).eq("id", kn.id);
    return { nha_cung_cap: ncc, so_dong: chiPhi.length, so_dong_token: token?.length ?? 0, ...(loiToken ? { loi_token: loiToken } : {}) };
  } catch (e) {
    const cau = e instanceof LoiNhaCungCap ? e.message : "Không đọc được chi phí từ nhà cung cấp.";
    if (!(e instanceof LoiNhaCungCap)) console.error(`chi-phi-ai dong_bo ${ncc}:`, e instanceof Error ? e.message : e);
    await db.from("ket_noi_chi_phi_ai").update({
      trang_thai: "loi", loi_cuoi: cau, dong_bo_luc: bayGio.toISOString(), updated_at: bayGio.toISOString(),
    }).eq("id", kn.id);
    return { nha_cung_cap: ncc, loi: cau };
  }
}

async function xuLy(db: Db, userId: string, companyId: string, hanhDong: string, body: Row): Promise<Response> {
  const publicKey = Deno.env.get("PQC_KYC_PUBLIC_KEY");
  const privateKey = Deno.env.get("PQC_KYC_PRIVATE_KEY");
  const canKhoa = () => {
    if (publicKey && privateKey) return null;
    // Không có cặp khoá thì cách duy nhất để chạy tiếp là lưu khoá dạng rõ — từ chối.
    console.error("chi-phi-ai: thiếu cặp khoá PQC — không xử lý khoá quản trị");
    return loi("CHUA_CAU_HINH", "Máy chủ chưa cấu hình lưu khoá an toàn. Dùng đường nhập file.", 503);
  };

  switch (hanhDong) {
    case "doc": {
      const bayGio = new Date();
      const tuNgay = ngay(new Date(Date.UTC(bayGio.getUTCFullYear(), bayGio.getUTCMonth() - 1, 1)));
      const [chiPhi, token, kn, lo, ns] = await Promise.all([
        docTheoTrang(db, "chi_phi_ai", "nha_cung_cap, ngay, hang_muc, du_an, so_tien_usd, nguon", companyId, tuNgay),
        docTheoTrang(db, "token_ai", "nha_cung_cap, ngay, model, token_vao, token_vao_cache, token_ra, so_lan_goi", companyId, tuNgay),
        db.from("ket_noi_chi_phi_ai")
          .select("id, nha_cung_cap, khoa_hien, trang_thai, dong_bo_luc, du_lieu_toi, loi_cuoi, created_at")
          .eq("company_id", companyId).neq("trang_thai", "da_go").order("created_at", { ascending: true }),
        db.from("lo_nhap_chi_phi_ai")
          .select("id, nha_cung_cap, ten_file, so_dong, tu_ngay, den_ngay, tong_usd, created_at")
          .eq("company_id", companyId).order("created_at", { ascending: false }).limit(50),
        db.from("ngan_sach_chi_phi_ai").select("han_muc_thang_usd, canh_bao_phan_tram").eq("company_id", companyId).maybeSingle(),
      ]);
      const loiDoc = [kn, lo, ns].find((r) => r.error)?.error;
      if (loiDoc) throw loiDoc;
      return json({
        tu_ngay: tuNgay,
        chi_phi: chiPhi.map((r) => ({ ...r, so_tien_usd: Number(r.so_tien_usd) })),
        token: token.map((t) => ({
          ...t, token_vao: Number(t.token_vao), token_vao_cache: Number(t.token_vao_cache), token_ra: Number(t.token_ra), so_lan_goi: Number(t.so_lan_goi),
        })),
        ket_noi: kn.data ?? [],
        lo_nhap: (lo.data ?? []).map((r: Row) => ({ ...r, tong_usd: Number(r.tong_usd) })),
        ngan_sach: ns.data
          ? { han_muc_thang_usd: Number(ns.data.han_muc_thang_usd), canh_bao_phan_tram: ns.data.canh_bao_phan_tram }
          : null,
      });
    }

    case "ket_noi": {
      const ncc = String(body.nha_cung_cap ?? "");
      if (!NHA_CUNG_CAP_KET_NOI.includes(ncc)) return loi("NHA_CUNG_CAP", "Chỉ kết nối tự động được cho Anthropic, OpenAI hoặc OpenRouter.", 400);
      const khoa = String(body.khoa ?? "").trim();
      if (!laKhoaAdmin(ncc, khoa)) return loi("KHOA_SAI_KHUON", "Khoá không đúng khuôn khoá quản trị của nhà cung cấp này.", 400);
      const thieu = canKhoa();
      if (thieu) return thieu;

      // Gọi thử TRƯỚC khi lưu: khoá thường, khoá hết hạn hay khoá nhầm nhà cung cấp
      // đều dừng ở đây mà không để lại gì trong CSDL.
      try {
        await goiThu(ncc as NhaCungCapKetNoi, khoa);
      } catch (e) {
        if (e instanceof LoiNhaCungCap) return loi("NHA_CUNG_CAP_TU_CHOI", e.message, e.khoaHong ? 400 : 502);
        throw e;
      }

      const enc = await encryptField(khoa, publicKey as string);
      const bayGio = new Date().toISOString();
      const { error: loiGo } = await db.from("ket_noi_chi_phi_ai")
        .update({ trang_thai: "da_go", khoa_enc: null, updated_at: bayGio })
        .eq("company_id", companyId).eq("nha_cung_cap", ncc).neq("trang_thai", "da_go");
      if (loiGo) throw loiGo;
      const { data: kn, error } = await db.from("ket_noi_chi_phi_ai")
        .insert({ company_id: companyId, nha_cung_cap: ncc, khoa_enc: enc, khoa_hien: hienKhoa(khoa), trang_thai: "hoat_dong" })
        .select("*").single();
      if (error) throw error;

      const kq = await dongBoMot(db, kn, privateKey as string, true);
      return json({ ket_noi: { id: kn.id, nha_cung_cap: ncc, khoa_hien: kn.khoa_hien }, dong_bo: kq });
    }

    case "dong_bo": {
      const thieu = canKhoa();
      if (thieu) return thieu;
      let q = db.from("ket_noi_chi_phi_ai").select("*").eq("company_id", companyId).neq("trang_thai", "da_go");
      if (typeof body.nha_cung_cap === "string") q = q.eq("nha_cung_cap", body.nha_cung_cap);
      const { data: ds, error } = await q;
      if (error) throw error;
      if (!ds?.length) return loi("CHUA_KET_NOI", "Chưa kết nối nhà cung cấp nào để đồng bộ.", 404);
      const ketQua = [];
      for (const kn of ds) ketQua.push(await dongBoMot(db, kn, privateKey as string));
      return json({ ket_qua: ketQua });
    }

    case "go_ket_noi": {
      const ncc = String(body.nha_cung_cap ?? "");
      if (!NHA_CUNG_CAP_KET_NOI.includes(ncc)) return loi("NHA_CUNG_CAP", "Nhà cung cấp không hợp lệ.", 400);
      const { data, error } = await db.from("ket_noi_chi_phi_ai")
        .update({ trang_thai: "da_go", khoa_enc: null, updated_at: new Date().toISOString() })
        .eq("company_id", companyId).eq("nha_cung_cap", ncc).neq("trang_thai", "da_go").select("id");
      if (error) throw error;
      if (!data?.length) return loi("KHONG_THAY", "Không có kết nối đang dùng.", 404);
      if (body.xoa_du_lieu === true) {
        const [a, b] = await Promise.all([
          db.from("chi_phi_ai").delete().eq("company_id", companyId).eq("nha_cung_cap", ncc).eq("nguon", "api"),
          db.from("token_ai").delete().eq("company_id", companyId).eq("nha_cung_cap", ncc),
        ]);
        if (a.error) throw a.error;
        if (b.error) throw b.error;
      }
      return json({ ok: true });
    }

    case "cap_nhat_bang_gia": {
      const { data: moiNhat, error: loiDoc } = await db.from("bang_gia_model").select("lay_luc").order("lay_luc", { ascending: false }).limit(1).maybeSingle();
      if (loiDoc) throw loiDoc;
      if (moiNhat && Date.now() - new Date(moiNhat.lay_luc).getTime() < GIAN_CACH_BANG_GIA_MS) {
        return json({ bo_qua: true, lay_luc: moiNhat.lay_luc });
      }

      // Tài liệu OpenRouter yêu cầu khoá cho /models. Dùng khoá máy chủ nếu có, không thì khoá
      // OpenRouter công ty đã kết nối. Không có cả hai thì vẫn thử gọi không khoá.
      let khoa = Deno.env.get("OPENROUTER_API_KEY") ?? "";
      if (!khoa && privateKey) {
        const { data: kn } = await db.from("ket_noi_chi_phi_ai").select("khoa_enc")
          .eq("company_id", companyId).eq("nha_cung_cap", "openrouter").neq("trang_thai", "da_go").maybeSingle();
        if (kn?.khoa_enc) {
          try {
            khoa = await decryptField(kn.khoa_enc as EncryptedBlob, privateKey);
          } catch { /* khoá hỏng: thử không khoá */ }
        }
      }
      const res = await fetch("https://openrouter.ai/api/v1/models", { headers: khoa ? { Authorization: `Bearer ${khoa}` } : {} });
      if (res.status === 401 || res.status === 403) {
        return loi("CAN_KHOA_OPENROUTER", "OpenRouter cần khoá để trả bảng giá. Kết nối OpenRouter ở trang Chi phí AI rồi thử lại.", 400);
      }
      if (!res.ok) return loi("OPENROUTER_LOI", `OpenRouter trả lỗi ${res.status} khi lấy bảng giá.`, 502);
      let bang;
      try {
        bang = docBangGiaOpenRouter(await res.json());
      } catch (e) {
        return loi("OPENROUTER_LOI", e instanceof Error ? e.message : "Bảng giá OpenRouter không đúng khuôn.", 502);
      }
      if (!bang.length) return loi("OPENROUTER_LOI", "OpenRouter trả bảng giá rỗng — giữ nguyên bảng cũ.", 502);

      const lay = new Date().toISOString();
      for (let i = 0; i < bang.length; i += LO_CHEN) {
        const { error } = await db.from("bang_gia_model")
          .upsert(bang.slice(i, i + LO_CHEN).map((g) => ({ ...g, nguon: "openrouter", lay_luc: lay })), { onConflict: "model_id" });
        if (error) throw error;
      }
      // Model OpenRouter đã bỏ thì bỏ khỏi bảng, để không gợi ý một model không còn bán.
      const { error: loiXoa } = await db.from("bang_gia_model").delete().lt("lay_luc", lay);
      if (loiXoa) throw loiXoa;
      return json({ so_model: bang.length, lay_luc: lay });
    }

    case "nhap_file": {
      const ncc = String(body.nha_cung_cap ?? "");
      if (!NHA_CUNG_CAP_NHAP.includes(ncc)) return loi("NHA_CUNG_CAP", "Nhà cung cấp không hợp lệ.", 400);
      const tenFile = String(body.ten_file ?? "").trim().slice(0, 200);
      if (!tenFile) return loi("TEN_FILE", "Thiếu tên file.", 400);
      if (!Array.isArray(body.dong) || body.dong.length === 0) return loi("KHONG_CO_DONG", "File không có dòng chi phí nào.", 400);
      if (body.dong.length > TOI_DA_DONG_NHAP) {
        return loi("QUA_NHIEU_DONG", `Tối đa ${TOI_DA_DONG_NHAP.toLocaleString("vi-VN")} dòng một lần — tách file theo tháng.`, 413);
      }

      const homNay = new Date();
      const hopLe: DongChiPhi[] = [];
      for (let i = 0; i < body.dong.length; i++) {
        const k = kiemDongNhap(body.dong[i], homNay);
        if (k.loi !== undefined) return loi("DONG_SAI", `Dòng ${i + 1}: ${k.loi}.`, 400);
        hopLe.push(k.dong);
      }
      const dong = gopDong(hopLe);
      const tuNgay = dong.reduce((m, d) => (d.ngay < m ? d.ngay : m), dong[0].ngay);
      const denNgay = dong.reduce((m, d) => (d.ngay > m ? d.ngay : m), dong[0].ngay);

      // Hai file chồng khoảng ngày cho cùng nhà cung cấp là cộng đôi. Hỏi trước, không tự xoá.
      const { data: trung, error: loiTrung } = await db.from("lo_nhap_chi_phi_ai")
        .select("id, ten_file, tu_ngay, den_ngay")
        .eq("company_id", companyId).eq("nha_cung_cap", ncc).lte("tu_ngay", denNgay).gte("den_ngay", tuNgay);
      if (loiTrung) throw loiTrung;
      if (trung?.length && body.thay_the !== true) {
        return loi("TRUNG_KHOANG_NGAY", "Đã có lần nhập file trùng khoảng ngày cho nhà cung cấp này.", 409, { trung });
      }
      if (trung?.length) {
        const { error: loiXoa } = await db.from("lo_nhap_chi_phi_ai").delete()
          .eq("company_id", companyId).in("id", trung.map((t: Row) => t.id));
        if (loiXoa) throw loiXoa;
      }

      const tong = Math.round(dong.reduce((s, d) => s + d.so_tien_usd, 0) * 1e6) / 1e6;
      const { data: lo, error: loiLo } = await db.from("lo_nhap_chi_phi_ai")
        .insert({ company_id: companyId, nha_cung_cap: ncc, ten_file: tenFile, so_dong: dong.length, tu_ngay: tuNgay, den_ngay: denNgay, tong_usd: tong, user_id: userId })
        .select("id, nha_cung_cap, ten_file, so_dong, tu_ngay, den_ngay, tong_usd, created_at").single();
      if (loiLo) throw loiLo;
      try {
        await chenTheoLo(db, "chi_phi_ai", dong.map((d) => ({ ...d, company_id: companyId, nha_cung_cap: ncc, nguon: "nhap_file", lo_nhap_id: lo.id })));
      } catch (e) {
        // Không để lại một lần nhập nửa vời mà tổng tiền trên màn hình không khớp file.
        await db.from("lo_nhap_chi_phi_ai").delete().eq("id", lo.id);
        throw e;
      }
      return json({ lo_nhap: { ...lo, tong_usd: Number(lo.tong_usd) }, da_thay_the: trung?.length ?? 0 });
    }

    case "xoa_lo_nhap": {
      const { data, error } = await db.from("lo_nhap_chi_phi_ai").delete()
        .eq("id", String(body.id ?? "")).eq("company_id", companyId).select("id").maybeSingle();
      if (error) throw error;
      if (!data) return loi("KHONG_THAY", "Không có lần nhập này.", 404);
      return json({ ok: true });
    }

    case "dat_ngan_sach": {
      if (body.han_muc_thang_usd === null) {
        const { error } = await db.from("ngan_sach_chi_phi_ai").delete().eq("company_id", companyId);
        if (error) throw error;
        return json({ ok: true, ngan_sach: null });
      }
      const han = Number(body.han_muc_thang_usd);
      if (!Number.isFinite(han) || han <= 0 || han >= 1e9) return loi("HAN_MUC", "Hạn mức tháng phải là số USD lớn hơn 0.", 400);
      const pct = body.canh_bao_phan_tram === undefined ? 80 : Number(body.canh_bao_phan_tram);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) return loi("CANH_BAO", "Mức cảnh báo là số nguyên từ 1 đến 100.", 400);
      const { error } = await db.from("ngan_sach_chi_phi_ai").upsert(
        { company_id: companyId, han_muc_thang_usd: Math.round(han * 100) / 100, canh_bao_phan_tram: pct, updated_at: new Date().toISOString() },
        { onConflict: "company_id" },
      );
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

    const chon = typeof body?.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string }>(db, user.id, "id", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);

    // MIMI-P1-003: nối API nhà cung cấp AI là việc quản trị; nhập file và đặt ngân sách cho kế toán.
    const QUYEN_HANH_DONG: Record<string, HanhDong> = {
      ket_noi: "noi_ngan_hang",
      go_ket_noi: "noi_ngan_hang",
      dong_bo: "dong_bo_du_lieu",
      cap_nhat_bang_gia: "dong_bo_du_lieu",
      nhap_file: "dong_bo_du_lieu",
      xoa_lo_nhap: "dong_bo_du_lieu",
      dat_ngan_sach: "quan_ly_agent",
    };
    const hanhDong = String(body.hanh_dong ?? "");
    const can = QUYEN_HANH_DONG[hanhDong];
    if (can) kiemQuyen(ct.vai_tro as VaiTro, can, cauTuChoi(ct.vai_tro, can));

    return await xuLy(db, user.id, ct.cong_ty.id, hanhDong, body);
  } catch (e) {
    if (e instanceof LoiQuyen) return loi("KHONG_DU_QUYEN", e.message, 403);
    // Không in thân yêu cầu: nó có thể chứa khoá quản trị.
    console.error("chi-phi-ai:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "Lỗi hệ thống khi xử lý chi phí AI.", 500);
  }
});
