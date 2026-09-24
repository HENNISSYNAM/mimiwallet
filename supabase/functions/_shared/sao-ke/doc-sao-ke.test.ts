import { describe, expect, it } from 'vitest';
import { chuoiChongTrung, danhSoLan, docCsv, docDong, docNgay, docSo, kiemDong, nhanCot, type O } from './doc-sao-ke';

/*
 * Các bảng dưới đây dựng theo những KIỂU CỘT thường gặp trong sao kê tải về (tiêu đề tiếng Việt,
 * song ngữ, một cột số tiền có dấu). Không phải bản sao sao kê của ngân hàng cụ thể nào; số liệu
 * là đầu vào của test.
 */

describe('nhận cột', () => {
  it('tiêu đề tiếng Việt, hai cột ghi nợ / ghi có, có dòng tiêu đề phụ phía trên', () => {
    const bang: O[][] = [
      ['SAO KÊ TÀI KHOẢN'],
      ['Từ ngày 01/08/2026 đến ngày 31/08/2026'],
      ['STT', 'Ngày giao dịch', 'Số tham chiếu', 'Số tiền ghi nợ', 'Số tiền ghi có', 'Số dư', 'Nội dung chi tiết'],
    ];
    const bd = nhanCot(bang)!;
    expect(bd.dong_tieu_de).toBe(2);
    expect(bd.cot).toMatchObject({ ngay: 1, so_tham_chieu: 2, no: 3, co: 4, so_du: 5, noi_dung: 6 });
  });

  it('tiêu đề song ngữ "Nợ/Debit", "Có/Credit", có đơn vị trong ngoặc', () => {
    const bd = nhanCot([['Ngày GD/Transaction date', 'Diễn giải/Description', 'Nợ/Debit (VND)', 'Có/Credit (VND)', 'Số dư/Balance']])!;
    expect(bd.cot).toMatchObject({ ngay: 0, noi_dung: 1, no: 2, co: 3, so_du: 4 });
  });

  it('"Số tiền ghi có" là tiền vào, không bị nhận nhầm thành cột "Số tiền" chung', () => {
    expect(nhanCot([['Ngày', 'Số tiền ghi có', 'Mô tả']])!.cot).toMatchObject({ ngay: 0, co: 1, noi_dung: 2 });
  });

  it('không có cột ngày hoặc cột tiền thì không nhận', () => {
    expect(nhanCot([['Tên', 'Địa chỉ'], ['A', 'B']])).toBeNull();
  });
});

describe('đọc ngày và số tiền kiểu Việt Nam', () => {
  it('ngày', () => {
    expect(docNgay('05/08/2026')).toBe('2026-08-05');
    expect(docNgay('5-8-2026 14:32:10')).toBe('2026-08-05');
    expect(docNgay('2026-08-05')).toBe('2026-08-05');
    expect(docNgay(new Date(Date.UTC(2026, 7, 5)))).toBe('2026-08-05');
    expect(docNgay(46239)).toBe('2026-08-05');
    expect(docNgay('31/02/2026')).toBeNull();
    expect(docNgay('Tổng cộng')).toBeNull();
  });

  it('số tiền', () => {
    expect(docSo('1.234.567')).toBe(1234567);
    expect(docSo('1,234,567')).toBe(1234567);
    expect(docSo('500 000 đ')).toBe(500000);
    expect(docSo('(1.000)')).toBe(-1000);
    expect(docSo('-2.500.000')).toBe(-2500000);
    expect(docSo(750000)).toBe(750000);
    expect(docSo('')).toBeNull();
  });
});

describe('đọc dòng', () => {
  const bang: O[][] = [
    ['Ngày giao dịch', 'Số tiền ghi nợ', 'Số tiền ghi có', 'Số dư', 'Nội dung chi tiết', 'Tên đối ứng'],
    ['05/08/2026', '', '900.000', '10.900.000', 'KHACH LE CK THANH TOAN DON 1523', 'NGUYEN VAN A'],
    ['06/08/2026', '8.000.000', '', '2.900.000', 'TT TIEN HANG RAU CU', ''],
    ['', '', '', '', 'Tổng cộng', ''],
    ['xx', '', '100.000', '', 'dòng hỏng', ''],
  ];

  it('tiền vào, tiền ra, bỏ dòng tổng, báo dòng hỏng', () => {
    const { dong, loi } = docDong(bang, nhanCot(bang)!);
    expect(dong).toEqual([
      { transaction_date: '2026-08-05', amount: 900000, type: 'income', merchant_name: 'KHACH LE CK THANH TOAN DON 1523', counter_account_name: 'NGUYEN VAN A', counter_account_number: null, so_tham_chieu: null, so_du: 10900000 },
      { transaction_date: '2026-08-06', amount: 8000000, type: 'expense', merchant_name: 'TT TIEN HANG RAU CU', counter_account_name: null, counter_account_number: null, so_tham_chieu: null, so_du: 2900000 },
    ]);
    expect(loi).toEqual([{ dong: 5, cau: 'Không đọc được ngày' }]);
  });

  it('một cột số tiền có dấu: âm là tiền ra', () => {
    const b: O[][] = [['Date', 'Amount', 'Description'], ['2026-08-05', '-150000', 'PHI DICH VU'], ['2026-08-06', '300000', 'NHAN TIEN']];
    expect(docDong(b, nhanCot(b)!).dong.map((d) => [d.type, d.amount])).toEqual([['expense', 150000], ['income', 300000]]);
  });
});

describe('CSV', () => {
  it('dấu chấm phẩy, ô trong ngoặc kép có dấu phẩy', () => {
    expect(docCsv('Ngày;Mô tả;Có\n05/08/2026;"TT DON 1, 2";900.000\n')).toEqual([
      ['Ngày', 'Mô tả', 'Có'], ['05/08/2026', 'TT DON 1, 2', '900.000'],
    ]);
  });
});

describe('máy chủ kiểm lại và chống trùng', () => {
  const d = { transaction_date: '2026-08-05', amount: 50000, type: 'income' as const, merchant_name: 'QR', counter_account_name: null, counter_account_number: null, so_tham_chieu: null, so_du: null };

  it('không tin dòng trình duyệt gửi lên', () => {
    expect(kiemDong(d, '2026-09-24')).toBeNull();
    expect(kiemDong({ ...d, amount: -5 }, '2026-09-24')).toBe('Số tiền không hợp lệ');
    expect(kiemDong({ ...d, transaction_date: '2026-12-01' }, '2026-09-24')).toBe('Ngày ở tương lai');
    expect(kiemDong({ ...d, type: 'x' }, '2026-09-24')).toBe('Chiều tiền không hợp lệ');
  });

  it('hai khoản giống hệt trong cùng tệp vẫn là hai khoản; nhập lại tệp thì ra đúng chuỗi cũ', () => {
    const lan = danhSoLan([d, d, { ...d, amount: 60000 }], 'TK1');
    expect(lan).toEqual([1, 2, 1]);
    expect(chuoiChongTrung('TK1', d, 1)).not.toBe(chuoiChongTrung('TK1', d, 2));
    expect(danhSoLan([d, d], 'TK1')).toEqual(lan.slice(0, 2));
  });
});
