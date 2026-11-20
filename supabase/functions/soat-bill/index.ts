/**
 * Edge function `soat-bill` — QUẦY TIN (20/11/2026). Xem `.kiro/specs/quay-tin/`.
 *
 * POST JSON `{ hanh_dong, company_id?, ... }`:
 *   - soat       : { anh_base64, mime, ban_id? } — Agent Soát Bill đọc ảnh → Agent Đối Chiếu so với tiền vào thật.
 *   - kiem_lai   : { id } — đèn vàng tự hỏi lại (máy quầy gọi 5 giây một lần).
 *   - hom_nay    : — các ca soát hôm nay + hàng chờ duyệt.
 *   - quyet      : { id, quyet: cho_qua|tu_choi, ly_do } — chỉ chủ / quản trị; ghi nhat_ky_quyet_dinh.
 *   - demo_tien_ve : { so_tien, ma? } — CHỈ cửa hàng mẫu: giả lập một khoản tiền về để giám khảo bấm thử.
 *
 * Ba agent, KHÔNG agent nào có quyền chi tiền (N3): Soát Bill chỉ đọc ảnh, Đối Chiếu chỉ đọc giao dịch, quyết định
 * là của người. Ảnh không lưu (N4): chỉ mã băm.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { resolveCompanyVaiTro } from "../_shared/company.ts";
import { biGioiHan } from "../_shared/da-co-so/pham-vi.ts";
import { duocBanHang, duocXacNhanTay, khoangNgayVN, laUuid, ngayVN } from "../_shared/pos/ban-hang.ts";
import { docCauHinh, kiemAnh, nhinAnh } from "../_shared/ai/thi-giac.ts";
import { chuanHoaBill, LOI_DAN_DOC_BILL, chuanSoTien } from "../_shared/soat-bill/doc-bill.ts";
import { phanXu, type BillDoc, type TaiKhoanQuan, type TienVao } from "../_shared/soat-bill/doi-chieu.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

// deno-lint-ignore no-explicit-any
type Db = any;

const COT = "id, ban_id, co_so_id, doc, den, ly_do, cau_noi, so_tien, thuc_te, giao_dich_id, nha_cung_cap, mo_hinh, do_tre_ms, bat_dau, quyet, quyet_luc, ly_do_quyet, created_at";

const GIOI_HAN_SOAT = [{ hanh_dong: "soat_bill_phut", cua_so_giay: 60, toi_da: 30 }, { hanh_dong: "soat_bill_ngay", cua_so_giay: 86400, toi_da: 2000 }];
const GIOI_HAN_HOI = [{ hanh_dong: "soat_bill_hoi_phut", cua_so_giay: 60, toi_da: 150 }];

/** Tài khoản giả của cửa hàng mẫu — bill mẫu "đúng" có 4 số cuối 8899. */
const TK_CUA_HANG_MAU: TaiKhoanQuan[] = [{ account_number: "000012348899", bank_name: "MB (cửa hàng mẫu)" }];
/** Nguồn KHÔNG phải tiền ngân hàng: POS tự ghi tiền mặt / xác nhận tay, người nhập tay. */
const NGUON_KHONG_PHAI_NGAN_HANG = ["pos", "manual"];

