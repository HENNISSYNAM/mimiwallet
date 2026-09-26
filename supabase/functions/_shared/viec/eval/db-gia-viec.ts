/**
 * CSDL giả trong bộ nhớ cho các bài kiểm E2E của hồ sơ việc (Prompt 4B). KHÔNG kiểm trên production: hồ sơ
 * việc, bằng chứng và nhật ký là dữ liệu chỉ-ghi-thêm của người dùng thật.
 *
 * Mô phỏng đúng phần luu.ts dùng — và các RÀNG BUỘC của migration 20260926120000, để bài kiểm chạm vào
 * cùng bức tường như CSDL thật:
 *   - ho_so_viec: một việc đang mở mỗi (company_id, dau_van_tay); trigger chuyển trạng thái (dùng lại
 *     `kiemChuyenViec`), không đổi danh tính, việc đã đóng không sửa, phien_ban tăng mỗi lần sửa;
 *   - hanh_trinh: một hành trình đang mở mỗi (company_id, loai) và mỗi ho_so_viec_id;
 *   - buoc_hanh_trinh: UNIQUE (hanh_trinh_id, khoa) cho upsert;
 *   - bang_chung_viec: UNIQUE (ho_so_viec_id, khoa_trung), CHECK nguồn/xác minh, chỉ ghi thêm, cùng công ty.
 * Ràng buộc thật được kiểm riêng bằng SQL trên CSDL (giao dịch rollback) — xem docs/PROMPT_4B_VONG_GIAI_QUYET.md.
 * Mỗi `await` nhường một nhịp để lời gọi đồng thời xen kẽ như thật.
 */
import { kiemBangChung, kiemChuyenViec, laDangMo, type TrangThaiViec } from '../trang-thai.ts';

// deno-lint-ignore no-explicit-any
export type Dong = Record<string, any>;
type Loi = { code: string; message: string };
type KetQua = { data: unknown; error: Loi | null };

const DANG_MO_HT = (t: string) => t !== 'hoan_tat' && t !== 'da_huy';

export class DbGiaViec {
  bang: Record<string, Dong[]> = {};
  private dem = 0;
  /** Đồng hồ giả: mỗi lần ghi tăng 1 giây — dòng thời gian có thứ tự rõ. */
  private goc = Date.parse('2026-09-26T02:20:00Z');
  loiGhi: Record<string, number> = {};

  bayGio(): string { this.goc += 1000; return new Date(this.goc).toISOString(); }
  from(ten: string) { return new TruyVan(this, ten); }
  ds(ten: string): Dong[] { return (this.bang[ten] ??= []); }

  macDinh(ten: string, r: Dong): Dong {
    const luc = this.bayGio();
    if (ten === 'ho_so_viec') return { id: crypto.randomUUID(), trang_thai: 'needs_information', muc_do: 'binh_thuong', nguon: {}, so_lan_nhac: 0, han_luat: null, han_luat_nguon: null, ngay_nen_lam: null, ngay_nen_lam_ly_do: null, hen_kiem_lai: null, ky: null, doi_tuong: null, giai_quyet_luc: null, ket_qua: null, tao_luc: luc, cap_nhat_luc: luc, ...r, phien_ban: 1 };
    if (ten === 'hanh_trinh') return { id: crypto.randomUUID(), trang_thai: 'dang_mo', du_kien: {}, tao_luc: luc, cap_nhat_luc: luc, ...r };
    if (ten === 'nhat_ky_thay_doi') return { id: ++this.dem, luc, ...r };
    if (ten === 'bang_chung_viec') return { id: crypto.randomUUID(), tao_luc: luc, ...r };
    return { id: crypto.randomUUID(), tao_luc: luc, ...r };
  }

