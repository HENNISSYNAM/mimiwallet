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

const traVe = vi.hoisted(() => ({ loi: null as null | { message: string } }));
const q = {
  select: () => q, eq: () => q,
  order: async () => (traVe.loi ? { data: null, error: traVe.loi } : { data: HD, error: null }),
  // MST công ty đang dùng — khối "Kiểm tệp hoá đơn XML" so MST người mua với số này.
  maybeSingle: async () => ({ data: { tax_id: '0108888888' }, error: null }),
};
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => q } }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1' }));
vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: (chon: (s: unknown) => unknown) => chon({ session: { access_token: 't', user: { id: 'u' } } }),
}));
vi.mock('@/components/fintech/QrPayDialog', () => ({ QrPayDialog: () => null }));
const gia = vi.hoisted(() => ({ troLy: vi.fn(async (..._a: unknown[]) => ({ id: 'ct-1', canh_bao: null })) }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.troLy }));
vi.mock('@/lib/lichThue', () => ({
  useLichThue: () => ({ du: { lich: [], mocKeTiep: null, loaiNguoiNop: 'doanh_nghiep', sanSang: null, tomTat: { revenue: 300_000_000, crossedCertain: false } }, loi: false }),
}));

import InvoicesPage from './InvoicesPage';

const dung = (url: string) => render(<MemoryRouter initialEntries={[url]}><InvoicesPage /></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); traVe.loi = null; });

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

describe('trang Hoá đơn — đọc lỗi không được giả làm "chưa có hoá đơn"', () => {
  it('máy chủ lỗi → báo chưa tải được, có nút thử lại; thử lại thành công thì hiện hoá đơn', async () => {
    traVe.loi = { message: 'timeout' };
    dung('/dashboard/invoices');
    const bao = await screen.findByRole('alert');
    expect(bao.textContent).toContain('Chưa tải được danh sách hoá đơn');
    traVe.loi = null;
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(await screen.findByText('HD-000777')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

import hopLe from '@/lib/hoaDon/__mau__/hop-le.xml?raw';

describe('trang Hoá đơn — kiểm tệp hoá đơn điện tử XML (12/10/2026)', () => {
  const taiTep = async (noiDung: string, ten = 'hd.xml') => {
    const o = screen.getByLabelText('Chọn tệp hoá đơn XML') as HTMLInputElement;
    // Chờ MST công ty đọc xong để phép so người mua có số mà so.
    await new Promise((r) => setTimeout(r, 0));
    fireEvent.change(o, { target: { files: [new File([noiDung], ten, { type: 'application/xml' })] } });
  };

  it('tệp mẫu đúng: hiện kết quả kiểm, khớp MST công ty, có ô sao chép và nút mở cổng tra cứu', async () => {
    dung('/dashboard/invoices');
    await screen.findByText('HD-000777');
    await taiTep(hopLe);
    expect(await screen.findByText(/Khớp mã số thuế công ty/)).toBeTruthy();
    expect(screen.getByText(/không khẳng định chữ ký hợp lệ/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Chép Số hoá đơn' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /hoadondientu\.gdt\.gov\.vn/ }).getAttribute('href')).toBe('https://hoadondientu.gdt.gov.vn/');
  });

  it('Lưu vào chứng từ: gọi luu_chung_tu với đúng các trường đã kiểm (số nguyên đồng)', async () => {
    dung('/dashboard/invoices');
    await screen.findByText('HD-000777');
    await taiTep(hopLe);
    fireEvent.click(await screen.findByRole('button', { name: /Lưu vào chứng từ/ }));
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('luu_chung_tu', expect.objectContaining({
      loai: 'hoa_don', so_hoa_don: '123', ky_hieu: '1C26TMM', ma_so_thue_ben_ban: '0109999999', tien_thue: 41200, tong_tien: 481200,
    })));
    expect(await screen.findByRole('button', { name: /Đã lưu vào chứng từ/ })).toBeTruthy();
  });

  it('tệp có DOCTYPE: từ chối, không lưu được', async () => {
    dung('/dashboard/invoices');
    await screen.findByText('HD-000777');
    await taiTep('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY a "b">]><HDon/>');
    expect((await screen.findByRole('alert')).textContent).toMatch(/DOCTYPE/);
    expect(screen.queryByRole('button', { name: /Lưu vào chứng từ/ })).toBeNull();
  });
});

describe('trang Hoá đơn — nghĩa vụ hoá đơn điện tử', () => {
  it('doanh nghiệp: phải dùng HĐĐT có mã; câu bán lẻ chỉ đổi màn hình, nói rõ chưa lưu', async () => {
    dung('/dashboard/invoices');
    expect(await screen.findByText('Bạn có phải dùng hoá đơn điện tử không?')).toBeTruthy();
    expect(screen.getByText('Dùng hoá đơn điện tử có mã của cơ quan thuế khi bán hàng')).toBeTruthy();
    expect(screen.getByText(/MIMI chưa lưu câu trả lời này/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Có' }));
    expect(screen.getByRole('button', { name: 'Có' }).getAttribute('aria-pressed')).toBe('true');
  });
});
