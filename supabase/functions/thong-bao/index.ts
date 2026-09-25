/**
 * Edge function `thong-bao` — MIMI chủ động báo người dùng, trên web và điện thoại.
 *
 * Hành động (POST, JSON `{ hanh_dong, ... }`):
 *   - quet          : (cron, header x-cron-secret) bộ lọc ngầm cho mọi công ty — hạn thuế, văn bản
 *                     luật mới, tiền vào có vẻ không phải doanh thu, gói sắp hết hạn — rồi đẩy.
 *   - khoa_cong_khai: khoá công khai VAPID để trình duyệt đăng ký nhận đẩy. null = chưa cấu hình.
 *   - dang_ky       : { subscription } — lưu thiết bị nhận đẩy của người đang đăng nhập.
 *   - huy           : { endpoint } — gỡ thiết bị.
 *   - thu           : đẩy một thông báo thử tới mọi thiết bị của chính mình.
 *
 * Khoá VAPID nằm ở secret `VAPID_KEYS` (JSON do `exportVapidKeys` xuất). Thiếu thì mọi thứ vẫn
 * chạy, chỉ không đẩy — thông báo vẫn hiện ở chuông trong app.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush@0.5.0";
import { lucGioVietNam } from "../_shared/thue/han-ke-khai.ts";
import { congTyLaDemo } from "../_shared/minh-hoa.ts";
import {
  thongBaoGoi, thongBaoHanThue, thongBaoLuatMoi, trongGioYenLang, type BanNhapThongBao,
} from "../_shared/thong-bao/sinh.ts";
import { dayThongBao, ghiThongBao, nguoiNhan, type MayDay } from "../_shared/thong-bao/gui.ts";
import { nhapTienVaoGanDay } from "../_shared/thong-bao/quet-tien-vao.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// deno-lint-ignore no-explicit-any
type Db = any;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

let khoaDaNap: Promise<{ may: MayDay; congKhai: string } | null> | null = null;

/** Nạp khoá VAPID một lần mỗi phiên chạy của hàm. */
function napKhoa(): Promise<{ may: MayDay; congKhai: string } | null> {
  khoaDaNap ??= (async () => {
    const raw = Deno.env.get("VAPID_KEYS");
    if (!raw) return null;
    const vapidKeys = await webpush.importVapidKeys(JSON.parse(raw), { extractable: false });
    const may = await webpush.ApplicationServer.new({
      contactInformation: Deno.env.get("VAPID_SUBJECT") ?? "https://www.mimiwallet.online",
      vapidKeys,
    });
    return {
      congKhai: await webpush.exportApplicationServerKey(vapidKeys),
      may: {
        day: (dk: { endpoint: string; p256dh: string; auth: string }, noiDung: string) => may.subscribe({ endpoint: dk.endpoint, keys: { p256dh: dk.p256dh, auth: dk.auth } })
          // Hạn thuế, tiền vào: người dùng cần thấy sớm; quá 2 ngày thì không còn giá trị.
          .pushTextMessage(noiDung, { ttl: 2 * 86_400, urgency: webpush.Urgency.High }),
      },
    };
  })().catch((e) => {
    console.error("nạp khoá VAPID:", e instanceof Error ? e.message : e);
    khoaDaNap = null;
    return null;
  });
  return khoaDaNap;
}

