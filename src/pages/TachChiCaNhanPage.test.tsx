import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TachChiCaNhanPage from './TachChiCaNhanPage';

/** TCCN-08 — Tách chi cá nhân. CSDL giả: dữ liệu dưới đây là đầu vào của test. */

const gia = vi.hoisted(() => ({
  gd: [] as Record<string, unknown>[],
  nhan: [] as Record<string, unknown>[],
  dem: null as number | null,
  loc: [] as { bang: string; cot: string; v: unknown }[],
  goi: vi.fn(),
  loi: vi.fn(),
}));

vi.mock('@/lib/congTyDangDung', () => ({
  idCongTyDangDung: () => Promise.resolve('cty-1'),
  congTyDangDung: () => Promise.resolve({ id: 'cty-1', ten: 'X', vai_tro: 'chu_so_huu', la_demo: false }),
}));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.goi }));
vi.mock('sonner', () => ({ toast: { error: gia.loi, success: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (bang: string) => {
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.gte = () => q;
      q.order = () => q;
      q.limit = () => q;
      q.eq = (cot: string, v: unknown) => { gia.loc.push({ bang, cot, v }); return q; };
      q.then = (ok: (v: unknown) => unknown) => Promise.resolve(
        bang === 'transactions'
          ? { data: gia.gd, error: null, count: gia.dem ?? gia.gd.length }
          : { data: gia.nhan, error: null },
      ).then(ok);
      return q;
    },
  },
}));

const gd = (id: string, amount: number, ten: string, noi_dung: string | null = null) => ({
  id, transaction_date: '2026-09-10', amount, type: amount < 0 ? 'expense' : 'income',
  merchant_name: null, counter_account_name: ten, payment_reference: noi_dung,
});

beforeEach(() => {
  gia.gd = [
    gd('g1', -2_000_000, 'CONG TY BAO BI', 'Thanh toan bao bi'),
    gd('g2', -1_500_000, 'TRUONG MAM NON HOA SEN', 'Hoc phi thang 9'),
    gd('g3', -300_000, 'NHA THUOC LONG CHAU'),
    gd('g4', 10_000_000, 'KHACH HANG X'),
  ];
  gia.nhan = [
    { transaction_id: 'g3', is_personal: true, source: 'human' },
    // Nhãn máy chưa ai xác nhận: vẫn là "chưa phân loại".
    { transaction_id: 'g1', is_personal: false, source: 'rule' },
  ];
  gia.dem = null;
  gia.loc = [];
  gia.goi.mockReset().mockResolvedValue({ ok: true });
  gia.loi.mockReset();
});

const danhSach = () => screen.findByRole('list', { name: 'Khoản chi' });

describe('Tách chi cá nhân', () => {
  it('chỉ đọc giao dịch thật của công ty đang dùng; chỉ liệt kê tiền ra', async () => {
    render(<TachChiCaNhanPage />);
    await screen.findByRole('tablist', { name: 'Lọc khoản chi' });
    expect(gia.loc).toEqual(expect.arrayContaining([
      { bang: 'transactions', cot: 'company_id', v: 'cty-1' },
      { bang: 'transactions', cot: 'is_synthetic', v: false },
    ]));
    fireEvent.click(screen.getByRole('tab', { name: 'Tất cả' }));
    expect((await danhSach()).textContent).not.toContain('KHACH HANG X');
  });

  it('tổng chia ba phần; nhãn máy chưa xác nhận vẫn tính là chưa phân loại', async () => {
    render(<TachChiCaNhanPage />);
    await danhSach();
    const tong = screen.getByLabelText('Tổng chi 90 ngày');
    expect(within(tong).getByText('Cá nhân').nextSibling?.textContent).toBe('300.000 ₫');
    expect(within(tong).getByText('Kinh doanh').nextSibling?.textContent).toBe('0 ₫');
    expect(within(tong).getByText('Chưa phân loại').nextSibling?.textContent).toBe('3.500.000 ₫');
  });

  it('gợi ý có lý do cho khoản chưa phân loại; MIMI không tự gắn nhãn', async () => {
    render(<TachChiCaNhanPage />);
    const ds = await danhSach();
    expect(ds.textContent).toContain('Có vẻ là chi cá nhân: nội dung giống học phí.');
    expect(gia.goi).not.toHaveBeenCalled();
  });

  it('bấm "Cá nhân": gọi đúng backend, khoản rời mục "Chưa phân loại", tổng cập nhật', async () => {
    render(<TachChiCaNhanPage />);
    await danhSach();
    const nhom = screen.getByRole('group', { name: /1\.500\.000 ₫ cho TRUONG MAM NON HOA SEN/ });
    fireEvent.click(within(nhom).getByRole('button', { name: 'Cá nhân' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('gan_nhan_chi', { giao_dich_id: 'g2', ca_nhan: true }));
    await waitFor(() => expect((screen.getByRole('list', { name: 'Khoản chi' })).textContent).not.toContain('TRUONG MAM NON'));
    expect(within(screen.getByLabelText('Tổng chi 90 ngày')).getByText('Cá nhân').nextSibling?.textContent).toBe('1.800.000 ₫');
  });

  it('máy chủ từ chối (vai trò chỉ xem): báo lỗi, không đổi gì trên màn hình', async () => {
    gia.goi.mockRejectedValueOnce(new Error('Vai trò Người xem không ghi được chứng từ.'));
    render(<TachChiCaNhanPage />);
    await danhSach();
    const nhom = screen.getByRole('group', { name: /1\.500\.000 ₫ cho TRUONG MAM NON HOA SEN/ });
    fireEvent.click(within(nhom).getByRole('button', { name: 'Cá nhân' }));
    await waitFor(() => expect(gia.loi).toHaveBeenCalledWith('Vai trò Người xem không ghi được chứng từ.'));
    expect(within(nhom).getByRole('button', { name: 'Cá nhân' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('bị cắt ở 1.000 giao dịch thì nói rõ tổng chưa đủ', async () => {
    gia.dem = 1500;
    render(<TachChiCaNhanPage />);
    expect((await screen.findByRole('status')).textContent).toContain('tổng ở trên chưa gồm các khoản cũ hơn');
  });

  it('nói rõ lựa chọn chưa được dùng để tính lại thuế', () => {
    render(<TachChiCaNhanPage />);
    expect(document.body.textContent).toContain('chưa được dùng để tính lại các con số thuế');
  });
});
