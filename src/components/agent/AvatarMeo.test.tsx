import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarMeo, luoiMeo, netTuTrangThai } from './AvatarMeo';

describe('mèo khối của agent', () => {
  it('lưới đủ 13 hàng × 16 cột ở mọi nét mặt; các nét khác nhau thật', () => {
    const cac = (['ngu', 'lam', 'hoi', 'vui'] as const).map((n) => luoiMeo(n));
    for (const g of cac) { expect(g).toHaveLength(15); for (const d of g) expect(d).toHaveLength(16); }
    expect(new Set(cac.map((g) => g.join('|'))).size).toBe(4);
    expect(luoiMeo('lam', true).join('')).not.toBe(luoiMeo('lam').join(''));
    // Đang ngủ thì không đeo kính (mắt nhắm).
    expect(luoiMeo('ngu', true)).toEqual(luoiMeo('ngu'));
  });

  it('nét mặt theo việc thật: chờ bạn > đang làm > rảnh', () => {
    expect(netTuTrangThai({ can_ban: 1, dang_lam: 2, cho_agent: 0, xong_7_ngay: 0 })).toBe('hoi');
    expect(netTuTrangThai({ can_ban: 0, dang_lam: 0, cho_agent: 1, xong_7_ngay: 0 })).toBe('lam');
    expect(netTuTrangThai({ can_ban: 0, dang_lam: 0, cho_agent: 0, xong_7_ngay: 5 })).toBe('ngu');
  });

  it('có tên cho trình đọc màn hình; chờ bạn có dấu "!"', () => {
    const { container } = render(<AvatarMeo mau="#f59e0b" net="hoi" ten="Agent Phân loại" />);
    expect(screen.getByRole('img', { name: 'Agent Phân loại — đang chờ bạn' })).toBeTruthy();
    expect(container.textContent).toContain('!');
  });

  it('12 mèo khác nhau về DÁNG (phụ kiện riêng), không chỉ khác màu', async () => {
    const { HINH_MEO } = await import('./AvatarMeo');
    const khoa = Object.keys(HINH_MEO);
    expect(khoa).toHaveLength(12);
    const dang = khoa.map((k) => luoiMeo('lam', HINH_MEO[k].phu_kien).join('|'));
    expect(new Set(dang).size).toBe(12);
    expect(new Set(khoa.map((k) => HINH_MEO[k].mau)).size).toBe(12);
    for (const g of khoa.map((k) => luoiMeo('lam', HINH_MEO[k].phu_kien))) { expect(g).toHaveLength(15); for (const d of g) expect(d).toHaveLength(16); }
    expect(['thue', 'mua_hang'].map((k) => HINH_MEO[k].phu_kien)).toEqual(['phu_thuy', 'dau_bep']);
  });
});
