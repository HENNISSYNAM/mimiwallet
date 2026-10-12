import { describe, expect, it } from 'vitest';
import {
  docBangLuong, lamTronPhanTram, SO_NGUOI_TOI_DA, thueLuyTienThang, thueThangCuTru, tinhNguoi, type NguoiLaoDong,
} from './khau-tru';

/** Mọi con số dưới đây là đầu vào của test, tính tay theo biểu 5 bậc. */
describe('biểu lũy tiến tháng — tiền số nguyên, làm tròn nửa đồng lên', () => {
  it.each([
    [0, 0],
    [10_000_000, 500_000],
    [30_000_000, 2_500_000],
    [60_000_000, 8_500_000],
    [100_000_000, 20_500_000],
    [150_000_000, 38_000_000],
  ])('thu nhập tính thuế %i → thuế %i (đúng mốc bậc)', (tn, thue) => {
    expect(thueLuyTienThang(tn)).toBe(thue);
  });

  it('một đồng vượt mốc chỉ chịu thuế suất bậc trên cho đúng một đồng đó', () => {
    // 10.000.000 × 5% + 1 × 10% = 500.000,1 → 500.000
    expect(thueLuyTienThang(10_000_001)).toBe(500_000);
    // 30.000.000 → 2.500.000; thêm 10 đồng × 20% = 2 đồng
    expect(thueLuyTienThang(30_000_010)).toBe(2_500_002);
  });

  it('làm tròn: 0,5 đồng lên 1; 0,45 đồng về 0', () => {
    expect(thueLuyTienThang(10)).toBe(1); // 0,5
    expect(thueLuyTienThang(9)).toBe(0); // 0,45
    expect(thueLuyTienThang(11)).toBe(1); // 0,55
    expect(lamTronPhanTram(149)).toBe(1);
    expect(lamTronPhanTram(150)).toBe(2);
  });

  it('không nhận số âm hay số lẻ đồng', () => {
    expect(() => thueLuyTienThang(-1)).toThrow();
    expect(() => thueLuyTienThang(1.5)).toThrow();
  });
});

describe('một tháng của người cư trú có HĐLĐ', () => {
  it('trừ bảo hiểm và giảm trừ gia cảnh rồi mới lũy tiến', () => {
    // 30.000.000 − 3.150.000 − 15.500.000 − 6.200.000 = 5.150.000 → 5% = 257.500
    const r = thueThangCuTru({ thu_nhap_chiu_thue: 30_000_000, bao_hiem_bat_buoc: 3_150_000 }, 1);
    expect(r.giam_tru_gia_canh).toBe(21_700_000);
    expect(r.thu_nhap_tinh_thue).toBe(5_150_000);
    expect(r.thue).toBe(257_500);
  });

  it('thu nhập đúng bằng giảm trừ, hay thấp hơn: thu nhập tính thuế 0, thuế 0 — không âm', () => {
    expect(thueThangCuTru({ thu_nhap_chiu_thue: 15_500_000, bao_hiem_bat_buoc: 0 }, 0).thue).toBe(0);
    const thap = thueThangCuTru({ thu_nhap_chiu_thue: 8_000_000, bao_hiem_bat_buoc: 840_000 }, 2);
    expect(thap.thu_nhap_tinh_thue).toBe(0);
    expect(thap.thue).toBe(0);
    // Vượt giảm trừ 1 đồng: 5% × 1 = 0,05 đồng → 0
    expect(thueThangCuTru({ thu_nhap_chiu_thue: 15_500_001, bao_hiem_bat_buoc: 0 }, 0).thue).toBe(0);
  });

  it('thu nhập cao chạm bậc 35%', () => {
    // 200.000.000 − 5.000.000 − 15.500.000 − 2 × 6.200.000 = 167.100.000
    // 20.500.000 + 67.100.000 × 35% = 43.985.000
    const r = thueThangCuTru({ thu_nhap_chiu_thue: 200_000_000, bao_hiem_bat_buoc: 5_000_000 }, 2);
    expect(r.thu_nhap_tinh_thue).toBe(167_100_000);
    expect(r.thue).toBe(43_985_000);
  });
});

