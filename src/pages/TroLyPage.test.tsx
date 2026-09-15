import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TroLyPage from './TroLyPage';
import type { BoiCanh, TraLoi } from '@/lib/troLy';

/**
 * MIMI Assistant nằm sau đăng nhập: kiểm bằng dựng giao diện với edge function giả.
 * Dữ liệu dưới đây là đầu vào của test, không đi vào sản phẩm.
 */

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= RO;

const gia = vi.hoisted(() => ({ troLy: vi.fn(), tacTu: vi.fn(), chiPhiAi: vi.fn(), saoKe: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.troLy, dongBoSaoKe: gia.saoKe }));
vi.mock('@/lib/goiTacTu', () => ({ goiTacTu: gia.tacTu }));
vi.mock('@/lib/goiChiPhiAi', () => ({ goiChiPhiAi: gia.chiPhiAi }));
// Canvas không chạy trong jsdom; nền chỉ trang trí.
vi.mock('@/components/tro-ly/NenVongHat', () => ({ NenVongHat: () => <canvas aria-hidden="true" data-testid="nen" /> }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));

const BOI_CANH: BoiCanh = {
  cong_ty: 'Công ty Thử',
  co_mo_hinh: false,
  viec: [{ khoa: 'cho_duyet', nhom: 'tro_ly', cau: '1 khoản chi đang chờ bạn duyệt, tổng 2.000.000 ₫', hoi: 'Khoản nào đang chờ tôi duyệt?', muc_do: 'can_chu_y' }],
  ket_noi: [
    { khoa: 'ngan_hang', ten: 'Ngân hàng', loai: 'ngan_hang', trang_thai: 'can_xu_ly', cau: '1 tài khoản đọc sao kê, có tài khoản cần đăng nhập lại.', duong_dan: '/dashboard/fintech' },
    { khoa: 'gemini', ten: 'Google AI', loai: 'ai', trang_thai: 'chi_nhap_file', cau: 'Đang dùng file chi phí bạn tải lên.', duong_dan: '/dashboard/chi-phi-ai' },
  ],
};

