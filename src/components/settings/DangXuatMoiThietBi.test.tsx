import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const signOut = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: (...a: unknown[]) => signOut(...a) } } }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

import { DangXuatMoiThietBi } from './DangXuatMoiThietBi';

beforeEach(() => { signOut.mockReset(); toast.success.mockReset(); toast.error.mockReset(); });

describe('Cài đặt → Đăng xuất khỏi mọi thiết bị', () => {
  it('phải xác nhận trước; huỷ thì không gọi máy chủ', () => {
    const xong = vi.fn();
    render(<DangXuatMoiThietBi sauKhiXong={xong} />);
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất khỏi mọi thiết bị/ }));
    expect(screen.getByText(/chậm nhất trong khoảng 1 giờ/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ' }));
    expect(signOut).not.toHaveBeenCalled();
    expect(xong).not.toHaveBeenCalled();
  });

  it('xác nhận → thu hồi mọi phiên (scope global) rồi mới rời trang', async () => {
    signOut.mockResolvedValue({ error: null });
    const xong = vi.fn();
    render(<DangXuatMoiThietBi sauKhiXong={xong} />);
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất khỏi mọi thiết bị/ }));
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất hết/ }));
    await waitFor(() => expect(xong).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(toast.success).toHaveBeenCalled();
  });

  it('máy chủ lỗi → nói lỗi, KHÔNG báo thành công, không rời trang', async () => {
    signOut.mockResolvedValue({ error: { message: 'mạng chập chờn' } });
    const xong = vi.fn();
    render(<DangXuatMoiThietBi sauKhiXong={xong} />);
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất khỏi mọi thiết bị/ }));
    fireEvent.click(screen.getByRole('button', { name: /Đăng xuất hết/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls[0][0]).toContain('mạng chập chờn');
    expect(toast.success).not.toHaveBeenCalled();
    expect(xong).not.toHaveBeenCalled();
  });
});
