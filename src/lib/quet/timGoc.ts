import { gianNo, lamMo, nguongOtsu, thuNhoXam, timMep, type AnhXam } from './anh';
import { sapGoc, type BonGoc, type Diem } from './phoiCanh';

/**
 * Tự tìm bốn góc tờ giấy trong ảnh chụp.
 *
 * Cách làm (không cần OpenCV):
 *  1. Thu ảnh xám về ~360px, làm mờ, tìm mép kiểu Canny, giãn nở một vòng để nối khe.
 *  2. Ứng viên A — "vùng kín": loang từ viền ảnh qua các điểm không phải mép; phần KHÔNG loang tới
 *     được là vùng bị mép bao kín. Tờ giấy là vùng kín lớn nhất (chữ bên trong chỉ đục lỗ, không
 *     chia nó ra). Cách này bắt được cả giấy trắng trên bàn trắng, miễn có một đường mép.
 *  3. Ứng viên B — "vùng sáng": khi mép hở (tờ giấy chạm mép ảnh), lấy vùng sáng liền khối lớn
 *     nhất theo ngưỡng Otsu. Hợp với giấy trắng trên nền tối — trường hợp phổ biến nhất.
 *  4. Lấy bao lồi của vùng, chọn tứ giác diện tích lớn nhất có đỉnh trên bao lồi.
 * Không tìm được tứ giác đáng tin thì trả khung lùi vào 4% — người dùng kéo góc chỉnh tay.
 */

const CANH_TIM = 360;

export interface KetQuaTimGoc {
  goc: BonGoc;
  /** `false` = không tìm thấy, đang trả khung mặc định — giao diện nên nhắc kéo góc. */
  timThay: boolean;
}

/** Khung mặc định: lùi vào một chút để người dùng thấy và nắm được bốn tay kéo. */
export function khungMacDinh(rong: number, cao: number, le = 0.04): BonGoc {
  const dx = rong * le;
  const dy = cao * le;
  return [
    { x: dx, y: dy }, { x: rong - dx, y: dy }, { x: rong - dx, y: cao - dy }, { x: dx, y: cao - dy },
  ];
}

/** Gắn nhãn thành phần liên thông (4 lân cận) trên mặt nạ; trả nhãn và số điểm của từng nhãn. */
function ganNhan(mat: Uint8Array, rong: number, cao: number): { nhan: Int32Array; dem: number[] } {
  const nhan = new Int32Array(mat.length);
  const dem = [0];
  const hang = new Int32Array(mat.length);
  for (let i = 0; i < mat.length; i++) {
    if (!mat[i] || nhan[i]) continue;
    const id = dem.length;
    let dau = 0;
    let cuoi = 0;
    hang[cuoi++] = i;
    nhan[i] = id;
    let n = 0;
    while (dau < cuoi) {
      const j = hang[dau++];
      n++;
      const x = j % rong;
      if (x > 0 && mat[j - 1] && !nhan[j - 1]) { nhan[j - 1] = id; hang[cuoi++] = j - 1; }
      if (x < rong - 1 && mat[j + 1] && !nhan[j + 1]) { nhan[j + 1] = id; hang[cuoi++] = j + 1; }
      if (j >= rong && mat[j - rong] && !nhan[j - rong]) { nhan[j - rong] = id; hang[cuoi++] = j - rong; }
      if (j < rong * (cao - 1) && mat[j + rong] && !nhan[j + rong]) { nhan[j + rong] = id; hang[cuoi++] = j + rong; }
    }
    dem.push(n);
  }
  return { nhan, dem };
}

const cheo = (o: Diem, a: Diem, b: Diem) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

/** Bao lồi (chuỗi đơn điệu Andrew). */
export function baoLoi(ds: Diem[]): Diem[] {
  const p = [...ds].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const duoi: Diem[] = [];
  for (const d of p) {
    while (duoi.length >= 2 && cheo(duoi[duoi.length - 2], duoi[duoi.length - 1], d) <= 0) duoi.pop();
    duoi.push(d);
  }
  const tren: Diem[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const d = p[i];
    while (tren.length >= 2 && cheo(tren[tren.length - 2], tren[tren.length - 1], d) <= 0) tren.pop();
    tren.push(d);
  }
  return duoi.slice(0, -1).concat(tren.slice(0, -1));
}

