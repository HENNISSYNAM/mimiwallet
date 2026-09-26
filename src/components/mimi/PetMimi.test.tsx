import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

configure({ asyncUtilTimeout: 8000 });

const goi = vi.hoisted(() => ({
  ds: [] as unknown[],
  daGoi: [] as [string, unknown][],
  /** Trả lời của hành động `hoi` — test tự điều khiển lúc nào xong. */
  hoi: null as null | ((body: unknown) => Promise<unknown>),
}));
vi.mock('@/lib/goiTroLy', () => ({
  goiTroLy: async (hd: string, body?: unknown) => {
    goi.daGoi.push([hd, body]);
    if (hd === 'hoi') return goi.hoi ? goi.hoi(body) : { cau: 'Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.', ket_qua: [], buoc: [] };
    // Máy chủ giả trả danh sách Việc cần làm chuẩn (mục có câu hỏi → việc tiếp theo là trả lời câu đó).
    if (hd === 'viec_can_lam') {
      return { viec: (goi.ds as { id: string; tieu_de: string; cau_hoi: { cau: string } }[]).map((h) => ({
        id: h.id, nguon: 'ho_so_viec', tieu_de: h.tieu_de, can_ban: true, duong_dan: `/dashboard/viec-can-lam?viec=${h.id}`, hanh_dong: { tieu_de: h.cau_hoi.cau },
      })), lich: [], da_xong: [], loi: [] };
    }
    return { hanh_trinh: goi.ds };
  },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

import PetMimi from './PetMimi';
import { xoaHetLanHoi } from '@/lib/petHoi';

/** Trang đang mở (và state điều hướng) — để thấy pet có chuyển trang hay không. */
function DiaChi() { const l = useLocation(); return <div data-testid="dia-chi" data-state={JSON.stringify(l.state ?? null)}>{l.pathname}{l.search}</div>; }
const mo = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes><Route path="*" element={<><PetMimi /><DiaChi /></>} /></Routes>
  </MemoryRouter>,
);
const diaChi = () => screen.getByTestId('dia-chi').textContent;
const meo = () => screen.getByRole('button', { name: /^MIMI —/ });

const cauHoiGui = () => goi.daGoi.filter(([hd]) => hd === 'hoi').map(([, b]) => (b as { cau: string }).cau);

beforeEach(() => {
  goi.ds = [];
  goi.daGoi = [];
  goi.hoi = null;
  xoaHetLanHoi();
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
  it('gõ ở ô nhập dưới mèo → MIMI trả lời NGẦM, không chuyển trang; xong thì pet bật thông báo; bấm thông báo mới mở Trợ lý MIMI với đúng câu trả lời', async () => {
    let xong: (v: unknown) => void = () => {};
    goi.hoi = () => new Promise((r) => { xong = r; });
    mo();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(meo(), { clientX: 101, clientY: 101, pointerId: 1 });
    const o = await screen.findByRole('textbox', { name: 'Hỏi MIMI' });
    expect((screen.getByRole('button', { name: 'Gửi cho Trợ lý MIMI' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(o, { target: { value: 'Khoản chi nào đang chờ tôi duyệt?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi cho Trợ lý MIMI' }));

    // Đang trả lời: vẫn ở trang cũ, thông báo "đang trả lời" trên pet, câu đi vào đúng hành động `hoi`.
    expect(await screen.findByText('MIMI đang trả lời…')).toBeTruthy();
    expect(diaChi()).toBe('/dashboard');
    expect(cauHoiGui()).toEqual(['Khoản chi nào đang chờ tôi duyệt?']);
    expect(screen.queryByRole('textbox', { name: 'Hỏi MIMI' })).toBeNull();

    const traLoi = { cau: 'Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.', ket_qua: [], buoc: [], hoi_thoai_id: 'ht1' };
    await act(async () => { xong(traLoi); });
    expect(await screen.findByText('Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.')).toBeTruthy();
    expect(screen.getByText('Xong — chưa xem')).toBeTruthy();
    expect(diaChi()).toBe('/dashboard'); // có kết quả vẫn chưa chuyển trang

    fireEvent.click(screen.getByText('Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.'));
    await waitFor(() => expect(diaChi()).toBe('/dashboard/tro-ly'));
    expect(JSON.parse(screen.getByTestId('dia-chi').getAttribute('data-state') as string)).toEqual({ luotPet: { cau: 'Khoản chi nào đang chờ tôi duyệt?', traLoi } });
    expect(cauHoiGui()).toHaveLength(1); // không hỏi lại
  });

  it('thông báo kết quả: gạt đi thì thu lại nhưng vẫn còn trong khay; lỗi thì bấm để thử lại trong Trợ lý MIMI', async () => {
    mo();
    fireEvent.click(screen.getByRole('button', { name: 'Gõ để hỏi Trợ lý MIMI' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Hỏi MIMI' }), { target: { value: 'Doanh thu quý này?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi cho Trợ lý MIMI' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Gạt thông báo: Doanh thu quý này?' }));
    await waitFor(() => expect(screen.queryByText('Doanh thu quý này?')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /^Hoạt động/ }));
    expect(await screen.findByText('Doanh thu quý này?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Hoạt động/ }));

    goi.hoi = async () => { throw new Error('Mạng lỗi'); };
    fireEvent.click(screen.getByRole('button', { name: 'Gõ để hỏi Trợ lý MIMI' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Hỏi MIMI' }), { target: { value: 'Ai nợ tôi?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi cho Trợ lý MIMI' }));
    expect(await screen.findByText('Chưa xong — bấm để thử lại trong Trợ lý MIMI')).toBeTruthy();
    expect(screen.getByText('Bị chặn')).toBeTruthy();
    fireEvent.click(screen.getByText('Chưa xong — bấm để thử lại trong Trợ lý MIMI'));
    await waitFor(() => expect(diaChi()).toBe(`/dashboard/tro-ly?hoi=${encodeURIComponent('Ai nợ tôi?')}`));
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

  it('nói với MIMI → hỏi ngầm như gõ (không chuyển trang), thông báo kết quả trên pet', async () => {
    let daNghe = 0;
    class NhanDien { lang = ''; interimResults = false; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onerror: (() => void) | null = null; onend: (() => void) | null = null;
      start() { daNghe += 1; this.onresult?.({ results: { 0: { 0: { transcript: 'Tôi muốn tạm ngừng kinh doanh' } } } }); this.onend?.(); } stop() {} }
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = NhanDien;
    try {
      mo();
      fireEvent.click(screen.getByRole('button', { name: 'Nói với MIMI' }));
      await waitFor(() => expect(cauHoiGui()).toEqual(['Tôi muốn tạm ngừng kinh doanh']));
      expect(daNghe).toBe(1);
      expect(await screen.findByText('Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.')).toBeTruthy();
      expect(diaChi()).toBe('/dashboard');
    } finally {
      delete w.SpeechRecognition;
    }
  });

  it('bật mic lần đầu: MIMI hỏi xin trước, rồi mới gọi hộp cho phép của trình duyệt; bị chặn thì chỉ cách mở lại', async () => {
    let daNghe = 0;
    class NhanDien { lang = ''; interimResults = false; maxAlternatives = 1; onresult: ((e: unknown) => void) | null = null; onerror: (() => void) | null = null; onend: (() => void) | null = null;
      start() { daNghe += 1; this.onresult?.({ results: { 0: { 0: { transcript: 'Doanh thu tháng này' } } } }); this.onend?.(); } stop() {} }
    const w = window as unknown as Record<string, unknown>;
    w.SpeechRecognition = NhanDien;
    let quyen = 'prompt';
    const xinMic = vi.fn(async () => ({ getTracks: () => [{ stop: vi.fn() }] }));
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state: quyen }) }, configurable: true });
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: xinMic }, configurable: true });
    try {
      mo();
      fireEvent.click(screen.getByRole('button', { name: 'Nói với MIMI' }));
      expect(await screen.findByText('MIMI xin bật micro nhé?')).toBeTruthy();
      expect(daNghe).toBe(0); // chưa bật mic khi người dùng chưa đồng ý
      expect(xinMic).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Cho phép' }));
      await waitFor(() => expect(xinMic).toHaveBeenCalledWith({ audio: true }));
      await waitFor(() => expect(daNghe).toBe(1));
      await waitFor(() => expect(cauHoiGui()).toEqual(['Doanh thu tháng này']));

      quyen = 'denied';
      fireEvent.click(screen.getByRole('button', { name: 'Nói với MIMI' }));
      expect(await screen.findByText('Micro đang bị chặn')).toBeTruthy();
      expect(daNghe).toBe(1);
    } finally {
      delete w.SpeechRecognition;
      delete (navigator as unknown as Record<string, unknown>).permissions;
      delete (navigator as unknown as Record<string, unknown>).mediaDevices;
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
    // Kiểm ngay sau khi thả (fireEvent đã chạy trong act): dáng "vui" chỉ kéo dài 1,2 giây thật, máy chạy
    // nặng mà chờ bằng waitFor thì có thể lỡ mất.
    expect(meo().getAttribute('data-dang-keo')).toBeNull();
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
