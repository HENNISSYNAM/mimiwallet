/**
 * Phép xử lý ảnh nền cho máy quét giấy tờ — hàm thuần trên mảng điểm ảnh.
 *
 * Vì sao tự viết thay vì dùng OpenCV.js: OpenCV.js nặng ~8 MB, phải tải WebAssembly lúc chạy
 * (CSP production chỉ cho script 'self'), trong khi máy quét chỉ cần vài phép: xám hoá, làm mờ,
 * Sobel, Otsu, giãn nở, xoay. Viết thuần trên `Uint8ClampedArray`/`Float32Array` còn chạy được
 * trong vitest (jsdom không có canvas thật) nên kiểm được từng bước bằng ảnh tổng hợp.
 */

/** Ảnh màu RGBA — cùng hình dạng `ImageData` để đổ thẳng vào canvas. */
export interface AnhMau { rong: number; cao: number; du: Uint8ClampedArray }
/** Ảnh một kênh, giá trị 0–255 (hoặc độ lớn gradient) dạng số thực. */
export interface AnhXam { rong: number; cao: number; du: Float32Array }

export const taoAnhMau = (rong: number, cao: number): AnhMau => ({ rong, cao, du: new Uint8ClampedArray(rong * cao * 4) });

/** Độ sáng theo hệ số BT.601 — cùng công thức máy quét và JPEG dùng, nên chữ đen trên giấy vàng vẫn tối. */
export function thanhXam(a: AnhMau): AnhXam {
  const n = a.rong * a.cao;
  const du = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) du[i] = 0.299 * a.du[j] + 0.587 * a.du[j + 1] + 0.114 * a.du[j + 2];
  return { rong: a.rong, cao: a.cao, du };
}

/**
 * Thu nhỏ bằng trung bình ô (box). Tìm mép trên ảnh ~400px thay vì 4000px: nhanh gấp trăm lần,
 * và mất chi tiết nhỏ (chữ, vân gỗ) lại là điều ta MUỐN — chỉ mép tờ giấy còn lại.
 */
export function thuNhoXam(a: AnhXam, canhToiDa: number): { anh: AnhXam; tiLe: number } {
  const tiLe = Math.min(1, canhToiDa / Math.max(a.rong, a.cao));
  if (tiLe >= 1) return { anh: a, tiLe: 1 };
  const rong = Math.max(1, Math.round(a.rong * tiLe));
  const cao = Math.max(1, Math.round(a.cao * tiLe));
  const du = new Float32Array(rong * cao);
  const bx = a.rong / rong;
  const by = a.cao / cao;
  for (let y = 0; y < cao; y++) {
    const y0 = Math.floor(y * by);
    const y1 = Math.max(y0 + 1, Math.floor((y + 1) * by));
    for (let x = 0; x < rong; x++) {
      const x0 = Math.floor(x * bx);
      const x1 = Math.max(x0 + 1, Math.floor((x + 1) * bx));
      let s = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) s += a.du[yy * a.rong + xx];
      du[y * rong + x] = s / ((y1 - y0) * (x1 - x0));
    }
  }
  return { anh: { rong, cao, du }, tiLe: rong / a.rong };
}

/** Làm mờ Gauss 5×5 (nhân [1 4 6 4 1]/16, tách hai chiều) — dập nhiễu cảm biến trước khi lấy đạo hàm. */
export function lamMo(a: AnhXam): AnhXam {
  const { rong, cao } = a;
  const k = [1, 4, 6, 4, 1];
  const tam = new Float32Array(rong * cao);
  const ra = new Float32Array(rong * cao);
  const kep = (v: number, max: number) => (v < 0 ? 0 : v > max ? max : v);
  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      let s = 0;
      for (let i = -2; i <= 2; i++) s += k[i + 2] * a.du[y * rong + kep(x + i, rong - 1)];
      tam[y * rong + x] = s / 16;
    }
  }
  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      let s = 0;
      for (let i = -2; i <= 2; i++) s += k[i + 2] * tam[kep(y + i, cao - 1) * rong + x];
      ra[y * rong + x] = s / 16;
    }
  }
  return { rong, cao, du: ra };
}

/** Sobel: độ lớn gradient và hướng (để Canny tỉa mép còn một điểm ảnh). */
export function sobel(a: AnhXam): { doLon: AnhXam; huong: Float32Array } {
  const { rong, cao } = a;
  const doLon = new Float32Array(rong * cao);
  const huong = new Float32Array(rong * cao);
  const p = (x: number, y: number) => a.du[y * rong + x];
  for (let y = 1; y < cao - 1; y++) {
    for (let x = 1; x < rong - 1; x++) {
      const gx = -p(x - 1, y - 1) - 2 * p(x - 1, y) - p(x - 1, y + 1) + p(x + 1, y - 1) + 2 * p(x + 1, y) + p(x + 1, y + 1);
      const gy = -p(x - 1, y - 1) - 2 * p(x, y - 1) - p(x + 1, y - 1) + p(x - 1, y + 1) + 2 * p(x, y + 1) + p(x + 1, y + 1);
      doLon[y * rong + x] = Math.hypot(gx, gy);
      huong[y * rong + x] = Math.atan2(gy, gx);
    }
  }
  return { doLon: { rong, cao, du: doLon }, huong };
}

