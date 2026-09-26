import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

configure({ asyncUtilTimeout: 8000 });

const goi = vi.hoisted(() => ({ ds: [] as unknown[] }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: async () => ({ hanh_trinh: goi.ds }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

import PetMimi from './PetMimi';

/** Trang đang mở — để thấy pet dẫn thẳng vào Trợ lý MIMI. */
function DiaChi() { const l = useLocation(); return <div data-testid="dia-chi">{l.pathname}{l.search}</div>; }
const mo = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes><Route path="*" element={<><PetMimi /><DiaChi /></>} /></Routes>
  </MemoryRouter>,
);
const diaChi = () => screen.getByTestId('dia-chi').textContent;
const meo = () => screen.getByRole('button', { name: /^MIMI —/ });

beforeEach(() => {
  goi.ds = [];
  localStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia;
  HTMLElement.prototype.setPointerCapture = vi.fn();
  // jsdom chưa có PointerEvent đầy đủ: không có thì nút chuột và toạ độ bị rơi mất.
  if (!('PointerEvent' in window) || !new (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent('x', { clientX: 1 }).clientX) {
    class PE extends MouseEvent { pointerId: number; constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; } }
    Object.defineProperty(window, 'PointerEvent', { value: PE, configurable: true, writable: true });
  }
});

describe('Pet MIMI', () => {
  it('bấm mèo (không kéo) → hiện ô nhập nhỏ dưới mèo, không mở khung chat mới; gửi → câu hỏi vào thẳng Trợ lý MIMI', async () => {
    mo();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(meo(), { clientX: 101, clientY: 101, pointerId: 1 });
    const o = await screen.findByRole('textbox', { name: 'Hỏi MIMI' });
    expect(diaChi()).toBe('/dashboard'); // chưa rời trang, chưa mở cửa sổ chat nào
    expect((screen.getByRole('button', { name: 'Gửi cho Trợ lý MIMI' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(o, { target: { value: 'Khoản chi nào đang chờ tôi duyệt?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi cho Trợ lý MIMI' }));
    await waitFor(() => expect(diaChi()).toBe(`/dashboard/tro-ly?hoi=${encodeURIComponent('Khoản chi nào đang chờ tôi duyệt?')}`));
    expect(screen.queryByRole('textbox', { name: 'Hỏi MIMI' })).toBeNull();
  });

  it('ô nhập: Esc hoặc bấm ra ngoài thì thu lại; nút + mở Trợ lý MIMI đầy đủ', async () => {
    mo();
    fireEvent.click(screen.getByRole('button', { name: 'Gõ để hỏi Trợ lý MIMI' }));
    fireEvent.keyDown(await screen.findByRole('textbox', { name: 'Hỏi MIMI' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Hỏi MIMI' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Gõ để hỏi Trợ lý MIMI' }));
    await screen.findByRole('textbox', { name: 'Hỏi MIMI' });
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Hỏi MIMI' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Gõ để hỏi Trợ lý MIMI' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mở Trợ lý MIMI đầy đủ' }));
    await waitFor(() => expect(diaChi()).toBe('/dashboard/tro-ly'));
  });

  it('nói với MIMI → câu nói được gửi vào Trợ lý MIMI (?hoi=)', async () => {
    class NhanDien { lang = ''; interimResults = false; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onerror: (() => void) | null = null; onend: (() => void) | null = null;
      start() { this.onresult?.({ results: { 0: { 0: { transcript: 'Tôi muốn tạm ngừng kinh doanh' } } } }); this.onend?.(); } }
    (window as unknown as Record<string, unknown>).SpeechRecognition = NhanDien;
    try {
      mo();
      fireEvent.click(screen.getByRole('button', { name: 'Nói với MIMI' }));
      await waitFor(() => expect(diaChi()).toBe(`/dashboard/tro-ly?hoi=${encodeURIComponent('Tôi muốn tạm ngừng kinh doanh')}`));
    } finally {
      delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    }
  });

  it('kéo quá 5px → di chuyển, KHÔNG mở chat; vị trí được nhớ', async () => {
    mo();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(meo(), { clientX: 60, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(meo(), { clientX: 60, clientY: 60, pointerId: 1 });
    expect(diaChi()).toBe('/dashboard');
    await waitFor(() => expect(JSON.parse(localStorage.getItem('mimi.pet.v1') ?? '{}').x).toEqual(expect.any(Number)));
  });

  it('có việc chờ người dùng → trạng thái "Cần bạn", khay liệt kê đúng câu hỏi', async () => {
    goi.ds = [{ id: 'h1', tieu_de: 'Tạm ngừng kinh doanh', cau_hoi: { cau: 'Bạn muốn bắt đầu tạm ngừng từ ngày nào?' } }];
    mo();
    expect(await screen.findByText('Cần bạn')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Hoạt động — 1 mục/ }));
    expect(await screen.findByText('Bạn muốn bắt đầu tạm ngừng từ ngày nào?')).toBeTruthy();
  });

  it('chuột phải → menu; Ẩn MIMI → còn tab mép phải; Alt+Shift+M → hiện lại', async () => {
    mo();
    fireEvent.contextMenu(meo());
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ẩn MIMI' }));
    expect(screen.queryByRole('button', { name: /^MIMI —/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Hiện MIMI/ })).toBeTruthy();
    fireEvent.keyDown(window, { altKey: true, shiftKey: true, code: 'KeyM' });
    expect(await screen.findByRole('button', { name: /^MIMI —/ })).toBeTruthy();
  });

  it('chế độ Mini: chỉ còn ba nút, không có mèo', () => {
    mo();
    fireEvent.contextMenu(meo());
    fireEvent.click(screen.getByRole('menuitem', { name: /Chế độ Mini/ }));
    expect(screen.queryByRole('button', { name: /^MIMI —/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Gõ để hỏi Trợ lý MIMI' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nói với MIMI' })).toBeTruthy();
  });

  it('lệnh /pet (gõ trong Trợ lý MIMI) ẩn/hiện pet', async () => {
    mo();
    act(() => { window.dispatchEvent(new Event('mimi:lenh-pet')); });
    await waitFor(() => expect(screen.queryByRole('button', { name: /^MIMI —/ })).toBeNull());
  });

  it('bị kéo → mèo chạy (ảnh chạy, quay mặt theo hướng kéo); thả ra → tiếp đất rồi vui', async () => {
    mo();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 300, clientY: 300, pointerId: 1 });
    fireEvent.pointerMove(meo(), { clientX: 280, clientY: 300, pointerId: 1 });
    await new Promise((r) => setTimeout(r, 40));
    fireEvent.pointerMove(meo(), { clientX: 200, clientY: 300, pointerId: 1 });
    const anh = meo() as HTMLImageElement;
    expect(anh.getAttribute('data-dang-keo')).toBe('true');
    expect(anh.getAttribute('src')).toContain('run');
    expect(anh.getAttribute('data-huong')).toBe('trai'); // kéo sang trái → quay mặt sang trái
    fireEvent.pointerUp(meo(), { clientX: 200, clientY: 300, pointerId: 1 });
    await waitFor(() => expect(meo().getAttribute('data-dang-keo')).toBeNull());
    expect(meo().getAttribute('src')).toContain('happy');
  });

  it('trình duyệt không có cửa sổ nổi → không hiện nút "ra màn hình máy"', () => {
    mo();
    fireEvent.contextMenu(meo());
    expect(screen.queryByRole('menuitem', { name: 'Đưa MIMI ra màn hình máy' })).toBeNull();
  });

  it('có cửa sổ nổi → mèo sang cửa sổ đó, trang không còn mèo; đóng cửa sổ → mèo về trang', async () => {
    const cuaSo = document.implementation.createHTMLDocument('pip');
    const w = Object.assign(new EventTarget(), { document: cuaSo, focus: () => {} }) as unknown as Window;
    Object.defineProperty(window, 'documentPictureInPicture', { value: { window: null, requestWindow: async () => w }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    try {
      mo();
      fireEvent.contextMenu(meo());
      fireEvent.click(screen.getByRole('menuitem', { name: 'Đưa MIMI ra màn hình máy' }));
      await waitFor(() => expect(cuaSo.body.querySelector('img[alt^="MIMI"]')).not.toBeNull());
      expect(screen.queryByRole('button', { name: /^MIMI —/ })).toBeNull();
      (w as unknown as EventTarget).dispatchEvent(new Event('pagehide'));
      expect(await screen.findByRole('button', { name: /^MIMI —/ })).toBeTruthy();
    } finally {
      delete (window as unknown as Record<string, unknown>).documentPictureInPicture;
    }
  });

  it('có chuyện mới → thẻ hoạt động tự ló lên (không cần bấm), rồi thu lại; mũi tên bung/thu cả danh sách', async () => {
    goi.ds = [
      { id: 'h1', tieu_de: 'Tạm ngừng kinh doanh', cau_hoi: { cau: 'Bạn muốn bắt đầu từ ngày nào?' } },
      { id: 'h2', tieu_de: 'Quyết toán TNCN', cau_hoi: { cau: 'Năm nay bạn có mấy nguồn thu nhập?' } },
    ];
    mo();
    expect(await screen.findByText('Bạn muốn bắt đầu từ ngày nào?')).toBeTruthy(); // thẻ trên cùng ló lên
    expect(screen.queryByText('Năm nay bạn có mấy nguồn thu nhập?')).toBeNull(); // chỉ một thẻ
    const muiTen = screen.getByRole('button', { name: /Hoạt động — 2 mục/ });
    expect(muiTen.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(muiTen);
    expect(muiTen.getAttribute('aria-expanded')).toBe('true');
    expect(await screen.findByText('Năm nay bạn có mấy nguồn thu nhập?')).toBeTruthy();
    expect(screen.getByText('Cần bạn · Quyết toán TNCN')).toBeTruthy();
    fireEvent.click(muiTen);
    await waitFor(() => expect(screen.queryByText('Năm nay bạn có mấy nguồn thu nhập?')).toBeNull());
  });

  it('"Cần bạn" → mèo ngồi chờ, KHÔNG vẫy tay', async () => {
    goi.ds = [{ id: 'h1', tieu_de: 'Tạm ngừng kinh doanh', cau_hoi: { cau: 'Từ ngày nào?' } }];
    mo();
    await waitFor(() => expect(meo().getAttribute('src')).toContain('sit'));
    expect(document.querySelector('img[src*="paw"]')).toBeNull();
    expect(document.querySelector('img[src*="wave"]')).toBeNull();
  });

  it('rảnh 40 giây → ngồi xuống; rê chuột vào → không vẫy tay', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      mo();
      await act(async () => { await vi.advanceTimersByTimeAsync(39_000); });
      expect(meo().getAttribute('data-ngoi')).toBeNull();
      await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });
      expect(meo().getAttribute('data-ngoi')).toBe('true');
      expect(meo().getAttribute('src')).toContain('sit');
      fireEvent.pointerEnter(meo());
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
      expect(document.querySelector('img[src*="paw"]')).toBeNull();
      expect(meo().getAttribute('src')).toContain('sit');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rảnh 3 phút → ngủ (có z z z); rê chuột vào → thức dậy và vươn vai, rồi thôi', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      mo();
      await act(async () => { await vi.advanceTimersByTimeAsync(3 * 60_000 + 100); });
      expect(meo().getAttribute('data-ngu')).toBe('true');
      expect(meo().getAttribute('src')).toContain('sleep');
      expect(document.body.textContent).toContain('z');
      fireEvent.pointerEnter(meo());
      await act(async () => { await vi.advanceTimersByTimeAsync(50); });
      expect(meo().getAttribute('data-ngu')).toBeNull();
      expect(meo().getAttribute('data-vuon-vai')).toBe('true');
      expect(meo().getAttribute('src')).toContain('stretch');
      await act(async () => { await vi.advanceTimersByTimeAsync(1700); });
      expect(meo().getAttribute('data-vuon-vai')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rảnh mà còn thức → KHÔNG tự vươn vai lặp đi lặp lại (chỉ vươn vai khi vừa thức dậy)', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    try {
      mo();
      let daVuonVai = false;
      const quan = new MutationObserver(() => { if (document.querySelector('[data-vuon-vai="true"]')) daVuonVai = true; });
      quan.observe(document.body, { attributes: true, subtree: true, childList: true });
      await act(async () => { await vi.advanceTimersByTimeAsync(2 * 60_000 + 50_000); });
      quan.disconnect();
      expect(daVuonVai).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
