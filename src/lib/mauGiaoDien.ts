/**
 * Màu nhấn của giao diện, người dùng kéo chọn trong Cài đặt.
 *
 * MẶC ĐỊNH GIỮ NGUYÊN. Bảng màu hiện tại (xanh 211°) là lựa chọn của chủ sản phẩm; chưa chọn
 * gì thì không ghi đè biến CSS nào. Người dùng chỉ đổi SẮC ĐỘ — MIMI tự tính độ sáng.
 *
 * VÌ SAO TỰ TÍNH ĐỘ SÁNG. Màu nhấn nằm dưới chữ trắng (nút) và làm chữ trên nền trắng (liên
 * kết). `index.css` đặt xanh ở 46% vì đó là mức đạt 4.5:1 — nhưng vàng ở 46% chỉ khoảng
 * 2:1. Nên với mỗi sắc độ, lấy mức sáng cao nhất còn đạt 4.5:1 so với trắng: màu tươi nhất
 * có thể mà vẫn đọc được. Ở 211° kết quả đúng bằng 46%, trùng bảng màu gốc.
 */

export const SAC_DO_MAC_DINH = 211;
export const TUONG_PHAN_TOI_THIEU = 4.5;
const DO_BAO_HOA = 100;

function hslSangRgb(h: number, s: number, l: number): [number, number, number] {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = L - c / 2;
  return [r + m, g + m, b + m];
}

function doSangTuongDoi([r, g, b]: [number, number, number]): number {
  const kenh = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * kenh(r) + 0.7152 * kenh(g) + 0.0722 * kenh(b);
}

export function tuongPhanVoiTrang(h: number, s: number, l: number): number {
  return 1.05 / (doSangTuongDoi(hslSangRgb(h, s, l)) + 0.05);
}

/** Màu nhấn cho một sắc độ: độ sáng nguyên cao nhất còn đạt 4.5:1 với chữ trắng. */
export function mauNhan(h: number): { h: number; s: number; l: number } {
  const sac = Math.round(((h % 360) + 360) % 360);
  for (let l = 60; l >= 10; l--) {
    if (tuongPhanVoiTrang(sac, DO_BAO_HOA, l) >= TUONG_PHAN_TOI_THIEU) return { h: sac, s: DO_BAO_HOA, l };
  }
  return { h: sac, s: DO_BAO_HOA, l: 10 };
}

export const hslChu = ({ h, s, l }: { h: number; s: number; l: number }) => `${h} ${s}% ${l}%`;

/** Biến CSS cần ghi đè; `null` (chưa chọn) thì không ghi đè gì. */
export function bienMau(sacDo: number | null): Record<string, string> | null {
  if (sacDo === null || !Number.isFinite(sacDo)) return null;
  const m = mauNhan(sacDo);
  return {
    '--blue-500': hslChu(m),
    '--blue-400': hslChu({ ...m, l: Math.min(m.l + 9, 72) }),
    '--blue-glow': hslChu({ ...m, l: Math.min(m.l + 4, 70) }),
  };
}

const TEN_BIEN = ['--blue-500', '--blue-400', '--blue-glow'];

export function apDungMauGiaoDien(sacDo: number | null, goc: HTMLElement = document.documentElement) {
  const bien = bienMau(sacDo);
  for (const ten of TEN_BIEN) {
    if (bien) goc.style.setProperty(ten, bien[ten]);
    else goc.style.removeProperty(ten);
  }
}

/** Dải màu của thanh kéo: mỗi điểm là đúng màu nhấn sẽ dùng, không phải cầu vồng gốc. */
export function daiMauCss(): string {
  const diem = [];
  for (let h = 0; h <= 360; h += 20) diem.push(`hsl(${hslChu(mauNhan(h % 360))})`);
  return `linear-gradient(to right, ${diem.join(', ')})`;
}
