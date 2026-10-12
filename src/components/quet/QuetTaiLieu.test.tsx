import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { KhungChinhGoc, QuetTaiLieu, loiMayAnh } from './QuetTaiLieu';
import type { BonGoc } from '@/lib/quet/phoiCanh';

/**
 * Máy quét — phần giao diện chạy được trong jsdom: xin quyền máy ảnh, rơi về chọn ảnh khi bị
 * từ chối / không có máy ảnh, và tay kéo góc bằng bàn phím. Phần toán kiểm ở src/lib/quet.
 */

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const goc: BonGoc = [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 1300 }, { x: 100, y: 1300 }];

describe('lỗi máy ảnh', () => {
  it('đổi tên lỗi getUserMedia thành lý do người dùng hiểu được', () => {
    expect(loiMayAnh({ name: 'NotAllowedError' })).toBe('bi_tu_choi');
    expect(loiMayAnh({ name: 'SecurityError' })).toBe('bi_tu_choi');
    expect(loiMayAnh({ name: 'NotFoundError' })).toBe('khong_co');
    expect(loiMayAnh({ name: 'NotReadableError' })).toBe('loi');
    expect(loiMayAnh(null)).toBe('loi');
  });
});

describe('mở máy quét', () => {
  const cu = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  beforeEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
  });
  afterEach(() => {
    if (cu) Object.defineProperty(navigator, 'mediaDevices', cu);
    else delete (navigator as unknown as Record<string, unknown>).mediaDevices;
  });

  it('người dùng từ chối quyền máy ảnh: nói rõ cách bật, vẫn cho chụp bằng máy ảnh điện thoại hoặc chọn ảnh', async () => {
    const getUserMedia = vi.fn().mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    render(<QuetTaiLieu mo onDong={() => undefined} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/chưa được phép dùng máy ảnh/);
    expect(getUserMedia).toHaveBeenCalledWith(expect.objectContaining({ audio: false }));
    expect(screen.getByRole('button', { name: /Chụp bằng máy ảnh/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Chọn ảnh có sẵn/ })).toBeTruthy();
    // Ô chụp dự phòng mở thẳng máy ảnh sau của điện thoại.
    expect(screen.getByLabelText('Chụp bằng máy ảnh điện thoại').getAttribute('capture')).toBe('environment');
  });

  it('trình duyệt không có getUserMedia (HTTP, máy cũ): không hỏi quyền, rơi về chọn ảnh', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
    render(<QuetTaiLieu mo onDong={() => undefined} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/không cho mở máy ảnh/);
    expect(screen.queryByRole('button', { name: /Thử mở lại/ })).toBeNull();
  });

  it('đóng hộp thì tắt máy ảnh (dừng mọi track)', async () => {
    const stop = vi.fn();
    const luong = { getTracks: () => [{ stop }] };
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: vi.fn().mockResolvedValue(luong) }, configurable: true });
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<QuetTaiLieu mo onDong={() => undefined} />);
    expect(await screen.findByRole('button', { name: /Chụp trang/ })).toBeTruthy();
    rerender(<QuetTaiLieu mo={false} onDong={() => undefined} />);
    expect(stop).toHaveBeenCalled();
  });
});

describe('kéo chỉnh góc', () => {
  it('bàn phím: mũi tên dời góc 0,5% cạnh dài, Shift dời 2%', () => {
    const onDoi = vi.fn();
    render(<KhungChinhGoc url="blob:x" rong={1000} cao={1400} goc={goc} onDoi={onDoi} />);
    const trenTrai = screen.getByRole('slider', { name: 'Góc trên trái' });
    fireEvent.keyDown(trenTrai, { key: 'ArrowRight' });
    expect(onDoi.mock.calls[0][0][0]).toEqual({ x: 107, y: 100 });
    fireEvent.keyDown(trenTrai, { key: 'ArrowUp', shiftKey: true });
    expect(onDoi.mock.calls[1][0][0]).toEqual({ x: 100, y: 72 });
  });

  it('góc sát mép ảnh: dời tiếp thì dừng ở mép, không ra ngoài', () => {
    const onDoi = vi.fn();
    render(<KhungChinhGoc url="blob:x" rong={1000} cao={1400} goc={[goc[0], goc[1], { x: 995, y: 1395 }, goc[3]]} onDoi={onDoi} />);
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Góc dưới phải' }), { key: 'ArrowRight', shiftKey: true });
    expect(onDoi.mock.calls[0][0][2]).toEqual({ x: 1000, y: 1395 });
  });
});
