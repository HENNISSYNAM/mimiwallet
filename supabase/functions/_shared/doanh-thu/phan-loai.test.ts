import { describe, expect, it } from 'vitest';
import { anhHuong, docXacNhan, keHoachHoanTac, lapBangTienVao, mauNoiDung, type TienVao, type XacNhanPhanLoai } from './phan-loai';

/* Câu chuyện của cửa hàng minh hoạ. Mọi con số là đầu vào của test. */
const vao = (id: string, amount: number, merchant_name: string, counter_account_name: string | null = null, ngay = '2026-08-10'): TienVao =>
  ({ id, amount, transaction_date: ngay, merchant_name, counter_account_name, payment_reference: null });
const xn = (transaction_id: string, confirmed_type: XacNhanPhanLoai['confirmed_type']): XacNhanPhanLoai =>
  ({ transaction_id, confirmed_type, revenue_effect: anhHuong(confirmed_type), ghi_chu: null, confirmed_role: 'chu_so_huu', confirmed_at: '2026-09-24T08:00:00Z' });

const DS = [
  vao('ban1', 900_000, 'KHACH LE CK THANH TOAN DON 1523', 'KHACH LE'),
  vao('ban2', 700_000, 'KHACH LE CK THANH TOAN DON 1524', 'KHACH LE'),
  vao('vay', 200_000_000, 'GIAI NGAN HDTD 0126', 'NGAN HANG TMCP', '2026-03-08'),
  vao('con', 3_000_000, 'CON GUI BA ME TIEU', 'CON GAI', '2026-08-20'),
  vao('noibo', 10_000_000, 'NHAN TIEN TU TK CHINH', 'CHU HO', '2026-08-28'),
];

describe('tiền vào ≠ doanh thu', () => {
  it('chưa ai xác nhận: mọi thứ (trừ chuyển nội bộ) là "chưa rõ", không có doanh thu đã xác nhận', () => {
    const b = lapBangTienVao(2026, DS, [], new Set(['noibo']));
    expect(b.tong_vao).toBe(214_600_000);
    expect(b.noi_bo).toBe(10_000_000);
    expect(b.doanh_thu_da_xac_nhan).toBe(0);
    expect(b.chua_ro).toBe(204_600_000);
    expect(b.can_xem).toEqual({ so: 2, tong: 203_000_000 });
  });

  it('xác nhận: tiền bán hàng vào doanh thu, tiền vay ra ngoài, "Tôi chưa chắc" vẫn là chưa rõ', () => {
    const b = lapBangTienVao(2026, DS, [xn('ban1', 'business_revenue'), xn('vay', 'loan'), xn('con', 'unknown')], new Set(['noibo']));
    expect(b.doanh_thu_da_xac_nhan).toBe(900_000);
    expect(b.khong_phai_doanh_thu).toBe(200_000_000);
    expect(b.chua_ro).toBe(3_700_000);
    expect(b.can_xem.so).toBe(0);
  });

  it('gom nhóm: hai khoản cùng người chuyển, cùng kiểu nội dung → một nhóm áp một lần', () => {
    const b = lapBangTienVao(2026, DS, [], new Set(['noibo']));
    expect(b.nhom).toHaveLength(1);
    expect(b.nhom[0]).toMatchObject({ so: 2, tong: 1_600_000, transaction_ids: ['ban1', 'ban2'] });
    expect(b.nhom[0].mo_ta).toContain('2 khoản từ KHACH LE');
    expect(mauNoiDung(DS[0])).toBe(mauNoiDung(DS[1]));
  });

  it('ảnh hưởng tới doanh thu theo loại', () => {
    expect(anhHuong('business_revenue')).toBe('include');
    expect(anhHuong('unknown')).toBe('pending');
    expect(anhHuong('collection_on_behalf')).toBe('exclude');
  });
});

describe('xác nhận và hoàn tác', () => {
  it('kiểm yêu cầu: loại hợp lệ, có khoản, "Khác" phải ghi rõ', () => {
    expect(docXacNhan({ loai: 'loan', transaction_ids: ['a', 'a', 'b'] })).toEqual({ ok: true, loai: 'loan', ghi_chu: null, transaction_ids: ['a', 'b'] });
    expect(docXacNhan({ loai: 'xyz', transaction_ids: ['a'] }).ok).toBe(false);
    expect(docXacNhan({ loai: 'loan', transaction_ids: [] }).ok).toBe(false);
    expect(docXacNhan({ loai: 'other', transaction_ids: ['a'] }).ok).toBe(false);
  });

  it('hoàn tác một nhóm: khoản chưa từng phân loại thì gỡ; khoản đã có loại thì trả về loại cũ', () => {
    const k = keHoachHoanTac([
      { transaction_id: 'a', from_type: null, from_effect: null, at: '2026-09-24T08:00:00Z' },
      { transaction_id: 'b', from_type: 'unknown', from_effect: 'pending', at: '2026-09-24T08:00:00Z' },
    ]);
    expect(k).toEqual([
      { transaction_id: 'a', ve: null },
      { transaction_id: 'b', ve: { loai: 'unknown', anh_huong: 'pending' } },
    ]);
  });
});
