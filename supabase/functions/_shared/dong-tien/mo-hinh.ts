/**
 * MÔ HÌNH DỰ BÁO CHUỖI NGÀY (10/11/2026) — tự cài, không thư viện ML, tất định (không ngẫu nhiên).
 *
 * Mọi mô hình có cùng chữ ký `(y, h, d0) → dự báo h ngày`, với y là chuỗi tiền theo ngày (≥ 0), d0 là chỉ số ngày của
 * y[0] (để biết thứ trong tuần / ngày trong tháng). Kết quả kẹp ≥ 0 vì tiền vào/ra trong ngày không âm.
 *
 *  (a) `muaVuNgayThuong` — seasonal naive: ngày t+h lặp lại cùng thứ của tuần cuối cùng.
 *  (b) `holtWinters`     — làm mượt mũ cộng tính, xu hướng giảm dần (damped), mùa vụ tuần (chu kỳ 7). α, β, γ, φ chọn
 *                          bằng lưới cố định, cực tiểu tổng bình phương sai số dự báo một bước trong mẫu.
 *  (c) `hoiQuyRidge`     — hồi quy ridge dạng đóng β = (XᵀX + λI)⁻¹Xᵀy (giải Cholesky) trên: trễ 1, 7, 14 ngày; trung
 *                          bình 7 và 28 ngày trước; thứ trong tuần (6 biến giả); đầu tháng (ngày ≤ 5), cuối tháng (≥ 25);
 *                          xu hướng. Biến đã chuẩn hoá; λ = 1; hệ số chặn không phạt. Dự báo nhiều bước bằng đệ quy
 *                          (giá trị dự báo làm trễ cho bước sau).
 *  (d) `trungBinhThu`    — dự phòng khi ít dữ liệu: trung bình theo thứ trong tuần của ≤ 8 tuần gần nhất.
 */
import { ngayTrongThang, thu } from './tong-hop.ts';

export type MoHinh = (y: Float64Array, h: number, d0: number) => Float64Array;
export type TenMoHinh = 'mua_vu_ngay_thuong' | 'holt_winters' | 'hoi_quy_ridge' | 'trung_binh_thu';

const kep = (f: Float64Array) => { for (let i = 0; i < f.length; i++) if (!(f[i] > 0)) f[i] = 0; return f; };
const tb = (y: Float64Array, a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += y[i]; return b > a ? s / (b - a) : 0; };

export const muaVuNgayThuong: MoHinh = (y, h) => {
  const n = y.length; const f = new Float64Array(h);
  if (n < 7) { f.fill(tb(y, 0, n)); return kep(f); }
  for (let i = 0; i < h; i++) f[i] = y[n - 7 + (i % 7)];
  return kep(f);
};

export const trungBinhThu: MoHinh = (y, h, d0) => {
  const n = y.length; const s = new Float64Array(7); const c = new Float64Array(7);
  for (let i = Math.max(0, n - 56); i < n; i++) { const w = thu(d0 + i); s[w] += y[i]; c[w]++; }
  const chung = tb(y, Math.max(0, n - 56), n);
  const f = new Float64Array(h);
  for (let i = 0; i < h; i++) { const w = thu(d0 + n + i); f[i] = c[w] ? s[w] / c[w] : chung; }
  return kep(f);
};

// ── Holt-Winters ──────────────────────────────────────────────────────────────
const LUOI = { alpha: [0.05, 0.1, 0.2, 0.4], beta: [0, 0.02, 0.1], gamma: [0.05, 0.15, 0.3], phi: [0.9, 0.98] };

function chayHW(y: Float64Array, a: number, b: number, g: number, phi: number, h: number): { sse: number; f: Float64Array } {
  const n = y.length; const m = 7;
  let l = tb(y, 0, m);
  let t = n >= 2 * m ? (tb(y, m, 2 * m) - l) / m : 0;
  const s = new Float64Array(m);
  for (let i = 0; i < m; i++) s[i] = y[i] - l;
  let sse = 0;
  for (let i = m; i < n; i++) {
    const sm = s[i % m];
    const du = l + phi * t + sm;
    const e = y[i] - du; sse += e * e;
    const lMoi = a * (y[i] - sm) + (1 - a) * (l + phi * t);
    t = b * (lMoi - l) + (1 - b) * phi * t;
    s[i % m] = g * (y[i] - lMoi) + (1 - g) * sm;
    l = lMoi;
  }
  const f = new Float64Array(h);
  let tich = 0, mu = 1;
  for (let k = 1; k <= h; k++) { mu *= phi; tich += mu; f[k - 1] = l + tich * t + s[(n + k - 1) % m]; }
  return { sse, f };
}

