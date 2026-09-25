import { describe, expect, it } from 'vitest';
import { ngayHienThi, ngayHopLe } from './ngay';

describe('ngày hợp lệ', () => {
  it.each([['1900-01-01'], [''], ['0'], [null], [undefined], [0], ['không phải ngày'], ['2026-02-31'], ['0000-00-00']])('%s → không có ngày', (v) => {
    expect(ngayHopLe(v)).toBeNull();
    expect(ngayHienThi(v)).toBe('Chưa xác định');
  });
  it('ngày thật giữ nguyên', () => {
    expect(ngayHopLe('2026-07-01T00:00:00Z')).toBe('2026-07-01');
    expect(ngayHienThi('2026-07-01')).toBe('01/07/2026');
  });
});
