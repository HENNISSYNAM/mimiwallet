import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { TraLoi } from '@/lib/troLy';
import { dungLichSu } from '@/lib/troLy';
import { nhanViec } from '@/lib/mimiLamHo';

/**
 * MIMI-P0-001 — contract test: widget và trang MIMI Assistant dùng chung một bộ não.
 * Widget phải gọi `tro-ly` hành động `hoi` với đúng payload trang gửi, và trình bày đúng
 * câu trả lời có cấu trúc máy chủ trả — không có endpoint, prompt hay phép tính riêng.
 */

const gia = vi.hoisted(() => ({ troLy: vi.fn(), chay: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.troLy }));
vi.mock('@/components/mimi/MimiLamHo', () => ({ useMimiLamHo: () => ({ chay: gia.chay, dangChay: false }) }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }) }));

import AIChatWidget from './AIChatWidget';

const traLoi = (cau: string, p: Partial<TraLoi> = {}): TraLoi => ({
  cau,
  che_do: 'co_dinh',
  do_day: 'complete',
  buoc: [],
  ket_qua: [{
    nang_luc: 'yeu_cau_cho_duyet', nhom: 'tro_ly', tom_tat: cau, the: [],
    de_xuat: [{ khoa: 'duyet:y1', loai: 'duyet_yeu_cau', nhan: 'Duyệt', mo_ta: 'Duyệt', tham_so: { yeu_cau_id: 'y1' } }],
    nguon: [], trang: [{ nhan: 'Mở danh sách yêu cầu chi', duong_dan: '/dashboard/tac-tu?tab=yeu-cau' }],
  }],
  ...p,
});

const dung = () => render(<MemoryRouter><AIChatWidget /></MemoryRouter>);
const hoi = (cau: string) => {
  fireEvent.change(screen.getByLabelText('Câu hỏi cho trợ lý'), { target: { value: cau } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
};

beforeEach(() => {
  gia.troLy.mockReset();
  vi.stubGlobal('fetch', gia.fetch);
  gia.fetch.mockReset();
});

describe('AIChatWidget — một bộ não với trang MIMI Assistant', () => {
  it('tiền đề: các câu dùng trong test không phải câu nhờ việc của con trỏ mèo', () => {
    for (const c of ['Tổng chi phí tháng này thế nào?', 'Câu 1', 'Câu 2', 'dòng tiền']) expect(nhanViec(c)).toBeNull();
  });

  it('gọi tro-ly/hoi với đúng payload trang gửi; không gọi function chat cũ', async () => {
    gia.troLy.mockResolvedValue(traLoi('Có 1 khoản đang chờ bạn duyệt.'));
    dung();
    fireEvent.click(screen.getByRole('button', { name: 'Trợ lý AI' }));
    hoi('Tổng chi phí tháng này thế nào?');
    // Trang gửi: { cau, pham_vi, lich_su: dungLichSu(luot) } với luot rỗng ở câu đầu.
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('hoi', { cau: 'Tổng chi phí tháng này thế nào?', pham_vi: null, lich_su: dungLichSu([]) }));
    expect(await screen.findByText('Có 1 khoản đang chờ bạn duyệt.')).toBeTruthy();
    expect(gia.fetch).not.toHaveBeenCalled();
  });

  it('lượt thứ hai gửi lịch sử dựng bằng cùng hàm với trang', async () => {
    gia.troLy.mockResolvedValueOnce(traLoi('Trả lời 1.')).mockResolvedValueOnce(traLoi('Trả lời 2.'));
    dung();
    fireEvent.click(screen.getByRole('button', { name: 'Trợ lý AI' }));
    hoi('Câu 1');
    await screen.findByText('Trả lời 1.');
    hoi('Câu 2');
    await waitFor(() => expect(gia.troLy).toHaveBeenLastCalledWith('hoi', {
      cau: 'Câu 2', pham_vi: null, lich_su: dungLichSu([{ cau: 'Câu 1', traLoi: { cau: 'Trả lời 1.' } }]),
    }));
    expect(dungLichSu([{ cau: 'Câu 1', traLoi: { cau: 'Trả lời 1.' } }])).toEqual([
      { vai: 'nguoi_dung', noi_dung: 'Câu 1' }, { vai: 'tro_ly', noi_dung: 'Trả lời 1.' },
    ]);
  });

  it('chỉ trình bày: có liên kết chi tiết, việc cần xác nhận dẫn sang trang, không có nút duyệt trong widget', async () => {
    gia.troLy.mockResolvedValue(traLoi('Có 1 khoản đang chờ bạn duyệt.'));
    dung();
    fireEvent.click(screen.getByRole('button', { name: 'Trợ lý AI' }));
    hoi('Tổng chi phí tháng này thế nào?');
    await screen.findByText('Có 1 khoản đang chờ bạn duyệt.');
    expect(screen.getByRole('link', { name: /Mở danh sách yêu cầu chi/ }).getAttribute('href')).toBe('/dashboard/tac-tu?tab=yeu-cau');
    expect(screen.getByRole('link', { name: /MIMI Assistant/ }).getAttribute('href'))
      .toBe(`/dashboard/tro-ly?hoi=${encodeURIComponent('Tổng chi phí tháng này thế nào?')}`);
    expect(screen.queryByRole('button', { name: 'Duyệt' })).toBeNull();
  });

  it('P0-002 cũng hiện ở widget: dữ liệu chưa đủ thì có nhãn cảnh báo', async () => {
    gia.troLy.mockResolvedValue(traLoi('Lưu ý độ đầy đủ — …', { do_day: 'partial' }));
    dung();
    fireEvent.click(screen.getByRole('button', { name: 'Trợ lý AI' }));
    hoi('dòng tiền');
    expect(await screen.findByText(/Dữ liệu chưa đủ/)).toBeTruthy();
  });
});