  /** CHECK / UNIQUE / trigger khi chèn. */
  kiemChen(ten: string, moi: Dong): Loi | null {
    if (ten === 'ho_so_viec') {
      if (!laDangMo(moi.trang_thai)) return { code: '23514', message: 'Hồ sơ việc mới phải ở trạng thái đang mở' };
      if (this.ds(ten).some((r) => r.company_id === moi.company_id && r.dau_van_tay === moi.dau_van_tay && laDangMo(r.trang_thai))) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "ho_so_viec_mot_dang_mo"' };
      }
    }
    if (ten === 'hanh_trinh') {
      if (this.ds(ten).some((r) => r.company_id === moi.company_id && r.loai === moi.loai && DANG_MO_HT(r.trang_thai))) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "hanh_trinh_mot_dang_mo"' };
      }
      if (moi.ho_so_viec_id && this.ds(ten).some((r) => r.ho_so_viec_id === moi.ho_so_viec_id && DANG_MO_HT(r.trang_thai))) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "hanh_trinh_mot_moi_ho_so"' };
      }
    }
    if (ten === 'bang_chung_viec') {
      const k = kiemBangChung(moi as never);
      if (k) return { code: '23514', message: k };
      const hs = this.ds('ho_so_viec').find((h) => h.id === moi.ho_so_viec_id);
      if (!hs || hs.company_id !== moi.company_id) return { code: '42501', message: 'Bằng chứng khác công ty với hồ sơ việc' };
      if (this.ds(ten).some((r) => r.ho_so_viec_id === moi.ho_so_viec_id && r.khoa_trung === moi.khoa_trung)) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "bang_chung_viec_ho_so_viec_id_khoa_trung_key"' };
      }
    }
    return null;
  }

  /** Trigger khi sửa. Trả lỗi, hoặc dòng mới (đã tăng phiên bản). */
  kiemSua(ten: string, cu: Dong, sua: Dong): { loi: Loi } | { moi: Dong } {
    const moi = { ...cu, ...sua };
    if (ten === 'bang_chung_viec' || ten === 'nhat_ky_thay_doi') return { loi: { code: '42501', message: `${ten} chỉ ghi thêm: không sửa, không xoá` } };
    if (ten === 'ho_so_viec') {
      if (moi.company_id !== cu.company_id || moi.loai !== cu.loai || moi.dau_van_tay !== cu.dau_van_tay) return { loi: { code: '42501', message: 'Không đổi danh tính hồ sơ việc' } };
      if (cu.trang_thai === 'cancelled' || cu.trang_thai === 'resolved_system_verified') return { loi: { code: '42501', message: 'Hồ sơ việc đã đóng' } };
      if (moi.trang_thai !== cu.trang_thai) {
        const bc = this.ds('bang_chung_viec').filter((b) => b.ho_so_viec_id === cu.id);
        const l = kiemChuyenViec(cu.trang_thai as TrangThaiViec, moi.trang_thai as TrangThaiViec, bc as never);
        if (l) return { loi: { code: '23514', message: l } };
        if ((moi.trang_thai === 'resolved_user_confirmed' || moi.trang_thai === 'resolved_system_verified') && (!moi.giai_quyet_luc || !moi.ket_qua)) {
          return { loi: { code: '23514', message: 'violates check constraint "ho_so_viec_giai_quyet_co_ket_qua"' } };
        }
      } else if (cu.trang_thai === 'resolved_user_confirmed') {
        return { loi: { code: '42501', message: 'Hồ sơ việc đã giải quyết: không sửa được' } };
      }
      moi.phien_ban = cu.phien_ban + 1;
      moi.cap_nhat_luc = this.bayGio();
    }
    return { moi };
  }
}

type Loc = (r: Dong) => boolean;

class TruyVan implements PromiseLike<KetQua> {
  private loc: Loc[] = [];
  private kieu: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private duLieu: Dong | Dong[] = {};
  private xungDot: string[] = [];
  private gioiHan: number | null = null;
  private sapXep: { cot: string; tang: boolean } | null = null;
  private traVe = false;

  constructor(private db: DbGiaViec, private ten: string) {}

