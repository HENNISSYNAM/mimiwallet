/**
 * GOM GIAO DỊCH THEO LUỒNG (10/11/2026) — một lượt duy nhất, bộ nhớ dạng cột (typed array).
 *
 * VÌ SAO. Một công ty bán lẻ có thể có 200.000 giao dịch/2 năm. Giữ 200k đối tượng JSON rồi lọc/nhóm nhiều lần là
 * vượt ngân sách bộ nhớ của edge function. Ở đây mỗi trang đọc từ CSDL (`them(trang)`) được chuyển ngay thành vài cột
 * số (ngày, số tiền, nhóm, chiều, tài khoản, mã đối tác) — ~20 byte/dòng — rồi trang đó được bỏ. Mọi bước sau (ghép
 * chuyển nội bộ, chuỗi ngày, khoản định kỳ) chạy trên cột, mỗi bước O(n) hoặc O(n log n).
 *
 * BẢO VỆ CHÉO CÔNG TY. Nếu một dòng mang `company_id` khác công ty đang tính, bộ gom NÉM LỖI — không lặng lẽ bỏ qua:
 * dòng lạ lọt tới đây nghĩa là truy vấn đã sai, và số của công ty khác không bao giờ được trộn vào dự báo.
 */
import { CHI_SO_NHOM, NHOM_NOI_BO, SO_NHOM, boDau, nhomRa, nhomVao, soTk, type QuyetDinhChu } from './phan-nhom.ts';

export interface GiaoDichDT {
  id: string;
  company_id?: string | null;
  amount: number | string;
  type: string | null;
  transaction_date: string;
  merchant_name?: string | null;
  counter_account_name?: string | null;
  payment_reference?: string | null;
  category?: string | null;
  account_number?: string | null;
  counter_account_number?: string | null;
}

export class LoiKhacCongTy extends Error {
  constructor() { super('Dữ liệu của công ty khác lọt vào bộ gom dòng tiền — đã dừng.'); this.name = 'LoiKhacCongTy'; }
}

const MS_NGAY = 86_400_000;
/** Số ngày kể từ 1970-01-01 (UTC) của chuỗi YYYY-MM-DD; NaN nếu sai. */
export function soNgay(s: string): number {
  const y = Number(s.slice(0, 4)); const m = Number(s.slice(5, 7)); const d = Number(s.slice(8, 10));
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d) / MS_NGAY;
}
export const ngayTu = (i: number) => new Date(i * MS_NGAY).toISOString().slice(0, 10);
/** Thứ trong tuần, Thứ Hai = 0 … Chủ nhật = 6. 1970-01-01 là Thứ Năm. */
export const thu = (i: number) => (((i + 3) % 7) + 7) % 7;
export const ngayTrongThang = (i: number) => new Date(i * MS_NGAY).getUTCDate();

/** Ứng viên cho bộ đề xuất phân loại: khoản gần đây, chưa ai quyết. */
export interface UngVien { id: string; ngay: number; chieu: 0 | 1; so_tien: number; noi_dung: string; doi_tac: number; nhom: number }

export interface TuyChonGom {
  companyId?: string;
  homNay: string;
  /** Tài khoản của chính công ty (bank_connections) — để nhận chuyển nội bộ. */
  taiKhoanCuaMinh?: readonly (string | null | undefined)[];
  /** Quyết định của chủ theo id giao dịch. */
  quyetDinhChu?: Record<string, QuyetDinhChu>;
  /** Id đã có nhãn người (không đề xuất lại). */
  daCoNhan?: ReadonlySet<string>;
  /** Giữ ứng viên đề xuất cho N ngày gần nhất. 0 = không giữ. */
  ngayUngVien?: number;
}

export interface TongHop {
  homNay: number;
  /** Ngày đầu chuỗi (chỉ số ngày) và độ dài: chuỗi chạy từ d0 tới hôm qua. */
  d0: number;
  soNgay: number;
  so_dong: number;
  so_noi_bo: number;
  so_bo_qua: number;
  // Cột.
  ngay: Int32Array; tien: Float64Array; nhom: Uint8Array; chieu: Uint8Array; doiTac: Int32Array;
  /** Nhãn hiển thị của mỗi mã đối tác, chiều của mã. */
  tenDoiTac: string[]; chieuDoiTac: Uint8Array;
  ungVien: UngVien[];
}

const memoKy = (s: string) => boDau(s).replace(/[^a-z ]+/g, ' ').split(/\s+/).filter((w) => w.length >= 2).slice(0, 4).join(' ');

