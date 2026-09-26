import { describe, expect, it } from 'vitest';
import { docBaoCao } from './doc-bao-cao';
import { docSo } from './doc-bang';
import { nhanDang } from './nhan-dang';

/* Bảng dưới đây là DỮ LIỆU KIỂM THỬ dựng tay theo hình dạng tệp phần mềm kế toán xuất ra — không phải số của ai. */
const KQKD_TT200_2026 = [
  ['CÔNG TY TNHH THỬ NGHIỆM', null, null, null, 'Mẫu số B02 - DN'],
  [null, null, null, null, '(Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014 của Bộ Tài chính)'],
  ['BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH'],
  ['Năm 2026'],
  [null, null, null, null, 'Đơn vị tính: đồng'],
  ['CHỈ TIÊU', 'Mã số', 'Thuyết minh', 'Năm nay', 'Năm trước'],
  ['1. Doanh thu bán hàng và cung cấp dịch vụ', '01', 'VI.25', 951983000, 800000000],
  ['2. Các khoản giảm trừ doanh thu', '02', null, 1983000, 0],
  ['3. Doanh thu thuần về bán hàng và cung cấp dịch vụ (10 = 01 - 02)', '10', null, 950000000, 800000000],
  ['4. Giá vốn hàng bán', '11', 'VI.27', 600000000, 520000000],
  ['5. Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (20 = 10 - 11)', '20', null, 350000000, 280000000],
  ['6. Doanh thu hoạt động tài chính', '21', null, 5000000, 3000000],
  ['7. Chi phí tài chính', '22', null, 20000000, 15000000],
  ['   - Trong đó: Chi phí lãi vay', '23', null, 18000000, 14000000],
  ['8. Chi phí bán hàng', '25', null, 100000000, 90000000],
  ['9. Chi phí quản lý doanh nghiệp', '26', null, 135000000, 118000000],
  ['10. Lợi nhuận thuần từ hoạt động kinh doanh', '30', null, 100000000, 60000000],
  ['11. Thu nhập khác', '31', null, 10000000, 0],
  ['12. Chi phí khác', '32', null, 2000000, 0],
  ['13. Lợi nhuận khác (40 = 31 - 32)', '40', null, 8000000, 0],
  ['14. Tổng lợi nhuận kế toán trước thuế (50 = 30 + 40)', '50', null, 108000000, 60000000],
  ['15. Chi phí thuế TNDN hiện hành', '51', null, 21600000, 12000000],
  ['16. Chi phí thuế TNDN hoãn lại', '52', null, 0, 0],
  ['17. Lợi nhuận sau thuế thu nhập doanh nghiệp (60 = 50 - 51 - 52)', '60', null, 86400000, 48000000],
];

const TTTC_TT133_2025 = [
  ['CÔNG TY TNHH NHỎ THỬ NGHIỆM', null, null, 'Mẫu số B01a - DNN'],
  [null, null, null, '(Ban hành theo Thông tư số 133/2016/TT-BTC ngày 26/08/2016 của Bộ Tài chính)'],
  ['BÁO CÁO TÌNH HÌNH TÀI CHÍNH'],
  ['Tại ngày 31 tháng 12 năm 2025'],
  [null, null, null, 'Đơn vị tính: nghìn đồng'],
  ['CHỈ TIÊU', 'Mã số', 'Số cuối năm', 'Số đầu năm'],
  ['TÀI SẢN', null, null, null],
  ['I. Tiền và các khoản tương đương tiền', '110', '1.200.000', '900.000'],
  ['II. Đầu tư tài chính', '120', '-', '-'],
  ['III. Các khoản phải thu', '130', '300.000', '250.000'],
  ['IV. Hàng tồn kho', '140', '500.000', '450.000'],
  ['V. Tài sản cố định', '150', '800.000', '850.000'],
  ['   - Nguyên giá', '151', '1.000.000', '1.000.000'],
  ['   - Giá trị hao mòn lũy kế (*)', '152', '(200.000)', '(150.000)'],
  ['TỔNG CỘNG TÀI SẢN', '200', '2.800.000', '2.450.000'],
  ['NGUỒN VỐN', null, null, null],
  ['I. Nợ phải trả', '300', '800.000', '700.000'],
  ['II. Vốn chủ sở hữu', '400', '2.000.000', '1.750.000'],
  ['TỔNG CỘNG NGUỒN VỐN', '500', '2.800.000', '2.450.000'],
  ['Chỉ tiêu tự đặt lạ lùng', '999', '1', '1'],
];

