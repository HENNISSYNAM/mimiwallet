import { describe, expect, it } from 'vitest';
import { apDungMauGiaoDien, bienMau, mauNhan, SAC_DO_MAC_DINH, tuongPhanVoiTrang } from './mauGiaoDien';

describe('màu giao diện', () => {
  it('sắc độ mặc định cho đúng xanh 46% của bảng màu gốc', () => {
    expect(mauNhan(SAC_DO_MAC_DINH)).toEqual({ h: 211, s: 100, l: 46 });
  });

  it('mọi sắc độ đều đạt 4.5:1 với chữ trắng; vàng phải tối hơn xanh', () => {
    for (let h = 0; h < 360; h += 5) {
      const m = mauNhan(h);
      expect(tuongPhanVoiTrang(m.h, m.s, m.l)).toBeGreaterThanOrEqual(4.5);
    }
    expect(mauNhan(55).l).toBeLessThan(mauNhan(211).l);
  });

  it('chưa chọn thì không ghi đè biến nào; chọn rồi bỏ thì trả về mặc định', () => {
    expect(bienMau(null)).toBeNull();
    const goc = document.createElement('div');
    apDungMauGiaoDien(140, goc);
    expect(goc.style.getPropertyValue('--blue-500')).toBe(`140 100% ${mauNhan(140).l}%`);
    apDungMauGiaoDien(null, goc);
    expect(goc.style.getPropertyValue('--blue-500')).toBe('');
  });
});
