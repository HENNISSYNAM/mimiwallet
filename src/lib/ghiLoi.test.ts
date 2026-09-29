import { beforeEach, describe, expect, it, vi } from 'vitest';

const gia = vi.hoisted(() => ({ track: vi.fn() }));
vi.mock('./track', () => ({ track: gia.track }));

import { datLaiGhiLoiChoTest, ghiLoi, lamSachDuongDan, lamSachThongDiep } from './ghiLoi';

beforeEach(() => { gia.track.mockReset(); datLaiGhiLoiChoTest(); });

describe('ghi lỗi giao diện — không để lộ dữ liệu', () => {
  it('xoá số tiền, số tài khoản, email khỏi thông điệp', () => {
    const s = lamSachThongDiep('Không chuyển được 1.250.000 ₫ tới 0381000123456 (khach@vi-du.vn)');
    expect(s).not.toMatch(/\d{3}/);
    expect(s).not.toContain('khach@');
    expect(s).toContain('#');
  });

  it('đường dẫn bỏ query và thay id', () => {
    expect(lamSachDuongDan('/dashboard/invoices/3f2b1c9a-1111-2222-3333-444455556666?q=MH-260903')).toBe('/dashboard/invoices/:id');
  });

  it('lỗi giống nhau chỉ ghi một lần mỗi phiên; tối đa 20 lỗi', () => {
    ghiLoi('window', new TypeError('x is undefined'));
    ghiLoi('window', new TypeError('x is undefined'));
    expect(gia.track).toHaveBeenCalledTimes(1);
    expect(gia.track).toHaveBeenCalledWith('client_error', expect.objectContaining({ loai: 'window', ten: 'TypeError', thong_diep: 'x is undefined' }));
    for (let i = 0; i < 40; i++) ghiLoi('promise', new Error(`loi thu ${'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMN'[i]}`));
    expect(gia.track).toHaveBeenCalledTimes(20);
  });

  it('không bao giờ ném lỗi, kể cả khi nhận thứ lạ', () => {
    expect(() => ghiLoi('promise', { la: 'doi tuong' })).not.toThrow();
    expect(() => ghiLoi('promise', undefined)).not.toThrow();
  });
});
