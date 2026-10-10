/**
 * Cổng HTTP tại máy của bộ chạy — chỉ cho web MIMI đã ghép nối nói chuyện.
 *
 * An toàn (không coi CORS là đủ):
 *   - chỉ bind 127.0.0.1 (không 0.0.0.0, không localhost IPv6 lẫn lộn);
 *   - Host phải là 127.0.0.1:<cổng> hoặc localhost:<cổng> → chặn DNS rebinding;
 *   - Origin phải nằm trong danh sách web MIMI → trang lạ không gọi được, kể cả khi trình duyệt không áp CORS;
 *   - ghép nối bằng mã 6 số hiện ở cửa sổ bộ chạy, dùng một lần, hết hạn 10 phút, sai 5 lần là khoá; được mã → token
 *     ngẫu nhiên 32 byte, gắn với Origin, hết hạn 8 giờ, thu hồi được (`/huy-ghep` hoặc tắt bộ chạy);
 *   - mỗi yêu cầu có token phải kèm nonce + thời điểm (±60 giây), nonce dùng lại là từ chối → chống phát lại;
 *   - không mở cổng gỡ lỗi trình duyệt, không có MCP; trình duyệt chạy qua pipe.
 * Không bao giờ nhận hay trả cookie, mật khẩu, OTP, khoá ký. JWT của MIMI chỉ giữ trong bộ nhớ của phiên.
 */
import http from 'node:http';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export interface CauHinhCong {
  cong: number;
  originChoPhep: string[];
  bayGio?: () => number;
}

export interface Ghep { token: string; origin: string; hetHan: number }

export type XuLy = (o: { duong: string; phuongThuc: string; than: unknown; origin: string }) => Promise<{ ma: number; than: unknown }>;

const HET_HAN_MA_MS = 10 * 60_000;
const HET_HAN_TOKEN_MS = 8 * 3600_000;
const LECH_GIO_MS = 60_000;

export class CongTaiMay {
  maGhep: string;
  private maHetHan: number;
  private saiMa = 0;
  ghep: Ghep | null = null;
  private nonce = new Map<string, number>();
  private may: http.Server | null = null;
  private bayGio: () => number;

  constructor(private ch: CauHinhCong, private xuLy: XuLy) {
    this.bayGio = ch.bayGio ?? Date.now;
    this.maGhep = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.maHetHan = this.bayGio() + HET_HAN_MA_MS;
  }

  /** Tạo mã ghép mới (thu hồi ghép cũ). */
  maMoi(): string {
    this.ghep = null;
    this.saiMa = 0;
    this.maGhep = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.maHetHan = this.bayGio() + HET_HAN_MA_MS;
    return this.maGhep;
  }

  huyGhep() { this.ghep = null; }

  /** Kiểm Host + Origin. Trả lý do từ chối hoặc null. */
  kiemNguon(host: string | undefined, origin: string | undefined): string | null {
    const hopLe = [`127.0.0.1:${this.ch.cong}`, `localhost:${this.ch.cong}`];
    if (!host || !hopLe.includes(host)) return 'Host không hợp lệ.';
    if (!origin || !this.ch.originChoPhep.includes(origin)) return 'Origin không được phép.';
    return null;
  }

  /** Ghép nối bằng mã. */
  thuGhep(ma: unknown, origin: string): { ok: true; token: string; het_han: number } | { ok: false; ly_do: string } {
    if (this.saiMa >= 5) return { ok: false, ly_do: 'Sai mã quá 5 lần — tắt và mở lại bộ chạy để có mã mới.' };
    if (this.bayGio() > this.maHetHan) return { ok: false, ly_do: 'Mã ghép đã hết hạn — bấm "Mã mới" trong cửa sổ bộ chạy.' };
    const s = String(ma ?? '');
    if (!/^\d{6}$/.test(s) || !timingSafeEqual(Buffer.from(s), Buffer.from(this.maGhep))) { this.saiMa++; return { ok: false, ly_do: 'Mã ghép không đúng.' }; }
    // Mã dùng một lần.
    this.maHetHan = 0;
    const token = randomBytes(32).toString('base64url');
    const hetHan = this.bayGio() + HET_HAN_TOKEN_MS;
    this.ghep = { token, origin, hetHan };
    return { ok: true, token, het_han: hetHan };
  }

