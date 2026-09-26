import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

configure({ asyncUtilTimeout: 8000 });

const goi = vi.hoisted(() => ({ ds: [] as unknown[], props: {} as Record<string, unknown> }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: async () => ({ hanh_trinh: goi.ds }) }));
vi.mock('@/components/AIChatWidget', () => ({
  default: (p: Record<string, unknown>) => { goi.props = p; return p.mo ? <div data-testid="khung-chat">khung chat</div> : null; },
}));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn() }) }));

import PetMimi from './PetMimi';

const mo = () => render(<MemoryRouter><PetMimi /></MemoryRouter>);
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
  it('bấm mèo (không kéo) → mở khung chat; bấm lần nữa → đóng', async () => {
    mo();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(meo(), { clientX: 101, clientY: 101, pointerId: 1 });
    expect(await screen.findByTestId('khung-chat')).toBeTruthy();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(meo(), { clientX: 100, clientY: 100, pointerId: 1 });
    await waitFor(() => expect(screen.queryByTestId('khung-chat')).toBeNull());
  });

  it('kéo quá 5px → di chuyển, KHÔNG mở chat; vị trí được nhớ', async () => {
    mo();
    fireEvent.pointerDown(meo(), { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(meo(), { clientX: 60, clientY: 60, pointerId: 1 });
    fireEvent.pointerUp(meo(), { clientX: 60, clientY: 60, pointerId: 1 });
    expect(screen.queryByTestId('khung-chat')).toBeNull();
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
    expect(screen.getByRole('button', { name: 'Gõ để trò chuyện' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Nói với MIMI' })).toBeTruthy();
  });

  it('lệnh /pet trong chat ẩn/hiện pet', async () => {
    mo();
    (goi.props.onLenhPet as () => void)();
    await waitFor(() => expect(screen.queryByRole('button', { name: /^MIMI —/ })).toBeNull());
  });
});
