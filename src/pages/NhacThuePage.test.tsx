import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NhacThuePage from './NhacThuePage';
import { quenLichThue } from '@/lib/lichThue';

const gia = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: gia.invoke } } }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 15, 10, 0, 0));
  gia.invoke.mockReset();
  quenLichThue();
});
afterEach(() => vi.useRealTimers());

const dung = () => render(<MemoryRouter><NhacThuePage /></MemoryRouter>);

describe('Nhắc thuế', () => {
  /*
   * Từ 25/09/2026 trang đọc lịch CỦA CÔNG TY từ tax-summary (`_shared/luat/lich-thue.ts`), không tự
   * tính lịch chung cả nước. Test cũ khẳng định "Nộp tờ khai quý 3/2026 — còn 46 ngày" cho mọi người,
   * kể cả hộ không phải khai quý: đó chính là lỗi mâu thuẫn đã sửa.
   */
  const MOC = (o: Record<string, unknown>) => ({ khoa: 'k', loai: 'tam_nop', trang_thai: 'phai_lam', han: '2026-10-30', con_lai: 45, vi_sao: 'Doanh nghiệp tạm nộp thuế TNDN theo quý.', can_cu: [], ...o });

  it('việc kế tiếp và lịch là của chính công ty: phải làm, cần xác minh, không áp dụng', async () => {
    const tiep = MOC({ khoa: 'a', ten: 'Tạm nộp thuế TNDN quý 3/2026' });
    gia.invoke.mockResolvedValue({
      data: {
        lich: [
          tiep,
          MOC({ khoa: 'b', ten: 'Khai thuế GTGT', loai: 'khai_va_nop', trang_thai: 'can_xac_minh', han: null, con_lai: null, cau_hoi: 'Công ty đang khai thuế GTGT theo tháng hay theo quý?' }),
          MOC({ khoa: 'c', ten: 'Quyết toán thuế TNCN năm 2026', loai: 'quyet_toan', trang_thai: 'khong_ap_dung', han: '2027-03-31', con_lai: 197 }),
        ],
        mocKeTiep: tiep,
        // Cùng một phản hồi tax-summary: phần ngưỡng luôn đi kèm.
        year: 2026, basis: 'bank', revenue: 300_000_000, hasBankConnection: true, disclaimer: 'Số liệu tham khảo.',
        milestones: [{ key: 'tax_exemption', threshold: 1e9, remaining: 700_000_000, ratio: 0.3, crossed: false }],
      },
      error: null,
    });
    dung();
    expect(await screen.findByRole('heading', { name: 'Tạm nộp thuế TNDN quý 3/2026' })).toBeTruthy();
    expect(document.body.textContent).toContain('Hạn 30/10/2026');
    expect(document.body.textContent).toContain('Còn 45 ngày');
    const lich = screen.getByRole('heading', { name: 'Lịch kê khai' }).parentElement as HTMLElement;
    expect(lich.textContent).toContain('Cần xác minh');
    expect(lich.textContent).toContain('Công ty đang khai thuế GTGT theo tháng hay theo quý?');
    expect(lich.textContent).toContain('Không áp dụng');
    // Không bao giờ in ngày giả cho mốc chưa có hạn.
    expect(document.body.textContent).not.toContain('1900');
  });

  it('đọc lịch lỗi: nói thật, không tự vẽ lịch chung cả nước', async () => {
    gia.invoke.mockResolvedValue({ data: null, error: new Error('x') });
    dung();
    expect(await screen.findByText('Chưa đọc được lịch thuế. Thử lại sau ít phút.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Nộp tờ khai quý 3/2026' })).toBeNull();
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
