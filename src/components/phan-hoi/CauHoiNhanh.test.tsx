import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const gia = vi.hoisted(() => ({ gui: vi.fn() }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1' }));
vi.mock('@/lib/phanHoi', async (goc) => ({ ...(await goc<typeof import('@/lib/phanHoi')>()), guiPhanHoi: gia.gui }));

import { CauHoiNhanh } from './CauHoiNhanh';

const dung = () => render(
  <CauHoiNhanh cauHoi="doanh_thu_dung" cau="Con số doanh thu này có đúng như bạn nghĩ không?"
    luaChon={[{ gia: 'dung', nhan: 'Đúng' }, { gia: 'cao_hon_thuc_te', nhan: 'Cao hơn thực tế', hoiThem: true }]} />,
);

beforeEach(() => { gia.gui.mockReset().mockResolvedValue(true); localStorage.clear(); });

describe('câu hỏi tại điểm chạm (học Filum)', () => {
  it('trả lời tốt: gửi ngay, cảm ơn, không hỏi lại lần sau', async () => {
    const { unmount } = dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Đúng' }));
    expect(gia.gui).toHaveBeenCalledWith('doanh_thu_dung', { tra_loi: 'dung', diem: null, ghi_chu: null });
    expect(screen.getByRole('status').textContent).toContain('Cảm ơn');
    unmount();
    dung();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText(/Con số doanh thu này/)).toBeNull();
  });

  it('trả lời chưa tốt: hỏi thêm "vướng ở đâu" rồi mới gửi kèm ghi chú', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Cao hơn thực tế' }));
    expect(gia.gui).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Vướng ở đâu/), { target: { value: 'Có khoản vay bị tính vào' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(gia.gui).toHaveBeenCalledWith('doanh_thu_dung', { tra_loi: 'cao_hon_thuc_te', diem: null, ghi_chu: 'Có khoản vay bị tính vào' }));
  });

  it('bỏ qua: không gửi gì, không hỏi lại', async () => {
    const { unmount } = dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ qua câu hỏi' }));
    expect(gia.gui).not.toHaveBeenCalled();
    unmount();
    dung();
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.queryByText(/Con số doanh thu này/)).toBeNull();
  });
});
