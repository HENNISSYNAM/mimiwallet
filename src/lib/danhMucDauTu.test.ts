import { describe, expect, it } from 'vitest';
import { tinhDanhMuc, type KhoanNam } from './danhMucDauTu';

const k = (ma: string, soLuong: number, giaVonUsd: number | null = null): KhoanNam => ({
  ma,
  soLuong,
  giaVonUsd,
});

describe('tinhDanhMuc', () => {
  it('tính giá trị, lãi lỗ và tỷ trọng cho danh mục đủ dữ liệu', () => {
    const r = tinhDanhMuc([k('BTC', 0.5, 60_000), k('ETH', 10, 2_000)], {
      BTC: 80_000,
      ETH: 3_000,
    });

    const btc = r.khoan.find((x) => x.ma === 'BTC')!;
    expect(btc.giaTri).toBe(40_000);
    expect(btc.laiLo).toBe(10_000);
    expect(btc.laiLoPhanTram).toBeCloseTo(33.333, 3);

    expect(r.tongGiaTri).toBe(70_000);
    expect(r.tongGiaVon).toBe(50_000);
    expect(r.tongLaiLo).toBe(20_000);
    expect(r.tongLaiLoPhanTram).toBeCloseTo(40, 5);

    // 40.000 / 70.000 = 57,142857…
    expect(btc.tyTrong).toBeCloseTo(57.1429, 3);
  });

  /*
   * Ba test dưới đây là lý do file này tồn tại. Cả ba đều về việc KHÔNG bịa:
   * số 0 là một khẳng định ("không đáng gì"), còn null là một sự thừa nhận
   * ("chưa biết"). Hiện nhầm cái nọ thành cái kia là nói dối về tiền.
   */
  it('không đọc được giá thì để null, không để 0', () => {
    const r = tinhDanhMuc([k('BTC', 1, 60_000)], { BTC: null });
    expect(r.khoan[0].giaTri).toBeNull();
    expect(r.khoan[0].laiLo).toBeNull();
    expect(r.khoan[0].tyTrong).toBeNull();
    expect(r.soDongThieuGia).toBe(1);
  });

  it('mã không có trong bảng giá cũng tính là không đọc được', () => {
    const r = tinhDanhMuc([k('DOGE', 100)], {});
    expect(r.khoan[0].giaTri).toBeNull();
    expect(r.soDongThieuGia).toBe(1);
  });

  it('chưa khai giá vốn thì không có lãi lỗ, nhưng vẫn có giá trị', () => {
    const r = tinhDanhMuc([k('BTC', 1, null)], { BTC: 80_000 });
    expect(r.khoan[0].giaTri).toBe(80_000);
    expect(r.khoan[0].laiLo).toBeNull();
    expect(r.soDongThieuGiaVon).toBe(1);
  });

  /*
   * Cái bẫy khó thấy nhất trong cả file.
   *
   * Nếu cộng giá trị của dòng chưa khai giá vốn vào tử số rồi chia cho tổng vốn
   * vốn đã thiếu dòng đó, con số lãi phóng đại lên — và nó trông hoàn toàn bình
   * thường trên màn hình. Ở đây: BTC lãi thật 20.000 trên vốn 60.000 (33%).
   * Cộng bừa 50.000 của ETH vào sẽ ra 70.000/60.000, tức 116% lãi.
   */
  it('không trộn dòng thiếu giá vốn vào phép tính lãi lỗ tổng', () => {
    const r = tinhDanhMuc([k('BTC', 1, 60_000), k('ETH', 1, null)], {
      BTC: 80_000,
      ETH: 50_000,
    });

    expect(r.tongGiaTri).toBe(130_000); // tổng giá trị vẫn cộng cả hai
    expect(r.tongGiaVon).toBe(60_000);
    expect(r.tongLaiLo).toBe(20_000); // chỉ phần BTC
    expect(r.tongLaiLoPhanTram).toBeCloseTo(33.333, 3);
    expect(r.soDongThieuGiaVon).toBe(1);
  });

  it('tỷ trọng tính trên tổng giá trị, gồm cả dòng chưa khai giá vốn', () => {
    // Chưa khai giá vốn không có nghĩa là không nắm giữ.
    const r = tinhDanhMuc([k('BTC', 1, 60_000), k('ETH', 1, null)], {
      BTC: 75_000,
      ETH: 25_000,
    });
    expect(r.khoan.find((x) => x.ma === 'ETH')!.tyTrong).toBeCloseTo(25, 5);
  });

  it('danh mục rỗng không làm hỏng phép chia', () => {
    const r = tinhDanhMuc([], {});
    expect(r.tongGiaTri).toBe(0);
    expect(r.tongLaiLo).toBeNull();
    expect(r.tongLaiLoPhanTram).toBeNull();
  });

  it('không dòng nào đọc được giá thì tổng lãi lỗ là null, không phải 0', () => {
    const r = tinhDanhMuc([k('BTC', 1, 60_000)], { BTC: null });
    expect(r.tongGiaTri).toBe(0);
    expect(r.tongLaiLo).toBeNull();
  });

  it('lỗ cũng phải ra số âm đúng', () => {
    const r = tinhDanhMuc([k('BTC', 2, 80_000)], { BTC: 60_000 });
    expect(r.khoan[0].laiLo).toBe(-40_000);
    expect(r.khoan[0].laiLoPhanTram).toBeCloseTo(-25, 5);
    expect(r.tongLaiLo).toBe(-40_000);
  });

  it('bỏ giá âm hoặc bằng 0 như dữ liệu hỏng', () => {
    // Cùng quy tắc với `doiChieuGia`: 0 không phải một mức giá.
    expect(tinhDanhMuc([k('BTC', 1)], { BTC: 0 }).khoan[0].giaTri).toBeNull();
    expect(tinhDanhMuc([k('BTC', 1)], { BTC: -5 }).khoan[0].giaTri).toBeNull();
  });
});
