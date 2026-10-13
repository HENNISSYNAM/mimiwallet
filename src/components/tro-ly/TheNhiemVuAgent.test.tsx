import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TheNhiemVuAgent } from './TheNhiemVuAgent';
import type { NhiemVuAgent } from '@/lib/goiDieuPhoi';

const NV = (sua: Partial<NhiemVuAgent> = {}): NhiemVuAgent => ({
  id: '00000000-0000-0000-0000-000000000001', agent: 'tai_lieu', ten_agent: 'Agent Tài liệu', muc_tieu: 'tìm văn bản thông tư 80',
  trang_thai: 'xong',
  buoc: [
    { chi_so: 0, mo_ta: 'Mở https://vanban.chinhphu.vn/', cong_cu: 'mo_trang', xong: true, can_duyet: false },
    { chi_so: 1, mo_ta: 'Điền ô "Tìm kiếm"', cong_cu: 'dien', xong: true, can_duyet: false },
    { chi_so: 2, mo_ta: 'Đọc nội dung trang', cong_cu: 'doc_noi_dung', xong: true, can_duyet: false },
  ],
  buoc_tiep: 3, url_hien_tai: 'https://vanban.chinhphu.vn/kq', loi: null,
  tom_tat: 'Thông tư 80/2021/TT-BTC hướng dẫn Luật Quản lý thuế.',
  nguon: [{ url: 'https://vanban.chinhphu.vn/kq', tieu_de: 'Kết quả tìm kiếm' }],
  can_duyet: null, ke_hoach_tu: 'mau', ...sua,
});

const ve = (nv: NhiemVuAgent | null, them: Partial<Parameters<typeof TheNhiemVuAgent>[0]> = {}) => {
  const f = { onDuyet: vi.fn(), onHuy: vi.fn(), onChayTiep: vi.fn() };
  render(<TheNhiemVuAgent cau="tìm văn bản thông tư 80" nv={nv} dang={false} loi={null} {...f} {...them} />);
  return f;
};

describe('thẻ nhiệm vụ agent trong hội thoại', () => {
  it('xong: hiện agent, các bước, tóm tắt kết quả và nguồn URL', () => {
    ve(NV());
    expect(screen.getByText('Agent Tài liệu')).toBeInTheDocument();
    expect(screen.getByText('Xong')).toBeInTheDocument();
    expect(screen.getByText('Mở https://vanban.chinhphu.vn/')).toBeInTheDocument();
    expect(screen.getByText(/Thông tư 80\/2021\/TT-BTC/)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Kết quả tìm kiếm/ });
    expect(link).toHaveAttribute('href', 'https://vanban.chinhphu.vn/kq');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.queryByRole('button', { name: 'Duyệt' })).toBeNull();
  });

  it('cho_duyet: nút Duyệt gọi đúng bước, Huỷ gọi huỷ', () => {
    const f = ve(NV({ trang_thai: 'cho_duyet', tom_tat: null, nguon: [], can_duyet: { buoc: 2, mo_ta: 'Nhấn "Gửi" (cần bạn duyệt)' } }));
    expect(screen.getByText(/Chỉ chạy khi bạn duyệt/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    expect(f.onDuyet).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: /Huỷ/ }));
    expect(f.onHuy).toHaveBeenCalled();
  });

  it('ban_giao: báo người dùng tự làm, không có nút duyệt', () => {
    ve(NV({ trang_thai: 'ban_giao', tom_tat: null, loi: 'Gặp mã xác nhận' }));
    expect(screen.getByText(/bàn giao cho bạn: Gặp mã xác nhận/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Duyệt' })).toBeNull();
  });

  it('runtime chưa cấu hình: hiện đúng lỗi máy chủ trả', () => {
    ve(null, { loi: 'Runtime chưa cấu hình (thiếu khoá ký hoặc địa chỉ runtime) — agent chưa chạy được, MIMI không giả vờ chạy.' });
    expect(screen.getByText(/Runtime chưa cấu hình/)).toBeInTheDocument();
  });

  it('tóm tắt có thẻ HTML từ trang: hiện như chữ, không dựng thành phần tử', () => {
    const { container } = render(<TheNhiemVuAgent cau="x" nv={NV({ tom_tat: '<img src=x onerror=alert(1)>' })} dang={false} loi={null} onDuyet={vi.fn()} onHuy={vi.fn()} onChayTiep={vi.fn()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  });
});
