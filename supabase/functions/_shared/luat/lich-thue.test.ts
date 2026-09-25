import { describe, expect, it } from 'vitest';
import { suyLuan, type SuKienThue } from './he-luat';
import { lichThue, mocKeTiep } from './lich-thue';

const HOM_NAY = '2026-09-25';
const sk = (p: Partial<SuKienThue> = {}): SuKienThue => ({
  nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh', doanhThuQuy: [200e6, 200e6, 200e6, 0], nguonDoanhThu: 'hoa_don_dien_tu',
  nhomNganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', phuongPhapTncn: 'doanh_thu', batDauKinhDoanh: null,
  daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null, ...p,
});
const lich = (s: SuKienThue, p: Record<string, unknown> = {}) => lichThue({ sk: s, sl: suyLuan(s), homNay: HOM_NAY, ...p });

describe('lịch thuế — một nguồn, không tự coi "chưa biết" là "bắt buộc"', () => {
  it('dưới ngưỡng: chỉ thông báo doanh thu năm — KHÔNG có "kỳ khai quý 3"', () => {
    const l = lich(sk());
    expect(l.some((m) => m.loai === 'thong_bao_doanh_thu' && m.han === '2027-01-31')).toBe(true);
    expect(l.some((m) => m.loai === 'khai_va_nop')).toBe(false);
  });

  it('đúng bằng 01 tỷ vẫn là dưới ngưỡng ("trở xuống")', () => {
    const l = lich(sk({ doanhThuQuy: [250e6, 250e6, 250e6, 250e6] }));
    expect(l.some((m) => m.loai === 'khai_va_nop')).toBe(false);
  });

  it('trên ngưỡng: khai và nộp theo quý, có hạn thật', () => {
    const l = lich(sk({ doanhThuQuy: [600e6, 600e6, 0, 0] }));
    expect(l.some((m) => m.loai === 'khai_va_nop' && m.trang_thai === 'phai_lam' && m.han)).toBe(true);
  });

  it('thiếu doanh thu: cần xác minh, không có ngày giả', () => {
    const l = lich(sk({ doanhThuQuy: null }));
    const m = l.find((x) => x.khoa === 'hkd_chua_ro_doanh_thu')!;
    expect(m.trang_thai).toBe('can_xac_minh');
    expect(m.han).toBeNull();
    expect(m.cau_hoi).toBeTruthy();
  });

  it('đang tạm ngừng: kỳ khai chuyển sang "cần xác minh" với căn cứ NĐ 252 Điều 7', () => {
    const l = lich(sk(), { trangThai: 'tam_ngung' });
    const m = l.find((x) => x.loai === 'thong_bao_doanh_thu')!;
    expect(m.trang_thai).toBe('can_xac_minh');
    expect(m.can_cu).toContain('nd252_d7_c1');
  });

  it('doanh nghiệp: tạm nộp TNDN quý, quyết toán TNDN; GTGT chưa biết kỳ thì HỎI', () => {
    const l = lich(sk({ loai: 'doanh_nghiep' }));
    expect(l.find((m) => m.khoa === 'tndn_tam_nop:2026-q2')?.han).toBe('2026-07-31');
    expect(l.find((m) => m.khoa === 'tndn_tam_nop:2026-q3')?.han).toBe('2026-10-31');
    expect(l.find((m) => m.khoa === 'tndn_quyet_toan:2026')?.han).toBe('2027-03-31');
    const gtgt = l.find((m) => m.khoa === 'gtgt_ky_khai')!;
    expect(gtgt).toMatchObject({ trang_thai: 'can_xac_minh', han: null });
    expect(gtgt.cau_hoi).toContain('theo tháng hay theo quý');
  });

  it('doanh nghiệp khai GTGT theo tháng: hạn ngày 20 tháng sau', () => {
    const l = lich(sk({ loai: 'doanh_nghiep' }), { kyKhaiGtgt: 'thang' });
    expect(l.find((m) => m.khoa.startsWith('gtgt:'))?.han).toBe('2026-10-20');
  });

  it('chỉ mình tôi → TNCN khấu trừ không áp dụng; chưa biết → hỏi', () => {
    expect(lich(sk({ loai: 'doanh_nghiep' }), { soNguoi: '1' }).find((m) => m.khoa === 'tncn_khau_tru')?.trang_thai).toBe('khong_ap_dung');
    expect(lich(sk({ loai: 'doanh_nghiep' })).find((m) => m.khoa.startsWith('tncn_quyet_toan'))?.cau_hoi).toContain('trả lương');
  });

  it('mốc kế tiếp là mốc chưa qua hạn, gần nhất', () => {
    const m = mocKeTiep(lich(sk({ loai: 'doanh_nghiep' })));
    expect(m?.khoa).toBe('tndn_tam_nop:2026-q3');
    expect(m?.con_lai).toBe(36);
  });
});
