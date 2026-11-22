import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const gia = vi.hoisted(() => ({
  docBang: vi.fn(), docTin: vi.fn(), giaoViec: vi.fn(), tiepTuc: vi.fn(), danhDauXong: vi.fn(), huyViec: vi.fn(),
}));
vi.mock('@/lib/goiSpace', () => gia);

import AgenticSpacePage, { cotCua, mauHan } from './AgenticSpacePage';

const CTY = '11111111-1111-4111-8111-111111111111';
const dong = (o: Record<string, unknown>) => ({
  id: 'v1', company_id: CTY, ten_khach: 'Tạp hoá Hồng', agent: 'phan_loai', tieu_de: 'Phân loại tiền vào — Tạp hoá Hồng', han: null,
  trang_thai: 'can_ban', buoc_xong: 2, buoc_tong: 4, buoc_hien_tai: 'Chờ kế toán duyệt ở hàng duyệt', viec_cha_id: 'v0',
  tin_cuoi: null, hoi: { noi_dung: 'Cần anh/chị duyệt 3 khoản ở hàng duyệt.', lien_ket: '/dashboard/van-phong' }, cap_nhat_luc: '2026-11-22T03:00:00Z', ...o,
});
const BANG = {
  khach: [{ id: CTY, ten: 'Tạp hoá Hồng' }],
  agent: [
    { agent: 'phan_loai', ten: 'Agent Phân loại', dang_lam: 0, can_ban: 1, cho_agent: 0, xong_7_ngay: 2, gan_nhat: null },
    { agent: 'thue', ten: 'Agent Thuế', dang_lam: 0, can_ban: 0, cho_agent: 1, xong_7_ngay: 0, gan_nhat: null },
  ],
  dem: { cho: 0, dang_lam: 0, cho_agent: 1, can_ban: 1, xong: 0, huy: 0 },
  viec: [
    dong({}),
    dong({ id: 'v0', agent: 'thue', tieu_de: 'Chốt quý 4 cho Tạp hoá Hồng', trang_thai: 'cho_agent', hoi: null, viec_cha_id: null, buoc_xong: 1,
      tin_cuoi: { tu: 'thue', noi_dung: 'Còn 3 khoản chưa phân loại. Nhờ Agent Phân loại.', luc: '' } }),
  ],
};

const ve = () => render(<MemoryRouter><AgenticSpacePage /></MemoryRouter>);

describe('Agentic AI Space', () => {
  beforeEach(() => { Object.values(gia).forEach((f) => f.mockReset()); gia.docBang.mockResolvedValue(BANG); });

  it('ba cột, "Cần bạn" đầu; thẻ cần người có câu hỏi + lối đi + nút; thẻ chờ agent nói rõ chờ ai', async () => {
    ve();
    const can = await screen.findByTestId('cot-can_ban');
    expect(within(can).getByText('Phân loại tiền vào — Tạp hoá Hồng')).toBeTruthy();
    expect(within(can).getByRole('link', { name: /Mở hàng duyệt/ }).getAttribute('href')).toBe('/dashboard/van-phong');
    expect(within(can).getByText(/2\/4 bước · Chờ kế toán duyệt/)).toBeTruthy();
    const dang = screen.getByTestId('cot-dang_lam');
    expect(within(dang).getByText(/đang chờ Agent Phân loại/)).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.replace(/\d+$/, '').trim())).toEqual(['Cần bạn', 'Agent đang làm', 'Xong'].map((x) => expect.stringContaining(x)));
  });

  it('giao việc bằng một câu: gửi đúng khách + câu, rồi mở luồng tin', async () => {
    gia.giaoViec.mockResolvedValue('moi');
    gia.docTin.mockResolvedValue({ viec: { tieu_de: 'Chốt quý 4', ten_khach: 'Tạp hoá Hồng', trang_thai: 'cho_agent' }, tin: [
      { id: 1, tu: 'nguoi', den: 'thue', loai: 'giao_viec', noi_dung: 'Chốt quý 4', lien_ket: null, luc: '' },
      { id: 2, tu: 'thue', den: 'phan_loai', loai: 'giao_viec', noi_dung: 'Nhờ Agent Phân loại xử lý', lien_ket: null, luc: '' },
    ] });
    ve();
    await screen.findByTestId('cot-can_ban');
    fireEvent.change(screen.getByLabelText('Mô tả việc'), { target: { value: 'Chốt quý 4' } });
    fireEvent.click(screen.getByRole('button', { name: /Giao việc/ }));
    await waitFor(() => expect(gia.giaoViec).toHaveBeenCalledWith({ company_id: CTY, cau: 'Chốt quý 4', han: null }));
    const luong = await screen.findByRole('complementary', { name: 'Luồng tin của việc' });
    expect(await within(luong).findByText('Agent Thuế → Agent Phân loại')).toBeTruthy();
  });

  it('Tiếp tục / Đánh dấu xong gọi máy chủ rồi tải lại', async () => {
    gia.tiepTuc.mockResolvedValue(undefined);
    gia.danhDauXong.mockResolvedValue(undefined);
    ve();
    const can = await screen.findByTestId('cot-can_ban');
    fireEvent.click(within(can).getByRole('button', { name: /Tiếp tục/ }));
    await waitFor(() => expect(gia.tiepTuc).toHaveBeenCalledWith('v1'));
    fireEvent.click(within(can).getByRole('button', { name: /Đánh dấu xong/ }));
    await waitFor(() => expect(gia.danhDauXong).toHaveBeenCalledWith('v1'));
    expect(gia.docBang.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('lỗi máy chủ hiện ra', async () => {
    gia.docBang.mockRejectedValue(new Error('Phiên đăng nhập đã hết. Đăng nhập lại.'));
    ve();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Đăng nhập lại/);
  });

  it('màu hạn và cột', () => {
    expect(mauHan('2026-11-20', '2026-11-22')).toMatchObject({ lop: 'text-red-600', chu: 'Quá hạn 2 ngày' });
    expect(mauHan('2026-11-25', '2026-11-22')).toMatchObject({ lop: 'text-orange-600', chu: 'Còn 3 ngày' });
    expect(mauHan('2027-01-31', '2026-11-22')).toMatchObject({ lop: 'text-muted-foreground', chu: 'Hạn 31/01/2027' });
    expect(mauHan(null)).toBeNull();
    expect([cotCua('cho'), cotCua('cho_agent'), cotCua('dang_lam'), cotCua('can_ban'), cotCua('xong')]).toEqual(['dang_lam', 'dang_lam', 'dang_lam', 'can_ban', 'xong']);
  });
});
