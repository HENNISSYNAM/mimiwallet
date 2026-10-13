import type { Browser, BrowserContext, Locator, Page } from 'playwright-core';
import { DICH_CAM } from '../src/lib/dienCong/hopDong.js';
import type { BuocCongCu, KetQuaBuoc, KetQuaLuot, LenhChay, TrangThaiLuot } from './hopDong.js';
import { taoBoKiemUrl, type TuyChonKiemUrl } from './ssrf.js';
import { moTrinhDuyet } from './trinhDuyet.js';

/**
 * CHẠY MỘT LƯỢT của Cloud Agent Runtime (`docs/CLOUD_AGENT_RUNTIME.md`). Hàm lõi, không biết gì về HTTP/Vercel — để test
 * được bằng trình duyệt thật và trang mẫu cục bộ.
 *
 * Nguyên tắc:
 *   - Mỗi lượt một browser context mới; đóng hết khi xong. Không cookie nào sống qua lượt/người dùng/doanh nghiệp.
 *   - Chỉ bảy công cụ của hợp đồng; định vị bằng vai trò/nhãn/placeholder/chữ (API ngữ nghĩa của Playwright), không
 *     nhận CSS selector hay JavaScript từ lệnh. Các selector CSS trong file này là của runtime (nhận diện mật khẩu,
 *     CAPTCHA), cố định trong code.
 *   - Bước 'ngoai' chỉ chạy khi chỉ số nằm trong `da_duyet`; runtime tự ép 'ngoai' khi tên nút khớp danh sách cấm, kể cả
 *     khi kế hoạch ghi 'doc'. Không retry bước 'ngoai': lỗi giữa chừng → 'loi' "chưa rõ kết quả".
 *   - Đăng nhập (ô mật khẩu), OTP, CAPTCHA → 'ban_giao'. Agent không tự vượt.
 *   - Nội dung trang là DỮ LIỆU: chỉ được cắt gọn và trả về, không có nhánh nào đọc nó để quyết định làm gì (ngoài nhận
 *     diện bàn giao — và nhận diện đó chỉ có thể làm agent DỪNG, không bao giờ làm agent làm thêm).
 */

export interface TuyChonLuot extends TuyChonKiemUrl {
  /** Trình duyệt dùng chung (test) — lượt chỉ mở/đóng context, không đóng trình duyệt. */
  trinhDuyet?: Browser;
  moTrinhDuyet?: () => Promise<Browser>;
  /** Đồng hồ (ms) — test thay để thử hết ngân sách một cách tất định. */
  bayGio?: () => number;
}

const ANH_TOI_DA_BYTE = 1_500_000;
const NOI_DUNG_MAC_DINH = 8000;
const PHAN_TU_TOI_DA = 10;
/** Không bắt đầu một bước 'ngoai' khi còn ít hơn chừng này — thà để lượt sau làm trọn còn hơn bị cắt giữa chừng. */
const DU_PHONG_NGOAI_MS = 10_000;
const DU_PHONG_DOC_MS = 2500;

