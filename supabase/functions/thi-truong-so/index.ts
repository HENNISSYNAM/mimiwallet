import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { doiChieuGia, type BaoGia } from "../_shared/web3/gia-san.ts";
import {
  chuanHoaChuoi,
  docChuoiBinance,
  docChuoiCoinbase,
  type ChuoiGia,
  type Khung,
} from "../_shared/web3/chuoi-gia.ts";
import {
  bangChungPhapLy,
  bangChungThiTruong,
  bangChungViMo,
  tongHop,
  type TinViMo,
  type VanBanPhapLy,
} from "../_shared/web3/tin-hieu.ts";

/**
 * Bối cảnh thị trường tài sản số: giá nhiều sàn, tin vĩ mô, và lịch hiệu lực
 * văn bản pháp luật.
 *
 * CHỈ ĐỌC ENDPOINT CÔNG KHAI. Không khoá API, không đăng nhập sàn, không quyền
 * đặt lệnh, không giữ tài sản của ai. Đây là ranh giới cố ý và nó quyết định cả
 * hình dạng kỹ thuật lẫn hồ sơ pháp lý của tính năng: đọc giá công khai là đọc
 * dữ liệu thị trường, còn nối tài khoản sàn là chuyện khác hẳn.
 *
 * MỘT SÀN HỎNG KHÔNG ĐƯỢC LÀM HỎNG CẢ CÂU TRẢ LỜI. `Promise.allSettled`, mỗi
 * lời gọi có hạn giờ riêng. Binance bị chặn theo vùng ở một số hạ tầng — nếu
 * điều đó xảy ra trên Supabase Edge thì Coinbase vẫn trả lời, và `doiChieuGia`
 * nói rõ là chỉ còn một nguồn thay vì im lặng đưa ra một con số trông như đã
 * đối chiếu.
 *
 * KHÔNG NUỐT LỖI. Bài học ngày 08/09: bốn tính năng chết vì `data` được lấy còn
 * `error` bị bỏ, nên truy vấn hỏng trông y hệt truy vấn không tìm thấy gì. Ở đây
 * mọi nhánh hỏng đều đi vào `suCo` và về tới màn hình.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Hạn giờ cho mỗi sàn. Một sàn treo không được giữ cả yêu cầu. */
const HAN_GIO_MS = 6000;

/** Mã mặc định. Người gọi truyền `ma` để đổi. */
const MA_MAC_DINH = ["BTC", "ETH", "SOL"];

/** Số ngày lấy tin vĩ mô. Tin cũ hơn không còn là bối cảnh của hôm nay. */
const NGAY_TIN = 7;

/**
 * Số phiên cho biểu đồ.
 *
 * 30 ngày là khoảng đủ thấy xu hướng mà không biến câu trả lời thành một khối
 * dữ liệu nặng — ba mã là 90 nến, còn chấp nhận được trong một phản hồi JSON.
 */
const SO_PHIEN = 60;

/**
 * Khung thời gian → tham số của từng sàn.
 *
 * Coinbase nhận `granularity` bằng giây và **không có khung tuần** (tối đa
 * 86400). Nên `1w` chỉ Binance phục vụ được; giá trị `null` ở đây là cách nói
 * điều đó bằng kiểu dữ liệu, thay vì gửi một tham số Coinbase sẽ từ chối rồi
 * đọc lỗi ngược lại.
 */
const KHUNG: Record<Khung, { binance: string; coinbase: number | null }> = {
  "1h": { binance: "1h", coinbase: 3600 },
  "4h": { binance: "4h", coinbase: 14400 },
  "1d": { binance: "1d", coinbase: 86400 },
  "1w": { binance: "1w", coinbase: null },
};

interface SuCo {
  nguon: string;
  loi: string;
}

async function docJson(url: string, nhan: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(HAN_GIO_MS),
    headers: {
      // Coinbase từ chối yêu cầu không có User-Agent.
      "User-Agent": "MIMI-Wallet/1.0 (market context; read-only)",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`${nhan} trả HTTP ${res.status}`);
  return await res.json();
}

