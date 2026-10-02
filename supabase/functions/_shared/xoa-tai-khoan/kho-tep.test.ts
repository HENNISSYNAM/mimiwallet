import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUCKET_DU_LIEU, xoaKhoTep, xoaThuMuc, type KhoTep, type LoiKho, type MucKho } from './kho-tep';
import { lapKeHoachXoaTaiKhoan, thuMucCanDon } from './ke-hoach';

/**
 * Kho tệp giả, hành xử giống Storage thật ở những chỗ quan trọng:
 *   - `list` chỉ trả CẤP HIỆN TẠI; thư mục là mục ảo có `id: null`, biến mất khi hết tệp bên dưới;
 *   - `list` tối đa `limit` mục mỗi lần, sắp theo tên, có `offset`;
 *   - `remove` xoá tệp theo đường dẫn đầy đủ.
 */
class KhoGia implements KhoTep {
  buckets = new Map<string, Set<string>>();
  lanList = 0;
  lanRemove = 0;
  loiList: ((bucket: string, thuMuc: string) => LoiKho | null) | null = null;
  loiRemove: ((bucket: string) => LoiKho | null) | null = null;
  nem: ((bucket: string) => boolean) | null = null;

  them(bucket: string, ...duongDan: string[]) {
    if (!this.buckets.has(bucket)) this.buckets.set(bucket, new Set());
    for (const d of duongDan) this.buckets.get(bucket)!.add(d);
  }
  con(bucket: string): string[] {
    return [...(this.buckets.get(bucket) ?? [])].sort();
  }

  async list(bucket: string, thuMuc: string, o: { limit: number; offset: number }) {
    this.lanList++;
    if (this.nem?.(bucket)) throw new Error('mạng đứt');
    const loi = this.loiList?.(bucket, thuMuc);
    if (loi) return { data: null, error: loi };
    const b = this.buckets.get(bucket);
    if (!b) return { data: null, error: { message: 'Bucket not found', statusCode: '404' } };
    const tienTo = thuMuc ? `${thuMuc}/` : '';
    const muc = new Map<string, MucKho>();
    for (const d of b) {
      if (!d.startsWith(tienTo)) continue;
      const phanCon = d.slice(tienTo.length);
      const i = phanCon.indexOf('/');
      if (i === -1) muc.set(phanCon, { name: phanCon, id: `id-${d}` });
      else if (!muc.has(phanCon.slice(0, i))) muc.set(phanCon.slice(0, i), { name: phanCon.slice(0, i), id: null });
    }
    const ds = [...muc.values()].sort((a, c) => a.name.localeCompare(c.name)).slice(o.offset, o.offset + o.limit);
    return { data: ds, error: null };
  }

  async remove(bucket: string, duongDan: string[]) {
    this.lanRemove++;
    const loi = this.loiRemove?.(bucket);
    if (loi) return { data: null, error: loi };
    const b = this.buckets.get(bucket);
    for (const d of duongDan) b?.delete(d);
    return { data: duongDan, error: null };
  }
}

