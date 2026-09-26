#!/usr/bin/env node
/**
 * Cắt dải hoạt ảnh chạy của MIMI thành sprite dùng cho pet.
 *
 *   node scripts/cat-khung-chay.mjs <dải-ảnh.png> [số-khung=8] [đường-ra]
 *
 * Đầu vào: một ảnh PNG, các con mèo xếp ngang, nền trắng hoặc trong suốt (như dải "Hoạt ảnh chạy nhảy").
 * Đầu ra: src/assets/mimi/run-sprite.png (hoặc [đường-ra]) — N ô bằng nhau xếp ngang, nền trong suốt, mèo
 * căn giữa theo trọng tâm thân, CÙNG TỈ LỆ và CÙNG ĐƯỜNG ĐẤT: khung nào vẽ nhảy lên thì vẫn nhảy lên đúng bấy nhiêu, khung
 * nào chạm đất thì chạm đúng một đường — không bị giật do mỗi khung tự co giãn/căn riêng.
 *
 * Nền trắng được xoá bằng loang từ mép ảnh (chỉ vùng trắng nối với mép), nên lông kem/trắng bên trong
 * con mèo không bị ăn mất.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [, , vao, soKhungArg, raArg] = process.argv;
if (!vao) { console.error('Cách dùng: node scripts/cat-khung-chay.mjs <dải-ảnh.png> [số-khung=8]'); process.exit(1); }
const SO_KHUNG = Number(soKhungArg ?? 8);
const RA = path.resolve(raArg ?? 'src/assets/mimi/run-sprite.png');
const O = 256; // cạnh mỗi ô, px
const LE = 8;  // lề trong ô

const anh = PNG.sync.read(fs.readFileSync(vao));
const { width: W, height: H, data } = anh;
const idx = (x, y) => (y * W + x) * 4;

// 1) Xoá nền: loang từ mép, điểm gần trắng (hoặc đã trong suốt) và nối với mép → trong suốt.
const laNen = (i) => data[i + 3] < 16 || (data[i] > 232 && data[i + 1] > 232 && data[i + 2] > 232);
const daXet = new Uint8Array(W * H);
const hang = [];
for (let x = 0; x < W; x++) { hang.push(x, 0, x, H - 1); }
for (let y = 0; y < H; y++) { hang.push(0, y, W - 1, y); }
while (hang.length) {
  const y = hang.pop(); const x = hang.pop();
  if (x < 0 || y < 0 || x >= W || y >= H) continue;
  const k = y * W + x;
  if (daXet[k]) continue;
  daXet[k] = 1;
  const i = k * 4;
  if (!laNen(i)) continue;
  data[i + 3] = 0;
  hang.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
}
// Viền mờ: điểm sát nền mà vẫn rất sáng → giảm độ đục cho khỏi viền trắng.
for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
  const i = idx(x, y);
  if (data[i + 3] === 0) continue;
  const keNen = data[idx(x - 1, y) + 3] === 0 || data[idx(x + 1, y) + 3] === 0 || data[idx(x, y - 1) + 3] === 0 || data[idx(x, y + 1) + 3] === 0;
  if (keNen && data[i] > 215 && data[i + 1] > 215 && data[i + 2] > 215) data[i + 3] = 110;
}

// 2) Tìm các cột có mèo (cột có điểm đục), gộp thành từng con.
const cotCo = Array.from({ length: W }, (_, x) => { for (let y = 0; y < H; y++) if (data[idx(x, y) + 3] > 40) return true; return false; });
let doan = [];
for (let x = 0; x < W;) {
  if (!cotCo[x]) { x++; continue; }
  const dau = x; while (x < W && cotCo[x]) x++;
  doan.push([dau, x - 1]);
}
// Gộp các mẩu nhỏ (đuôi, bàn chân tách rời) vào con gần nhất cho tới khi còn đúng N con.
while (doan.length > SO_KHUNG) {
  let tot = 0; let kc = Infinity;
  for (let i = 0; i < doan.length - 1; i++) { const d = doan[i + 1][0] - doan[i][1]; if (d < kc) { kc = d; tot = i; } }
  doan.splice(tot, 2, [doan[tot][0], doan[tot + 1][1]]);
}
if (doan.length !== SO_KHUNG) { console.error(`Chỉ tìm được ${doan.length} con mèo, cần ${SO_KHUNG}. Kiểm lại ảnh (nền phải trắng/trong, các con không dính nhau).`); process.exit(2); }

// 3) Khung bao từng con; tỉ lệ chung theo con to nhất để mọi khung cùng cỡ.
const bao = doan.map(([x0, x1]) => {
  let y0 = H, y1 = -1;
  for (let x = x0; x <= x1; x++) for (let y = 0; y < H; y++) if (data[idx(x, y) + 3] > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return { x0, x1, y0, y1 };
});
const datChung = Math.max(...bao.map((b) => b.y1)); // mặt đất của cả dải
const dinhChung = Math.min(...bao.map((b) => b.y0));
const lonNhat = Math.max(datChung - dinhChung + 1, ...bao.map((b) => b.x1 - b.x0 + 1));
const tiLe = (O - 2 * LE) / lonNhat;
const dayChung = O - LE; // mặt đất trong ô

const ra = new PNG({ width: O * SO_KHUNG, height: O });
bao.forEach((b, k) => {
  let tong = 0, m = 0;
  for (let x = b.x0; x <= b.x1; x++) for (let y = b.y0; y <= b.y1; y++) { const a = data[idx(x, y) + 3]; tong += a; m += a * x; }
  const trongTam = tong ? m / tong : (b.x0 + b.x1) / 2;
  const trai = k * O + O / 2 - (trongTam - b.x0) * tiLe; // trọng tâm thân mèo nằm giữa ô
  const tren = dayChung - (datChung - b.y0 + 1) * tiLe; // giữ độ cao so với mặt đất như trong dải
  for (let yy = 0; yy < O; yy++) for (let xx = 0; xx < O; xx++) {
    const X = k * O + xx;
    // Lấy mẫu song tuyến tính từ ảnh gốc.
    const sx = b.x0 + (X - trai) / tiLe; const sy = b.y0 + (yy - tren) / tiLe;
    if (sx < b.x0 || sy < b.y0 || sx > b.x1 || sy > b.y1) continue;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), x1 = Math.min(x0 + 1, W - 1), y1 = Math.min(y0 + 1, H - 1);
    const fx = sx - x0, fy = sy - y0;
    const o = (yy * ra.width + X) * 4;
    let a = 0; const c = [0, 0, 0];
    for (const [px, py, w] of [[x0, y0, (1 - fx) * (1 - fy)], [x1, y0, fx * (1 - fy)], [x0, y1, (1 - fx) * fy], [x1, y1, fx * fy]]) {
      const i = idx(px, py); const wa = w * data[i + 3];
      a += wa; c[0] += data[i] * wa; c[1] += data[i + 1] * wa; c[2] += data[i + 2] * wa;
    }
    if (a <= 0) continue;
    ra.data[o] = c[0] / a; ra.data[o + 1] = c[1] / a; ra.data[o + 2] = c[2] / a; ra.data[o + 3] = Math.min(255, a);
  }
});
fs.writeFileSync(RA, PNG.sync.write(ra));
console.log(`Đã ghi ${path.relative(process.cwd(), RA)} — ${SO_KHUNG} khung ${O}x${O}, cùng tỉ lệ, cùng mặt đất.`);
