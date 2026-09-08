import { describe, expect, it } from 'vitest';
import { DANH_SACH_NGAN_HANG, timNganHang } from './nganHang';
import { taoChuoiVietQr } from './vietqr';

describe('DANH_SACH_NGAN_HANG', () => {
  it('mọi BIN đều đúng 6 chữ số', () => {
    for (const n of DANH_SACH_NGAN_HANG) expect(n.bin).toMatch(/^\d{6}$/);
  });

  it('không có BIN trùng', () => {
    const tap = new Set(DANH_SACH_NGAN_HANG.map((n) => n.bin));
    expect(tap.size).toBe(DANH_SACH_NGAN_HANG.length);
  });

  it('mọi BIN đều dựng được chuỗi VietQR', () => {
    // `taoChuoiVietQr` từ chối BIN không phải 6 số. Test này khoá hai file lại
    // với nhau: thêm một dòng sai định dạng vào danh sách là hỏng ở đây, chứ
    // không phải hỏng ở màn hình thanh toán của khách.
    for (const n of DANH_SACH_NGAN_HANG) {
      expect(() =>
        taoChuoiVietQr({ bankBin: n.bin, accountNumber: '2431122002', amount: 2000 }),
      ).not.toThrow();
    }
  });
});

describe('timNganHang', () => {
  it('tra được bằng chính mã BIN', () => {
    expect(timNganHang('970422')?.ten).toBe('MB Bank');
  });

  it('tra được bằng tên ngắn, không phân biệt hoa thường hay khoảng trắng', () => {
    expect(timNganHang('MB Bank')?.bin).toBe('970422');
    expect(timNganHang('mbbank')?.bin).toBe('970422');
    expect(timNganHang('  MB BANK  ')?.bin).toBe('970422');
  });

  /*
   * Đây là lý do hàm này tồn tại. Ô "Ngân hàng" trong form SePay từng là ô gõ
   * tự do, nên trong cơ sở dữ liệu đang có sẵn những chuỗi kiểu này. Không gom
   * được chúng thì người dùng phải khai lại tài khoản.
   */
  it('gom được các cách viết tự do đã lưu trong cơ sở dữ liệu', () => {
    for (const s of ['MB Bank', 'MBBank', 'mb bank', 'MB', 'Ngân hàng Quân đội']) {
      expect(timNganHang(s)?.bin).toBe('970422');
    }
  });

  it('tra được bằng tên đầy đủ có dấu', () => {
    expect(timNganHang('Ngân hàng Ngoại thương Việt Nam')?.bin).toBe('970436');
  });

  it('trả null khi không biết', () => {
    expect(timNganHang('Ngân hàng Không Tồn Tại')).toBeNull();
    expect(timNganHang('')).toBeNull();
    expect(timNganHang(null)).toBeNull();
    expect(timNganHang('12345')).toBeNull();
  });

  /*
   * Thà trả null còn hơn đoán. Một BIN đoán sai không báo lỗi ở đâu cả — nó chỉ
   * làm mã QR trỏ sang ngân hàng khác, và người phát hiện là khách đang cầm
   * điện thoại định trả tiền.
   */
  it('trả null khi chuỗi mơ hồ khớp nhiều ngân hàng', () => {
    expect(timNganHang('bank')).toBeNull();
    expect(timNganHang('ngan hang')).toBeNull();
  });
});
