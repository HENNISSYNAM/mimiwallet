import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  chayCongCuMcp, daCoNguoiQuyet, kiemDeXuat, kiemLocHang, taoKhoaMcp, thuHoiKhoaMcp, xacThucKhoaMcp, TOI_DA_KHOA_MOI_NGUOI,
} from './ban-ke-toan';
import { bamKhoa, sinhKhoa } from '../tac-tu/khoa';
import { deXuatPhanLoai } from '../van-phong/hang-duyet';
import { yKienTheoCongTy } from '../van-phong/danh-muc';

/**
 * MCP bàn kế toán — nghiệm thu backend:
 *   - khoá chỉ lưu băm; khoá thu hồi / sai không qua;
 *   - agent chỉ đề xuất cho khách người tạo khoá làm sổ; không ghi `revenue_classifications`;
 *   - khoản đã có người quyết → 409; tiền ra → từ chối; gửi lại thay ý kiến cũ;
 *   - ý kiến hiện trong hàng duyệt với nguồn `agent_ngoai` + tên agent, vẫn phải người duyệt.
 */

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** CSDL giả có ghi: select/eq/is/in/order/limit/maybeSingle/single/insert/update/upsert. Ghi nhật ký bảng bị ghi. */
function dbGia(du: Record<string, Row[]>) {
  const ghi: { bang: string; kieu: string; dong?: Row }[] = [];
  let dem = 0;
  const db = {
    ghi, du,
    rpc: () => Promise.resolve({ data: true, error: null }),
    from(bang: string) {
      const loc: [string, string, unknown][] = [];
      let kieu: 'doc' | 'insert' | 'update' | 'upsert' = 'doc';
      let duLieu: Row = {};
      let xung: string[] = [];
      let gioiHan = Infinity;
      const ds = () => (du[bang] ??= []);
      const khop = (r: Row) => loc.every(([op, k, v]) => {
        if (k.includes('.')) return true;
        if (op === 'eq') return r[k] === v;
        if (op === 'is') return (r[k] ?? null) === v;
        if (op === 'in') return (v as unknown[]).includes(r[k]);
        return true;
      });
      const chay = (): { data: Row[] | null; error: null } => {
        if (bang === 'thanh_vien_cong_ty') {
          const r = ds().filter(khop).map((x) => ({ ...x, companies: (du.companies ?? []).find((c) => c.id === x.company_id) }));
          return { data: r, error: null };
        }
        if (kieu === 'insert') { const r = { id: `id${++dem}`, tao_luc: '2026-11-22T00:00:00Z', dung_lan_cuoi: null, thu_hoi_luc: null, ...duLieu }; ds().push(r); ghi.push({ bang, kieu, dong: r }); return { data: [r], error: null }; }
        if (kieu === 'upsert') {
          const cu = ds().find((r) => xung.every((k) => r[k] === duLieu[k]));
          if (cu) Object.assign(cu, duLieu); else ds().push({ id: `id${++dem}`, ...duLieu });
          ghi.push({ bang, kieu, dong: duLieu });
          return { data: [cu ?? ds().at(-1)!], error: null };
        }
        const r = ds().filter(khop);
        if (kieu === 'update') { r.forEach((x) => Object.assign(x, duLieu)); ghi.push({ bang, kieu, dong: duLieu }); }
        return { data: r.slice(0, gioiHan), error: null };
      };
      const p: Row = {};
      const them = (op: string) => (k: string, v: unknown) => { loc.push([op, k, v]); return p; };
      Object.assign(p, {
        select: () => p, eq: them('eq'), is: them('is'), in: them('in'), gte: them('gte'), lte: them('lte'),
        order: () => p, range: () => p, limit: (n: number) => { gioiHan = n; return p; },
        insert: (d: Row) => { kieu = 'insert'; duLieu = d; return p; },
        update: (d: Row) => { kieu = 'update'; duLieu = d; return p; },
        upsert: (d: Row, o: { onConflict: string }) => { kieu = 'upsert'; duLieu = d; xung = o.onConflict.split(','); return p; },
        maybeSingle: () => Promise.resolve({ data: chay().data?.[0] ?? null, error: null }),
        single: () => Promise.resolve({ data: chay().data?.[0] ?? null, error: null }),
        then: (f: (v: unknown) => unknown, g?: (e: unknown) => unknown) => Promise.resolve(chay()).then(f, g),
      });
      return p;
    },
  };
  return db;
}

