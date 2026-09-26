import { describe, expect, it } from 'vitest';
import { duocGoi, idTuIp, ipNguoiGoi } from './gioi-han';

const req = (h: Record<string, string>) => new Request('https://x', { headers: h });

describe('giới hạn tần suất', () => {
  it('lấy IP máy khách đầu chuỗi x-forwarded-for; chuỗi rác thành "khong-ro"', () => {
    expect(ipNguoiGoi(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
    expect(ipNguoiGoi(req({ 'x-forwarded-for': '<script>' }))).toBe('khong-ro');
    expect(ipNguoiGoi(req({}))).toBe('khong-ro');
  });

  it('IP băm thành uuid ổn định; khác muối khác khoá; không chứa IP thô', async () => {
    const a = await idTuIp('203.0.113.7');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(await idTuIp('203.0.113.7')).toBe(a);
    expect(await idTuIp('203.0.113.7', 'khac')).not.toBe(a);
    expect(a).not.toContain('203');
  });

  const db = (kq: { data?: unknown; error?: { message: string } }[]) => {
    let i = 0;
    return { rpc: async () => kq[i++] ?? { data: true } };
  };

  it('hỏng một mức là dừng', async () => {
    expect(await duocGoi(db([{ data: true }, { data: false }]), 'k', [{ hanh_dong: 'a', cua_so_giay: 60, toi_da: 1 }, { hanh_dong: 'b', cua_so_giay: 86400, toi_da: 1 }])).toBe(false);
    expect(await duocGoi(db([{ data: true }]), 'k', [{ hanh_dong: 'a', cua_so_giay: 60, toi_da: 1 }])).toBe(true);
  });

  it('bộ đếm lỗi: việc tốn tiền thì từ chối, việc thường thì cho qua', async () => {
    const m = [{ hanh_dong: 'a', cua_so_giay: 60, toi_da: 1 }];
    expect(await duocGoi(db([{ error: { message: 'x' } }]), 'k', m, true)).toBe(false);
    expect(await duocGoi(db([{ error: { message: 'x' } }]), 'k', m, false)).toBe(true);
  });
});