export class BoGom {
  private n = 0;
  private cap = 1024;
  private ngay = new Int32Array(this.cap);
  private tien = new Float64Array(this.cap);
  private nhom = new Uint8Array(this.cap);
  private chieu = new Uint8Array(this.cap);
  private tk = new Int16Array(this.cap);
  private doiTac = new Int32Array(this.cap);
  private maDoiTac = new Map<string, number>();
  private tenDoiTac: string[] = [];
  private chieuDoiTac: number[] = [];
  private taiKhoan = new Map<string, number>();
  private soBoQua = 0;
  private soNoiBoMot = 0;
  private ungVien: UngVien[] = [];
  private readonly homNay: number;
  private readonly tuUngVien: number;

  constructor(private readonly o: TuyChonGom) {
    this.homNay = soNgay(o.homNay);
    if (!Number.isFinite(this.homNay)) throw new Error('homNay phải là YYYY-MM-DD');
    for (const t of o.taiKhoanCuaMinh ?? []) { const s = soTk(t); if (s.length >= 4 && !this.taiKhoan.has(s)) this.taiKhoan.set(s, this.taiKhoan.size); }
    this.tuUngVien = o.ngayUngVien ? this.homNay - o.ngayUngVien : Number.POSITIVE_INFINITY;
  }

  private mo() {
    this.cap *= 2;
    const lon = <T extends Int32Array | Float64Array | Uint8Array | Int16Array>(a: T): T => {
      const b = new (a.constructor as { new (n: number): T })(this.cap); b.set(a); return b;
    };
    this.ngay = lon(this.ngay); this.tien = lon(this.tien); this.nhom = lon(this.nhom);
    this.chieu = lon(this.chieu); this.tk = lon(this.tk); this.doiTac = lon(this.doiTac);
  }

  /** Thêm một trang giao dịch. Trang có thể bỏ đi ngay sau lời gọi. */
  them(trang: readonly GiaoDichDT[]): void {
    const cty = this.o.companyId;
    for (const t of trang) {
      if (cty && t.company_id != null && t.company_id !== cty) throw new LoiKhacCongTy();
      const d = soNgay(String(t.transaction_date ?? ''));
      const so = Number(t.amount);
      if (!Number.isFinite(d) || !Number.isFinite(so) || so === 0 || d >= this.homNay) { this.soBoQua++; continue; }
      const c: 0 | 1 = t.type === 'income' ? 0 : t.type === 'expense' ? 1 : t.type === 'loan' ? 0 : so > 0 ? 0 : 1;
      const doiUng = soTk(t.counter_account_number);
      const cuaMinh = soTk(t.account_number);
      let nh: number;
      if (doiUng && this.taiKhoan.has(doiUng) && doiUng !== cuaMinh) { nh = NHOM_NOI_BO; this.soNoiBoMot++; }
      else nh = CHI_SO_NHOM[c === 0 ? nhomVao(t, this.o.quyetDinhChu?.[t.id]) : nhomRa(t)];
      // Khoá đối tác: số TK đối ứng → tên đối ứng → chữ ký nội dung.
      const ten = (t.counter_account_name ?? '').trim();
      const khoaGoc = doiUng.length >= 6 ? `tk:${doiUng}` : ten ? `t:${boDau(ten).replace(/\s+/g, ' ')}` : `nd:${memoKy(`${t.payment_reference ?? ''} ${t.merchant_name ?? ''}`)}`;
      const khoa = `${c}|${khoaGoc}`;
      let ma = this.maDoiTac.get(khoa);
      if (ma === undefined) {
        ma = this.tenDoiTac.length;
        this.maDoiTac.set(khoa, ma);
        this.tenDoiTac.push((ten || t.merchant_name || t.payment_reference || '—').slice(0, 60));
        this.chieuDoiTac.push(c);
      }
      if (this.n === this.cap) this.mo();
      const i = this.n++;
      this.ngay[i] = d; this.tien[i] = Math.abs(so); this.nhom[i] = nh; this.chieu[i] = c;
      this.tk[i] = cuaMinh ? (this.taiKhoan.get(cuaMinh) ?? -1) : -1;
      this.doiTac[i] = ma;
      if (d >= this.tuUngVien && nh !== NHOM_NOI_BO && !this.o.quyetDinhChu?.[t.id] && !this.o.daCoNhan?.has(t.id)) {
        this.ungVien.push({ id: t.id, ngay: d, chieu: c, so_tien: Math.abs(so), noi_dung: `${t.merchant_name ?? ''} ${t.payment_reference ?? ''}`.trim().slice(0, 200), doi_tac: ma, nhom: nh });
        if (this.ungVien.length > 4000) this.ungVien = this.ungVien.sort((a, b) => b.ngay - a.ngay).slice(0, 2000);
      }
    }
  }

