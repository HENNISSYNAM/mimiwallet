import { describe, expect, it } from 'vitest';
import { chiSoCarbon, GIA_DIEN_BINH_QUAN, HE_SO_LUOI_DIEN_KG_KWH, kgCua, NHOM, nhomCua, TY_GIA_VND_USD_2022 } from './uoc-tinh.ts';
import type { GiaoDichTL } from '../tro-ly/tinh-toan.ts';

let i = 0;
const ra = (ngay: string, tien: number, ten: string, nd = ''): GiaoDichTL => ({
  id: `g${++i}`, amount: -tien, type: 'expense', transaction_date: ngay, merchant_name: ten, category: null,
  counter_account_name: null, payment_reference: nd,
});
const nhom = (ten: string, nd = '') => nhomCua({ merchant_name: ten, counter_account_name: null, payment_reference: nd })?.khoa ?? null;

describe('xếp khoản chi vào nhóm phát thải', () => {
  it('nhận ra người nhận phổ biến ở Việt Nam, có dấu hay không dấu', () => {
    expect(nhom('TONG CONG TY DIEN LUC TP.HCM')).toBe('dien');
    expect(nhom('EVNHCMC')).toBe('dien');
    expect(nhom('Petrolimex CHXD số 5')).toBe('xang_dau');
    expect(nhom('VIETJET AVIATION')).toBe('hang_khong');
    expect(nhom('Giao Hàng Nhanh')).toBe('van_chuyen_hang');
    expect(nhom('HIGHLANDS COFFEE')).toBe('an_uong');
  });
  it('đặt đồ ăn qua Grab là ăn uống, đi xe Grab là taxi; Viettel Post không phải viễn thông', () => {
    expect(nhom('GRAB', 'GrabFood don 123')).toBe('an_uong');
    expect(nhom('GRAB', 'GrabCar chuyen di')).toBe('taxi');
    expect(nhom('VIETTEL POST')).toBe('van_chuyen_hang');
    expect(nhom('VIETTEL', 'cuoc di dong thang 10')).toBe('vien_thong');
  });
  it('không đoán: lương, thuế, chuyển cho người, chữ "điện thoại" đều không thành nhóm', () => {
    expect(nhom('NGUYEN VAN A', 'tra luong thang 10')).toBeNull();
    expect(nhom('KHO BAC NHA NUOC', 'nop thue GTGT')).toBeNull();
    expect(nhom('CUA HANG DIEN THOAI ABC')).toBeNull();
    expect(nhom('TRAN THI B', 'tien nhan hang')).toBeNull();
  });
  it('mỗi nhóm không phải điện đều có hệ số EPA và mã ngành', () => {
    for (const n of NHOM.filter((x) => x.khoa !== 'dien')) {
      expect(n.kg_usd, n.khoa).toBeGreaterThan(0);
      expect(n.naics, n.khoa).toMatch(/^\d{6}$/);
    }
  });
});

describe('tính kg CO2e', () => {
  it('điện: tiền → kWh theo giá bình quân EVN → kg theo hệ số lưới', () => {
    const dien = NHOM.find((n) => n.khoa === 'dien')!;
    expect(kgCua(dien, GIA_DIEN_BINH_QUAN * 1000)).toBeCloseTo(1000 * HE_SO_LUOI_DIEN_KG_KWH, 6);
  });
  it('còn lại: tiền → USD 2022 → kg theo hệ số EPA', () => {
    const bay = NHOM.find((n) => n.khoa === 'hang_khong')!;
    expect(kgCua(bay, TY_GIA_VND_USD_2022 * 100)).toBeCloseTo(64.4, 6);
  });
  it('tháng này, tháng trước, cường độ, độ phủ; bỏ tiền vào, khoản tương lai và khoản bị loại', () => {
    const ds = [
      ra('2026-10-03', GIA_DIEN_BINH_QUAN * 1000, 'EVN HANOI'),
      ra('2026-10-05', 10_000_000, 'NGUYEN VAN A', 'tra luong'),
      ra('2026-09-10', GIA_DIEN_BINH_QUAN * 500, 'EVN HANOI'),
      ra('2026-10-30', 50_000_000, 'VIETJET'),
      { ...ra('2026-10-04', 9_000_000, 'EVN'), amount: 9_000_000, type: 'income' },
    ];
    const ca = ra('2026-10-06', 5_000_000, 'PETROLIMEX');
    const r = chiSoCarbon([...ds, ca], '2026-10-28', new Set([ca.id]));
    expect(r.kg_thang_nay).toBeCloseTo(681.1, 1);
    expect(r.kg_thang_truoc).toBeCloseTo(340.55, 0);
    expect(r.nhom.map((n) => n.khoa)).toEqual(['dien']);
    const tienDien = GIA_DIEN_BINH_QUAN * 1000;
    expect(r.ty_le_phu).toBeCloseTo(tienDien / (tienDien + 10_000_000), 2);
    expect(r.kg_moi_trieu).toBeCloseTo(681.1 / (tienDien / 1e6), 0);
  });
  it('chưa có khoản chi: không có số liệu, không ra 0 kg giả', () => {
    const r = chiSoCarbon([], '2026-10-28');
    expect(r.co_so_lieu).toBe(false);
    expect(r.kg_thang_truoc).toBeNull();
    expect(r.ty_le_phu).toBeNull();
  });
});
