/**
 * Dấu thời gian chứng từ — neo sổ cái hoá đơn, chứng từ lên Bitcoin qua OpenTimestamps.
 *
 * Hai nhóm người gọi:
 *   - Lịch chạy (pg_cron → `goi_dau_thoi_gian`), header `x-cron-secret`:
 *       `neo`      — gom mã băm chưa neo của mỗi công ty thành cây Merkle, gửi MÃ GỐC tới lịch.
 *       `nang_cap` — hỏi lịch bằng chứng Bitcoin cho các lần neo đang chờ; đối chiếu merkle root
 *                    của khối qua Blockstream trước khi coi là đã vào Bitcoin.
 *   - Chủ doanh nghiệp (JWT):
 *       `trang_thai`   — bao nhiêu chứng từ đã ghi sổ / đã neo / đang chờ.
 *       `bang_chung`   — tệp .ots của một chứng từ, tự kiểm được ở công cụ OpenTimestamps.
 *       `kiem_toan_ven`— chuỗi băm có đứt không, chứng từ hiện tại có lệch sổ cái không.
 *
 * Chỉ mã băm 32 byte rời MIMI. Không tên, không số tiền, không mã số thuế.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCompany } from "../_shared/company.ts";
import {
  cacTangMerkle, chieuCaoBitcoin, docDauThoiGian, LoiOts, noi, opTuLaLenGoc, sangHex, tachPhanCho, tepOts, tuHex,
} from "../_shared/dau-thoi-gian/ots.ts";

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

/** Máy chủ lịch công khai, thử lần lượt. */
const LICH = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
];
const LA_TOI_DA_MOT_LAN = 50_000;
const CONG_TY_TOI_DA_MOT_LAN = 300;
const USER_AGENT = "MIMIWallet/1.0 (+https://mimiwallet.vercel.app)";

