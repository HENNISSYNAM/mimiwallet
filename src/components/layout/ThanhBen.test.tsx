import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { docCaiDat, luuCaiDat, MAC_DINH } from '@/lib/petMimi';

vi.mock('@/hooks/useTrangThaiTroLy', () => ({ useCoMoHinh: () => true }));
vi.mock('@/components/chung-tu/NutQuetChungTu', () => ({
  NutQuetChungTu: ({ children, nhanAn, className }: { children: React.ReactNode; nhanAn?: string; className?: string }) =>
    <button type="button" aria-label={nhanAn} className={className}>{children}</button>,
}));
vi.mock('./MenuTaiKhoan', () => ({ MenuTaiKhoan: () => <button type="button">Tài khoản và cài đặt</button> }));
vi.mock('@/lib/lichSuHoiThoai', async (goc) => ({ ...(await goc<typeof import('@/lib/lichSuHoiThoai')>()), docLichSu: async () => [] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import ThanhBen from './ThanhLichSu';

/** Dải biểu tượng bên trái (29/09/2026): nhóm điều hướng, quét, pet, tài khoản; lịch sử mở/đóng cạnh dải. */
describe('dải biểu tượng bên trái', () => {
  beforeEach(() => { localStorage.clear(); luuCaiDat({ ...MAC_DINH }); });

  const ve = (duong = '/dashboard') => render(
    <MemoryRouter initialEntries={[duong]}><TooltipProvider><ThanhBen tenCongTy="Cty A" anhDaiDien={<span>A</span>} /></TooltipProvider></MemoryRouter>,
  );

  it('đủ nút theo nhóm; trang chủ sáng khi ở trang trợ lý', () => {
    ve();
    for (const ten of ['Trang chủ — MIMI Trợ lý', 'Lịch sử hỏi MIMI', 'Thư viện chứng từ', 'Ứng dụng & kết nối', 'Tất cả công cụ', 'Quét hoá đơn', 'Pet MIMI', 'Hỗ trợ']) {
      expect(screen.getByRole(ten === 'Hỗ trợ' ? 'link' : ten.startsWith('Trang') || ten.startsWith('Thư') || ten.startsWith('Ứng') ? 'link' : 'button', { name: ten })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: 'Trang chủ — MIMI Trợ lý' }).getAttribute('aria-current')).toBe('page');
  });

  it('nút pet bật rồi cất pet MIMI, trạng thái nút đi theo', () => {
    ve();
    const nut = screen.getByRole('button', { name: 'Pet MIMI' });
    expect(nut.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(nut);
    expect(docCaiDat().an).toBe(false);
    fireEvent.click(nut);
    expect(docCaiDat().an).toBe(true);
  });

  it('lịch sử mở mặc định, đóng được và nhớ lựa chọn', () => {
    const { unmount } = ve();
    expect(screen.getByRole('complementary', { name: 'Lịch sử hỏi MIMI' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử' }));
    expect(screen.queryByRole('complementary', { name: 'Lịch sử hỏi MIMI' })).toBeNull();
    unmount();
    ve();
    expect(screen.queryByRole('complementary', { name: 'Lịch sử hỏi MIMI' })).toBeNull();
  });
});
