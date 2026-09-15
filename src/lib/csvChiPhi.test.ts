import { describe, expect, it } from 'vitest';
import { chuyenBang, doanAnhXa, doanDinhDangNgay, docNgay, docSoTien, tachCsv, tomTatNhap } from './csvChiPhi';

describe('đọc CSV chi phí AI', () => {
  it('tách CSV có ngoặc kép, dấu phẩy trong ô, CRLF và BOM', () => {
    expect(tachCsv('﻿Date,Model,Cost\r\n2026-09-01,"gpt-4o, input","1,234.50"\r\n\r\n')).toEqual([
      ['Date', 'Model', 'Cost'],
      ['2026-09-01', 'gpt-4o, input', '1,234.50'],
    ]);
    expect(tachCsv('a;b\n1;"x ""y"""')).toEqual([['a', 'b'], ['1', 'x "y"']]);
  });

  it('đề xuất cột theo tên thường gặp, bỏ dấu và ký hiệu', () => {
    expect(doanAnhXa(['Usage Date', 'Model', 'Project Name', 'Cost ($)', 'Currency'])).toEqual({ ngay: 0, hangMuc: 1, duAn: 2, soTien: 3, tienTe: 4 });
    expect(doanAnhXa(['Ngày', 'Mô hình', 'Chi phí'])).toEqual({ ngay: 0, hangMuc: 1, soTien: 2, duAn: null, tienTe: null });
    // Có cả model lẫn description thì ưu tiên model.
    expect(doanAnhXa(['date', 'description', 'model', 'amount']).hangMuc).toBe(2);
  });

  it('đọc số tiền theo nhiều kiểu viết', () => {
    expect(docSoTien('$1,234.56')).toBe(1234.56);
    expect(docSoTien('1.234,56')).toBe(1234.56);
    expect(docSoTien('12,5')).toBe(12.5);
    expect(docSoTien('1,234')).toBe(1234);
    expect(docSoTien('(12.30)')).toBe(-12.3);
    expect(docSoTien('-0.5 USD')).toBe(-0.5);
    expect(docSoTien('Total')).toBeNull();
    expect(docSoTien('')).toBeNull();
  });

  it('đọc ngày ISO, tháng trước, ngày trước; từ chối ngày không có thật', () => {
    expect(docNgay('2026-09-01T00:00:00Z', 'iso')).toBe('2026-09-01');
    expect(docNgay('09/01/2026', 'thang_truoc')).toBe('2026-09-01');
    expect(docNgay('01/09/2026', 'ngay_truoc')).toBe('2026-09-01');
    expect(docNgay('2026-02-30', 'iso')).toBeNull();
    expect(docNgay('Total', 'iso')).toBeNull();
  });

  it('đoán định dạng ngày, và nói thật khi không phân biệt được', () => {
    expect(doanDinhDangNgay(['2026-09-01'])).toEqual({ dinhDang: 'iso', chacChan: true });
    expect(doanDinhDangNgay(['03/04/2026', '25/04/2026'])).toEqual({ dinhDang: 'ngay_truoc', chacChan: true });
    expect(doanDinhDangNgay(['04/25/2026'])).toEqual({ dinhDang: 'thang_truoc', chacChan: true });
    expect(doanDinhDangNgay(['03/04/2026']).chacChan).toBe(false);
  });

  it('chuyển bảng: bỏ dòng tổng, dòng khác USD, và nói lý do từng dòng', () => {
    const bang = tachCsv([
      'date,model,project,cost,currency',
      '2026-09-01,gpt-4o,proj_a,1.50,USD',
      '2026-09-02,gpt-4o-mini,,0.25,usd',
      '2026-09-02,gpt-4o,proj_a,3,EUR',
      'Total,,,1.75,USD',
    ].join('\n'));
    const kq = chuyenBang(bang, doanAnhXa(bang[0]), 'iso');
    expect(kq.dong).toEqual([
      { ngay: '2026-09-01', hang_muc: 'gpt-4o', du_an: 'proj_a', so_tien_usd: 1.5 },
      { ngay: '2026-09-02', hang_muc: 'gpt-4o-mini', du_an: '', so_tien_usd: 0.25 },
    ]);
    expect(kq.boQua).toEqual([
      { dongSo: 4, lyDo: 'tiền tệ EUR — chỉ nhận USD' },
      { dongSo: 5, lyDo: 'ngày "Total" không đọc được' },
    ]);
    expect(tomTatNhap(kq.dong)).toEqual({ soDong: 2, tuNgay: '2026-09-01', denNgay: '2026-09-02', tong: 1.75 });
  });

  it('chưa chọn cột ngày hoặc số tiền thì không nhập gì', () => {
    expect(chuyenBang([['a', 'b'], ['1', '2']], { ngay: null, soTien: 1, hangMuc: null, duAn: null, tienTe: null }, 'iso').dong).toEqual([]);
  });
});
