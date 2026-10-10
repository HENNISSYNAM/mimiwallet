/**
 * MIMI Điền hộ — bộ chạy tại máy (Windows). Chạy: `mimi-dien-ho.cmd` (hoặc `node dist/mimi-dien-ho.mjs`).
 *
 * Làm đúng một việc: mở trình duyệt (Chrome hoặc Edge đã cài) với hồ sơ riêng của MIMI, để người dùng đăng nhập cổng
 * và mở đúng trang biểu mẫu; khi web MIMI yêu cầu, điền một bản nháp ĐÃ ĐƯỢC MÁY CHỦ KIỂM vào tab người dùng chọn, đọc
 * lại, đối chiếu và bàn giao. Không ký, không nộp, không nhập OTP, không vượt CAPTCHA, không thanh toán.
 *
 * Không cần quyền admin, không tự chạy cùng máy, không ghi registry. Gỡ: xoá thư mục cài và %LOCALAPPDATA%\MIMI\dien-ho.
 */
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { CongTaiMay } from './mayChu';
import { PhienDien, type MayChuMimi } from './thucThi';
import { NhiemVuSchema } from '../../src/lib/dienCong/hopDong';

const PHIEN_BAN = '0.1.0';
const CONG = Number(process.env.MIMI_DIEN_HO_CONG ?? 47321);
const SUPABASE_URL = process.env.MIMI_SUPABASE_URL ?? 'https://xzymxgdavepvygdcmfup.supabase.co';
const SUPABASE_KEY = process.env.MIMI_SUPABASE_KEY ?? 'sb_publishable_r4reA2kLO6rzvF5EgkaYfg_Fz3UQBBt';
const ORIGIN = (process.env.MIMI_ORIGIN ?? 'https://www.mimiwallet.online').split(',').map((s) => s.trim()).filter(Boolean);
const THU_MUC = join(process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local'), 'MIMI', 'dien-ho');

let ctx: BrowserContext | null = null;
const maTab = new WeakMap<Page, string>();
let demTab = 0;
let phien: PhienDien | null = null;
let jwtPhien: string | null = null;
let phienId: string | null = null;
let congTyId: string | null = null;

const idTab = (p: Page) => { let m = maTab.get(p); if (!m) { m = `t${++demTab}`; maTab.set(p, m); } return m; };

async function goiToKhai(hanhDong: string, du: Record<string, unknown>) {
  if (!jwtPhien) throw new Error('Chưa có phiên đăng nhập MIMI cho lần điền này.');
  const r = await fetch(`${SUPABASE_URL}/functions/v1/to-khai`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwtPhien}`, apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hanh_dong: hanhDong, company_id: congTyId, ...du }),
  });
  const than = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof than?.error === 'string' ? than.error : `Máy chủ MIMI trả lỗi ${r.status}.`);
  return than;
}

const mayChuMimi: MayChuMimi = {
  async kiemNhiemVu() {
    const r = await goiToKhai('dien_nhiem_vu', { phien_id: phienId });
    if (!r.ok) return { ok: false, loi: Array.isArray(r.loi) ? r.loi : ['Máy chủ từ chối.'] };
    const p = NhiemVuSchema.safeParse(r.nhiem_vu);
    if (!p.success) return { ok: false, loi: ['Nhiệm vụ máy chủ trả về không đúng khuôn.'] };
    if (p.data.id !== phienId) return { ok: false, loi: ['Nhiệm vụ không khớp phiên.'] };
    return { ok: true, nhiem_vu: p.data };
  },
  async ghi(dong, trangThai, ketQua) {
    await goiToKhai('dien_ghi', {
      phien_id: phienId,
      dong: dong.map(({ luc: _l, ...d }) => d),
      ...(trangThai ? { trang_thai: trangThai } : {}),
      ...(ketQua ? { ket_qua: ketQua } : {}),
    });
  },
};

async function moTrinhDuyet(kenh: string) {
  if (ctx) return;
  if (!['chrome', 'msedge'].includes(kenh)) throw new Error('Chỉ hỗ trợ Chrome hoặc Edge.');
  const hoSo = join(THU_MUC, `trinh-duyet-${kenh}`);
  mkdirSync(hoSo, { recursive: true });
  // Pipe, không mở cổng gỡ lỗi TCP. Hồ sơ trình duyệt chỉ nằm trên máy này — không vào bản sao lưu MIMI.
  ctx = await chromium.launchPersistentContext(hoSo, { channel: kenh, headless: false, viewport: null });
  ctx.on('close', () => { ctx = null; phien?.dung('Trình duyệt đã đóng.'); });
  if (!ctx.pages().length) await ctx.newPage();
}

const XU_LY = async ({ duong, phuongThuc, than }: { duong: string; phuongThuc: string; than: unknown }) => {
  const b = (than ?? {}) as Record<string, unknown>;
  if (duong === '/mo-trinh-duyet' && phuongThuc === 'POST') { await moTrinhDuyet(String(b.kenh ?? 'chrome')); return { ma: 200, than: { ok: true } }; }
  if (duong === '/tab' && phuongThuc === 'GET') {
    if (!ctx) return { ma: 200, than: { tab: [], trinh_duyet_mo: false } };
    const tab = ctx.pages().map((p) => {
      let o = ''; try { const u = new URL(p.url()); o = `${u.origin}${u.pathname}`; } catch { o = p.url(); }
      return { ma: idTab(p), dia_chi: o.slice(0, 200) };
    });
    // Tiêu đề trang chỉ để người dùng nhận ra tab — là chữ của trang, không phải lệnh.
    for (const t of tab) { const p = ctx.pages().find((x) => idTab(x) === t.ma); (t as Record<string, unknown>).tieu_de = ((await p?.title().catch(() => '')) ?? '').slice(0, 120); }
    return { ma: 200, than: { tab, trinh_duyet_mo: true } };
  }
  if (duong === '/phien/bat-dau' && phuongThuc === 'POST') {
    if (!ctx) return { ma: 409, than: { loi: 'Chưa mở trình duyệt.' } };
    if (phien && ['dang_dien'].includes(phien.trangThai)) return { ma: 409, than: { loi: 'Đang có một phiên chạy.' } };
    const page = ctx.pages().find((p) => idTab(p) === String(b.tab_ma ?? ''));
    if (!page) return { ma: 404, than: { loi: 'Không thấy tab đã chọn — có thể tab đã đóng.' } };
    jwtPhien = typeof b.jwt === 'string' ? b.jwt : null;
    phienId = typeof b.phien_id === 'string' ? b.phien_id : null;
    congTyId = typeof b.cong_ty_id === 'string' ? b.cong_ty_id : null;
    const kt = await mayChuMimi.kiemNhiemVu();
    if (!kt.ok) return { ma: 409, than: { loi: kt.loi.join(' ') } };
    phien?.dong();
    phien = new PhienDien(kt.nhiem_vu, ctx, page, mayChuMimi);
    void phien.chay();
    return { ma: 202, than: { ok: true } };
  }
  if (duong === '/phien' && phuongThuc === 'GET') {
    if (!phien) return { ma: 200, than: { trang_thai: 'khong_co' } };
    return { ma: 200, than: {
      trang_thai: phien.trangThai, thong_diep: phien.thongDiep, ket_qua: phien.ketQua,
      nhat_ky: phien.nhatKy.slice(-40).map(({ ma_bam_gia_tri: _m, ...d }) => d),
    } };
  }
  if (duong === '/phien/dung' && phuongThuc === 'POST') { phien?.dung(); return { ma: 200, than: { ok: true } }; }
  if (duong === '/phien/tiep-tuc' && phuongThuc === 'POST') {
    if (!phien || phien.trangThai !== 'tam_dung') return { ma: 409, than: { loi: 'Không có phiên đang tạm dừng.' } };
    if (typeof b.jwt === 'string') jwtPhien = b.jwt;
    void phien.chay();
    return { ma: 202, than: { ok: true } };
  }
  if (duong === '/phien/ban-giao' && phuongThuc === 'POST') {
    if (!phien) return { ma: 409, than: { loi: 'Không có phiên.' } };
    await phien.banGiao();
    jwtPhien = null;
    return { ma: 200, than: { ok: true } };
  }
  if (duong === '/dong-trinh-duyet' && phuongThuc === 'POST') { phien?.dong(); await ctx?.close(); ctx = null; return { ma: 200, than: { ok: true } }; }
  return { ma: 404, than: { loi: 'Không có đường này.' } };
};

const cong = new CongTaiMay({ cong: CONG, originChoPhep: ORIGIN }, XU_LY);

async function main() {
  try {
    await cong.batDau();
  } catch (e) {
    console.error(`Không mở được cổng 127.0.0.1:${CONG} (${e instanceof Error ? e.message : e}). Có thể bộ chạy đang mở ở cửa sổ khác.`);
    process.exit(1);
  }
  console.log(`MIMI Điền hộ ${PHIEN_BAN} — đang chạy tại 127.0.0.1:${CONG} (chỉ máy này).`);
  console.log(`Cho phép web: ${ORIGIN.join(', ')}`);
  console.log(`\n  MÃ GHÉP NỐI: ${cong.maGhep}   (nhập vào MIMI trong 10 phút, dùng một lần)\n`);
  console.log('Gõ "m" + Enter để lấy mã mới (thu hồi ghép cũ), "q" + Enter để tắt. Đóng cửa sổ này cũng là tắt.');
  const rl = createInterface({ input: process.stdin });
  rl.on('line', async (l) => {
    const c = l.trim().toLowerCase();
    if (c === 'm') console.log(`\n  MÃ GHÉP NỐI MỚI: ${cong.maMoi()}   (ghép cũ đã bị thu hồi)\n`);
    if (c === 'q') await tat();
  });
}

async function tat() {
  phien?.dung('Bộ chạy đang tắt.');
  phien?.dong();
  await ctx?.close().catch(() => {});
  await cong.dong();
  console.log('Đã tắt MIMI Điền hộ.');
  process.exit(0);
}
process.on('SIGINT', () => void tat());

void main();
