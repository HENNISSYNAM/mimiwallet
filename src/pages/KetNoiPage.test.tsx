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
    const nganHang = await screen.findByRole('region', { name: 'Ngân hàng & thanh toán' });
    expect(within(nganHang).getByRole('link', { name: /Xử lý/ }).getAttribute('href')).toBe('/dashboard/fintech');
    // 28/09/2026: nhóm Thuế (hoá đơn điện tử qua Cas, chưa bật trên production) và Nhà cung cấp AI (Chi phí AI
    // đóng băng) không hiện nữa, dù máy chủ vẫn trả về.
    expect(screen.queryByRole('region', { name: 'Thuế' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Nhà cung cấp AI' })).toBeNull();
    expect(gia.troLy).toHaveBeenCalledWith('boi_canh');
  });
});