const b64 = (b: Uint8Array) => {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
};
const tuB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function bangNhau(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

async function guiLich(goc: Uint8Array): Promise<{ lich: string; phanHoi: Uint8Array }> {
  let loiCuoi = "";
  for (const lich of LICH) {
    try {
      const res = await fetch(`${lich}/digest`, {
        method: "POST",
        headers: { Accept: "application/vnd.opentimestamps.v1", "User-Agent": USER_AGENT, "Content-Type": "application/octet-stream" },
        body: goc,
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) { loiCuoi = `${lich} trả ${res.status}`; continue; }
      const phanHoi = new Uint8Array(await res.arrayBuffer());
      await tachPhanCho(phanHoi, goc); // phản hồi phải đúng khuôn trước khi lưu
      return { lich, phanHoi };
    } catch (e) {
      loiCuoi = `${lich}: ${e instanceof Error ? e.message : "lỗi"}`;
    }
  }
  throw new Error(`Không máy chủ lịch nào nhận mã gốc (${loiCuoi}).`);
}

async function neo(db: Db) {
  const { data: chuaNeo, error } = await db.from("so_cai_chung_tu").select("company_id").is("neo_id", null).limit(20_000);
  if (error) throw error;
  const congTy = [...new Set((chuaNeo ?? []).map((r: Row) => r.company_id as string))].slice(0, CONG_TY_TOI_DA_MOT_LAN);
  const ketQua: Row[] = [];
  for (const companyId of congTy) {
    try {
      const { data: dong, error: loiDoc } = await db.from("so_cai_chung_tu").select("id, ma_bam")
        .eq("company_id", companyId).is("neo_id", null).order("id", { ascending: true }).limit(LA_TOI_DA_MOT_LAN);
      if (loiDoc) throw loiDoc;
      if (!dong?.length) continue;
      const tang = await cacTangMerkle(dong.map((r: Row) => tuHex(r.ma_bam)));
      const goc = tang[tang.length - 1][0];
      const { lich, phanHoi } = await guiLich(goc);
      const { data: n, error: loiNeo } = await db.from("neo_thoi_gian").insert({
        company_id: companyId, goc_merkle: sangHex(goc), so_la: dong.length, lich, bang_chung_cho: b64(phanHoi),
      }).select("id").single();
      if (loiNeo) throw loiNeo;
      const { error: loiGan } = await db.rpc("gan_neo_so_cai", { p_neo: n.id, p_ids: dong.map((r: Row) => r.id) });
      if (loiGan) throw loiGan;
      ketQua.push({ company_id: companyId, so_la: dong.length });
    } catch (e) {
      console.error("dau-thoi-gian neo:", companyId, e instanceof Error ? e.message : e);
      ketQua.push({ company_id: companyId, loi: true });
    }
  }
  return ketQua;
}

/** merkle root của khối, theo thứ tự byte nội bộ (explorer hiện đảo ngược). */
async function merkleRootKhoi(chieuCao: number): Promise<string> {
  const h = await fetch(`https://blockstream.info/api/block-height/${chieuCao}`, { signal: AbortSignal.timeout(15_000) });
  if (!h.ok) throw new Error(`Blockstream block-height ${h.status}`);
  const hash = (await h.text()).trim();
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error("Blockstream trả hash khối lạ");
  const k = await fetch(`https://blockstream.info/api/block/${hash}`, { signal: AbortSignal.timeout(15_000) });
  if (!k.ok) throw new Error(`Blockstream block ${k.status}`);
  const root = String((await k.json()).merkle_root ?? "");
  if (!/^[0-9a-f]{64}$/.test(root)) throw new Error("Blockstream trả merkle root lạ");
  return sangHex(tuHex(root).reverse());
}

async function nangCap(db: Db) {
  const { data: ds, error } = await db.from("neo_thoi_gian").select("id, goc_merkle, lich, bang_chung_cho")
    .eq("trang_thai", "cho_bitcoin").lt("created_at", new Date(Date.now() - 3_600_000).toISOString())
    .order("created_at", { ascending: true }).limit(200);
  if (error) throw error;
  const ketQua: Row[] = [];
  for (const n of ds ?? []) {
    const capNhat = (du: Row) => db.from("neo_thoi_gian").update({ ...du, updated_at: new Date().toISOString() }).eq("id", n.id);
    try {
      const cho = await tachPhanCho(tuB64(n.bang_chung_cho), tuHex(n.goc_merkle));
      const res = await fetch(`${n.lich}/timestamp/${sangHex(cho.camKet)}`, {
        headers: { Accept: "application/vnd.opentimestamps.v1", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) { ketQua.push({ id: n.id, cho: true }); continue; }
      if (!res.ok) throw new Error(`Lịch trả ${res.status}`);
      const nangCapBytes = new Uint8Array(await res.arrayBuffer());
      const { ds: ct } = await docDauThoiGian(nangCapBytes, cho.camKet);
      const btc = ct.find((c) => chieuCaoBitcoin(c) !== null);
      if (!btc) { ketQua.push({ id: n.id, cho: true }); continue; }
      const chieuCao = chieuCaoBitcoin(btc) as number;
      const root = await merkleRootKhoi(chieuCao);
      if (root !== sangHex(btc.thongDiep)) {
        await capNhat({ trang_thai: "loi", loi_cuoi: `Merkle root khối ${chieuCao} không khớp bằng chứng.` });
        ketQua.push({ id: n.id, loi: "khong_khop" });
        continue;
      }
      await capNhat({ trang_thai: "da_vao_bitcoin", khoi_bitcoin: chieuCao, bang_chung_bitcoin: b64(nangCapBytes), loi_cuoi: null });
      ketQua.push({ id: n.id, khoi: chieuCao });
    } catch (e) {
      const cau = e instanceof Error ? e.message : "Lỗi không rõ";
      console.error("dau-thoi-gian nang_cap:", n.id, cau);
      // Lỗi mạng tạm thời thì để lần sau thử lại; bằng chứng hỏng khuôn thì đánh dấu lỗi.
      if (e instanceof LoiOts) await capNhat({ trang_thai: "loi", loi_cuoi: cau });
      else await capNhat({ loi_cuoi: cau });
      ketQua.push({ id: n.id, loi: cau });
    }
  }
  return ketQua;
}

async function xuLyNguoiDung(db: Db, companyId: string, hanhDong: string, body: Row): Promise<Response> {
  switch (hanhDong) {
    case "trang_thai": {
      const [tong, chuaNeo, neoDs] = await Promise.all([
        db.from("so_cai_chung_tu").select("id", { count: "exact", head: true }).eq("company_id", companyId),
        db.from("so_cai_chung_tu").select("id", { count: "exact", head: true }).eq("company_id", companyId).is("neo_id", null),
        db.from("neo_thoi_gian").select("id, so_la, trang_thai, khoi_bitcoin, created_at, updated_at")
          .eq("company_id", companyId).order("created_at", { ascending: false }).limit(500),
      ]);
      for (const r of [tong, chuaNeo, neoDs]) if (r.error) throw r.error;
      const neoRows = (neoDs.data ?? []) as Row[];
      const soTheo = (t: string) => neoRows.filter((n) => n.trang_thai === t).reduce((s, n) => s + n.so_la, 0);
      const bitcoin = neoRows.find((n) => n.trang_thai === "da_vao_bitcoin");
      return json({
        so_muc: tong.count ?? 0,
        so_chua_neo: chuaNeo.count ?? 0,
        so_cho_bitcoin: soTheo("cho_bitcoin"),
        so_da_vao_bitcoin: soTheo("da_vao_bitcoin"),
        so_loi: soTheo("loi"),
        neo_gan_nhat: neoRows[0] ? { trang_thai: neoRows[0].trang_thai, created_at: neoRows[0].created_at } : null,
        khoi_gan_nhat: bitcoin ? { khoi_bitcoin: bitcoin.khoi_bitcoin, created_at: bitcoin.created_at } : null,
      });
    }

    case "bang_chung": {
      const loai = String(body.loai ?? "");
      if (!["hoa_don_dien_tu", "chung_tu_quet"].includes(loai)) return loi("LOAI", "Loại chứng từ không hợp lệ.", 400);
      const id = String(body.ban_ghi_id ?? "");
      if (!/^[0-9a-f-]{36}$/.test(id)) return loi("ID", "Mã chứng từ không hợp lệ.", 400);
      const { data: muc, error } = await db.from("so_cai_chung_tu").select("id, ma_bam, neo_id, thu_tu_la, created_at")
        .eq("company_id", companyId).eq("loai", loai).eq("ban_ghi_id", id).order("id", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!muc) return loi("CHUA_GHI_SO", "Chứng từ này chưa có trong sổ cái.", 404);
      if (!muc.neo_id) return json({ trang_thai: "chua_neo", ma_bam: muc.ma_bam });

      const { data: n, error: loiNeo } = await db.from("neo_thoi_gian")
        .select("id, goc_merkle, so_la, lich, bang_chung_cho, bang_chung_bitcoin, khoi_bitcoin, trang_thai, created_at")
        .eq("id", muc.neo_id).eq("company_id", companyId).single();
      if (loiNeo) throw loiNeo;
      const { data: la, error: loiLa } = await db.from("so_cai_chung_tu").select("ma_bam, thu_tu_la")
        .eq("neo_id", n.id).order("thu_tu_la", { ascending: true }).limit(LA_TOI_DA_MOT_LAN);
      if (loiLa) throw loiLa;
      const tang = await cacTangMerkle((la ?? []).map((r: Row) => tuHex(r.ma_bam)));
      if (sangHex(tang[tang.length - 1][0]) !== n.goc_merkle) return loi("GOC_LECH", "Sổ cái không dựng lại được mã gốc đã neo — cần kiểm toàn vẹn.", 409);

      const phanHoi = tuB64(n.bang_chung_cho);
      const dauGoc = n.trang_thai === "da_vao_bitcoin" && n.bang_chung_bitcoin
        ? noi((await tachPhanCho(phanHoi, tuHex(n.goc_merkle))).tienTo, tuB64(n.bang_chung_bitcoin))
        : phanHoi;
      const tep = tepOts(tuHex(muc.ma_bam), opTuLaLenGoc(tang, muc.thu_tu_la), dauGoc);
      return json({
        trang_thai: n.trang_thai, khoi_bitcoin: n.khoi_bitcoin, neo_luc: n.created_at, ma_bam: muc.ma_bam, ots: b64(tep),
      });
    }

    case "kiem_toan_ven": {
      const { data, error } = await db.rpc("kiem_so_cai", { p_company: companyId });
      if (error) throw error;
      const r = (Array.isArray(data) ? data[0] : data) ?? {};
      return json({
        so_mat_xich: Number(r.so_mat_xich ?? 0),
        so_chung_tu: Number(r.so_chung_tu ?? 0),
        so_chung_tu_lech: Number(r.so_chung_tu_lech ?? 0),
        so_mat_xich_hong: Number(r.so_mat_xich_hong ?? 0),
      });
    }

    default:
      return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  if (Number(req.headers.get("content-length") ?? 0) > 10_000) return loi("QUA_LON", "Dữ liệu gửi lên quá lớn.", 413);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    let body: Row;
    try {
      body = await req.json();
    } catch {
      return loi("JSON", "Thân yêu cầu không phải JSON.", 400);
    }
    const hanhDong = String(body.hanh_dong ?? "");

    if (hanhDong === "neo" || hanhDong === "nang_cap") {
      const biMat = Deno.env.get("BILLING_CRON_SECRET") ?? "";
      if (!biMat || !bangNhau(req.headers.get("x-cron-secret") ?? "", biMat)) return loi("KHONG_QUYEN", "Không có quyền.", 401);
      return json({ ket_qua: hanhDong === "neo" ? await neo(db) : await nangCap(db) });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return loi("CHUA_DANG_NHAP", "Cần đăng nhập.", 401);
    const { data: { user }, error: authError } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);
    const company = await resolveCompany<{ id: string }>(db, user.id);
    if (!company) return loi("KHONG_CO_CONG_TY", "Chưa có công ty.", 404);

    const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
      p_user: user.id, p_hanh_dong: `dtg_${hanhDong}`.slice(0, 40), p_cua_so_giay: 60, p_toi_da: 60,
    });
    if (loiDem) console.error("dau-thoi-gian gioi han:", loiDem.message);
    else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);

    return await xuLyNguoiDung(db, company.id, hanhDong, body);
  } catch (e) {
    console.error("dau-thoi-gian:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "Lỗi hệ thống khi đọc dấu thời gian.", 500);
  }
});
