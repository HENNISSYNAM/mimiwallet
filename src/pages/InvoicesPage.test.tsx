import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Hồi quy 25/09/2026: tìm "MH-260903" ở ô tìm kiếm đầu trang → sang `/dashboard/invoices?q=MH-260903`
 * → trang phải hiện đúng hoá đơn đó. Số hoá đơn chỉ là dữ liệu test; logic không được biết nó.
 */
const HD = [
  { id: 'a1', invoice_number: 'MH-260903', client_name: 'Quán Cơm Bà Ba', amount: 5_000_000, vat_rate: 0, total: 5_645_000, issued_date: '2026-09-03', due_date: '2026-09-18', status: 'overdue', advanced_amount: null, is_synthetic: true },
  { id: 'b2', invoice_number: 'HD-000777', client_name: 'Công ty Sông Hồng', amount: 2_000_000, vat_rate: 0, total: 2_000_000, issued_date: '2026-09-10', due_date: '2026-10-10', status: 'pending', advanced_amount: null, is_synthetic: false },
];

const q = { select: () => q, eq: () => q, order: async () => ({ data: HD, error: null }) };
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => q } }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1' }));
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (chon: (s: unknown) => unknown) => chon({ session: { access_token: 't', user: { id: 'u' } } }),
}));
vi.mock('@/components/fintech/QrPayDialog', () => ({ QrPayDialog: () => null }));

import InvoicesPage from './InvoicesPage';

const dung = (url: string) => render(<MemoryRouter initialEntries={[url]}><InvoicesPage /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); });

describe('trang Hoá đơn — tìm theo ?q=', () => {
  it('mở từ ô tìm kiếm đầu trang: chỉ hiện đúng hoá đơn được tìm', async () => {
    dung('/dashboard/invoices?q=MH-260903');
    expect(await screen.findByText('MH-260903')).toBeTruthy();
    expect(screen.queryByText('HD-000777')).toBeNull();
  });

  it('không phân biệt hoa thường, khoảng trắng thừa, gạch nối', async () => {
    dung('/dashboard/invoices?q=%20mh260903%20');
    expect(await screen.findByText('MH-260903')).toBeTruthy();
  });

  it('tìm theo tên khách, không dấu', async () => {
    dung('/dashboard/invoices?q=song%20hong');
    expect(await screen.findByText('HD-000777')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('MH-260903')).toBeNull());
  });
});

import { useNavigate } from 'react-router-dom';
import { fireEvent } from '@testing-library/react';

/** Mô phỏng ô tìm đầu trang: đổi địa chỉ khi trang hoá đơn đang mở, không mount lại. */
function NutTimDauTrang() {
  const nav = useNavigate();
  return <button onClick={() => nav('/dashboard/invoices?q=MH-260903')}>tìm đầu trang</button>;
}

describe('trang Hoá đơn — gốc lỗi 0 kết quả', () => {
  it('đang lọc "chờ thanh toán" rồi tìm từ đầu trang: bộ lọc cũ không được nuốt hoá đơn quá hạn', async () => {
    render(<MemoryRouter initialEntries={['/dashboard/invoices?filter=pending']}><NutTimDauTrang /><InvoicesPage /></MemoryRouter>);
    expect(await screen.findByText('HD-000777')).toBeTruthy();
    expect(screen.queryByText('MH-260903')).toBeNull();
    fireEvent.click(screen.getByText('tìm đầu trang'));
    expect(await screen.findByText('MH-260903')).toBeTruthy();
  });
});
