import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const goi = vi.fn();
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: (...a: unknown[]) => goi(...a) }));
const toastOk = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (...a: unknown[]) => toastOk(...a), error: vi.fn() } }));

import { PhanLoaiHoatDong } from './PhanLoaiHoatDong';

const CAC_NHOM = [
  { ma: 'phan_phoi_hang_hoa', ten: 'Phân phối, cung cấp hàng hoá' },
  { ma: 'dich_vu', ten: 'Dịch vụ, xây dựng không bao thầu nguyên vật liệu' },
];
const duLieu = (p: Record<string, unknown> = {}) => ({
  nam: 2026, loai: 'ho_kinh_doanh', nguon: 'giao_dich', tong: 954_293_000,
  nhom: { phan_phoi_hang_hoa: { so_tien: 0, so_khoan: 0 }, dich_vu: { so_tien: 0, so_khoan: 0 }, chua_ro: { so_tien: 954_293_000, so_khoan: 880 } },
  chua_ro: { so_tien: 954_293_000, so_khoan: 880, khoan: [{ id: 'k1', ngay: '2026-09-01', so_tien: 5_000_000, noi_dung: 'KHACH A — TT DON 12' }] },
  goi_y: 'phan_phoi_hang_hoa', cac_nhom: CAC_NHOM, ...p,
});

beforeEach(() => { goi.mockReset(); toastOk.mockReset(); });

describe('PhanLoaiHoatDong', () => {
  it('nói rõ số chưa rõ nhóm, và ngành đăng ký chỉ là gợi ý', async () => {
    goi.mockResolvedValueOnce(duLieu());
    render(<PhanLoaiHoatDong nam={2026} />);
    expect(await screen.findByText(/954\.293\.000đ \(880 khoản\) chưa xác định nhóm hoạt động/)).toBeTruthy();
    expect(screen.getByText(/đăng ký là việc được phép làm/)).toBeTruthy();
  });

  it('một nút cho hộ chỉ làm một việc: gửi "mọi khoản còn chưa rõ", có hoàn tác', async () => {
    goi.mockResolvedValueOnce(duLieu())
      .mockResolvedValueOnce({ ok: true, so: 880, nhom_hang_loat: 'n1' })
      .mockResolvedValueOnce(duLieu({ chua_ro: { so_tien: 0, so_khoan: 0, khoan: [] } }));
    render(<PhanLoaiHoatDong nam={2026} />);
    fireEvent.click(await screen.findByRole('button', { name: /Tất cả là Phân phối/ }));
    await waitFor(() => expect(goi).toHaveBeenCalledWith('xac_nhan_hoat_dong', {
      nguon: 'giao_dich', nam: 2026, tat_ca_chua_ro: true, hoat_dong: 'phan_phoi_hang_hoa',
    }));
    const [cau, tuy] = toastOk.mock.calls[0] as [string, { action: { label: string; onClick: () => void } }];
    expect(cau).toContain('880 khoản');
    expect(tuy.action.label).toBe('Hoàn tác');
    goi.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce(duLieu());
    tuy.action.onClick();
    await waitFor(() => expect(goi).toHaveBeenCalledWith('hoan_tac_hoat_dong', { nhom_hang_loat: 'n1' }));
  });

  it('không gợi ý khi hồ sơ nhiều ngành — phải chọn', async () => {
    goi.mockResolvedValueOnce(duLieu({ goi_y: null }));
    render(<PhanLoaiHoatDong nam={2026} />);
    await screen.findByText(/chưa xác định nhóm hoạt động/);
    expect(screen.queryByRole('button', { name: /Tất cả là/ })).toBeNull();
    expect((screen.getByRole('button', { name: 'Áp cho mọi khoản còn lại' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('doanh nghiệp: không hiện — nhóm hoạt động chỉ quyết định tờ khai của hộ kinh doanh', async () => {
    goi.mockResolvedValueOnce(duLieu({ loai: 'doanh_nghiep' }));
    const { container } = render(<PhanLoaiHoatDong nam={2026} />);
    await waitFor(() => expect(goi).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('trên Tổng quan: xếp hết rồi thì ẩn', async () => {
    goi.mockResolvedValueOnce(duLieu({ chua_ro: { so_tien: 0, so_khoan: 0, khoan: [] } }));
    const { container } = render(<PhanLoaiHoatDong nam={2026} anKhiXong />);
    await waitFor(() => expect(goi).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });
});