/** Bộ lọc ngầm cho một công ty. */
async function quetCongTy(db: Db, companyId: string, lucVN: Date, luatMoi: BanNhapThongBao[]): Promise<number> {
  const nguoi = await nguoiNhan(db, companyId);
  if (!nguoi.length) return 0;
  const homNay = iso(lucVN);
  const laDemo = await congTyLaDemo(db, companyId);

  // Tiền vào dùng chung một bộ quét với `cas-webhook` — xem `_shared/thong-bao/quet-tien-vao.ts`.
  const [tienVao, goi] = await Promise.all([
    nhapTienVaoGanDay(db, companyId, lucVN, laDemo),
    db.from("subscriptions").select("plan, current_period_end").eq("company_id", companyId).maybeSingle(),
  ]);

  const nhap: BanNhapThongBao[] = [
    // Hạn thuế chỉ báo từ 7 giờ sáng: không ai cần biết "còn 7 ngày" lúc 0 giờ 7 phút.
    ...(lucVN.getHours() >= 7 ? thongBaoHanThue(lucVN) : []),
    ...luatMoi,
    ...tienVao,
    ...thongBaoGoi(goi.data ?? null, homNay),
  ];
  return await ghiThongBao(db, companyId, nhap, nguoi);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Chỉ nhận POST." }, 405);

  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const hanhDong = String(body.hanh_dong ?? "");

    if (hanhDong === "quet") {
      const biMat = Deno.env.get("BILLING_CRON_SECRET");
      if (!biMat || req.headers.get("x-cron-secret") !== biMat) return json({ error: "Unauthorized" }, 401);

      const lucVN = lucGioVietNam();
      // Văn bản mới nạp trong 3 ngày: khoá chống trùng lo phần còn lại.
      const { data: vb } = await db.from("van_ban_phap_luat")
        .select("ma_cong_bao, so_hieu, ten, ngay_hieu_luc")
        .gte("nap_luc", new Date(Date.now() - 3 * 86_400_000).toISOString()).limit(20);
      const luatMoi = thongBaoLuatMoi(vb ?? []);

      const { data: cty } = await db.from("companies").select("id").limit(5000);
      let moi = 0;
      for (const c of cty ?? []) {
        try {
          moi += await quetCongTy(db, c.id, lucVN, luatMoi);
        } catch (e) {
          console.error("quét thông báo công ty:", e instanceof Error ? e.message : e);
        }
      }
      // Giờ yên lặng: lưu hết, sáng mới đẩy.
      const kq = trongGioYenLang(lucVN) ? { da_day: 0, go_thiet_bi: 0, doi_sang: true } : await dayThongBao(db, (await napKhoa())?.may ?? null);
      return json({ cong_ty: cty?.length ?? 0, thong_bao_moi: moi, ...kq });
    }

    // Các hành động còn lại: người dùng đã đăng nhập.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Cần đăng nhập." }, 401);
    const { data: { user }, error: loiAuth } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
    if (loiAuth || !user) return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);

    const { data: duoc } = await db.rpc("tang_luot_goi", { p_user: user.id, p_hanh_dong: `thong_bao_${hanhDong}`, p_cua_so_giay: 60, p_toi_da: 20 });
    if (duoc === false) return json({ error: "Thao tác hơi nhanh. Đợi một phút rồi thử lại." }, 429);

    switch (hanhDong) {
      case "khoa_cong_khai":
        return json({ khoa: (await napKhoa())?.congKhai ?? null });

      case "dang_ky": {
        const s = body.subscription as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined;
        const endpoint = typeof s?.endpoint === "string" ? s.endpoint : "";
        const p256dh = typeof s?.keys?.p256dh === "string" ? s.keys.p256dh : "";
        const auth = typeof s?.keys?.auth === "string" ? s.keys.auth : "";
        const b64 = /^[A-Za-z0-9_-]+=*$/;
        if (!/^https:\/\/[^\s]{8,}$/.test(endpoint) || endpoint.length > 1000 || !b64.test(p256dh) || !b64.test(auth) || p256dh.length > 200 || auth.length > 100) {
          return json({ error: "Đăng ký nhận thông báo không hợp lệ." }, 400);
        }
        const { error } = await db.from("dang_ky_day").upsert({
          user_id: user.id, endpoint, p256dh, auth,
          thiet_bi: typeof body.thiet_bi === "string" ? body.thiet_bi.slice(0, 120) : null,
        }, { onConflict: "endpoint" });
        if (error) throw error;
        return json({ ok: true });
      }

      case "huy": {
        const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
        await db.from("dang_ky_day").delete().eq("user_id", user.id).eq("endpoint", endpoint);
        return json({ ok: true });
      }

      case "thu": {
        const k = await napKhoa();
        if (!k) return json({ error: "Máy chủ chưa bật đẩy thông báo." }, 503);
        const { data: dks } = await db.from("dang_ky_day").select("id, endpoint, p256dh, auth").eq("user_id", user.id);
        let da = 0;
        for (const dk of dks ?? []) {
          try {
            await k.may.day(dk, JSON.stringify({ tieu_de: "MIMI sẽ báo bạn như thế này", noi_dung: "Hạn khai thuế, luật mới, khoản tiền vào cần xác nhận — ngay trên điện thoại.", duong_dan: "/dashboard/nhac-thue", the: "thu" }));
            da += 1;
          } catch (e) {
            if ((e as { isGone?: () => boolean })?.isGone?.()) await db.from("dang_ky_day").delete().eq("id", dk.id);
          }
        }
        return json({ da_gui: da });
      }

      default:
        return json({ error: "Hành động không hợp lệ." }, 400);
    }
  } catch (e) {
    console.error("thong-bao:", e instanceof Error ? e.message : e);
    return json({ error: "MIMI gặp lỗi khi xử lý thông báo." }, 500);
  }
});
