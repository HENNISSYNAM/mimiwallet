import { describe, expect, it } from 'vitest';
import { chuanHoaChuoi, docChuoiBinance, docChuoiCoinbase } from './chuoi-gia.ts';

/*
 * Dữ liệu thật, lấy ngày 09/09/2026, CÙNG MỘT NGÀY ở cả hai sàn (mốc
 * 1788739200). Dùng số thật chứ không số bịa, vì cái cần khoá ở đây là thứ tự
 * trường — và thứ tự chỉ lộ ra khi các con số có quan hệ đúng với nhau.
 */
const BINANCE_THAT = [
  [1788739200000, '80341.83000000', '80443.99000000', '78680.00000000', '79112.01000000', '10572.45', 1788825599999],
  [1788825600000, '79112.00000000', '79485.00000000', '77620.01000000', '78455.80000000', '19235.06', 1788911999999],
];

const COINBASE_THAT = [
  // Giảm dần, giây, và thứ tự [t, low, high, open, close, volume].
  [1788912000, 78447.11, 79200, 78449.28, 79156.94, 612.82],
  [1788825600, 77589, 79477.07, 79091.97, 78447.11, 5149.14],
  [1788739200, 78666, 80462.23, 80339.13, 79091.97, 3292.97],
];

describe('docChuoiBinance', () => {
  it('đọc đúng open/high/low/close', () => {
    const [n] = docChuoiBinance(BINANCE_THAT);
    expect(n.t).toBe(1788739200000);
    expect(n.mo).toBe(80341.83);
    expect(n.cao).toBe(80443.99);
    expect(n.thap).toBe(78680);
    expect(n.dong).toBe(79112.01);
  });

  it('bỏ dòng hỏng thay vì để lọt', () => {
    expect(docChuoiBinance([[1, '0', '1', '1', '1'], [2, 'x', 'y', 'z', 'w'], []])).toHaveLength(0);
  });

  it('chịu được đầu vào không phải mảng', () => {
    expect(docChuoiBinance(null)).toEqual([]);
    expect(docChuoiBinance({ error: 'geo-blocked' })).toEqual([]);
  });
});

describe('docChuoiCoinbase', () => {
  it('đổi giây sang mili-giây', () => {
    expect(docChuoiCoinbase(COINBASE_THAT)[0].t).toBe(1788912000000);
  });

  /*
   * TEST QUAN TRỌNG NHẤT TRONG FILE.
   *
   * Coinbase để [t, low, high, open, close]; Binance để [t, open, high, low,
   * close]. Chỉ số 1 và 3 hoán vị. Đọc nhầm thì biểu đồ vẫn vẽ ra, vẫn lên
   * xuống, vẫn nằm trong khoảng giá đúng — chỉ có thân nến là sai, và không có
   * gì báo lỗi.
   *
   * Dòng 1788739200 của Coinbase: low 78.666, high 80.462,23, open 80.339,13.
   * Đọc theo thứ tự Binance sẽ ra open 78.666 và low 80.339,13 — tức thấp hơn
   * cao, một trạng thái không tồn tại.
   */
  it('không đọc nhầm low thành open', () => {
    const n = docChuoiCoinbase(COINBASE_THAT).find((x) => x.t === 1788739200000)!;
    expect(n.thap).toBe(78666);
    expect(n.cao).toBe(80462.23);
    expect(n.mo).toBe(80339.13);
    expect(n.dong).toBe(79091.97);
    expect(n.cao).toBeGreaterThan(n.thap);
  });

  it('giá đóng cửa cùng ngày của hai sàn phải gần nhau', () => {
    // Đối chứng chéo: nếu một bên đọc sai trường thì hai con số này lệch xa.
    const b = docChuoiBinance(BINANCE_THAT).find((x) => x.t === 1788739200000)!;
    const c = docChuoiCoinbase(COINBASE_THAT).find((x) => x.t === 1788739200000)!;
    expect(Math.abs(b.dong - c.dong) / b.dong).toBeLessThan(0.01);
  });
});

describe('chuanHoaChuoi', () => {
  it('sắp xếp tăng dần dù sàn trả giảm dần', () => {
    const c = chuanHoaChuoi('BTC', 'Coinbase', docChuoiCoinbase(COINBASE_THAT));
    expect(c.nen.map((n) => n.t)).toEqual([1788739200000, 1788825600000, 1788912000000]);
  });

  it('tính khoảng và thay đổi từ nến đầu tới nến cuối', () => {
    const c = chuanHoaChuoi('BTC', 'Coinbase', docChuoiCoinbase(COINBASE_THAT));
    expect(c.thapNhat).toBe(77589);
    expect(c.caoNhat).toBe(80462.23);
    // mở 80.339,13 → đóng 79.156,94
    expect(c.doiPhanTram).toBeCloseTo(-1.4715, 3);
  });

  /*
   * `cao < thap` là dấu hiệu đọc sai thứ tự trường, không phải một trạng thái
   * thị trường. Giữ lại thì biểu đồ vẫn vẽ được và cái sai đi thẳng lên màn
   * hình.
   */
  it('loại nến có giá cao thấp hơn giá thấp', () => {
    const c = chuanHoaChuoi('BTC', 'X', [{ t: 1, mo: 5, cao: 3, thap: 9, dong: 4 }]);
    expect(c.nen).toHaveLength(0);
    expect(c.ghiChu).toMatch(/Không đọc được/);
  });

  it('loại nến có giá đóng nằm ngoài khoảng cao–thấp', () => {
    const c = chuanHoaChuoi('BTC', 'X', [{ t: 1, mo: 5, cao: 6, thap: 4, dong: 99 }]);
    expect(c.nen).toHaveLength(0);
  });

  it('đếm mốc thiếu thay vì nối thẳng qua chỗ trống', () => {
    // Ngày 1 và ngày 4 — thiếu hai mốc ở giữa.
    const ngay = 86_400_000;
    const c = chuanHoaChuoi('BTC', 'X', [
      { t: ngay * 1, mo: 1, cao: 2, thap: 1, dong: 2 },
      { t: ngay * 4, mo: 2, cao: 3, thap: 2, dong: 3 },
    ]);
    expect(c.soMocThieu).toBe(2);
    expect(c.ghiChu).toMatch(/thiếu 2 mốc/);
  });

  it('bỏ mốc trùng', () => {
    const c = chuanHoaChuoi('BTC', 'X', [
      { t: 100, mo: 1, cao: 2, thap: 1, dong: 2 },
      { t: 100, mo: 1, cao: 2, thap: 1, dong: 2 },
    ]);
    expect(c.nen).toHaveLength(1);
  });

  it('chuỗi rỗng nói rõ là không đọc được, kèm tên sàn', () => {
    const c = chuanHoaChuoi('BTC', 'Binance', []);
    expect(c.nen).toEqual([]);
    expect(c.thapNhat).toBeNull();
    expect(c.doiPhanTram).toBeNull();
    expect(c.ghiChu).toContain('Binance');
  });

  it('luôn nói ra sàn nào cấp chuỗi — biểu đồ không được ẩn nguồn', () => {
    const c = chuanHoaChuoi('BTC', 'Coinbase', docChuoiCoinbase(COINBASE_THAT));
    expect(c.san).toBe('Coinbase');
    expect(c.ghiChu).toContain('Coinbase');
  });
});