const CTY = '11111111-1111-4111-8111-111111111111';
const LA = '22222222-2222-4222-8222-222222222222';
const GD = '33333333-3333-4333-8333-333333333333';
const GD_RA = '44444444-4444-4444-8444-444444444444';
const K = { id: 'k1', user_id: 'u1', ten: 'Claude của Lan' };

const coSo = () => dbGia({
  companies: [{ id: CTY, name: 'Tạp hoá Hồng', la_demo: false }, { id: LA, name: 'Người khác', la_demo: false }],
  thanh_vien_cong_ty: [
    { user_id: 'u1', company_id: CTY, vai_tro: 'ke_toan', co_so_id: null, tao_luc: '1' },
    { user_id: 'u2', company_id: LA, vai_tro: 'chu_so_huu', co_so_id: null, tao_luc: '1' },
  ],
  transactions: [
    { id: GD, company_id: CTY, amount: 500000, type: 'income' },
    { id: GD_RA, company_id: CTY, amount: -200000, type: 'expense' },
  ],
  revenue_classifications: [],
  de_xuat_agent_ngoai: [],
});

const dx = (o: Row = {}) => ({ company_id: CTY, transaction_id: GD, loai: 'family_transfer', ly_do: 'Nội dung CK: me gui tien nha', ...o });

describe('kiểm đầu vào', () => {
  it('đề xuất hợp lệ / sai', () => {
    expect(kiemDeXuat(dx())).toMatchObject({ ok: true, v: { loai: 'family_transfer' } });
    expect(kiemDeXuat(dx({ loai: 'unknown' })).ok).toBe(false);
    expect(kiemDeXuat(dx({ loai: 'xin_chi' })).ok).toBe(false);
    expect(kiemDeXuat(dx({ ly_do: 'ok' })).ok).toBe(false);
    expect(kiemDeXuat(dx({ company_id: "1' or 1=1" })).ok).toBe(false);
    expect(kiemDeXuat(dx({ ly_do: '  me   gui  tien  ' }))).toMatchObject({ ok: true, v: { ly_do: 'me gui tien' } });
  });
  it('lọc hàng duyệt', () => {
    expect(kiemLocHang({})).toMatchObject({ ok: true, company_id: null, loai: null, gioi_han: 30 });
    expect(kiemLocHang({ loai: 'phan_loai', gioi_han: 5 })).toMatchObject({ ok: true, loai: 'phan_loai', gioi_han: 5 });
    expect(kiemLocHang({ gioi_han: 1000 }).ok).toBe(false);
    expect(kiemLocHang({ loai: 'chuyen_tien' }).ok).toBe(false);
  });
  it('"đã có người quyết" chỉ khi một NGƯỜI chọn tính / không tính', () => {
    expect(daCoNguoiQuyet(null)).toBe(false);
    expect(daCoNguoiQuyet({ confirmed_role: 'mimi_tu_dong', revenue_effect: 'include' })).toBe(false);
    expect(daCoNguoiQuyet({ confirmed_role: 'ke_toan', revenue_effect: 'pending' })).toBe(false);
    expect(daCoNguoiQuyet({ confirmed_role: 'ke_toan', revenue_effect: 'exclude' })).toBe(true);
  });
});

