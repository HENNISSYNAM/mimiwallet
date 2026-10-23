import { describe, expect, it } from 'vitest';
import { SO_THANG_TOI_THIEU, tinhDiemSanSang, TRONG_SO, type DauVaoSanSang } from './diem-san-sang';
import { duLieuTrong, NANG_LUC, sucKhoeTaiChinh, type DuLieu, type GiaoDichTL } from '../tro-ly/tinh-toan';
import { nhanYDinh } from '../tro-ly/y-dinh';

const thang = (n: number, vao: number, ra: number) =>
  Array.from({ length: n }, (_, i) => ({ khoa: `2026-${String(i + 1).padStart(2, '0')}`, vao, ra }));
const co = (p: Partial<DauVaoSanSang>): DauVaoSanSang => ({
  thang: thang(12, 100_000_000, 80_000_000), cong_no_qua_han: 0, ty_le_khach_lon_nhat: 0.1, tien_nghi_chua_xac_nhan: 0, tong_tien_vao: 1_200_000_000, ...p,
});

describe('tính sức khoẻ tài chính', () => {
  it('trọng số cộng đủ 100', () => expect(Object.values(TRONG_SO).reduce((s, x) => s + x, 0)).toBe(100));
  it('chưa đủ 3 tháng đã khép sổ thì không chấm', () => {
    const r = tinhDiemSanSang(co({ thang: thang(SO_THANG_TOI_THIEU - 1, 1e8, 8e7) }));
    expect(r.co_diem).toBe(false);
  });
  it('hồ sơ đều, ròng dương, không nợ quá hạn → điểm tối đa, mức vững', () => {
    const r = tinhDiemSanSang(co({}));
    expect(r.co_diem && r.diem).toBe(100);
    expect(r.co_diem && r.muc).toBe('vung');
  });
  it('ròng âm, dao động mạnh, nợ quá hạn lớn, một khách chiếm hết → điểm thấp, nói cách cải thiện', () => {
    const t = thang(6, 0, 0).map((x, i) => ({ ...x, vao: i % 2 ? 150_000_000 : 20_000_000, ra: 100_000_000 }));
    const r = tinhDiemSanSang(co({ thang: t, cong_no_qua_han: 60_000_000, ty_le_khach_lon_nhat: 0.8, tien_nghi_chua_xac_nhan: 100_000_000, tong_tien_vao: 600_000_000 }));
    expect(r.co_diem && r.diem).toBeLessThan(50);
    expect(r.co_diem && r.muc).toBe('can_cai_thien');
    expect(r.co_diem && r.yeu_to.filter((y) => y.diem < y.toi_da).every((y) => y.goi_y.length > 0)).toBe(true);
  });
  it('không biết tên khách: yếu tố tập trung lấy nửa điểm, không đoán', () => {
    const r = tinhDiemSanSang(co({ ty_le_khach_lon_nhat: null }));
    expect(r.co_diem && r.yeu_to.find((y) => y.khoa === 'tap_trung')?.diem).toBe(5);
  });
});

describe('trong trợ lý và màn đầu', () => {
  const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
  let so = 0;
  const gd = (p: Partial<GiaoDichTL>): GiaoDichTL => ({
    id: `s${++so}`, amount: 100_000, type: 'income', transaction_date: '2026-05-10', merchant_name: 'TT DON', category: null,
    counter_account_name: 'KHACH', payment_reference: null, ...p,
  });
  const sinh = (khoanVay = false): GiaoDichTL[] => [4, 5, 6, 7, 8, 9].flatMap((m) => [
    ...[1, 2, 3, 4].map((k) => gd({ amount: 25_000_000, transaction_date: `2026-0${m}-0${k}`, counter_account_name: `KHACH ${k}` })),
    gd({ type: 'expense', amount: -80_000_000, transaction_date: `2026-0${m}-20`, counter_account_name: 'NCC' }),
  ]).concat(khoanVay ? [gd({ amount: 500_000_000, transaction_date: '2026-06-15', payment_reference: 'GIAI NGAN HDTD 123', counter_account_name: 'NGAN HANG' })] : []);
  const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong('2026-10-16', KY), giaoDich: sinh(), ...p });

  it('một khoản vay cũ không làm điểm đẹp hơn (dòng tiền đã làm sạch)', () => {
    const a = sucKhoeTaiChinh(moi());
    const b = sucKhoeTaiChinh(moi({ giaoDich: sinh(true) }));
    const yeu = (r: typeof a, k: string) => (r.co_diem ? r.yeu_to.find((y) => y.khoa === k)?.diem : null);
    expect(yeu(b, 'dong_tien_rong')).toBe(yeu(a, 'dong_tien_rong'));
    expect(yeu(b, 'on_dinh')).toBe(yeu(a, 'on_dinh'));
    // khoản vay chưa xác nhận làm giảm điểm "doanh thu đã xác nhận"
    expect(yeu(b, 'minh_bach')).toBeLessThan(yeu(a, 'minh_bach') as number);
  });
  it('trả lời trong trợ lý: có điểm, có bảng yếu tố, nói rõ không phải điểm tín dụng', () => {
    const r = NANG_LUC.suc_khoe_tai_chinh.chay(moi());
    expect(r.tom_tat).toMatch(/Sức khoẻ tài chính của bạn: \d+\/100/);
    expect(r.the.some((t) => t.loai === 'ghi_chu' && /Không phải điểm tín dụng/.test(t.cau))).toBe(true);
  });
  it('không có sao kê: không có số giả', () => {
    const r = NANG_LUC.suc_khoe_tai_chinh.chay(moi({ giaoDich: [] }));
    expect(r.tom_tat).not.toMatch(/\/100/);
  });
  it.each(['Điểm tín dụng của tôi bao nhiêu?', 'Sức khoẻ tài chính của tôi thế nào?', "What's my credit score?"])('định tuyến: %s', (cau) => {
    expect(nhanYDinh(cau)).toContain('suc_khoe_tai_chinh');
  });
});
