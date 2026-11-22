import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeXuat } from '../van-phong/hang-duyet';

/** Agentic AI Space — chuỗi lưu trữ: quyền theo văn phòng, agent giao agent trọn vòng, huỷ lan xuống việc con. */

const CTY = '11111111-1111-4111-8111-111111111111';
const LA = '22222222-2222-4222-8222-222222222222';

const trangThai = vi.hoisted(() => ({ hang: [] as unknown[] }));
vi.mock('../van-phong/danh-muc.ts', () => ({
  docThanhVien: async (_db: unknown, userId: string) => ({
    duoc: userId === 'u1' ? [{ company_id: CTY, ten: 'Tạp hoá Hồng', vai_tro: 'ke_toan', co_so_id: null, la_demo: false }] : [],
    gioiHan: 0, khongLamSo: 0,
  }),
  docDanhMucKhach: async () => ({
    khach: [{ id: CTY, ten: 'Tạp hoá Hồng', doanh_thu: null, thue: { trang_thai: 'san_sang', ten_viec: 'Quý 4/2026', han: '2027-01-31', con_lai: 70, moc_ke_tiep: null } }],
    so_trang: 1, hang_duyet: trangThai.hang,
  }),
}));

import { danhDauXong, docBangViec, docTinViec, huyViec, kiemTao, taoViecSpace, tiepTucViec } from './kho';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function dbGia() {
  const du: Record<string, Row[]> = { viec_space: [], tin_viec_space: [], de_xuat_agent_ngoai: [] };
  let dem = 0;
  const db = {
    du,
    from(bang: string) {
      const loc: [string, string, unknown][] = [];
      let kieu: 'doc' | 'insert' | 'update' | 'delete' = 'doc';
      let duLieu: Row | Row[] = {};
      let gioiHan = Infinity;
      const ds = () => (du[bang] ??= []);
      const khop = (r: Row) => loc.every(([op, k, v]) => op === 'eq' ? r[k] === v : op === 'in' ? (v as unknown[]).includes(r[k])
        : op === 'gte' ? String(r[k]) >= String(v) : op === 'is' ? (r[k] ?? null) === v : true);
      const chay = () => {
        if (kieu === 'insert') {
          const ra = (Array.isArray(duLieu) ? duLieu : [duLieu]).map((d) => {
            const r = { id: bang === 'tin_viec_space' ? ++dem : `${String(++dem).padStart(8, '0')}-0000-4000-8000-000000000000`, cap_nhat_luc: new Date().toISOString(), luc: new Date().toISOString(), ...d };
            ds().push(r); return r;
          });
          return { data: ra, error: null };
        }
        const r = ds().filter(khop);
        if (kieu === 'update') r.forEach((x) => Object.assign(x, duLieu));
        if (kieu === 'delete') du[bang] = ds().filter((x) => !r.includes(x));
        return { data: r.slice(0, gioiHan), error: null };
      };
      const p: Row = {};
      const them = (op: string) => (k: string, v: unknown) => { loc.push([op, k, v]); return p; };
      Object.assign(p, {
        select: () => p, eq: them('eq'), in: them('in'), gte: them('gte'), is: them('is'),
        order: () => p, limit: (n: number) => { gioiHan = n; return p; },
        insert: (d: Row | Row[]) => { kieu = 'insert'; duLieu = d; return p; },
        update: (d: Row) => { kieu = 'update'; duLieu = d; return p; },
        delete: () => { kieu = 'delete'; return p; },
        single: () => Promise.resolve({ data: chay().data[0] ?? null, error: null }),
        maybeSingle: () => Promise.resolve({ data: chay().data[0] ?? null, error: null }),
        then: (f: (v: unknown) => unknown, g?: (e: unknown) => unknown) => Promise.resolve(chay()).then(f, g),
      });
      return p;
    },
  };
  return db;
}

const plRow = (id: string, nguon: 'than_trong' | 'quy_tac_noi_dung'): DeXuat => ({
  khoa: `pl:${CTY}:${id}`, company_id: CTY, ten_khach: 'Tạp hoá Hồng', loai: 'phan_loai', agent: 'phan_loai', muc: 'xanh',
  co_the_duyet: true, duyet_hang_loat: true,
  phan_loai: { transaction_id: id, de_xuat: 'business_revenue', hien_tai: null, may_da_quyet: false, anh_huong: 'include' },
  bang_chung: { dong: [{ transaction_id: id, ngay: '2026-11-01', so_tien: 500_000, noi_dung: 'me gui' }], nguon, ly_do: null, tin_cay: 'thap' },
  tac_dong: null, so: 500_000, ngay: '2026-11-01', ten_viec: null,
});