describe('khoá MCP', () => {
  it('tạo: trả khoá thô một lần, bảng chỉ giữ băm; thu hồi rồi thì không qua', async () => {
    const db = dbGia({ khoa_mcp: [] });
    const kq = await taoKhoaMcp(db, 'u1', '  Claude   của Lan ');
    const tho = kq.body.khoa_moi as string;
    const dong = db.du.khoa_mcp[0];
    expect(dong.ten).toBe('Claude của Lan');
    expect(dong.khoa_bam).toBe(await bamKhoa(tho));
    expect(JSON.stringify(db.du.khoa_mcp)).not.toContain(tho);
    expect(await xacThucKhoaMcp(db, tho)).toMatchObject({ user_id: 'u1', ten: 'Claude của Lan' });

    expect((await thuHoiKhoaMcp(db, 'u2', dong.id)).status).toBe(400); // id không phải uuid → từ chối sớm
    dong.id = '55555555-5555-4555-8555-555555555555';
    expect((await thuHoiKhoaMcp(db, 'u2', dong.id)).status).toBe(404); // người khác không thu hồi được
    expect((await thuHoiKhoaMcp(db, 'u1', dong.id)).status).toBe(200);
    expect(await xacThucKhoaMcp(db, tho)).toBeNull();
  });

  it('khoá sai khuôn / không có → null; quá số khoá → từ chối; tên rỗng → từ chối', async () => {
    const db = dbGia({ khoa_mcp: [] });
    expect(await xacThucKhoaMcp(db, null)).toBeNull();
    expect(await xacThucKhoaMcp(db, 'mimi_ak_sai')).toBeNull();
    expect(await xacThucKhoaMcp(db, sinhKhoa())).toBeNull();
    expect((await taoKhoaMcp(db, 'u1', '   ')).status).toBe(400);
    for (let i = 0; i < TOI_DA_KHOA_MOI_NGUOI; i++) await taoKhoaMcp(db, 'u1', `k${i}`);
    expect((await taoKhoaMcp(db, 'u1', 'thêm')).status).toBe(400);
  });
});

describe('de_xuat_phan_loai', () => {
  it('ghi ý kiến, KHÔNG ghi sổ; gửi lại thay ý kiến cũ', async () => {
    const db = coSo();
    const r1 = await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx());
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ thay_y_kien_cu: false, so_da_doi: false });
    const r2 = await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx({ loai: 'loan', ly_do: 'Nội dung CK: vay anh Tuan' }));
    expect(r2.body.thay_y_kien_cu).toBe(true);
    expect(db.du.de_xuat_agent_ngoai).toHaveLength(1);
    expect(db.du.de_xuat_agent_ngoai[0]).toMatchObject({ loai: 'loan', khoa_mcp_id: 'k1', user_id: 'u1' });
    expect(db.ghi.map((g) => g.bang)).not.toContain('revenue_classifications');
    expect(db.du.revenue_classifications).toEqual([]);
  });

  it('khách người tạo khoá không làm sổ → 403; tiền ra → 400; không thấy → 404', async () => {
    const db = coSo();
    expect((await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx({ company_id: LA }))).status).toBe(403);
    expect((await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx({ transaction_id: GD_RA }))).status).toBe(400);
    expect((await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx({ transaction_id: '66666666-6666-4666-8666-666666666666' }))).status).toBe(404);
    expect(db.du.de_xuat_agent_ngoai).toEqual([]);
  });

  it('người xem / kế toán bị giới hạn một cơ sở không đề xuất được', async () => {
    for (const tv of [{ vai_tro: 'nguoi_xem', co_so_id: null }, { vai_tro: 'ke_toan', co_so_id: 'cs1' }]) {
      const db = coSo();
      Object.assign(db.du.thanh_vien_cong_ty[0], tv);
      expect((await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx())).status).toBe(403);
    }
  });

  it('khoản đã có người quyết → 409, không ghi', async () => {
    const db = coSo();
    db.du.revenue_classifications.push({ company_id: CTY, transaction_id: GD, confirmed_type: 'business_revenue', revenue_effect: 'include', confirmed_role: 'ke_toan' });
    const r = await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx());
    expect(r).toMatchObject({ status: 409, body: { ma: 'DA_CO_NGUOI_QUYET', loai_da_ghi: 'business_revenue' } });
    expect(db.du.de_xuat_agent_ngoai).toEqual([]);
  });

  it('dòng thử của sandbox ở khách thật → như không có', async () => {
    const db = coSo();
    db.du.transactions[0].is_synthetic = true;
    expect((await chayCongCuMcp(db, K, 'de_xuat_phan_loai', dx())).status).toBe(404);
  });

  it('công cụ lạ bị từ chối', async () => {
    expect((await chayCongCuMcp(coSo(), K, 'xin_chi', {})).status).toBe(400);
  });
});

