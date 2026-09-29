import { describe, expect, it } from 'vitest';
import { nhanDinhNguong } from './nhanDinhNguong';

const TY = 1_000_000_000;

/** Ca lấy từ khách giả lập (docs/PHAN_HOI_GIA_LAP_WTP.md) — số là đầu vào test. */
describe('nhận định ngưỡng 1 tỷ — không kết luận quá sớm', () => {
  it('tiệm vàng bán tiền mặt: KHÔNG nói "chưa vượt" chỉ vì ngân hàng thấy 938 triệu', () => {
    const chuaHoi = nhanDinhNguong({ doanhThu: 938_000_000, nguong: TY, tienMat: null });
    expect(chuaHoi).toMatchObject({ muc: 'chua_ket_luan', hoiTienMat: true });
    expect(chuaHoi.cau).not.toMatch(/^Chưa vượt/);
    const phanLon = nhanDinhNguong({ doanhThu: 938_000_000, nguong: TY, tienMat: 'phan_lon' });
    expect(phanLon.muc).toBe('co_the_vuot');
    expect(phanLon.cau).toContain('62.000.000');
  });

  it('tạp hoá vừa nhập sao kê: vay 200 triệu chưa xác nhận → "có thể chưa vượt", không phải "đã vượt"', () => {
    const r = nhanDinhNguong({ doanhThu: 1_201_876_000, nguong: TY, goiYLoaiRa: { so_tien: 240_000_000, so_khoan: 3 } });
    expect(r.muc).toBe('co_the_chua_vuot');
    expect(r.cau).toContain('3 khoản');
  });

  it('vượt dù trừ hết khoản MIMI nghi ngờ → đã vượt', () => {
    expect(nhanDinhNguong({ doanhThu: 2_779_788_000, nguong: TY, goiYLoaiRa: { so_tien: 800_000_000, so_khoan: 2 } }).muc).toBe('da_vuot');
  });

  it('khách gần như không trả tiền mặt → mới được nói "chưa vượt"', () => {
    expect(nhanDinhNguong({ doanhThu: 434_000_000, nguong: TY, tienMat: 'gan_nhu_khong' })).toMatchObject({ muc: 'chua_vuot', hoiTienMat: false });
  });

  it('một phần tiền mặt: nói rõ còn bao nhiêu thì vượt', () => {
    expect(nhanDinhNguong({ doanhThu: 900_000_000, nguong: TY, tienMat: 'mot_phan' }).cau).toContain('100.000.000');
  });

  it('bán trên sàn: nhắc doanh thu tính thuế là giá bán trước phí', () => {
    const r = nhanDinhNguong({ doanhThu: 355_000_000, nguong: TY, tienMat: 'gan_nhu_khong', tienSan: { so_tien: 353_000_000, so_khoan: 45 } });
    expect(r.ghiChuSan).toContain('trước phí');
  });
});
