import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const gia = vi.hoisted(() => ({ goiTroLy: vi.fn(), track: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.goiTroLy }));
vi.mock('@/lib/track', () => ({ track: gia.track }));

import { KiemNhanh } from './KiemNhanh';
import KiemChuyenTienPage from '@/pages/KiemChuyenTienPage';

function DiaChi() {
  const l = useLocation();
  return <output data-testid="dia-chi">{`${l.pathname}${l.search}`}</output>;
}

beforeEach(() => { gia.goiTroLy.mockReset(); gia.track.mockReset(); });

describe('Ô "Sắp chuyển tiền?" trên Tổng quan', () => {
  it('bấm Kiểm → trang kiểm tự kiểm MỘT lần với đúng dữ liệu; số tài khoản không nằm trong URL', async () => {
    gia.goiTroLy.mockResolvedValue({ muc_do: 'cao', dau_hieu: [{ ma: 'doi_so_tai_khoan', muc_do: 'cao', cau: 'Cùng tên nhưng khác số tài khoản lần trước.', can_cu: [] }], lich_su_du: true, trong_danh_sach_tin_cay: false, lan_tra_truoc: 7, lan_cuoi: '2026-09-01', lon_nhat_da_tra: 80000000 });
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<KiemNhanh />} />
          <Route path="/dashboard/kiem-truoc-khi-chuyen" element={<><KiemChuyenTienPage /><DiaChi /></>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Số tài khoản người nhận'), { target: { value: '0123 456 8910' } });
    fireEvent.change(screen.getByLabelText('Tên người nhận'), { target: { value: 'Cong ty ABC' } });
    fireEvent.change(screen.getByLabelText('Số tiền sắp chuyển'), { target: { value: '80000000' } });
    expect((screen.getByLabelText('Số tiền sắp chuyển') as HTMLInputElement).value).toBe('80.000.000');
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm' }));

    await waitFor(() => expect(gia.goiTroLy).toHaveBeenCalledTimes(1));
    expect(gia.goiTroLy).toHaveBeenCalledWith('kiem_truoc_khi_chuyen', expect.objectContaining({ so_tai_khoan: '01234568910', ten_nguoi_nhan: 'Cong ty ABC', so_tien: 80000000 }));
    expect(await screen.findByText(/Cùng tên nhưng khác số tài khoản/)).toBeTruthy();
    expect(screen.getByTestId('dia-chi').textContent).toBe('/dashboard/kiem-truoc-khi-chuyen');
    expect(screen.getByTestId('dia-chi').textContent).not.toMatch(/\d{6,}/);
    // Đo lường vòng chính: có ghi, nhưng không mang số tiền / số tài khoản / tên.
    expect(gia.track).toHaveBeenCalledWith('payment_check_run', { muc_do: 'cao', tu: 'kiem_nhanh' });
    expect(JSON.stringify(gia.track.mock.calls)).not.toMatch(/0123|80000000|ABC/);
    // Form trên trang đã điền sẵn để người dùng sửa và kiểm lại.
    expect((screen.getByLabelText('Số tài khoản người nhận') as HTMLInputElement).value).toBe('01234568910');
  });

  it('vào thẳng trang kiểm (không từ ô nhanh) → không tự gọi máy chủ', () => {
    render(<MemoryRouter><KiemChuyenTienPage /></MemoryRouter>);
    expect(gia.goiTroLy).not.toHaveBeenCalled();
  });
});