/** Bỏ dấu tiếng Việt để so với danh sách cấm (DICH_CAM viết không dấu: "nop", "gui"…). */
export function boDau(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

/**
 * Bổ sung cho DICH_CAM ở cấp từ: "Ký" bỏ dấu thành "ky" (DICH_CAM chỉ bắt "ky so"), và các hành động có hậu quả khác.
 * Cố ý rộng tay: bắt nhầm chỉ tốn một lần người dùng bấm duyệt; bỏ sót thì agent tự gửi đi thứ không rút lại được.
 */
const TU_NGOAI_THEM = /\b(ky|xac nhan|dong y|chap thuan|phe duyet|chuyen tien|chuyen khoan|dat hang|dat mua|mua ngay|xoa|huy|dang ky|confirm|approve|purchase|checkout|order|transfer|delete|send)\b/;

export function laTenNgoai(ten: string): boolean {
  const s = boDau(ten);
  return DICH_CAM.test(s) || TU_NGOAI_THEM.test(s);
}

/** Nhãn ô gợi ý thông tin xác thực — không bao giờ điền, bàn giao người dùng. */
const NHAN_XAC_THUC = /mat khau|password|passcode|\botp\b|ma xac (thuc|nhan)|captcha|ma pin|\bpin\b/;

const CHU_BAN_GIAO = /captcha|toi khong phai (la )?nguoi may|i'?m not a robot|verify (that )?you are (a )?human|\botp\b|one[- ]time (password|code)/;

async function phatHienBanGiao(page: Page): Promise<string | null> {
  const dem = (sel: string, chiHienThi = true) =>
    (chiHienThi ? page.locator(sel).filter({ visible: true }) : page.locator(sel)).count().catch(() => 0);
  if (await dem('input[type="password" i]')) return 'Trang yêu cầu mật khẩu (đăng nhập) — cần người dùng tự làm.';
  if (await dem('input[autocomplete="one-time-code" i]')) return 'Trang yêu cầu mã OTP — cần người dùng tự làm.';
  const captcha =
    'iframe[src*="recaptcha" i], iframe[src*="hcaptcha" i], iframe[src*="turnstile" i], iframe[src*="challenges.cloudflare" i], ' +
    'iframe[src*="captcha" i], iframe[title*="captcha" i], .g-recaptcha, .h-captcha, .cf-turnstile, [data-sitekey], ' +
    'img[src*="captcha" i], img[alt*="captcha" i], input[name*="captcha" i], input[id*="captcha" i]';
  if (await dem(captcha, false)) return 'Trang có CAPTCHA — cần người dùng tự làm.';
  const chu = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
  if (CHU_BAN_GIAO.test(boDau(chu.slice(0, 20_000)))) return 'Trang yêu cầu CAPTCHA/OTP — cần người dùng tự làm.';
  return null;
}

function moTaLoi(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/ERR_BLOCKED_BY_CLIENT/.test(m)) return 'Điều hướng/chuyển hướng tới địa chỉ ngoài phạm vi được phép — đã chặn.';
  if (/Timeout|timeout/.test(m)) return 'Quá thời gian chờ trang.';
  return m.split('\n')[0].slice(0, 300);
}

