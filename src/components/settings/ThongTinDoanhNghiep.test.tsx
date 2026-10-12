import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const traVe = vi.hoisted(() => ({ lan: [] as Array<{ data: unknown; error: unknown }> }));
const q = { select: () => q, eq: () => q, maybeSingle: async () => traVe.lan.shift() ?? { data: null, error: null } };
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => q } }));
vi.mock('@/lib/nguoiDung', () => ({ nguoiDungHienTai: async () => ({ id: 'u-1' }) }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1' }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: vi.fn(async () => ({})) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { NganhNghe, ThongTinDoanhNghiep } from './ThongTinDoanhNghiep';
import { goiToKhai } from '@/lib/goiToKhai';

beforeEach(() => { traVe.lan = []; });

describe('Cài đặt → Thông tin doanh nghiệp: đọc lỗi', () => {
  it('lỗi → nói chưa tải được, KHÔNG khuyên "đăng xuất để tạo hồ sơ"; thử lại thì hiện hồ sơ', async () => {
    traVe.lan.push({ data: null, error: { message: 'timeout' } });
    traVe.lan.push({ data: { id: 'cty-1', name: 'Tiệm Thử Nghiệm', tax_id: null, industry: null, province: null }, error: null });
    render(<ThongTinDoanhNghiep />);
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được thông tin doanh nghiệp');
    expect(screen.queryByText(/Đăng xuất rồi đăng nhập lại/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(await screen.findByText(/Tiệm Thử Nghiệm/)).toBeTruthy();
  });

  it('thật sự chưa có hồ sơ (không lỗi) → vẫn giữ câu hướng dẫn cũ', async () => {
    traVe.lan.push({ data: null, error: null });
    render(<ThongTinDoanhNghiep />);
    expect(await screen.findByText(/Chưa có hồ sơ doanh nghiệp nào/)).toBeTruthy();
  });
});

describe('Cài đặt → Ngành nghề VSIC cấp 4 (12/10/2026)', () => {
  const goi = vi.mocked(goiToKhai);
  const HKD = (o: Record<string, unknown> = {}) => ({ nganh: [], nganh_chinh: null, nhom_nganh: [], loai_nguoi_nop: 'ho_kinh_doanh', goi_y: null, ...o });

  it('thêm ngành, lưu qua to-khai; hộ kinh doanh thấy GỢI Ý nhóm và chỉ ghi khi bấm xác nhận', async () => {
    const goiY = { ma: '4711', nhom: 'phan_phoi_hang_hoa', ten_nhom: 'Phân phối, cung cấp hàng hóa', vi_sao: 'Mã 4711 thuộc ngành bán buôn, bán lẻ… xác nhận nếu đúng.', da_co: false };
    const daLuu = HKD({ nganh: [{ ma: '4711', ten: 'Bán lẻ tổng hợp' }], nganh_chinh: '4711', goi_y: goiY });
    goi.mockReset();
    goi.mockImplementation(async (hd: string, du?: Record<string, unknown>) => {
      if (hd === 'doc_nganh') return HKD();
      if (hd === 'luu_nganh' && du?.xac_nhan_nhom) return { ...daLuu, nhom_nganh: ['phan_phoi_hang_hoa'], goi_y: { ...goiY, da_co: true } };
      return daLuu;
    });
    render(<NganhNghe />);
    expect(await screen.findByText('Chưa khai ngành nào.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '4711' } });
    fireEvent.change(screen.getByLabelText('Tên ngành'), { target: { value: 'Bán lẻ tổng hợp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('(ngành chính)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Lưu ngành nghề' }));
    await waitFor(() => expect(goi).toHaveBeenCalledWith('luu_nganh', { nganh: [{ ma: '4711', ten: 'Bán lẻ tổng hợp' }], nganh_chinh: '4711' }));
    expect(await screen.findByText(/Gợi ý nhóm hoạt động tính thuế: Phân phối/)).toBeTruthy();
    // Chưa bấm xác nhận thì không có lần ghi nhóm nào.
    expect(goi.mock.calls.some(([, du]) => !!(du as Record<string, unknown> | undefined)?.xac_nhan_nhom)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Đúng, dùng nhóm này' }));
    await waitFor(() => expect(goi).toHaveBeenCalledWith('luu_nganh', { xac_nhan_nhom: 'phan_phoi_hang_hoa' }));
    await waitFor(() => expect(screen.queryByText(/Gợi ý nhóm hoạt động tính thuế/)).toBeNull());
  });

  it('mã sai hình dạng → không thêm', async () => {
    goi.mockReset();
    goi.mockResolvedValue(HKD());
    render(<NganhNghe />);
    await screen.findByText('Chưa khai ngành nào.');
    fireEvent.change(screen.getByLabelText('Mã ngành'), { target: { value: '47' } });
    fireEvent.change(screen.getByLabelText('Tên ngành'), { target: { value: 'Bán lẻ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getByText('Chưa khai ngành nào.')).toBeTruthy();
  });
});
