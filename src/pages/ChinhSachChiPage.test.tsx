import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChinhSachChiPage from './ChinhSachChiPage';

/**
 * Màn Chính sách chi nằm sau đăng nhập, nên kiểm bằng dựng giao diện với CSDL giả:
 * đủ hàng, văn bản chính sách khớp luật, và lưu một luật thì gửi đủ mọi trường
 * còn lại — `luu_chinh_sach` ghi đè cả dòng, thiếu trường là mất luật.
 */

const gia = vi.hoisted(() => ({
  goiTacTu: vi.fn(),
  duLieu: {} as Record<string, unknown>,
}));

vi.mock('@/lib/goiTacTu', () => ({ goiTacTu: gia.goiTacTu }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => {
  const bang = (ten: string) => {
    const kq = () => ({ data: gia.duLieu[ten], error: null });
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'neq', 'order', 'limit']) q[m] = () => q;
    q.maybeSingle = () => Promise.resolve(kq());
    q.then = (ok: (v: unknown) => unknown, sai?: (e: unknown) => unknown) => Promise.resolve(kq()).then(ok, sai);
    return q;
  };
  return {
    supabase: {
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }),
        // Mã nay đọc người dùng từ phiên có sẵn (src/lib/nguoiDung.ts), không đi mạng.
        getSession: () => Promise.resolve({ data: { session: { user: { id: 'u-1' } } }, error: null }),
      },
      from: bang,
    },
  };
});

const CHINH_SACH = {
  tac_tu_id: 'tt-1',
  company_id: 'cty-1',
  han_muc_moi_lan: 1_000_000,
  han_muc_ngay: 3_000_000,
  han_muc_thang: 20_000_000,
  nguong_can_duyet: 0,
  nhom_chi_duoc_phep: null,
  chi_tra_nguoi_nhan_da_duyet: true,
  het_han: null,
  so_yeu_cau_moi_gio: 30,
  updated_at: '2026-09-15T03:00:00Z',
};

const dung = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/chinh-sach']}>
      <ChinhSachChiPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  gia.goiTacTu.mockReset().mockResolvedValue({ ok: true });
  gia.duLieu = {
    companies: { id: 'cty-1' },
    tac_tu: [{ id: 'tt-1', ten: 'agent-quang-cao', trang_thai: 'hoat_dong' }],
    chinh_sach_chi: [CHINH_SACH],
    nguoi_nhan_duoc_phep: [],
  };
});

describe('màn Chính sách chi', () => {
  it('mỗi luật một hàng kèm giá trị, luật an toàn ghi Luôn bật, văn bản đủ 9 điều', async () => {
    const { container } = dung();
    await screen.findByRole('heading', { name: 'Chính sách chi' });

    const hang = [...container.querySelectorAll('[data-mimi^="chinh-sach."]')].map((b) => b.getAttribute('data-mimi'));
    expect(hang).toHaveLength(9);
    expect(container.querySelector('[data-mimi="chinh-sach.duyet"]')?.textContent).toContain('Mọi khoản');
    expect(container.querySelector('[data-mimi="chinh-sach.nguoi-nhan-moi"]')?.textContent).toContain('Luôn bật');
    expect(container.querySelector('[data-mimi="chinh-sach.doi-so-tk"]')?.textContent).toContain('Luôn bật');

    const dieu = container.querySelectorAll('aside ol li');
    expect(dieu).toHaveLength(9);
    expect(container.querySelector('aside')?.textContent).toContain('Mọi khoản đều phải có người duyệt.');
  });

  it('sửa ngưỡng duyệt thì gửi ngưỡng mới cùng mọi trường cũ', async () => {
    const { container } = dung();
    await screen.findByRole('heading', { name: 'Chính sách chi' });
    fireEvent.click(container.querySelector('[data-mimi="chinh-sach.duyet"]')!);

    const ngan = await screen.findByRole('dialog');
    fireEvent.change(within(ngan).getByRole('textbox'), { target: { value: '500.000' } });
    fireEvent.click(within(ngan).getByRole('button', { name: /Lưu/ }));

    await waitFor(() => expect(gia.goiTacTu).toHaveBeenCalledTimes(1));
    expect(gia.goiTacTu).toHaveBeenCalledWith('luu_chinh_sach', {
      tac_tu_id: 'tt-1',
      han_muc_moi_lan: 1_000_000,
      han_muc_ngay: 3_000_000,
      han_muc_thang: 20_000_000,
      nguong_can_duyet: 500_000,
      nhom_chi_duoc_phep: null,
      chi_tra_nguoi_nhan_da_duyet: true,
      het_han: null,
      so_yeu_cau_moi_gio: 30,
    });
  });

  it('hạn mức sai thứ tự thì không cho lưu', async () => {
    const { container } = dung();
    await screen.findByRole('heading', { name: 'Chính sách chi' });
    fireEvent.click(container.querySelector('[data-mimi="chinh-sach.han-muc"]')!);

    const ngan = await screen.findByRole('dialog');
    const [moiLan] = within(ngan).getAllByRole('textbox');
    fireEvent.change(moiLan, { target: { value: '5000000' } });

    expect(within(ngan).getByText('Mỗi khoản ≤ mỗi ngày ≤ mỗi tháng.')).toBeTruthy();
    expect((within(ngan).getByRole('button', { name: /Lưu/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(gia.goiTacTu).not.toHaveBeenCalled();
  });

  it('luật Luôn bật chỉ giải thích, không có nút lưu', async () => {
    const { container } = dung();
    await screen.findByRole('heading', { name: 'Chính sách chi' });
    fireEvent.click(container.querySelector('[data-mimi="chinh-sach.doi-so-tk"]')!);

    const ngan = await screen.findByRole('dialog');
    expect(ngan.textContent).toContain('không tắt được');
    expect(within(ngan).queryByRole('button', { name: /Lưu/ })).toBeNull();
  });

  it('chưa có agent thì mời thêm agent, không hiện biểu mẫu rỗng', async () => {
    gia.duLieu.tac_tu = [];
    dung();
    expect(await screen.findByText('Thêm agent đầu tiên')).toBeTruthy();
  });
});
