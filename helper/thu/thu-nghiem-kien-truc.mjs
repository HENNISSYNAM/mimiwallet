// THỬ NGHIỆM KIẾN TRÚC (10/10/2026) — chứng minh 5 bước trên biểu mẫu giả trước khi xây rộng:
// 1) kết nối đúng tab người dùng chọn  2) nhập và chọn  3) đọc lại  4) phát hiện khác biệt  5) dừng, ngắt.
// Chạy: node thu/thu-nghiem-kien-truc.mjs   (cần Chrome hoặc Edge đã cài; không tải trình duyệt mới)
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

/** Các cổng TCP đang LISTENING trên máy (Windows netstat). */
const congDangMo = () => new Set(execSync('netstat -ano -p TCP', { encoding: 'utf8' }).split(/\r?\n/)
  .filter((d) => d.includes('LISTENING')).map((d) => d.trim().split(/\s+/)[1]));

const thuMuc = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(thuMuc, 'bieu-mau-thu.html'));
const may = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise((x) => may.listen(0, '127.0.0.1', x));
const goc = `http://127.0.0.1:${may.address().port}`;
const ketQua = [];
const ghi = (buoc, ok, chiTiet) => { ketQua.push({ buoc, ok, chiTiet }); console.log(`${ok ? 'ĐẠT ' : 'HỎNG'} ${buoc} — ${chiTiet}`); };

const hoSo = mkdtempSync(join(tmpdir(), 'mimi-thu-'));
const kenh = process.env.KENH ?? 'chrome';
const truoc = congDangMo();
const ctx = await chromium.launchPersistentContext(hoSo, { channel: kenh, headless: process.env.HIEN !== '1' });
try {
  // Không mở cổng gỡ lỗi TCP: Playwright nói chuyện với trình duyệt qua pipe.
  const moi = [...congDangMo()].filter((c) => !truoc.has(c) && !c.endsWith(`:${may.address().port}`));
  ghi('0. không mở cổng debug TCP', moi.length === 0, `kênh ${kenh}; cổng LISTENING mới khi trình duyệt chạy: ${moi.length ? moi.join(', ') : 'không có'}`);

  // Hai tab: tab lạ và tab biểu mẫu. "Người dùng chọn" = chọn theo mã tab trong danh sách, không theo tab đầu tiên.
  const tabLa = ctx.pages()[0] ?? await ctx.newPage();
  await tabLa.goto('about:blank');
  const tabMau = await ctx.newPage();
  await tabMau.goto(`${goc}/?mst=0123456789&ten=HO%20KINH%20DOANH%20THU`);
  const ds = ctx.pages().map((p, i) => ({ ma: i, url: p.url() }));
  const chon = ds.find((t) => t.url.startsWith(goc));
  const tab = ctx.pages()[chon.ma];
  ghi('1. kết nối đúng tab đã chọn', tab === tabMau && (await tab.locator('#nhan-moi-truong').getAttribute('data-moi-truong')) === 'thu', `chọn tab ${chon.ma}/${ds.length}: ${chon.url}`);

  // 2. Nhập và chọn bằng locator ổn định (id), không theo toạ độ.
  await tab.locator('#ky-loai').selectOption('nam');
  await tab.locator('#ky-nam').fill('2025');
  await tab.locator('#dd-1').check();
  await tab.locator('#dt-08a').fill('812345678');
  await tab.locator('#dt-08a').blur();
  await tab.locator('#dt-11').fill('812345678');
  await tab.locator('#dt-11').blur();
  ghi('2. nhập và chọn', true, 'kỳ=nam, năm=2025, đánh dấu dd-1, [08a] và [11] = 812.345.678');

  // 3. Đọc lại.
  const doc = {
    ky: await tab.locator('#ky-loai').inputValue(), nam: await tab.locator('#ky-nam').inputValue(),
    dd1: await tab.locator('#dd-1').isChecked(), a: await tab.locator('#dt-08a').inputValue(), tong: await tab.locator('#dt-11').inputValue(),
  };
  const soCua = (s) => Number(String(s).replace(/\D/g, ''));
  const khop = doc.ky === 'nam' && doc.nam === '2025' && doc.dd1 && soCua(doc.a) === 812345678 && soCua(doc.tong) === 812345678;
  ghi('3. đọc lại và khớp', khop, JSON.stringify(doc));

  // 4. Phát hiện khác biệt: trang ?doi=1 tự đổi [08a] về 0 sau khi điền.
  const tabDoi = await ctx.newPage();
  await tabDoi.goto(`${goc}/?doi=1`);
  await tabDoi.locator('#dt-08a').fill('500000');
  await tabDoi.locator('#dt-08a').blur();
  const sau = soCua(await tabDoi.locator('#dt-08a').inputValue());
  ghi('4. phát hiện khác biệt', sau !== 500000, `điền 500.000, đọc lại ${sau.toLocaleString('vi-VN')} → ${sau !== 500000 ? 'phát hiện lệch, phải dừng và bàn giao' : 'KHÔNG phát hiện'}`);

  // Chữ chèn trên trang không được thành lệnh: bộ chạy không đọc chữ trang để quyết định hành động.
  ghi('4b. không bấm nộp, không nhập OTP', !(await tab.locator('#da-gui').isVisible()) && (await tab.locator('#otp').inputValue()) === '', 'nút Nộp và ô OTP không bị chạm');
} finally {
  // 5. Dừng và ngắt.
  await ctx.close();
  may.close();
  rmSync(hoSo, { recursive: true, force: true });
  ghi('5. dừng và ngắt kết nối', true, 'đóng ngữ cảnh trình duyệt, xoá hồ sơ tạm');
}
const dat = ketQua.every((k) => k.ok);
console.log(dat ? '\nTHỬ NGHIỆM ĐẠT' : '\nTHỬ NGHIỆM HỎNG');
process.exit(dat ? 0 : 1);
