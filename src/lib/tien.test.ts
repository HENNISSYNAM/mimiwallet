import { describe, expect, it } from 'vitest';
import { congTien, dinhDangTien, dinhDangTienVanBan, laTien, soSanhTien, soTien, truTien } from './tien';

/* Intl có thể dùng khoảng trắng không ngắt trước ₫ — so sau khi bỏ khoảng trắng. */
const g = (s: string) => s.replace(/\s/g, ' ');

describe('tiền VND dùng chung', () => {
  it('một kiểu viết: "1.000.000 ₫"; văn bản: "1.000.000 đồng"', () => {
    expect(g(dinhDangTien(1_000_000))).toBe('1.000.000 ₫');
    expect(g(dinhDangTienVanBan(1_000_000))).toBe('1.000.000 đồng');
    expect(dinhDangTien(1234.6)).toMatch(/^1\.235/);
  });

  it('100 tỷ, 1 nghìn tỷ, 1 nghìn tỷ + 1 đồng, vượt MAX_SAFE_INTEGER dạng chuỗi — đúng từng đồng', () => {
    expect(soTien(100_000_000_000)).toBe('100.000.000.000');
    expect(soTien('1000000000000')).toBe('1.000.000.000.000');
    expect(soTien('1000000000001')).toBe('1.000.000.000.001');
    expect(soTien('9007199254740993')).toBe('9.007.199.254.740.993');
    expect(soTien('-9007199254740993')).toBe('-9.007.199.254.740.993');
  });

  it('thiếu dữ liệu là "—", không phải 0; chuỗi chữ, NaN, Infinity không phải tiền', () => {
    for (const v of [null, undefined, '', 'Chưa có', '1.5', NaN, Infinity]) {
      expect(dinhDangTien(v as never)).toBe('—');
      expect(laTien(v)).toBe(false);
    }
    expect(laTien(0)).toBe(true);
    expect(dinhDangTien(0)).toMatch(/^0/);
  });

  it('cộng: số an toàn giữ Number; có chuỗi hoặc tràn → BigInt, trả chuỗi khi vượt ngưỡng', () => {
    expect(congTien([1_000_000, 2_000_000])).toBe(3_000_000);
    expect(congTien(['1000000000000', 1])).toBe(1_000_000_000_001);
    expect(congTien([Number.MAX_SAFE_INTEGER, 2])).toBe('9007199254740993');
    expect(congTien(['9007199254740993', '1'])).toBe('9007199254740994');
    // Thiếu dữ liệu không bị đổi thành 0 rồi cộng lén — chỉ bỏ qua.
    expect(congTien([null, undefined, 'abc', 5])).toBe(5);
    expect(congTien([])).toBe(0);
  });

  it('so sánh để sắp xếp không ép chuỗi về Number', () => {
    const ds = ['9007199254740993', '9007199254740992', 5] as const;
    expect([...ds].sort(soSanhTien)).toEqual([5, '9007199254740992', '9007199254740993']);
  });
});

describe('truTien', () => {
  it('trừ chính xác kể cả vượt MAX_SAFE_INTEGER, kết quả âm giữ dấu', () => {
    expect(truTien('9007199254740995', 1)).toBe('9007199254740994');
    expect(truTien(5, '9007199254740995')).toBe(-9007199254740990);
    expect(truTien(0, '9007199254740995')).toBe('-9007199254740995');
    expect(truTien(10, 3)).toBe(7);
  });
});
