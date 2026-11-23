import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const gia = vi.hoisted(() => ({ xem: vi.fn(), chay: vi.fn(), buoc: vi.fn(), sua: vi.fn() }));
vi.mock('@/lib/goiQuyTrinh', () => ({ xemQuyTrinh: gia.xem, chayQuyTrinh: gia.chay, xuLyBuoc: gia.buoc, suaQuyTrinh: gia.sua }));

import NhomChat from './NhomChat';

const nut = (id: string, ten: string, meo: string | null, loai = 'agent') => ({ id, ten, meo, loai, lam: loai === 'agent' ? 'agent' : 'nguoi', vai_tro: loai === 'duyet' ? 'CFO' : null });
const qt = (trang: string, tin: unknown[], buoc: Record<string, { tt: string }> = {}) => ({
  id: 'q1', tieu_de: 'Thanh toán nhà cung cấp', trang_thai: trang, lan_chay: trang === 'nhap' ? null : { buoc },
  do_thi: { nut: [nut('k', 'Bắt đầu', null, 'kich_hoat'), nut('a', 'Khớp 3 bên', 'doi_soat'), nut('d', 'CFO duyệt', null, 'duyet')], canh: [] }, tin,
});
const ve = () => render(<NhomChat id="q1" onVe={vi.fn()} onMoKhung={vi.fn()} />);

describe('nhóm chat của workflow', () => {
  beforeEach(() => Object.values(gia).forEach((f) => f.mockReset()));

  it('mèo lên tiếng, mèo khác thả cảm xúc, người được ghi nhận; có ngăn cách ngày', async () => {
    gia.xem.mockResolvedValue(qt('xong', [
      { id: 1, vai: 'mimi', meo: 'doi_soat', noi_dung: '✓ Khớp 3 bên — 12 hoá đơn', luc: '2026-11-20T03:00:00Z', phan_ung: [{ meo: 'dong_tien', emoji: '👍' }] },
      { id: 2, vai: 'mimi', meo: 'dong_tien', noi_dung: 'Nhận rồi, em làm tiếp nhé 👌', luc: '2026-11-20T03:00:01Z', phan_ung: [] },
      { id: 3, vai: 'nguoi', noi_dung: '✓ Đã duyệt: CFO duyệt', luc: '2026-11-20T03:05:00Z', phan_ung: [{ meo: 'thu_ky', emoji: '❤️' }] },
    ]));
    ve();
    expect(await screen.findByText('✓ Khớp 3 bên — 12 hoá đơn')).toBeTruthy();
    expect(screen.getByLabelText('Mèo Dòng tiền thả 👍')).toBeTruthy();
    expect(screen.getByLabelText('Mèo Thư ký thả ❤️')).toBeTruthy();
    expect(screen.getByText('20/11/2026')).toBeTruthy();
    expect(screen.getByText('Nhận rồi, em làm tiếp nhé 👌')).toBeTruthy();
  });

  it('bước cần người hiện thẻ ngay trên ô nhắn; bấm Duyệt gọi đúng bước', async () => {
    gia.xem.mockResolvedValue(qt('dang_chay', [], { a: { tt: 'xong' }, d: { tt: 'can_nguoi' } }));
    gia.buoc.mockResolvedValue(undefined);
    ve();
    const the = await screen.findByTestId('viec-can-ban');
    expect(the.textContent).toMatch(/CFO duyệt/);
    fireEvent.click(within(the).getByRole('button', { name: /Duyệt/ }));
    await waitFor(() => expect(gia.buoc).toHaveBeenCalledWith('q1', 'd', 'duyet'));
  });

  it('bản nháp có nút Chốt & chạy; nhắn vào nhóm để sửa quy trình', async () => {
    gia.xem.mockResolvedValue(qt('nhap', []));
    gia.chay.mockResolvedValue(undefined); gia.sua.mockResolvedValue(undefined);
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Chốt & chạy/ }));
    await waitFor(() => expect(gia.chay).toHaveBeenCalledWith('q1'));
    fireEvent.change(screen.getByLabelText('Nhắn vào nhóm để sửa quy trình'), { target: { value: 'thêm bước CFO duyệt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(gia.sua).toHaveBeenCalledWith('q1', 'thêm bước CFO duyệt'));
  });
});
