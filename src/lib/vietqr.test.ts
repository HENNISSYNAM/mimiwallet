import { describe, it, expect } from 'vitest';
import { taoChuoiVietQr, crc16, boDau } from './vietqr';

describe('crc16 — CCITT-FALSE, không phải biến thể khác', () => {
  it('khớp vector chuẩn "123456789" → 29B1', () => {
    // Vector kiểm tra công bố của CRC-16/CCITT-FALSE. Các biến thể CRC-16 khác
    // (ARC, XMODEM, MODBUS) cho ra giá trị khác trên cùng chuỗi này — nên test
    // này là thứ phân biệt "đúng thuật toán" với "một CRC nào đó trông hợp lệ".
    expect(crc16('123456789')).toBe('29B1');
  });

  it('luôn trả về 4 ký tự hoa, kể cả khi giá trị nhỏ', () => {
    for (const s of ['', 'A', 'x'.repeat(500)]) {
      expect(crc16(s)).toMatch(/^[0-9A-F]{4}$/);
    }
  });
});

describe('boDau', () => {
  it('bỏ dấu và đổi đ/Đ, vì EMVCo chỉ bảo đảm ASCII', () => {
    expect(boDau('Thanh toán đơn hàng')).toBe('Thanh toan don hang');
    expect(boDau('ĐẶNG')).toBe('DANG');
  });
});

describe('taoChuoiVietQr', () => {
  const tk = { bankBin: '970407', accountNumber: '830388888' };

  it('mở đầu đúng chuẩn EMVCo và kết thúc bằng CRC hợp lệ', () => {
    const s = taoChuoiVietQr({ ...tk, amount: 149_000, addInfo: 'MIMIABC234' });
    expect(s.startsWith('000201')).toBe(true);
    // CRC phải khớp phần thân — tự kiểm lại chính chuỗi vừa sinh.
    const than = s.slice(0, -4);
    expect(s.slice(-4)).toBe(crc16(than));
    expect(than.endsWith('6304')).toBe(true);
  });

  it('nhúng đủ BIN, số tài khoản, số tiền và nội dung', () => {
    const s = taoChuoiVietQr({ ...tk, amount: 149_000, addInfo: 'MIMIABC234' });
    expect(s).toContain('A000000727');
    expect(s).toContain('970407');
    expect(s).toContain('830388888');
    expect(s).toContain('5406149000'); // id 54, dài 06, giá trị 149000
    expect(s).toContain('MIMIABC234');
    expect(s).toContain('QRIBFTTA'); // tới tài khoản, không phải tới thẻ
  });

  it('có số tiền thì là mã DÙNG MỘT LẦN', () => {
    // Mã đã gắn số tiền của một hoá đơn cụ thể mà quét lại lần hai là trả trùng.
    expect(taoChuoiVietQr({ ...tk, amount: 149_000 })).toContain('010212');
  });

  it('không số tiền thì là mã tĩnh, dùng lại được', () => {
    const s = taoChuoiVietQr(tk);
    expect(s).toContain('010211');
    expect(s).not.toContain('5406');
  });

  it('bỏ dấu nội dung trước khi nhúng', () => {
    const s = taoChuoiVietQr({ ...tk, addInfo: 'Phí tháng 8' });
    expect(s).toContain('Phi thang 8');
    expect(s).not.toContain('í');
  });

  it('độ dài mỗi trường khớp giá trị đi kèm', () => {
    // Sai độ dài là lỗi âm thầm nhất của TLV: chuỗi vẫn trông bình thường,
    // nhưng máy quét đọc lệch từ đó trở đi và bỏ cả mã.
    const s = taoChuoiVietQr({ ...tk, amount: 50_000, addInfo: 'MIMIXYZ789' });
    let i = 0;
    let cuoiCung = '';
    while (i < s.length) {
      const id = s.slice(i, i + 2);
      const len = Number(s.slice(i + 2, i + 4));
      expect(Number.isInteger(len)).toBe(true);
      cuoiCung = id;
      i += 4 + len;
    }
    // Đi hết chuỗi đúng bằng bước nhảy TLV — không lố, không thiếu. Bản thân
    // CRC cũng là một trường TLV (63 + 04 + bốn ký tự), nên nó nằm trong vòng
    // lặp chứ không đứng ngoài, và nó phải là trường cuối cùng.
    expect(i).toBe(s.length);
    expect(cuoiCung).toBe('63');
  });

  it('bác dữ liệu vào không hợp lệ thay vì sinh mã hỏng', () => {
    expect(() => taoChuoiVietQr({ bankBin: '97040', accountNumber: '1' })).toThrow();
    expect(() => taoChuoiVietQr({ bankBin: '970407', accountNumber: 'ABC' })).toThrow();
    expect(() => taoChuoiVietQr({ ...tk, amount: -5 })).toThrow();
    expect(() => taoChuoiVietQr({ ...tk, amount: 1.5 })).toThrow();
  });
});
