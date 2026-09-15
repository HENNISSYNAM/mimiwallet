import { describe, expect, it } from 'vitest';
import { csvChoKeToan, gopThuVien, locThuVien } from './thuVienChungTu';

/** Dữ liệu dưới đây là đầu vào của test. */
const QUET = [
  { id: 'q1', loai: 'hoa_don', so_hoa_don: '0001', ky_hieu: 'C26T', ngay: '2026-09-10', ben_ban: 'Công ty Đồng Tâm', ma_so_thue_ben_ban: '0312345678', tien_thue: 100_000, tong_tien: 1_100_000, giao_dich_id: 'g1', anh_path: 'c/q1.jpg', created_at: '2026-09-10T03:00:00Z' },
  { id: 'q2', loai: 'bien_lai', so_hoa_don: null, ky_hieu: null, ngay: null, ben_ban: 'Quán "Ba Anh", Q1', ma_so_thue_ben_ban: null, tien_thue: null, tong_tien: 250_000, giao_dich_id: null, anh_path: null, created_at: '2026-09-12T03:00:00Z' },
];
const HDDT = [
  { id: 'h1', invoice_number: '777', invoice_serial: 'K26', counterparty_name: 'Viettel', counterparty_tax_code: '0100109106', total_amount: 330_000, tax_amount: 30_000, issued_at: '2026-09-11T00:00:00Z' },
];
const GD = [{ id: 'g1', transaction_date: '2026-09-11', ten: 'CONG TY DONG TAM', so_tien: 1_100_000 }];

describe('thư viện chứng từ', () => {
  it('gộp hai nguồn, mới nhất trước; chứng từ chụp không có ngày thì lấy ngày lưu', () => {
    const ds = gopThuVien(QUET, HDDT, GD);
    expect(ds.map((m) => m.khoa)).toEqual(['chup:q2', 'hddt:h1', 'chup:q1']);
    expect(ds[2].giao_dich?.id).toBe('g1');
    expect(ds[0].ngay).toBe('2026-09-12');
  });

  it('lọc theo nguồn, chưa gắn khoản chi, và tìm không dấu', () => {
    const ds = gopThuVien(QUET, HDDT, GD);
    expect(locThuVien(ds, 'chua_gan', '').map((m) => m.id)).toEqual(['q2']);
    expect(locThuVien(ds, 'hoa_don_dien_tu', '').map((m) => m.id)).toEqual(['h1']);
    expect(locThuVien(ds, 'tat_ca', 'dong tam').map((m) => m.id)).toEqual(['q1']);
    expect(locThuVien(ds, 'tat_ca', '0100109106').map((m) => m.id)).toEqual(['h1']);
  });

  it('CSV cho kế toán: có BOM, thoát dấu ngoặc kép và dấu phẩy, số tiền để nguyên', () => {
    const csv = csvChoKeToan(gopThuVien(QUET, HDDT, GD));
    expect(csv.startsWith('﻿Ngày,Loại,')).toBe(true);
    const dong = csv.split('\r\n');
    expect(dong).toHaveLength(4);
    expect(dong[1]).toBe('12/09/2026,Chứng từ chụp,,,"Quán ""Ba Anh"", Q1",,,250000,,,');
    expect(dong[3]).toBe('10/09/2026,Chứng từ chụp,0001,C26T,Công ty Đồng Tâm,0312345678,100000,1100000,11/09/2026,1100000,Có');
  });

  it('chặn công thức Excel cài trong tên bên bán (CSV injection)', () => {
    const doc = [{ ...QUET[1], id: 'x', ben_ban: '=HYPERLINK("http://ke-gian","Bấm")' }];
    const csv = csvChoKeToan(gopThuVien(doc, [], []));
    expect(csv.split('\r\n')[1]).toContain(`"'=HYPERLINK(""http://ke-gian"",""Bấm"")"`);
  });
});
