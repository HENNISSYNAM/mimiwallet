import { describe, it, expect } from 'vitest';
import { kyKeKhaiKeTiep, mucKhan } from './hanKeKhai';

const luc = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);
const nhin = (k: ReturnType<typeof kyKeKhaiKeTiep>) =>
  `Q${k.quy}/${k.nam} hạn ${k.han.getDate()}/${k.han.getMonth() + 1}/${k.han.getFullYear()}`;

describe('hạn nộp từng quý — ngày cuối tháng liền sau quý', () => {
  it('quý I hết hạn 30/04', () => {
    expect(nhin(kyKeKhaiKeTiep(luc(2026, 4, 1)))).toBe('Q1/2026 hạn 30/4/2026');
  });

  it('quý II hết hạn 31/07', () => {
    expect(nhin(kyKeKhaiKeTiep(luc(2026, 7, 1)))).toBe('Q2/2026 hạn 31/7/2026');
  });

  it('quý III hết hạn 31/10', () => {
    expect(nhin(kyKeKhaiKeTiep(luc(2026, 10, 1)))).toBe('Q3/2026 hạn 31/10/2026');
  });

  it('quý IV hết hạn 31/01 NĂM SAU — chỗ dễ sai nhất', () => {
    // Lệch năm ở đây thì người dùng tin mình còn 11 tháng trong khi còn 1.
    expect(nhin(kyKeKhaiKeTiep(luc(2027, 1, 5)))).toBe('Q4/2026 hạn 31/1/2027');
  });
});

describe('trượt sang kỳ kế tiếp khi hạn đã trôi qua', () => {
  it('sau 30/04 thì chuyển sang quý II, không giữ hạn đã trễ', () => {
    // Việc cần làm khi đó là chuẩn bị kỳ tới, không phải nhìn một số âm.
    expect(nhin(kyKeKhaiKeTiep(luc(2026, 5, 2)))).toBe('Q2/2026 hạn 31/7/2026');
  });

  it('đầu tháng 9 thì kỳ kế tiếp là quý III', () => {
    const k = kyKeKhaiKeTiep(luc(2026, 9, 6));
    expect(nhin(k)).toBe('Q3/2026 hạn 31/10/2026');
    expect(k.daTre).toBe(false);
    expect(k.conLai).toBeGreaterThan(50);
  });

  it('không bao giờ trả về kỳ đã quá hạn', () => {
    for (const m of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const k = kyKeKhaiKeTiep(luc(2026, m, 15));
      expect(k.han.getTime()).toBeGreaterThanOrEqual(luc(2026, m, 15).getTime());
    }
  });
});

describe('số ngày còn lại và câu nhắc', () => {
  it('đúng ngày hạn thì còn 0 ngày, không âm', () => {
    const k = kyKeKhaiKeTiep(luc(2026, 10, 31));
    expect(k.conLai).toBe(0);
    expect(k.cau).toContain('Hôm nay là hạn');
  });

  it('sát hạn thì câu nhắc đổi giọng', () => {
    expect(kyKeKhaiKeTiep(luc(2026, 10, 30)).cau).toContain('Còn 1 ngày');
    expect(kyKeKhaiKeTiep(luc(2026, 10, 25)).cau).toContain('Còn 6 ngày');
    expect(kyKeKhaiKeTiep(luc(2026, 9, 6)).cau).toContain('còn 55 ngày');
  });
});

describe('mức khẩn — ngưỡng đặt một chỗ, không rải mỗi nơi một kiểu', () => {
  it('bảy ngày trở xuống là gấp', () => {
    expect(mucKhan(0)).toBe('gap');
    expect(mucKhan(7)).toBe('gap');
    expect(mucKhan(8)).toBe('sap_toi');
  });

  it('trong tháng là sắp tới, xa hơn là còn xa', () => {
    expect(mucKhan(30)).toBe('sap_toi');
    expect(mucKhan(31)).toBe('con_xa');
  });
});