export const dienTich = (ds: Diem[]) => {
  let s = 0;
  for (let i = 0; i < ds.length; i++) {
    const a = ds[i];
    const b = ds[(i + 1) % ds.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
};

/**
 * Tứ giác diện tích lớn nhất có đỉnh trên bao lồi. Với mỗi đường chéo (i, k), hai đỉnh còn lại
 * là điểm xa đường chéo nhất ở mỗi phía — O(n³), n ≤ 120 nên vài chục mili giây là cùng.
 */
export function tuGiacLonNhat(bao: Diem[]): Diem[] | null {
  let p = bao;
  if (p.length < 4) return null;
  if (p.length > 120) {
    const buoc = p.length / 120;
    p = Array.from({ length: 120 }, (_, i) => p[Math.floor(i * buoc)]);
  }
  const n = p.length;
  let tot = -1;
  let kq: Diem[] | null = null;
  for (let i = 0; i < n; i++) {
    for (let k = i + 2; k < n; k++) {
      if (i === 0 && k === n - 1) continue;
      let maxA = -1;
      let jA = -1;
      for (let j = i + 1; j < k; j++) {
        const s = Math.abs(cheo(p[i], p[k], p[j]));
        if (s > maxA) { maxA = s; jA = j; }
      }
      let maxB = -1;
      let jB = -1;
      for (let j = k + 1; j < n + i; j++) {
        const q = p[j % n];
        const s = Math.abs(cheo(p[i], p[k], q));
        if (s > maxB) { maxB = s; jB = j % n; }
      }
      if (jA < 0 || jB < 0) continue;
      if (maxA + maxB > tot) { tot = maxA + maxB; kq = [p[i], p[jA], p[k], p[jB]]; }
    }
  }
  return kq;
}

/** Điểm biên trái/phải mỗi hàng của một thành phần — đủ để dựng bao lồi, ít điểm hơn hẳn. */
function diemBien(nhan: Int32Array, id: number, rong: number, cao: number): Diem[] {
  const ds: Diem[] = [];
  for (let y = 0; y < cao; y++) {
    let trai = -1;
    let phai = -1;
    for (let x = 0; x < rong; x++) {
      if (nhan[y * rong + x] === id) { if (trai < 0) trai = x; phai = x; }
    }
    if (trai >= 0) { ds.push({ x: trai, y }); ds.push({ x: phai + 1, y }); ds.push({ x: trai, y: y + 1 }); ds.push({ x: phai + 1, y: y + 1 }); }
  }
  return ds;
}

interface UngVien { tuGiac: Diem[]; tiLeDienTich: number; doDac: number }

function ungVienTu(mat: Uint8Array, rong: number, cao: number): UngVien | null {
  const { nhan, dem } = ganNhan(mat, rong, cao);
  let id = 0;
  for (let i = 1; i < dem.length; i++) if (dem[i] > (dem[id] ?? 0)) id = i;
  if (!id) return null;
  const tuGiac = tuGiacLonNhat(baoLoi(diemBien(nhan, id, rong, cao)));
  if (!tuGiac) return null;
  const s = dienTich(tuGiac);
  if (!s) return null;
  return { tuGiac, tiLeDienTich: s / (rong * cao), doDac: dem[id] / s };
}

/** Vùng kín: phần không loang được từ viền ảnh qua các điểm không phải mép. */
function matVungKin(mep: Uint8Array, rong: number, cao: number): Uint8Array {
  const ngoai = new Uint8Array(mep.length);
  const hang = new Int32Array(mep.length);
  let cuoi = 0;
  const day = (i: number) => { if (!mep[i] && !ngoai[i]) { ngoai[i] = 1; hang[cuoi++] = i; } };
  for (let x = 0; x < rong; x++) { day(x); day((cao - 1) * rong + x); }
  for (let y = 0; y < cao; y++) { day(y * rong); day(y * rong + rong - 1); }
  let dau = 0;
  while (dau < cuoi) {
    const j = hang[dau++];
    const x = j % rong;
    if (x > 0) day(j - 1);
    if (x < rong - 1) day(j + 1);
    if (j >= rong) day(j - rong);
    if (j < rong * (cao - 1)) day(j + rong);
  }
  const kin = new Uint8Array(mep.length);
  for (let i = 0; i < kin.length; i++) kin[i] = !mep[i] && !ngoai[i] ? 1 : 0;
  return kin;
}

/** Ứng viên có đáng tin không: đủ lớn, không phải cả khung ảnh, và vùng lấp đầy phần lớn tứ giác. */
const dangTin = (u: UngVien | null, toiDa: number): u is UngVien =>
  !!u && u.tiLeDienTich >= 0.12 && u.tiLeDienTich <= toiDa && u.doDac >= 0.55;

/**
 * Tìm bốn góc trên ảnh xám cỡ gốc (rộng × cao của ảnh người dùng chụp).
 * Toạ độ trả về theo ảnh gốc.
 */
export function timBonGoc(xam: AnhXam): KetQuaTimGoc {
  const { anh: nho, tiLe } = thuNhoXam(xam, CANH_TIM);
  const { rong, cao } = nho;
  const macDinh = { goc: khungMacDinh(xam.rong, xam.cao), timThay: false };
  if (rong < 16 || cao < 16) return macDinh;
  const mo = lamMo(nho);

  const mep = gianNo(timMep(mo), rong, cao);
  const a = ungVienTu(matVungKin(mep, rong, cao), rong, cao);

  const nguong = nguongOtsu(mo.du);
  const sang = new Uint8Array(rong * cao);
  for (let i = 0; i < sang.length; i++) sang[i] = mo.du[i] > nguong ? 1 : 0;
  const b = ungVienTu(sang, rong, cao);

  // Ưu tiên vùng kín (theo mép thật); vùng sáng phủ gần cả ảnh thường là nền, không phải giấy.
  const chon = dangTin(a, 0.985) ? a : dangTin(b, 0.95) ? b : null;
  if (!chon) return macDinh;

  // Vùng kín nằm TRONG đường mép đã giãn ~1,5 điểm ảnh — đẩy góc ra khỏi trọng tâm bù lại.
  const cx = chon.tuGiac.reduce((s, p) => s + p.x, 0) / 4;
  const cy = chon.tuGiac.reduce((s, p) => s + p.y, 0) / 4;
  const ra = chon === a ? 1.5 : 0;
  const goc = chon.tuGiac.map((p) => {
    const d = Math.hypot(p.x - cx, p.y - cy) || 1;
    const x = (p.x + ((p.x - cx) / d) * ra) / tiLe;
    const y = (p.y + ((p.y - cy) / d) * ra) / tiLe;
    return { x: Math.min(xam.rong, Math.max(0, x)), y: Math.min(xam.cao, Math.max(0, y)) };
  });
  return { goc: sapGoc(goc), timThay: true };
}
