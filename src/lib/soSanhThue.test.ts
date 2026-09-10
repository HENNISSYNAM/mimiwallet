import { describe, it, expect } from 'vitest';
import { soSanhThue, NGUONG_MIEN, TRAN_NHOM_CHON } from './soSanhThue';

const v = (doanhThu: number, chiPhiCoChungTu: number, tyLeNganh = 0.015) =>
  soSanhThue({ doanhThu, chiPhiCoChungTu, tyLeNganh });

describe('ngưỡng theo Nghị định 141/2026/NĐ-CP', () => {
  it('ngưỡng miễn là 01 tỷ, không còn là 500 triệu', () => {
    // Khoá con số: nó đã sai một lần vì luật đổi mà mã không đổi theo.
    expect(NGUONG_MIEN).toBe(1_000_000_000);
    expect(TRAN_NHOM_CHON).toBe(3_000_000_000);
  });

  it('hộ 800 triệu chưa phải nộp — chính nhóm bị báo sai suốt bốn tháng', () => {
    const r = v(800_000_000, 0);
    expect(r.ketLuan).toBe('ngoai_pham_vi');
    expect(r.theoLoiNhuan).toBeNull();
    expect(r.cau).toContain('chưa phải nộp');
  });

  it('đúng bằng 01 tỷ vẫn chưa phải nộp — "từ 01 tỷ đồng trở xuống"', () => {
    expect(v(NGUONG_MIEN, 0).ketLuan).toBe('ngoai_pham_vi');
  });

  it('đúng bằng 3 tỷ vẫn được chọn — "đến 3 tỷ"', () => {
    expect(v(TRAN_NHOM_CHON, 0).ketLuan).not.toBe('ngoai_pham_vi');
  });

  it('trên 3 tỷ thì không còn được chọn', () => {
    const r = v(3_500_000_000, 1_000_000_000);
    expect(r.ketLuan).toBe('ngoai_pham_vi');
    expect(r.cau).toContain('không còn được chọn');
  });
});

describe('tính theo tỷ lệ chỉ trên phần vượt ngưỡng', () => {
  it('hộ 1,2 tỷ ngành 1% nộp 2 triệu, không phải 12 triệu', () => {
    // (1,2 tỷ − 01 tỷ) × 1% = 2 triệu. Hàm cũ nhân trên toàn bộ doanh thu.
    const r = v(1_200_000_000, 0, 0.01);
    expect(r.theoDoanhThu).toBeCloseTo(2_000_000, 0);
  });
});

describe('so hai cách', () => {
  it('chứng từ nhiều thì tính theo thu nhập rẻ hơn', () => {
    // 2 tỷ doanh thu, chi phí 1,95 tỷ → lãi 50tr → 7,5tr.
    // Theo tỷ lệ: (2 tỷ − 1 tỷ) × 1,5% = 15tr.
    const r = v(2_000_000_000, 1_950_000_000);
    expect(r.ketLuan).toBe('loi_nhuan_re_hon');
    expect(r.theoLoiNhuan).toBe(7_500_000);
    expect(r.theoDoanhThu).toBe(15_000_000);
    expect(r.chenhLech).toBe(7_500_000);
    expect(r.chungTuConThieu).toBeNull();
  });

  it('ít chứng từ thì tính theo tỷ lệ rẻ hơn', () => {
    const r = v(2_000_000_000, 200_000_000);
    expect(r.ketLuan).toBe('doanh_thu_re_hon');
    expect(r.theoLoiNhuan).toBe(270_000_000);
    expect(r.theoDoanhThu).toBe(15_000_000);
  });

  it('lỗ thì phần lãi bằng 0, không trả thuế âm', () => {
    const r = v(2_000_000_000, 2_400_000_000);
    expect(r.theoLoiNhuan).toBe(0);
    expect(r.ketLuan).toBe('loi_nhuan_re_hon');
  });
});

describe('còn thiếu bao nhiêu chứng từ — con số đáng giá nhất', () => {
  it('tính đúng mức hoà vốn', () => {
    // Hoà khi 0.15 × (2 tỷ − chiPhi) = 15tr → 2 tỷ − chiPhi = 100tr → chiPhi = 1,9 tỷ.
    // Đang có 200tr, nên còn thiếu 1,7 tỷ.
    const r = v(2_000_000_000, 200_000_000);
    expect(r.chungTuConThieu).toBeCloseTo(1_700_000_000, 0);
  });

  it('gom đủ đúng mức đó thì hai cách hoà nhau', () => {
    const r = v(2_000_000_000, 1_900_000_000);
    expect(r.ketLuan).toBe('bang_nhau');
    expect(r.chenhLech).toBe(0);
  });

  it('không bao giờ trả số âm', () => {
    for (const cp of [0, 500_000_000, 2_500_000_000]) {
      const r = v(2_000_000_000, cp);
      if (r.chungTuConThieu !== null) expect(r.chungTuConThieu).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('tỷ lệ ngành là bắt buộc, không đoán hộ', () => {
  it('đổi tỷ lệ ngành thì kết luận đổi theo', () => {
    // Lãi 120tr → 18tr. Ngành 0,5%: 5tr; ngành 2%: 20tr. Hai lời khuyên ngược nhau.
    const thap = v(2_000_000_000, 1_880_000_000, 0.005);
    const cao = v(2_000_000_000, 1_880_000_000, 0.02);
    expect(thap.ketLuan).toBe('doanh_thu_re_hon');
    expect(cao.ketLuan).toBe('loi_nhuan_re_hon');
  });
});