describe('xoaThuMuc: phân trang', () => {
  it('xoá hết 2500 tệp trong một thư mục (list tối đa 1000 mỗi lần)', async () => {
    const kho = new KhoGia();
    for (let i = 0; i < 2500; i++) kho.them('chung-tu', `cty-1/${String(i).padStart(5, '0')}.jpg`);
    kho.them('chung-tu', 'cty-khac/giu-lai.jpg');
    const kq = await xoaThuMuc(kho, 'chung-tu', 'cty-1');
    expect(kq).toMatchObject({ so_tep_da_xoa: 2500, hoan_tat: true, loi: [] });
    expect(kho.con('chung-tu')).toEqual(['cty-khac/giu-lai.jpg']);
    // Phải liệt kê nhiều lần (>= 3 trang + 1 lần xác nhận trống), không phải một lần.
    expect(kho.lanList).toBeGreaterThanOrEqual(4);
  });

  it('đúng 1000 tệp (mép trang) và 1001 tệp đều xoá sạch, không sót tệp cuối', async () => {
    for (const n of [1000, 1001]) {
      const kho = new KhoGia();
      for (let i = 0; i < n; i++) kho.them('tai-lieu', `c/${i}`);
      const kq = await xoaThuMuc(kho, 'tai-lieu', 'c');
      expect(kq.so_tep_da_xoa, String(n)).toBe(n);
      expect(kho.con('tai-lieu')).toEqual([]);
    }
  });

  it('thư mục lồng nhau nhiều cấp, xen tệp và thư mục con, đều bị xoá', async () => {
    const kho = new KhoGia();
    kho.them('tai-lieu', 'c/a.html', 'c/tl1/v1.html', 'c/tl1/v2.html', 'c/tl2/x/y/z.pdf', 'c/tl2/x/w.pdf');
    for (let i = 0; i < 1200; i++) kho.them('tai-lieu', `c/tl3/${i}.html`);
    const kq = await xoaThuMuc(kho, 'tai-lieu', 'c');
    expect(kq.hoan_tat).toBe(true);
    expect(kq.so_tep_da_xoa).toBe(5 + 1200);
    expect(kho.con('tai-lieu')).toEqual([]);
  });

  it('nhiều hơn 1000 thư mục con (không có tệp trực tiếp) vẫn xoá hết', async () => {
    const kho = new KhoGia();
    for (let i = 0; i < 1500; i++) kho.them('tai-lieu', `c/tl-${i}/v1.html`);
    const kq = await xoaThuMuc(kho, 'tai-lieu', 'c');
    expect(kq).toMatchObject({ so_tep_da_xoa: 1500, hoan_tat: true });
    expect(kho.con('tai-lieu')).toEqual([]);
  });

  it('không xoá nhầm thư mục có tên bắt đầu giống nhau (cty-1 với cty-10)', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'cty-1/a.jpg', 'cty-10/b.jpg');
    await xoaThuMuc(kho, 'chung-tu', 'cty-1');
    expect(kho.con('chung-tu')).toEqual(['cty-10/b.jpg']);
  });

  it('từ chối thư mục gốc rỗng: không bao giờ xoá cả bucket', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'cty-1/a.jpg');
    for (const goc of ['', '/', '//']) {
      const kq = await xoaThuMuc(kho, 'chung-tu', goc);
      expect(kq.hoan_tat).toBe(false);
      expect(kq.loi[0]).toMatch(/rỗng/);
    }
    expect(kho.con('chung-tu')).toEqual(['cty-1/a.jpg']);
    expect(kho.lanRemove).toBe(0);
  });
});

