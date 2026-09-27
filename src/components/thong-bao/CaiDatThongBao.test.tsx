import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const gia = vi.hoisted(() => ({
  docLoaiTat: vi.fn(), luuLoaiTat: vi.fn(), docThongBao: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/lib/thongBao', async (goc) => ({
  ...(await goc<typeof import('@/lib/thongBao')>()),
  docLoaiTat: gia.docLoaiTat, luuLoaiTat: gia.luuLoaiTat, docThongBao: gia.docThongBao,
  trangThaiDay: async () => 'chua_bat', batDay: vi.fn(), tatDay: vi.fn(), guiThu: vi.fn(),
}));
vi.mock('sonner', () => ({ toast: gia.toast }));

import { CaiDatThongBao } from './CaiDatThongBao';

const dung = () => render(<MemoryRouter><CaiDatThongBao /></MemoryRouter>);

beforeEach(() => {
  gia.docLoaiTat.mockReset(); gia.luuLoaiTat.mockReset().mockResolvedValue(undefined);
  gia.docThongBao.mockReset().mockResolvedValue([]);
});

describe('Cài đặt thông báo — không ghi đè khi chưa đọc được lựa chọn cũ', () => {
  it('đọc "loại đã tắt" lỗi → khoá công tắc, báo lỗi; gạt công tắc KHÔNG lưu gì', async () => {
    gia.docLoaiTat.mockRejectedValue(new Error('mạng'));
    dung();
    expect((await screen.findByRole('alert')).textContent).toContain('tạm khoá các công tắc');
    const cong = screen.getAllByRole('switch');
    expect(cong.length).toBeGreaterThan(0);
    for (const c of cong.filter((x) => x.getAttribute('aria-label')?.startsWith('Đẩy thông báo'))) {
      expect(c.hasAttribute('disabled')).toBe(true);
      fireEvent.click(c);
    }
    expect(gia.luuLoaiTat).not.toHaveBeenCalled();
  });

  it('thử lại đọc được → mở khoá, công tắc phản ánh lựa chọn cũ, gạt thì lưu đúng danh sách', async () => {
    gia.docLoaiTat.mockRejectedValueOnce(new Error('mạng')).mockResolvedValue(['luat_moi']);
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.queryByText(/tạm khoá các công tắc/)).toBeNull());
    const loai = screen.getAllByRole('switch').filter((x) => x.getAttribute('aria-label')?.startsWith('Đẩy thông báo'));
    const dangBat = loai.find((x) => x.getAttribute('aria-checked') === 'true')!;
    expect(dangBat.hasAttribute('disabled')).toBe(false);
    fireEvent.click(dangBat);
    await waitFor(() => expect(gia.luuLoaiTat).toHaveBeenCalledTimes(1));
    // Loại đã tắt từ trước vẫn còn trong danh sách lưu — không bị xoá.
    expect(gia.luuLoaiTat.mock.calls[0][0]).toContain('luat_moi');
  });
});
