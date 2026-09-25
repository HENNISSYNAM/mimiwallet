import { describe, expect, it } from 'vitest';
import { vongDoiHoaDon } from './vong-doi';

const H = '2026-09-25';

describe('vòng đời hoá đơn', () => {
  it('nguồn cơ quan thuế thắng: mã khác 1 không bao giờ là "đã thu"', () => {
    const r = vongDoiHoaDon({ mimi: { status: 'paid' }, gdt: { invoice_status: 3 }, homNay: H });
    expect(r.trang_thai).toBe('unknown');
    expect(r.nguon).toBe('gdt');
    expect(r.ly_do).toContain('chưa đối chiếu');
  });

  it('không đoán mã GDT chưa đối chiếu thành "bị thay" hay "đã huỷ"', () => {
    for (const g of [2, 3, 4, 5, 6]) expect(['replaced', 'cancelled', 'adjusted']).not.toContain(vongDoiHoaDon({ gdt: { invoice_status: g }, homNay: H }).trang_thai);
  });

  it('chờ thanh toán quá hạn → quá hạn, dù cột status chưa kịp đổi', () => {
    expect(vongDoiHoaDon({ mimi: { status: 'pending', due_date: '2026-09-18' }, homNay: H }).trang_thai).toBe('overdue');
    expect(vongDoiHoaDon({ mimi: { status: 'pending', due_date: '2026-10-18' }, homNay: H }).trang_thai).toBe('issued');
  });

  it('thu một phần', () => {
    expect(vongDoiHoaDon({ mimi: { status: 'advanced', advanced_amount: 2, total: 10 }, homNay: H }).trang_thai).toBe('partially_paid');
  });

  it('chỉ có GDT, hiệu lực → đã lập; không nguồn nào → chưa rõ', () => {
    expect(vongDoiHoaDon({ gdt: { invoice_status: 1 }, homNay: H })).toMatchObject({ trang_thai: 'issued', nguon: 'gdt' });
    expect(vongDoiHoaDon({ homNay: H }).trang_thai).toBe('unknown');
  });
});
