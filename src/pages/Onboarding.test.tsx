import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Onboarding from './Onboarding';

const gia = vi.hoisted(() => ({
  state: {
    isAuthenticated: false,
    signInWithEmailLink: vi.fn(),
    signInWithGoogle: vi.fn(),
  },
}));
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (chon: (s: typeof gia.state) => unknown) => chon(gia.state),
}));
vi.mock('@/components/brand/MimiCat', () => ({ default: () => <span /> }));

const dung = () => render(<MemoryRouter><Onboarding /></MemoryRouter>);
const oEmail = () => screen.getByLabelText('Email công ty');

beforeEach(() => {
  gia.state.signInWithEmailLink.mockReset().mockResolvedValue({ error: null });
  gia.state.signInWithGoogle.mockReset().mockResolvedValue({ error: null });
  localStorage.clear();
});

describe('đăng ký chỉ bằng email', () => {
  it('chỉ có một ô email, không mật khẩu, không mã số thuế', () => {
    dung();
    expect(oEmail()).toBeTruthy();
    expect(document.querySelectorAll('input')).toHaveLength(1);
    expect(document.body.textContent).not.toMatch(/mật khẩu \*|Mã số thuế|Nhập lại/);
  });

  it('email công ty: báo trước tên công ty, gửi link, nhớ đưa người dùng vào trợ lý', async () => {
    dung();
    fireEvent.change(oEmail(), { target: { value: ' nam@thinhphat.vn ' } });
    expect(document.body.textContent).toContain('Công ty sẽ mang tên thinhphat.vn');
    fireEvent.click(screen.getByRole('button', { name: /Gửi link vào email/ }));
    // Ô type="email" tự cắt khoảng trắng hai đầu; kho đăng nhập cũng trim thêm lần nữa.
    await waitFor(() => expect(gia.state.signInWithEmailLink).toHaveBeenCalledWith('nam@thinhphat.vn'));
    expect(await screen.findByRole('heading', { name: 'Kiểm tra hộp thư' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem('mimi:sau-dang-nhap') ?? '{}').duongDan).toBe('/dashboard/tro-ly');
    // Không cho bấm gửi lại liên tục.
    expect((screen.getByRole('button', { name: /Gửi lại sau/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('email cá nhân vẫn dùng được, chỉ nhắc nhẹ', () => {
    dung();
    fireEvent.change(oEmail(), { target: { value: 'nam@gmail.com' } });
    expect(document.body.textContent).toContain('Email cá nhân vẫn dùng được');
  });

  it('email sai khuôn thì nói bằng lời và không gửi', () => {
    dung();
    fireEvent.change(oEmail(), { target: { value: 'nam@' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi link vào email/ }));
    expect(screen.getByRole('alert').textContent).toContain('Email chưa đúng');
    expect(gia.state.signInWithEmailLink).not.toHaveBeenCalled();
  });

  it('lỗi của Supabase được dịch sang việc người dùng làm được', async () => {
    gia.state.signInWithEmailLink.mockResolvedValue({ error: 'For security purposes, you can only request this after 42 seconds.' });
    dung();
    fireEvent.change(oEmail(), { target: { value: 'nam@thinhphat.vn' } });
    fireEvent.click(screen.getByRole('button', { name: /Gửi link vào email/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Bạn vừa yêu cầu link. Đợi khoảng một phút rồi gửi lại.');
  });
});
