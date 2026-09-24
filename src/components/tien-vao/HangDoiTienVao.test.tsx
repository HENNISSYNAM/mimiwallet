import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render as renderGoc, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';

const render = (ui: ReactElement) => renderGoc(<MemoryRouter>{ui}</MemoryRouter>);
import { lapBangTienVao, type TienVao } from '../../../supabase/functions/_shared/doanh-thu/phan-loai';

/*
 * Bảng tiền vào dựng bằng đúng hàm máy chủ dùng. Câu chuyện của cửa hàng minh hoạ: bán lẻ, một
 * khoản vay, tiền con gửi. Mọi con số là đầu vào của test.
 */
const gia = vi.hoisted(() => ({ goi: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: gia.goi }));
vi.mock('sonner', () => ({ toast: gia.toast }));

import { HangDoiTienVao } from './HangDoiTienVao';

const nam = new Date().getFullYear();
const vao = (id: string, amount: number, merchant_name: string, counter_account_name: string | null = null): TienVao =>
  ({ id, amount, transaction_date: `${nam}-03-08`, merchant_name, counter_account_name, payment_reference: null });
const BANG = lapBangTienVao(nam, [
  vao('ban1', 900_000, 'KHACH LE CK THANH TOAN DON 1523', 'KHACH LE'),
  vao('ban2', 700_000, 'KHACH LE CK THANH TOAN DON 1524', 'KHACH LE'),
  vao('vay', 200_000_000, 'GIAI NGAN HDTD 0126', 'NGAN HANG TMCP'),
], [], new Set());

beforeEach(() => {
  gia.goi.mockReset();
  gia.toast.success.mockReset();
  gia.goi.mockImplementation(async (h: string) => (h === 'tien_vao' ? BANG : { ok: true, so: 1, bulk_group_id: null }));
});

describe('hàng đợi tiền vào trên Tổng quan', () => {
  it('nói MIMI đã đọc gì, bao nhiêu chưa ai xác nhận, và mời xem khoản đáng ngờ', async () => {
    render(<HangDoiTienVao />);
    expect(await screen.findByText(/Đã đọc 3 khoản tiền vào/)).toBeTruthy();
    expect(screen.getByText(/201.600.000đ chưa ai xác nhận/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Xem 1 khoản cần xem/ })).toBeTruthy();
  });

  it('khoản vay: gợi ý của MIMI là nút chính, một chạm là xác nhận', async () => {
    render(<HangDoiTienVao />);
    fireEvent.click(await screen.findByRole('button', { name: /Xem 1 khoản cần xem/ }));
    expect(screen.getByText(/Trông giống tiền vay/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đúng, là tiền vay' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('xac_nhan_tien_vao', { transaction_ids: ['vay'], loai: 'loan' }));
  });

  it('nhóm hai khoản cùng người chuyển: áp một lần cho cả nhóm', async () => {
    render(<HangDoiTienVao />);
    fireEvent.click(await screen.findByRole('button', { name: /Xem 1 khoản cần xem/ }));
    expect(screen.getByText(/2 khoản từ KHACH LE/)).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Tiền bán hàng' })[1]);
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('xac_nhan_tien_vao', { transaction_ids: ['ban1', 'ban2'], loai: 'business_revenue' }));
  });

  it('"Không phải tiền bán hàng" mở danh sách loại; "Tôi chưa chắc" là một câu trả lời hợp lệ', async () => {
    render(<HangDoiTienVao />);
    fireEvent.click(await screen.findByRole('button', { name: /Xem 1 khoản cần xem/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /Không phải tiền bán hàng/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Thu hộ' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('xac_nhan_tien_vao', { transaction_ids: ['vay'], loai: 'collection_on_behalf' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Tôi chưa chắc' })[0]);
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('xac_nhan_tien_vao', { transaction_ids: ['vay'], loai: 'unknown' }));
  });

  it('sau khi xác nhận có nút Hoàn tác', async () => {
    render(<HangDoiTienVao />);
    fireEvent.click(await screen.findByRole('button', { name: /Xem 1 khoản cần xem/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Đúng, là tiền vay' }));
    await waitFor(() => expect(gia.toast.success).toHaveBeenCalled());
    const { action } = gia.toast.success.mock.calls[0][1] as { action: { label: string; onClick: () => void } };
    expect(action.label).toBe('Hoàn tác');
    action.onClick();
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('hoan_tac_tien_vao', { transaction_id: 'vay' }));
  });

  it('chưa có giao dịch: nói cách bắt đầu, không nói "chưa có dữ liệu" trống trơn', async () => {
    gia.goi.mockResolvedValue(lapBangTienVao(nam, [], [], new Set()));
    render(<HangDoiTienVao />);
    expect(await screen.findByRole('link', { name: 'Tải sao kê lên' })).toBeTruthy();
  });
});
