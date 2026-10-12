import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { docBangLuong } from '../../../supabase/functions/_shared/thue-tncn/khau-tru';
import { soanToKhai05 } from '../../../supabase/functions/_shared/thue-tncn/to-khai-05';
import { docBangTinh, docLoai, dongTrong, guiLen } from './bangLuong';

const gia = vi.hoisted(() => ({ goi: vi.fn() }));
vi.mock('@/lib/goiToKhai', async (goc) => {
  const that = await goc<typeof import('@/lib/goiToKhai')>();
  return { ...that, goiToKhai: gia.goi };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ToKhaiTncn } from './ToKhaiTncn';

/**
 * Máy chủ giả dựng kết quả bằng CHÍNH `docBangLuong` + `soanToKhai05` của sản phẩm, từ đúng thân yêu
 * cầu giao diện gửi — lệch hình dạng giữa hai bên là test đỏ.
 */
function mayChu(hanhDong: string, du: { nam: number; quy: number; bang_luong: unknown }) {
  if (hanhDong !== 'tncn_soan') return Promise.resolve({ ma_bam: 'a'.repeat(64) });
  const b = docBangLuong(du.bang_luong);
  if (b.ok === false) return Promise.reject(new Error(b.cau));
  const r = soanToKhai05(b.ds, { ten: 'CÔNG TY THỬ', mst: '0123456789' }, { nam: du.nam, quy: du.quy }, '2026-10-12');
  return Promise.resolve({
    nam: du.nam, quy: du.quy, hom_nay: '2026-10-12', cong_ty: { ten: 'CÔNG TY THỬ', mst: '0123456789', loai_theo_mst: null, theo_mst: null },
    to_khai: r.ok ? r.to_khai : null, nguoi: r.ok ? r.nguoi : [], ly_do_khong_soan: r.ok === false ? r.ly_do : null, can_cu: [],
    thanh_toan: { goi: null, con_luot: 0, gia_mot_to: 0, da_tra_ky_nay: false },
  });
}

beforeEach(() => { gia.goi.mockReset(); gia.goi.mockImplementation(mayChu); });

describe('bảng lương trên trình duyệt', () => {
  it('số định danh không đi lên máy chủ', () => {
    const d = { ...dongTrong(), ho_ten: 'A', ma_dinh_danh: '079123456789' };
    expect(JSON.stringify(guiLen([d]))).not.toContain('079123456789');
  });

  it('đọc tệp: bỏ dòng tiêu đề, nhận loại bằng chữ có dấu, không đoán loại trống', () => {
    const r = docBangTinh([
      ['Họ tên', 'MST/CCCD', 'Loại', 'NPT', 'TN tháng 1'],
      ['Nguyễn A', '079', 'HĐLĐ', 1, 30000000, 3150000, '30.000.000', 3150000, 30000000, 3150000, null],
      ['Trần B', null, 'Không cư trú', 0, 50000000, 0, 0, 0, 0, 0, 10000000],
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ds.map((d) => d.loai)).toEqual(['cu_tru_hdld', 'khong_cu_tru']);
    expect(r.ds[0].thang[1].tn).toBe('30.000.000');
    expect(r.ds[1].thue_da_khau_tru_quy).toBe('10000000');
    expect(docBangTinh([['C', null, '', 0, 1]]).ok).toBe(false);
    expect(docLoai('vãng lai')).toBe('cu_tru_khac');
    expect(docLoai('xyz')).toBeNull();
  });
});

describe('ToKhaiTncn', () => {
  it('nhập một người, bấm Tính → hiện mẫu 05/KK-TNCN có dấu bản xem trước và đúng số thuế', async () => {
    render(<ToKhaiTncn />);
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'Nguyễn A' } });
    fireEvent.change(screen.getByLabelText('Số người phụ thuộc'), { target: { value: '1' } });
    for (const t of [1, 2, 3]) {
      fireEvent.change(screen.getByLabelText(`Thu nhập chịu thuế tháng ${t} của quý`), { target: { value: '30000000' } });
      fireEvent.change(screen.getByLabelText(`Bảo hiểm bắt buộc tháng ${t}`), { target: { value: '3150000' } });
    }
    fireEvent.click(screen.getByRole('button', { name: /Tính thuế và soạn tờ khai/ }));
    await screen.findByText('Mẫu số: 05/KK-TNCN');
    const [hanhDong, du] = gia.goi.mock.calls[0] as [string, { nam: number; quy: number }];
    expect(hanhDong).toBe('tncn_soan');
    expect(du.quy).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Tổng số thuế thu nhập cá nhân đã khấu trừ [42]=[43]+[44]')).toBeTruthy();
    // 257.500 × 3 tháng
    expect(screen.getAllByText('772.500').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/nguồn thứ cấp, chưa đối chiếu Công báo/)).toHaveLength(2);
  });

  it('sửa bảng lương sau khi tính → bỏ kết quả cũ', async () => {
    render(<ToKhaiTncn />);
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Tính thuế và soạn tờ khai/ }));
    await screen.findByText('Mẫu số: 05/KK-TNCN');
    fireEvent.change(screen.getByLabelText('Họ tên'), { target: { value: 'B' } });
    await waitFor(() => expect(screen.queryByText('Mẫu số: 05/KK-TNCN')).toBeNull());
  });
});
