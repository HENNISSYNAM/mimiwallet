import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { apPhamVi, biGioiHan, trongPhamVi, VAI_TRO_THAY_CA_CONG_TY, type PhamViCoSo } from './pham-vi.ts';
import { duLieuTrong, type DuLieu, type GiaoDichTL, type HoaDonBanTL } from '../tro-ly/tinh-toan.ts';

const KY = { tu: '2026-10-01', den: '2026-10-31' };
const gd = (id: string, so: string | null): GiaoDichTL => ({
  id, amount: 1_000_000, type: 'income', transaction_date: '2026-10-05', merchant_name: 'X', category: null,
  counter_account_name: 'KHACH', account_number: so,
} as GiaoDichTL);
const hd = (id: string, coSo: string | null): HoaDonBanTL => ({
  id, invoice_number: id, client_name: 'K', total: 1, issued_date: '2026-10-01', due_date: '2026-10-30', status: 'pending', co_so_id: coSo,
});
const CS_A: PhamViCoSo = { co_so_id: 'A', ten: 'Cơ sở A', tai_khoan: ['0123456789'] };

function duLieu(): DuLieu {
  const d = duLieuTrong('2026-10-23', KY);
  d.giaoDich = [gd('g1', '0123456789'), gd('g2', '012-345-6789'), gd('g3', '9999999999'), gd('g4', null)];
  d.hoaDonBan = [hd('h1', 'A'), hd('h2', 'B'), hd('h3', null)];
  d.hoaDonVao = [{ id: 'v', total_amount: 5, issued_at: '2026-10-01', invoice_number: '1', counterparty_name: 'N', counterparty_tax_code: null }] as DuLieu['hoaDonVao'];
  d.yeuCau = [{ id: 'y' } as DuLieu['yeuCau'][number]];
  d.thue = { suKien: [], canhBao: [], canCuDaKiem: {}, canCuHetHieuLuc: {}, chuaKiemHieuLuc: false } as unknown as DuLieu['thue'];
  d.phanLoaiTienVao = { g1: 'include', g3: 'exclude' };
  d.coSo = [{ id: 'A', ten: 'A' }, { id: 'B', ten: 'B' }] as DuLieu['coSo'];
  d.taiKhoanCoSo = { '0123456789': 'A', '9999999999': 'B' };
  return d;
}

describe('phạm vi cơ sở — ai bị giới hạn', () => {
  it('chủ sở hữu và quản trị không bao giờ bị giới hạn, kể cả khi bị gán nhầm cơ sở', () => {
    for (const v of VAI_TRO_THAY_CA_CONG_TY) expect(biGioiHan(v, 'A')).toBe(false);
  });
  it('kế toán, người duyệt, người xem có cơ sở thì bị giới hạn; không có cơ sở thì không', () => {
    for (const v of ['ke_toan', 'nguoi_duyet', 'nguoi_xem']) {
      expect(biGioiHan(v, 'A')).toBe(true);
      expect(biGioiHan(v, null)).toBe(false);
    }
  });
  it('vai trò lạ (không có trong danh sách) bị giới hạn — mặc định đóng, không mở', () => {
    expect(biGioiHan('vai_tro_moi', 'A')).toBe(true);
  });
});

describe('phạm vi cơ sở — lọc dữ liệu trợ lý', () => {
  it('không có phạm vi: dữ liệu giữ nguyên', () => {
    const d = duLieu();
    expect(apPhamVi(d, null).giaoDich).toHaveLength(4);
  });
  it('chỉ giữ giao dịch của tài khoản thuộc cơ sở; số tài khoản có dấu gạch vẫn khớp; không có số tài khoản thì bỏ', () => {
    const d = apPhamVi(duLieu(), CS_A);
    expect(d.giaoDich.map((t) => t.id)).toEqual(['g1', 'g2']);
  });
  it('hoá đơn: chỉ hoá đơn gán cơ sở mình; hoá đơn chưa gán không lộ', () => {
    expect(apPhamVi(duLieu(), CS_A).hoaDonBan.map((h) => h.id)).toEqual(['h1']);
  });
  it('nguồn của cả công ty (hoá đơn đầu vào, yêu cầu chi, thuế) bị để trống', () => {
    const d = apPhamVi(duLieu(), CS_A);
    expect(d.hoaDonVao).toEqual([]);
    expect(d.yeuCau).toEqual([]);
    expect(d.thue).toBeNull();
  });
  it('phân loại tiền vào và danh sách cơ sở của nơi khác không lộ qua đường phụ', () => {
    const d = apPhamVi(duLieu(), CS_A);
    expect(Object.keys(d.phanLoaiTienVao ?? {})).toEqual(['g1']);
    expect(d.coSo?.map((c) => c.id)).toEqual(['A']);
    expect(Object.values(d.taiKhoanCoSo ?? {})).toEqual(['A']);
    expect(d.phamViCoSo).toEqual({ co_so_id: 'A', ten: 'Cơ sở A' });
  });
  it('cơ sở chưa gán tài khoản nào: không thấy giao dịch nào (không rơi về "thấy hết")', () => {
    expect(apPhamVi(duLieu(), { ...CS_A, tai_khoan: [] }).giaoDich).toEqual([]);
  });
});

describe('phạm vi cơ sở — thao tác theo mã giao dịch (IDOR)', () => {
  it('giao dịch của cơ sở khác hoặc không có số tài khoản bị từ chối', () => {
    expect(trongPhamVi(CS_A, '0123456789')).toBe(true);
    expect(trongPhamVi(CS_A, '0123 456 789')).toBe(true);
    expect(trongPhamVi(CS_A, '9999999999')).toBe(false);
    expect(trongPhamVi(CS_A, null)).toBe(false);
    expect(trongPhamVi(CS_A, '')).toBe(false);
  });
  it('không bị giới hạn thì không chặn', () => {
    expect(trongPhamVi(null, null)).toBe(true);
  });
});

describe('phạm vi cơ sở — hai lớp không lệch nhau', () => {
  const goc = resolve(__dirname, '../../..');
  const sql = readFileSync(resolve(goc, 'migrations/20261023090000_pham_vi_co_so.sql'), 'utf8');
  const troLy = readFileSync(resolve(goc, 'functions/tro-ly/index.ts'), 'utf8');
  it('policy CSDL là RESTRICTIVE trên transactions, invoices, co_so, co_so_tai_khoan', () => {
    for (const bang of ['transactions', 'invoices', 'co_so', 'co_so_tai_khoan']) {
      expect(sql).toMatch(new RegExp(`ON public\\.${bang}\\s+AS RESTRICTIVE FOR SELECT`));
    }
  });
  it('CSDL loại đúng các vai trò mà mã loại', () => {
    expect(sql).toContain(`NOT IN (${VAI_TRO_THAY_CA_CONG_TY.map((v) => `'${v}'`).join(', ')})`);
  });
  it('mọi lần trợ lý đọc dữ liệu đều mang phạm vi', () => {
    const goi = [...troLy.matchAll(/docDuLieu\(db,[^\n]*/g)].map((m) => m[0]);
    expect(goi.length).toBeGreaterThan(0);
    for (const g of goi) expect(g).toContain('phamVi');
  });
  it('mọi thao tác lên một giao dịch theo mã trong trợ lý đều kiểm phạm vi', () => {
    const doan = troLy.split(/\n    case "/).filter((c) => /from\("transactions"\)[\s\S]{0,200}\.eq\("id"/.test(c));
    expect(doan.length).toBeGreaterThan(0);
    for (const c of doan) expect(c).toContain('trongPhamVi(phamVi');
  });
});
