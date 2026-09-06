import { describe, it, expect } from 'vitest';
import { soSanhThue, NGUONG_MIEN, TRAN_NHOM_CHON } from './soSanhThue';

const v = (doanhThu: number, chiPhiCoChungTu: number, tyLeNganh = 0.015) =>
  soSanhThue({ doanhThu, chiPhiCoChungTu, tyLeNganh });

describe('ngoài phạm vi được chọn', () => {
  it('dưới 500 triệu thì chưa phải nộp', () => {
    const r = v(400_000_000, 0);
    expect(r.ketLuan).toBe('ngoai_pham_vi');
    expect(r.theoLoiNhuan).toBeNull();
    expect(r.cau).toContain('chưa phải nộp');
  });

  it('trên 3 tỷ thì không còn được chọn', () => {
    const r = v(3_500_000_000, 1_000_000_000);
    expect(r.ketLuan).toBe('ngoai_pham_vi');
    expect(r.cau).toContain('không còn được chọn');
  });

  it('đúng bằng ngưỡng và đúng bằng trần thì VẪN trong phạm vi', () => {
    // Chặn là "dưới ngưỡng" và "trên trần", không phải "chạm".
    expect(v(NGUONG_MIEN, 0).ketLuan).not.toBe('ngoai_pham_vi');
    expect(v(TRAN_NHOM_CHON, 0).ketLuan).not.toBe('ngoai_pham_vi');
  });
});

describe('so hai cách', () => {
  it('chứng từ nhiều thì tính theo lợi nhuận rẻ hơn', () => {
    // 1 tỷ doanh thu, 900tr chi phí → lãi 100tr → 15tr thuế.
    // Theo doanh thu: 1 tỷ × 1,5% = 15tr. Chi phí 950tr thì lãi 50tr → 7,5tr.
    const r = v(1_000_000_000, 950_000_000);
    expect(r.ketLuan).toBe('loi_nhuan_re_hon');
    expect(r.theoLoiNhuan).toBe(7_500_000);
    expect(r.theoDoanhThu).toBe(15_000_000);
    expect(r.chenhLech).toBe(7_500_000);
    expect(r.chungTuConThieu).toBeNull();
  });

  it('ít chứng từ thì tính theo doanh thu rẻ hơn', () => {
    const r = v(1_000_000_000, 200_000_000);
    expect(r.ketLuan).toBe('doanh_thu_re_hon');
    expect(r.theoLoiNhuan).toBe(120_000_000);
    expect(r.theoDoanhThu).toBe(15_000_000);
  });

  it('lỗ thì phần lãi bằng 0, không trả thuế âm', () => {
    const r = v(1_000_000_000, 1_400_000_000);
    expect(r.theoLoiNhuan).toBe(0);
    expect(r.ketLuan).toBe('loi_nhuan_re_hon');
  });
});

describe('còn thiếu bao nhiêu chứng từ — con số đáng giá nhất', () => {
  it('tính đúng mức hoà vốn', () => {
    // Hoà khi 0.15 × (1 tỷ − chiPhi) = 1,5% × 1 tỷ = 15tr
    //   → 1 tỷ − chiPhi = 100tr → chiPhi = 900tr.
    // Đang có 200tr, nên còn thiếu 700tr.
    const r = v(1_000_000_000, 200_000_000);
    expect(r.chungTuConThieu).toBe(700_000_000);
  });

  it('gom đủ đúng mức đó thì hai cách hoà nhau', () => {
    const r = v(1_000_000_000, 900_000_000);
    expect(r.ketLuan).toBe('bang_nhau');
    expect(r.chenhLech).toBe(0);
  });

  it('không bao giờ trả số âm', () => {
    for (const cp of [0, 500_000_000, 2_000_000_000]) {
      const r = v(1_000_000_000, cp);
      if (r.chungTuConThieu !== null) expect(r.chungTuConThieu).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('tỷ lệ ngành là bắt buộc, không đoán hộ', () => {
  it('đổi tỷ lệ ngành thì kết luận đổi theo', () => {
    // Cùng một hộ, ngành 0,5% và ngành 2% ra hai lời khuyên ngược nhau.
    const thap = v(1_000_000_000, 880_000_000, 0.005);
    const cao = v(1_000_000_000, 880_000_000, 0.02);
    expect(thap.ketLuan).toBe('doanh_thu_re_hon');
    expect(cao.ketLuan).toBe('loi_nhuan_re_hon');
  });
});