const TRA_LOI: TraLoi = {
  cau: 'Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.',
  che_do: 'co_dinh',
  buoc: [
    { ten: 'hieu', cau: 'Hiểu là bạn hỏi về trợ lý & agent.' },
    { ten: 'du_lieu', cau: 'Đã đọc: Yêu cầu chi.' },
  ],
  ket_qua: [{
    nang_luc: 'yeu_cau_cho_duyet',
    nhom: 'tro_ly',
    tom_tat: 'x',
    the: [{
      loai: 'bang', tieu_de: 'Khoản đang chờ bạn duyệt',
      cot: [{ nhan: 'Người nhận', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Gửi ngày', don_vi: 'ngay' }],
      dong: [['CONG TY A', 2_000_000, '2026-09-14']],
    }],
    de_xuat: [
      { khoa: 'duyet:y1', loai: 'duyet_yeu_cau', nhan: 'Duyệt 2.000.000 ₫', mo_ta: 'Cho phép trả 2.000.000 ₫ cho CONG TY A. MIMI không chuyển tiền.', tham_so: { yeu_cau_id: 'y1' } },
      { khoa: 'tu_choi:y1', loai: 'tu_choi_yeu_cau', nhan: 'Từ chối', mo_ta: 'Từ chối khoản 2.000.000 ₫.', tham_so: { yeu_cau_id: 'y1', ghi_chu: 'Từ chối qua MIMI Assistant.' } },
    ],
    nguon: [{ ten: 'Yêu cầu chi', mo_ta: 'Ghi ở máy chủ MIMI.' }],
    trang: [{ nhan: 'Mở danh sách yêu cầu chi', duong_dan: '/dashboard/tac-tu?tab=yeu-cau' }],
  }],
};

const dung = () => render(<MemoryRouter><TroLyPage /></MemoryRouter>);

beforeEach(() => {
  gia.troLy.mockReset();
  gia.tacTu.mockReset();
  gia.troLy.mockImplementation(async (hanhDong: string) => (hanhDong === 'boi_canh' ? BOI_CANH : TRA_LOI));
});

describe('MIMI Assistant', () => {
  it('màn đầu: ô hỏi, việc cần làm tính từ máy chủ, nền chỉ trang trí', async () => {
    dung();
    expect(screen.getByRole('heading', { name: 'Hôm nay cần xử lý gì?' })).toBeTruthy();
    const viec = await screen.findByRole('region', { name: 'Việc cần làm hôm nay' });
    expect(viec.textContent).toContain('1 khoản chi đang chờ bạn duyệt');
    expect(screen.getByTestId('nen').getAttribute('aria-hidden')).toBe('true');
    // Chưa có mô hình thì nói thật cách MIMI đang hiểu câu hỏi.
    expect(document.body.textContent).toContain('theo các mẫu có sẵn');
    const nutKetNoi = within(screen.getByRole('navigation', { name: 'Lối tắt' })).getByRole('button', { name: /Kết nối/ });
    expect(nutKetNoi.textContent).toContain('1 cần xử lý');
  });

  it('hỏi → gửi đúng câu, hiện bước làm, bảng số, nguồn và nút việc', async () => {
    dung();
    await screen.findByRole('region', { name: 'Việc cần làm hôm nay' });
    fireEvent.change(screen.getByLabelText('Câu hỏi cho MIMI'), { target: { value: 'Khoản nào đang chờ tôi duyệt?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));

    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('hoi', { cau: 'Khoản nào đang chờ tôi duyệt?', pham_vi: null, lich_su: [] }));
    const bang = await screen.findByRole('table');
    expect(within(bang).getByText('2.000.000 ₫')).toBeTruthy();
    expect(within(bang).getByText('14/09/2026')).toBeTruthy();
    expect(screen.getByLabelText('MIMI đã làm gì').textContent).toContain('Đã đọc: Yêu cầu chi.');
    expect(document.body.textContent).toContain('Nguồn: Yêu cầu chi');
    expect(screen.getByRole('link', { name: 'Mở danh sách yêu cầu chi' }).getAttribute('href')).toBe('/dashboard/tac-tu?tab=yeu-cau');
  });

  it('việc chạm tiền: phải xác nhận, rồi mới gọi đúng backend duyệt; duyệt xong thì nút từ chối khoá', async () => {
    gia.tacTu.mockResolvedValue({ yeu_cau: {} });
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /1 khoản chi đang chờ bạn duyệt/ }));
    const nutDuyet = await screen.findByRole('button', { name: 'Duyệt 2.000.000 ₫' });
    expect(nutDuyet.hasAttribute('data-mimi-khong-tu-bam')).toBe(true);
    fireEvent.click(nutDuyet);

    const hop = await screen.findByRole('alertdialog');
    expect(hop.textContent).toContain('MIMI không chuyển tiền');
    expect(gia.tacTu).not.toHaveBeenCalled();
    fireEvent.click(within(hop).getByRole('button', { name: 'Xác nhận duyệt' }));

    await waitFor(() => expect(gia.tacTu).toHaveBeenCalledWith('duyet', { yeu_cau_id: 'y1' }));
    expect(await screen.findByText(/Đã duyệt/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Từ chối' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('chọn nhóm việc thì câu hỏi gửi kèm phạm vi', async () => {
    dung();
    await screen.findByRole('region', { name: 'Việc cần làm hôm nay' });
    fireEvent.click(screen.getByRole('button', { name: 'AI & token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.' }));
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('hoi', expect.objectContaining({ pham_vi: 'ai_token' })));
  });

  it('máy chủ lỗi: nói lỗi bằng lời và cho hỏi lại', async () => {
    let lan = 0;
    gia.troLy.mockImplementation(async (hanhDong: string) => {
      if (hanhDong === 'boi_canh') return BOI_CANH;
      if (lan++ === 0) throw new Error('MIMI gặp lỗi khi đọc dữ liệu. Thử lại sau ít phút.');
      return TRA_LOI;
    });
    dung();
    fireEvent.change(screen.getByLabelText('Câu hỏi cho MIMI'), { target: { value: 'dòng tiền' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));
    fireEvent.click(await screen.findByRole('button', { name: /Hỏi lại/ }));
    expect(await screen.findByRole('table')).toBeTruthy();
  });
});
