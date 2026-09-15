import { beforeEach, describe, expect, it } from 'vitest';
import { duoiEmailCongTy, ghiDichSauDangNhap, laEmail, layDichSauDangNhap } from './sauDangNhap';

beforeEach(() => localStorage.clear());

describe('đích sau đăng nhập', () => {
  it('ghi rồi lấy đúng một lần', () => {
    ghiDichSauDangNhap('/dashboard/tro-ly', 1000);
    expect(layDichSauDangNhap(2000)).toBe('/dashboard/tro-ly');
    expect(layDichSauDangNhap(2000)).toBeNull();
  });

  it('quá một giờ thì bỏ', () => {
    ghiDichSauDangNhap('/dashboard/tro-ly', 0);
    expect(layDichSauDangNhap(60 * 60 * 1000 + 1)).toBeNull();
  });

  it('không nhận đích ra ngoài ứng dụng', () => {
    ghiDichSauDangNhap('https://ke-gian.example/dashboard');
    expect(layDichSauDangNhap()).toBeNull();
    localStorage.setItem('mimi:sau-dang-nhap', JSON.stringify({ duongDan: '//ke-gian.example', luc: Date.now() }));
    expect(layDichSauDangNhap()).toBeNull();
  });
});

describe('email', () => {
  it('lấy đuôi email công ty, bỏ email cá nhân', () => {
    expect(duoiEmailCongTy(' Nam@ThinhPhat.vn ')).toBe('thinhphat.vn');
    expect(duoiEmailCongTy('nam@gmail.com')).toBeNull();
    expect(duoiEmailCongTy('nam@')).toBeNull();
    expect(laEmail('nam@thinhphat.vn')).toBe(true);
    expect(laEmail('nam@thinhphat')).toBe(false);
  });
});
