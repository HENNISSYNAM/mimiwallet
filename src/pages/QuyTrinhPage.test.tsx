import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { apPhuongAn, chuanHoa, demBuoc, MAU, PHUONG_AN, taiNguyenCan } from '../../supabase/functions/_shared/quy-trinh/do-thi';
import { boCuc, CACH_Y } from '@/components/quy-trinh/KhungVe';

const gia = vi.hoisted(() => ({ xem: vi.fn(), sua: vi.fn(), pa: vi.fn(), gan: vi.fn(), chay: vi.fn(), buoc: vi.fn(), tay: vi.fn(), kn: vi.fn() }));
vi.mock('@/lib/goiQuyTrinh', () => ({
  xemQuyTrinh: gia.xem, suaQuyTrinh: gia.sua, doiPhuongAn: gia.pa, ganEmail: gia.gan, chayQuyTrinh: gia.chay, xuLyBuoc: gia.buoc,
  suaTay: gia.tay, ketNoi: gia.kn,
}));

import QuyTrinhPage, { soSanhHieuSuat, thoiGian } from './QuyTrinhPage';

const goc = chuanHoa(MAU.thanh_toan.do_thi);
const qt = (o: Record<string, unknown> = {}) => {
  const d = apPhuongAn(goc, 'nguoi_ai', { linhVuc: 'thanh_toan' });
  return {
    id: 'q1', company_id: 'c', ten_khach: 'Tạp hoá Hồng', tieu_de: 'Thanh toán nhà cung cấp qua agent', linh_vuc: 'thanh_toan', nguon: 'mau',
    cau_goc: 'trả NCC', phuong_an: 'nguoi_ai', trang_thai: 'nhap', do_thi: d,
    so_sanh: Object.fromEntries(PHUONG_AN.map((pa) => [pa, demBuoc(apPhuongAn(goc, pa))])),
    tai_nguyen: taiNguyenCan(d), ket_noi: [], lan_chay: null, trang_thai_chay: null, hieu_suat: null, lich_su: [],
    goi_y: [{ khoa: 'pa:ai', cau: 'Thử AI tối đa', hanh_dong: { thao_tac: 'doi_phuong_an', phuong_an: 'ai' } }],
    chuan: [{ muc: 'nen', cau: '"Chuyển tiền": chưa ghi vai trò phụ trách.', nut_id: 'chuyen' }], kien_thuc: ['COSO 2013'],
    tin: [{ id: 1, vai: 'nguoi', noi_dung: 'trả NCC', luc: '' }, { id: 2, vai: 'mimi', noi_dung: 'Đã dựng từ thư viện', luc: '' }], ...o,
  };
};
const ve = () => render(<MemoryRouter initialEntries={['/dashboard/space/q1']}><Routes><Route path="/dashboard/space/:id" element={<QuyTrinhPage />} /></Routes></MemoryRouter>);

