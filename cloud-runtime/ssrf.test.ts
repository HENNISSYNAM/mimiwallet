import { describe, expect, it } from 'vitest';
import { kiemUrl, laIpCam, thuocMien } from './ssrf.js';
import { laTenNgoai } from './thucThi.js';

const dns = (bang: Record<string, string[]>) => async (h: string) => {
  if (!bang[h]) throw new Error('NXDOMAIN');
  return bang[h];
};
const MIEN = ['vanban.chinhphu.vn', 'gdt.gov.vn'];
const congKhai = dns({ 'vanban.chinhphu.vn': ['203.162.1.1'], 'thuedientu.gdt.gov.vn': ['14.225.1.1'], 'noibo.gdt.gov.vn': ['10.0.0.5'], 'meta.gdt.gov.vn': ['169.254.169.254'], 'v6.gdt.gov.vn': ['::ffff:127.0.0.1'] });

describe('chống SSRF', () => {
  it('nhận URL đúng miền, miền con, cổng 80/443', async () => {
    expect(await kiemUrl('https://vanban.chinhphu.vn/?pageid=1', MIEN, { phanGiai: congKhai })).toBeNull();
    expect(await kiemUrl('https://thuedientu.gdt.gov.vn/', MIEN, { phanGiai: congKhai })).toBeNull();
    expect(await kiemUrl('https://vanban.chinhphu.vn:443/', MIEN, { phanGiai: congKhai })).toBeNull();
  });

  it('chặn URL ngoài danh sách (kể cả đuôi giả)', async () => {
    expect(await kiemUrl('https://example.com/', MIEN, { phanGiai: congKhai })).toMatch(/ngoài danh sách/);
    expect(await kiemUrl('https://vanban.chinhphu.vn.evil.com/', MIEN, { phanGiai: congKhai })).toMatch(/ngoài danh sách/);
    expect(await kiemUrl('https://xgdt.gov.vn/', MIEN, { phanGiai: congKhai })).toMatch(/ngoài danh sách/);
  });

  it('chặn cổng lạ, giao thức lạ, URL có mật khẩu', async () => {
    expect(await kiemUrl('https://vanban.chinhphu.vn:8443/', MIEN, { phanGiai: congKhai })).toMatch(/Cổng 8443/);
    expect(await kiemUrl('file:///etc/passwd', MIEN)).toMatch(/Giao thức/);
    expect(await kiemUrl('javascript:alert(1)', MIEN)).toMatch(/Giao thức/);
    expect(await kiemUrl('https://a:b@vanban.chinhphu.vn/', MIEN, { phanGiai: congKhai })).toMatch(/đăng nhập/);
  });

  it('chặn tên miền được phép nhưng trỏ về IP riêng/metadata/loopback', async () => {
    expect(await kiemUrl('https://noibo.gdt.gov.vn/', MIEN, { phanGiai: congKhai })).toMatch(/nội bộ 10\.0\.0\.5/);
    expect(await kiemUrl('http://meta.gdt.gov.vn/', MIEN, { phanGiai: congKhai })).toMatch(/169\.254\.169\.254/);
    expect(await kiemUrl('http://v6.gdt.gov.vn/', MIEN, { phanGiai: congKhai })).toMatch(/nội bộ/);
  });

  it('chặn IP riêng dù được đưa vào danh sách miền', async () => {
    for (const ip of ['127.0.0.1', '169.254.169.254', '10.1.2.3', '192.168.1.1', '172.20.0.1', '100.64.0.1', '0.0.0.0']) {
      expect(await kiemUrl(`http://${ip}/`, [ip])).toMatch(/nội bộ/);
    }
    expect(await kiemUrl('http://[::1]/', ['::1'])).not.toBeNull();
    // Dạng số nguyên của 127.0.0.1 — URL chuẩn hoá thành 127.0.0.1 rồi bị chặn.
    expect(await kiemUrl('http://2130706433/', ['127.0.0.1'])).toMatch(/nội bộ/);
  });

  it('laIpCam: các dải trong hợp đồng', () => {
    for (const ip of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.0.1', '169.254.169.254', '100.64.0.1', '100.127.255.255', '::1', 'fc00::1', 'fd12::1', 'fe80::1', '::ffff:10.0.0.1', '::ffff:7f00:1', '64:ff9b::a9fe:a9fe', '::'])
      expect(laIpCam(ip), ip).toBe(true);
    for (const ip of ['8.8.8.8', '203.162.1.1', '172.32.0.1', '100.128.0.1', '2001:4860:4860::8888'])
      expect(laIpCam(ip), ip).toBe(false);
  });

  it('cờ chỉ dùng trong test chỉ mở loopback, không mở dải nội bộ khác', async () => {
    expect(await kiemUrl('http://127.0.0.1:47999/', ['127.0.0.1'], { chiDungTrongTest_choPhepCucBo: true })).toBeNull();
    expect(await kiemUrl('http://10.0.0.1:8080/', ['10.0.0.1'], { chiDungTrongTest_choPhepCucBo: true })).toMatch(/nội bộ/);
  });

  it('thuocMien không phân biệt hoa thường, dấu chấm cuối', () => {
    expect(thuocMien('VanBan.ChinhPhu.VN.', MIEN)).toBe(true);
  });
});

describe('ép tác động bên ngoài theo tên nút', () => {
  it('Nộp/Gửi/Ký/Thanh toán/Xác nhận → ngoai; Tra cứu/Xem → không', () => {
    for (const t of ['Nộp tờ khai', 'Gửi hồ sơ', 'Ký', 'Ký số', 'Thanh toán', 'Xác nhận', 'Tiếp tục và gửi', 'SUBMIT', 'Đồng ý', 'Nhận mã OTP'])
      expect(laTenNgoai(t), t).toBe(true);
    for (const t of ['Tra cứu', 'Xem chi tiết', 'Tìm kiếm', 'Trang sau', 'Tải lại'])
      expect(laTenNgoai(t), t).toBe(false);
  });
});
