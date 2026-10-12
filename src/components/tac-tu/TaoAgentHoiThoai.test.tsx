import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import TaoAgentHoiThoai from './TaoAgentHoiThoai';
import type { ChinhSachRow, TacTu } from '@/lib/kiemSoatChi';

/**
 * Khung hội thoại kiểm bằng giao diện thật, máy chủ giả. Kiểm những thứ nó hứa:
 * đi hết các bước bằng nút, cuối cùng gọi ĐÚNG hai hành động sẵn có theo thứ tự,
 * khoá không in vào khung chat, /huy không gọi gì, thu hồi phải bấm nút xác nhận.
 */

const agent = (x: Partial<TacTu> = {}): TacTu => ({
  id: 'tt-1', company_id: 'cty-1', ten: 'Agent QC', trang_thai: 'hoat_dong', khoa_hien: 'mimi_ak_…abcd',
  khoa_bam: 'x', mo_ta: null, dung_lan_cuoi: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
  ...x,
} as TacTu);

function dung(ds: TacTu[] = [], goi = vi.fn()) {
  const khiCoKhoa = vi.fn();
  render(<TaoAgentHoiThoai ds={ds} chinhSach={{} as Record<string, ChinhSachRow>} goi={goi} khiCoKhoa={khiCoKhoa} />);
  const nhom = () => screen.getByRole('group', { name: 'Nút gợi ý' });
  const bam = (ten: string | RegExp) => fireEvent.click(within(nhom()).getByRole('button', { name: ten }));
  const go = (chu: string) => {
    fireEvent.change(screen.getByLabelText('Câu trả lời hoặc lệnh'), { target: { value: chu } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
  };
  const log = () => screen.getByRole('log');
  return { goi, khiCoKhoa, bam, go, log };
}

describe('tạo agent bằng hội thoại', () => {
  it('đi hết các bước bằng nút → gọi tao_tac_tu rồi luu_chinh_sach, khoá đi ra khung riêng', async () => {
    const goi = vi.fn(async (h: string) =>
      h === 'tao_tac_tu' ? { tac_tu: { id: 'tt-moi' }, khoa: 'mimi_ak_BI_MAT_123' } : { ok: true });
    const h = dung([], goi);

    h.bam('Tạo agent');
    h.go('Agent quảng cáo');
    h.bam('Quảng cáo');
    h.bam('Xong (1 nhóm)');
    h.bam('1.000.000 ₫');
    h.bam('5.000.000 ₫');
    h.bam('50.000.000 ₫');
    h.bam('500.000 ₫');
    h.bam(/^Có — người lạ bị từ chối/);
    h.bam('10.000.000 ₫');
    h.bam('08:00–20:00, thứ Hai–thứ Sáu');
    h.bam('Chờ bạn duyệt');
    h.bam('Không hết hạn');

    expect(h.log()).toHaveTextContent('Kiểm lại trước khi tạo agent "Agent quảng cáo"');
    expect(h.log()).toHaveTextContent('08:00–20:00, thứ Hai–thứ Sáu');
    expect(goi).not.toHaveBeenCalled();

    h.bam('Tạo agent');
    await waitFor(() => expect(goi).toHaveBeenCalledTimes(2));
    expect(goi.mock.calls[0]).toEqual(['tao_tac_tu', { ten: 'Agent quảng cáo', mo_ta: null }]);
    expect(goi.mock.calls[1]).toEqual(['luu_chinh_sach', {
      tac_tu_id: 'tt-moi', han_muc_moi_lan: 1_000_000, han_muc_ngay: 5_000_000, han_muc_thang: 50_000_000,
      nguong_can_duyet: 500_000, nhom_chi_duoc_phep: ['quang_cao'], chi_tra_nguoi_nhan_da_duyet: true, het_han: null,
      khung_gio_chi: { tu_phut: 480, den_phut: 1200, thu: [1, 2, 3, 4, 5] }, ngoai_khung_gio: 'cho_duyet',
      han_muc_moi_nguoi_nhan_thang: 10_000_000,
    }]);
    expect(h.khiCoKhoa).toHaveBeenCalledWith('Agent quảng cáo', 'mimi_ak_BI_MAT_123');
    await waitFor(() => expect(h.log()).toHaveTextContent('Chính sách của "Agent quảng cáo" đã lưu'));
    // Khoá chỉ hiện một lần ở khung "Khoá mới" của trang — không bao giờ nằm trong lịch sử chat.
    expect(h.log()).not.toHaveTextContent('BI_MAT');
  });

  it('gõ sai thì hỏi lại, /quaylai sửa câu trước, /huy không gọi máy chủ', () => {
    const h = dung();
    h.go('/taoagent Agent kho');
    h.bam('Mọi nhóm');
    h.go('hai triệu');
    expect(h.log()).toHaveTextContent('Mình không đọc được số tiền');
    h.go('2tr');
    h.go('1tr');
    expect(h.log()).toHaveTextContent('Hạn mức ngày không được nhỏ hơn hạn mức mỗi khoản');
    h.bam('← Sửa câu trước');
    expect(h.log()).toHaveTextContent('Mỗi khoản tối đa bao nhiêu?');
    h.go('/huy');
    expect(h.log()).toHaveTextContent('Đã thôi');
    expect(h.goi).not.toHaveBeenCalled();
  });

  it('lỗi lưu chính sách: nói thẳng agent đang ở chính sách chặt nhất, cho lưu lại mà không tạo agent thứ hai', async () => {
    let lan = 0;
    const goi = vi.fn(async (h: string) => {
      if (h === 'tao_tac_tu') return { tac_tu: { id: 'tt-moi' }, khoa: 'k' };
      if (++lan === 1) throw new Error('Hạn mức mỗi lần ≤ hạn mức ngày ≤ hạn mức tháng.');
      return { ok: true };
    });
    const h = dung([], goi);
    h.go('/taoagent Agent A');
    h.bam('Mọi nhóm');
    h.go('1tr'); h.go('2tr'); h.go('20tr'); h.go('0');
    h.bam(/^Có/); h.bam('Không giới hạn riêng'); h.bam('Mọi lúc'); h.bam('30 ngày');
    h.bam('Tạo agent');
    await waitFor(() => expect(h.log()).toHaveTextContent('chính sách CHƯA lưu'));
    h.bam('Lưu lại chính sách');
    await waitFor(() => expect(h.log()).toHaveTextContent('đã lưu'));
    expect(goi.mock.calls.filter((c) => c[0] === 'tao_tac_tu')).toHaveLength(1);
    expect(goi.mock.calls.filter((c) => c[0] === 'luu_chinh_sach')).toHaveLength(2);
  });
});

describe('lệnh với agent có sẵn', () => {
  it('/thuhoi chỉ chạy sau khi bấm nút xác nhận có tên agent', async () => {
    const goi = vi.fn(async () => ({ ok: true }));
    const h = dung([agent()], goi);
    h.go('/thuhoi agent qc');
    expect(h.log()).toHaveTextContent('VĨNH VIỄN');
    h.go('ok'); // gõ chữ không phải xác nhận
    expect(goi).not.toHaveBeenCalled();
    h.bam('Thu hồi vĩnh viễn "Agent QC"');
    await waitFor(() => expect(goi).toHaveBeenCalledWith('doi_trang_thai', { tac_tu_id: 'tt-1', trang_thai: 'thu_hoi' }));
  });

  it('/khoamoi đưa khoá ra khung riêng, /tamdung gọi doi_trang_thai', async () => {
    const goi = vi.fn(async (h: string) => (h === 'xoay_khoa' ? { khoa: 'mimi_ak_MOI' } : { ok: true }));
    const h = dung([agent()], goi);
    h.go('/khoamoi Agent QC');
    h.bam('Cấp khoá mới cho "Agent QC"');
    await waitFor(() => expect(h.khiCoKhoa).toHaveBeenCalledWith('Agent QC', 'mimi_ak_MOI'));
    expect(h.log()).not.toHaveTextContent('mimi_ak_MOI');
    h.go('/tamdung Agent QC');
    await waitFor(() => expect(goi).toHaveBeenCalledWith('doi_trang_thai', { tac_tu_id: 'tt-1', trang_thai: 'tam_dung' }));
  });

  it('lệnh thiếu tên agent → bàn phím liệt kê agent, không tự chọn', () => {
    const h = dung([agent(), agent({ id: 'tt-2', ten: 'Agent QC mới' })]);
    h.go('/thuhoi agent');
    expect(h.log()).toHaveTextContent('Chọn agent');
    h.bam('Agent QC mới');
    expect(h.log()).toHaveTextContent('Thu hồi "Agent QC mới" là VĨNH VIỄN');
    expect(h.goi).not.toHaveBeenCalled();
  });
});