async function sha256Hex(base64: string): Promise<string> {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function docTaiKhoanQuan(db: Db, companyId: string, coSo: string | null, laDemo: boolean): Promise<TaiKhoanQuan[]> {
  const { data } = await db.from("bank_connections").select("account_number, bank_name")
    .eq("company_id", companyId).eq("status", "connected").is("revoked_at", null).limit(20);
  let ds: TaiKhoanQuan[] = (data ?? []).filter((r: TaiKhoanQuan) => r.account_number);
  if (coSo) {
    const { data: g } = await db.from("co_so_tai_khoan").select("so_tai_khoan").eq("company_id", companyId).eq("co_so_id", coSo);
    const cho = new Set((g ?? []).map((r: { so_tai_khoan: string }) => r.so_tai_khoan.replace(/\D/g, "")));
    if (cho.size) ds = ds.filter((t) => cho.has(t.account_number.replace(/\D/g, "")));
  }
  if (!ds.length && laDemo) return TK_CUA_HANG_MAU;
  return ds;
}

/** Tiền vào trong 3 giờ qua. Cửa hàng mẫu đọc tiền giả lập; công ty thật chỉ đọc tiền thật từ ngân hàng. */
async function docTienVao(db: Db, companyId: string, laDemo: boolean): Promise<TienVao[]> {
  const tu = new Date(Date.now() - 3 * 3_600_000).toISOString();
  const { data, error } = await db.from("transactions")
    .select("id, amount, type, payment_reference, merchant_name, source_bank, account_number, source, created_at")
    .eq("company_id", companyId).eq("type", "income").eq("is_synthetic", laDemo)
    .gte("created_at", tu).order("created_at", { ascending: false }).limit(500);
  if (error) throw new Error(`đọc tiền vào: ${error.message}`);
  return (data ?? [])
    .filter((g: { source: string | null }) => !NGUON_KHONG_PHAI_NGAN_HANG.includes(g.source ?? ""))
    .map((g: Record<string, unknown>) => ({
      id: String(g.id), amount: g.amount as number, type: g.type as string, luc: String(g.created_at),
      payment_reference: (g.payment_reference as string) ?? null, merchant_name: (g.merchant_name as string) ?? null,
      bank_name: (g.source_bank as string) ?? null, account_number: (g.account_number as string) ?? null,
    }));
}

/**
 * Giao dịch đã "dùng": đã làm xanh một ca soát khác, hoặc đã đóng một lần bán POS KHÁC mã trên bill.
 * (Bill của chính đơn POS đó thì tiền đã đóng đơn vẫn là bằng chứng cho bill — không tính là đã dùng.)
 */
async function docDaDung(db: Db, companyId: string, maTrenBill: string | null, truCa?: string): Promise<Set<string>> {
  const tu = new Date(Date.now() - 2 * 86_400_000).toISOString();
  let q1 = db.from("soat_bill").select("giao_dich_id").eq("company_id", companyId).eq("den", "xanh").not("giao_dich_id", "is", null).gte("created_at", tu);
  if (truCa) q1 = q1.neq("id", truCa);
  const [{ data: a }, { data: b }] = await Promise.all([
    q1,
    db.from("ban_hang_pos").select("matched_transaction_id, reference").eq("company_id", companyId).not("matched_transaction_id", "is", null).gte("created_at", tu),
  ]);
  const s = new Set<string>((a ?? []).map((r: { giao_dich_id: string }) => r.giao_dich_id));
  for (const r of (b ?? []) as Array<{ matched_transaction_id: string; reference: string }>) {
    if (!maTrenBill || r.reference.toUpperCase() !== maTrenBill.toUpperCase()) s.add(r.matched_transaction_id);
  }
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    if (!auth) return loi("CHUA_DANG_NHAP", "Đăng nhập để soát bill.", 401);
    const { data: { user }, error: loiAuth } = await db.auth.getUser(auth.replace("Bearer ", ""));
    if (loiAuth || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập đã hết. Đăng nhập lại.", 401);

    const body = await req.json().catch(() => ({}));
    const hanhDong = String(body?.hanh_dong ?? "");
    if (!(await duocGoi(db, user.id, hanhDong === "soat" ? GIOI_HAN_SOAT : GIOI_HAN_HOI, false))) return qua429(corsHeaders);

    const chonCty = typeof body?.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string; la_demo: boolean | null }>(db, user.id, "id, la_demo", chonCty);
    if (!ct) return loi("KHONG_THUOC", chonCty ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chonCty ? 403 : 404);
    const companyId = ct.cong_ty.id;
    const laDemo = ct.cong_ty.la_demo === true;
    const vai = ct.vai_tro;
    if (!duocBanHang(vai)) return loi("KHONG_DU_QUYEN", "Vai trò Người xem không soát bill được.", 403);

    const { data: tv } = await db.from("thanh_vien_cong_ty").select("co_so_id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle();
    const coSo: string | null = biGioiHan(vai, tv?.co_so_id) ? tv!.co_so_id : null;

    const docCa = async (id: unknown) => {
      if (!laUuid(id)) return null;
      let q = db.from("soat_bill").select(COT).eq("company_id", companyId).eq("id", id);
      if (coSo) q = q.eq("co_so_id", coSo);
      const { data } = await q.maybeSingle();
      return data;
    };

    /** Chạy Đối Chiếu; nếu chỗ ghi va phải luật "một giao dịch một xanh" (đua) thì chạy lại với giao dịch đó đã dùng. */
    const doiChieu = async (bill: BillDoc | null, batDau: Date, truCa?: string) => {
      const [tk, vao, daDung] = await Promise.all([
        docTaiKhoanQuan(db, companyId, coSo, laDemo), docTienVao(db, companyId, laDemo), docDaDung(db, companyId, bill?.ma_mimi ?? null, truCa),
      ]);
      return { tk, vao, daDung, kq: phanXu({ bill, taiKhoanQuan: tk, tienVao: vao, daDung, batDau, bayGio: new Date() }) };
    };

    switch (hanhDong) {
      case "soat": {
        const a = kiemAnh(body?.anh_base64, body?.mime);
        if (!a.ok) return loi("THAM_SO", a.cau, 400);
        const banId = laUuid(body?.ban_id) ? body.ban_id : null;
        const [bamAnh, nhin] = await Promise.all([
          sha256Hex(a.anh),
          nhinAnh({ cauHinh: docCauHinh((k) => Deno.env.get(k)), anh: a.anh, mime: a.mime, loiDan: LOI_DAN_DOC_BILL }),
        ]);
        if (nhin.loi.length) console.warn("soat-bill thị giác:", nhin.loi.join(" | "));
        const bill = chuanHoaBill(nhin.van);
        const batDau = new Date();
        let { kq, daDung } = await doiChieu(bill, batDau);
        let ca: Record<string, unknown> | null = null;
        for (let lan = 0; lan < 3 && !ca; lan++) {
          const { data, error } = await db.from("soat_bill").insert({
            company_id: companyId, co_so_id: coSo, created_by: user.id, ban_id: banId, anh_sha256: bamAnh, doc: bill,
            den: kq.den, ly_do: kq.ly_do, cau_noi: kq.cau_noi, so_tien: kq.so_tien, thuc_te: kq.thuc_te, giao_dich_id: kq.giao_dich_id,
            nha_cung_cap: nhin.nha_cung_cap, mo_hinh: nhin.mo_hinh, do_tre_ms: nhin.do_tre_ms, bat_dau: batDau.toISOString(),
          }).select(COT).single();
          if (!error) { ca = data; break; }
          if (error.code !== "23505" || !kq.giao_dich_id) throw new Error(`ghi ca soát: ${error.message}`);
          // Ca khác vừa dùng giao dịch này → coi là đã dùng, xử lại.
          daDung = new Set([...daDung, kq.giao_dich_id]);
          const [tk, vao] = await Promise.all([docTaiKhoanQuan(db, companyId, coSo, laDemo), docTienVao(db, companyId, laDemo)]);
          kq = phanXu({ bill, taiKhoanQuan: tk, tienVao: vao, daDung, batDau, bayGio: new Date() });
        }
        // Lần chụp lại cùng một ảnh: báo cho thu ngân biết (không đổi đèn).
        const { count } = await db.from("soat_bill").select("id", { count: "exact", head: true })
          .eq("company_id", companyId).eq("anh_sha256", bamAnh).gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
        return json({ ca, so_lan_chup_anh_nay: count ?? 1 });
      }

      case "kiem_lai": {
        const ca = await docCa(body?.id);
        if (!ca) return loi("KHONG_THAY", "Không thấy ca soát này.", 404);
        if (ca.den !== "vang" || ca.quyet) return json({ ca });
        const { kq } = await doiChieu(ca.doc as BillDoc, new Date(ca.bat_dau), ca.id);
        if (kq.den === "vang") return json({ ca });
        const { data, error } = await db.from("soat_bill").update({
          den: kq.den, ly_do: kq.ly_do, cau_noi: kq.cau_noi, so_tien: kq.so_tien, thuc_te: kq.thuc_te, giao_dich_id: kq.giao_dich_id, updated_at: new Date().toISOString(),
        }).eq("id", ca.id).eq("den", "vang").select(COT).maybeSingle();
        // Đua với ca khác trên cùng giao dịch → để vàng, lần hỏi sau xử lại.
        if (error && error.code === "23505") return json({ ca });
        if (error) throw new Error(`cập nhật ca soát: ${error.message}`);
        return json({ ca: data ?? (await docCa(ca.id)) });
      }

      case "hom_nay": {
        const { tu, den } = khoangNgayVN(ngayVN(new Date()));
        let q = db.from("soat_bill").select(COT).eq("company_id", companyId).gte("created_at", tu).lt("created_at", den);
        if (coSo) q = q.eq("co_so_id", coSo);
        const { data, error } = await q.order("created_at", { ascending: false }).limit(200);
        if (error) throw new Error(`đọc ca soát: ${error.message}`);
        const ds = data ?? [];
        return json({
          ca: ds,
          hang_cho: ds.filter((c: { quyet: string | null; den: string }) => !c.quyet && ["do", "lech", "khong_doc_duoc"].includes(c.den)),
          dem: ds.reduce((m: Record<string, number>, c: { den: string }) => ({ ...m, [c.den]: (m[c.den] ?? 0) + 1 }), {}),
          duoc_quyet: duocXacNhanTay(vai),
          la_demo: laDemo,
        });
      }

      case "quyet": {
        if (!duocXacNhanTay(vai)) return loi("KHONG_DU_QUYEN", "Chỉ chủ doanh nghiệp hoặc quản trị được quyết ca này.", 403);
        const ca = await docCa(body?.id);
        if (!ca) return loi("KHONG_THAY", "Không thấy ca soát này.", 404);
        const quyet = body?.quyet === "cho_qua" ? "cho_qua" : body?.quyet === "tu_choi" ? "tu_choi" : null;
        if (!quyet) return loi("THAM_SO", "Chọn Cho qua hoặc Từ chối.", 400);
        const lyDo = typeof body?.ly_do === "string" ? body.ly_do.trim().slice(0, 300) : "";
        if (quyet === "cho_qua" && !lyDo) return loi("THAM_SO", "Cho qua thì ghi lý do (ví dụ: đã thấy tiền trong app ngân hàng).", 400);
        if (ca.quyet) return json({ ca });
        const bayGio = new Date().toISOString();
        const { data } = await db.from("soat_bill").update({ quyet, quyet_boi: user.id, quyet_luc: bayGio, ly_do_quyet: lyDo || null, updated_at: bayGio })
          .eq("id", ca.id).is("quyet", null).select(COT).maybeSingle();
        const moTa = `${quyet === "cho_qua" ? "Cho qua" : "Từ chối"} ca soát bill (đèn ${ca.den}, ${ca.ly_do})${lyDo ? `: ${lyDo}` : ""}.`;
        await db.from("nhat_ky_quyet_dinh").insert({
          company_id: companyId, user_id: user.id, vai_tro: vai, de_xuat_khoa: `soat_bill:${ca.id}`, loai: "soat_bill_quyet",
          tham_so: { den: ca.den, ly_do: ca.ly_do, so_tien: ca.so_tien, giao_dich_id: ca.giao_dich_id }, mo_ta_da_xac_nhan: moTa,
          ket_qua: "thanh_cong", xong_luc: bayGio,
        }).then(() => null, () => null);
        return json({ ca: data ?? (await docCa(ca.id)) });
      }

      case "demo_tien_ve": {
        if (!laDemo) return loi("KHONG_DUOC", "Chỉ cửa hàng mẫu mới giả lập được tiền về.", 403);
        const soTien = chuanSoTien(body?.so_tien);
        if (!soTien || soTien > 100_000_000) return loi("THAM_SO", "Số tiền giả lập từ 1 đồng tới 100 triệu.", 400);
        const ma = typeof body?.ma === "string" && /^MIMI[0-9A-Z]{6}$/.test(body.ma) ? body.ma : null;
        const { data, error } = await db.from("transactions").insert({
          company_id: companyId, amount: soTien, type: "income", category: null,
          merchant_name: `Khách chuyển khoản (giả lập cửa hàng mẫu)${ma ? ` ${ma}` : ""}`,
          transaction_date: ngayVN(new Date()), source_bank: "MB (cửa hàng mẫu)", account_number: TK_CUA_HANG_MAU[0].account_number,
          reference_id: `demo-quaytin-${crypto.randomUUID()}`, payment_reference: ma, source: "demo", is_synthetic: true,
        }).select("id, amount, created_at").single();
        if (error) throw new Error(`giả lập tiền về: ${error.message}`);
        return json({ giao_dich: data });
      }

      default:
        return loi("HANH_DONG", "Không rõ việc cần làm.", 400);
    }
  } catch (e) {
    console.error("soat-bill:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "Chưa soát được. Mở app ngân hàng để kiểm, thử lại sau ít phút.", 500);
  }
});
