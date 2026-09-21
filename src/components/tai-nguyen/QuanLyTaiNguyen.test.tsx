import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QuanLyTaiNguyen from './QuanLyTaiNguyen';
import NoiDungBai from './NoiDungBai';

/** Màn quản lý tài nguyên của admin. Dữ liệu dưới đây là đầu vào của test. */

const gia = vi.hoisted(() => ({ ds: [] as unknown[], luu: vi.fn(), xoa: vi.fn(), loi: vi.fn(), ok: vi.fn() }));

vi.mock('sonner', () => ({ toast: { success: gia.ok, error: gia.loi } }));
vi.mock('@/lib/taiNguyen', async (goc) => {
  const that = await goc<typeof import('@/lib/taiNguyen')>();
  return { ...that, docTatCaChoAdmin: () => Promise.resolve(gia.ds), luuBai: gia.luu, xoaBai: gia.xoa };
});

const bai = {
  id: 'b1', loai: 'bao_cao', slug: 'thue-2026', tieu_de: 'Báo cáo thuế 2026', tom_tat: '', noi_dung: '', anh_bia: null,
  duong_dan_ngoai: null, bat_dau: null, ket_thuc: null, dia_diem: null, hinh_thuc: null, trang_thai: 'xuat_ban',
  xuat_ban_luc: '2026-09-20T00:00:00Z', tao_luc: '2026-09-20T00:00:00Z', sua_luc: '2026-09-20T00:00:00Z',
};

beforeEach(() => {
  gia.ds = [];
  gia.luu.mockReset().mockResolvedValue({});
  gia.xoa.mockReset().mockResolvedValue(undefined);
  gia.loi.mockReset();
  gia.ok.mockReset();
});

describe('Quản lý tài nguyên', () => {
  it('chưa có bài: nói thật là chưa có, không bày bài mẫu', async () => {
    render(<QuanLyTaiNguyen />);
    expect(await screen.findByText(/Chưa có bài nào/)).toBeTruthy();
  });

  it('bài mới: đường dẫn tự sinh theo tiêu đề; xuất bản gửi đúng dữ liệu', async () => {
    render(<QuanLyTaiNguyen />);
    fireEvent.click(await screen.findByRole('button', { name: /Bài mới/ }));
    fireEvent.change(screen.getByLabelText('Loại'), { target: { value: 'tuyen_dung' } });
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Kỹ sư Backend' } });
    expect((screen.getByLabelText('Đường dẫn') as HTMLInputElement).value).toBe('ky-su-backend');
    fireEvent.change(screen.getByLabelText('Hình thức làm việc'), { target: { value: 'Toàn thời gian' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản' }));
    await waitFor(() => expect(gia.luu).toHaveBeenCalledWith(null, expect.objectContaining({
      loai: 'tuyen_dung', tieu_de: 'Kỹ sư Backend', slug: 'ky-su-backend', hinh_thuc: 'Toàn thời gian', trang_thai: 'xuat_ban',
    })));
  });

  it('dữ liệu sai: không gửi, hiện lỗi dưới đúng ô', async () => {
    render(<QuanLyTaiNguyen />);
    fireEvent.click(await screen.findByRole('button', { name: /Bài mới/ }));
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Tiêu đề ổn' } });
    fireEvent.change(screen.getByLabelText('Ảnh bìa (https, không bắt buộc)'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    expect(await screen.findByText('Ảnh bìa phải là đường dẫn https.')).toBeTruthy();
    expect(gia.luu).not.toHaveBeenCalled();
  });

  it('xoá phải qua hộp xác nhận', async () => {
    gia.ds = [bai];
    render(<QuanLyTaiNguyen />);
    const ds = await screen.findByRole('list', { name: 'Danh sách bài' });
    fireEvent.click(within(ds).getByRole('button', { name: 'Xoá' }));
    expect(gia.xoa).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Xoá bài' }));
    await waitFor(() => expect(gia.xoa).toHaveBeenCalledWith('b1'));
  });

  it('không có quyền admin: hiện nguyên câu lỗi, không báo đã lưu', async () => {
    gia.luu.mockRejectedValueOnce(new Error('Tài khoản này không có quyền admin.'));
    render(<QuanLyTaiNguyen />);
    fireEvent.click(await screen.findByRole('button', { name: /Bài mới/ }));
    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Bài thử quyền' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }));
    await waitFor(() => expect(gia.loi).toHaveBeenCalledWith('Tài khoản này không có quyền admin.'));
    expect(gia.ok).not.toHaveBeenCalled();
  });
});

describe('NoiDungBai — hiện nội dung an toàn', () => {
  it('thẻ <script> hiện thành chữ, không thành phần tử; liên kết mở tab mới với noopener', () => {
    const { container } = render(<NoiDungBai noiDung={'<script>alert(1)</script>\n\n[MIMI](https://mimi.vn)'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
    const a = container.querySelector('a')!;
    expect(a.getAttribute('href')).toBe('https://mimi.vn');
    expect(a.getAttribute('rel')).toContain('noopener');
  });
});
