import { describe, it, expect } from 'vitest';
import { cauKetQuaDongBo } from './ketQuaDongBo';

describe('cauKetQuaDongBo — ba tình huống, ba câu khác nhau', () => {
  it('có giao dịch mới thì nói số lượng', () => {
    expect(cauKetQuaDongBo([{ fetched: 5, inserted: 3, skipped: 0 }]).cau)
      .toBe('Đã nhận 3 giao dịch mới');
  });

  it('ngân hàng không trả gì — khác hẳn với trả rồi bị lọc', () => {
    const ra = cauKetQuaDongBo([{ fetched: 0, inserted: 0, skipped: 0 }]);
    expect(ra.cau).toContain('không trả về giao dịch nào');
    expect(ra.dangChuY).toBe(true);
  });

  it('trả về nhưng bỏ hết vì khác tài khoản — đây là con số quan trọng nhất', () => {
    // Chính tình huống 04/09: tiền đã vào tài khoản MB thật, nhưng sandbox trả
    // về giao dịch của tài khoản khác nên bị lọc sạch. Câu cũ gộp ca này với
    // ca "ngân hàng không trả gì", làm mất manh mối duy nhất.
    const ra = cauKetQuaDongBo([{ fetched: 7, inserted: 0, skipped: 7 }]);
    expect(ra.cau).toContain('7 giao dịch');
    expect(ra.cau).toContain('bỏ qua 7');
    expect(ra.cau).toContain('không thuộc tài khoản');
    expect(ra.dangChuY).toBe(true);
  });

  it('trả về và tất cả đã có sẵn thì không phải chuyện đáng lo', () => {
    const ra = cauKetQuaDongBo([{ fetched: 4, inserted: 0, skipped: 0 }]);
    expect(ra.cau).toContain('đã có sẵn');
    expect(ra.dangChuY).toBe(false);
  });

  it('cộng dồn nhiều liên kết', () => {
    const ra = cauKetQuaDongBo([
      { fetched: 2, inserted: 1, skipped: 0 },
      { fetched: 3, inserted: 2, skipped: 1 },
    ]);
    expect(ra.cau).toBe('Đã nhận 3 giao dịch mới');
  });

  it('thiếu trường thì coi như 0, không vỡ', () => {
    expect(cauKetQuaDongBo([{}]).cau).toContain('không trả về giao dịch nào');
    expect(cauKetQuaDongBo([]).cau).toContain('không trả về giao dịch nào');
  });

  it('có giao dịch mới thì KHÔNG đánh dấu đáng chú ý, dù có bỏ qua vài dòng', () => {
    expect(cauKetQuaDongBo([{ fetched: 9, inserted: 2, skipped: 7 }]).dangChuY).toBe(false);
  });
});

describe('ca khác tài khoản — điểm mù trước 04/09', () => {
  it('nói rõ là khác tài khoản, không gộp vào "không có giao dịch mới"', () => {
    // Bộ lọc trong bankhub-map so khớp chuỗi tuyệt đối. Lệch một ký tự là mất
    // sạch sao kê, và trước hôm nay con số đó không được trả ra.
    const ra = cauKetQuaDongBo([{ fetched: 12, inserted: 0, skipped: 0, khacTaiKhoan: 12 }]);
    expect(ra.cau).toContain('12 thuộc tài khoản khác');
    expect(ra.cau).toContain('định dạng');
    expect(ra.dangChuY).toBe(true);
  });

  it('khác tài khoản được ưu tiên nói trước lỗi đọc', () => {
    const ra = cauKetQuaDongBo([{ fetched: 9, inserted: 0, skipped: 2, khacTaiKhoan: 7 }]);
    expect(ra.cau).toContain('tài khoản khác');
  });

  it('có dòng ghi được thì vẫn báo thành công', () => {
    expect(cauKetQuaDongBo([{ fetched: 9, inserted: 3, khacTaiKhoan: 6 }]).dangChuY).toBe(false);
  });
});
