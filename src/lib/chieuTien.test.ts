import { describe, expect, it } from 'vitest';
import { chieuTien, doLonTien } from './chieuTien';

describe('chiều tiền dùng chung', () => {
  it('HỒI QUY 15/09/2026: khoản chi ngân hàng mang số dương vẫn là tiền ra', () => {
    // Đúng hình dạng bankhub-map ghi: số dương, chiều trong type.
    expect(chieuTien({ amount: 2_000_000, type: 'expense' })).toBe('ra');
    expect(chieuTien({ amount: 2_000_000, type: 'income' })).toBe('vao');
  });

  it('type thắng dấu: không đếm đôi khi nguồn cũ ghi cả hai', () => {
    expect(chieuTien({ amount: -500, type: 'expense' })).toBe('ra');
    expect(chieuTien({ amount: -500, type: 'income' })).toBe('vao');
  });

  it('không có type thì mới đọc dấu; số 0 hay rác thì không có chiều', () => {
    expect(chieuTien({ amount: 700, type: '' })).toBe('vao');
    expect(chieuTien({ amount: -700, type: null })).toBe('ra');
    expect(chieuTien({ amount: 0, type: '' })).toBeNull();
    expect(chieuTien({ amount: 'abc' })).toBeNull();
  });

  it('độ lớn luôn dương', () => {
    expect(doLonTien({ amount: -1_500 })).toBe(1_500);
    expect(doLonTien({ amount: null })).toBe(0);
  });
});
