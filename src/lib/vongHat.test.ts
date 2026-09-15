import { describe, expect, it } from 'vitest';
import { buocVatLy, docMauHsl, soHatTheoKhung, taoHat, viTriGoc, VUNG_CHUOT } from './vongHat';

/** Bộ sinh số giả ngẫu nhiên cố định để test lặp lại được. */
const hatGiong = (s = 42) => () => {
  s = (s * 1664525 + 1013904223) % 4294967296;
  return s / 4294967296;
};

describe('vòng hạt', () => {
  it('phần lớn hạt nằm sát mép vòng', () => {
    const ds = taoHat(4000, hatGiong());
    const sat = ds.filter((h) => Math.abs(h.banKinh - 1) < 0.15).length / ds.length;
    expect(sat).toBeGreaterThan(0.6);
    expect(ds.every((h) => h.banKinh >= 0.35 && h.doMo > 0 && h.doMo <= 1)).toBe(true);
  });

  it('số hạt có trần và sàn theo khung', () => {
    expect(soHatTheoKhung(320, 400)).toBe(600);
    expect(soHatTheoKhung(2560, 1440)).toBe(2400);
  });

  it('hạt xoay theo thời gian, vẫn quanh tâm', () => {
    const [h] = taoHat(1, hatGiong(7));
    const a = viTriGoc(h, 0, 500, 400, 300);
    const b = viTriGoc(h, 60_000, 500, 400, 300);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(1);
    expect(Math.abs(Math.hypot(b.x - 500, b.y - 400) - h.banKinh * 300)).toBeLessThan(h.banKinh * 300 * 0.02);
  });

  it('chuột đẩy hạt ra rồi hạt tự trôi về chỗ cũ', () => {
    const [h] = taoHat(1, hatGiong(3));
    const gan = buocVatLy(h, 100, 100, { x: 90, y: 100 });
    expect(gan).toBeGreaterThan(0);
    expect(h.lx).toBeGreaterThan(0); // bị đẩy sang phải, xa chuột
    for (let i = 0; i < 400; i++) buocVatLy(h, 100, 100, null);
    expect(Math.hypot(h.lx, h.ly)).toBeLessThan(0.05);
  });

  it('chuột ở ngoài vùng ảnh hưởng thì không đẩy', () => {
    const [h] = taoHat(1, hatGiong(5));
    expect(buocVatLy(h, 0, 0, { x: VUNG_CHUOT + 1, y: 0 })).toBe(0);
    expect(h.lx).toBe(0);
  });

  it('đọc màu từ biến CSS, sai khuôn thì dùng màu dự phòng', () => {
    expect(docMauHsl(' 211 70% 55% ')).toEqual([211, 70, 55]);
    expect(docMauHsl('xanh')).toEqual([214, 60, 58]);
  });
});
