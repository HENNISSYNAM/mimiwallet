import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import XacMinhCongKhaiPage from './XacMinhCongKhaiPage';
import { kyTheoNam, lapBaoCao } from '../../supabase/functions/_shared/xac-minh/bao-cao.ts';
import { bamBaoCao } from '../../supabase/functions/_shared/xac-minh/chuan-hoa.ts';

const gia = vi.hoisted(() => ({ xem: vi.fn() }));
vi.mock('@/lib/goiXacMinh', () => ({ xemBaoCaoCongKhai: gia.xem }));

const bc = lapBaoCao({
  ky: kyTheoNam(2025, '2026-11-10')!, lap_ngay: '2026-11-10', ten_doanh_nghiep: 'Tạp hoá Mẫu',
  giao_dich: [{ id: 't1', amount: 120_000_000, type: 'income', transaction_date: '2025-03-04' }],
  phan_loai: [{ transaction_id: 't1', revenue_effect: 'include' }],
  noi_bo_ids: new Set(), suy_doan_ids: new Set(), so_tai_khoan: 1, so_lan_doi_phan_loai: 0, du_lieu_minh_hoa: false,
});

function moTrang() {
  return render(
    <MemoryRouter initialEntries={['/xac-minh/abc']}>
      <Routes><Route path="/xac-minh/:token" element={<XacMinhCongKhaiPage />} /></Routes>
    </MemoryRouter>,
  );
}

describe('Trang công khai doanh thu đã xác minh', () => {
  it('hiện báo cáo, lưu ý không phải điểm tín dụng, kiểm lại mã băm trên máy, đổi sang tiếng Anh', async () => {
    gia.xem.mockResolvedValue({
      bao_cao: bc, sha256: await bamBaoCao(bc),
      neo: { trang_thai: 'pending', neo_luc: '2026-11-10T03:00:00Z', xac_nhan_luc: null, khoi_bitcoin: null, ots: null },
      chia_se: { nguoi_nhan: 'Ngân hàng X', muc_dich: 'Vay vốn', het_han: '2026-11-24T00:00:00Z' },
    });
    moTrang();
    expect(await screen.findByText(/Doanh thu: 120\.000\.000đ/)).toBeTruthy();
    expect(screen.getAllByText('Báo cáo do chủ hộ chia sẻ, không phải điểm tín dụng.').length).toBeGreaterThan(0);
    expect(await screen.findByText(/khớp với mã kiểm tra/)).toBeTruthy();
    expect(screen.getByText(/OpenTimestamps/)).toBeTruthy();
    expect(screen.getByText('24/11/2026')).toBeTruthy();
    expect(gia.xem).toHaveBeenCalledWith('abc');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText(/Revenue: 120,000,000 VND/)).toBeTruthy();
    expect(screen.getAllByText('Shared by the business owner. This is not a credit score.').length).toBeGreaterThan(0);
  });

  it('mã băm không khớp thì cảnh báo', async () => {
    gia.xem.mockResolvedValue({
      bao_cao: bc, sha256: '00'.repeat(32),
      neo: { trang_thai: 'not_anchored', neo_luc: null, xac_nhan_luc: null, khoi_bitcoin: null, ots: null },
      chia_se: { nguoi_nhan: 'X', muc_dich: 'Y', het_han: '2026-11-24T00:00:00Z' },
    });
    moTrang();
    expect(await screen.findByText(/KHÔNG khớp/)).toBeTruthy();
  });

  it('đường dẫn hết hạn / thu hồi: nói rõ, không có báo cáo', async () => {
    gia.xem.mockRejectedValue(new Error('Đường dẫn không đúng hoặc không còn dùng được. Hỏi lại chủ hộ đã gửi cho bạn.'));
    moTrang();
    expect(await screen.findByText('Không mở được báo cáo')).toBeTruthy();
    expect(screen.queryByText(/Doanh thu:/)).toBeNull();
  });
});
