import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Hồi quy 29/09/2026 (rà soát Codex):
 *  - Đọc giao dịch lỗi từng chỉ bật một thông báo rồi vẫn dựng báo cáo — lỗi ở trang đầu thì màn hình
 *    nói "chưa có giao dịch nào", y như công ty chưa có dữ liệu.
 *  - Tổng vượt Number.MAX_SAFE_INTEGER bị lệch đồng lẻ khi cộng bằng Number.
 * Số liệu dưới đây chỉ là đầu vào test.
 */
const may = vi.hoisted(() => ({
  gd: [] as Record<string, unknown>[],
  hd: [] as Record<string, unknown>[],
  loiGd: null as null | { message: string },
  csv: vi.fn(),
}));

function bang(ten: string) {
  let tu = 0;
  let den = 0;
  const q = {
    select: () => q,
    eq: () => q,
    order: () => q,
    range: (a: number, b: number) => { tu = a; den = b; return q; },
    then: (xong: (v: unknown) => unknown, hong?: (e: unknown) => unknown) => {
      const du = ten === 'transactions' ? may.gd : may.hd;
      const kq = ten === 'transactions' && may.loiGd
        ? { data: null, error: may.loiGd, count: null }
        : { data: du.slice(tu, den + 1), error: null, count: du.length };
      return Promise.resolve(kq).then(xong, hong);
    },
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (ten: string) => bang(ten) } }));
vi.mock('@/lib/nguoiDung', () => ({ nguoiDungHienTai: async () => ({ id: 'u' }) }));
vi.mock('@/lib/congTyDangDung', () => ({ congTyDangDung: async () => ({ id: 'cty-1', la_demo: false }) }));
vi.mock('@/lib/csv', () => ({ taiCsv: may.csv }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

import ReportsPage from './ReportsPage';

const dung = () => render(<MemoryRouter><ReportsPage /></MemoryRouter>);
const gd = (amount: number, type: string, ngay: string) => ({ amount, type, transaction_date: ngay, category: null, is_synthetic: false });

beforeEach(() => {
  // jsdom không có ResizeObserver; ResponsiveContainer của recharts cần nó để dựng.
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  may.gd = [];
  may.hd = [];
  may.loiGd = null;
  may.csv.mockReset();
});

describe('Báo cáo dòng tiền', () => {
  it('đọc giao dịch lỗi → nói là lỗi đọc, KHÔNG nói "chưa có giao dịch"; thử lại được', async () => {
    may.loiGd = { message: 'timeout' };
    dung();
    const bao = await screen.findByRole('alert');
    expect(bao.textContent).toContain('Chưa đọc được giao dịch');
    expect(screen.queryByText(/Chưa có giao dịch nào/)).toBeNull();
    expect(screen.getByRole('button', { name: /fin\.reports\.export/ })).toBeDisabled();

    may.loiGd = null;
    may.gd = [gd(1_000_000, 'income', '2026-09-01')];
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(await screen.findByText(/không phải doanh thu/)).toBeTruthy();
    expect(screen.queryByText('Chưa đọc được giao dịch, nên chưa dựng báo cáo.')).toBeNull();
  });

  it('giải ngân vay 100 tỷ: hiện là tiền vào, kèm câu nói rõ tiền vào không phải doanh thu', async () => {
    may.gd = [gd(100_000_000_000, 'income', '2026-09-01')];
    dung();
    expect(await screen.findByText(/Tiền vào gồm cả tiền vay/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /fin\.reports\.export/ }));
    const [, cot, dong] = may.csv.mock.calls[0];
    expect(cot).toEqual(['thang', 'tien_vao_ngan_hang', 'tien_ra_ngan_hang', 'chenh_lech_dong_tien']);
    expect(dong[0]).toEqual(['2026-09', 100_000_000_000, 0, 100_000_000_000]);
  });

  it('tổng vượt MAX_SAFE_INTEGER: tệp xuất ra đúng tới đồng', async () => {
    may.gd = [gd(Number.MAX_SAFE_INTEGER, 'income', '2026-09-01'), gd(2, 'income', '2026-09-02')];
    dung();
    await screen.findByText(/Tiền vào gồm cả tiền vay/);
    fireEvent.click(screen.getByRole('button', { name: /fin\.reports\.export/ }));
    expect(may.csv.mock.calls[0][2][0]).toEqual(['2026-09', '9007199254740993', 0, '9007199254740993']);
  });
});