  select(_cot?: string) { if (this.kieu !== 'select') this.traVe = true; return this; }
  insert(r: Dong | Dong[]) { this.kieu = 'insert'; this.duLieu = r; return this; }
  update(r: Dong) { this.kieu = 'update'; this.duLieu = r; return this; }
  upsert(r: Dong | Dong[], o?: { onConflict?: string }) { this.kieu = 'upsert'; this.duLieu = r; this.xungDot = (o?.onConflict ?? 'id').split(','); return this; }
  delete() { this.kieu = 'delete'; return this; }
  eq(c: string, v: unknown) { this.loc.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.loc.push((r) => r[c] !== v); return this; }
  in(c: string, ds: unknown[]) { this.loc.push((r) => ds.includes(r[c])); return this; }
  lte(c: string, v: string) { this.loc.push((r) => r[c] !== null && r[c] !== undefined && r[c] <= v); return this; }
  gte(c: string, v: string) { this.loc.push((r) => r[c] !== null && r[c] !== undefined && r[c] >= v); return this; }
  not(c: string, op: string, v: string) {
    if (op !== 'in') throw new Error(`not ${op} chưa mô phỏng`);
    const ds = v.replace(/[()]/g, '').split(',');
    this.loc.push((r) => !ds.includes(r[c]));
    return this;
  }
  or(bieuThuc: string) {
    const phan = bieuThuc.split(',').map((p) => {
      const [c, op, ...gt] = p.split('.');
      const v = gt.join('.');
      if (op === 'eq') return (r: Dong) => String(r[c]) === v;
      if (op === 'like') { const re = new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, (m) => (m === '*' ? '.*' : `\\${m}`))}$`); return (r: Dong) => re.test(String(r[c])); }
      throw new Error(`or ${op} chưa mô phỏng`);
    });
    this.loc.push((r) => phan.some((f) => f(r)));
    return this;
  }
  order(c: string, o?: { ascending?: boolean }) { this.sapXep = { cot: c, tang: o?.ascending !== false }; return this; }
  limit(n: number) { this.gioiHan = n; return this; }
  range(a: number, b: number) { this.gioiHan = b - a + 1; return this; }

  private chay(): KetQua {
    const db = this.db;
    const bang = db.ds(this.ten);
    if (this.kieu === 'insert') {
      const moi: Dong[] = [];
      for (const r of Array.isArray(this.duLieu) ? this.duLieu : [this.duLieu]) {
        const d = db.macDinh(this.ten, r);
        const loi = db.kiemChen(this.ten, d);
        if (loi) return { data: null, error: loi };
        bang.push(d);
        moi.push(d);
      }
      return { data: moi.map((x) => ({ ...x })), error: null };
    }
    if (this.kieu === 'upsert') {
      const ra: Dong[] = [];
      for (const r of Array.isArray(this.duLieu) ? this.duLieu : [this.duLieu]) {
        const cu = bang.find((x) => this.xungDot.every((c) => x[c] === r[c]));
        if (cu) Object.assign(cu, r); else bang.push(db.macDinh(this.ten, r));
        ra.push({ ...(cu ?? bang[bang.length - 1]) });
      }
      return { data: ra, error: null };
    }
    const khop = bang.filter((r) => this.loc.every((f) => f(r)));
    if (this.kieu === 'update') {
      const ra: Dong[] = [];
      for (const r of khop) {
        const k = db.kiemSua(this.ten, r, this.duLieu as Dong);
        if ('loi' in k) return { data: null, error: k.loi };
        Object.assign(r, k.moi);
        ra.push({ ...r });
      }
      return { data: ra, error: null };
    }
    if (this.kieu === 'delete') {
      if (this.ten === 'bang_chung_viec' || this.ten === 'nhat_ky_thay_doi') return { data: null, error: { code: '42501', message: 'chỉ ghi thêm' } };
      db.bang[this.ten] = bang.filter((r) => !khop.includes(r));
      return { data: null, error: null };
    }
    let data = khop.map((r) => ({ ...r }));
    if (this.sapXep) {
      const { cot, tang } = this.sapXep;
      data.sort((a, b) => (String(a[cot]) < String(b[cot]) ? -1 : String(a[cot]) > String(b[cot]) ? 1 : 0) * (tang ? 1 : -1));
    }
    if (this.gioiHan !== null) data = data.slice(0, this.gioiHan);
    return { data, error: null };
  }

  then<A = KetQua, B = never>(xong?: ((v: KetQua) => A | PromiseLike<A>) | null, hong?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.chay()).then(xong, hong);
  }
  async maybeSingle(): Promise<KetQua> {
    await Promise.resolve();
    const k = this.chay();
    if (k.error) return k;
    const ds = k.data as Dong[];
    if (ds.length > 1) return { data: null, error: { code: 'PGRST116', message: `nhiều dòng (${ds.length})` } };
    return { data: ds[0] ?? null, error: null };
  }
  async single(): Promise<KetQua> {
    await Promise.resolve();
    const k = this.chay();
    if (k.error) return k;
    const ds = k.data as Dong[];
    if (ds.length !== 1) return { data: null, error: { code: 'PGRST116', message: `cần đúng 1 dòng, có ${ds.length}` } };
    return { data: ds[0], error: null };
  }
}