describe('xoaKhoTep: lỗi từng phần và chạy lại', () => {
  it('một bucket lỗi: báo đúng bucket đó, bucket khác vẫn được dọn, ok = false', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'c1/a.jpg');
    kho.them('tai-lieu', 'c1/t/v1.html');
    kho.them('secure-documents', 'c1/kyc/front.jpg');
    kho.loiList = (bucket) => (bucket === 'tai-lieu' ? { message: 'timeout', statusCode: '504' } : null);
    const bc = await xoaKhoTep(kho, { thuMuc: ['c1'] });
    expect(bc.ok).toBe(false);
    expect(bc.that_bai).toHaveLength(1);
    expect(bc.that_bai[0]).toMatchObject({ bucket: 'tai-lieu', thu_muc: 'c1' });
    expect(bc.that_bai[0].loi[0]).toMatch(/timeout/);
    expect(kho.con('chung-tu')).toEqual([]);
    expect(kho.con('secure-documents')).toEqual([]);
    expect(kho.con('tai-lieu')).toEqual(['c1/t/v1.html']);
    expect(bc.so_tep_da_xoa).toBe(2);
  });

  it('lỗi ở lệnh xoá (không phải liệt kê) cũng là thất bại, và không lặp vô hạn', async () => {
    const kho = new KhoGia();
    for (let i = 0; i < 50; i++) kho.them('chung-tu', `c1/${i}.jpg`);
    kho.loiRemove = () => ({ message: 'forbidden', statusCode: '403' });
    const bc = await xoaKhoTep(kho, { thuMuc: ['c1'], buckets: ['chung-tu'] });
    expect(bc.ok).toBe(false);
    expect(bc.so_tep_da_xoa).toBe(0);
    expect(kho.lanRemove).toBe(1);
    expect(kho.con('chung-tu')).toHaveLength(50);
  });

  it('client kho ném ngoại lệ: vẫn là thất bại có báo cáo, không làm sập toàn bộ', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'c1/a.jpg');
    kho.them('tai-lieu', 'c1/b.html');
    kho.nem = (bucket) => bucket === 'chung-tu';
    const bc = await xoaKhoTep(kho, { thuMuc: ['c1'], buckets: ['chung-tu', 'tai-lieu'] });
    expect(bc.ok).toBe(false);
    expect(bc.that_bai[0].loi[0]).toMatch(/mạng đứt/);
    expect(kho.con('tai-lieu')).toEqual([]);
  });

  it('bucket không tồn tại: không có gì để xoá, không tính là lỗi', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'c1/a.jpg');
    const bc = await xoaKhoTep(kho, { thuMuc: ['c1'], buckets: ['chung-tu', 'khong-co'] });
    expect(bc.ok).toBe(true);
    expect(bc.ket_qua.find((r) => r.bucket === 'khong-co')?.khong_co_bucket).toBe(true);
  });

  it('chạy lại lần hai: 0 tệp, không lỗi, kết quả vẫn ok', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'c1/a.jpg', 'c1/b.jpg');
    kho.them('tai-lieu', 'c1/t/v1.html');
    const lan1 = await xoaKhoTep(kho, { thuMuc: ['c1'] });
    expect(lan1).toMatchObject({ ok: true, so_tep_da_xoa: 3 });
    const lan2 = await xoaKhoTep(kho, { thuMuc: ['c1'] });
    expect(lan2).toMatchObject({ ok: true, so_tep_da_xoa: 0, that_bai: [] });
  });

  it('lần một lỗi giữa chừng, lần hai (đã hết lỗi) dọn nốt phần còn lại', async () => {
    const kho = new KhoGia();
    for (let i = 0; i < 30; i++) kho.them('chung-tu', `c1/${i}.jpg`);
    kho.loiRemove = () => ({ message: 'tạm lỗi' });
    expect((await xoaKhoTep(kho, { thuMuc: ['c1'], buckets: ['chung-tu'] })).ok).toBe(false);
    kho.loiRemove = null;
    const lan2 = await xoaKhoTep(kho, { thuMuc: ['c1'], buckets: ['chung-tu'] });
    expect(lan2).toMatchObject({ ok: true, so_tep_da_xoa: 30 });
    expect(kho.con('chung-tu')).toEqual([]);
  });

  it('nhiều thư mục (nhiều công ty + id người dùng) trên nhiều bucket, trùng lặp chỉ dọn một lần', async () => {
    const kho = new KhoGia();
    kho.them('chung-tu', 'c1/a.jpg', 'c2/b.jpg', 'u9/x.jpg', 'c3/giu.jpg');
    const bc = await xoaKhoTep(kho, { thuMuc: ['c1', 'c2', 'u9', 'c1', '/c2/'], buckets: ['chung-tu'] });
    expect(bc.ket_qua).toHaveLength(3);
    expect(kho.con('chung-tu')).toEqual(['c3/giu.jpg']);
  });
});

