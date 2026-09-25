import { describe, expect, it } from 'vitest';
import { chiaTheoHoatDong, goiYHoatDong, khoanTuNhap, nghiaKeToan, tienTrongKy, type KhoanDoanhThu } from './theo-hoat-dong';
import { khoanDoanhThuNganHang } from './so-lieu';
import { chuanHoaTrangThai } from '../doanh-nghiep/trang-thai';

const k = (id: string, so_tien: number, ngay: string): KhoanDoanhThu => ({ nguon: 'giao_dich', id, so_tien, ngay });

describe('chiaTheoHoatDong', () => {
  const khoan = [k('a', 100, '2026-02-01'), k('b', 200, '2026-05-01'), k('c', 300, '2026-08-01'), k('d', 400, '2026-11-01')];

  it('khoản không ai xác nhận nhóm nằm ở "chưa rõ" — không bị chia hay dồn', () => {
    const c = chiaTheoHoatDong('giao_dich', khoan, [
      { nguon: 'giao_dich', nguon_id: 'a', hoat_dong: 'phan_phoi_hang_hoa' },
      { nguon: 'giao_dich', nguon_id: 'b', hoat_dong: 'dich_vu' },
    ]);
    expect(c.tong).toBe(1000);
    expect(c.nhom.phan_phoi_hang_hoa.so_tien).toBe(100);
    expect(c.nhom.dich_vu.so_tien).toBe(200);
    expect(c.nhom.chua_ro).toMatchObject({ so_tien: 700, so_khoan: 2, ids: ['c', 'd'] });
    expect(c.nhom.chua_ro.theo_quy).toEqual([0, 0, 300, 400]);
  });

  it('phân loại của nguồn khác không được dùng nhầm (mã hoá đơn trùng mã giao dịch)', () => {
    const c = chiaTheoHoatDong('giao_dich', khoan, [{ nguon: 'hoa_don', nguon_id: 'a', hoat_dong: 'dich_vu' }]);
    expect(c.nhom.chua_ro.so_tien).toBe(1000);
  });

  it('tổng các nhóm luôn bằng tổng — không mất, không thêm đồng nào', () => {
    const c = chiaTheoHoatDong('giao_dich', khoan, [{ nguon: 'giao_dich', nguon_id: 'c', hoat_dong: 'cho_thue_tai_san' }]);
    const cong = Object.values(c.nhom).reduce((s, o) => s + o.so_tien, 0);
    expect(cong).toBe(c.tong);
  });

  it('lấy tiền theo kỳ', () => {
    const c = chiaTheoHoatDong('giao_dich', khoan, []);
    expect(tienTrongKy(c.nhom.chua_ro, [1, 2])).toBe(300);
  });
});

describe('khoản doanh thu ngân hàng — cùng bộ lọc với tổng doanh thu', () => {
  it('bỏ tiền ra, chuyển nội bộ, khoản người xác nhận không phải doanh thu, năm khác', () => {
    const ds = khoanDoanhThuNganHang(2026, [
      { id: '1', amount: 100, type: 'income', transaction_date: '2026-01-01' },
      { id: '2', amount: 50, type: 'expense', transaction_date: '2026-01-02' },
      { id: '3', amount: 70, type: 'income', transaction_date: '2026-01-03' },
      { id: '4', amount: 90, type: 'income', transaction_date: '2026-01-04' },
      { id: '5', amount: 30, type: 'income', transaction_date: '2025-12-31' },
    ], [{ transaction_id: '4', revenue_effect: 'exclude' }], new Set(['3']));
    expect(ds.map((x) => x.id)).toEqual(['1']);
  });
});

describe('gợi ý và nghĩa kế toán', () => {
  it('chỉ gợi ý khi hồ sơ đăng ký đúng một nhóm — nhiều nhóm thì hỏi', () => {
    expect(goiYHoatDong(['dich_vu'])).toBe('dich_vu');
    expect(goiYHoatDong(['dich_vu', 'phan_phoi_hang_hoa'])).toBeNull();
    expect(goiYHoatDong([])).toBeNull();
  });

  it('doanh thu chưa rõ nhóm thì nghĩa kế toán cũng chưa rõ', () => {
    expect(nghiaKeToan('business_revenue', null)).toBe('chua_ro');
    expect(nghiaKeToan('business_revenue', 'phan_phoi_hang_hoa')).toBe('doanh_thu_ban_hang');
    expect(nghiaKeToan('business_revenue', 'dich_vu')).toBe('doanh_thu_dich_vu');
    expect(nghiaKeToan('loan', null)).toBe('no_vay');
    expect(nghiaKeToan('unknown', 'dich_vu')).toBe('chua_ro');
  });

  it('doanh thu tự nhập: mỗi quý một khoản', () => {
    expect(khoanTuNhap(2026, [10, null, 0, 40]).map((x) => x.id)).toEqual(['2026-q1', '2026-q4']);
  });
});

describe('trạng thái doanh nghiệp — dịch câu của cơ quan thuế, giữ câu gốc', () => {
  it.each([
    ['NNT đang hoạt động (đã được cấp GCN ĐKT)', 'dang_hoat_dong'],
    ['NNT tạm ngừng hoạt động có thời hạn', 'tam_ngung'],
    ['NNT không hoạt động tại địa chỉ đã đăng ký', 'khong_o_dia_chi'],
    ['NNT ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực MST', 'da_dong_mst'],
    ['NNT ngừng hoạt động nhưng chưa hoàn thành thủ tục chấm dứt hiệu lực MST', 'ngung_chua_dong_mst'],
  ])('%s', (cau, mong) => {
    const r = chuanHoaTrangThai(cau);
    expect(r.cau_goc).toBe(cau);
    // Câu "chưa hoàn thành" chứa cụm "hoàn thành": phải ra ngừng-chưa-đóng, không phải đã đóng.
    expect(r.trang_thai).toBe(mong);
  });

  it('câu lạ hoặc trống → chưa rõ, không đoán là đang hoạt động', () => {
    expect(chuanHoaTrangThai('Một câu chưa từng thấy').trang_thai).toBe('chua_ro');
    expect(chuanHoaTrangThai(null).trang_thai).toBe('chua_ro');
  });
});
