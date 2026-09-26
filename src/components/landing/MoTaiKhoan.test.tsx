import { describe, expect, it } from 'vitest';
import { GIAY_TOI_THIEU, laBot } from './MoTaiKhoan';

describe('chống bot ở form đăng ký', () => {
  it('ô bẫy có chữ → bot', () => expect(laBot({ bay: 'http://spam', batDau: 0, luc: 10_000 })).toBe(true));
  it('gửi quá nhanh → bot', () => expect(laBot({ bay: '', batDau: 1000, luc: 1000 + GIAY_TOI_THIEU - 1 })).toBe(true));
  it('người thật: ô bẫy trống, gửi sau vài giây', () => expect(laBot({ bay: '', batDau: 0, luc: 8000 })).toBe(false));
});