describe('công ty còn thành viên khác thì giữ tệp', () => {
  it('kế hoạch: chỉ công ty không còn ai khác bị dọn; công ty còn người thì giữ và đổi người tạo', async () => {
    const kh = lapKeHoachXoaTaiKhoan({
      userId: 'u-toi',
      congTyDoNguoiTao: ['c-mot-minh', 'c-con-nguoi'],
      thanhVien: [
        { company_id: 'c-mot-minh', user_id: 'u-toi', vai_tro: 'chu_so_huu' },
        { company_id: 'c-con-nguoi', user_id: 'u-toi', vai_tro: 'chu_so_huu' },
        { company_id: 'c-con-nguoi', user_id: 'u-kt', vai_tro: 'ke_toan', tao_luc: '2026-01-02' },
        { company_id: 'c-con-nguoi', user_id: 'u-qt', vai_tro: 'quan_tri', tao_luc: '2026-01-03' },
      ],
    });
    expect(kh.cong_ty_xoa).toEqual(['c-mot-minh']);
    expect(kh.chuyen_nguoi_tao).toEqual([{ company_id: 'c-con-nguoi', user_id_moi: 'u-qt', vai_tro_moi: 'quan_tri' }]);
    // Người xoá là chủ duy nhất: công ty ở lại KHÔNG còn chủ → phải báo để trao quyền.
    expect(kh.can_chu_moi).toEqual(['c-con-nguoi']);

    const kho = new KhoGia();
    kho.them('chung-tu', 'c-mot-minh/a.jpg', 'c-con-nguoi/b.jpg', 'u-toi/ca-nhan.jpg');
    kho.them('tai-lieu', 'c-mot-minh/t/v1.html', 'c-con-nguoi/t/v1.html');
    const bc = await xoaKhoTep(kho, { thuMuc: thuMucCanDon('u-toi', kh) });
    expect(bc.ok).toBe(true);
    expect(kho.con('chung-tu')).toEqual(['c-con-nguoi/b.jpg']);
    expect(kho.con('tai-lieu')).toEqual(['c-con-nguoi/t/v1.html']);
  });

  it('còn chủ khác thì không báo thiếu chủ; ưu tiên chủ sở hữu rồi người vào sớm nhất', () => {
    const kh = lapKeHoachXoaTaiKhoan({
      userId: 'u-toi',
      congTyDoNguoiTao: ['c1'],
      thanhVien: [
        { company_id: 'c1', user_id: 'u-toi', vai_tro: 'chu_so_huu', tao_luc: '2026-01-01' },
        { company_id: 'c1', user_id: 'u-a', vai_tro: 'quan_tri', tao_luc: '2026-01-02' },
        { company_id: 'c1', user_id: 'u-chu2', vai_tro: 'chu_so_huu', tao_luc: '2026-02-01' },
        { company_id: 'c1', user_id: 'u-chu3', vai_tro: 'chu_so_huu', tao_luc: '2026-03-01' },
      ],
    });
    expect(kh.chuyen_nguoi_tao[0].user_id_moi).toBe('u-chu2');
    expect(kh.can_chu_moi).toEqual([]);
  });

  it('công ty tạo ra nhưng không có dòng thành viên nào của người khác: xoá; không đụng công ty người khác tạo', () => {
    const kh = lapKeHoachXoaTaiKhoan({ userId: 'u-toi', congTyDoNguoiTao: ['c1'], thanhVien: [{ company_id: 'c-cua-nguoi-khac', user_id: 'u-x', vai_tro: 'chu_so_huu' }] });
    expect(kh).toEqual({ cong_ty_xoa: ['c1'], chuyen_nguoi_tao: [], can_chu_moi: [] });
  });
});

describe('danh sách bucket khớp mã nguồn', () => {
  const goc = join(__dirname, '..', '..', '..', '..');
  const duyet = (dir: string, ra: string[] = []): string[] => {
    for (const ten of readdirSync(dir)) {
      const p = join(dir, ten);
      if (statSync(p).isDirectory()) { if (ten !== 'node_modules') duyet(p, ra); }
      else if (/\.(ts|tsx)$/.test(ten) && !/\.test\./.test(ten)) ra.push(p);
    }
    return ra;
  };

  it('mọi bucket được `storage.from(...)` dùng trong mã đều nằm trong BUCKET_DU_LIEU', () => {
    const dung = new Set<string>();
    for (const f of [...duyet(join(goc, 'supabase', 'functions')), ...duyet(join(goc, 'src'))]) {
      for (const m of readFileSync(f, 'utf8').matchAll(/storage\s*\.from\(\s*["'`]([a-z0-9-]+)["'`]\s*\)/g)) dung.add(m[1]);
    }
    expect(dung.size).toBeGreaterThan(0);
    for (const b of dung) expect(BUCKET_DU_LIEU, `bucket "${b}" chưa có trong danh sách dọn khi xoá tài khoản`).toContain(b);
  });

  it('mọi bucket tạo trong migration đều nằm trong BUCKET_DU_LIEU', () => {
    const dir = join(goc, 'supabase', 'migrations');
    const tao = new Set<string>();
    for (const f of readdirSync(dir)) {
      const sql = readFileSync(join(dir, f), 'utf8');
      for (const m of sql.matchAll(/INSERT INTO storage\.buckets[^;]*?VALUES\s*\(\s*'([a-z0-9-]+)'/gi)) tao.add(m[1]);
    }
    expect(tao.size).toBeGreaterThan(0);
    for (const b of tao) expect(BUCKET_DU_LIEU, `bucket "${b}" chưa có trong danh sách dọn khi xoá tài khoản`).toContain(b);
  });
});