const GTGT_2026 = [
  ['TỜ KHAI THUẾ GIÁ TRỊ GIA TĂNG (Mẫu số 01/GTGT)'],
  ['[01] Kỳ tính thuế: Quý 3 năm 2026'],
  ['STT', 'Chỉ tiêu', 'Mã chỉ tiêu', 'Giá trị HHDV (chưa có thuế GTGT)', 'Thuế GTGT'],
  ['A', 'Không phát sinh hoạt động mua, bán trong kỳ (đánh dấu "X")', '[21]', null, null],
  ['B', 'Thuế GTGT còn được khấu trừ kỳ trước chuyển sang', '[22]', null, '2.000.000'],
  ['1', 'Hàng hoá, dịch vụ mua vào trong kỳ', '[23]', '100.000.000', '10.000.000'],
  ['2', 'Tổng số thuế GTGT được khấu trừ kỳ này', '[25]', null, '12.000.000'],
  ['1', 'Hàng hóa, dịch vụ bán ra chịu thuế suất 10%', '[32]', '300.000.000', '30.000.000'],
  ['2', 'Thuế GTGT phát sinh trong kỳ', '[35]', null, '30.000.000'],
  ['3', 'Thuế GTGT còn phải nộp trong kỳ', '[40]', null, '18.000.000'],
];

describe('đọc số', () => {
  it('kiểu Việt Nam, âm trong ngoặc, gạch ngang là trống', () => {
    expect(docSo('1.234.567')).toBe(1234567);
    expect(docSo('(200.000)')).toBe(-200000);
    expect(docSo('-')).toBeNull();
    expect(docSo('12,5')).toBe(12.5);
    expect(docSo('1,234,567.5')).toBe(1234567.5);
    expect(docSo('VI.25')).toBeNull();
    expect(docSo(951983000)).toBe(951983000);
  });
});

describe('nhận dạng', () => {
  it('năm kỳ không lẫn năm ban hành thông tư / ngày ký', () => {
    const n = nhanDang('BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH\n(Ban hành theo Thông tư số 200/2014/TT-BTC ngày 22/12/2014)\nNăm 2026');
    expect(n).toMatchObject({ loai: 'ket_qua_kinh_doanh', che_do: 'tt200_2014', nam: 2026 });
  });
});

