import { describe, expect, it } from 'vitest';
import { tinhNghiaVu, type DuKienNghiaVu } from './tinh';
import { chiaTheoHoatDong } from '../doanh-thu/theo-hoat-dong';
import type { SuyLuan } from '../luat/he-luat';

const sl = { ket_luan: [{ id: 'x', loai: 'nghia_vu', cau: 'Thông báo doanh thu năm 2026.', mau: '01/TKN-CNKD', han: ['2027-01-31'], can_cu: ['nd68_d8_k1a'] }] } as unknown as SuyLuan;
const chuaRo = chiaTheoHoatDong('giao_dich', [{ nguon: 'giao_dich', id: 'a', so_tien: 217e6, ngay: '2026-05-01' }], []);
const dk = (p: Partial<DuKienNghiaVu> = {}): DuKienNghiaVu => ({
  homNay: '2026-09-25', loai: 'ho_kinh_doanh', trangThai: 'dang_hoat_dong', suyLuan: sl, hoatDong: null, soNguoi: '1', ...p,
});

describe('tinhNghiaVu', () => {
  it('kỳ khai tới lấy thẳng từ hệ luật', () => {
    const k = tinhNghiaVu(dk()).find((n) => n.ma === 'khai_thue_ky_toi')!;
    expect(k).toMatchObject({ trang_thai: 'ap_dung', han: '2027-01-31', ten: 'Khai thuế mẫu 01/TKN-CNKD' });
  });

  it('doanh thu chưa rõ nhóm thành một việc phải làm', () => {
    const n = tinhNghiaVu(dk({ hoatDong: chuaRo })).find((x) => x.ma === 'xep_nhom_hoat_dong')!;
    expect(n.vi_sao).toContain('217.000.000đ');
  });

  it('thiếu dữ kiện lao động thì HỎI đúng một câu, không đoán "không áp dụng"', () => {
    const n = tinhNghiaVu(dk({ soNguoi: null })).find((x) => x.ma === 'lao_dong_bhxh')!;
    expect(n.trang_thai).toBe('can_du_kien');
    expect(n.cau_hoi?.cau).toBe('Hiện bạn có thuê người lao động theo hợp đồng không?');
    expect(n.cau_hoi?.vi_sao).toContain('bảo hiểm xã hội');
  });

  it('2–9 người chưa chắc là lao động thuê (có thể là người nhà) → có điều kiện, vẫn hỏi', () => {
    const n = tinhNghiaVu(dk({ soNguoi: '2-9' })).find((x) => x.ma === 'lao_dong_bhxh')!;
    expect(n.trang_thai).toBe('co_dieu_kien');
    expect(n.cau_hoi).toBeTruthy();
  });

  it('chỉ mình tôi → không áp dụng, có lý do', () => {
    expect(tinhNghiaVu(dk()).find((x) => x.ma === 'lao_dong_bhxh')?.trang_thai).toBe('khong_ap_dung');
  });

  it('mã số thuế tạm ngừng đứng đầu danh sách', () => {
    expect(tinhNghiaVu(dk({ trangThai: 'tam_ngung' }))[0].ma).toBe('trang_thai_doanh_nghiep');
  });

  it('doanh nghiệp không bị nhắc xếp nhóm hoạt động của hộ', () => {
    expect(tinhNghiaVu(dk({ loai: 'doanh_nghiep', hoatDong: chuaRo })).some((x) => x.ma === 'xep_nhom_hoat_dong')).toBe(false);
  });
});
