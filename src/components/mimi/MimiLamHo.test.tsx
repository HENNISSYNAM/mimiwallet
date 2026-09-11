import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MimiLamHoProvider, useMimiLamHo, type KetQuaLamHo } from './MimiLamHo';
import type { KichBan } from '@/lib/mimiLamHo';

/**
 * Chạy thật con trỏ mèo trên một trang giả — không chỉ test phần nhận việc.
 *
 * Những điều ở đây là lời hứa với người dùng: mèo gõ được vào ô của React, mèo
 * không bấm nút có hậu quả, người dùng bấm thì mèo nhận ra, Esc thì mèo dừng.
 */

const demThem = vi.fn();
const demNguyHiem = vi.fn();
let chay: ((kb: KichBan) => Promise<KetQuaLamHo>) | null = null;

function Trang() {
  const [ten, setTen] = useState('');
  return (
    <div>
      <input data-mimi="tac-tu.ten" value={ten} onChange={(e) => setTen(e.target.value)} />
      <p data-testid="ten">{ten}</p>
      <button data-mimi="tac-tu.them" data-mimi-khong-tu-bam onClick={demThem}>Thêm agent</button>
      <button data-mimi="thu.nut-nguy-hiem" data-mimi-khong-tu-bam onClick={demNguyHiem}>Nguy hiểm</button>
    </div>
  );
}

function LayChay() {
  chay = useMimiLamHo().chay;
  return null;
}

function dung() {
  render(
    <MemoryRouter initialEntries={['/dashboard/tac-tu']}>
      <MimiLamHoProvider>
        <LayChay />
        <Routes>
          <Route path="/dashboard/tac-tu" element={<Trang />} />
        </Routes>
      </MimiLamHoProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  demThem.mockReset();
  demNguyHiem.mockReset();
  chay = null;
  // jsdom không bố cục: cho mọi phần tử một kích thước để mèo "thấy" được.
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ left: 10, top: 10, right: 110, bottom: 40, width: 100, height: 30, x: 10, y: 10, toJSON: () => ({}) }) as DOMRect;
  Element.prototype.scrollIntoView = vi.fn();
  if (!globalThis.CSS?.escape) {
    Object.defineProperty(globalThis, 'CSS', { value: { escape: (s: string) => s }, configurable: true });
  }
  // Giảm chuyển động: mèo đi tức thì, test chạy nhanh.
  window.matchMedia = ((q: string) => ({
    matches: q.includes('prefers-reduced-motion'),
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe('con trỏ mèo', () => {
  it('gõ vào ô do React điều khiển và state cập nhật theo', async () => {
    dung();
    const kq = await chay!({
      ten: 'x',
      moTa: 'x',
      buoc: [{ loai: 'go', dich: 'tac-tu.ten', chu: 'Bot A', noi: 'Gõ tên.' }],
    });
    expect(kq.xong).toBe(true);
    expect(screen.getByTestId('ten')).toHaveTextContent('Bot A');
  }, 15_000);

  it('lúc chạy không bao giờ bấm phần tử mang dấu cấm tự bấm', async () => {
    dung();
    // Đích này không nằm trong danh sách cấm của kiemKichBan — chỉ lớp chặn lúc chạy cứu được.
    const kq = await chay!({
      ten: 'x',
      moTa: 'x',
      buoc: [{ loai: 'bam', dich: 'thu.nut-nguy-hiem', noi: 'Bấm.' }],
    });
    expect(kq.xong).toBe(false);
    expect(kq.cau).toContain('tự bấm');
    expect(demNguyHiem).not.toHaveBeenCalled();
  }, 15_000);

  it('kịch bản tự bấm Duyệt bị từ chối trước khi mèo kịp đi', async () => {
    dung();
    const kq = await chay!({ ten: 'x', moTa: 'x', buoc: [{ loai: 'bam', dich: 'tac-tu.duyet', noi: '' }] });
    expect(kq.xong).toBe(false);
    expect(kq.cau).toContain('không được tự bấm');
  });

  it('ở bước nhường, người dùng bấm thì mèo nhận ra và kết thúc', async () => {
    dung();
    const dangChay = chay!({
      ten: 'x',
      moTa: 'x',
      buoc: [{ loai: 'nhuong', dich: 'tac-tu.them', noi: 'Bạn bấm "Thêm agent" nhé.' }],
    });
    await screen.findByText('Bạn bấm "Thêm agent" nhé.');
    // Chờ mèo đi tới rồi mới bấm, như người thật.
    await new Promise((r) => setTimeout(r, 300));
    fireEvent.click(screen.getByText('Thêm agent'));
    const kq = await dangChay;
    expect(demThem).toHaveBeenCalledTimes(1);
    expect(kq.cau).toContain('Bạn đã bấm');
  }, 15_000);

  it('Esc dừng giữa chừng, bước sau không chạy', async () => {
    dung();
    const dangChay = chay!({
      ten: 'x',
      moTa: 'x',
      buoc: [
        { loai: 'chi', dich: 'tac-tu.ten', noi: 'Ô tên ở đây.' },
        { loai: 'go', dich: 'tac-tu.ten', chu: 'Không được gõ', noi: 'Gõ.' },
      ],
    });
    await screen.findByText('Ô tên ở đây.');
    fireEvent.keyDown(window, { key: 'Escape' });
    const kq = await dangChay;
    expect(kq.xong).toBe(false);
    expect(kq.cau).toContain('Đã dừng');
    await waitFor(() => expect(screen.getByTestId('ten')).toHaveTextContent(''));
  }, 15_000);
});
