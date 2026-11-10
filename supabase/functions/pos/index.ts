/**
 * Edge function `pos` — bán tại quầy trên máy POS Android / điện thoại (10/11/2026).
 *
 * POST JSON `{ hanh_dong, company_id?, ... }`:
 *   - cau_hinh      : vai trò, quyền, tài khoản nhận cho VietQR, món bán nhanh, tổng hợp hôm nay.
 *   - tao_ban       : { client_id, so_tien, phuong_thuc: cash|transfer, ghi_chu?, dong_hang?, ban_luc? }
 *                     Lặp lại cùng client_id trả lại đúng lần bán cũ (đồng bộ ngoại tuyến không ghi hai lần).
 *   - trang_thai    : { id } — máy POS hỏi lần bán chuyển khoản đã có tiền về chưa (chạy đối soát cho lần đó).
 *   - xac_nhan_tay  : { id } — chủ/quản trị bấm "Đã nhận tiền" khi máy chưa thấy tiền về.
 *   - huy           : { id } — huỷ lần bán đang chờ.
 *   - tong_hop      : { ngay? } — tổng hợp một ngày (giờ Việt Nam) + danh sách lần bán.
 *   - luu_san_pham  : { san_pham: [{ten, gia}] } — chủ/quản trị sửa món bán nhanh.
 *
 * Service role đi vòng RLS nên phạm vi là việc của file này: mọi truy vấn lọc `company_id` của công ty người
 * gọi thuộc về, và nhân viên được giao một cơ sở chỉ chạm lần bán của cơ sở đó (`biGioiHan`).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { duocGoi, qua429 } from "../_shared/an-ninh/gioi-han.ts";
import { resolveCompanyVaiTro } from "../_shared/company.ts";
import { sinhMaThamChieu } from "../_shared/bank/ma-tham-chieu.ts";
import { timNganHang } from "../_shared/bank/ngan-hang.ts";
import { biGioiHan } from "../_shared/da-co-so/pham-vi.ts";
import {
  CAU_TU_CHOI, chonTaiKhoanNhan, docDanhSachSanPham, docYeuCauBan, duocBanHang, duocSuaSanPham, duocXacNhanTay,
  khoangNgayVN, laUuid, ngayVN, tongHopNgay, type KetNoiNhan,
} from "../_shared/pos/ban-hang.ts";
import { doiSoatBanHangPos, ghiSoBan } from "../_shared/pos/ghi-so.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const loi = (ma: string, cau: string, status: number) => json({ error: cau, ma }, status);

// deno-lint-ignore no-explicit-any
type Db = any;

const COT_BAN = "id, client_id, amount, method, reference, status, paid_basis, note, items, account_number, bank_bin, auto_match, sold_at, paid_at, created_at, co_so_id";

/** Giới hạn mỗi người: máy POS hỏi trạng thái 3 giây một lần khi chờ chuyển khoản. */
const GIOI_HAN = [
  { hanh_dong: "pos_phut", cua_so_giay: 60, toi_da: 150 },
  { hanh_dong: "pos_ngay", cua_so_giay: 86400, toi_da: 20000 },
];

async function docTaiKhoanNhan(db: Db, companyId: string, coSoId: string | null) {
  const { data: ketNoi, error } = await db.from("bank_connections")
    .select("id, account_number, account_name, bank_name, bank_code, scopes, status, revoked_at, created_at")
    .eq("company_id", companyId).eq("provider", "bankhub").eq("status", "connected").is("revoked_at", null)
    .order("created_at", { ascending: true }).limit(20);
  if (error) throw new Error(`đọc tài khoản nhận: ${error.message}`);
  let tkCoSo: string[] | null = null;
  if (coSoId) {
    const { data: g } = await db.from("co_so_tai_khoan").select("so_tai_khoan").eq("company_id", companyId).eq("co_so_id", coSoId);
    tkCoSo = (g ?? []).map((r: { so_tai_khoan: string }) => r.so_tai_khoan);
  }
  const chon = chonTaiKhoanNhan((ketNoi ?? []) as KetNoiNhan[], tkCoSo);
  if (!chon) return null;
  const bin = timNganHang(chon.tk.bank_code)?.bin ?? timNganHang(chon.tk.bank_name)?.bin ?? null;
  if (!bin) return null;
  return {
    account_number: chon.tk.account_number.replace(/\D/g, ""),
    account_name: chon.tk.account_name,
    bank_name: chon.tk.bank_name,
    bin,
    tu_dong_khop: chon.tu_dong_khop,
  };
}

