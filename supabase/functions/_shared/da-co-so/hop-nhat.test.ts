import { describe, expect, it } from 'vitest';
import { cauHoiVatLechChieu, hopNhat, type CoSo, type GiaoDichCoSo } from './hop-nhat';
import { docCoSoNhap, kiemMstCungCongTy } from './kiem';
import { duLieuTrong, NANG_LUC, type DuLieu, type GiaoDichTL } from '../tro-ly/tinh-toan';
import { nhanYDinh } from '../tro-ly/y-dinh';

// Một trường 3 cơ sở: A (trụ sở, khai tập trung), B (khai tập trung), C (tự khai riêng).
const CS: CoSo[] = [
  { id: 'a', ten: 'Cơ sở A', ma_so_thue: '0319436143', khai_thue: 'tap_trung' },
  { id: 'b', ten: 'Cơ sở B', ma_so_thue: '0319436143-001', khai_thue: 'tap_trung' },
  { id: 'c', ten: 'Cơ sở C', ma_so_thue: '0319436143-002', khai_thue: 'rieng' },
];
const TK = { '1111111': 'a', '2222222': 'b', '3333333': 'c' };
let n = 0;
const g = (tk: string, so_tien: number, doi: string | null = null): GiaoDichCoSo => ({ id: `g${++n}`, so_tien, ngay: '2026-05-01', tai_khoan: tk, tai_khoan_doi_ung: doi });

describe('hợp nhất đa cơ sở', () => {
  const gd = [
    g('1111111', 500), g('1111111', -200),            // A: thu 500, chi 200
    g('2222222', 100), g('2222222', -300),            // B: thu 100, chi 300 — lỗ tự thân
    g('1111111', -150, '2222222'), g('2222222', 150, '1111111'), // A chuyển 150 sang bù B (hiện trên CẢ HAI sao kê)
    g('3333333', 50),
    g('9999999', 70),                                  // tài khoản chưa gán
  ];
  const r = hopNhat({ co_so: CS, tai_khoan_co_so: TK, giao_dich: gd });

  it('không đếm hai lần tiền chuyển giữa các cơ sở', () => {
    expect(r.hop_nhat).toEqual({ vao: 720, ra: 500, rong: 220, noi_bo_da_loai: 150 });
  });
  it('thấy cơ sở sống nhờ và ai bù cho ai', () => {
    expect(r.song_nho).toEqual(['Cơ sở B']);
    expect(r.bu_dap).toEqual([{ tu: 'Cơ sở A', den: 'Cơ sở B', so_tien: 150, so_lan: 1 }]);
    const b = r.co_so.find((s) => s.co_so_id === 'b')!;
    expect(b).toMatchObject({ rong_ngoai: -200, nhan_noi_bo: 150, bu_dap_rong: 150 });
  });
  it('tài khoản chưa gán đứng riêng, không đoán', () => {
    expect(r.chua_gan?.vao_ngoai).toBe(70);
    expect(r.tai_khoan_chua_gan).toEqual(['9999999']);
  });
  it('VAT: gộp đơn vị khai tập trung, khai riêng đứng một mình; thiếu đầu vào thì không ra số phải nộp', () => {
    const v = hopNhat({ co_so: CS, tai_khoan_co_so: TK, giao_dich: [], vat: [
      { co_so_id: 'a', dau_ra: 100, dau_vao: 30 }, { co_so_id: 'b', dau_ra: 20, dau_vao: 10 }, { co_so_id: 'c', dau_ra: 5, dau_vao: 40 },
    ] }).vat;
    expect(v.find((x) => x.don_vi === 'Khai tập trung')).toMatchObject({ cac_co_so: ['Cơ sở A', 'Cơ sở B'], dau_ra: 120, dau_vao: 40, phai_nop: 80 });
    expect(v.find((x) => x.don_vi === 'Cơ sở C')).toMatchObject({ phai_nop: -35 });
    expect(cauHoiVatLechChieu(v)).toMatch(/Cơ sở C đang dư VAT đầu vào 35 ₫.*phải nộp 80 ₫.*chưa có căn cứ/);
    const thieu = hopNhat({ co_so: CS, tai_khoan_co_so: TK, giao_dich: [], vat: [{ co_so_id: 'a', dau_ra: 100, dau_vao: null }] }).vat;
    expect(thieu[0].phai_nop).toBeNull();
  });
});

