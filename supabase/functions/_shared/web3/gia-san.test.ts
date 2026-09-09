import { describe, expect, it } from 'vitest';
import { doiChieuGia, NGUONG_LECH, NGUONG_LECH_DOI, type BaoGia } from './gia-san.ts';

const bg = (san: string, gia: number, doi24h: number | null = null): BaoGia => ({ san, gia, doi24h });

describe('doiChieuGia', () => {
  it('hai sàn khớp thì lấy trung vị và nói rõ đã đối chiếu', () => {
    const r = doiChieuGia('BTC', [bg('Binance', 100_000), bg('Coinbase', 100_200)]);
    expect(r.gia).toBe(100_100);
    expect(r.mucLech).toBe('lech_nhe');
    expect(r.nguon).toEqual(['Binance', 'Coinbase']);
    expect(r.ghiChu).toMatch(/khớp nhau/);
  });

  it('lệch quá ngưỡng thì báo ra, không nuốt', () => {
    // 100.000 và 102.000 lệch 2% — trên ngưỡng 1%.
    const r = doiChieuGia('BTC', [bg('Binance', 100_000), bg('Coinbase', 102_000)]);
    expect(r.mucLech).toBe('lech_dang_ke');
    expect(r.lechPhanTram).toBeCloseTo(2, 5);
    expect(r.ghiChu).toMatch(/lệch/);
    expect(r.ghiChu).toContain(String(NGUONG_LECH));
  });

  /*
   * Lý do tồn tại của cả module. Một sàn trả giá hỏng mà vẫn cho vào trung bình
   * thì con số ra bị kéo theo nó, và không có gì trên màn hình nói là đã hỏng.
   */
  it('trung vị chịu được một nguồn hỏng khi có ba sàn', () => {
    const r = doiChieuGia('BTC', [bg('A', 100_000), bg('B', 100_100), bg('C', 900_000)]);
    expect(r.gia).toBe(100_100);
    // Vẫn phải báo là lệch — con số đúng không có nghĩa là dữ liệu lành.
    expect(r.mucLech).toBe('lech_dang_ke');
  });

  it('loại báo giá không phải số dương', () => {
    const r = doiChieuGia('BTC', [bg('Binance', 0), bg('Coinbase', 100_000)]);
    expect(r.gia).toBe(100_000);
    expect(r.nguon).toEqual(['Coinbase']);
  });

  it('một sàn duy nhất thì vẫn trả giá nhưng nói rõ không có đối chứng', () => {
    const r = doiChieuGia('BTC', [bg('Binance', 100_000)]);
    expect(r.gia).toBe(100_000);
    expect(r.lechPhanTram).toBeNull();
    expect(r.ghiChu).toMatch(/không có nguồn thứ hai/);
  });

  it('không sàn nào trả lời thì nói thẳng là chưa có dữ liệu', () => {
    const r = doiChieuGia('BTC', []);
    expect(r.gia).toBeNull();
    expect(r.nguon).toEqual([]);
    expect(r.ghiChu).toMatch(/Không sàn nào/);
  });

  it('bỏ qua NaN và Infinity', () => {
    const r = doiChieuGia('BTC', [bg('A', Number.NaN), bg('B', Number.POSITIVE_INFINITY), bg('C', 50_000)]);
    expect(r.gia).toBe(50_000);
    expect(r.nguon).toEqual(['C']);
  });

  it('bỏ qua sàn không trả về thay đổi 24h thay vì coi là 0', () => {
    // Coi thiếu dữ liệu là 0% sẽ kéo con số về giữa và nói dối là "đứng giá".
    const r = doiChieuGia('BTC', [bg('A', 100_000, 5), bg('B', 100_000, null)]);
    expect(r.doi24h).toBe(5);
  });
});

/**
 * Số đo thật ngày 09/09/2026, không phải số bịa cho vừa test.
 *
 * Đây là lý do `doi24hLech` tồn tại: hai sàn khớp giá tới 0,017% nhưng lệch
 * mười lần ở con số thay đổi 24h, vì cửa sổ 24 giờ của mỗi sàn bắt đầu ở thời
 * điểm khác nhau. Không sàn nào sai — chỉ là hai đại lượng không cùng định
 * nghĩa, và gộp chúng lại rồi im lặng là trình bày một số blend như một phép đo.
 */
describe('lệch của con số thay đổi 24h — đo thật 09/09/2026', () => {
  const btc = () =>
    doiChieuGia('BTC', [
      { san: 'Binance', gia: 78_893.99, doi24h: 0.029 },
      // Coinbase không trả sẵn phần trăm; tự tính từ open 78.649,87.
      { san: 'Coinbase', gia: 78_880.53, doi24h: ((78_880.53 - 78_649.87) / 78_649.87) * 100 },
    ]);

  it('giá vẫn khớp — dưới ngưỡng lệch', () => {
    const r = btc();
    expect(r.lechPhanTram).toBeLessThan(NGUONG_LECH);
    expect(r.mucLech).not.toBe('lech_dang_ke');
  });

  it('nhưng con số thay đổi thì lệch trên ngưỡng, và phải nói ra', () => {
    const r = btc();
    expect(r.doi24hLech).toBeGreaterThanOrEqual(NGUONG_LECH_DOI);
    expect(r.ghiChu).toMatch(/cửa sổ 24 giờ/);
  });

  it('không nói gì thêm khi hai sàn báo thay đổi gần nhau', () => {
    const r = doiChieuGia('BTC', [
      { san: 'A', gia: 100_000, doi24h: 2.5 },
      { san: 'B', gia: 100_010, doi24h: 2.55 },
    ]);
    expect(r.doi24hLech).toBeCloseTo(0.05, 5);
    expect(r.ghiChu).not.toMatch(/cửa sổ 24 giờ/);
  });

  it('một sàn duy nhất thì không có gì để so, để null', () => {
    expect(doiChieuGia('BTC', [{ san: 'A', gia: 1, doi24h: 5 }]).doi24hLech).toBeNull();
  });
});
