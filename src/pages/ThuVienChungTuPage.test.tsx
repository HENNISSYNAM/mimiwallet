import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ThuVienChungTuPage from './ThuVienChungTuPage';

/** Supabase và edge function giả; dữ liệu là đầu vào của test. */
const gia = vi.hoisted(() => ({ troLy: vi.fn(), bang: {} as Record<string, unknown> }));

vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.troLy }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => {
  const chuoi = (data: unknown) => {
    const p = Promise.resolve({ data, error: null }) as Promise<unknown> & Record<string, unknown>;
    for (const k of ['select', 'eq', 'order', 'limit', 'in', 'maybeSingle']) p[k] = () => p;
    return p;
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: (bang: string) => chuoi(gia.bang[bang]),
      storage: { from: () => ({ createSignedUrls: async (ds: string[]) => ({ data: ds.map((p) => ({ path: p, signedUrl: `https://ky/${p}` })) }) }) },
    },
  };
});

beforeEach(() => {
  gia.troLy.mockReset().mockImplementation(async (h: string) => (h === 'trang_thai' ? { co_mo_hinh: false } : { ok: true }));
  gia.bang = {
    companies: { id: 'c1' },
    chung_tu_quet: [
      { id: 'q1', loai: 'hoa_don', so_hoa_don: '0001', ky_hieu: null, ngay: '2026-09-10', ben_ban: 'Công ty Đồng Tâm', ma_so_thue_ben_ban: null, tien_thue: null, tong_tien: 1_100_000, giao_dich_id: 'g1', anh_path: 'c1/q1.jpg', created_at: '2026-09-10T00:00:00Z' },
      { id: 'q2', loai: 'bien_lai', so_hoa_don: null, ky_hieu: null, ngay: '2026-09-12', ben_ban: 'Quán Ba Anh', ma_so_thue_ben_ban: null, tien_thue: null, tong_tien: 250_000, giao_dich_id: null, anh_path: null, created_at: '2026-09-12T00:00:00Z' },
    ],
    gdt_invoices: [
      { id: 'h1', invoice_number: '777', invoice_serial: 'K26', counterparty_name: 'Viettel', counterparty_tax_code: '0100109106', total_amount: 330_000, tax_amount: 30_000, issued_at: '2026-09-11T00:00:00Z' },
    ],
    transactions: [{ id: 'g1', transaction_date: '2026-09-11', counter_account_name: 'DONG TAM', merchant_name: null, amount: 1_100_000, is_synthetic: false }],
  };
});

const dung = () => render(<MemoryRouter><ThuVienChungTuPage /></MemoryRouter>);

describe('Thư viện chứng từ', () => {
  it('gộp hai nguồn, ảnh qua URL ký tạm, nói rõ chứng từ nào đã gắn khoản chi', async () => {
    dung();
    const ds = await screen.findByRole('list', { name: 'Chứng từ' });
    expect(within(ds).getAllByRole('listitem')).toHaveLength(3);
    expect((screen.getByAltText('Ảnh chứng từ Công ty Đồng Tâm') as HTMLImageElement).src).toBe('https://ky/c1/q1.jpg');
    expect(ds.textContent).toContain('Đã gắn khoản chi 11/09/2026');
    expect(ds.textContent).toContain('Chưa gắn khoản chi');
  });

  it('lọc chưa gắn khoản chi', async () => {
    dung();
    await screen.findByRole('list', { name: 'Chứng từ' });
    fireEvent.click(screen.getByRole('button', { name: /Chưa gắn khoản chi/ }));
    expect(within(screen.getByRole('list', { name: 'Chứng từ' })).getAllByRole('listitem')).toHaveLength(1);
  });

  it('xoá phải xác nhận, rồi mới gọi backend', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá chứng từ Quán Ba Anh' }));
    const hop = await screen.findByRole('alertdialog');
    expect(gia.troLy).not.toHaveBeenCalledWith('xoa_chung_tu', expect.anything());
    fireEvent.click(within(hop).getByRole('button', { name: /Xoá chứng từ/ }));
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('xoa_chung_tu', { id: 'q2' }));
  });

  it('chưa bật đọc ảnh thì nút chụp nói thật, không mở máy ảnh', async () => {
    const { toast } = await import('sonner');
    dung();
    await screen.findByRole('list', { name: 'Chứng từ' });
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('trang_thai'));
    fireEvent.click(screen.getByRole('button', { name: /Chụp chứng từ/ }));
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
  });
});