describe('ý kiến agent ngoài trong hàng duyệt', () => {
  const dc = { gia_tri: 30, can_duoi: 0, can_tren: 30, nguong: [] } as never;
  const vao = [{ id: 'x1', amount: 30, type: 'income', transaction_date: '2026-05-01', counter_account_name: 'NGUYEN THI MAI', payment_reference: 'me gui tien nha' }];
  const goc = { company_id: 'c', ten: 'C', vai_tro: 'ke_toan' as const, nam: 2026, giaoDich: vao, noiBo: new Set<string>(), s: { uoc_tinh: 30, chua_ro: 30, am_bat_thuong: 0 }, dc };

  it('mới nhất thắng, bỏ loại lạ', () => {
    const m = yKienTheoCongTy([
      { company_id: 'c', transaction_id: 'x1', loai: 'family_transfer', ly_do: 'mới', khoa_mcp: { ten: 'Claude' } },
      { company_id: 'c', transaction_id: 'x1', loai: 'loan', ly_do: 'cũ', khoa_mcp: { ten: 'Cursor' } },
      { company_id: 'c', transaction_id: 'x2', loai: 'xoa_so', ly_do: 'lạ', khoa_mcp: { ten: 'X' } },
      { company_id: 'c', transaction_id: 'x3', loai: 'loan', ly_do: 'khoá đã thu hồi', khoa_mcp: { ten: 'Cũ', thu_hoi_luc: '2026-11-01' } },
      { company_id: 'c', transaction_id: 'x4', loai: 'loan', ly_do: 'AI đọc', nguon: 'agent_mimi', ten_agent: 'Agent Phân loại (AI)', khoa_mcp: null },
    ]);
    expect(m.get('c')?.has('x3')).toBe(false);
    expect(m.get('c')?.get('x4')?.ten_agent).toBe('Agent Phân loại (AI)');
    expect(m.get('c')?.get('x1')).toEqual({ loai: 'family_transfer', ly_do: 'mới', ten_agent: 'Claude' });
    expect(m.get('c')?.has('x2')).toBe(false);
  });

  it('thay gợi ý quy tắc, ghi nguồn + tên agent; loại khỏi doanh thu không duyệt hàng loạt được', () => {
    const ngoai = new Map([['x1', { loai: 'family_transfer' as const, ly_do: 'Nội dung: me gui tien nha', ten_agent: 'Claude của Lan' }]]);
    const [d] = deXuatPhanLoai({ ...goc, xacNhan: [], ngoai });
    expect(d.phan_loai).toMatchObject({ de_xuat: 'family_transfer', anh_huong: 'exclude' });
    expect(d.bang_chung).toMatchObject({ nguon: 'agent_ngoai', agent_ngoai: 'Claude của Lan', tin_cay: 'trung_binh' });
    expect(d.duyet_hang_loat).toBe(false);
    expect(d.co_the_duyet).toBe(true);
  });

  it('khoản người đã quyết: ý kiến agent bị bỏ qua', () => {
    const ngoai = new Map([['x1', { loai: 'loan' as const, ly_do: 'vay', ten_agent: 'A' }]]);
    const ds = deXuatPhanLoai({ ...goc, xacNhan: [{ transaction_id: 'x1', confirmed_type: 'business_revenue', revenue_effect: 'include', confirmed_role: 'ke_toan' }], ngoai });
    expect(ds).toEqual([]);
  });
});

describe('cửa HTTP', () => {
  const src = readFileSync(resolve(__dirname, '../../mcp/index.ts'), 'utf8');
  it('chống dò khoá theo IP, giới hạn theo người, không ghi sổ', () => {
    expect(src).toMatch(/daBiKhoaViSai\(/);
    expect(src).toMatch(/ghiLanSai\(/);
    expect(src).toMatch(/duocGoi\(/);
    expect(src).not.toMatch(/revenue_classifications/);
  });
});
