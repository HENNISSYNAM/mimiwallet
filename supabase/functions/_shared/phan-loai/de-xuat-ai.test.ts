import { describe, expect, it } from 'vitest';
import { chonDong, docTraLoiAi, gopLuatVaAi, laChiRaKhongPhaiDoanhThu, noiDungGuiAi, SO_DONG_TOI_DA, type DongGuiAi } from './de-xuat-ai';
import { duLieuTrong, NANG_LUC, type DuLieu, type GiaoDichTL } from '../tro-ly/tinh-toan';
import { locDeXuat } from '../quyen/loc-de-xuat';

const dong = (id: string, so_tien: number, noi_dung = 'CK'): DongGuiAi => ({ id, ngay: '2026-05-02', so_tien, noi_dung, so_lan_doi_tac: 1 });

describe('gửi cho AI', () => {
  it('không gửi id thật, tên người chuyển hay số tài khoản; mã tạm d1, d2…', () => {
    const { tin, ma } = noiDungGuiAi([dong('uuid-that-1', 50_000_000), dong('uuid-that-2', 3_000_000)]);
    expect(tin).not.toContain('uuid-that');
    expect(JSON.parse(tin).dong.map((x: { ma: string }) => x.ma)).toEqual(['d1', 'd2']);
    expect(ma.get('d1')).toBe('uuid-that-1');
    expect(Object.keys(JSON.parse(tin).dong[0]).sort()).toEqual(['ma', 'ngay', 'noi_dung', 'so_lan_doi_tac', 'so_tien']);
  });
  it('chọn khoản lớn trước, có trần', () => {
    const ds = Array.from({ length: 200 }, (_, i) => dong(`g${i}`, i * 1000));
    const c = chonDong(ds);
    expect(c.length).toBe(SO_DONG_TOI_DA);
    expect(c[0].so_tien).toBe(199_000);
  });
});

describe('đọc câu trả lời của AI', () => {
  const ma = new Map([['d1', 'g1'], ['d2', 'g2']]);
  it('nhận đúng khuôn, bỏ mã lạ, loại lạ, kẹp tin cậy, cắt lý do và ký tự điều khiển', () => {
    const r = docTraLoiAi('Đây: {"ket_qua":[{"ma":"d1","loai":"vay","tin_cay":1.7,"ly_do":"<b>giải ngân</b>\u0007 lớn một lần"},{"ma":"d9","loai":"vay","tin_cay":0.9},{"ma":"d2","loai":"chuyen_tien_di","tin_cay":0.9}]}', ma);
    expect(Object.keys(r)).toEqual(['g1']);
    expect(r.g1.tin_cay).toBe(1);
    expect(r.g1.ly_do).not.toMatch(/[<>\u0007]/);
  });
  it('trả lời hỏng thì không có gì — năng lực chạy như chỉ có luật', () => {
    expect(docTraLoiAi('không phải JSON', ma)).toEqual({});
    expect(docTraLoiAi(null, ma)).toEqual({});
  });
  it('chỉ hiện khi loại cụ thể và đủ tin cậy', () => {
    expect(laChiRaKhongPhaiDoanhThu({ loai: 'vay', tin_cay: 0.8, ly_do: '' })).toBe(true);
    expect(laChiRaKhongPhaiDoanhThu({ loai: 'vay', tin_cay: 0.4, ly_do: '' })).toBe(false);
    expect(laChiRaKhongPhaiDoanhThu({ loai: 'chua_ro', tin_cay: 0.9, ly_do: '' })).toBe(false);
    expect(laChiRaKhongPhaiDoanhThu({ loai: 'doanh_thu', tin_cay: 0.9, ly_do: '' })).toBe(false);
  });
});

describe('gộp luật và AI: AI không bao giờ tự trừ', () => {
  it.each([
    ['r', 'r', 'r'], ['r', 'n', 'u'], ['r', 'u', 'u'],
    ['u', 'r', 'r'], ['u', 'n', 'u'], ['u', 'u', 'u'],
    ['n', 'r', 'n'], ['n', 'u', 'n'],
  ] as const)('luật %s + AI %s → %s', (l, a, kq) => {
    expect(gopLuatVaAi(l, a)).toBe(kq);
  });
  it('không có câu trả lời AI thì giữ quyết định của luật', () => expect(gopLuatVaAi('r', undefined)).toBe('r'));
});

describe('trong trợ lý', () => {
  const KY = { tu: '2026-07-01', den: '2026-09-30', nhan: 'quý III/2026' };
  let so = 0;
  const gd = (p: Partial<GiaoDichTL>): GiaoDichTL => ({
    id: `t${++so}`, amount: 1_200_000, type: 'income', transaction_date: '2026-05-02', merchant_name: null, category: null,
    counter_account_name: 'KHACH LE', payment_reference: 'TT DON HANG', ...p,
  });
  const vay = gd({ id: 'vay-mo', amount: 300_000_000, payment_reference: 'CK', counter_account_name: 'NGUYEN VAN X' });
  const coc = gd({ id: 'coc-ro', amount: 5_000_000, payment_reference: 'DAT COC DON 12' });
  const moi = (p: Partial<DuLieu> = {}): DuLieu => ({ ...duLieuTrong('2026-10-16', KY), giaoDich: [gd({}), vay, coc], ...p });
  const chay = (d: DuLieu) => NANG_LUC.tien_vao_khong_phai_doanh_thu.chay(d);

  it('AI chỉ ra khoản vay nội dung mơ hồ mà luật bỏ sót; khoản vẫn chờ xác nhận, có nút xác nhận', () => {
    const r = chay(moi({ deXuatAiTienVao: { 'vay-mo': { loai: 'vay', tin_cay: 0.85, ly_do: 'Số lớn, một lần, nội dung chung chung' } } }));
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' && bang.dong.some((d) => String(d[3]).includes('AI chỉ ra'))).toBe(true);
    const dx = r.de_xuat.find((x) => x.loai === 'xac_nhan_tien_vao')!;
    expect(dx.tham_so).toMatchObject({ transaction_id: 'vay-mo', loai: 'loan' });
    expect(r.tom_tat).toMatch(/còn chờ bạn xác nhận/);
  });
  it('AI không ghi đè luật; AI yếu tin cậy không hiện', () => {
    const r = chay(moi({ deXuatAiTienVao: { 'coc-ro': { loai: 'vay', tin_cay: 0.95, ly_do: 'x' }, 'vay-mo': { loai: 'vay', tin_cay: 0.3, ly_do: 'x' } } }));
    const bang = r.the.find((t) => t.loai === 'bang');
    expect(bang && bang.loai === 'bang' && bang.dong.every((d) => !String(d[3]).includes('AI'))).toBe(true);
    expect(r.de_xuat.some((x) => x.loai === 'xac_nhan_tien_vao')).toBe(false);
  });
  it('người xem không có nút xác nhận', () => {
    const r = chay(moi({ deXuatAiTienVao: { 'vay-mo': { loai: 'vay', tin_cay: 0.85, ly_do: 'x' } } }));
    expect(locDeXuat([r], 'nguoi_xem')[0].de_xuat.some((x) => x.loai === 'xac_nhan_tien_vao')).toBe(false);
    expect(locDeXuat([r], 'ke_toan')[0].de_xuat.some((x) => x.loai === 'xac_nhan_tien_vao')).toBe(true);
  });
  it('không có lớp AI thì giống hệt trước', () => {
    const r = chay(moi());
    expect(r.de_xuat.some((x) => x.loai === 'xac_nhan_tien_vao')).toBe(false);
  });
});
