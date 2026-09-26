import { describe, expect, it } from 'vitest';
import { canTuPhanLoai, LY_DO_THAN_TRONG, tuPhanLoai } from './tu-phan-loai';

const k = (payment_reference: string, counter_account_name: string | null = null) => ({ merchant_name: null, counter_account_name, payment_reference });

describe('MIMI tự phân loại tiền vào', () => {
  it.each([
    ['GN HDTD 123 giai ngan khoan vay', 'loan'],
    ['gop von dot 2', 'capital_contribution'],
    ['me chuyen tien', 'family_transfer'],
    ['dat coc don hang 15', 'deposit'],
  ])('"%s" → %s, loại khỏi doanh thu, có lý do', (nd, loai) => {
    const q = tuPhanLoai(k(nd));
    expect(q).toMatchObject({ loai, anh_huong: 'exclude', nguon: 'noi_dung' });
    expect(q.ly_do.length).toBeGreaterThan(20);
  });

  it('không có dấu hiệu nào → doanh thu (nguyên tắc thận trọng), không tự làm giảm thuế', () => {
    expect(tuPhanLoai(k('CK 1500000', 'NGUYEN VAN A'))).toEqual({ loai: 'business_revenue', anh_huong: 'include', ly_do: LY_DO_THAN_TRONG, nguon: 'than_trong' });
  });

  it('tiền khách trả cho nhà thuốc, lớp học không bị loại nhầm', () => {
    expect(tuPhanLoai(k('tien thuoc thang 9')).anh_huong).toBe('include');
    expect(tuPhanLoai(k('tien hoc lop toan')).anh_huong).toBe('include');
  });

  it('chỉ phân loại tiền vào chưa có phân loại và không phải chuyển nội bộ — không ghi đè người dùng', () => {
    const ds = [
      { id: 'a', amount: 1, type: 'income', ...k('x') },
      { id: 'b', amount: 1, type: 'income', ...k('x') }, // người dùng đã phân loại
      { id: 'c', amount: 1, type: 'income', ...k('x') }, // chuyển nội bộ
      { id: 'd', amount: -1, type: 'expense', ...k('x') }, // tiền ra
    ];
    const chon = canTuPhanLoai(ds, new Set(['b']), new Set(['c']), (t) => t.type === 'income');
    expect(chon.map((t) => t.id)).toEqual(['a']);
  });
});
