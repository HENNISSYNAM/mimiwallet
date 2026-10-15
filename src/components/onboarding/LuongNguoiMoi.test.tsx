import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LuongNguoiMoi } from './LuongNguoiMoi';

const gia = vi.hoisted(() => ({
  user: { id: 'u1', email: 'chu@congty.vn' } as { id: string; email: string } | null,
  docDaDongY: vi.fn(),
  ghiDongY: vi.fn(),
}));
vi.mock('@/store/useAuthStore', () => ({ useAuthStore: (chon: (s: { user: typeof gia.user }) => unknown) => chon({ user: gia.user }) }));
vi.mock('@/components/brand/MimiCat', () => ({ default: () => <span /> }));
vi.mock('@/lib/env', async (goc) => ({ ...(await goc<Record<string, unknown>>()), DEMO_EMAIL: 'demo@mimiwallet.vn' }));
vi.mock('@/lib/dongY', async (goc) => ({
  ...(await goc<Record<string, unknown>>()),
  docDaDongY: gia.docDaDongY,
  ghiDongY: gia.ghiDongY,
}));

const dung = (onXong = vi.fn()) => { render(<MemoryRouter><LuongNguoiMoi onXong={onXong} /></MemoryRouter>); return onXong; };

beforeEach(() => {
  gia.user = { id: 'u1', email: 'chu@congty.vn' };
  gia.docDaDongY.mockReset().mockResolvedValue(false);
  gia.ghiDongY.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
});

describe('lần đầu vào: điều khoản → hướng dẫn → khảo sát', () => {
  it('người chưa đồng ý: thấy điều khoản trước, ghi đồng ý rồi sang hướng dẫn', async () => {
    dung();
    expect(await screen.findByRole('heading', { name: 'Chào mừng đến MIMI' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý và tiếp tục' }));
    await waitFor(() => expect(gia.ghiDongY).toHaveBeenCalledWith('u1'));
    expect(await screen.findByRole('heading', { name: 'Hỏi MIMI như hỏi một kế toán' })).toBeTruthy();
  });

  it('ghi đồng ý lỗi thì báo và KHÔNG cho đi tiếp', async () => {
    gia.ghiDongY.mockRejectedValue(new Error('mạng'));
    dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Đồng ý và tiếp tục' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa lưu được');
    expect(screen.queryByRole('heading', { name: 'Hỏi MIMI như hỏi một kế toán' })).toBeNull();
  });

  it('hướng dẫn đi đủ bốn thẻ, thẻ cuối dẫn tới khảo sát và nhớ đã xem', async () => {
    gia.docDaDongY.mockResolvedValue(true);
    const onXong = dung();
    expect(await screen.findByRole('heading', { name: 'Hỏi MIMI như hỏi một kế toán' })).toBeTruthy();
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByRole('button', { name: /^Tiếp/ }));
    expect(screen.getByRole('heading', { name: 'Bắt đầu: bốn câu hỏi nhanh' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Trả lời bốn câu hỏi/ }));
    expect(onXong).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('mimi:huong-dan:u1')).toBe('1');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('bỏ qua hướng dẫn cũng được ghi nhớ, lần sau không hỏi lại', async () => {
    gia.docDaDongY.mockResolvedValue(true);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua hướng dẫn' }));
    expect(localStorage.getItem('mimi:huong-dan:u1')).toBe('1');
  });

  it('đã đồng ý và đã xem hướng dẫn thì không hiện gì', async () => {
    gia.docDaDongY.mockResolvedValue(true);
    localStorage.setItem('mimi:huong-dan:u1', '1');
    dung();
    await waitFor(() => expect(gia.docDaDongY).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('không đọc được trạng thái (lỗi mạng) thì không chặn người dùng', async () => {
    gia.docDaDongY.mockResolvedValue(null);
    dung();
    await waitFor(() => expect(gia.docDaDongY).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('tài khoản demo dùng chung không qua luồng này', async () => {
    gia.user = { id: 'demo', email: 'demo@mimiwallet.vn' };
    dung();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(gia.docDaDongY).not.toHaveBeenCalled();
  });
});
