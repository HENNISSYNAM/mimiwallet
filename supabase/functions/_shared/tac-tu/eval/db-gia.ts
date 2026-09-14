/**
 * CSDL giả trong bộ nhớ, đủ cho `cong-tac-tu.ts` chạy trọn vòng mà không chạm
 * CSDL thật.
 *
 * VÌ SAO KHÔNG KIỂM TRÊN PRODUCTION. Nhật ký agent chỉ-thêm (có trigger chặn
 * sửa), và mỗi yêu cầu chi là một dòng kiểm toán. Tạo agent và yêu cầu thử trên
 * CSDL thật là trộn dữ liệu giả vào đúng chỗ phải sạch nhất. Tầng dò production
 * trong `scripts/kiem-nghiem.ts` vì thế chỉ đọc.
 *
 * Chỉ mô phỏng phần query builder mà cổng agent dùng: select (kể cả
 * count/head), insert, update, eq/neq/in/gte, limit, single/maybeSingle, và hai
 * ràng buộc duy nhất của `yeu_cau_chi` (mã tham chiếu; agent + mã yêu cầu).
 * Mỗi lần `await` nhường một nhịp để các lời gọi đồng thời xen kẽ nhau như thật.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dong = Record<string, any>;
type Loi = { code: string; message: string };
type KetQua = { data: unknown; error: Loi | null; count?: number };

const bayGio = () => new Date().toISOString();

export class DbGia {
  bang: Record<string, Dong[]> = {
    tac_tu: [],
    chinh_sach_chi: [],
    nguoi_nhan_duoc_phep: [],
    yeu_cau_chi: [],
    nhat_ky_tac_tu: [],
  };
  private soNhatKy = 0;

  from(ten: string) {
    return new TruyVan(this, ten);
  }

  /** Điền giá trị mặc định như CSDL. */
  macDinh(ten: string, r: Dong): Dong {
    const chung = { created_at: bayGio(), ...r };
    if (ten === 'nhat_ky_tac_tu') return { id: ++this.soNhatKy, ...chung };
    if (ten === 'yeu_cau_chi') {
      return {
        id: crypto.randomUUID(),
        ly_do: [],
        trang_thai: 'dang_xet',
        cach_quyet: null,
        quyet_luc: null,
        het_han_luc: null,
        giao_dich_id: null,
        so_tien_thuc_chi: null,
        da_chi_luc: null,
        updated_at: chung.created_at,
        ...chung,
      };
    }
    return { id: crypto.randomUUID(), ...chung };
  }

  rangBuoc(ten: string, moi: Dong): Loi | null {
    if (ten !== 'yeu_cau_chi') return null;
    if (!(Number(moi.so_tien) > 0)) return { code: '23514', message: 'violates check constraint "yeu_cau_chi_so_tien_check"' };
    for (const r of this.bang.yeu_cau_chi) {
      if (r.ma_tham_chieu === moi.ma_tham_chieu) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "yeu_cau_chi_ma_tham_chieu_key"' };
      }
      if (moi.ma_yeu_cau && r.tac_tu_id === moi.tac_tu_id && r.ma_yeu_cau === moi.ma_yeu_cau) {
        return { code: '23505', message: 'duplicate key value violates unique constraint "yeu_cau_chi_tac_tu_id_ma_yeu_cau_key"' };
      }
    }
    return null;
  }
}

class TruyVan implements PromiseLike<KetQua> {
  private loc: Array<(r: Dong) => boolean> = [];
  private kieu: 'select' | 'insert' | 'update' = 'select';
  private duLieu: Dong = {};
  private dem = false;
  private chiDem = false;
  private gioiHan: number | null = null;

  constructor(private db: DbGia, private ten: string) {}

  select(_cot?: string, tuyChon?: { count?: string; head?: boolean }) {
    if (tuyChon?.count) this.dem = true;
    if (tuyChon?.head) this.chiDem = true;
    return this;
  }
  insert(r: Dong) { this.kieu = 'insert'; this.duLieu = r; return this; }
  update(r: Dong) { this.kieu = 'update'; this.duLieu = r; return this; }
  eq(cot: string, v: unknown) { this.loc.push((r) => r[cot] === v); return this; }
  neq(cot: string, v: unknown) { this.loc.push((r) => r[cot] !== v); return this; }
  in(cot: string, ds: unknown[]) { this.loc.push((r) => ds.includes(r[cot])); return this; }
  gte(cot: string, v: string | number) { this.loc.push((r) => r[cot] >= v); return this; }
  limit(n: number) { this.gioiHan = n; return this; }

  private chay(): KetQua {
    const dong = (this.db.bang[this.ten] ??= []);
    if (this.kieu === 'insert') {
      const moi = this.db.macDinh(this.ten, this.duLieu);
      const loi = this.db.rangBuoc(this.ten, moi);
      if (loi) return { data: null, error: loi };
      dong.push(moi);
      return { data: [{ ...moi }], error: null };
    }
    const khop = dong.filter((r) => this.loc.every((f) => f(r)));
    if (this.kieu === 'update') {
      for (const r of khop) Object.assign(r, this.duLieu);
      return { data: khop.map((r) => ({ ...r })), error: null };
    }
    const data = khop.map((r) => ({ ...r })).slice(0, this.gioiHan ?? undefined);
    return { data: this.chiDem ? null : data, error: null, count: this.dem ? khop.length : undefined };
  }

  then<A = KetQua, B = never>(xong?: ((v: KetQua) => A | PromiseLike<A>) | null, hong?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve().then(() => this.chay()).then(xong, hong);
  }

  async maybeSingle(): Promise<KetQua> {
    await Promise.resolve();
    const k = this.chay();
    if (k.error) return k;
    return { data: (k.data as Dong[])[0] ?? null, error: null };
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
