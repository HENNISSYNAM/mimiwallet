import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Sao kê mẫu dựng theo kiểu cột thường gặp (tiêu đề phụ, số tài khoản ở đầu, hai cột ghi nợ/ghi
 * có). Không phải bản sao sao kê của ngân hàng nào; số liệu là đầu vào của test.
 */
const gia = vi.hoisted(() => ({ goi: vi.fn() }));
vi.mock('@/lib/saoKe', async (goc) => ({ ...(await goc<typeof import('@/lib/saoKe')>()), goiSaoKe: gia.goi }));

import { NhapSaoKe } from './NhapSaoKe';

const CSV = [
  'SAO KE TAI KHOAN',
  'So tai khoan: 0123 456 789',
  'Ngày giao dịch;Số tiền ghi nợ;Số tiền ghi có;Nội dung chi tiết',
  '05/08/2026;;900.000;KHACH LE CK THANH TOAN DON 1523',
  '06/08/2026;8.000.000;;TT TIEN HANG RAU CU',
  '07/08/2026;;200.000.000;GIAI NGAN HDTD 0126',
].join('\n');

const chon = () => {
  render(<MemoryRouter><NhapSaoKe /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Chọn tệp sao kê'), { target: { files: [new File([CSV], 'saoke-thang8.csv', { type: 'text/csv' })] } });
};

beforeEach(() => gia.goi.mockReset());

describe('tải sao kê lên', () => {
  it('tự nhận cột, tự đọc số tài khoản, xem trước trước khi nhập', async () => {
    chon();
    expect(await screen.findByRole('button', { name: /Nhập 3 giao dịch/ })).toBeTruthy();
    expect(screen.getByText(/2 khoản tiền vào \(200\.900\.000đ\), 1 khoản tiền ra \(8\.000\.000đ\)/)).toBeTruthy();
    expect((screen.getByLabelText('Số tài khoản của sao kê') as HTMLInputElement).value).toBe('0123456789');
  });

  it('nhập: gửi dòng đã đọc cho máy chủ, báo số dòng mới và trùng', async () => {
    gia.goi.mockResolvedValue({ import_id: 'i1', moi: 2, trung: 1, so_hong: 0 });
    chon();
    fireEvent.click(await screen.findByRole('button', { name: /Nhập 3 giao dịch/ }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('nhap', expect.objectContaining({
      tai_khoan: '0123456789', ten_tep: 'saoke-thang8.csv', import_id: null,
      dong: expect.arrayContaining([expect.objectContaining({ transaction_date: '2026-08-07', amount: 200_000_000, type: 'income' })]),
    })));
    expect(await screen.findByText(/Đã thêm 2 giao dịch mới, bỏ qua 1 dòng đã có/)).toBeTruthy();
  });

  it('tệp .xls cũ: nói cách lưu lại, không đoán', async () => {
    render(<MemoryRouter><NhapSaoKe /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Chọn tệp sao kê'), { target: { files: [new File(['x'], 'cu.xls')] } });
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Lưu thành');
  });
});