export const holtWinters: MoHinh = (y, h, d0) => {
  if (y.length < 21) return trungBinhThu(y, h, d0);
  let tot = { sse: Infinity, a: 0.1, b: 0, g: 0.1, p: 0.9 };
  for (const a of LUOI.alpha) for (const b of LUOI.beta) for (const g of LUOI.gamma) for (const p of LUOI.phi) {
    const { sse } = chayHW(y, a, b, g, p, 0);
    if (sse < tot.sse - 1e-9) tot = { sse, a, b, g, p };
  }
  return kep(chayHW(y, tot.a, tot.b, tot.g, tot.p, h).f);
};

// ── Ridge ─────────────────────────────────────────────────────────────────────
/** 5 trễ/trung bình + 6 thứ + 2 đầu/cuối tháng + 1 xu hướng (hệ số chặn thêm riêng). */
const SO_BIEN = 14;
const TRE_TOI_DA = 28;

function dacTrung(lich: Float64Array, t: number, d0: number, n0: number, out: Float64Array) {
  let s7 = 0; for (let k = 1; k <= 7; k++) s7 += lich[t - k];
  let s28 = 0; for (let k = 1; k <= 28; k++) s28 += lich[t - k];
  out[0] = lich[t - 1]; out[1] = lich[t - 7]; out[2] = lich[t - 14]; out[3] = s7 / 7; out[4] = s28 / 28;
  const w = thu(d0 + t);
  for (let k = 0; k < 6; k++) out[5 + k] = w === k ? 1 : 0;
  const dm = ngayTrongThang(d0 + t);
  out[11] = dm <= 5 ? 1 : 0; out[12] = dm >= 25 ? 1 : 0; out[13] = t / n0;
}

/** Giải A x = b với A đối xứng xác định dương (Cholesky). A bị ghi đè. */
export function giaiCholesky(A: Float64Array, b: Float64Array, p: number): Float64Array {
  for (let j = 0; j < p; j++) {
    let s = A[j * p + j];
    for (let k = 0; k < j; k++) s -= A[j * p + k] ** 2;
    if (s <= 1e-12) s = 1e-12;
    const d = Math.sqrt(s); A[j * p + j] = d;
    for (let i = j + 1; i < p; i++) {
      let v = A[i * p + j];
      for (let k = 0; k < j; k++) v -= A[i * p + k] * A[j * p + k];
      A[i * p + j] = v / d;
    }
  }
  const z = new Float64Array(p);
  for (let i = 0; i < p; i++) { let v = b[i]; for (let k = 0; k < i; k++) v -= A[i * p + k] * z[k]; z[i] = v / A[i * p + i]; }
  const x = new Float64Array(p);
  for (let i = p - 1; i >= 0; i--) { let v = z[i]; for (let k = i + 1; k < p; k++) v -= A[k * p + i] * x[k]; x[i] = v / A[i * p + i]; }
  return x;
}

export const LAMBDA_RIDGE = 1;

export const hoiQuyRidge: MoHinh = (y, h, d0) => {
  const n = y.length;
  if (n < TRE_TOI_DA + 21) return muaVuNgayThuong(y, h, d0);
  const q = SO_BIEN; const p = q + 1; // + hệ số chặn ở chỉ số 0
  const hang = n - TRE_TOI_DA;
  const X = new Float64Array(hang * q); const x = new Float64Array(q);
  for (let t = TRE_TOI_DA; t < n; t++) { dacTrung(y, t, d0, n, x); X.set(x, (t - TRE_TOI_DA) * q); }
  // Chuẩn hoá.
  const mu = new Float64Array(q); const sd = new Float64Array(q);
  for (let j = 0; j < q; j++) { let s = 0; for (let r = 0; r < hang; r++) s += X[r * q + j]; mu[j] = s / hang; }
  for (let j = 0; j < q; j++) { let s = 0; for (let r = 0; r < hang; r++) s += (X[r * q + j] - mu[j]) ** 2; sd[j] = Math.sqrt(s / hang) || 1; }
  const A = new Float64Array(p * p); const b = new Float64Array(p); const z = new Float64Array(p);
  for (let r = 0; r < hang; r++) {
    z[0] = 1; for (let j = 0; j < q; j++) z[j + 1] = (X[r * q + j] - mu[j]) / sd[j];
    const yt = y[r + TRE_TOI_DA];
    for (let i = 0; i < p; i++) { b[i] += z[i] * yt; for (let k = 0; k <= i; k++) A[i * p + k] += z[i] * z[k]; }
  }
  for (let i = 0; i < p; i++) for (let k = 0; k < i; k++) A[k * p + i] = A[i * p + k];
  for (let i = 1; i < p; i++) A[i * p + i] += LAMBDA_RIDGE;
  const beta = giaiCholesky(A, b, p);
  const lich = new Float64Array(n + h); lich.set(y);
  for (let t = n; t < n + h; t++) {
    dacTrung(lich, t, d0, n, x);
    let v = beta[0]; for (let j = 0; j < q; j++) v += beta[j + 1] * (x[j] - mu[j]) / sd[j];
    lich[t] = v > 0 ? v : 0;
  }
  return lich.slice(n);
};