describe('đọc và phân loại báo cáo tải lên', () => {
  it('KQKD theo Thông tư 200 năm 2026: nhận dạng, xếp hết mọi dòng có số, đẳng thức đạt, CẢNH BÁO mẫu đã bị Thông tư 99/2025 thay', () => {
    const [s] = docBaoCao([{ ten: 'B02', bang: KQKD_TT200_2026 }]);
    expect(s.nhan_dang).toMatchObject({ loai: 'ket_qua_kinh_doanh', che_do: 'tt200_2014', nam: 2026 });
    expect(s.don_vi).toEqual({ nhan: 'đồng', he_so: 1 });
    expect(s.so_dong_da_xep).toBe(s.so_dong_co_so);
    const nhom = Object.fromEntries(s.dong.map((d) => [d.ma, d.nhom?.khoa]));
    expect(nhom).toMatchObject({ '01': 'doanh_thu_ban_hang', '02': 'giam_tru_doanh_thu', '10': 'doanh_thu_thuan', '11': 'gia_von', '20': 'loi_nhuan_gop', '21': 'doanh_thu_tai_chinh', '22': 'chi_phi_tai_chinh', '23': 'chi_phi_lai_vay', '25': 'chi_phi_ban_hang', '26': 'chi_phi_quan_ly', '30': 'loi_nhuan_thuan', '50': 'loi_nhuan_truoc_thue', '51': 'thue_tndn_hien_hanh', '60': 'loi_nhuan_sau_thue' });
    expect(s.dong.find((d) => d.ma === '23')?.la_chi_tiet).toBe(true);
    expect(s.kiem_tra.length).toBeGreaterThanOrEqual(8);
    expect(s.kiem_tra.every((k) => k.dat)).toBe(true);
    expect(s.nhan_dang.canh_bao_mau?.can_cu.van_ban).toBe('99/2025/TT-BTC');
    expect(s.nhan_dang.canh_bao_mau?.can_cu.trich).toContain('Thông tư này thay thế cho các Thông tư số 200/2014/TT-BTC');
  });

  it('số sai → đẳng thức báo lệch đúng chỗ, đúng số tiền', () => {
    const sai = KQKD_TT200_2026.map((h) => (h[1] === '20' ? [h[0], h[1], h[2], 360000000, h[4]] : h));
    const [s] = docBaoCao([{ ten: 'B02', bang: sai }]);
    const k = s.kiem_tra.find((x) => x.ten === 'Lợi nhuận gộp' && x.cot === 0)!;
    expect(k.dat).toBe(false);
    expect(k.lech).toBe(10000000);
  });

  it('Báo cáo tình hình tài chính (TT133, nghìn đồng, số dạng chuỗi): tổng tài sản = tổng nguồn vốn; dòng lạ để chưa phân loại', () => {
    const [s] = docBaoCao([{ ten: 'B01a', bang: TTTC_TT133_2025 }]);
    expect(s.nhan_dang).toMatchObject({ loai: 'can_doi_ke_toan', che_do: 'tt133_2016', nam: 2025, canh_bao_mau: null });
    expect(s.don_vi).toEqual({ nhan: 'nghìn đồng', he_so: 1000 });
    const theo = (ma: string) => s.dong.find((d) => d.ma === ma);
    expect(theo('110')?.nhom?.khoa).toBe('tien');
    expect(theo('140')?.nhom?.khoa).toBe('hang_ton_kho');
    expect(theo('152')?.gia_tri[0]).toBe(-200000);
    expect(theo('200')?.nhom?.khoa).toBe('tong_tai_san');
    expect(theo('999')?.nhom).toBeNull();
    expect(theo('999')?.ly_do).toMatch(/không đoán/);
    expect(s.so_dong_da_xep).toBe(s.so_dong_co_so - 1);
    const can = s.kiem_tra.filter((k) => k.ten === 'Tổng tài sản = Tổng nguồn vốn');
    expect(can).toHaveLength(2);
    expect(can.every((k) => k.dat)).toBe(true);
  });

  it('Tờ khai GTGT: nhận dạng, mã trong ngoặc vuông, hai cột (giá trị, thuế), xếp đúng nhóm', () => {
    const [s] = docBaoCao([{ ten: 'Sheet1', bang: GTGT_2026 }]);
    expect(s.nhan_dang).toMatchObject({ loai: 'to_khai_gtgt', nam: 2026 });
    const theo = (ma: string) => s.dong.find((d) => d.ma === ma);
    expect(theo('22')?.nhom?.khoa).toBe('thue_khau_tru_ky_truoc');
    expect(theo('23')?.nhom?.khoa).toBe('mua_vao');
    expect(theo('25')?.nhom?.khoa).toBe('thue_dau_vao_duoc_khau_tru');
    expect(theo('32')?.nhom?.khoa).toBe('ban_ra_10');
    expect(theo('35')?.nhom?.khoa).toBe('thue_phat_sinh');
    expect(theo('40')?.nhom?.khoa).toBe('thue_phai_nop');
    expect(theo('40')?.gia_tri).toEqual([null, 18000000]);
    expect(theo('21')?.nhom?.khoa).toBe('khong_phat_sinh');
  });
});
