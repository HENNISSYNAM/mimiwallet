import { taoAnhMau, type AnhMau } from './anh';

/**
 * Nắn phẳng phối cảnh (homography 4 điểm) — biến tứ giác tờ giấy chụp xiên thành hình chữ nhật.
 *
 * Toán: tìm ma trận H 3×3 (h33 = 1, còn 8 ẩn) sao cho mỗi góc (x, y) → (u, v):
 *   u = (h0 x + h1 y + h2) / (h6 x + h7 y + 1),  v = (h3 x + h4 y + h5) / (h6 x + h7 y + 1).
 * Bốn cặp điểm cho đúng 8 phương trình tuyến tính. Khi nắn, đi NGƯỢC (từ điểm ảnh đích về ảnh
 * nguồn) rồi nội suy song tuyến — đi xuôi sẽ để lại lỗ trống ở chỗ ảnh bị kéo giãn.
 */

export interface Diem { x: number; y: number }
/** Bốn góc theo thứ tự: trên-trái, trên-phải, dưới-phải, dưới-trái. */
export type BonGoc = [Diem, Diem, Diem, Diem];

/** Khử Gauss có chọn trụ. Trả `null` khi hệ suy biến (ba góc thẳng hàng, hai góc trùng nhau). */
export function giaiHe(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((dong, i) => [...dong, b[i]]);
  for (let c = 0; c < n; c++) {
    let tru = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[tru][c])) tru = r;
    if (Math.abs(M[tru][c]) < 1e-10) return null;
    [M[c], M[tru]] = [M[tru], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      if (!f) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((dong, i) => dong[n] / dong[i]);
}

/** Ma trận H (9 phần tử, hàng trước) đưa `tu[i]` tới `den[i]`. */
export function maTranPhoiCanh(tu: BonGoc, den: BonGoc): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = tu[i];
    const { x: u, y: v } = den[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = giaiHe(A, b);
  return h ? [...h, 1] : null;
}

export function apDung(H: number[], p: Diem): Diem {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

const kc = (a: Diem, b: Diem) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Sắp bốn điểm bất kỳ về thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái.
 * Xếp theo góc quanh trọng tâm (đúng cả khi tờ giấy xoay gần 45°, chỗ cách "x+y nhỏ nhất" hỏng),
 * rồi lấy điểm có x+y nhỏ nhất làm trên-trái.
 */
export function sapGoc(ds: Diem[]): BonGoc {
  const cx = ds.reduce((s, p) => s + p.x, 0) / ds.length;
  const cy = ds.reduce((s, p) => s + p.y, 0) / ds.length;
  const theoGoc = [...ds].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let dau = 0;
  for (let i = 1; i < 4; i++) if (theoGoc[i].x + theoGoc[i].y < theoGoc[dau].x + theoGoc[dau].y) dau = i;
  // atan2 với trục y hướng xuống: tăng dần = theo chiều kim đồng hồ trên màn hình.
  return [0, 1, 2, 3].map((k) => theoGoc[(dau + k) % 4]) as BonGoc;
}

/**
 * Kích thước ảnh ra: lấy cạnh dài hơn của mỗi cặp cạnh đối (giữ độ phân giải ở phía gần máy ảnh),
 * rồi thu về `canhToiDa` để tệp PDF không phình.
 */
export function kichThuocRa(goc: BonGoc, canhToiDa: number): { rong: number; cao: number } {
  const [tl, tr, br, bl] = goc;
  let rong = Math.max(kc(tl, tr), kc(bl, br));
  let cao = Math.max(kc(tl, bl), kc(tr, br));
  const tiLe = Math.min(1, canhToiDa / Math.max(rong, cao, 1));
  rong *= tiLe;
  cao *= tiLe;
  return { rong: Math.max(1, Math.round(rong)), cao: Math.max(1, Math.round(cao)) };
}

/** Nắn tứ giác `goc` của ảnh nguồn thành ảnh chữ nhật `rong × cao` (nội suy song tuyến). */
export function nanPhang(nguon: AnhMau, goc: BonGoc, rong: number, cao: number): AnhMau {
  const dich: BonGoc = [{ x: 0, y: 0 }, { x: rong - 1, y: 0 }, { x: rong - 1, y: cao - 1 }, { x: 0, y: cao - 1 }];
  const H = maTranPhoiCanh(dich, goc);
  const ra = taoAnhMau(rong, cao);
  if (!H) return ra;
  const { rong: W, cao: Hh, du } = nguon;
  const o = ra.du;
  for (let y = 0; y < cao; y++) {
    // Tính dần theo x: tử và mẫu đều tuyến tính theo x nên chỉ cần cộng.
    let nu = H[1] * y + H[2];
    let nv = H[4] * y + H[5];
    let w = H[7] * y + H[8];
    for (let x = 0; x < rong; x++, nu += H[0], nv += H[3], w += H[6]) {
      let sx = nu / w;
      let sy = nv / w;
      if (sx < 0) sx = 0; else if (sx > W - 1) sx = W - 1;
      if (sy < 0) sy = 0; else if (sy > Hh - 1) sy = Hh - 1;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1 < W ? x0 + 1 : x0;
      const y1 = y0 + 1 < Hh ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * W + x0) * 4;
      const i10 = (y0 * W + x1) * 4;
      const i01 = (y1 * W + x0) * 4;
      const i11 = (y1 * W + x1) * 4;
      const d = (y * rong + x) * 4;
      for (let k = 0; k < 3; k++) {
        const tren = du[i00 + k] + (du[i10 + k] - du[i00 + k]) * fx;
        const duoi = du[i01 + k] + (du[i11 + k] - du[i01 + k]) * fx;
        o[d + k] = tren + (duoi - tren) * fy;
      }
      o[d + 3] = 255;
    }
  }
  return ra;
}
