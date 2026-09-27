import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const traVe = vi.hoisted(() => ({ lan: [] as Array<{ data: unknown; error: unknown }> }));
const q = { select: () => q, eq: () => q, maybeSingle: async () => traVe.lan.shift() ?? { data: null, error: null } };
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => q } }));
vi.mock('@/lib/nguoiDung', () => ({ nguoiDungHienTai: async () => ({ id: 'u-1' }) }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1' }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: vi.fn(async () => ({})) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ThongTinDoanhNghiep } from './ThongTinDoanhNghiep';

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
