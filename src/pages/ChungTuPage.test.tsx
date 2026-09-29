import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Hồi quy 29/09/2026:
 *  - Doanh thu năm ở khối "chọn cách tính thuế" từng là TỔNG MỌI TIỀN VÀO — giải ngân vay 100 tỷ thành
 *    100 tỷ doanh thu. Giờ lấy từ `tax-summary` (cùng số với Đồng hồ ngưỡng).
 *  - Đọc lỗi từng chỉ bật thông báo rồi hiện "chi phí chưa có giấy tờ: 0 ₫" và khuyên trên doanh thu 0.
 * Số liệu chỉ là đầu vào test.
 */
const may = vi.hoisted(() => ({
  gd: [] as Record<string, unknown>[],
  loiGd: null as null | { message: string },
  doanhThu: { ok: true, body: { revenue: 1_500_000_000 } as Record<string, unknown> },
}));

function bang(ten: string) {
  const q: Record<string, unknown> = {};
  for (const f of ['select', 'eq', 'gte', 'lte', 'order']) q[f] = () => q;
  q.range = async () => {
    if (ten === 'transactions') return may.loiGd ? { data: null, error: may.loiGd } : { data: may.gd, error: null };
    return { data: [], error: null };
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (ten: string) => bang(ten),
    auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) },
  },
}));
vi.mock('@/lib/nguoiDung', () => ({ nguoiDungHienTai: async () => ({ id: 'u' }) }));
vi.mock('@/lib/congTyDangDung', () => ({ congTyDangDung: async () => ({ id: 'cty-1', la_demo: false }) }));

import ChungTuPage from './ChungTuPage';

const dung = () => render(<MemoryRouter><ChungTuPage /></MemoryRouter>);

beforeEach(() => {
  may.gd = [];
  may.loiGd = null;
  may.doanhThu = { ok: true, body: { revenue: 1_500_000_000 } };
  globalThis.fetch = vi.fn(async () => ({
    ok: may.doanhThu.ok,
    status: may.doanhThu.ok ? 200 : 500,
    json: async () => may.doanhThu.body,
  })) as unknown as typeof fetch;
});

describe('Chứng từ chi phí — doanh thu năm và lỗi đọc', () => {
  it('doanh thu năm lấy từ tax-summary, KHÔNG cộng mọi tiền vào (khoản vay 100 tỷ không thành doanh thu)', async () => {
    may.gd = [{ id: 'v', amount: 100_000_000_000, type: 'income', transaction_date: '2026-08-01', merchant_name: null, payment_reference: 'GIAI NGAN HDTD', counter_account_name: null, is_synthetic: false }];
    dung();
    expect(await screen.findByText(/Doanh thu 1\.500\.000\.000\s₫/)).toBeTruthy();
    expect(screen.queryByText(/100\.000\.000\.000/)).toBeNull();
    const url = String((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(url).toContain('/functions/v1/tax-summary?year=');
    expect(url).toContain('company_id=cty-1');
  });

  it('không tính được doanh thu năm → không đưa lời khuyên cách tính thuế', async () => {
    may.doanhThu = { ok: false, body: { error: 'máy chủ bận' } };
    dung();
    const bao = await screen.findByText(/Chưa tính được doanh thu/);
    expect(bao.textContent).toContain('máy chủ bận');
    expect(screen.queryByText(/Doanh thu .* nằm trong nhóm/)).toBeNull();
  });

  it('đọc giao dịch lỗi → nói là lỗi đọc, không hiện "chi phí chưa có giấy tờ"', async () => {
    may.loiGd = { message: 'timeout' };
    dung();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Chưa đọc được giao dịch hoặc chứng từ'));
    expect(screen.queryByText('Chi phí chưa có giấy tờ trong quý này')).toBeNull();
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy();
  });
});
