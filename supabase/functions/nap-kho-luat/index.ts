/**
 * Nạp kho văn bản pháp luật vào `van_ban_phap_luat` + `doan_phap_luat`.
 *
 * FUNCTION TẠM. Chỉ bật khi đang nạp: không có secret `NAP_KHO_TOKEN` thì trả
 * 503. Nạp xong thì xoá secret hoặc xoá function.
 *
 * VÌ SAO QUA FUNCTION. Bảng kho chỉ service role ghi được, và service role key
 * không được đi qua dòng lệnh hay đoạn chat. Function đã có sẵn key đó trong môi
 * trường; bộ nạp ở máy chỉ cần một mã tạm, sinh ngay tại máy và đặt bằng
 * `supabase secrets set --env-file`.
 *
 * NẠP LẠI ĐƯỢC. Mỗi văn bản: ghi đè dòng văn bản, xoá các đoạn cũ, ghi đoạn mới.
 * Trích lại chữ hay đổi cách chia đoạn thì chạy lại bộ nạp là xong.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const TRAN_VAN_BAN_MOI_LO = 100;
const TRAN_DOAN_MOI_VAN_BAN = 5000;
const TRAN_KY_TU_DOAN = 4000;

function bangNhau(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let khac = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) khac |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return khac === 0;
}

const ngay = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const chu = (v: unknown, tran: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, tran) : null);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Chỉ nhận POST." }, 405);

  const token = Deno.env.get("NAP_KHO_TOKEN");
  if (!token) return json({ error: "Chưa bật nạp kho (thiếu NAP_KHO_TOKEN)." }, 503);
  if (!bangNhau(req.headers.get("x-nap-token") ?? "", token)) return json({ error: "Sai mã nạp." }, 401);

  let body: { van_ban?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body phải là JSON." }, 400);
  }
  const ds = Array.isArray(body.van_ban) ? body.van_ban : null;
  if (!ds || ds.length === 0 || ds.length > TRAN_VAN_BAN_MOI_LO) {
    return json({ error: `van_ban phải là mảng 1–${TRAN_VAN_BAN_MOI_LO} phần tử.` }, 400);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const ketQua = { van_ban: 0, doan: 0, bo_qua: [] as string[] };

  for (const raw of ds as Record<string, unknown>[]) {
    const ma = chu(raw.ma_cong_bao, 40);
    const url = chu(raw.url, 500);
    const ten = chu(raw.ten, 1000);
    const doan = Array.isArray(raw.doan) ? (raw.doan as Record<string, unknown>[]) : [];
    if (!ma || !ten || !url?.startsWith("https://congbao.chinhphu.vn/") || doan.length === 0 || doan.length > TRAN_DOAN_MOI_VAN_BAN) {
      ketQua.bo_qua.push(ma ?? "(không mã)");
      continue;
    }

    const { error: e1 } = await db.from("van_ban_phap_luat").upsert({
      ma_cong_bao: ma,
      so_hieu: chu(raw.so_hieu, 100),
      loai: chu(raw.loai, 100),
      co_quan: chu(raw.co_quan, 500),
      ngay_ban_hanh: ngay(raw.ngay_ban_hanh),
      ngay_hieu_luc: ngay(raw.ngay_hieu_luc),
      ten,
      trich_yeu: chu(raw.trich_yeu, 2000),
      nguoi_ky: chu(raw.nguoi_ky, 200),
      url,
      nguon_toan_van: chu(raw.nguon_toan_van, 40),
      so_doan: doan.length,
      nap_luc: new Date().toISOString(),
    });
    if (e1) return json({ error: `Ghi văn bản ${ma}: ${e1.message}`, da_nap: ketQua }, 500);

    const { error: e2 } = await db.from("doan_phap_luat").delete().eq("ma_cong_bao", ma);
    if (e2) return json({ error: `Xoá đoạn cũ ${ma}: ${e2.message}`, da_nap: ketQua }, 500);

    const dong = doan
      .map((d, i) => ({
        ma_cong_bao: ma,
        thu_tu: Number.isInteger(d.thu_tu) ? (d.thu_tu as number) : i,
        nhan: chu(d.nhan, 200),
        noi_dung: chu(d.noi_dung, TRAN_KY_TU_DOAN),
      }))
      .filter((d) => d.noi_dung);

    for (let i = 0; i < dong.length; i += 500) {
      const { error: e3 } = await db.from("doan_phap_luat").insert(dong.slice(i, i + 500));
      if (e3) return json({ error: `Ghi đoạn ${ma}: ${e3.message}`, da_nap: ketQua }, 500);
    }
    ketQua.van_ban += 1;
    ketQua.doan += dong.length;
  }

  return json({ ok: true, ...ketQua });
});
