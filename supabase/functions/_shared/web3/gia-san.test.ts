import { describe, expect, it } from 'vitest';
import { doiChieuGia, NGUONG_LECH, type BaoGia } from './gia-san.ts';

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