/**
 * Ngưỡng Otsu trên dải [min, max] của dữ liệu (256 ngăn): chọn ngưỡng tách hai nhóm rõ nhất.
 * Dùng cho cả độ sáng (giấy sáng / nền tối) lẫn độ lớn gradient (mép / không mép).
 */
export function nguongOtsu(du: ArrayLike<number>): number {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < du.length; i++) { const v = du[i]; if (v < min) min = v; if (v > max) max = v; }
  if (!(max > min)) return min;
  const ngan = new Float64Array(256);
  const buoc = (max - min) / 255;
  for (let i = 0; i < du.length; i++) ngan[Math.round((du[i] - min) / buoc)]++;
  const n = du.length;
  let tongTatCa = 0;
  for (let i = 0; i < 256; i++) tongTatCa += i * ngan[i];
  let wB = 0;
  let sB = 0;
  let tot = 0;
  let nguong = 0;
  for (let i = 0; i < 256; i++) {
    wB += ngan[i];
    if (!wB) continue;
    const wF = n - wB;
    if (!wF) break;
    sB += i * ngan[i];
    const mB = sB / wB;
    const mF = (tongTatCa - sB) / wF;
    const giua = wB * wF * (mB - mF) * (mB - mF);
    if (giua > tot) { tot = giua; nguong = i; }
  }
  return min + (nguong + 0.5) * buoc;
}

/**
 * Canny rút gọn: tỉa không-cực-đại theo hướng gradient + ngưỡng trễ (cao = Otsu, thấp = nửa).
 * Trả mặt nạ 0/1. Mép mảnh một điểm ảnh nên vùng kín bên trong tờ giấy không bị mép "ăn" mất.
 */
export function timMep(a: AnhXam): Uint8Array {
  const { rong, cao } = a;
  const { doLon, huong } = sobel(a);
  const m = doLon.du;
  const mong = new Float32Array(rong * cao);
  for (let y = 1; y < cao - 1; y++) {
    for (let x = 1; x < rong - 1; x++) {
      const i = y * rong + x;
      const v = m[i];
      if (!v) continue;
      // Làm tròn hướng về 0°, 45°, 90°, 135°.
      let g = (huong[i] * 180) / Math.PI;
      if (g < 0) g += 180;
      let a1: number;
      let a2: number;
      if (g < 22.5 || g >= 157.5) { a1 = m[i - 1]; a2 = m[i + 1]; }
      else if (g < 67.5) { a1 = m[i - rong - 1]; a2 = m[i + rong + 1]; }
      else if (g < 112.5) { a1 = m[i - rong]; a2 = m[i + rong]; }
      else { a1 = m[i - rong + 1]; a2 = m[i + rong - 1]; }
      if (v >= a1 && v >= a2) mong[i] = v;
    }
  }
  const cao_ = Math.max(nguongOtsu(m), 8);
  const thap = cao_ / 2;
  const mep = new Uint8Array(rong * cao);
  const hang: number[] = [];
  for (let i = 0; i < mong.length; i++) if (mong[i] >= cao_) { mep[i] = 1; hang.push(i); }
  while (hang.length) {
    const i = hang.pop() as number;
    const x = i % rong;
    const y = (i - x) / rong;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= rong || yy >= cao) continue;
        const j = yy * rong + xx;
        if (!mep[j] && mong[j] >= thap) { mep[j] = 1; hang.push(j); }
      }
    }
  }
  return mep;
}

/** Giãn nở 3×3 — nối các khe nhỏ trên mép tờ giấy (góc bị tay che, nếp gấp). */
export function gianNo(mat: Uint8Array, rong: number, cao: number): Uint8Array {
  const ra = new Uint8Array(mat.length);
  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      if (!mat[y * rong + x]) continue;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= cao) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < rong) ra[yy * rong + xx] = 1;
        }
      }
    }
  }
  return ra;
}

/** Xoay ảnh 90° × `lan` theo chiều kim đồng hồ (lan âm = ngược chiều). */
export function xoay90(a: AnhMau, lan: number): AnhMau {
  const q = ((lan % 4) + 4) % 4;
  if (q === 0) return a;
  const { rong, cao } = a;
  const ra = q === 2 ? taoAnhMau(rong, cao) : taoAnhMau(cao, rong);
  for (let y = 0; y < cao; y++) {
    for (let x = 0; x < rong; x++) {
      let nx: number;
      let ny: number;
      if (q === 1) { nx = cao - 1 - y; ny = x; }
      else if (q === 2) { nx = rong - 1 - x; ny = cao - 1 - y; }
      else { nx = y; ny = rong - 1 - x; }
      const tu = (y * rong + x) * 4;
      const den = (ny * ra.rong + nx) * 4;
      ra.du[den] = a.du[tu];
      ra.du[den + 1] = a.du[tu + 1];
      ra.du[den + 2] = a.du[tu + 2];
      ra.du[den + 3] = a.du[tu + 3];
    }
  }
  return ra;
}
