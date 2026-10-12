import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DangKyKinhDoanhPage from './DangKyKinhDoanhPage';
import { KHOA_LUU } from '@/lib/dangKy/hoSo';

/**
 * Trang Đăng ký kinh doanh. Không có CSDL giả vì trang không gọi máy chủ — test chốt luôn điều đó:
 * nếu ai thêm lệnh gọi Supabase, mock dưới đây sẽ ghi lại và test cuối đỏ.
 */

const gia = vi.hoisted(() => ({ goiMayChu: 0 }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: new Proxy({}, { get: () => { gia.goiMayChu += 1; return () => ({}); } }),
}));
const inTaiLieu = vi.hoisted(() => vi.fn());
vi.mock('@/lib/inTaiLieu', async (goc) => ({ ...(await goc<typeof import('@/lib/inTaiLieu')>()), inTaiLieu }));

const dung = () => render(<MemoryRouter><DangKyKinhDoanhPage /></MemoryRouter>);
const nhap = (nhan: string, gia: string, thu = 0) => fireEvent.change(screen.getAllByLabelText(nhan)[thu], { target: { value: gia } });

beforeEach(() => {
  localStorage.clear();
  gia.goiMayChu = 0;
  inTaiLieu.mockClear();
});

describe('Đăng ký kinh doanh', () => {
  it('mặc định CTCP: hồ sơ, các bước và nhãn căn cứ có trạng thái đối chiếu', () => {
    dung();
    const hoSo = screen.getByRole('list', { name: 'Hồ sơ cần có' });
    expect(hoSo.textContent).toContain('Giấy đề nghị đăng ký doanh nghiệp (công ty cổ phần)');
    expect(hoSo.textContent).toContain('Danh sách cổ đông sáng lập');
    expect(hoSo.textContent).toContain('Đã đối chiếu văn bản gốc');
    expect(hoSo.textContent).toContain('Nguồn thứ cấp, chưa đối chiếu');
    const buoc = screen.getByRole('list', { name: 'Các bước nộp' });
    expect(buoc.textContent).toContain('dangkykinhdoanh.gov.vn');
    expect(buoc.textContent).toContain('Cơ quan đăng ký kinh doanh cấp tỉnh');
    expect(document.body.textContent).toContain('Thông tư 121/2026/TT-BTC');
  });

  it('trả lời câu hỏi → gợi ý hộ kinh doanh → đổi hồ sơ sang cấp xã và Mẫu số 1 Phụ lục II', () => {
    dung();
    nhap('Bao nhiêu người (cá nhân, tổ chức) cùng góp vốn, tính cả bạn?', '1');
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Kinh doanh nhỏ, gia đình' })).getByLabelText('Có'));
    fireEvent.click(within(screen.getByRole('radiogroup', { name: 'Muốn cổ phần' })).getByLabelText('Không'));
    expect(screen.getAllByRole('status')[0].textContent).toContain('MIMI gợi ý: Hộ kinh doanh');
    fireEvent.click(screen.getByRole('button', { name: 'Dùng loại hình này' }));
    expect(screen.getByRole('list', { name: 'Các bước nộp' }).textContent).toContain('cấp xã');
    expect(screen.getByRole('article', { name: 'Giấy đề nghị đăng ký hộ kinh doanh (Mẫu số 1 Phụ lục II)' })).toBeTruthy();
  });

  it('bảng hỏi điền thẳng vào giấy xem trước; bảng hỏi giữ trong localStorage', () => {
    dung();
    nhap('Tên viết bằng tiếng Việt', 'Công ty cổ phần Ví Dụ');
    nhap('Vốn điều lệ (đồng)', '3000000000');
    const giay = screen.getByRole('article', { name: 'Giấy đề nghị đăng ký doanh nghiệp — công ty cổ phần (Mẫu số 4)' });
    expect(giay.textContent).toContain('CÔNG TY CỔ PHẦN VÍ DỤ');
    expect(giay.textContent).toContain('Ba tỷ đồng');
    expect(giay.textContent).toContain('300.000');
    expect(JSON.parse(localStorage.getItem(KHOA_LUU)!).ten_vi).toBe('Công ty cổ phần Ví Dụ');
  });

  it('còn ô trống thì liệt kê; In gọi hộp in với tên tệp không dấu', () => {
    dung();
    const bao = screen.getAllByRole('status').find((s) => s.textContent?.includes('chỗ cần sửa'))!;
    expect(bao.textContent).toContain('Thiếu tên công ty bằng tiếng Việt');
    fireEvent.click(screen.getByRole('button', { name: 'In' }));
    expect(inTaiLieu).toHaveBeenCalledTimes(1);
    expect(inTaiLieu.mock.calls[0][0]).toMatch(/^ho-so-dang-ky-cong-ty-co-phan-.*\d{4}-\d{2}-\d{2}$/);
  });

  it('xem trước từng văn bản hoặc cả bộ; điều lệ ghi rõ là khung tham khảo', () => {
    dung();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    fireEvent.click(screen.getByRole('tab', { name: 'Điều lệ công ty — khung tối thiểu (tham khảo)' }));
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('article').textContent).toContain('KHUNG THAM KHẢO');
    expect(document.body.textContent).toContain('cần người sáng lập/luật sư hoàn thiện');
  });

  it('nút xoá xoá dữ liệu đã lưu; trang không gọi máy chủ', () => {
    dung();
    nhap('Tên viết bằng tiếng Việt', 'Công ty A');
    expect(localStorage.getItem(KHOA_LUU)).toContain('Công ty A');
    fireEvent.click(screen.getByRole('button', { name: /Xoá dữ liệu đã nhập/ }));
    expect((screen.getAllByLabelText('Tên viết bằng tiếng Việt')[0] as HTMLInputElement).value).toBe('');
    expect(localStorage.getItem(KHOA_LUU) ?? '').not.toContain('Công ty A');
    expect(gia.goiMayChu).toBe(0);
  });

  it('đọc lại bảng hỏi đã lưu khi mở trang', () => {
    localStorage.setItem(KHOA_LUU, JSON.stringify({ loai: 'tnhh1', ten_vi: 'Công ty TNHH Đã Lưu' }));
    dung();
    expect(screen.getByRole('article', { name: 'Giấy đề nghị đăng ký doanh nghiệp — công ty TNHH một thành viên (Mẫu số 2)' }).textContent).toContain('CÔNG TY TNHH ĐÃ LƯU');
  });
});
