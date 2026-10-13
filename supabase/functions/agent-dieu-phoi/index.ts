/**
 * ORCHESTRATOR agent cloud (13/10/2026) — `docs/CLOUD_AGENT_RUNTIME.md`.
 *
 * Hành động: `tao` (mục tiêu từ hội thoại → chọn agent → kế hoạch → lưu), `chay` (ký lệnh Ed25519, gọi runtime Vercel
 * từng lượt tới xong / cho_duyet / ban_giao / loi), `duyet_buoc`, `huy`, `xem`, `ds`.
 *
 * Xác thực như các function khác: JWT → thành viên công ty + vai trò (`_shared/company.ts`), kiểm quyền theo vai trò
 * sẵn có. Đọc/ghi bằng service role, luôn lọc theo công ty đang dùng. Thiếu khoá ký hoặc URL runtime → lỗi rõ
 * "runtime chưa cấu hình", không giả vờ chạy.
 *
 * Mô hình chỉ dùng ở hai chỗ, đều trừ xu theo chi phí thật (`xu/so-xu.ts`): lập kế hoạch cho việc lạ (rồi kiểm chặt),
 * và tóm tắt nội dung trang (đặt trong khối dữ liệu không đáng tin). Không đọc được sổ xu → không gọi mô hình.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kiemQuyen, LoiQuyen, resolveCompanyVaiTro } from "../_shared/company.ts";
import { cauTuChoi } from "../_shared/quyen/vai-tro.ts";
import { chonCongMoHinh, coDo, nhaCungCapCua, type CongMoHinh, type LanGoi } from "../_shared/ai/nha-cung-cap.ts";
import { docXuTruocLuot, truXuSauLuot, type XuTruocLuot } from "../_shared/xu/so-xu.ts";
import {
  chonAgent, docChonAgent, docKeHoachAgent, dungTinTomTat, keHoachMau, laTenAgent, loiDanChonAgent, loiDanLapKeHoachAgent,
  mienChoNhiemVu, tomTatTatDinh, type TenAgent,
} from "../_shared/agent/dang-ky.ts";
import { docKhoaRieng } from "../_shared/agent/chuan-hoa-json.ts";
import {
  chayNhiemVu, docNhatKy, dsNhiemVu, duyetBuoc, hienThi, huyNhiemVu, LoiDieuPhoi, quyenCan, taoNhiemVu, xemNhiemVu,
} from "../_shared/agent/dieu-phoi.ts";

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

const RUNTIME_MAC_DINH = "https://www.mimiwallet.online/api/agent-runtime";
const DO_DAI_MUC_TIEU = 1000;

const GIOI_HAN: Record<string, { cuaSoGiay: number; toiDa: number }> = {
  tao: { cuaSoGiay: 60, toiDa: 10 },
  chay: { cuaSoGiay: 60, toiDa: 10 },
  duyet_buoc: { cuaSoGiay: 60, toiDa: 30 },
  huy: { cuaSoGiay: 60, toiDa: 30 },
  xem: { cuaSoGiay: 60, toiDa: 120 },
  ds: { cuaSoGiay: 60, toiDa: 60 },
};

const homNayVN = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

async function ghiLanGoi(db: Db, companyId: string, l: LanGoi): Promise<void> {
  const { error } = await db.from("lan_goi_mo_hinh").insert({ company_id: companyId, ...l });
  if (error) console.error("ghi lần gọi mô hình:", error.message);
}

/** Một phiên dùng mô hình: đọc xu trước, gom lần gọi, trừ xu sau. Không đọc được xu / hết xu → null (không gọi). */
async function moPhienMoHinh(db: Db, companyId: string, cong: CongMoHinh | null) {
  if (!cong) return null;
  const xu: XuTruocLuot | null = await docXuTruocLuot(db, companyId, homNayVN()).catch(() => null);
  if (!xu || xu.so_du < 1) return null;
  const lanGoi: LanGoi[] = [];
  const ncc = (mucDich: "y_dinh" | "dien_dat") => coDo(nhaCungCapCua(cong), mucDich, (l) => { lanGoi.push(l); void ghiLanGoi(db, companyId, l); });
  return {
    async hoi(mucDich: "y_dinh" | "dien_dat", heThong: string, nguoiDung: string, hanMs = 15_000) {
      const r = await ncc(mucDich).hoi({ mo_hinh: cong.mo_hinh, tin: [{ vai: "he_thong", noi_dung: heThong }, { vai: "nguoi_dung", noi_dung: nguoiDung }], han_ms: hanMs });
      return r.noi_dung;
    },
    async truXu(thamChieu: string) {
      if (lanGoi.length) await truXuSauLuot(db, companyId, xu, lanGoi, thamChieu).catch((e) => console.error("agent xu:", e instanceof Error ? e.message : e));
    },
  };
}

