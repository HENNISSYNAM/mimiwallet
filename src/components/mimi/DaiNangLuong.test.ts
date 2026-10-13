import { describe, expect, it } from 'vitest';
import { trangThaiDai } from './ThanhNangLuong';

const ngay = (d: number) => new Date(2026, 9, d, 10); // tháng 10/2026 (31 ngày)

describe('dải năng lượng kiểu Claude', () => {
  it('dùng ít và đúng nhịp: không hiện', () => {
    expect(trangThaiDai({ phanTram: 80, hanMuc: 3000 }, ngay(20))).toBeNull();
  });
  it('dùng ≥ 50%: hiện, mốc 50; nạp lại ngày 1 tháng sau', () => {
    const t = trangThaiDai({ phanTram: 45, hanMuc: 3000 }, ngay(28))!;
    expect(t).toMatchObject({ daDung: 55, moc: 50, nhanHonNhip: false });
    expect(t.ngayNap.getMonth()).toBe(10);
    expect(t.ngayNap.getDate()).toBe(1);
  });
  it('dùng nhanh hơn nhịp tháng (giữa tháng đã dùng 40%): hiện cảnh báo dù chưa tới 50%', () => {
    expect(trangThaiDai({ phanTram: 60, hanMuc: 3000 }, ngay(5))).toMatchObject({ daDung: 40, nhanHonNhip: true });
  });
  it('mốc tăng dần 75 / 90 / 100 để hiện lại sau khi đã đóng', () => {
    expect(trangThaiDai({ phanTram: 20, hanMuc: 3000 }, ngay(30))!.moc).toBe(75);
    expect(trangThaiDai({ phanTram: 5, hanMuc: 3000 }, ngay(30))!.moc).toBe(90);
    expect(trangThaiDai({ phanTram: 0, hanMuc: 3000 }, ngay(30))!.moc).toBe(100);
  });
  it('không có hạn mức: không hiện', () => expect(trangThaiDai({ phanTram: 0, hanMuc: 0 }, ngay(5))).toBeNull());
});
