import { describe, expect, it } from 'vitest';
import { khopChiTacTu, type GiaoDichRa, type YeuCauChoKhop } from './khop-chi';

const y = (sua: Partial<YeuCauChoKhop> = {}): YeuCauChoKhop => ({
  id: 'yc1',
  maThamChieu: 'MIMIAB23CD',
  soTien: 500_000,
  ...sua,
});

const g = (sua: Partial<GiaoDichRa> = {}): GiaoDichRa => ({
  id: 'gd1',
  amount: 500_000,
  type: 'expense',
  payment_reference: 'MIMIAB23CD',
  ...sua,
});

describe('khớp khoản chi của agent với sao kê', () => {
  it('đúng mã, đúng số tiền, tiền ra thì khớp', () => {
    expect(khopChiTacTu([y()], [g()]).khop).toEqual([{ yeuCauId: 'yc1', giaoDichId: 'gd1', soTien: 500_000 }]);
  });

  it('số tiền âm trong sao kê vẫn là tiền ra', () => {
    expect(khopChiTacTu([y()], [g({ amount: -500_000, type: 'other' })]).khop).toHaveLength(1);
  });

  it('tiền VÀO cùng mã không phải bằng chứng đã chi', () => {
    const kq = khopChiTacTu([y()], [g({ type: 'income' })]);
    expect(kq.khop).toHaveLength(0);
    expect(kq.lech).toHaveLength(0);
  });

  it('cùng mã khác số tiền là lệch, không tự đóng', () => {
    const kq = khopChiTacTu([y()], [g({ amount: 50_000 })]);
    expect(kq.khop).toHaveLength(0);
    expect(kq.lech).toEqual([{ yeuCauId: 'yc1', giaoDichId: 'gd1', mongDoi: 500_000, thucTe: 50_000 }]);
  });

  it('có cả giao dịch lệch và giao dịch đúng số thì chọn cái đúng', () => {
    const kq = khopChiTacTu([y()], [g({ id: 'sai', amount: 50_000 }), g({ id: 'dung' })]);
    expect(kq.khop[0].giaoDichId).toBe('dung');
    expect(kq.lech).toHaveLength(0);
  });

  it('giao dịch đã gắn với yêu cầu khác không dùng lại', () => {
    expect(khopChiTacTu([y()], [g()], new Set(['gd1'])).khop).toHaveLength(0);
  });

  it('một giao dịch không trả cho hai yêu cầu', () => {
    // Hai yêu cầu không thể trùng mã trong DB, nhưng hàm không được dựa vào đó.
    const kq = khopChiTacTu([y({ id: 'a' }), y({ id: 'b' })], [g()]);
    expect(kq.khop).toHaveLength(1);
  });

  it('giao dịch không mang mã thì bỏ qua', () => {
    expect(khopChiTacTu([y()], [g({ payment_reference: null })]).khop).toHaveLength(0);
  });
});