export async function chayLuot(lenh: LenhChay, tc: TuyChonLuot = {}): Promise<KetQuaLuot> {
  const bayGio = tc.bayGio ?? Date.now;
  const batDau = bayGio();
  const conLai = () => lenh.ngan_sach_ms - (bayGio() - batDau);
  const hanBuoc = () => Math.max(1000, Math.min(15_000, conLai() - 1000));
  const kiem = taoBoKiemUrl(lenh.mien_cho_phep, tc);
  const daDuyet = new Set(lenh.da_duyet);
  const ket: KetQuaBuoc[] = [];
  let trinhDuyet: Browser | undefined;
  let ctx: BrowserContext | undefined;
  let page: Page | undefined;
  let soRequestBiChan = 0;

  const urlHienTai = () => {
    const u = page?.url() ?? '';
    return /^https?:/i.test(u) ? u : null;
  };
  const ketThuc = (trang_thai: TrangThaiLuot, buoc_tiep: number, loi?: string): KetQuaLuot => ({
    nhiem_vu_id: lenh.nhiem_vu_id,
    trang_thai,
    buoc_tiep,
    url_hien_tai: urlHienTai(),
    ket_qua_buoc: ket,
    ...(loi ? { loi } : {}),
  });

  /** Điều hướng có kiểm: URL đích, rồi URL cuối sau chuyển hướng. Trả lý do lỗi hoặc dữ liệu trang. */
  const diToi = async (url: string): Promise<{ loi: string } | { url: string; tieu_de: string; ma_http: number | null }> => {
    const lyDo = await kiem(url);
    if (lyDo) return { loi: lyDo };
    let ma: number | null = null;
    try {
      const r = await page!.goto(url, { waitUntil: 'domcontentloaded', timeout: hanBuoc() });
      ma = r?.status() ?? null;
    } catch (e) {
      return { loi: moTaLoi(e) };
    }
    const cuoi = page!.url();
    const lyDoCuoi = await kiem(cuoi);
    if (lyDoCuoi) return { loi: `Trang chuyển hướng ra ngoài phạm vi: ${lyDoCuoi}` };
    return { url: cuoi, tieu_de: (await page!.title().catch(() => '')).slice(0, 300), ma_http: ma };
  };

  try {
    trinhDuyet = tc.trinhDuyet ?? (await (tc.moTrinhDuyet ?? moTrinhDuyet)());
    ctx = await trinhDuyet.newContext({
      serviceWorkers: 'block', // service worker đi vòng qua route — chặn để mọi request đều bị kiểm
      acceptDownloads: false,
      viewport: { width: 1280, height: 800 },
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh',
    });
    await ctx.route('**/*', async (route) => {
      const url = route.request().url();
      if (/^(data|blob|about):/i.test(url)) return route.continue();
      const lyDo = await kiem(url);
      if (lyDo) {
        soRequestBiChan++;
        return route.abort('blockedbyclient');
      }
      // Thử thật (test "chuyển hướng ra ngoài") cho thấy Chromium tự theo chuyển hướng mà KHÔNG gọi lại `route` cho
      // chặng sau — request tới đích chuyển hướng đã đi trước khi ta kịp kiểm URL cuối (SSRF mù). Vì vậy runtime tự
      // thực hiện request với maxRedirects: 0, kiểm `Location` rồi mới trả 3xx cho trình duyệt; trình duyệt theo chặng
      // mới thì đó là một request mới, lại qua `route` này.
      let phanHoi;
      try {
        phanHoi = await route.fetch({ maxRedirects: 0, timeout: Math.max(1000, Math.min(15_000, conLai())) });
      } catch {
        return route.abort('failed').catch(() => {});
      }
      const vitri = phanHoi.status() >= 300 && phanHoi.status() < 400 ? phanHoi.headers()['location'] : undefined;
      if (vitri) {
        let dich: string;
        try {
          dich = new URL(vitri, url).toString();
        } catch {
          return route.abort('blockedbyclient');
        }
        if (await kiem(dich)) {
          soRequestBiChan++;
          return route.abort('blockedbyclient');
        }
      }
      return route.fulfill({ response: phanHoi }).catch(() => {});
    });
    // WebSocket không qua `route` — không trang nào ta cần đọc phải có WebSocket; đóng hết.
    await ctx.routeWebSocket(/.*/, (ws) => ws.close());
    page = await ctx.newPage();
    // Popup/tab mới: không theo — đóng ngay để agent chỉ có một trang, đúng một URL đã kiểm.
    ctx.on('page', (p) => {
      if (p !== page) void p.close().catch(() => {});
    });

    if (lenh.url_bat_dau) {
      const r = await diToi(lenh.url_bat_dau);
      if ('loi' in r) return ketThuc('loi', lenh.tu_buoc, `Không mở lại được trang đang dở: ${r.loi}`);
      const bg = await phatHienBanGiao(page);
      if (bg) return ketThuc('ban_giao', lenh.tu_buoc, bg);
    }

    for (let i = lenh.tu_buoc; i < lenh.buoc.length; i++) {
      const b = lenh.buoc[i];
      const keHoachNgoai = b.cong_cu === 'nhan' && b.tac_dong === 'ngoai';
      if (conLai() < (keHoachNgoai ? DU_PHONG_NGOAI_MS : DU_PHONG_DOC_MS)) return ketThuc('tiep', i);
      const t0 = bayGio();
      const ghi = (kq: Omit<KetQuaBuoc, 'buoc' | 'cong_cu' | 'ms'>) =>
        ket.push({ buoc: i, cong_cu: b.cong_cu, ms: Math.max(0, bayGio() - t0), ...kq });

      const r = await chayBuoc(page, b, i);
      if (r.loai === 'ok') {
        ghi({ tac_dong: r.tac_dong, ok: true, du_lieu: r.du_lieu });
        if (r.kiemBanGiao) {
          const bg = await phatHienBanGiao(page);
          if (bg) return ketThuc('ban_giao', i + 1, bg);
        }
        continue;
      }
      if (r.loai === 'cho_duyet') {
        ghi({ tac_dong: 'ngoai', ok: false, du_lieu: r.du_lieu, loi: 'Chưa chạy — chờ người dùng duyệt.' });
        return ketThuc('cho_duyet', i, r.ly_do);
      }
      if (r.loai === 'het_gio') return ketThuc('tiep', i);
      if (r.loai === 'ban_giao') {
        ghi({ tac_dong: 'doc', ok: false, loi: 'Chưa chạy — cần người dùng.' });
        return ketThuc('ban_giao', i, r.ly_do);
      }
      ghi({ tac_dong: r.tac_dong, ok: false, loi: r.loi });
      return ketThuc('loi', i, r.loi);
    }
    return ketThuc('xong', lenh.buoc.length);
  } catch (e) {
    return ketThuc('loi', ket.length ? ket[ket.length - 1].buoc : lenh.tu_buoc, `Runtime lỗi: ${moTaLoi(e)}`);
  } finally {
    await ctx?.close().catch(() => {});
    if (trinhDuyet && !tc.trinhDuyet) await trinhDuyet.close().catch(() => {});
  }

  type KetQuaChayBuoc =
    | { loai: 'ok'; tac_dong: 'doc' | 'ngoai'; du_lieu?: unknown; kiemBanGiao?: boolean }
    | { loai: 'loi'; tac_dong: 'doc' | 'ngoai'; loi: string }
    | { loai: 'cho_duyet'; ly_do: string; du_lieu: unknown }
    | { loai: 'ban_giao'; ly_do: string }
    | { loai: 'het_gio' };

  async function chayBuoc(p: Page, b: BuocCongCu, i: number): Promise<KetQuaChayBuoc> {
    try {
      switch (b.cong_cu) {
        case 'mo_trang': {
          const r = await diToi(b.url);
          if ('loi' in r) return { loai: 'loi', tac_dong: 'doc', loi: r.loi };
          return { loai: 'ok', tac_dong: 'doc', du_lieu: r, kiemBanGiao: true };
        }
        case 'doc_noi_dung': {
          const chu = await p.locator('body').innerText({ timeout: hanBuoc() });
          const toiDa = b.toi_da_ky_tu ?? NOI_DUNG_MAC_DINH;
          return { loai: 'ok', tac_dong: 'doc', du_lieu: { noi_dung: chu.slice(0, toiDa), bi_cat: chu.length > toiDa, tong_ky_tu: chu.length } };
        }
        case 'lay_url_tieu_de':
          return { loai: 'ok', tac_dong: 'doc', du_lieu: { url: urlHienTai(), tieu_de: (await p.title()).slice(0, 300) } };
        case 'chup_man_hinh': {
          const anh = await p.screenshot({ type: 'png', fullPage: false, timeout: hanBuoc() });
          if (anh.length > ANH_TOI_DA_BYTE) return { loai: 'loi', tac_dong: 'doc', loi: `Ảnh ${anh.length} byte vượt giới hạn.` };
          return { loai: 'ok', tac_dong: 'doc', du_lieu: { png_base64: anh.toString('base64'), byte: anh.length } };
        }
        case 'tim_phan_tu': {
          let loc: Locator;
          if (b.vai_tro) loc = p.getByRole(b.vai_tro, b.ten ? { name: b.ten } : undefined);
          else if (b.nhan) loc = p.getByLabel(b.nhan);
          else if (b.ten) loc = p.getByRole('button', { name: b.ten }).or(p.getByRole('link', { name: b.ten }));
          else loc = p.getByText(b.chu!);
          if (b.chu && (b.vai_tro || b.nhan || b.ten)) loc = loc.filter({ hasText: b.chu });
          const tong = await loc.count();
          const phan_tu: { the: string; vai_tro: string | null; chu: string; hien_thi: boolean }[] = [];
          for (let k = 0; k < Math.min(tong, PHAN_TU_TOI_DA); k++) {
            const el = loc.nth(k);
            const mo = await el.evaluate((e: HTMLElement) => ({
              the: e.tagName.toLowerCase(),
              vai_tro: e.getAttribute('role'),
              // Không bao giờ trả giá trị ô mật khẩu.
              chu: (e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || '').slice(0, 200),
            }), undefined, { timeout: 2000 });
            phan_tu.push({ ...mo, hien_thi: await el.isVisible() });
          }
          return { loai: 'ok', tac_dong: 'doc', du_lieu: { tong, phan_tu } };
        }
        case 'dien': {
          if (NHAN_XAC_THUC.test(boDau(b.nhan))) return { loai: 'ban_giao', ly_do: `Ô "${b.nhan}" là thông tin xác thực — người dùng tự nhập.` };
          const loc = p.getByLabel(b.nhan).or(p.getByPlaceholder(b.nhan)).first();
          await loc.waitFor({ state: 'visible', timeout: Math.min(5000, hanBuoc()) });
          const o = await loc.evaluate((e: HTMLInputElement) => ({ kieu: (e.type || '').toLowerCase(), ac: (e.autocomplete || '').toLowerCase() }));
          if (o.kieu === 'password' || o.ac === 'one-time-code' || o.ac.includes('password'))
            return { loai: 'ban_giao', ly_do: `Ô "${b.nhan}" là mật khẩu/OTP — người dùng tự nhập.` };
          await loc.fill(b.gia_tri, { timeout: hanBuoc() });
          // Không trả lại giá trị đã điền: nhật ký Orchestrator che giá trị, runtime không làm lộ thêm đường nào.
          return { loai: 'ok', tac_dong: 'doc', du_lieu: { nhan: b.nhan, so_ky_tu: b.gia_tri.length } };
        }
        case 'nhan': {
          const loc = p
            .getByRole('button', { name: b.ten })
            .or(p.getByRole('link', { name: b.ten }))
            .or(p.getByRole('menuitem', { name: b.ten }))
            .or(p.getByRole('tab', { name: b.ten }))
            .first();
          await loc.waitFor({ state: 'visible', timeout: Math.min(5000, hanBuoc()) });
          // Tên kế hoạch khớp CHUỖI CON tên thật ("Tiếp" khớp "Tiếp tục và nộp") → phải xét cả tên thật của phần tử.
          const tt = await loc.evaluate((e: HTMLElement) => {
            const nut = e as HTMLButtonElement;
            const chu = [e.innerText, e.getAttribute('aria-label'), e.getAttribute('title'), (nut as HTMLInputElement).value]
              .filter(Boolean).join(' ').slice(0, 300);
            const laSubmit = (nut.type || '').toLowerCase() === 'submit';
            const form = nut.form ?? null;
            return { chu, guiFormPost: laSubmit && !!form && (form.getAttribute('method') || '').toLowerCase() === 'post' };
          });
          const ngoai = b.tac_dong === 'ngoai' || laTenNgoai(b.ten) || laTenNgoai(tt.chu) || tt.guiFormPost;
          if (ngoai && !daDuyet.has(i)) {
            const vi = b.tac_dong === 'ngoai' ? 'kế hoạch ghi có tác động bên ngoài' : 'runtime nhận diện nút có tác động bên ngoài';
            return { loai: 'cho_duyet', ly_do: `Bước ${i} bấm "${tt.chu || b.ten}": ${vi} — chờ người dùng duyệt.`, du_lieu: { ten_thuc_te: tt.chu, gui_form_post: tt.guiFormPost } };
          }
          if (ngoai && conLai() < DU_PHONG_NGOAI_MS) return { loai: 'het_gio' };
          try {
            await loc.click({ timeout: Math.min(5000, hanBuoc()) });
          } catch (e) {
            if (ngoai) return { loai: 'loi', tac_dong: 'ngoai', loi: `Bấm "${tt.chu || b.ten}" lỗi giữa chừng — chưa rõ kết quả, KHÔNG thử lại. (${moTaLoi(e)})` };
            throw e;
          }
          await p.waitForLoadState('domcontentloaded', { timeout: Math.min(10_000, hanBuoc()) }).catch(() => {});
          const u = p.url();
          if (/^https?:/i.test(u)) {
            const lyDo = await kiem(u);
            if (lyDo) return { loai: 'loi', tac_dong: ngoai ? 'ngoai' : 'doc', loi: `Sau khi bấm, trang ra ngoài phạm vi: ${lyDo}` };
          }
          return { loai: 'ok', tac_dong: ngoai ? 'ngoai' : 'doc', du_lieu: { ten_thuc_te: tt.chu, url: urlHienTai(), so_request_bi_chan: soRequestBiChan }, kiemBanGiao: true };
        }
      }
      return { loai: 'loi', tac_dong: 'doc', loi: 'Công cụ không có trong hợp đồng.' };
    } catch (e) {
      return { loai: 'loi', tac_dong: b.cong_cu === 'nhan' && b.tac_dong === 'ngoai' ? 'ngoai' : 'doc', loi: moTaLoi(e) };
    }
  }
}
