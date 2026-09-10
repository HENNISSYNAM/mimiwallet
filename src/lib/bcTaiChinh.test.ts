import { describe, expect, it } from 'vitest';
import { phanBoChiPhi, theoThang, tuoiHoaDon, type GiaoDich, type HoaDon } from './bcTaiChinh';

const gd = (amount: number, type: string, ngay: string, cat: string | null = null): GiaoDich => ({
  amount,
  type,
  transaction_date: ngay,
  category: cat,
});

const hd = (total: number, status: string, due: string | null): HoaDon => ({
  total,
  amount: null,
  status,
  due_date: due,
});

describe('theoThang', () => {
  it('gộp thu chi theo tháng và tính lợi nhuận', () => {
    const r = theoThang([
      gd(10_000_000, 'income', '2026-08-05'),
      gd(-3_000_000, 'expense', '2026-08-20'),
      gd(5_000_000, 'income', '2026-09-01'),
    ]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ thang: 'T08', doanhThu: 10_000_000, chiPhi: 3_000_000, loiNhuan: 7_000_000 });
    expect(r[1].loiNhuan).toBe(5_000_000);
  });

  it('sắp theo thời gian, không theo thứ tự đầu vào', () => {
    const r = theoThang([gd(1, 'income', '2026-12-01'), gd(1, 'income', '2026-03-01')]);
    expect(r.map((x) => x.khoa)).toEqual(['2026-03', '2026-12']);
  });

  /*
   * Đắp thêm tháng rỗng cho biểu đồ liền mạch là vẽ ra những tháng doanh thu
   * bằng 0 chưa từng xảy ra. Mảng rỗng để giao diện nói "chưa có dữ liệu".
   */
  it('không có giao dịch thì trả mảng rỗng, không trả tháng toàn số 0', () => {
    expect(theoThang([])).toEqual([]);
  });

  it('bỏ dòng có ngày hỏng thay vì gộp vào một nhóm lạ', () => {
    expect(theoThang([gd(1, 'income', ''), gd(1, 'income', 'hôm qua')])).toEqual([]);
  });

  it('nhận cả dấu âm lẫn nhãn type để xác định chiều tiền', () => {
    // SePay ghi type; nguồn khác có thể chỉ có dấu.
    const r = theoThang([gd(-500, '', '2026-08-01'), gd(700, '', '2026-08-01')]);
    expect(r[0]).toMatchObject({ doanhThu: 700, chiPhi: 500 });
  });
});

describe('tuoiHoaDon', () => {
  const luc = new Date(2026, 8, 10); // 10/09/2026

  it('xếp đúng nhóm theo số ngày quá hạn', () => {
    const r = tuoiHoaDon(
      [
        hd(1_000_000, 'pending', '2026-09-05'), // quá 5 ngày
        hd(2_000_000, 'pending', '2026-08-01'), // quá 40 ngày
        hd(3_000_000, 'overdue', '2026-06-20'), // quá 82 ngày
        hd(4_000_000, 'overdue', '2026-01-01'), // quá 250 ngày
      ],
      luc,
    );
    expect(r.map((x) => x.tien)).toEqual([1_000_000, 2_000_000, 3_000_000, 4_000_000]);
    expect(r.every((x) => x.soHoaDon === 1)).toBe(true);
  });

  /*
   * Hoá đơn đã thu không còn là khoản phải đòi. Gộp vào sẽ thổi phồng số tiền
   * đang bị nợ — đúng con số người dùng dùng để quyết định có đi đòi hay không.
   */
  it('bỏ hoá đơn đã thu', () => {
    expect(tuoiHoaDon([hd(9_000_000, 'paid', '2026-01-01')], luc)).toEqual([]);
  });

  it('bỏ hoá đơn không có hạn thanh toán, không dồn vào nhóm gần nhất', () => {
    expect(tuoiHoaDon([hd(9_000_000, 'pending', null)], luc)).toEqual([]);
  });

  it('hoá đơn chưa tới hạn vẫn nằm nhóm đầu, không ra số âm', () => {
    const r = tuoiHoaDon([hd(1_000_000, 'pending', '2026-12-31')], luc);
    expect(r[0].tien).toBe(1_000_000);
  });

  it('không có hoá đơn nào thì trả mảng rỗng', () => {
    expect(tuoiHoaDon([], luc)).toEqual([]);
  });
});

describe('phanBoChiPhi', () => {
  it('gộp theo nhóm và sắp giảm dần', () => {
    const r = phanBoChiPhi([
      gd(-1_000_000, 'expense', '2026-08-01', 'Nguyên vật liệu'),
      gd(-3_000_000, 'expense', '2026-08-02', 'Thuê mặt bằng'),
      gd(-500_000, 'expense', '2026-08-03', 'Nguyên vật liệu'),
    ]);
    expect(r).toEqual([
      { ten: 'Thuê mặt bằng', tien: 3_000_000 },
      { ten: 'Nguyên vật liệu', tien: 1_500_000 },
    ]);
  });

  /*
   * Bỏ giao dịch chưa phân loại thì tổng biểu đồ nhỏ hơn tổng chi phí thật, và
   * không ai biết vì sao thiếu.
   */
  it('gom giao dịch chưa phân loại thay vì bỏ đi', () => {
    const r = phanBoChiPhi([gd(-2_000_000, 'expense', '2026-08-01', null)]);
    expect(r).toEqual([{ ten: 'Chưa phân loại', tien: 2_000_000 }]);
  });

  it('bỏ tiền vào', () => {
    expect(phanBoChiPhi([gd(5_000_000, 'income', '2026-08-01', 'Bán hàng')])).toEqual([]);
  });
});