  /**
   * Ghép chuyển nội bộ suy ra (giống lượt 2 của `ledger/internal-transfer.ts`, nhưng O(n log n)): một khoản vào và một
   * khoản ra CÙNG số tiền, trên HAI tài khoản khác nhau của công ty, cách nhau ≤ 3 ngày — gần nhất thắng.
   */
  private ghepNoiBo(): number {
    if (this.taiKhoan.size < 2) return 0;
    const theoTien = new Map<number, number[]>();
    for (let i = 0; i < this.n; i++) {
      if (this.tk[i] < 0 || this.nhom[i] === NHOM_NOI_BO) continue;
      const ds = theoTien.get(this.tien[i]); if (ds) ds.push(i); else theoTien.set(this.tien[i], [i]);
    }
    let so = 0;
    for (const ds of theoTien.values()) {
      if (ds.length < 2) continue;
      const vao = ds.filter((i) => this.chieu[i] === 0);
      const ra = ds.filter((i) => this.chieu[i] === 1).sort((a, b) => this.ngay[a] - this.ngay[b]);
      if (!vao.length || !ra.length) continue;
      const da = new Uint8Array(ra.length);
      const ngayRa = Int32Array.from(ra, (i) => this.ngay[i]);
      for (const v of vao) {
        const dv = this.ngay[v];
        // Tìm nhị phân vị trí đầu tiên ≥ dv - 3.
        let lo = 0, hi = ngayRa.length;
        while (lo < hi) { const m = (lo + hi) >> 1; if (ngayRa[m] < dv - 3) lo = m + 1; else hi = m; }
        let tot = -1, cach = 99;
        for (let k = lo; k < ngayRa.length && ngayRa[k] <= dv + 3; k++) {
          if (da[k] || this.tk[ra[k]] === this.tk[v]) continue;
          const g = Math.abs(ngayRa[k] - dv);
          if (g < cach) { cach = g; tot = k; }
        }
        if (tot >= 0) { da[tot] = 1; this.nhom[v] = NHOM_NOI_BO; this.nhom[ra[tot]] = NHOM_NOI_BO; so += 2; }
      }
    }
    return so;
  }

  ketThuc(): TongHop {
    const soGhep = this.ghepNoiBo();
    let d0 = this.homNay;
    for (let i = 0; i < this.n; i++) if (this.nhom[i] !== NHOM_NOI_BO && this.ngay[i] < d0) d0 = this.ngay[i];
    // Ứng viên vừa bị ghép thành chuyển nội bộ thì không đề xuất nữa.
    const ungVien = this.ungVien.filter((u) => u.nhom !== NHOM_NOI_BO);
    return {
      homNay: this.homNay, d0, soNgay: this.homNay - d0,
      so_dong: this.n, so_noi_bo: this.soNoiBoMot + soGhep, so_bo_qua: this.soBoQua,
      ngay: this.ngay.subarray(0, this.n), tien: this.tien.subarray(0, this.n), nhom: this.nhom.subarray(0, this.n),
      chieu: this.chieu.subarray(0, this.n), doiTac: this.doiTac.subarray(0, this.n),
      tenDoiTac: this.tenDoiTac, chieuDoiTac: Uint8Array.from(this.chieuDoiTac),
      ungVien: ungVien.sort((a, b) => b.ngay - a.ngay || a.id.localeCompare(b.id)).slice(0, 2000),
    };
  }
}

/** Gom một mảng có sẵn (trợ lý đã đọc ≤ 10k dòng). */
export function gom(ds: readonly GiaoDichDT[], o: TuyChonGom): TongHop {
  const b = new BoGom(o); b.them(ds); return b.ketThuc();
}

/** Chuỗi ngày theo nhóm: mảng [SO_NHOM][soNgay]. Bỏ nội bộ; bỏ các dòng có mã đối tác trong `boDoiTac`. */
export function chuoiNgay(th: TongHop, boDoiTac?: ReadonlySet<number>): Float64Array[] {
  const out = Array.from({ length: SO_NHOM }, () => new Float64Array(Math.max(0, th.soNgay)));
  for (let i = 0; i < th.ngay.length; i++) {
    const nh = th.nhom[i];
    if (nh === NHOM_NOI_BO) continue;
    if (boDoiTac && boDoiTac.has(th.doiTac[i])) continue;
    const k = th.ngay[i] - th.d0;
    if (k >= 0 && k < th.soNgay) out[nh][k] += th.tien[i];
  }
  return out;
}

/** Cộng các nhóm thành một chuỗi. */
export function congNhom(c: Float64Array[], nhom: readonly number[]): Float64Array {
  const n = c[0]?.length ?? 0;
  const out = new Float64Array(n);
  for (const g of nhom) { const a = c[g]; for (let k = 0; k < n; k++) out[k] += a[k]; }
  return out;
}
