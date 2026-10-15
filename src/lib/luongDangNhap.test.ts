import { afterEach, describe, expect, it } from 'vitest';
import { datLaiTaiTruoc, phanLoaiLoi, taiTruocGoogle, trinhDuyetNhung } from './luongDangNhap';

describe('trình duyệt nhúng bị Google chặn', () => {
  it('nhận ra Zalo, Facebook, Messenger, Instagram, TikTok', () => {
    expect(trinhDuyetNhung('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 Zalo/1.2')).toBe('Zalo');
    expect(trinhDuyetNhung('Mozilla/5.0 (iPhone) AppleWebKit/605 Mobile/15E148 [FBAN/FBIOS;FBAV/430.0]')).toBe('Facebook');
    expect(trinhDuyetNhung('Mozilla/5.0 (iPhone) Mobile/15E148 Instagram 300.0')).toBe('Instagram');
    expect(trinhDuyetNhung('Mozilla/5.0 (Linux; Android 12) musical_ly_2022')).toBe('TikTok');
  });
  it('không nhầm Chrome, Safari, Edge thường', () => {
    expect(trinhDuyetNhung('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/141 Safari/537.36 Edg/141')).toBeNull();
    expect(trinhDuyetNhung('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605 Version/17.0 Mobile/15E148 Safari/604.1')).toBeNull();
    expect(trinhDuyetNhung('')).toBeNull();
  });
});

describe('phân loại lỗi đăng nhập', () => {
  it('người tự huỷ ở Google không phải là lỗi', () => {
    expect(phanLoaiLoi('access_denied')).toBe('huy');
    expect(phanLoaiLoi('The user denied access')).toBe('huy');
  });
  it('nhận ra từ chối đăng ký (cả công tắc lẫn trigger), quá nhiều lần, mất mạng', () => {
    expect(phanLoaiLoi('Signups not allowed for this instance')).toBe('khongMoDuoc');
    expect(phanLoaiLoi('Database error saving new user')).toBe('khongMoDuoc');
    expect(phanLoaiLoi('Tài khoản mới chỉ đăng ký bằng Google')).toBe('khongMoDuoc'); // câu của trigger chi_dang_ky_google
    expect(phanLoaiLoi('For security purposes, you can only request this after 52 seconds')).toBe('nhieu');
    expect(phanLoaiLoi('Failed to fetch')).toBe('mang');
    expect(phanLoaiLoi('Invalid login credentials')).toBe('dongChua');
    expect(phanLoaiLoi('điều gì đó lạ')).toBe('khac');
    expect(phanLoaiLoi(null)).toBe('khac');
  });
});

describe('tải trước', () => {
  afterEach(() => { datLaiTaiTruoc(); document.head.querySelectorAll('link[rel=preconnect]').forEach((l) => l.remove()); });
  it('mở sẵn kết nối tới Google đúng một lần dù gọi nhiều lần', () => {
    taiTruocGoogle(); taiTruocGoogle(); taiTruocGoogle();
    expect(document.head.querySelectorAll('link[rel=preconnect][href="https://accounts.google.com"]')).toHaveLength(1);
  });
});
