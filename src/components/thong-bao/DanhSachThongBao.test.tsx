import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const gia = vi.hoisted(() => ({ goi: vi.fn(), danhDau: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: gia.goi }));
vi.mock('@/lib/thongBao', () => ({ danhDauThongBao: gia.danhDau }));
vi.mock('sonner', () => ({ toast: gia.toast }));

import { DanhSachThongBao } from './DanhSachThongBao';
import type { ThongBao } from '@/lib/thongBao';

/*
 * Bộ lọc tiền vào chạy ngầm: không có trang riêng, chỉ có thông báo kèm hai nút một chạm.
 * Dữ liệu là của cửa hàng minh hoạ.
 */
const TB: ThongBao = {
  id: 'tb1', company_id: 'c', loai: 'tien_vao', muc_do: 'can_chu_y',
  tieu_de: '200.000.000đ có vẻ là tiền vay — đang được tính vào doanh thu',
  noi_dung: 'Ngày 08/03/2026: “GIAI NGAN HDTD 0126”.', duong_dan: '/dashboard/nhac-thue',
  hanh_dong: [
    { nhan: 'Đúng, không tính', goi: 'xac_nhan_tien_vao', tham_so: { transaction_ids: ['vay'], loai: 'loan' }, chinh: true },
    { nhan: 'Là tiền bán hàng', goi: 'xac_nhan_tien_vao', tham_so: { transaction_ids: ['vay'], loai: 'business_revenue' } },
  ],
  tao_luc: new Date().toISOString(), da_doc_luc: null, da_xu_ly_luc: null,
};

beforeEach(() => { gia.goi.mockReset(); gia.danhDau.mockReset().mockResolvedValue(undefined); gia.toast.success.mockReset(); gia.toast.error.mockReset(); });
const dung = (ds: ThongBao[], onDoi = vi.fn()) => render(<MemoryRouter><DanhSachThongBao ds={ds} onDoi={onDoi} /></MemoryRouter>);

describe('danh sách thông báo', () => {
  it('một chạm: gọi đúng hành động máy chủ, đánh dấu đã xử lý, đọc lại', async () => {
    gia.goi.mockResolvedValue({ ok: true });
    const onDoi = vi.fn();
    dung([TB], onDoi);
    fireEvent.click(screen.getByRole('button', { name: 'Đúng, không tính' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('xac_nhan_tien_vao', { transaction_ids: ['vay'], loai: 'loan' }));
    await waitFor(() => expect(gia.danhDau).toHaveBeenCalledWith(['tb1'], true));
    expect(onDoi).toHaveBeenCalled();
  });

  it('hết gói (402): nói thẳng kèm lối sang gói, không đánh dấu đã xử lý', async () => {
    const { LoiGoiHam } = await import('@/lib/loiGoiHam');
    gia.goi.mockRejectedValue(new LoiGoiHam('Xác nhận thuộc gói Growth.', 402, {}));
    dung([TB]);
    fireEvent.click(screen.getByRole('button', { name: 'Là tiền bán hàng' }));
    await waitFor(() => expect(gia.toast.error).toHaveBeenCalledWith('Xác nhận thuộc gói Growth.', expect.objectContaining({ action: expect.anything() })));
    expect(gia.danhDau).not.toHaveBeenCalled();
  });

  it('đã xử lý thì không còn nút', () => {
    dung([{ ...TB, da_xu_ly_luc: new Date().toISOString(), da_doc_luc: new Date().toISOString() }]);
    expect(screen.queryByRole('button', { name: 'Đúng, không tính' })).toBeNull();
    expect(screen.getByText('Đã xử lý')).toBeTruthy();
  });

  it('chưa có gì: nói MIMI sẽ báo những gì', () => {
    dung([]);
    expect(screen.getByText(/MIMI sẽ báo khi tới hạn khai thuế/)).toBeTruthy();
  });
});
