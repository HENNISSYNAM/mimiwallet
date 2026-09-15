import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { KhoCongCu } from './KhoCongCu';

/** Supabase giả ghi lại lời gọi; dữ liệu là đầu vào của test. */
const gia = vi.hoisted(() => ({ dong: [] as { khoa: string; thu_tu: number }[], chen: vi.fn(), xoa: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => {
  const doc = () => {
    const p = Promise.resolve({ data: gia.dong, error: null }) as Promise<unknown> & Record<string, unknown>;
    p.eq = () => p;
    p.order = () => p;
    return p;
  };
  return {
    supabase: {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => ({
        select: doc,
        delete: () => ({ eq: async (...a: unknown[]) => { gia.xoa(...a); return { error: null }; } }),
        insert: async (rows: unknown) => { gia.chen(rows); return { error: null }; },
      }),
    },
  };
});

beforeEach(() => {
  gia.dong = [];
  gia.chen.mockReset();
  gia.xoa.mockReset();
});

describe('Kho công cụ', () => {
  it('chưa chọn gì: hiện bộ mặc định đã ghim; ghim thêm thì lưu cả danh sách theo thứ tự', async () => {
    render(<KhoCongCu mo onDong={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Bỏ ghim Thư viện chứng từ' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ghim Khách nợ quá hạn' }));
    await waitFor(() => expect(gia.chen).toHaveBeenCalled());
    expect(gia.xoa).toHaveBeenCalledWith('user_id', 'u1');
    const rows = gia.chen.mock.calls[0][0] as { khoa: string; thu_tu: number; user_id: string }[];
    expect(rows.map((r) => r.khoa)).toEqual(['thu_vien', 'nhac_thue', 'doi_soat', 'duyet_chi', 'chi_phi_ai', 'cong_no']);
    expect(rows.every((r) => r.user_id === 'u1')).toBe(true);
    expect(rows.at(-1)?.thu_tu).toBe(5);
  });

  it('tìm không dấu thu hẹp danh mục', async () => {
    gia.dong = [{ khoa: 'bao_cao', thu_tu: 0 }];
    render(<KhoCongCu mo onDong={() => {}} />);
    await screen.findByRole('button', { name: 'Bỏ ghim Báo cáo thu chi' });
    fireEvent.change(screen.getByLabelText('Tìm công cụ'), { target: { value: 'to khai' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Nhắc thuế')).toBeTruthy();
  });
});
