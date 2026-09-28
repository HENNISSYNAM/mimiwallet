import { describe, expect, it } from 'vitest';
import { dinhDang } from './troLy';

/* Intl dùng khoảng trắng hẹp/không ngắt trước ₫ tuỳ môi trường — so phần số. */
const so = (s: string) => s.replace(/\s|₫/g, '');

describe('định dạng tiền VND — không mất đồng lẻ', () => {
  it('100 tỷ, 1 nghìn tỷ, 1 nghìn tỷ + 1 đồng', () => {
    expect(so(dinhDang(100_000_000_000, 'vnd'))).toBe('100.000.000.000');
    expect(so(dinhDang('1000000000000', 'vnd'))).toBe('1.000.000.000.000');
    expect(so(dinhDang('1000000000001', 'vnd'))).toBe('1.000.000.000.001');
  });

  it('tổng lớn hơn Number.MAX_SAFE_INTEGER gửi dạng chuỗi vẫn đúng từng đồng', () => {
    // 9.007.199.254.740.993: Number làm tròn thành …992.
    expect(so(dinhDang('9007199254740993', 'vnd'))).toBe('9.007.199.254.740.993');
    expect(so(dinhDang('-9007199254740993', 'vnd'))).toBe('-9.007.199.254.740.993');
    expect(dinhDang('9007199254740993', 'vnd')).toContain('₫');
  });

  it('thiếu dữ liệu là "—", không phải 0; chuỗi không phải số giữ nguyên', () => {
    expect(dinhDang(null, 'vnd')).toBe('—');
    expect(dinhDang(undefined, 'vnd')).toBe('—');
    expect(dinhDang('', 'vnd')).toBe('—');
    expect(dinhDang('Chưa có sao kê', 'vnd')).toBe('Chưa có sao kê');
    expect(dinhDang('1.5e3', 'vnd')).toBe('1.5e3');
  });
});
