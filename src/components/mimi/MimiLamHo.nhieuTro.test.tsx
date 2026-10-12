import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { chonTro, MimiLamHoProvider, TRO_MIMI, useMimiLamHo, type TacTuDoc } from './MimiLamHo';
import { baoKetQua } from '@/lib/mimiLamHo';

/**
 * Nhiều trỏ (11/10/2026): mỗi trỏ là một agent người dùng đã tạo, chạy song song theo gói.
 * Những lời hứa ở đây: hai trỏ không cùng thao tác một đích, không giật trang qua lại, dừng được
 * riêng từng trỏ, Esc dừng hết, agent tạm dừng thì trỏ của nó không chạy.
 */

let ctx: ReturnType<typeof useMimiLamHo> | null = null;
let dsTacTu: TacTuDoc[] = [];
const giaTriO: string[] = [];

function LayCtx() {
  ctx = useMimiLamHo();
  return null;
}

function TrangA() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [chung, setChung] = useState('');
  return (
    <div>
      <h1>Trang A</h1>
      <input data-mimi="o.a" value={a} onChange={(e) => setA(e.target.value)} />
      <input data-mimi="o.b" value={b} onChange={(e) => setB(e.target.value)} />
      <input data-mimi="o.chung" value={chung} onChange={(e) => { giaTriO.push(e.target.value); setChung(e.target.value); }} />
      <p data-testid="a">{a}</p>
      <p data-testid="b">{b}</p>
      <p data-testid="chung">{chung}</p>
      <button data-mimi="o.nut" onClick={() => setTimeout(() => baoKetQua({ dich: 'o.nut', ok: true, cau: 'Đã lưu.' }), 50)}>Lưu A</button>
      <button data-mimi="o.nut2">Lưu B</button>
    </div>
  );
}

function TrangB() {
  return <div><h1>Trang B</h1><span data-mimi="trang-b.muc">Mục B</span></div>;
}

const tac = (id: string, ten: string, trang_thai = 'hoat_dong'): TacTuDoc => ({ id, ten, trang_thai });

async function dung(soTro = 2) {
  render(
    <MemoryRouter initialEntries={['/dashboard/a']}>
      <MimiLamHoProvider taiTacTu={async () => dsTacTu} soTroToiDa={soTro}>
        <LayCtx />
        <Routes>
          <Route path="/dashboard/a" element={<TrangA />} />
          <Route path="/dashboard/b" element={<TrangB />} />
        </Routes>
      </MimiLamHoProvider>
    </MemoryRouter>,
  );
  await waitFor(() => expect(ctx!.dsTro.length).toBe(Math.min(soTro, dsTacTu.filter((t) => t.trang_thai === 'hoat_dong').length) || 1));
}