const ccAi = () => ({ aiPhanLoai: async () => ({ y: [{ transaction_id: 'gd1', loai: 'family_transfer' as const, ly_do: 'Nội dung ghi me gui' }] }) });

describe('kiểm đầu vào', () => {
  it('khách, câu, hạn', () => {
    expect(kiemTao({ company_id: CTY, cau: '  Chốt   quý 4 ', han: '2027-01-31' })).toEqual({ company_id: CTY, cau: 'Chốt quý 4', han: '2027-01-31' });
    expect(() => kiemTao({ company_id: 'x', cau: 'Chốt quý 4' })).toThrow(/Chọn khách/);
    expect(() => kiemTao({ company_id: CTY, cau: 'ab' })).toThrow(/3–200/);
    expect(() => kiemTao({ company_id: CTY, cau: 'Chốt quý 4', han: '31/01/2027' })).toThrow(/YYYY-MM-DD/);
  });
});

describe('trọn vòng: người giao → Thuế giao Phân loại → người duyệt → Phân loại báo Thuế → người nộp', () => {
  beforeEach(() => { trangThai.hang = [plRow('gd1', 'than_trong')]; });

  it('chạy đúng thứ tự, AI chỉ ghi vào hàng duyệt, luồng tin đủ', async () => {
    const db = dbGia();
    const id = await taoViecSpace(db, 'u1', { company_id: CTY, cau: 'Chốt quý 4 cho Tạp hoá Hồng' }, ccAi);
    const cha = db.du.viec_space.find((v) => v.id === id)!;
    const con = db.du.viec_space.find((v) => v.viec_cha_id === id)!;
    expect(cha).toMatchObject({ agent: 'thue', trang_thai: 'cho_agent' });
    expect(con).toMatchObject({ agent: 'phan_loai', trang_thai: 'can_ban' });
    expect(db.du.de_xuat_agent_ngoai).toMatchObject([{ transaction_id: 'gd1', loai: 'family_transfer', nguon: 'agent_mimi', khoa_mcp_id: null }]);
    expect(db.du.revenue_classifications).toBeUndefined();

    const bang = await docBangViec(db, 'u1');
    expect(bang.dem).toMatchObject({ cho_agent: 1, can_ban: 1 });
    expect(bang.viec.find((v) => v.id === con.id)?.hoi?.lien_ket).toBe('/dashboard/van-phong');
    expect(bang.agent.find((a) => a.agent === 'phan_loai')?.can_ban).toBe(1);

    // Người duyệt xong ở hàng duyệt → hàng trống → "Tiếp tục" việc con.
    trangThai.hang = [];
    await tiepTucViec(db, 'u1', con.id, ccAi);
    expect(con.trang_thai).toBe('xong');
    expect(cha.trang_thai).toBe('can_ban');

    const { tin } = await docTinViec(db, 'u1', id);
    const chuoi = tin.map((t) => `${t.tu}>${t.den ?? '-'}:${t.loai}`);
    expect(chuoi[0]).toBe('nguoi>thue:giao_viec');
    expect(chuoi).toContain('thue>phan_loai:giao_viec');
    expect(chuoi).toContain('phan_loai>thue:ban_giao');
    expect(chuoi.at(-1)).toBe('thue>nguoi:hoi');

    await danhDauXong(db, 'u1', id, ccAi);
    expect(cha.trang_thai).toBe('xong');
    expect(cha.ke_hoach.every((b: Row) => b.xong)).toBe(true);
  });

  it('quyền: khách không làm sổ → 403; việc của khách khác → 404', async () => {
    const db = dbGia();
    await expect(taoViecSpace(db, 'u1', { company_id: LA, cau: 'Chốt quý 4' }, ccAi)).rejects.toMatchObject({ status: 403 });
    const id = await taoViecSpace(db, 'u1', { company_id: CTY, cau: 'Chốt quý 4' }, ccAi);
    await expect(docTinViec(db, 'u2', id)).rejects.toMatchObject({ status: 404 });
    await expect(tiepTucViec(db, 'u2', id, ccAi)).rejects.toMatchObject({ status: 404 });
  });

  it('huỷ việc cha huỷ luôn việc con đang mở; đánh dấu xong khi chưa chờ người → 409', async () => {
    const db = dbGia();
    const id = await taoViecSpace(db, 'u1', { company_id: CTY, cau: 'Chốt quý 4' }, ccAi);
    await expect(danhDauXong(db, 'u1', id, ccAi)).rejects.toMatchObject({ status: 409 });
    await huyViec(db, 'u1', id);
    expect(db.du.viec_space.every((v) => v.trang_thai === 'huy')).toBe(true);
    expect((await docBangViec(db, 'u1')).viec).toEqual([]);
  });
});