export const MO_HINH: Record<TenMoHinh, MoHinh> = {
  mua_vu_ngay_thuong: muaVuNgayThuong, holt_winters: holtWinters, hoi_quy_ridge: hoiQuyRidge, trung_binh_thu: trungBinhThu,
};
/** Thứ tự ứng viên = thứ tự ưu tiên khi hoà: đơn giản trước. */
export const UNG_VIEN: TenMoHinh[] = ['mua_vu_ngay_thuong', 'holt_winters', 'hoi_quy_ridge'];

// ── Kiểm định quay vòng (rolling-origin backtest) ─────────────────────────────

export interface DiemMoHinh { ten: TenMoHinh; mase: number; smape: number; so_moc: number }
export interface KetQuaKiemDinh {
  diem: DiemMoHinh[];
  /** Sai số theo tuần (thực − dự báo) của từng mô hình: [mốc][tuần]. */
  saiSo: Record<string, number[][]>;
  moc: number[];
  soTuan: number;
}

export const KIEM_DINH = { tam_ngay: 28, buoc: 14, so_moc: 6, huan_luyen_toi_thieu: 42 } as const;

const tongTuan = (a: ArrayLike<number>, tu: number, soTuan: number) => {
  const w = new Float64Array(soTuan);
  for (let k = 0; k < soTuan * 7; k++) w[Math.floor(k / 7)] += a[tu + k];
  return w;
};

/**
 * Mốc o_k = n − H − k·bước (k = 0..K−1), cần o_k ≥ huấn luyện tối thiểu. Ở mỗi mốc, mỗi mô hình học trên y[0..o) và dự
 * báo H ngày; so tổng TUẦN với thực tế. MASE chia sai số tuyệt đối trung bình cho sai số của dự báo "tuần sau = tuần
 * này" trên toàn lịch sử (thang đo); sMAPE = trung bình 2|F−A|/(|F|+|A|) (bỏ cặp cùng bằng 0), theo %.
 */
export function kiemDinh(y: Float64Array, d0: number, ten: readonly TenMoHinh[] = UNG_VIEN, o = KIEM_DINH): KetQuaKiemDinh | null {
  const n = y.length; const H = o.tam_ngay; const soTuan = H / 7;
  const moc: number[] = [];
  for (let k = 0; k < o.so_moc; k++) { const m = n - H - k * o.buoc; if (m >= o.huan_luyen_toi_thieu) moc.push(m); }
  if (!moc.length) return null;
  // Thang đo MASE: tuần đầy đủ, căn sao cho tuần cuối kết thúc ở n−1.
  const soTuanLS = Math.floor(n / 7);
  const W = tongTuan(y, n - soTuanLS * 7, soTuanLS);
  let thang = 0; for (let k = 1; k < W.length; k++) thang += Math.abs(W[k] - W[k - 1]);
  thang = W.length > 1 ? thang / (W.length - 1) : 0;
  if (!(thang > 0)) thang = Math.max(1, W.reduce((s, x) => s + Math.abs(x), 0) / Math.max(1, W.length));

  const diem: DiemMoHinh[] = []; const saiSo: Record<string, number[][]> = {};
  for (const t of ten) {
    let ae = 0, dem = 0, sm = 0, demSm = 0; const ss: number[][] = [];
    for (const m of moc) {
      const f = MO_HINH[t](y.subarray(0, m), H, d0);
      const F = tongTuan(f, 0, soTuan); const A = tongTuan(y, m, soTuan);
      const dong: number[] = [];
      for (let w = 0; w < soTuan; w++) {
        const e = A[w] - F[w]; dong.push(e); ae += Math.abs(e); dem++;
        const mau = Math.abs(A[w]) + Math.abs(F[w]); if (mau > 0) { sm += (2 * Math.abs(e)) / mau; demSm++; }
      }
      ss.push(dong);
    }
    saiSo[t] = ss;
    diem.push({ ten: t, mase: ae / dem / thang, smape: demSm ? (100 * sm) / demSm : 0, so_moc: moc.length });
  }
  return { diem, saiSo, moc, soTuan };
}

/** Mô hình có MASE nhỏ nhất; hoà (chênh < 1e-9) thì lấy mô hình đứng trước (đơn giản hơn). */
export function chonMoHinh(kq: KetQuaKiemDinh): DiemMoHinh {
  let tot = kq.diem[0];
  for (const d of kq.diem) if (d.mase < tot.mase - 1e-9) tot = d;
  return tot;
}
