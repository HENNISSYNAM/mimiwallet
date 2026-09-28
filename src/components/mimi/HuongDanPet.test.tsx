import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HuongDanPet, KHOA_DA_XEM, laNguoiMoi } from './HuongDanPet';
import { useAuthStore } from '@/store/useAuthStore';
import { docCaiDat } from '@/lib/petMimi';

const moi = new Date(Date.now() - 2 * 86_400_000).toISOString();
const cu = new Date(Date.now() - 60 * 86_400_000).toISOString();

beforeEach(() => { localStorage.clear(); useAuthStore.setState({ user: null }); });

describe('Hướng dẫn pet cho người mới', () => {
  it('người mới đăng nhập, pet đang ẩn → hiện hướng dẫn; bấm "Bật pet MIMI" thì pet hiện và hướng dẫn không quay lại', () => {
    useAuthStore.setState({ user: { id: 'u-1', created_at: moi } as never });
    const { unmount } = render(<HuongDanPet />);
    const the = screen.getByRole('dialog', { name: 'Làm quen với pet MIMI' });
    expect(the.textContent).toContain('Bấm vào mèo');
    expect(the.textContent).toContain('/pet');
    expect(docCaiDat().an).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Bật pet MIMI' }));
    expect(docCaiDat().an).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem(KHOA_DA_XEM)).toBe('1');
    unmount();
    render(<HuongDanPet />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Để sau" → không bật pet, không hiện lại', () => {
    useAuthStore.setState({ user: { id: 'u-1', created_at: moi } as never });
    render(<HuongDanPet />);
    fireEvent.click(screen.getByRole('button', { name: /Để sau/ }));
    expect(docCaiDat().an).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('tài khoản cũ hoặc chưa đăng nhập → không làm phiền', () => {
    render(<HuongDanPet />);
    expect(screen.queryByRole('dialog')).toBeNull();
    useAuthStore.setState({ user: { id: 'u-2', created_at: cu } as never });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(laNguoiMoi(undefined)).toBe(false);
    expect(laNguoiMoi(moi)).toBe(true);
  });
});
