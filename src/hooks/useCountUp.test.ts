import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCountUp } from './useCountUp';

/**
 * Con số phải ĐÚNG ngay cả khi hiệu ứng chưa chạy.
 *
 * 23/09/2026: khối số liệu trang chủ hiện "0/52 kiểm thử tự động" (bản tiếng Anh
 * kèm "All currently passing") cho tới khi người dùng cuộn tới. Hai agent đóng
 * vai khách hàng đọc trước khi cuộn và đều coi đó là dấu hiệu số liệu không đáng
 * tin.
 */

const datGiamChuyenDong = (bat: boolean) => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: bat && q.includes('prefers-reduced-motion'),
    media: q, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
};

afterEach(() => { vi.unstubAllGlobals(); });

describe('useCountUp', () => {
  it('chưa chạy thì trả số thật, không trả 0', () => {
    const { result } = renderHook(() => useCountUp(52, 1500, false));
    expect(result.current).toBe(52);
  });

  it('bật giảm chuyển động thì hiện thẳng số thật, không đếm', () => {
    datGiamChuyenDong(true);
    const { result } = renderHook(() => useCountUp(52, 1500, true));
    expect(result.current).toBe(52);
  });

  it('chạy bình thường thì đếm từ 0 lên đúng số', async () => {
    datGiamChuyenDong(false);
    const { result } = renderHook(() => useCountUp(52, 20, true));
    await waitFor(() => expect(result.current).toBe(52));
  });

  it('đổi mục tiêu khi chưa chạy thì theo mục tiêu mới', () => {
    const { result, rerender } = renderHook(({ n }) => useCountUp(n, 1500, false), {
      initialProps: { n: 12 },
    });
    expect(result.current).toBe(12);
    act(() => rerender({ n: 768 }));
    expect(result.current).toBe(768);
  });
});
