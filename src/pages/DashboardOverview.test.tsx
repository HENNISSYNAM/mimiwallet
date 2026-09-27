import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Tổng quan đọc một năm giao dịch. PostgREST cắt ở 1000 dòng mỗi lần: đọc một phát là doanh nghiệp
 * 1.500 giao dịch thấy tổng thu chi thiếu mà không có lỗi nào. Và đọc lỗi từng hiện thành toàn số 0.
 * Dữ liệu ở đây là số giả cho test.
 */
const gia = vi.hoisted(() => ({ soGd: 0, loiGd: null as null | { message: string }, khoang: [] as Array<[number, number]> }));

function bangGd() {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'order']) q[m] = () => q;
  q.range = async (a: number, b: number) => {
    gia.khoang.push([a, b]);
    if (gia.loiGd) return { data: null, error: gia.loiGd };
    const n = Math.max(0, Math.min(b, gia.soGd - 1) - a + 1);
    return {
      data: Array.from({ length: n }, (_, i) => ({ id: `g${a + i}`, amount: 1000, type: 'income', category: null, merchant_name: null, transaction_date: new Date().toISOString().slice(0, 10), is_synthetic: false })),
      error: null,
    };
  };
  return q;
}
function bangKhac(data: unknown[]) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'order']) q[m] = () => q;
  q.limit = async () => ({ data, error: null });
  (q as { then: unknown }).then = (ok: (v: unknown) => void) => ok({ data, error: null });
  return q;
}
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => (t === 'transactions' ? bangGd() : bangKhac([])) },
}));
vi.mock('@/lib/nguoiDung', () => ({ nguoiDungHienTai: async () => ({ id: 'u-1' }) }));
vi.mock('@/lib/congTyDangDung', () => ({ congTyDangDung: async () => ({ id: 'cty-1', ten: 'Tiệm Thử', la_demo: false }) }));
vi.mock('@/lib/lichThue', () => ({ useLichThue: () => ({ lich: null, dang: false }), cauConLai: () => '', ngayMoc: () => '' }));
vi.mock('@/components/NewsAndLawPanel', () => ({ default: () => null }));
vi.mock('@/components/onboarding/WelcomeCards', () => ({ default: () => null }));
vi.mock('@/components/onboarding/BatDauTuDau', () => ({ default: () => null }));
vi.mock('@/components/canh-bao/TheBatThuong', () => ({ default: () => null }));
vi.mock('@/components/DailyBriefCard', () => ({ DailyBriefCard: () => null }));
vi.mock('@/components/tien-vao/HangDoiTienVao', () => ({ HangDoiTienVao: () => null }));
vi.mock('@/components/viec/ViecCanLamTomTat', () => ({ ViecCanLamTomTat: () => null }));
vi.mock('@/components/to-khai/PhanLoaiHoatDong', () => ({ PhanLoaiHoatDong: () => null }));
vi.mock('@/components/fintech/ThresholdClock', () => ({ ThresholdClock: () => null }));

// Biểu đồ (recharts) cần ResizeObserver; jsdom không có.
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });

import DashboardOverview from './DashboardOverview';

const dung = () => render(<MemoryRouter><DashboardOverview /></MemoryRouter>);

beforeEach(() => { gia.soGd = 0; gia.loiGd = null; gia.khoang = []; });

describe('Tổng quan — đọc đủ và nói lỗi', () => {
  it('1.500 giao dịch → đọc hai trang (0–999, 1000–1999), không dừng ở 1000', async () => {
    gia.soGd = 1500;
    dung();
    await screen.findByText(/Xin chào, Tiệm Thử/);
    expect(gia.khoang).toEqual([[0, 999], [1000, 1999]]);
  });

  it('đọc lỗi → báo chưa tải được, không hiện màn số 0; thử lại được', async () => {
    gia.loiGd = { message: 'timeout' };
    dung();
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được số liệu');
    expect(screen.queryByText(/Xin chào/)).toBeNull();
    gia.loiGd = null;
    gia.soGd = 3;
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    await waitFor(() => expect(screen.getByText(/Xin chào, Tiệm Thử/)).toBeTruthy());
  });
});