describe('tinhNguoi — ai MIMI tính, ai người dùng nhập', () => {
  const thang = (tn: number, bh = 0) => ({ thu_nhap_chiu_thue: tn, bao_hiem_bat_buoc: bh });

  it('cư trú có HĐLĐ: cộng thuế 3 tháng, mỗi tháng tính riêng (không gộp quý rồi chia)', () => {
    const n: NguoiLaoDong = { ho_ten: 'A', loai: 'cu_tru_hdld', so_nguoi_phu_thuoc: 0, thang: [thang(25_500_000), thang(15_000_000), thang(35_500_000)], thue_da_khau_tru_quy: null };
    const r = tinhNguoi(n, 1);
    // tháng 1: 10.000.000 → 500.000; tháng 2: 0; tháng 3: 20.000.000 → 1.500.000
    expect(r.thang?.map((t) => t.thue)).toEqual([500_000, 0, 1_500_000]);
    expect(r.thue_quy).toBe(2_000_000);
    expect(r.thu_nhap_tinh_thue_quy).toBe(30_000_000);
    expect(r.mimi_tinh).toBe(true);
  });

  it('không cư trú / cư trú khác: lấy số người dùng nhập, không tự tính', () => {
    const n: NguoiLaoDong = { ho_ten: 'B', loai: 'khong_cu_tru', so_nguoi_phu_thuoc: 0, thang: [thang(50_000_000), thang(0), thang(0)], thue_da_khau_tru_quy: 10_000_000 };
    const r = tinhNguoi(n, 2);
    expect(r.mimi_tinh).toBe(false);
    expect(r.thue_quy).toBe(10_000_000);
    expect(r.thu_nhap_tinh_thue_quy).toBeNull();
  });
});

describe('docBangLuong — máy chủ không tin trình duyệt', () => {
  const dong = (p: Record<string, unknown> = {}) => ({
    ho_ten: '  Nguyễn   Văn A ', loai: 'cu_tru_hdld', so_nguoi_phu_thuoc: 1,
    thang: [{ thu_nhap_chiu_thue: 20_000_000, bao_hiem_bat_buoc: 2_100_000 }, { thu_nhap_chiu_thue: '20.000.000', bao_hiem_bat_buoc: '2100000' }, {}],
    ...p,
  });

  it('chuẩn hoá họ tên, nhận số có dấu chấm nghìn, ô trống là 0', () => {
    const r = docBangLuong([dong()]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ds[0].ho_ten).toBe('Nguyễn Văn A');
    expect(r.ds[0].thang[1]).toEqual({ thu_nhap_chiu_thue: 20_000_000, bao_hiem_bat_buoc: 2_100_000 });
    expect(r.ds[0].thang[2]).toEqual({ thu_nhap_chiu_thue: 0, bao_hiem_bat_buoc: 0 });
  });

  it('từ chối số lẻ đồng và dấu phẩy thập phân — không đoán', () => {
    for (const x of ['1,5', '1.5', '20.000.00', 1.5, -1, 'abc']) {
      const r = docBangLuong([dong({ thang: [{ thu_nhap_chiu_thue: x }, {}, {}] })]);
      expect(r.ok, String(x)).toBe(false);
    }
  });

  it('câu lỗi chỉ nói số dòng, không nhắc họ tên', () => {
    const r = docBangLuong([dong(), dong({ loai: 'khong_cu_tru' })]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.cau).toContain('Dòng 2');
    expect(r.cau).not.toContain('Nguyễn');
  });

  it('người MIMI không tự tính phải có số thuế đã khấu trừ (0 cũng được)', () => {
    expect(docBangLuong([dong({ loai: 'cu_tru_khac' })]).ok).toBe(false);
    expect(docBangLuong([dong({ loai: 'cu_tru_khac', thue_da_khau_tru_quy: 0 })]).ok).toBe(true);
    expect(docBangLuong([dong({ loai: 'cu_tru_khac', thue_da_khau_tru_quy: 999_000_000 })]).ok).toBe(false);
  });

  it('bảo hiểm lớn hơn thu nhập, số người phụ thuộc sai, loại lạ, thiếu tháng → từ chối', () => {
    expect(docBangLuong([dong({ thang: [{ thu_nhap_chiu_thue: 1, bao_hiem_bat_buoc: 2 }, {}, {}] })]).ok).toBe(false);
    expect(docBangLuong([dong({ so_nguoi_phu_thuoc: 1.5 })]).ok).toBe(false);
    expect(docBangLuong([dong({ so_nguoi_phu_thuoc: 21 })]).ok).toBe(false);
    expect(docBangLuong([dong({ loai: 'vang_lai' })]).ok).toBe(false);
    expect(docBangLuong([dong({ thang: [{}, {}] })]).ok).toBe(false);
    expect(docBangLuong([dong({ ho_ten: '   ' })]).ok).toBe(false);
  });

  it('bảng rỗng, quá số người tối đa → từ chối', () => {
    expect(docBangLuong([]).ok).toBe(false);
    expect(docBangLuong('x').ok).toBe(false);
    expect(docBangLuong(Array.from({ length: SO_NGUOI_TOI_DA + 1 }, () => dong())).ok).toBe(false);
  });

  it('người phụ thuộc chỉ tính cho người cư trú có HĐLĐ', () => {
    const r = docBangLuong([dong({ loai: 'khong_cu_tru', so_nguoi_phu_thuoc: 3, thue_da_khau_tru_quy: 0 })]);
    expect(r.ok && r.ds[0].so_nguoi_phu_thuoc).toBe(0);
  });
});
