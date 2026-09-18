import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import MoTaiKhoan from './MoTaiKhoan';

/**
 * Khu "Mở tài khoản" phải dẫn tới một việc có thật.
 *
 * Bản trước chỉ ghi `waitlist` rồi hứa "liên hệ trong 24 giờ" — không email nào gửi đi, người dùng
 * đứng lại trang chủ, và lỗi ghi bị bỏ qua nên vẫn báo thành công. Test dưới đây khoá lại hành vi
 * mới: đi sang trang đăng ký, và lỗi lưu không được chặn người dùng.
 */

const gia = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ insert: gia.insert }) },
}));

function ViTri() {
  const l = useLocation();
  return <span data-testid="vi-tri">{l.pathname + l.search}</span>;
}

const dung = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Routes>
      <Route path="/" element={<MoTaiKhoan />} />
      <Route path="/register" element={<ViTri />} />
    </Routes>
  </MemoryRouter>,
);

const oEmail = () => screen.getByLabelText('Email doanh nghiệp');
const oCongTy = () => screen.getByLabelText('Tên công ty (không bắt buộc)');
const nut = () => screen.getByRole('button', { name: /Bắt đầu ngay/ });

beforeEach(() => {
  gia.insert.mockReset().mockResolvedValue({ error: null });
});

describe('Mở tài khoản trên trang chủ', () => {
  it('nói rõ MIMI sẽ gửi link vào email, không hứa "liên hệ trong 24 giờ"', () => {
    dung();
    expect(document.body.textContent).toContain('MIMI gửi một link vào email này');
    expect(document.body.textContent).not.toContain('24 giờ');
  });

  it('email sai: báo lỗi, không lưu, không đi đâu', async () => {
    dung();
    fireEvent.change(oEmail(), { target: { value: 'khong-phai-email' } });
    fireEvent.click(nut());
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Email chưa đúng, ví dụ ten@congty.vn.');
    expect(gia.insert).not.toHaveBeenCalled();
    expect(screen.queryByTestId('vi-tri')).toBeNull();
  });

  it('email đúng: lưu lại rồi sang trang đăng ký kèm email và tên công ty', async () => {
    dung();
    fireEvent.change(oEmail(), { target: { value: ' ketoan@thinhphat.vn ' } });
    fireEvent.change(oCongTy(), { target: { value: 'Thịnh Phát' } });
    fireEvent.click(nut());
    await waitFor(() => expect(screen.getByTestId('vi-tri').textContent)
      .toBe(`/register?email=${encodeURIComponent('ketoan@thinhphat.vn')}&cong_ty=${encodeURIComponent('Thịnh Phát')}`));
    expect(gia.insert).toHaveBeenCalledWith(expect.objectContaining({ email: 'ketoan@thinhphat.vn', company_name: 'Thịnh Phát' }));
  });

  it('không nhập tên công ty: vẫn đi tiếp, lưu tạm theo tên miền email', async () => {
    dung();
    fireEvent.change(oEmail(), { target: { value: 'chu@thinhphat.vn' } });
    fireEvent.click(nut());
    await waitFor(() => expect(screen.getByTestId('vi-tri').textContent).toBe('/register?email=chu%40thinhphat.vn'));
    expect(gia.insert).toHaveBeenCalledWith(expect.objectContaining({ company_name: 'thinhphat.vn' }));
  });

  it('lưu lỗi (Supabase trả error, không ném): vẫn đưa người dùng sang đăng ký', async () => {
    gia.insert.mockResolvedValue({ error: { message: 'permission denied' } });
    dung();
    fireEvent.change(oEmail(), { target: { value: 'chu@thinhphat.vn' } });
    fireEvent.click(nut());
    await waitFor(() => expect(screen.getByTestId('vi-tri')).toBeTruthy());
  });
});
