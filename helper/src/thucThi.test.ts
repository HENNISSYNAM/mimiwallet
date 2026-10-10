// @vitest-environment node
/**
 * Tình huống bắt buộc của bộ chạy, trên TRÌNH DUYỆT THẬT (Chrome đã cài) và biểu mẫu giả có nhãn môi trường thử.
 * Chạy: MIMI_KIEM_TRINH_DUYET=1 npx vitest run helper/   (bỏ qua khi biến này không bật — máy CI không có Chrome).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { chromium, type BrowserContext, type Page } from 'playwright-core';
import http from 'node:http';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PhienDien, type MayChuMimi, type BuocNhatKy } from './thucThi';
import type { NhiemVu } from '../../src/lib/dienCong/hopDong';

const bat = process.env.MIMI_KIEM_TRINH_DUYET === '1';
const html = readFileSync(join(__dirname, '..', 'thu', 'bieu-mau-thu.html'));
let may: http.Server; let goc = ''; let ctx: BrowserContext; let hoSo = '';

const NV: NhiemVu = {
  id: '11111111-1111-4111-8111-111111111111', nguoi_dung_id: '22222222-2222-4222-8222-222222222222',
  cong_ty_id: '33333333-3333-4333-8333-333333333333', nhap_id: '44444444-4444-4444-8444-444444444444',
  ma_bam_nhap: 'a'.repeat(64), ma_bam_ke_hoach: 'b'.repeat(64), nang_luc: 'dien_bieu_mau', bo_chuyen: 'tkn-cnkd-thu',
  phien_ban_bo_chuyen: '0.1.0', origin_cho_phep: ['http://127.0.0.1:*'], het_han: new Date(Date.now() + 3600_000).toISOString(),
  khoa_chong_trung: 'khoa-chong-trung-01', chu_the: { mst: '0123456789', ten: 'Hộ thử', ky_loai: 'nam', nam: 2025 },
  truong: [
    { khoa: 'ky_loai', nhan: '[01]', kieu: 'chon', gia_tri: 'nam' },
    { khoa: 'ky_nam', nhan: 'Năm', kieu: 'chu', gia_tri: '2025' },
    { khoa: 'dd_1', nhan: 'dd1', kieu: 'danh_dau', gia_tri: 'co' },
    { khoa: 'dd_2', nhan: 'dd2', kieu: 'danh_dau', gia_tri: 'khong' },
    { khoa: 'dt_08a', nhan: '[08a]', kieu: 'so_tien', gia_tri: '800000000' },
    { khoa: 'dt_08b', nhan: '[08b]', kieu: 'so_tien', gia_tri: '12345678' },
    { khoa: 'dt_08c', nhan: '[08c]', kieu: 'so_tien', gia_tri: '0' },
    { khoa: 'dt_08d', nhan: '[08d]', kieu: 'so_tien', gia_tri: '0' },
    { khoa: 'dt_08e', nhan: '[08e]', kieu: 'so_tien', gia_tri: '0' },
    { khoa: 'dt_11', nhan: '[11]', kieu: 'so_tien', gia_tri: '812345678' },
  ],
};

/** Máy chủ MIMI giả: đếm lượt hỏi, cho chèn hành vi ở lượt thứ n (đổi bản nháp, thu hồi quyền, đóng tab…). */
function mayChuGia(hook?: (luot: number) => Promise<void> | void, tuChoiTuLuot?: number) {
  let luot = 0;
  const ghi: { dong: BuocNhatKy[]; trangThai?: string }[] = [];
  const m: MayChuMimi & { ghi_lai: typeof ghi; so_luot: () => number } = {
    async kiemNhiemVu() {
      luot++;
      await hook?.(luot);
      if (tuChoiTuLuot && luot >= tuChoiTuLuot) return { ok: false, loi: ['Bản nháp đã đổi sau khi tạo phiên.'] };
      return { ok: true, nhiem_vu: NV };
    },
    async ghi(dong, trangThai) { ghi.push({ dong, trangThai }); },
    ghi_lai: ghi,
    so_luot: () => luot,
  };
  return m;
}

