import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const gia = vi.hoisted(() => ({
  goiSoatBill: vi.fn(),
  noi: vi.fn(() => true),
}));

vi.mock('@/lib/quayTin', () => ({
  goiSoatBill: gia.goiSoatBill,
  nenAnh: vi.fn(async () => ({ base64: 'QUJD', mime: 'image/jpeg' })),
}));
vi.mock('@/lib/loa', () => ({
  noi: gia.noi, coGiongViet: () => true, khiCoGiong: () => () => {}, loaDangTat: () => false, datLoa: vi.fn(),
}));

import QuayTinPage from './QuayTinPage';

const ca = (o: Record<string, unknown> = {}) => ({
  id: 'c1', ban_id: null, den: 'vang', ly_do: 'dang_cho', cau_noi: 'Đang chờ ngân hàng báo một trăm năm mươi nghìn. Chưa giao hàng.',
  so_tien: 150000, thuc_te: null, giao_dich_id: null, nha_cung_cap: 'bedrock', mo_hinh: 'x', do_tre_ms: 2100,
  bat_dau: new Date().toISOString(), quyet: null, quyet_luc: null, ly_do_quyet: null, created_at: new Date().toISOString(),
  doc: { la_bill: true, so_tien: 150000, tk_nhan_cuoi: '8899', thoi_diem: null }, ...o,
});
const homNay = (o: Record<string, unknown> = {}) => ({ ca: [], hang_cho: [], dem: {}, duoc_quyet: true, la_demo: true, ...o });

describe('Quầy Tin', () => {
  beforeEach(() => { gia.goiSoatBill.mockReset(); gia.noi.mockClear(); });

  it('chụp bill → vàng, đọc to; tự hỏi lại → xanh, đọc câu mới', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    gia.goiSoatBill.mockImplementation(async (h: string) => {
      if (h === 'hom_nay') return homNay();
      if (h === 'soat') return { ca: ca(), so_lan_chup_anh_nay: 1 };
      if (h === 'kiem_lai') return { ca: ca({ den: 'xanh', ly_do: 'khop_so_tien', cau_noi: 'Đã nhận một trăm năm mươi nghìn.', thuc_te: 150000 }) };
      return {};
    });
    const { container } = render(<MemoryRouter><QuayTinPage /></MemoryRouter>);
    const input = container.querySelector('input[type=file]') as HTMLInputElement;
    expect(input.getAttribute('capture')).toBe('environment');
    fireEvent.change(input, { target: { files: [new File(['x'], 'bill.jpg', { type: 'image/jpeg' })] } });
    await screen.findByText(/Đang chờ ngân hàng báo/);
    expect(gia.goiSoatBill).toHaveBeenCalledWith('soat', { anh_base64: 'QUJD', mime: 'image/jpeg' });
    expect(gia.noi).toHaveBeenCalledWith(expect.stringContaining('Đang chờ'));
    await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
    await screen.findByText('Đã nhận một trăm năm mươi nghìn.');
    expect(gia.noi).toHaveBeenLastCalledWith('Đã nhận một trăm năm mươi nghìn.');
    expect(screen.getByText(/ảnh bill không bao giờ tự làm đèn xanh/)).toBeTruthy();
    vi.useRealTimers();
  });

  it('hàng chờ: cho qua gửi lý do; người không có quyền không thấy nút', async () => {
    const cho = ca({ id: 'c9', den: 'do', ly_do: 'chua_thay_tien', cau_noi: 'Chưa thấy năm trăm nghìn về tài khoản nào của quán. Đừng giao hàng.' });
    gia.goiSoatBill.mockImplementation(async (h: string) => (h === 'hom_nay' ? homNay({ hang_cho: [cho], ca: [cho], dem: { do: 1 } }) : { ca: cho }));
    render(<MemoryRouter><QuayTinPage /></MemoryRouter>);
    const o = await screen.findByPlaceholderText(/Lý do/);
    fireEvent.change(o, { target: { value: 'đã thấy trong app MB' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đã kiểm, cho qua' }));
    await waitFor(() => expect(gia.goiSoatBill).toHaveBeenCalledWith('quyet', { id: 'c9', quyet: 'cho_qua', ly_do: 'đã thấy trong app MB' }));
  });

  it('không có nút nào chuyển tiền', async () => {
    gia.goiSoatBill.mockResolvedValue(homNay({ la_demo: false }));
    render(<MemoryRouter><QuayTinPage /></MemoryRouter>);
    await waitFor(() => expect(gia.goiSoatBill).toHaveBeenCalled());
    for (const b of screen.getAllByRole('button')) expect(b.textContent ?? '').not.toMatch(/chuyển tiền|thanh toán ngay/i);
    expect(screen.queryByText(/giả lập/i)).toBeNull();
  });
});