beforeEach(() => {
  ctx = null;
  giaTriO.length = 0;
  dsTacTu = [tac('agent-1', 'Kế toán'), tac('agent-2', 'Thu tiền')];
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({ left: 10, top: 10, right: 110, bottom: 40, width: 100, height: 30, x: 10, y: 10, toJSON: () => ({}) }) as DOMRect;
  Element.prototype.scrollIntoView = vi.fn();
  if (!globalThis.CSS?.escape) {
    Object.defineProperty(globalThis, 'CSS', { value: { escape: (s: string) => s }, configurable: true });
  }
  window.matchMedia = ((q: string) => ({
    matches: q.includes('prefers-reduced-motion'),
    media: q, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

describe('chọn trỏ theo agent và theo gói', () => {
  it('chỉ agent đang hoạt động, theo thứ tự, tối đa theo gói; màu không trùng', () => {
    const ds = [tac('a1', 'Một'), tac('a2', 'Hai', 'tam_dung'), tac('a3', 'Ba', 'thu_hoi'), tac('a4', 'Bốn'), tac('a5', 'Năm')];
    const tro = chonTro(ds, 2);
    expect(tro.map((t) => t.ten)).toEqual(['Một', 'Bốn']);
    expect(new Set(tro.map((t) => t.mau)).size).toBe(2);
    expect(chonTro(ds, 3).map((t) => t.ten)).toEqual(['Một', 'Bốn', 'Năm']);
  });

  it('chưa có agent hoạt động (hoặc chưa đọc được): vẫn có một trỏ MIMI', () => {
    expect(chonTro([], 3)).toEqual([TRO_MIMI]);
    expect(chonTro([tac('a1', 'Một', 'tam_dung')], 3)).toEqual([TRO_MIMI]);
    expect(chonTro(null, 3)).toEqual([TRO_MIMI]);
  });
});

describe('nhiều trỏ chạy song song', () => {
  it('hai agent làm hai việc cùng lúc, mỗi trỏ hiện tên mình; hết trỏ rảnh thì dangChay và việc thứ ba bị từ chối', async () => {
    await dung(2);
    expect(ctx!.dangChay).toBe(false);
    const v1 = ctx!.chay({ ten: 'x', moTa: 'gõ A', buoc: [{ loai: 'go', dich: 'o.a', chu: 'Một hai ba', noi: 'Gõ A.' }] });
    const v2 = ctx!.chay({ ten: 'x', moTa: 'gõ B', buoc: [{ loai: 'go', dich: 'o.b', chu: 'Bốn năm', noi: 'Gõ B.' }] });
    await screen.findByText('Kế toán');
    await screen.findByText('Thu tiền');
    await waitFor(() => expect(ctx!.dangChay).toBe(true));
    const v3 = await ctx!.chay({ ten: 'x', moTa: 'x', buoc: [{ loai: 'chi', dich: 'o.a', noi: '.' }] });
    expect(v3).toMatchObject({ xong: false, ketThuc: 'tu_choi' });
    expect(v3.cau).toContain('Cả 2 trỏ');
    const [k1, k2] = await Promise.all([v1, v2]);
    expect(k1.xong && k2.xong).toBe(true);
    expect(screen.getByTestId('a')).toHaveTextContent('Một hai ba');
    expect(screen.getByTestId('b')).toHaveTextContent('Bốn năm');
  }, 20_000);

  it('khoá theo đích: hai trỏ cùng gõ một ô thì lần lượt, không chen chữ vào nhau', async () => {
    await dung(2);
    const v1 = ctx!.chay({ ten: 'x', moTa: '1', buoc: [{ loai: 'go', dich: 'o.chung', chu: 'aaaa', noi: 'Gõ 1.' }] });
    const v2 = ctx!.chay({ ten: 'x', moTa: '2', buoc: [{ loai: 'go', dich: 'o.chung', chu: 'bbbb', noi: 'Gõ 2.' }] });
    expect(await screen.findByText(/chờ Kế toán làm xong ở chỗ này/)).toBeTruthy();
    const [k1, k2] = await Promise.all([v1, v2]);
    expect(k1.xong && k2.xong).toBe(true);
    // Mọi giá trị trung gian là tiền tố của ĐÚNG MỘT chuỗi; trỏ thứ hai chỉ bắt đầu sau khi trỏ đầu gõ xong.
    const dauB = giaTriO.findIndex((g) => g.startsWith('b'));
    expect(giaTriO.slice(0, dauB)).toEqual(['a', 'aa', 'aaa', 'aaaa']);
    expect(giaTriO.slice(dauB)).toEqual(['b', 'bb', 'bbb', 'bbbb']);
  }, 20_000);

  it('đổi trang xếp hàng: trỏ muốn sang trang khác chờ trỏ đang làm trên trang hiện tại xong', async () => {
    await dung(2);
    // Trỏ 1 giữ trang A cho tới khi người dùng bấm "Lưu A" (bước nhường) — không phụ thuộc tốc độ máy.
    const v1 = ctx!.chay({ ten: 'x', moTa: 'lưu A', buoc: [{ loai: 'nhuong', dich: 'o.nut', noi: 'Bạn bấm Lưu A nhé.' }] });
    await screen.findByText('Bạn bấm Lưu A nhé.');
    const v2 = ctx!.chay({ ten: 'x', moTa: 'sang B', buoc: [{ loai: 'di_toi', duongDan: '/dashboard/b', noi: 'Sang trang B.' }, { loai: 'chi', dich: 'trang-b.muc', noi: 'Mục B.' }] });
    expect(await screen.findByText(/xếp hàng, tới lượt mới đổi trang/)).toBeTruthy();
    // Trong lúc trỏ 1 còn làm trên trang A, trang không bị giật sang B.
    await new Promise((r) => setTimeout(r, 600));
    expect(screen.getByText('Trang A')).toBeTruthy();
    fireEvent.click(screen.getByText('Lưu A'));
    expect(await v1).toMatchObject({ xong: true, cau: 'Đã lưu.' });
    expect((await v2).xong).toBe(true);
    expect(screen.getByText('Trang B')).toBeTruthy();
  }, 30_000);

  it('nút Dừng của một trỏ chỉ dừng trỏ đó; trỏ kia làm tiếp tới xong', async () => {
    await dung(2);
    const v1 = ctx!.chay({ ten: 'x', moTa: '1', buoc: [{ loai: 'nhuong', dich: 'o.nut', noi: 'Trỏ một.' }, { loai: 'go', dich: 'o.a', chu: 'không được gõ', noi: 'Gõ.' }] });
    const v2 = ctx!.chay({ ten: 'x', moTa: '2', buoc: [{ loai: 'go', dich: 'o.b', chu: 'xong', noi: 'Gõ.' }] });
    await screen.findByText('Trỏ một.');
    fireEvent.click(screen.getByTitle('Chỉ dừng Kế toán'));
    const [k1, k2] = await Promise.all([v1, v2]);
    expect(k1).toMatchObject({ xong: false, ketThuc: 'da_dung' });
    expect(k2).toMatchObject({ xong: true });
    expect(screen.getByTestId('a')).toHaveTextContent('');
    expect(screen.getByTestId('b')).toHaveTextContent('xong');
  }, 20_000);

  it('Esc dừng tất cả trỏ', async () => {
    await dung(2);
    const v1 = ctx!.chay({ ten: 'x', moTa: '1', buoc: [{ loai: 'nhuong', dich: 'o.nut', noi: 'Trỏ một.' }] });
    const v2 = ctx!.chay({ ten: 'x', moTa: '2', buoc: [{ loai: 'nhuong', dich: 'o.nut2', noi: 'Trỏ hai.' }] });
    await screen.findByText('Trỏ một.');
    await screen.findByText('Trỏ hai.');
    fireEvent.keyDown(window, { key: 'Escape' });
    const [k1, k2] = await Promise.all([v1, v2]);
    expect(k1.ketThuc).toBe('da_dung');
    expect(k2.ketThuc).toBe('da_dung');
  }, 20_000);

  it('agent tạm dừng: không có trỏ; agent bị tạm dừng giữa chừng: trỏ của nó dừng và nói rõ vì sao', async () => {
    dsTacTu = [tac('agent-1', 'Kế toán'), tac('agent-2', 'Thu tiền', 'tam_dung')];
    await dung(2);
    expect(ctx!.dsTro.map((t) => t.ten)).toEqual(['Kế toán']);
    const bi = await ctx!.chay({ ten: 'x', moTa: 'x', buoc: [{ loai: 'chi', dich: 'o.a', noi: '.' }] }, { tro: 'agent-2' });
    expect(bi).toMatchObject({ xong: false, ketThuc: 'tu_choi' });

    const v = ctx!.chay({ ten: 'x', moTa: 'x', buoc: [{ loai: 'nhuong', dich: 'o.nut', noi: 'Đang xem.' }, { loai: 'go', dich: 'o.a', chu: 'không được gõ', noi: 'Gõ.' }] });
    await screen.findByText('Đang xem.');
    dsTacTu = [tac('agent-1', 'Kế toán', 'tam_dung')];
    await act(async () => { window.dispatchEvent(new Event('focus')); });
    const kq = await v;
    expect(kq).toMatchObject({ xong: false, ketThuc: 'da_dung' });
    expect(kq.cau).toContain('tạm dừng');
    expect(screen.getByTestId('a')).toHaveTextContent('');
  }, 20_000);
});
