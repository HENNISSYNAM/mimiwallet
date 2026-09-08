import { describe, expect, it } from 'vitest';
import {
  docMaThamChieu,
  laMaThamChieu,
  sinhMaThamChieu,
  TIEN_TO,
} from './ma-tham-chieu.ts';

describe('sinhMaThamChieu', () => {
  it('luôn sinh mã đúng dạng', () => {
    for (let i = 0; i < 200; i++) expect(laMaThamChieu(sinhMaThamChieu())).toBe(true);
  });

  it('không sinh ký tự dễ nhìn nhầm', () => {
    // 0/O, 1/I/L và U — xem lý do trong ma-tham-chieu.ts.
    for (let i = 0; i < 200; i++) {
      expect(sinhMaThamChieu().slice(TIEN_TO.length)).not.toMatch(/[01OILU]/);
    }
  });

  it('không lặp lại trong 500 lần sinh', () => {
    const tap = new Set(Array.from({ length: 500 }, sinhMaThamChieu));
    expect(tap.size).toBe(500);
  });
});

describe('docMaThamChieu', () => {
  it('đọc được mã đứng một mình', () => {
    expect(docMaThamChieu('MIMIK7P2QX')).toBe('MIMIK7P2QX');
  });

  it('đọc được mã nằm trong câu ngân hàng tự chèn', () => {
    // Dạng thật của MB Bank: tên người gửi, nội dung, rồi mã giao dịch.
    expect(docMaThamChieu('NGUYEN VAN A chuyen tien MIMIK7P2QX-Ma GD 0123456')).toBe(
      'MIMIK7P2QX',
    );
  });

  it('đọc được khi khách gõ chữ thường', () => {
    expect(docMaThamChieu('thanh toan mimik7p2qx')).toBe('MIMIK7P2QX');
  });

  it('đọc được khi có dấu cách hoặc gạch chen giữa mã', () => {
    expect(docMaThamChieu('MIMI K7P2 QX')).toBe('MIMIK7P2QX');
    expect(docMaThamChieu('MIMI-K7P2-QX')).toBe('MIMIK7P2QX');
  });

  it('bỏ dấu tiếng Việt trước khi tìm', () => {
    expect(docMaThamChieu('Chuyển khoản MIMIK7P2QX')).toBe('MIMIK7P2QX');
  });

  it('trả null khi không có mã', () => {
    expect(docMaThamChieu('chuyen tien an trua')).toBeNull();
    expect(docMaThamChieu('')).toBeNull();
    expect(docMaThamChieu(null)).toBeNull();
    expect(docMaThamChieu(undefined)).toBeNull();
  });

  it('trả null khi mã cụt', () => {
    expect(docMaThamChieu('MIMIK7P2')).toBeNull();
  });

  /*
   * Đây là test đáng giá nhất trong file.
   *
   * Nội dung mang hai mã khác nhau thì lấy mã nào cũng là chọn hộ xem hoá đơn
   * nào được tất toán. Trả null để khoản tiền vẫn được ghi mà không tự khớp —
   * có người nhìn, thay vì máy đoán sai.
   */
  it('trả null khi có hai mã khác nhau', () => {
    expect(docMaThamChieu('MIMIK7P2QX va MIMIB3D4E5')).toBeNull();
  });

  it('vẫn đọc được khi cùng một mã lặp lại', () => {
    expect(docMaThamChieu('MIMIK7P2QX MIMIK7P2QX')).toBe('MIMIK7P2QX');
  });

  it('đọc lại được chính mã vừa sinh, kể cả khi bị bọc trong câu', () => {
    for (let i = 0; i < 100; i++) {
      const ma = sinhMaThamChieu();
      expect(docMaThamChieu(`TK 2431122002 chuyen ${ma} ND thanh toan`)).toBe(ma);
    }
  });
});
