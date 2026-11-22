import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const gia = vi.hoisted(() => ({ ds: vi.fn(), tao: vi.fn(), bang: vi.fn(), id: vi.fn() }));
vi.mock('@/lib/goiQuyTrinh', () => ({ dsQuyTrinh: gia.ds, taoQuyTrinh: gia.tao }));
vi.mock('@/lib/goiSpace', () => ({ docBang: gia.bang }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: gia.id }));

import AgenticSpacePage, { MAU_LINH_VUC } from './AgenticSpacePage';

const CTY = '11111111-1111-4111-8111-111111111111';
const ve = () => render(<MemoryRouter initialEntries={['/dashboard/space']}><Routes>
  <Route path="/dashboard/space" element={<AgenticSpacePage />} />
  <Route path="/dashboard/space/:id" element={<p>khung vẽ</p>} />
</Routes></MemoryRouter>);

describe('Agentic AI Space — danh sách workflow', () => {
  beforeEach(() => {
    Object.values(gia).forEach((f) => f.mockReset());
    gia.id.mockResolvedValue(CTY);
    gia.bang.mockResolvedValue({ khach: [{ id: CTY, ten: 'Tạp hoá Hồng' }], agent: [{ agent: 'phan_loai', ten: 'Agent Phân loại', dang_lam: 0, can_ban: 0, cho_agent: 0, xong_7_ngay: 0 }], viec: [], dem: {} });
    gia.ds.mockResolvedValue([{ id: 'q1', company_id: CTY, ten_khach: 'Tạp hoá Hồng', tieu_de: 'Thanh toán nhà cung cấp qua agent', linh_vuc: 'thanh_toan', nguon: 'mau', phuong_an: 'nguoi_ai', trang_thai: 'nhap', cap_nhat_luc: '', dem: { agent: 4, nguoi: 1, duyet: 2, can_ket_noi: 1, tong: 7 } }]);
  });

  it('6 mẫu theo lĩnh vực; bấm mẫu điền câu; danh sách workflow có số bước', async () => {
    ve();
    const mau = screen.getByRole('region', { name: 'Mẫu theo lĩnh vực' });
    expect(within(mau).getAllByRole('button')).toHaveLength(MAU_LINH_VUC.length);
    fireEvent.click(within(mau).getByText('Bảo mật'));
    expect((screen.getByLabelText('Mô tả việc') as HTMLTextAreaElement).value).toMatch(/đổi số tài khoản/);
    expect(await screen.findByText('Thanh toán nhà cung cấp qua agent')).toBeTruthy();
    expect(screen.getByText('agent 4 · người 1 · duyệt 2')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Agent Phân loại/ })).toBeTruthy();
  });

  it('dựng workflow: gửi đúng công ty + câu, mở khung vẽ', async () => {
    gia.tao.mockResolvedValue('q-moi');
    ve();
    await screen.findByText('Thanh toán nhà cung cấp qua agent');
    fireEvent.change(screen.getByLabelText('Mô tả việc'), { target: { value: 'Trả tiền NCC tuần này' } });
    fireEvent.click(screen.getByRole('button', { name: /Dựng workflow/ }));
    await waitFor(() => expect(gia.tao).toHaveBeenCalledWith(CTY, 'Trả tiền NCC tuần này'));
    expect(await screen.findByText('khung vẽ')).toBeTruthy();
  });

  it('lỗi máy chủ hiện ra', async () => {
    gia.ds.mockRejectedValue(new Error('Phiên đăng nhập đã hết. Đăng nhập lại.'));
    ve();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Đăng nhập lại/);
  });
});
