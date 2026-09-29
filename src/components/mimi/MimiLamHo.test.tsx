import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MimiLamHoProvider, useMimiLamHo, type KetQuaLamHo } from './MimiLamHo';
import { baoKetQua, type KichBan } from '@/lib/mimiLamHo';

/**
 * Chạy thật con trỏ mèo trên một trang giả — không chỉ test phần nhận việc.
 *
 * Những điều ở đây là lời hứa với người dùng: mèo gõ được vào ô của React, mèo
 * không bấm nút có hậu quả, người dùng bấm thì mèo nhận ra, Esc thì mèo dừng.
 */

const demThem = vi.fn();
const demNguyHiem = vi.fn();
const demTab = vi.fn();
/** Trang giả trả lời yêu cầu "Thêm agent" ra sao: báo thành công, báo lỗi, hay im lặng (yêu cầu còn chạy). */
let traLoiThem: 'ok' | 'loi' | 'im' = 'ok';
let chay: ((kb: KichBan) => Promise<KetQuaLamHo>) | null = null;

function Trang() {
  const [ten, setTen] = useState('');
  return (
    <div>
      <input data-mimi="tac-tu.ten" value={ten} onChange={(e) => setTen(e.target.value)} />
      <p data-testid="ten">{ten}</p>
      <button
        data-mimi="tac-tu.them"
        data-mimi-khong-tu-bam
        onClick={() => {
          demThem();
          // Như trang thật: yêu cầu chạy bất đồng bộ, xong mới báo.
          if (traLoiThem !== 'im') {
            setTimeout(() => baoKetQua(traLoiThem === 'ok'
              ? { dich: 'tac-tu.them', ok: true, cau: 'Đã thêm agent.' }
              : { dich: 'tac-tu.them', ok: false, cau: 'Máy chủ từ chối.' }), 200);
          }
        }}
      >
        Thêm agent
      </button>
      <button data-mimi="thu.tab" onClick={demTab}>Tab</button>
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
  demTab.mockReset();
  traLoiThem = 'ok';
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
  // Hồi quy 26/09/2026: "tạo agent" → mèo đứng im 8 giây chờ mục "Kiểm soát agent" đã rời thanh bên,
  // người dùng bấm đi chỗ khác → "Đã dừng". Bước chỉ-cho-xem không bắt buộc không được chặn cả luồng.
  it('bước không bắt buộc bị thiếu: bỏ qua nhanh, nói ngay đang làm gì, rồi làm tiếp', async () => {
    dung();
    // Ghi lại mọi câu mèo nói (không chộp đúng lúc — máy tải nặng thì câu đầu chỉ kịp hiện rất ngắn).
    const daNoi: string[] = [];
    const quan = new MutationObserver(() => document.querySelectorAll('[role="status"] p').forEach((p) => { if (p.textContent && !daNoi.includes(p.textContent)) daNoi.push(p.textContent); }));
    quan.observe(document.body, { childList: true, subtree: true, characterData: true });
    const dang = chay!({
      ten: 'x',
      moTa: 'tạo agent "Bot A"',
      buoc: [
        { loai: 'chi', dich: 'nav:/dashboard/tac-tu', noi: 'Mục ở đây.', neuKhongThay: '' },
        { loai: 'go', dich: 'tac-tu.ten', chu: 'Bot A', noi: 'Gõ tên.' },
      ],
    });
    const kq = await dang;
    quan.disconnect();
    expect(daNoi[0]).toBe('Mình bắt đầu: tạo agent "Bot A".');
    expect(kq.xong).toBe(true);
    expect(screen.getByTestId('ten')).toHaveTextContent('Bot A');
  }, 15_000);

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

  it('ở bước nhường, người dùng bấm và trang báo thành công → xong', async () => {
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
    expect(kq).toMatchObject({ xong: true, ketThuc: 'xong', cau: 'Đã thêm agent.' });
  }, 15_000);

  // Hồi quy 29/09/2026: bấm nút nhường mới là gửi yêu cầu. Mèo từng báo "Xong" ngay lúc bấm, rồi
  // yêu cầu thất bại — người dùng tin là đã có agent.
  it('người dùng bấm nhưng yêu cầu thất bại → KHÔNG báo xong, nói đúng lỗi', async () => {
    traLoiThem = 'loi';
    dung();
    const dangChay = chay!({ ten: 'x', moTa: 'x', buoc: [{ loai: 'nhuong', dich: 'tac-tu.them', noi: 'Bạn bấm nhé.' }] });
    await screen.findByText('Bạn bấm nhé.');
    await new Promise((r) => setTimeout(r, 300));
    fireEvent.click(screen.getByText('Thêm agent'));
    // Trong lúc yêu cầu còn chạy, mèo nói đang chờ — không nói xong.
    expect(await screen.findByText(/chờ trang báo kết quả/)).toBeTruthy();
    const kq = await dangChay;
    expect(kq).toMatchObject({ xong: false, ketThuc: 'loi', cau: 'Máy chủ từ chối.' });
  }, 15_000);

  it('bấm rồi nhưng trang chưa báo gì, người dùng thôi theo dõi → chưa rõ, KHÔNG báo xong', async () => {
    traLoiThem = 'im';
    dung();
    const dangChay = chay!({ ten: 'x', moTa: 'x', buoc: [{ loai: 'nhuong', dich: 'tac-tu.them', noi: 'Bạn bấm nhé.' }] });
    await screen.findByText('Bạn bấm nhé.');
    await new Promise((r) => setTimeout(r, 300));
    fireEvent.click(screen.getByText('Thêm agent'));
    await screen.findByText(/chờ trang báo kết quả/);
    fireEvent.keyDown(window, { key: 'Escape' });
    const kq = await dangChay;
    expect(kq).toMatchObject({ xong: false, ketThuc: 'chua_ro' });
    expect(kq.cau).toContain('chưa báo kết quả');
  }, 15_000);

  // Hồi quy 29/09/2026: Esc trong lúc mèo đang đi tới nút vẫn để mèo bấm một lần.
  it('Esc lúc mèo đang đi tới nút → không bấm', async () => {
    dung();
    const dangChay = chay!({ ten: 'x', moTa: 'x', buoc: [{ loai: 'bam', dich: 'thu.tab', noi: 'Mở tab.' }] });
    await screen.findByText('Mở tab.');
    fireEvent.keyDown(window, { key: 'Escape' });
    const kq = await dangChay;
    expect(kq).toMatchObject({ xong: false, ketThuc: 'da_dung' });
    await new Promise((r) => setTimeout(r, 500));
    expect(demTab).not.toHaveBeenCalled();
  }, 15_000);

  // Hồi quy 29/09/2026: bấm "Dừng" (hoặc Esc) lúc mèo đang chờ người bấm từng trả `xong: true`
  // "Mình đã chỉ đúng chỗ…" — pet báo hoàn tất một việc người dùng vừa huỷ.
  it('dừng lúc đang chờ người bấm → KHÔNG báo xong, nút không bị bấm', async () => {
    dung();
    const dangChay = chay!({
      ten: 'x',
      moTa: 'x',
      buoc: [{ loai: 'nhuong', dich: 'tac-tu.them', noi: 'Bạn bấm "Thêm agent" nhé.' }],
    });
    await screen.findByText('Bạn bấm "Thêm agent" nhé.');
    fireEvent.click(screen.getByRole('button', { name: 'Dừng' }));
    const kq = await dangChay;
    expect(kq).toMatchObject({ xong: false, ketThuc: 'da_dung' });
    expect(kq.cau).toContain('Đã dừng');
    expect(demThem).not.toHaveBeenCalled();
  }, 15_000);

  it('không thấy đích, kịch bản có câu thay thế → nói câu đó nhưng KHÔNG báo xong', async () => {
    dung();
    const kq = await chay!({
      ten: 'x',
      moTa: 'x',
      buoc: [{ loai: 'chi', dich: 'khong.co-that', noi: 'Ở đây.', neuKhongThay: 'Không có khoản nào chờ duyệt.' }],
    });
    expect(kq).toMatchObject({ xong: false, ketThuc: 'khong_thay', cau: 'Không có khoản nào chờ duyệt.' });
  }, 20_000);

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
    expect(kq).toMatchObject({ xong: false, ketThuc: 'da_dung' });
    expect(kq.cau).toContain('Đã dừng');
    await waitFor(() => expect(screen.getByTestId('ten')).toHaveTextContent(''));
  }, 15_000);
});