async function moMau(tham = 'mst=0123456789'): Promise<Page> {
  const p = await ctx.newPage();
  await p.goto(`${goc}/?${tham}`);
  return p;
}

describe.skipIf(!bat)('bộ chạy trên trình duyệt thật — biểu mẫu giả 01/TKN-CNKD', () => {
  beforeAll(async () => {
    may = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
    await new Promise<void>((x) => may.listen(0, '127.0.0.1', () => x()));
    goc = `http://127.0.0.1:${(may.address() as { port: number }).port}`;
    hoSo = mkdtempSync(join(tmpdir(), 'mimi-kiem-'));
    ctx = await chromium.launchPersistentContext(hoSo, { channel: process.env.KENH ?? 'chrome', headless: true });
  }, 60_000);
  afterAll(async () => { await ctx?.close(); may?.close(); rmSync(hoSo, { recursive: true, force: true }); });
  beforeEach(async () => { for (const p of ctx.pages()) await p.close().catch(() => {}); });

  it('điền đủ, đọc lại khớp, bàn giao; không bấm Nộp, không nhập OTP dù trang có dòng chữ "ra lệnh"', async () => {
    const page = await moMau();
    const mc = mayChuGia();
    const ph = new PhienDien(NV, ctx, page, mc);
    await ph.chay();
    expect(ph.trangThai).toBe('da_doi_chieu');
    expect(ph.ketQua.every((k) => k.khop)).toBe(true);
    expect(await page.locator('#dt-08a').inputValue()).toBe('800.000.000');
    expect(await page.locator('#da-gui').isVisible()).toBe(false);
    expect(await page.locator('#otp').inputValue()).toBe('');
    await ph.banGiao();
    expect(ph.trangThai).toBe('ban_giao');
    expect(mc.ghi_lai.map((g) => g.trangThai).filter(Boolean)).toEqual(['dang_dien', 'da_doi_chieu', 'ban_giao']);
    // Hỏi lại máy chủ trước MỖI lượt ghi + 1 lần lúc bắt đầu. Ô đã đúng sẵn (dd_2 = không đánh dấu) thì không ghi.
    const soGhi = ph.nhatKy.filter((b) => b.hanh_dong === 'dien' || b.hanh_dong === 'chon').length;
    expect(soGhi).toBe(9);
    expect(mc.so_luot()).toBe(soGhi + 1);
    // Nhật ký không chứa giá trị thô.
    expect(JSON.stringify(mc.ghi_lai)).not.toContain('812345678');
  });

  it('mã số thuế đang đăng nhập khác hồ sơ: dừng trước khi chạm bất cứ ô nào', async () => {
    const page = await moMau('mst=9999999999');
    const ph = new PhienDien(NV, ctx, page, mayChuGia());
    await ph.chay();
    expect(ph.trangThai).toBe('dung');
    expect(ph.thongDiep).toMatch(/Mã số thuế/);
    expect(await page.locator('#ky-nam').inputValue()).toBe('');
  });

  it('trang không mang nhãn môi trường thử: bộ chuyển thử không chạy', async () => {
    const page = await moMau('mst=0123456789&nhan=0');
    const ph = new PhienDien(NV, ctx, page, mayChuGia());
    await ph.chay();
    expect(ph.trangThai).toBe('dung');
    expect(ph.thongDiep).toMatch(/nhãn môi trường/);
  });

  it('cổng tự đổi một ô sau khi điền: đối chiếu phát hiện lệch, không báo thành công', async () => {
    const page = await moMau('mst=0123456789&doi=1');
    const ph = new PhienDien(NV, ctx, page, mayChuGia());
    await ph.chay();
    expect(ph.trangThai).toBe('lech');
    expect(ph.ketQua.filter((k) => !k.khop).map((k) => k.khoa)).toEqual(['dt_08a']);
  });

  it('bản nháp đổi / quyền bị thu hồi giữa chừng: máy chủ từ chối ở lượt kế tiếp → dừng', async () => {
    const page = await moMau();
    const ph = new PhienDien(NV, ctx, page, mayChuGia(undefined, 4));
    await ph.chay();
    expect(ph.trangThai).toBe('dung');
    expect(ph.thongDiep).toMatch(/đã đổi/);
    expect(await page.locator('#dt-08a').inputValue()).toBe('');
  });

  it('tab chuyển sang trang ngoài phạm vi giữa chừng: dừng', async () => {
    const page = await moMau();
    const ph = new PhienDien(NV, ctx, page, mayChuGia(async (n) => { if (n === 3) await page.goto('data:text/html,<p>khac</p>'); }));
    await ph.chay();
    expect(['dung', 'tam_dung']).toContain(ph.trangThai);
    expect(ph.thongDiep).toMatch(/ngoài phạm vi/);
  });

  it('người dùng đóng tab giữa chừng: dừng, không treo', async () => {
    const page = await moMau();
    const ph = new PhienDien(NV, ctx, page, mayChuGia(async (n) => { if (n === 3) await page.close(); }));
    await ph.chay();
    expect(['dung', 'tam_dung', 'loi']).toContain(ph.trangThai);
  });

  it('ghi lỗi giữa chừng (ô bị khoá): đánh dấu "chưa rõ", dừng, KHÔNG thử lại', async () => {
    const page = await moMau('mst=0123456789&khoa=dt-08b');
    const ph = new PhienDien(NV, ctx, page, mayChuGia());
    await ph.chay();
    expect(ph.trangThai).toBe('dung');
    const khongRo = ph.nhatKy.filter((b) => b.ket_qua === 'khong_ro');
    expect(khongRo.map((b) => b.khoa_truong)).toEqual(['dt_08b']);
    // Không có lượt ghi nào sau ô chưa rõ.
    const sau = ph.nhatKy.slice(ph.nhatKy.indexOf(khongRo[0]) + 1).filter((b) => b.hanh_dong === 'dien' || b.hanh_dong === 'chon');
    expect(sau).toEqual([]);
  }, 60_000);

  it('dừng rồi tiếp tục: đọc lại trang, ô đã đúng không ghi lại, kết thúc khớp', async () => {
    const page = await moMau();
    let ph: PhienDien;
    const mc = mayChuGia((n) => { if (n === 4) ph.dung(); });
    ph = new PhienDien(NV, ctx, page, mc);
    await ph.chay();
    expect(ph.trangThai).toBe('tam_dung');
    const daGhi = ph.nhatKy.filter((b) => b.hanh_dong === 'dien' || b.hanh_dong === 'chon').length;
    await ph.chay();
    expect(ph.trangThai).toBe('da_doi_chieu');
    expect(ph.nhatKy.some((b) => b.hanh_dong === 'tiep_tuc')).toBe(true);
    const tongGhi = ph.nhatKy.filter((b) => b.hanh_dong === 'dien' || b.hanh_dong === 'chon').length;
    expect(tongGhi).toBe(9); // mỗi ô cần đổi ghi đúng một lần, kể cả qua lần tiếp tục (dd_2 đúng sẵn)
    expect(daGhi).toBeLessThan(9);
  }, 60_000);

  it('trang mở popup/tab mới giữa chừng: dừng để người dùng xem', async () => {
    const page = await moMau();
    const ph = new PhienDien(NV, ctx, page, mayChuGia(async (n) => { if (n === 3) await page.evaluate(() => { window.open('about:blank'); }); }));
    await ph.chay();
    expect(['dung', 'tam_dung']).toContain(ph.trangThai);
    expect(ph.thongDiep).toMatch(/cửa sổ|tab mới/);
  });

  it('chỉ bàn giao sau khi đối chiếu', async () => {
    const page = await moMau();
    const ph = new PhienDien(NV, ctx, page, mayChuGia());
    await expect(ph.banGiao()).rejects.toThrow(/đối chiếu/);
  });
});
