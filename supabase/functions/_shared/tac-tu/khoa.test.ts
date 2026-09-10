import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { bamKhoa, hienKhoa, laKhoaTacTu, sinhKhoa, TIEN_TO_KHOA } from './khoa';

// Môi trường test mặc định (jsdom) có getRandomValues nhưng không có
// crypto.subtle. Deno — nơi hàm này chạy thật — và trình duyệt đều có đủ.
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

describe('khoá agent', () => {
  it('đúng khuôn và nhận dạng được', () => {
    const k = sinhKhoa();
    expect(k.startsWith(TIEN_TO_KHOA)).toBe(true);
    expect(k).toHaveLength(TIEN_TO_KHOA.length + 32);
    expect(laKhoaTacTu(k)).toBe(true);
  });

  it('không có ký tự dễ nhầm', () => {
    for (let i = 0; i < 50; i++) expect(sinhKhoa().slice(TIEN_TO_KHOA.length)).not.toMatch(/[01ilo]/);
  });

  it('không lặp', () => {
    const tap = new Set(Array.from({ length: 200 }, sinhKhoa));
    expect(tap.size).toBe(200);
  });

  it('từ chối chuỗi sai khuôn', () => {
    for (const s of ['', 'mimi_ak_', 'sk-abc', `${TIEN_TO_KHOA}${'0'.repeat(32)}`, null, undefined]) {
      expect(laKhoaTacTu(s)).toBe(false);
    }
  });

  it('băm SHA-256 chuẩn', async () => {
    expect(await bamKhoa('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('phần hiển thị không chứa đủ khoá', () => {
    const k = sinhKhoa();
    expect(hienKhoa(k).length).toBeLessThan(20);
    expect(k.includes(hienKhoa(k).replace('…', ''))).toBe(true);
  });
});