/** Binance — endpoint công khai, không cần khoá. */
async function giaBinance(ma: string): Promise<BaoGia> {
  const d = (await docJson(
    `https://api.binance.com/api/v3/ticker/24hr?symbol=${ma}USDT`,
    "Binance",
  )) as { lastPrice?: string; priceChangePercent?: string };
  const gia = Number(d.lastPrice);
  const doi = Number(d.priceChangePercent);
  return { san: "Binance", gia, doi24h: Number.isFinite(doi) ? doi : null };
}

/**
 * Coinbase — endpoint công khai của Coinbase Exchange.
 *
 * Không có sẵn phần trăm thay đổi; phải tự tính từ `open` và `last`. Nếu thiếu
 * một trong hai thì trả `null` chứ không trả 0 — 0 nghĩa là "đứng giá", một câu
 * khẳng định, còn `null` nghĩa là "không biết".
 */
async function giaCoinbase(ma: string): Promise<BaoGia> {
  const d = (await docJson(
    `https://api.exchange.coinbase.com/products/${ma}-USD/stats`,
    "Coinbase",
  )) as { last?: string; open?: string };
  const gia = Number(d.last);
  const mo = Number(d.open);
  const doi24h =
    Number.isFinite(gia) && Number.isFinite(mo) && mo > 0 ? ((gia - mo) / mo) * 100 : null;
  return { san: "Coinbase", gia, doi24h };
}

/**
 * Chuỗi nến cho biểu đồ: MỘT sàn, không trộn.
 *
 * Khác `doiChieuGia` — ở đó hỏi nhiều sàn rồi lấy trung vị là đúng. Với chuỗi
 * thời gian thì trộn là sai: cửa sổ 24 giờ của hai sàn bắt đầu ở hai thời điểm
 * khác nhau (đo được 09/09/2026), nên nến của chúng không xếp chồng lên nhau.
 *
 * Ưu tiên Binance vì chuỗi dài và biên nến theo UTC ổn định; hỏng thì rơi sang
 * Coinbase, và nhãn sàn đổi theo để biểu đồ không bao giờ ẩn nguồn.
 */