describe('không gian workflow một trang', () => {
  beforeEach(() => { Object.values(gia).forEach((f) => { f.mockReset(); f.mockResolvedValue(undefined); }); gia.xem.mockResolvedValue(qt()); });

  it('khung nền trắng từ trên xuống, mèo trên bước agent, đốm chạy; badge "cần cấu hình"; chat ở phải', async () => {
    ve();
    const khung = await screen.findByTestId('khung-ve');
    const d = apPhuongAn(goc, 'nguoi_ai', { linhVuc: 'thanh_toan' });
    for (const n of d.nut) expect(within(khung).getByTestId(`nut-${n.id}`)).toBeTruthy();
    expect(khung.querySelectorAll('animateMotion').length).toBe(d.canh.length * 2);
    expect(within(khung).getAllByRole('img', { name: /Mèo/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /bước cần cấu hình/ })).toBeTruthy();
    expect(within(screen.getByRole('complementary', { name: 'Chat sửa workflow' })).getByText('Đã dựng từ thư viện')).toBeTruthy();
  });

  it('chọn bước: đổi mèo, đổi tên, xoá — gọi đúng thao tác, không rời trang', async () => {
    ve();
    fireEvent.click(await screen.findByTestId('nut-kiem_nhan'));
    const bang = screen.getByTestId('buoc-dang-chon');
    fireEvent.click(within(bang).getByRole('radio', { name: /Mèo Bảo vệ/ }));
    await waitFor(() => expect(gia.tay).toHaveBeenCalledWith('q1', { thao_tac: 'doi_meo', nut_id: 'kiem_nhan', meo: 'bao_ve' }));
    const ten = within(bang).getByLabelText('Tên bước');
    fireEvent.change(ten, { target: { value: 'Xác minh người nhận' } });
    fireEvent.blur(ten);
    await waitFor(() => expect(gia.tay).toHaveBeenCalledWith('q1', { thao_tac: 'doi_ten', nut_id: 'kiem_nhan', ten: 'Xác minh người nhận' }));
    fireEvent.click(within(screen.getByTestId('buoc-dang-chon')).getByRole('button', { name: /Xoá bước/ }));
    await waitFor(() => expect(gia.tay).toHaveBeenCalledWith('q1', { thao_tac: 'xoa', nut_id: 'kiem_nhan' }));
  });

  it('dán API key ngay tại bước (không chuyển trang), khoá ở ô mật khẩu', async () => {
    ve();
    fireEvent.click(await screen.findByTestId('nut-doc_hd'));
    const bang = screen.getByTestId('buoc-dang-chon');
    expect(within(bang).getByLabelText('API key').getAttribute('type')).toBe('password');
    fireEvent.change(within(bang).getByLabelText('Endpoint'), { target: { value: 'https://api.ocr.vn/doc' } });
    fireEvent.change(within(bang).getByLabelText('API key'), { target: { value: 'sk-thu' } });
    fireEvent.click(within(bang).getByRole('button', { name: 'Kết nối' }));
    await waitFor(() => expect(gia.kn).toHaveBeenCalledWith('q1', { cong_cu: 'doc_chung_tu', kieu: 'api', url: 'https://api.ocr.vn/doc', khoa: 'sk-thu', cong_cu_mcp: undefined }));
    expect(screen.queryByRole('link', { name: /Kết nối/ })).toBeNull();
  });

  it('cổng duyệt do luật thêm thì khoá sửa; bước duyệt thêm được nhánh "Cần sửa"', async () => {
    gia.xem.mockResolvedValue(qt());
    ve();
    fireEvent.click(await screen.findByTestId('nut-duyet_chuyen'));
    expect(within(screen.getByTestId('buoc-dang-chon')).getByText(/luật an toàn tự thêm/)).toBeTruthy();
    expect(within(screen.getByTestId('buoc-dang-chon')).queryByRole('button', { name: /Xoá bước/ })).toBeNull();
  });

  it('thêm bước từ bảng trái; kiểm chuẩn + áp đề xuất; chốt & chạy; chat sửa', async () => {
    ve();
    await screen.findByTestId('khung-ve');
    fireEvent.click(screen.getByRole('button', { name: /Người duyệt Có người ký duyệt/ }));
    await waitFor(() => expect(gia.tay).toHaveBeenCalledWith('q1', expect.objectContaining({ thao_tac: 'them_sau', lam: 'duyet' })));
    fireEvent.click(screen.getByRole('tab', { name: /Kiểm chuẩn/ }));
    expect(screen.getByText('COSO 2013')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Áp dụng' }));
    await waitFor(() => expect(gia.pa).toHaveBeenCalledWith('q1', 'ai'));
    fireEvent.click(screen.getByRole('button', { name: /Chốt & chạy/ }));
    await waitFor(() => expect(gia.chay).toHaveBeenCalledWith('q1'));
    fireEvent.change(screen.getByLabelText('Nhắn MIMI để sửa workflow'), { target: { value: 'thêm bước CFO duyệt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(gia.sua).toHaveBeenCalledWith('q1', 'thêm bước CFO duyệt'));
  });

  it('đang chạy: duyệt / cần sửa ngay tại bước', async () => {
    const d = apPhuongAn(goc, 'nguoi_ai');
    const buoc = Object.fromEntries(d.nut.map((n) => [n.id, { tt: 'xong' }]));
    buoc.duyet_chuyen = { tt: 'can_nguoi' }; buoc.chuyen = { tt: 'cho' }; buoc.doi_soat = { tt: 'cho' };
    gia.xem.mockResolvedValue(qt({ trang_thai: 'dang_chay', lan_chay: { bat_dau: '2026-11-22T03:00:00Z', buoc }, trang_thai_chay: 'can_ban' }));
    ve();
    fireEvent.click(await screen.findByTestId('nut-duyet_chuyen'));
    fireEvent.click(within(screen.getByTestId('buoc-dang-chon')).getByRole('button', { name: /Duyệt/ }));
    await waitFor(() => expect(gia.buoc).toHaveBeenCalledWith('q1', 'duyet_chuyen', 'duyet'));
  });

  it('bố cục từ trên xuống; số đo (thuần)', () => {
    const { vi_tri } = boCuc(apPhuongAn(goc, 'nguoi'));
    expect(vi_tri.doc_hd.y - vi_tri.bat_dau.y).toBe(CACH_Y);
    expect(vi_tri.doc_hd.x).toBe(vi_tri.bat_dau.x);
    expect([thoiGian(null), thoiGian(30_000), thoiGian(5 * 60_000)]).toEqual(['chưa xong', '30 giây', '5 phút']);
    const hs = (tong: number) => ({ tong_ms: tong, cho_nguoi_ms: 0, agent_ms: 0, buoc_agent: 0, buoc_nguoi: 0, lam_tay: 0 });
    expect(soSanhHieuSuat([{ phuong_an: 'ai', trang_thai: 'xong', hieu_suat: hs(100) }, { phuong_an: 'ai', trang_thai: 'dung', hieu_suat: hs(1) }]))
      .toEqual([{ pa: 'ai', lan: 1, tb_ms: 100, tb_nguoi_ms: 0 }]);
  });
});