async function docTongHop(db: Db, companyId: string, coSo: string | null, ngay: string) {
  const { tu, den } = khoangNgayVN(ngay);
  let q = db.from("ban_hang_pos").select(COT_BAN).eq("company_id", companyId).gte("created_at", tu).lt("created_at", den);
  if (coSo) q = q.eq("co_so_id", coSo);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error(`đọc lần bán: ${error.message}`);
  return { ngay, tong_hop: tongHopNgay(data ?? []), ban: (data ?? []).slice(0, 100) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = req.headers.get("Authorization");
    if (!auth) return loi("CHUA_DANG_NHAP", "Đăng nhập để bán hàng.", 401);
    const { data: { user }, error: loiAuth } = await db.auth.getUser(auth.replace("Bearer ", ""));
    if (loiAuth || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập đã hết. Đăng nhập lại.", 401);
    if (!(await duocGoi(db, user.id, GIOI_HAN, false))) return qua429(corsHeaders);

    const body = await req.json().catch(() => ({}));
    const hanhDong = String(body?.hanh_dong ?? "");
    const chonCty = typeof body?.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string; name: string | null; la_demo: boolean | null }>(db, user.id, "id, name, la_demo", chonCty);
    if (!ct) return loi("KHONG_THUOC", chonCty ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chonCty ? 403 : 404);
    const companyId = ct.cong_ty.id;
    const vai = ct.vai_tro;
    if (!duocBanHang(vai)) return loi("KHONG_DU_QUYEN", CAU_TU_CHOI.ban_hang, 403);

    // Phạm vi cơ sở của người gọi.
    const { data: tv } = await db.from("thanh_vien_cong_ty").select("co_so_id").eq("company_id", companyId).eq("user_id", user.id).maybeSingle();
    const coSo: string | null = biGioiHan(vai, tv?.co_so_id) ? tv!.co_so_id : null;

    const docBan = async (id: unknown) => {
      if (!laUuid(id)) return null;
      let q = db.from("ban_hang_pos").select(COT_BAN).eq("company_id", companyId).eq("id", id);
      if (coSo) q = q.eq("co_so_id", coSo);
      const { data } = await q.maybeSingle();
      return data;
    };

    switch (hanhDong) {
      case "cau_hinh": {
        const [tk, { data: sp }, th] = await Promise.all([
          docTaiKhoanNhan(db, companyId, coSo),
          db.from("pos_san_pham").select("id, ten, gia, thu_tu").eq("company_id", companyId).order("thu_tu").limit(24),
          docTongHop(db, companyId, coSo, ngayVN(new Date())),
        ]);
        return json({
          cong_ty: { id: companyId, ten: ct.cong_ty.name },
          vai_tro: vai,
          quyen: { xac_nhan_tay: duocXacNhanTay(vai), sua_san_pham: duocSuaSanPham(vai) },
          tai_khoan_nhan: tk,
          san_pham: sp ?? [],
          ...th,
        });
      }

      case "tao_ban": {
        const doc = docYeuCauBan(body);
        if (!doc.ok) return loi("THAM_SO", doc.cau, 400);
        const yc = doc.yc;

        // Lặp lại cùng client_id: trả lần bán cũ, không ghi thêm.
        const { data: cu } = await db.from("ban_hang_pos").select(COT_BAN).eq("company_id", companyId).eq("client_id", yc.client_id).maybeSingle();
        if (cu) return json({ ban: cu, lap_lai: true });

        let tk: Awaited<ReturnType<typeof docTaiKhoanNhan>> = null;
        if (yc.phuong_thuc === "transfer") {
          tk = await docTaiKhoanNhan(db, companyId, coSo);
          if (!tk) {
            return loi("CHUA_CO_TAI_KHOAN",
              coSo ? "Cơ sở của bạn chưa gán tài khoản ngân hàng nhận tiền. Nhờ chủ gán trong Cài đặt → Cơ sở."
                : "Chưa liên kết tài khoản ngân hàng nhận tiền. Vào Kết nối → Ngân hàng để liên kết, hoặc thu tiền mặt.", 409);
          }
        }

        const laTienMat = yc.phuong_thuc === "cash";
        const bayGio = new Date().toISOString();
        let ban: Record<string, unknown> | null = null;
        for (let lan = 0; lan < 5 && !ban; lan++) {
          const { data, error } = await db.from("ban_hang_pos").insert({
            company_id: companyId, co_so_id: coSo, client_id: yc.client_id, amount: yc.so_tien, method: yc.phuong_thuc,
            reference: sinhMaThamChieu(), status: laTienMat ? "paid" : "pending", paid_basis: laTienMat ? "cash" : null,
            note: yc.ghi_chu, items: yc.dong_hang, account_number: tk?.account_number ?? null, bank_bin: tk?.bin ?? null,
            auto_match: tk?.tu_dong_khop ?? false, sold_at: yc.ban_luc, paid_at: laTienMat ? bayGio : null, created_by: user.id,
          }).select(COT_BAN).single();
          if (!error) { ban = data; break; }
          if (error.code !== "23505") throw new Error(`ghi lần bán: ${error.message}`);
          // Trùng client_id (hai lần gửi chạy đua) → trả dòng đã có; trùng mã → sinh mã khác.
          const { data: dua } = await db.from("ban_hang_pos").select(COT_BAN).eq("company_id", companyId).eq("client_id", yc.client_id).maybeSingle();
          if (dua) return json({ ban: dua, lap_lai: true });
        }
        if (!ban) throw new Error("không sinh được mã tham chiếu");

        if (laTienMat) {
          const gd = await ghiSoBan(db, { id: String(ban.id), company_id: companyId, amount: yc.so_tien, reference: String(ban.reference), note: yc.ghi_chu, sold_at: yc.ban_luc, method: "cash", la_demo: ct.cong_ty.la_demo === true }, user.id, vai);
          await db.from("ban_hang_pos").update({ book_transaction_id: gd }).eq("id", ban.id);
        }
        return json({
          ban,
          ...(tk ? { tai_khoan_nhan: { account_number: tk.account_number, account_name: tk.account_name, bank_name: tk.bank_name, bin: tk.bin, tu_dong_khop: tk.tu_dong_khop } } : {}),
        });
      }

      case "trang_thai": {
        let ban = await docBan(body?.id);
        if (!ban) return loi("KHONG_THAY", "Không thấy lần bán này.", 404);
        if (ban.method === "transfer" && ban.status === "pending") {
          const r = await doiSoatBanHangPos(db, companyId, ban.id);
          if (r.khop) ban = await docBan(body?.id);
        }
        return json({ ban });
      }

      case "xac_nhan_tay": {
        if (!duocXacNhanTay(vai)) return loi("KHONG_DU_QUYEN", CAU_TU_CHOI.xac_nhan_tay, 403);
        const ban = await docBan(body?.id);
        if (!ban) return loi("KHONG_THAY", "Không thấy lần bán này.", 404);
        if (ban.status !== "pending") return json({ ban });
        const bayGio = new Date().toISOString();
        const { data: nhan } = await db.from("ban_hang_pos")
          .update({ status: "paid", paid_basis: "manual", paid_at: bayGio, updated_at: bayGio })
          .eq("id", ban.id).eq("status", "pending").select(COT_BAN).maybeSingle();
        if (!nhan) return json({ ban: await docBan(ban.id) });
        const gd = await ghiSoBan(db, { id: ban.id, company_id: companyId, amount: Number(ban.amount), reference: ban.reference, note: ban.note, sold_at: ban.sold_at, method: "transfer", la_demo: ct.cong_ty.la_demo === true }, user.id, vai);
        await db.from("ban_hang_pos").update({ book_transaction_id: gd }).eq("id", ban.id);
        await db.from("nhat_ky_quyet_dinh").insert({
          company_id: companyId, user_id: user.id, vai_tro: vai, de_xuat_khoa: `pos:xac_nhan_tay:${ban.id}`, loai: "pos_xac_nhan_tay",
          tham_so: { reference: ban.reference, amount: ban.amount }, mo_ta_da_xac_nhan: `Xác nhận tay đã nhận ${ban.amount}đ chuyển khoản, mã ${ban.reference}.`, ket_qua: "thanh_cong", xong_luc: bayGio,
        }).then(() => null, () => null);
        return json({ ban: nhan });
      }

      case "huy": {
        const ban = await docBan(body?.id);
        if (!ban) return loi("KHONG_THAY", "Không thấy lần bán này.", 404);
        if (ban.status !== "pending") return loi("KHONG_HUY_DUOC", "Chỉ huỷ được lần bán đang chờ tiền.", 409);
        const bayGio = new Date().toISOString();
        const { data } = await db.from("ban_hang_pos").update({ status: "cancelled", cancelled_at: bayGio, updated_at: bayGio })
          .eq("id", ban.id).eq("status", "pending").select(COT_BAN).maybeSingle();
        return json({ ban: data ?? (await docBan(ban.id)) });
      }

      case "tong_hop": {
        const ngay = typeof body?.ngay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.ngay) ? body.ngay : ngayVN(new Date());
        return json(await docTongHop(db, companyId, coSo, ngay));
      }

      case "luu_san_pham": {
        if (!duocSuaSanPham(vai)) return loi("KHONG_DU_QUYEN", CAU_TU_CHOI.sua_san_pham, 403);
        const d = docDanhSachSanPham(body?.san_pham);
        if (!d.ok) return loi("THAM_SO", d.cau, 400);
        const { error: e1 } = await db.from("pos_san_pham").delete().eq("company_id", companyId);
        if (e1) throw new Error(e1.message);
        if (d.ds.length) {
          const { error: e2 } = await db.from("pos_san_pham").insert(d.ds.map((s, i) => ({ company_id: companyId, ten: s.ten, gia: s.gia, thu_tu: i })));
          if (e2) throw new Error(e2.message);
        }
        const { data } = await db.from("pos_san_pham").select("id, ten, gia, thu_tu").eq("company_id", companyId).order("thu_tu");
        return json({ san_pham: data ?? [] });
      }

      default:
        return loi("HANH_DONG", "Không rõ việc cần làm.", 400);
    }
  } catch (e) {
    console.error("pos:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "Chưa làm được. Thử lại sau ít phút.", 500);
  }
});