  /** Kiểm token + nonce cho một yêu cầu. */
  kiemYeuCau(authorization: string | undefined, origin: string, nonce: string | undefined, thoiDiem: string | undefined): string | null {
    const g = this.ghep;
    if (!g) return 'Chưa ghép nối.';
    if (this.bayGio() > g.hetHan) { this.ghep = null; return 'Ghép nối đã hết hạn — ghép lại.'; }
    if (origin !== g.origin) return 'Origin khác lúc ghép.';
    const tk = (authorization ?? '').replace(/^Bearer\s+/i, '');
    const a = Buffer.from(tk); const b = Buffer.from(g.token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return 'Token không đúng.';
    if (!nonce || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return 'Thiếu nonce.';
    const t = Number(thoiDiem);
    if (!Number.isFinite(t) || Math.abs(this.bayGio() - t) > LECH_GIO_MS) return 'Thời điểm yêu cầu lệch quá 60 giây.';
    // Dọn nonce cũ, rồi chặn nonce đã thấy.
    for (const [k, v] of this.nonce) if (this.bayGio() - v > 2 * LECH_GIO_MS) this.nonce.delete(k);
    if (this.nonce.has(nonce)) return 'Yêu cầu bị phát lại (nonce đã dùng).';
    this.nonce.set(nonce, this.bayGio());
    return null;
  }

  private tieuDeCors(origin: string | undefined): Record<string, string> {
    if (!origin || !this.ch.originChoPhep.includes(origin)) return {};
    return {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, content-type, x-mimi-nonce, x-mimi-thoi-diem',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      // Trình duyệt hỏi trước khi trang https gọi vào mạng riêng (Private Network Access).
      'Access-Control-Allow-Private-Network': 'true',
    };
  }

  batDau(): Promise<void> {
    this.may = http.createServer(async (req, res) => {
      const origin = req.headers.origin;
      const tra = (ma: number, than: unknown) => {
        res.writeHead(ma, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...this.tieuDeCors(origin) });
        res.end(JSON.stringify(than));
      };
      const tuChoi = this.kiemNguon(req.headers.host, origin);
      if (tuChoi) return tra(403, { loi: tuChoi });
      if (req.method === 'OPTIONS') { res.writeHead(204, this.tieuDeCors(origin)); return res.end(); }

      const duong = (req.url ?? '/').split('?')[0];
      let than: unknown = null;
      if (req.method === 'POST') {
        const manh: Buffer[] = []; let co = 0;
        for await (const m of req) { co += (m as Buffer).length; if (co > 64 * 1024) return tra(413, { loi: 'Quá lớn.' }); manh.push(m as Buffer); }
        try { than = manh.length ? JSON.parse(Buffer.concat(manh).toString('utf8')) : {}; } catch { return tra(400, { loi: 'Không phải JSON.' }); }
      }

      if (duong === '/trang-thai' && req.method === 'GET') {
        return tra(200, { ten: 'MIMI Điền hộ', da_ghep: !!this.ghep && this.ghep.origin === origin });
      }
      if (duong === '/ghep' && req.method === 'POST') {
        const r = this.thuGhep((than as { ma?: unknown })?.ma, origin as string);
        return r.ok ? tra(200, { token: r.token, het_han: r.het_han }) : tra(403, { loi: r.ly_do });
      }
      const loiYc = this.kiemYeuCau(req.headers.authorization, origin as string, req.headers['x-mimi-nonce'] as string | undefined, req.headers['x-mimi-thoi-diem'] as string | undefined);
      if (loiYc) return tra(401, { loi: loiYc });
      if (duong === '/huy-ghep' && req.method === 'POST') { this.huyGhep(); return tra(200, { ok: true }); }
      try {
        const r = await this.xuLy({ duong, phuongThuc: req.method ?? 'GET', than, origin: origin as string });
        return tra(r.ma, r.than);
      } catch (e) {
        return tra(500, { loi: e instanceof Error ? e.message.split('\n')[0] : 'Lỗi bộ chạy.' });
      }
    });
    return new Promise((ok, loi) => {
      this.may!.once('error', loi);
      this.may!.listen(this.ch.cong, '127.0.0.1', () => ok());
    });
  }

  dong(): Promise<void> {
    return new Promise((ok) => (this.may ? this.may.close(() => ok()) : ok()));
  }
}
