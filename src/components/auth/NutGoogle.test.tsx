import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NutGoogle } from './NutGoogle';

const gia = vi.hoisted(() => ({ signInWithGoogle: vi.fn(), toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/store/useAuthStore', () => ({ useAuthStore: (chon: (s: { signInWithGoogle: typeof gia.signInWithGoogle }) => unknown) => chon({ signInWithGoogle: gia.signInWithGoogle }) }));
vi.mock('sonner', () => ({ toast: gia.toast }));

beforeEach(() => {
  gia.signInWithGoogle.mockReset().mockResolvedValue({ error: null });
  gia.toast.error.mockReset();
  localStorage.clear();
});

describe('nút Google dùng chung cho đăng nhập và đăng ký', () => {
  it('bấm thì nhớ đích đến rồi gọi Google, hiện đang chuyển', async () => {
    render(<NutGoogle dich="/dashboard/tro-ly" />);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục với Google/ }));
    await waitFor(() => expect(gia.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(JSON.parse(localStorage.getItem('mimi:sau-dang-nhap') ?? '{}').duongDan).toBe('/dashboard/tro-ly');
    expect(screen.getByRole('button').textContent).toContain('Đang chuyển sang Google');
  });

  it('trong Zalo/Facebook: không gọi Google, chỉ đường mở bằng Chrome hoặc Safari', () => {
    render(<NutGoogle ua="Mozilla/5.0 (Linux; Android 13) Chrome/120 Mobile Safari/537.36 Zalo/1.2" />);
    expect(screen.getByRole('alert').textContent).toContain('Chrome hoặc Safari');
    expect(screen.getByRole('alert').textContent).toContain('Zalo');
    expect(screen.queryByRole('button', { name: /Tiếp tục với Google/ })).toBeNull();
    expect(gia.signInWithGoogle).not.toHaveBeenCalled();
  });

  it('người tự huỷ ở Google thì không báo lỗi', async () => {
    gia.signInWithGoogle.mockResolvedValue({ error: 'access_denied' });
    render(<NutGoogle />);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục với Google/ }));
    await waitFor(() => expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false));
    expect(gia.toast.error).not.toHaveBeenCalled();
  });

  it('lỗi mạng và lỗi lạ được dịch ra câu người thường hiểu, nút bấm lại được', async () => {
    gia.signInWithGoogle.mockResolvedValueOnce({ error: 'Failed to fetch' });
    render(<NutGoogle />);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục với Google/ }));
    await waitFor(() => expect(gia.toast.error).toHaveBeenCalledWith(expect.stringContaining('Chưa kết nối được tới Google')));
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false);
  });
});