async function chuoiGia(ma: string, khung: Khung, suCo: SuCo[]): Promise<ChuoiGia> {
  const cfg = KHUNG[khung];

  try {
    const raw = await docJson(
      `https://api.binance.com/api/v3/klines?symbol=${ma}USDT&interval=${cfg.binance}&limit=${SO_PHIEN}`,
      "Binance",
    );
    const nen = docChuoiBinance(raw);
    if (nen.length) return chuanHoaChuoi(ma, "Binance", nen, khung);
    suCo.push({ nguon: `biểu đồ ${ma}`, loi: "Binance trả về chuỗi rỗng" });
  } catch (e) {
    suCo.push({ nguon: `biểu đồ ${ma}`, loi: `Binance: ${(e as Error).message}` });
  }

  if (cfg.coinbase === null) {
    // Nói ra thay vì im lặng trả chuỗi rỗng: người dùng đổi sang khung tuần và
    // thấy trống thì phải biết là vì sàn dự phòng không có khung đó.
    suCo.push({ nguon: `biểu đồ ${ma}`, loi: "Coinbase không có khung tuần" });
    return chuanHoaChuoi(ma, "—", [], khung);
  }

  try {
    const raw = await docJson(
      `https://api.exchange.coinbase.com/products/${ma}-USD/candles?granularity=${cfg.coinbase}`,
      "Coinbase",
    );
    // Coinbase trả nhiều hơn số phiên cần và theo thứ tự giảm dần; cắt sau khi
    // `chuanHoaChuoi` đã sắp lại, chứ không cắt trên mảng thô.
    const day = chuanHoaChuoi(ma, "Coinbase", docChuoiCoinbase(raw), khung);
    return { ...day, nen: day.nen.slice(-SO_PHIEN) };
  } catch (e) {
    suCo.push({ nguon: `biểu đồ ${ma}`, loi: `Coinbase: ${(e as Error).message}` });
  }

  return chuanHoaChuoi(ma, "—", [], khung);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const body = await req.json().catch(() => ({}));
    const danhSachMa: string[] = Array.isArray(body.ma) && body.ma.length
      ? body.ma.slice(0, 10).map((m: unknown) => String(m).toUpperCase().replace(/[^A-Z0-9]/g, ""))
      : MA_MAC_DINH;

    const khung: Khung = ["1h", "4h", "1d", "1w"].includes(String(body.khung))
      ? (String(body.khung) as Khung)
      : "1d";

    const suCo: SuCo[] = [];

    // ── THU_THAP ────────────────────────────────────────────────────────────
    const gia = await Promise.all(
      danhSachMa.map(async (ma) => {
        const ketQua = await Promise.allSettled([giaBinance(ma), giaCoinbase(ma)]);
        const baoGia: BaoGia[] = [];
        for (const r of ketQua) {
          if (r.status === "fulfilled") baoGia.push(r.value);
          else suCo.push({ nguon: `giá ${ma}`, loi: String(r.reason?.message ?? r.reason) });
        }
        return doiChieuGia(ma, baoGia);
      }),
    );

    // Biểu đồ chạy song song với phần giá, nhưng KHÔNG gộp vào cùng một lời
    // gọi: một sàn có thể trả được giá hiện tại mà chặn endpoint nến, và gộp
    // lại thì mất cả hai.
    const chuoi = await Promise.all(danhSachMa.map((m) => chuoiGia(m, khung, suCo)));

    // ── VI_MO ───────────────────────────────────────────────────────────────
    const tuNgay = new Date();
    tuNgay.setDate(tuNgay.getDate() - NGAY_TIN);
    const { data: tinData, error: loiTin } = await supabase
      .from("macro_news")
      .select("title, topic, impact, source, url, published_at")
      .gte("published_at", tuNgay.toISOString())
      .order("published_at", { ascending: false })
      .limit(20);
    if (loiTin) suCo.push({ nguon: "tin vĩ mô", loi: loiTin.message });

    const tin: TinViMo[] = (tinData ?? []).map((t) => ({
      tieuDe: t.title as string,
      chuDe: (t.topic as string) ?? "general",
      tacDong: ((t.impact as string) ?? "neutral") as TinViMo["tacDong"],
      nguon: (t.source as string) ?? "—",
      ...(t.url ? { url: t.url as string } : {}),
    }));

    // ── PHAP_LY ─────────────────────────────────────────────────────────────
    const { data: luatData, error: loiLuat } = await supabase
      .from("legal_documents")
      .select("so_hieu, ten, ngay_hieu_luc, doi_tuong_ap_dung, tom_tat_de_hieu, url_nguon")
      .order("ngay_hieu_luc", { ascending: false })
      .limit(100);
    if (loiLuat) suCo.push({ nguon: "văn bản pháp luật", loi: loiLuat.message });

    const vanBan: VanBanPhapLy[] = (luatData ?? []).map((v) => ({
      soHieu: v.so_hieu as string,
      ten: v.ten as string,
      ngayHieuLuc: (v.ngay_hieu_luc as string) ?? null,
      doiTuongApDung: (v.doi_tuong_ap_dung as string) ?? null,
      tomTatDeHieu: (v.tom_tat_de_hieu as string) ?? null,
      url: (v.url_nguon as string) ?? null,
      /*
       * `legal_documents` chưa có cột quốc gia — bảng sinh ra cho luật Việt Nam
       * và mọi dòng hiện có đều là VN. Để mặc định thay vì đoán. Khi nạp văn
       * bản nước ngoài thì thêm cột, không suy từ số hiệu.
       */
    }));

    // ── TONG_HOP ────────────────────────────────────────────────────────────
    const boiCanh = tongHop([
      ...bangChungThiTruong(gia),
      ...bangChungViMo(tin),
      ...bangChungPhapLy(vanBan),
    ]);

    return json({
      boiCanh,
      gia,
      chuoi,
      /*
       * Sự cố đi kèm câu trả lời, không thay thế nó.
       *
       * Một sàn chết thì phần còn lại vẫn dùng được, nhưng người đọc phải biết
       * là đang thiếu nguồn nào — nếu không, "chỉ một sàn trả lời" trông y hệt
       * "hai sàn khớp nhau".
       */
      suCo,
      luc: new Date().toISOString(),
    });
  } catch (e) {
    console.error("thi-truong-so:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