async function goiRuntime(url: string, lenh: Record<string, unknown>, jwt: string): Promise<unknown> {
  const ctrl = new AbortController();
  const hen = setTimeout(() => ctrl.abort(), Number(lenh.ngan_sach_ms ?? 45_000) + 12_000);
  try {
    const res = await fetch(url, {
      method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify(lenh),
    });
    const j = await res.json().catch(() => null);
    // Runtime từ chối lệnh (chữ ký, JWT, hạn) trước khi chạy gì: 4xx kèm lỗi. Trả về dạng 'loi' để ghi rõ.
    if (!res.ok && (!j || typeof j !== "object" || !("trang_thai" in j))) {
      if (res.status >= 400 && res.status < 500) {
        return { nhiem_vu_id: lenh.nhiem_vu_id, trang_thai: "loi", buoc_tiep: lenh.tu_buoc, url_hien_tai: lenh.url_bat_dau ?? null, ket_qua_buoc: [], loi: `Runtime từ chối lệnh (${res.status}): ${String((j as Row | null)?.error ?? "").slice(0, 150)}` };
      }
      throw new Error(`Runtime lỗi ${res.status}`);
    }
    return j;
  } finally {
    clearTimeout(hen);
  }
}

async function xuLy(db: Db, req: Request, userId: string, jwt: string, companyId: string, vaiTro: Parameters<typeof kiemQuyen>[0], hanhDong: string, body: Row): Promise<Response> {
  const cong = chonCongMoHinh({
    stali: Deno.env.get("STALI_API_KEY"), moHinhStali: Deno.env.get("STALI_MODEL"),
    lovable: Deno.env.get("LOVABLE_API_KEY"),
    openrouter: Deno.env.get("OPENROUTER_API_KEY"), moHinhOpenRouter: Deno.env.get("OPENROUTER_MODEL"),
  });
  const id = String(body.id ?? "");

  // Quyền: tra nhiệm vụ trước cho duyet_buoc (quyền phụ thuộc agent). Công ty khác → 404 ngay trong `xemNhiemVu`.
  let agentCuaNv: TenAgent | null = null;
  if (hanhDong === "duyet_buoc") agentCuaNv = (await xemNhiemVu(db, { companyId, id })).agent;
  const can = quyenCan(hanhDong, agentCuaNv);
  if (!can) return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
  kiemQuyen(vaiTro, can, cauTuChoi(vaiTro, can));

  switch (hanhDong) {
    case "tao": {
      const mucTieu = String(body.muc_tieu ?? "").trim();
      if (!mucTieu) return loi("THAM_SO", "Thiếu mục tiêu.", 400);
      if (mucTieu.length > DO_DAI_MUC_TIEU) return loi("THAM_SO", `Mục tiêu dài tối đa ${DO_DAI_MUC_TIEU} ký tự.`, 400);
      const khoa = String(body.khoa_chong_trung ?? "");
      const mh = await moPhienMoHinh(db, companyId, cong);
      try {
        // Luật trước; luật không ra mới hỏi mô hình (một từ), rồi mới dùng gợi ý từ giao diện.
        let agent = chonAgent(mucTieu, null);
        if (!agent && mh) agent = docChonAgent(await mh.hoi("y_dinh", loiDanChonAgent(), mucTieu, 8_000).catch(() => null));
        if (!agent && laTenAgent(body.agent_goi_y)) agent = body.agent_goi_y;
        if (!agent) return loi("KHONG_RO_AGENT", "Mình chưa rõ việc này cần mở trang nào. Bạn ghi rõ địa chỉ trang (ví dụ vanban.chinhphu.vn).", 422);
        const mien = mienChoNhiemVu(agent, mucTieu);
        if (!mien.length) return loi("KHONG_CO_MIEN", "Agent trình duyệt cần bạn ghi rõ địa chỉ trang web muốn mở.", 422);
        let keHoach = keHoachMau(agent, mucTieu);
        if (!keHoach) {
          if (!mh) return loi("CHUA_LAP_DUOC", cong ? "Hết năng lượng (xu) hoặc chưa kiểm được xu — chưa lập được kế hoạch cho việc này." : "Việc này chưa có mẫu và máy chủ chưa bật mô hình để lập kế hoạch.", 422);
          const van = await mh.hoi("y_dinh", loiDanLapKeHoachAgent(agent, mien), mucTieu).catch(() => null);
          const kq = docKeHoachAgent(van, agent, mien);
          if (!kq.ok) return loi("KE_HOACH_BI_BO", `Kế hoạch mô hình đề xuất bị bỏ: ${kq.ly_do}`, 422);
          keHoach = kq.keHoach;
        }
        const r = await taoNhiemVu(db, { companyId, userId, agent, mucTieu, buoc: keHoach.buoc, mien, keHoachTu: keHoach.nguon, khoaChongTrung: khoa });
        return json({ nhiem_vu: hienThi(r.nhiem_vu), moi: r.moi, mo_ta: keHoach.mo_ta });
      } finally {
        await mh?.truXu("agent_tao");
      }
    }

    case "chay": {
      const bimat = Deno.env.get("MIMI_RUNTIME_PRIVATE_KEY") ?? "";
      const runtimeUrl = (Deno.env.get("MIMI_RUNTIME_URL") ?? "").trim() || RUNTIME_MAC_DINH;
      let khoa: CryptoKey | null = null;
      if (bimat.trim()) {
        try {
          khoa = await docKhoaRieng(bimat);
        } catch (e) {
          console.error("agent khoa rieng:", e instanceof Error ? e.message : e);
        }
      }
      let mh: Awaited<ReturnType<typeof moPhienMoHinh>> = null;
      try {
        const nv = await chayNhiemVu(db, { companyId, id, nguoiDungId: userId, jwt }, {
          khoa, runtimeUrl, goiRuntime,
          tomTat: async (mucTieu, trang) => {
            if (!trang.length) return "";
            mh = await moPhienMoHinh(db, companyId, cong);
            if (!mh) return tomTatTatDinh(trang);
            const t = dungTinTomTat(mucTieu, trang);
            const van = await mh.hoi("dien_dat", t.he_thong, t.nguoi_dung, 20_000).catch(() => null);
            return (van ?? "").trim() || tomTatTatDinh(trang);
          },
        });
        return json({ nhiem_vu: hienThi(nv) });
      } finally {
        await (mh as Awaited<ReturnType<typeof moPhienMoHinh>>)?.truXu("agent_tom_tat");
      }
    }

    case "duyet_buoc": {
      const nv = await duyetBuoc(db, { companyId, id, buoc: Number(body.buoc) });
      return json({ nhiem_vu: hienThi(nv) });
    }

    case "huy":
      return json({ nhiem_vu: hienThi(await huyNhiemVu(db, { companyId, id })) });

    case "xem": {
      const nv = await xemNhiemVu(db, { companyId, id });
      return json({ nhiem_vu: hienThi(nv), nhat_ky: await docNhatKy(db, companyId, nv.id) });
    }

    case "ds":
      return json({ ds: (await dsNhiemVu(db, companyId)).map(hienThi) });
  }
  void req;
  return loi("HANH_DONG", "Hành động không hợp lệ.", 400);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return loi("PHUONG_THUC", "Chỉ nhận POST.", 405);
  if (Number(req.headers.get("content-length") ?? 0) > 64_000) return loi("QUA_LON", "Dữ liệu gửi lên quá lớn.", 413);
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
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await db.auth.getUser(jwt);
    if (authError || !user) return loi("CHUA_DANG_NHAP", "Phiên đăng nhập không hợp lệ.", 401);

    const chon = typeof body.company_id === "string" ? body.company_id : null;
    const ct = await resolveCompanyVaiTro<{ id: string }>(db, user.id, "id", chon);
    if (!ct) return loi("KHONG_CO_CONG_TY", chon ? "Bạn không thuộc công ty này." : "Chưa có công ty.", chon ? 403 : 404);

    const hanhDong = String(body.hanh_dong ?? "");
    const gioiHan = GIOI_HAN[hanhDong];
    if (gioiHan) {
      const { data: duoc, error: loiDem } = await db.rpc("tang_luot_goi", {
        p_user: user.id, p_hanh_dong: `agent_${hanhDong}`, p_cua_so_giay: gioiHan.cuaSoGiay, p_toi_da: gioiHan.toiDa,
      });
      if (loiDem) console.error("agent-dieu-phoi gioi han:", loiDem.message);
      else if (duoc === false) return loi("QUA_NHIEU", "Bạn thao tác hơi nhanh. Đợi khoảng một phút rồi thử lại.", 429);
    }
    return await xuLy(db, req, user.id, jwt, ct.cong_ty.id, ct.vai_tro, hanhDong, body);
  } catch (e) {
    if (e instanceof LoiQuyen) return loi("KHONG_DU_QUYEN", e.message, 403);
    if (e instanceof LoiDieuPhoi) return loi(e.ma, e.message, e.status);
    console.error("agent-dieu-phoi:", e instanceof Error ? e.message : e);
    return loi("LOI_HE_THONG", "MIMI gặp lỗi khi điều phối agent. Thử lại sau ít phút.", 500);
  }
});
