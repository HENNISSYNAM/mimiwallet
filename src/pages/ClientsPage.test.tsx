import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

/*
 * Hồi quy 25/09/2026, trang Khách hàng:
 *   - lỗi tải từng hiện "Chưa có khách hàng nào" — người dùng tưởng mất danh bạ;
 *   - bảng `clients` không có đường ghi nào trong app — danh bạ trống vĩnh viễn, không lối ra.
 */
const trangThai: { data: unknown[] | null; error: { message: string } | null } = { data: [], error: null };
const daGhi: unknown[] = [];
const q = {
  select: () => q,
  eq: () => q,
  order: async () => ({ ...trangThai }),
  insert: async (dong: unknown) => { daGhi.push(dong); return { error: null }; },
};
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => q, functions: { invoke: vi.fn() } } }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1' }));
// Một object phiên cố định: trang tải lại khi `session` đổi, như ở ứng dụng thật.
const PHIEN = { session: { access_token: 't', user: { id: 'u' } } };
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (chon: (s: unknown) => unknown) => chon(PHIEN),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import ClientsPage from './ClientsPage';

beforeEach(() => {
  trangThai.data = [];
  trangThai.error = null;
  daGhi.length = 0;
});

describe('trang Khách hàng', () => {
  it('lỗi tải: nói là lỗi và cho thử lại, KHÔNG nói danh bạ trống', async () => {
    trangThai.data = null;
    trangThai.error = { message: 'permission denied for table clients' };
    render(<ClientsPage />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Thử lại')).toBeTruthy();
    expect(screen.queryByText('Chưa có khách hàng nào trong danh bạ.')).toBeNull();
    // Thông điệp kỹ thuật của CSDL không ra màn hình.
    expect(document.body.textContent).not.toContain('permission denied');
  });

  it('danh bạ trống thật: nói vì sao nên thêm và có nút thêm khách đầu tiên', async () => {
    render(<ClientsPage />);
    expect(await screen.findByText('Chưa có khách hàng nào trong danh bạ.')).toBeTruthy();
    expect(screen.getByText(/Thêm khách đầu tiên/)).toBeTruthy();
  });

  it('thêm khách: ghi đúng công ty, tên đã gọn khoảng trắng, mã số thuế đã chuẩn hoá', async () => {
    render(<ClientsPage />);
    fireEvent.click(await screen.findByText(/Thêm khách đầu tiên/));
    fireEvent.change(screen.getByLabelText('Tên khách'), { target: { value: '  Công ty   Sông Hồng ' } });
    fireEvent.change(screen.getByLabelText('Mã số thuế (không bắt buộc)'), { target: { value: '0101 234 567' } });
    fireEvent.click(screen.getByText('Lưu'));
    await waitFor(() => expect(daGhi).toEqual([{ company_id: 'cty-1', name: 'Công ty Sông Hồng', tax_code: '0101234567' }]));
  });

  it('mã số thuế sai hình dạng: không ghi', async () => {
    render(<ClientsPage />);
    fireEvent.click(await screen.findByText(/Thêm khách đầu tiên/));
    fireEvent.change(screen.getByLabelText('Tên khách'), { target: { value: 'Khách A' } });
    fireEvent.change(screen.getByLabelText('Mã số thuế (không bắt buộc)'), { target: { value: '12345' } });
    fireEvent.click(screen.getByText('Lưu'));
    await new Promise((r) => setTimeout(r, 20));
    expect(daGhi).toEqual([]);
  });
});
