import { taoAnhMau, thanhXam, type AnhMau, type AnhXam } from './anh';

/**
 * Làm rõ trang đã nắn: chế độ "Tài liệu" (đen trắng) và "Màu" (khử bóng, giữ màu con dấu).
 *
 * Vì sao không dùng một ngưỡng chung cho cả trang: ảnh chụp bằng điện thoại luôn có bóng tay,
 * góc tối, đèn vàng một bên. Một ngưỡng chung làm nửa trang đen kịt hoặc chữ nhạt mất. Ở đây
 * mỗi điểm so với trung bình VÙNG quanh nó (ngưỡng thích nghi Bradley–Roth, tính bằng ảnh tích
 * phân nên cửa sổ to cỡ nào cũng O(1) mỗi điểm).
 */

export type CheDoQuet = 'tai_lieu' | 'mau' | 'goc';

/** Ảnh tích phân (w+1)×(h+1): tổng một hình chữ nhật bất kỳ chỉ cần 4 phép đọc. */
export function anhTichPhan(a: AnhXam): Float64Array {
  const W = a.rong + 1;
  const I = new Float64Array(W * (a.cao + 1));
  for (let y = 0; y < a.cao; y++) {
    let hang = 0;
    for (let x = 0; x < a.rong; x++) {
      hang += a.du[y * a.rong + x];
      I[(y + 1) * W + x + 1] = I[y * W + x + 1] + hang;
    }
  }
  return I;
}

/** Trung bình vùng (2r+1)² quanh mỗi điểm, cắt ở mép ảnh. */
export function trungBinhVung(a: AnhXam, r: number): Float32Array {
  const I = anhTichPhan(a);
  const W = a.rong + 1;
  const ra = new Float32Array(a.rong * a.cao);
  for (let y = 0; y < a.cao; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(a.cao, y + r + 1);
    for (let x = 0; x < a.rong; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(a.rong, x + r + 1);
      const s = I[y1 * W + x1] - I[y0 * W + x1] - I[y1 * W + x0] + I[y0 * W + x0];
      ra[y * a.rong + x] = s / ((y1 - y0) * (x1 - x0));
    }
  }
  return ra;
}

/** Bán kính cửa sổ: ~1/16 cạnh dài — to hơn nét chữ nhiều lần, nhỏ hơn vệt bóng. */
const banKinh = (a: { rong: number; cao: number }) => Math.max(4, Math.round(Math.max(a.rong, a.cao) / 16));

/**
 * Đen trắng kiểu máy quét: điểm tối hơn trung bình vùng quá `doNhay` (12%) thành đen, còn lại trắng.
 * Thêm điều kiện chênh tuyệt đối ≥ 10 mức xám để giấy trắng phẳng không lốm đốm nhiễu.
 */
export function cheDoTaiLieu(anh: AnhMau, doNhay = 0.12): AnhMau {
  const xam = thanhXam(anh);
  const tb = trungBinhVung(xam, banKinh(anh));
  const ra = taoAnhMau(anh.rong, anh.cao);
  for (let i = 0, j = 0; i < xam.du.length; i++, j += 4) {
    const v = xam.du[i];
    const den = v < tb[i] * (1 - doNhay) && tb[i] - v >= 10;
    const g = den ? 0 : 255;
    ra.du[j] = g; ra.du[j + 1] = g; ra.du[j + 2] = g; ra.du[j + 3] = 255;
  }
  return ra;
}

/**
 * Màu khử bóng: chia mỗi kênh cho độ sáng nền ước lượng (trung bình vùng lớn) — vùng bị bóng
 * được nâng sáng tương ứng, giấy về gần trắng đều. Sau đó kéo giãn mức đen (phân vị 2%) về 0
 * cho chữ đậm lại. Giữ màu, nên con dấu đỏ, chữ ký xanh vẫn đọc được.
 */
export function cheDoMau(anh: AnhMau): AnhMau {
  const xam = thanhXam(anh);
  const nen = trungBinhVung(xam, banKinh(anh) * 2);
  const ra = taoAnhMau(anh.rong, anh.cao);
  const ngan = new Uint32Array(256);
  for (let i = 0, j = 0; i < xam.du.length; i++, j += 4) {
    const k = 245 / Math.max(nen[i], 24);
    for (let c = 0; c < 3; c++) ra.du[j + c] = anh.du[j + c] * k;
    ra.du[j + 3] = 255;
    ngan[Math.min(255, Math.round(xam.du[i] * k))]++;
  }
  let den = 0;
  let dem = 0;
  const muc = xam.du.length * 0.02;
  while (den < 200 && dem + ngan[den] < muc) dem += ngan[den++];
  if (den > 0) {
    const h = 255 / (255 - den);
    for (let j = 0; j < ra.du.length; j += 4) {
      for (let c = 0; c < 3; c++) ra.du[j + c] = (ra.du[j + c] - den) * h;
    }
  }
  return ra;
}

export function apCheDo(anh: AnhMau, cheDo: CheDoQuet): AnhMau {
  if (cheDo === 'tai_lieu') return cheDoTaiLieu(anh);
  if (cheDo === 'mau') return cheDoMau(anh);
  return anh;
}