describe('kiểm dữ liệu cơ sở', () => {
  it('MST đơn vị trực thuộc phải cùng 10 số đầu với công ty', () => {
    expect(kiemMstCungCongTy('0319436143-001', '0319436143')).toBeNull();
    expect(kiemMstCungCongTy('0101234567-001', '0319436143')).toMatch(/không thuộc công ty này/);
  });
  it('đọc dữ liệu nhập', () => {
    expect(docCoSoNhap({ ten: '  Cơ sở   Thủ Đức ', ma_so_thue: '0319436143-001' })).toEqual({ ok: true, v: { ten: 'Cơ sở Thủ Đức', ma_so_thue: '0319436143-001', tinh: null, khai_thue: 'chua_ro' } });
    expect(docCoSoNhap({ ten: 'X', ma_so_thue: '12345' }).ok).toBe(false);
    expect(docCoSoNhap({ ten: '' }).ok).toBe(false);
    expect(docCoSoNhap({ ten: 'X', khai_thue: 'bat_ky' }).ok).toBe(false);
  });
});

describe('trong trợ lý', () => {
  const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
  const gd = (p: Partial<GiaoDichTL>): GiaoDichTL => ({ id: `t${++n}`, amount: 1_000_000, type: 'income', transaction_date: '2026-05-02', merchant_name: null, category: null, counter_account_name: null, payment_reference: null, ...p });
  const sao = [
    gd({ account_number: '1111111', amount: 50_000_000 }), gd({ account_number: '1111111', type: 'expense', amount: -20_000_000 }),
    gd({ account_number: '2222222', amount: 5_000_000 }), gd({ account_number: '2222222', type: 'expense', amount: -25_000_000 }),
    gd({ account_number: '1111111', type: 'expense', amount: -15_000_000, counter_account_number: '2222222' }),
    gd({ account_number: '2222222', amount: 15_000_000, counter_account_number: '1111111' }),
  ];
  const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong('2026-10-22', KY), giaoDich: sao, ...p });

  it('chưa khai báo cơ sở mà có nhiều tài khoản: chỉ đường khai báo, không bịa số', () => {
    const r = NANG_LUC.da_co_so.chay(moi({ coSo: [] }));
    expect(r.tom_tat).toMatch(/2 tài khoản của công ty nhưng chưa khai báo cơ sở/);
    expect(r.the).toEqual([]);
  });
  it('đã khai báo: hợp nhất, ai bù cho ai, có bằng chứng', () => {
    const r = NANG_LUC.da_co_so.chay(moi({ coSo: CS.slice(0, 2), taiKhoanCoSo: { '1111111': 'a', '2222222': 'b' } }));
    expect(r.tom_tat).toMatch(/đã loại 15\.000\.000 ₫ tiền chuyển qua lại/);
    expect(r.tom_tat).toMatch(/Cơ sở B đang chi nhiều hơn thu/);
    expect(r.tom_tat).toMatch(/Cơ sở A → Cơ sở B/);
    const sl = r.the.find((t) => t.loai === 'so_lieu');
    expect(sl && sl.loai === 'so_lieu' && sl.muc.every((m) => m.bang_chung?.length)).toBe(true);
  });
  it.each(['Dòng tiền từng cơ sở thế nào?', 'Chi nhánh nào đang lỗ?', 'Cơ sở nào đang bù cho cơ sở khác?'])('định tuyến: %s', (cau) => {
    expect(nhanYDinh(cau)).toContain('da_co_so');
  });
  it.each(['Cơ sở pháp lý của khoản thuế này là gì?', 'Kết nối cơ sở dữ liệu ngân hàng'])('không bắt nhầm: %s', (cau) => {
    expect(nhanYDinh(cau)).not.toContain('da_co_so');
  });
});
