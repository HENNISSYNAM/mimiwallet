import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KetNoiPage from './KetNoiPage';

const gia = vi.hoisted(() => ({ troLy: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.troLy }));

describe('Kết nối', () => {
  it('nhóm theo loại, trạng thái từ máy chủ, nút đúng việc và đúng trang', async () => {
    gia.troLy.mockResolvedValue({
      ket_noi: [
        { khoa: 'ngan_hang', ten: 'Ngân hàng', loai: 'ngan_hang', trang_thai: 'can_xu_ly', cau: 'Có tài khoản cần đăng nhập lại.', duong_dan: '/dashboard/fintech' },
        { khoa: 'tong_cuc_thue', ten: 'Tổng cục Thuế', loai: 'thue', trang_thai: 'chua_ket_noi', cau: 'Chưa kết nối.', duong_dan: '/dashboard/fintech' },
        { khoa: 'anthropic', ten: 'Anthropic', loai: 'ai', trang_thai: 'dang_chay', cau: 'Tự lấy số liệu.', duong_dan: '/dashboard/chi-phi-ai' },
      ],
    });
    render(<MemoryRouter><KetNoiPage /></MemoryRouter>);
    const thue = await screen.findByRole('region', { name: 'Thuế' });
    expect(within(thue).getByRole('link', { name: /Kết nối/ }).getAttribute('href')).toBe('/dashboard/fintech');
    expect(within(screen.getByRole('region', { name: 'Ngân hàng & thanh toán' })).getByRole('link', { name: /Xử lý/ })).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Nhà cung cấp AI' })).getByRole('link', { name: /Quản lý/ }).getAttribute('href')).toBe('/dashboard/chi-phi-ai');
    expect(gia.troLy).toHaveBeenCalledWith('boi_canh');
  });
});
