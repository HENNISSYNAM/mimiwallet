import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { gomCuoc, nhomTheoNgay, KHOANG_CACH_CUOC } from '@/lib/lichSuHoiThoai';
import { datLaiNaoChoTest, useNaoMimi } from '@/store/naoMimi';

const docLichSu = vi.fn();
const docCuoc = vi.fn();
const xoaCuoc = vi.fn();
vi.mock('@/lib/lichSuHoiThoai', async (goc) => ({
  ...(await goc<typeof import('@/lib/lichSuHoiThoai')>()),
  docLichSu: () => docLichSu(),
  docCuoc: (ids: string[]) => docCuoc(ids),
  xoaCuoc: (ids: string[]) => xoaCuoc(ids),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

import { DanhSachLichSu } from './ThanhLichSu';

/** Lịch sử hỏi MIMI ở thanh bên trái (29/09/2026). */
describe('gom lượt thành cuộc hỏi', () => {
  const luc = (phut: number) => new Date(Date.UTC(2026, 8, 29, 3, 0) + phut * 60_000).toISOString();

  it('các lượt liền nhau là một cuộc, tiêu đề là câu đầu; nghỉ lâu thì sang cuộc mới; mới nhất trước', () => {
    const cuoc = gomCuoc([
      { id: 'c', cau_hoi: 'Còn công nợ nào quá hạn?', tao_luc: luc(120) },
      { id: 'a', cau_hoi: 'Tháng này tiền vào bao nhiêu?', tao_luc: luc(0) },
      { id: 'b', cau_hoi: 'So với tháng trước?', tao_luc: luc(10) },
    ]);
    expect(cuoc.map((c) => [c.tieuDe, c.ids])).toEqual([
      ['Còn công nợ nào quá hạn?', ['c']],
      ['Tháng này tiền vào bao nhiêu?', ['a', 'b']],
    ]);
    expect(KHOANG_CACH_CUOC).toBe(30 * 60_000);
  });

  it('chia theo ngày giờ Việt Nam', () => {
    const bayGio = Date.UTC(2026, 8, 29, 3, 0); // 10:00 29/09 giờ VN
    const c = (id: string, t: number) => ({ id, tieuDe: id, ids: [id], batDau: t, cuoiCung: t });
    const g = nhomTheoNgay([
      c('sang_nay', Date.UTC(2026, 8, 28, 18, 0)), // 01:00 29/09 giờ VN — vẫn là hôm nay
      c('hom_qua', Date.UTC(2026, 8, 28, 10, 0)),
      c('tuan_truoc', Date.UTC(2026, 8, 24, 3, 0)),
      c('cu', Date.UTC(2026, 6, 1, 3, 0)),
    ], bayGio);
    expect(g.map((x) => [x.nhom, x.cuoc.map((y) => y.id)])).toEqual([
      ['hom_nay', ['sang_nay']], ['hom_qua', ['hom_qua']], ['bay_ngay', ['tuan_truoc']], ['cu_hon', ['cu']],
    ]);
  });
});

describe('danh sách lịch sử', () => {
  beforeEach(() => {
    datLaiNaoChoTest();
    useNaoMimi.setState({ phamVi: 'u1:c1' });
    const now = new Date().toISOString();
    docLichSu.mockResolvedValue([{ id: 'h1', cau_hoi: 'Năm nay tôi có phải nộp thuế không?', tao_luc: now }]);
    docCuoc.mockResolvedValue([{ cau: 'Năm nay tôi có phải nộp thuế không?', luc: Date.now(), traLoi: { cau: 'Có, theo doanh thu năm nay.', buoc: [], ket_qua: [], che_do: 'co_dinh', do_day: 'complete', hoi_thoai_id: 'h1' } }]);
    xoaCuoc.mockResolvedValue(undefined);
  });
  afterEach(() => vi.clearAllMocks());

  const ve = () => render(<MemoryRouter initialEntries={['/dashboard']}><DanhSachLichSu /></MemoryRouter>);

  it('bấm một cuộc: đọc lại từ máy chủ và mở trong khung trợ lý, không hỏi lại', async () => {
    ve();
    fireEvent.click(await screen.findByRole('button', { name: 'Năm nay tôi có phải nộp thuế không?' }));
    await waitFor(() => expect(useNaoMimi.getState().luot).toHaveLength(1));
    expect(docCuoc).toHaveBeenCalledWith(['h1']);
    const l = useNaoMimi.getState().luot[0];
    expect([l.trangThai, l.traLoi?.cau]).toEqual(['xong', 'Có, theo doanh thu năm nay.']);
    expect(screen.getByRole('button', { name: 'Năm nay tôi có phải nộp thuế không?' }).getAttribute('aria-current')).toBe('page');
  });

  it('xoá phải xác nhận trước; xác nhận xong mới gọi xoá', async () => {
    ve();
    fireEvent.click(await screen.findByRole('button', { name: /Xoá cuộc hỏi: Năm nay/ }));
    expect(xoaCuoc).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá' }));
    await waitFor(() => expect(xoaCuoc).toHaveBeenCalledWith(['h1']));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Năm nay tôi có phải nộp thuế không?' })).toBeNull());
  });

  it('chưa có gì thì nói rõ; đọc lỗi thì cho thử lại', async () => {
    docLichSu.mockResolvedValueOnce([]);
    const { unmount } = ve();
    expect(await screen.findByText(/Chưa có cuộc hỏi nào/)).toBeTruthy();
    unmount();
    docLichSu.mockRejectedValueOnce(new Error('mạng'));
    ve();
    expect(await screen.findByRole('button', { name: 'Thử lại' })).toBeTruthy();
  });
});
