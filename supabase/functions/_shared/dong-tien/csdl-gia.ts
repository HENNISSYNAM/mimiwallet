/**
 * CSDL GIẢ CHO TEST (không dùng ở production): đủ các phép PostgREST mà `doc-db.ts` gọi — select, eq, gte, lte, gt, in,
 * or (đúng mẫu con trỏ), order, limit, maybeSingle, upsert, count/head. Ghi lại mọi truy vấn để test kiểm rằng truy
 * vấn nào cũng lọc `company_id`. Bảng `transactions` được sắp sẵn theo (transaction_date, id) và con trỏ tìm bằng nhị
 * phân, để benchmark đo bộ gom chứ không đo CSDL giả.
 */
// deno-lint-ignore no-explicit-any
type Row = Record<string, any>;

export interface NhatKyTruyVan { bang: string; loc: string[] }

export class CsdlGia {
  nhatKy: NhatKyTruyVan[] = [];
  /** Gọi ở mỗi truy vấn — benchmark dùng để lấy mẫu bộ nhớ. */
  moiTruyVan?: () => void;
  ghiNhatKy = true;
  constructor(public bang: Record<string, Row[]>) {
    const gd = bang.transactions;
    if (gd) gd.sort((a, b) => (a.transaction_date < b.transaction_date ? -1 : a.transaction_date > b.transaction_date ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }
  from(ten: string) { return new TruyVan(this, ten); }
}

class TruyVan {
  private loc: ((r: Row) => boolean)[] = [];
  private moTa: string[] = [];
  private thuTu: { c: string; tang: boolean }[] = [];
  private gioiHan = Infinity;
  private conTro: { d: string; id: string } | null = null;
  private dem = false; private dau = false;
  private ghi: Row | null = null;
  constructor(private db: CsdlGia, private ten: string) {}
  select(_c: string, o?: { count?: string; head?: boolean }) { this.dem = !!o?.count; this.dau = !!o?.head; return this; }
  eq(c: string, v: unknown) { this.moTa.push(`eq:${c}`); this.loc.push((r) => r[c] === v); return this; }
  gte(c: string, v: string) { this.loc.push((r) => r[c] >= v); return this; }
  lte(c: string, v: string) { this.loc.push((r) => r[c] <= v); return this; }
  gt(c: string, v: string | number) { this.loc.push((r) => r[c] > v); return this; }
  in(c: string, v: unknown[]) { const s = new Set(v); this.loc.push((r) => s.has(r[c])); return this; }
  or(s: string) {
    const m = /^transaction_date\.gt\.([^,]+),and\(transaction_date\.eq\.([^,]+),id\.gt\.([^)]+)\)$/.exec(s);
    if (!m) throw new Error(`or() không hiểu: ${s}`);
    this.conTro = { d: m[1], id: m[3] };
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) { this.thuTu.push({ c, tang: o?.ascending !== false }); return this; }
  limit(n: number) { this.gioiHan = n; return this.chay(); }
  upsert(r: Row) { this.ghi = r; if (r.company_id) this.moTa.push('eq:company_id'); return this.chay(); }
  maybeSingle() { return this.chay().then((x) => ({ ...x, data: x.data?.[0] ?? null })); }
  then<T>(ok: (x: { data: Row[] | null; error: null; count?: number }) => T) { return this.chay().then(ok); }

  private async chay(): Promise<{ data: Row[] | null; error: null; count?: number }> {
    if (this.db.ghiNhatKy) this.db.nhatKy.push({ bang: this.ten, loc: this.moTa });
    this.db.moiTruyVan?.();
    const ds = this.db.bang[this.ten] ?? (this.db.bang[this.ten] = []);
    if (this.ghi) {
      const i = ds.findIndex((r) => r.company_id === this.ghi!.company_id);
      if (i >= 0) ds[i] = this.ghi; else ds.push(this.ghi);
      return { data: null, error: null };
    }
    let bd = 0;
    if (this.conTro && this.ten === 'transactions') {
      const { d, id } = this.conTro; let lo = 0, hi = ds.length;
      while (lo < hi) { const m = (lo + hi) >> 1; const r = ds[m]; if (r.transaction_date < d || (r.transaction_date === d && r.id <= id)) lo = m + 1; else hi = m; }
      bd = lo;
    }
    let out: Row[] = [];
    const sapSan = this.ten === 'transactions';
    for (let i = bd; i < ds.length; i++) {
      const r = ds[i];
      if (this.loc.every((f) => f(r))) { out.push(r); if (sapSan && out.length >= this.gioiHan) break; }
    }
    if (!sapSan && this.thuTu.length) {
      const { c, tang } = this.thuTu[0]; const k = tang ? 1 : -1;
      out.sort((a, b) => (a[c] < b[c] ? -k : a[c] > b[c] ? k : 0));
    }
    const count = out.length;
    if (this.dau) return { data: null, error: null, count };
    out = out.slice(0, this.gioiHan);
    return { data: out, error: null, ...(this.dem ? { count } : {}) };
  }
}
