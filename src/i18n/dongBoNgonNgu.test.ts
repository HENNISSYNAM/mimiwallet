import { describe, expect, it } from 'vitest';
import { BO_DICH, NGON_NGU, type MaNgonNgu } from './index';

/**
 * Bốn ngôn ngữ phải có ĐÚNG cùng một bộ khoá.
 *
 * Vì sao cần test này: thêm một chuỗi tiếng Việt rồi quên dịch thì i18next lặng lẽ trả về khoá
 * (`sidebar.overview`) hoặc rơi về tiếng Việt giữa màn tiếng Hàn — người dùng thấy giao diện
 * lẫn lộn mà không ai báo lỗi. Ở đây thiếu một khoá là đỏ ngay, kèm tên khoá thiếu.
 */

type Bat = Record<string, unknown>;

/** Mọi đường khoá lá (a.b.c), mảng tính cả chỉ số để không lệch số phần tử. */
function duongKhoa(o: unknown, tien = ''): string[] {
  if (Array.isArray(o)) return o.flatMap((v, i) => duongKhoa(v, `${tien}[${i}]`));
  if (o && typeof o === 'object') {
    return Object.entries(o as Bat).flatMap(([k, v]) => duongKhoa(v, tien ? `${tien}.${k}` : k));
  }
  return [tien];
}

const khoaCua = (ma: MaNgonNgu) => new Set(duongKhoa(BO_DICH[ma]));
const KHOA_VI = khoaCua('vi');

describe('đồng bộ bốn ngôn ngữ', () => {
  it('khai đủ bốn ngôn ngữ, mỗi ngôn ngữ có bộ dịch', () => {
    expect(NGON_NGU.map((n) => n.ma)).toEqual(['vi', 'en', 'ko', 'zh']);
    for (const n of NGON_NGU) {
      expect(BO_DICH[n.ma], n.ma).toBeTruthy();
      expect(n.ten.length, n.ma).toBeGreaterThan(1);
    }
  });

  for (const ma of ['en', 'ko', 'zh'] as MaNgonNgu[]) {
    it(`${ma} có đúng bộ khoá của tiếng Việt`, () => {
      const khoa = khoaCua(ma);
      const thieu = [...KHOA_VI].filter((k) => !khoa.has(k));
      const thua = [...khoa].filter((k) => !KHOA_VI.has(k));
      expect(thieu, `${ma} thiếu khoá`).toEqual([]);
      expect(thua, `${ma} có khoá lạ`).toEqual([]);
    });

    it(`${ma} không để chuỗi rỗng ở chỗ tiếng Việt có chữ`, () => {
      const lay = (o: unknown, duong: string): unknown =>
        duong.split('.').reduce<unknown>((acc, phan) => {
          const m = phan.match(/^(.*?)((\[\d+\])*)$/);
          let cur: unknown = m && m[1] ? (acc as Bat)?.[m[1]] : acc;
          for (const i of (m?.[2] ?? '').matchAll(/\[(\d+)\]/g)) cur = (cur as unknown[])?.[Number(i[1])];
          return cur;
        }, o);
      const rong: string[] = [];
      for (const k of KHOA_VI) {
        const vi = lay(BO_DICH.vi, k);
        const khac = lay(BO_DICH[ma], k);
        if (typeof vi === 'string' && vi.trim() !== '' && typeof khac === 'string' && khac.trim() === '') rong.push(k);
      }
      expect(rong, `${ma} bỏ trống bản dịch`).toEqual([]);
    });

    it(`${ma} giữ nguyên các chỗ chèn biến của tiếng Việt`, () => {
      const bien = (s: string) => [...s.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map((m) => m[1]).sort();
      const lech: string[] = [];
      const diQua = (a: unknown, b: unknown, duong: string) => {
        if (typeof a === 'string') {
          if (typeof b !== 'string' || bien(a).join(',') !== bien(b).join(',')) lech.push(duong);
          return;
        }
        if (Array.isArray(a)) { a.forEach((v, i) => diQua(v, (b as unknown[])?.[i], `${duong}[${i}]`)); return; }
        if (a && typeof a === 'object') {
          for (const [k, v] of Object.entries(a as Bat)) diQua(v, (b as Bat)?.[k], duong ? `${duong}.${k}` : k);
        }
      };
      diQua(BO_DICH.vi, BO_DICH[ma], '');
      expect(lech, `${ma} lệch biến chèn`).toEqual([]);
    });
  }
});
