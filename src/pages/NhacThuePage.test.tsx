import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NhacThuePage from './NhacThuePage';

const gia = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: gia.invoke } } }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 10, 0, 0));
  gia.invoke.mockReset();
});
afterEach(() => vi.useRealTimers());

const dung = () => render(<MemoryRouter><NhacThuePage /></MemoryRouter>);

describe('Nhắc thuế', () => {
  it('hạn tờ khai quý 3/2026 là 31/10/2026, còn 46 ngày; lịch 4 kỳ liên tiếp', async () => {
    gia.invoke.mockResolvedValue({ data: null, error: new Error('x') });
    dung();
    expect(screen.getByRole('heading', { name: 'Nộp tờ khai quý 3/2026' })).toBeTruthy();
    expect(document.body.textContent).toContain('Hạn 31/10/2026');
    expect(document.body.textContent).toContain('Còn 46 ngày');
    const lich = screen.getByRole('heading', { name: 'Lịch kê khai' }).parentElement as HTMLElement;
    expect(lich.textContent).toContain('Tờ khai quý 2/2027');
    // Không đọc được doanh thu thì nói thật, không vẽ thanh tiến độ giả.
    expect(await screen.findByText('Chưa đọc được doanh thu năm. Thử lại sau ít phút.')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('ngưỡng doanh thu từ tax-summary, có nguồn văn bản và lời miễn trừ', async () => {
    gia.invoke.mockResolvedValue({
      data: {
        year: 2026, basis: 'gdt', revenue: 1_200_000_000, hasBankConnection: true, disclaimer: 'Số liệu tham khảo.',
        milestones: [
          { key: 'tax_exemption', threshold: 1e9, remaining: -200_000_000, ratio: 1.2, crossed: true },
          { key: 'profit_method_required', threshold: 3e9, remaining: 1_800_000_000, ratio: 0.4, crossed: false },
        ],
      },
      error: null,
    });
    dung();
    expect(await screen.findByText(/Đã vượt 200\.000\.000/)).toBeTruthy();
    expect(document.body.textContent).toContain('theo hoá đơn điện tử đã phát hành');
    expect(document.body.textContent).toContain('Nguồn: Luật Thuế thu nhập cá nhân số 109/2025/QH15');
    expect(document.body.textContent).toContain('Số liệu tham khảo.');
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });
});
