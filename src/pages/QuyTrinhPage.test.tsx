import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { apPhuongAn, chuanHoa, demBuoc, MAU, PHUONG_AN, taiNguyenCan } from '../../supabase/functions/_shared/quy-trinh/do-thi';
import { boCuc, CACH_X } from '@/components/quy-trinh/KhungVe';

const gia = vi.hoisted(() => ({ xem: vi.fn(), sua: vi.fn(), pa: vi.fn(), gan: vi.fn(), chay: vi.fn(), buoc: vi.fn() }));
vi.mock('@/lib/goiQuyTrinh', () => ({
  xemQuyTrinh: gia.xem, suaQuyTrinh: gia.sua, doiPhuongAn: gia.pa, ganEmail: gia.gan, chayQuyTrinh: gia.chay, xuLyBuoc: gia.buoc,
}));

import QuyTrinhPage, { soSanhHieuSuat, thoiGian } from './QuyTrinhPage';

const goc = chuanHoa(MAU.thanh_toan.do_thi);
const qt = (o: Record<string, unknown> = {}) => {
  const d = apPhuongAn(goc, 'nguoi_ai');
  return {
    id: 'q1', company_id: 'c', ten_khach: 'Tạp hoá Hồng', tieu_de: 'Thanh toán nhà cung cấp qua agent', linh_vuc: 'thanh_toan', nguon: 'mau',
    cau_goc: 'trả NCC', phuong_an: 'nguoi_ai', trang_thai: 'nhap', do_thi: d,
    so_sanh: Object.fromEntries(PHUONG_AN.map((pa) => [pa, demBuoc(apPhuongAn(goc, pa))])),
    tai_nguyen: taiNguyenCan(d), lan_chay: null, trang_thai_chay: null, hieu_suat: null, lich_su: [],
    tin: [{ id: 1, vai: 'nguoi', noi_dung: 'trả NCC', luc: '' }, { id: 2, vai: 'mimi', noi_dung: 'Đã dựng workflow từ mẫu', luc: '' }], ...o,
  };
};
const ve = () => render(<MemoryRouter initialEntries={['/dashboard/space/q1']}><Routes><Route path="/dashboard/space/:id" element={<QuyTrinhPage />} /></Routes></MemoryRouter>);

describe('trang workflow', () => {
  beforeEach(() => { Object.values(gia).forEach((f) => f.mockReset()); gia.xem.mockResolvedValue(qt()); });

  it('bản nháp: khung vẽ có mọi bước, đốm sáng chạy trên mọi đường; ba phương án có số bước; chat ở cột phải', async () => {
    ve();
    const khung = await screen.findByTestId('khung-ve');
    const d = apPhuongAn(goc, 'nguoi_ai');
    for (const n of d.nut) expect(within(khung).getByTestId(`nut-${n.id}`)).toBeTruthy();
    expect(khung.querySelectorAll('[data-hoat-dong="1"]')).toHaveLength(d.canh.length);
    expect(khung.querySelectorAll('animateMotion').length).toBe(d.canh.length * 3);
    expect(screen.getByRole('radio', { name: /Người \+ AI/ }).getAttribute('aria-checked')).toBe('true');
    const chat = screen.getByRole('complementary', { name: 'Chat sửa workflow' });
    expect(within(chat).getByText('Đã dựng workflow từ mẫu')).toBeTruthy();
    expect(screen.getByText(/Chưa chạy lần nào/)).toBeTruthy();
  });

  it('chat sửa workflow, đổi phương án, chốt & chạy', async () => {
    gia.sua.mockResolvedValue(undefined); gia.pa.mockResolvedValue(undefined); gia.chay.mockResolvedValue(undefined);
    ve();
    await screen.findByTestId('khung-ve');
    fireEvent.change(screen.getByLabelText('Nhắn MIMI để sửa workflow'), { target: { value: 'thêm bước CFO duyệt' } });
    fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
    await waitFor(() => expect(gia.sua).toHaveBeenCalledWith('q1', 'thêm bước CFO duyệt'));
    fireEvent.click(screen.getByRole('radio', { name: /AI tối đa/ }));
    await waitFor(() => expect(gia.pa).toHaveBeenCalledWith('q1', 'ai'));
    fireEvent.click(screen.getByRole('button', { name: /Chốt & chạy/ }));
    await waitFor(() => expect(gia.chay).toHaveBeenCalledWith('q1'));
  });

  it('bước người phụ trách: gán Gmail; bước cần kết nối chỉ lối Kết nối', async () => {
    gia.gan.mockResolvedValue(undefined);
    ve();
    fireEvent.click(await screen.findByTestId('nut-chuyen'));
    fireEvent.change(screen.getByLabelText(/Gmail người phụ trách/), { target: { value: 'ketoan@cty.vn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(gia.gan).toHaveBeenCalledWith('q1', 'chuyen', 'ketoan@cty.vn'));
    fireEvent.click(screen.getByTestId('nut-doc_hd'));
    expect(screen.getByText('cần kết nối')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'mở Kết nối' }).getAttribute('href')).toBe('/dashboard/ket-noi');
  });

  it('đang chạy: bước chờ người nhấp nháy; duyệt / từ chối gọi máy chủ; đốm chỉ chạy trên đường đang hoạt động', async () => {
    const d = apPhuongAn(goc, 'nguoi_ai');
    const duyet = d.nut.find((n) => n.loai === 'duyet')!;
    const buoc = Object.fromEntries(d.nut.map((n) => [n.id, { tt: 'cho' }]));
    const truoc = d.canh.find((c) => c.den === duyet.id)!.tu;
    for (const id of ['bat_dau', 'doc_hd', 'kiem_nhan', 'lenh_chi']) buoc[id] = { tt: 'xong' };
    buoc[truoc] = { tt: 'xong' };
    buoc[duyet.id] = { tt: 'can_nguoi' };
    gia.xem.mockResolvedValue(qt({ trang_thai: 'dang_chay', lan_chay: { bat_dau: '2026-11-22T03:00:00Z', buoc }, trang_thai_chay: 'can_ban' }));
    gia.buoc.mockResolvedValue(undefined);
    ve();
    const n = await screen.findByTestId(`nut-${duyet.id}`);
    expect(n.getAttribute('data-tt')).toBe('can_nguoi');
    expect(screen.getByText('Chờ người')).toBeTruthy();
    const khung = screen.getByTestId('khung-ve');
    expect(khung.querySelectorAll('[data-hoat-dong="1"]').length).toBeLessThan(d.canh.length);
    fireEvent.click(n);
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(gia.buoc).toHaveBeenCalledWith('q1', duyet.id, 'duyet'));
  });

  it('bố cục và số đo (thuần)', () => {
    const { vi_tri } = boCuc(apPhuongAn(goc, 'nguoi'));
    expect(vi_tri.doc_hd.x - vi_tri.bat_dau.x).toBe(CACH_X);
    expect([thoiGian(null), thoiGian(30_000), thoiGian(5 * 60_000), thoiGian(2 * 3_600_000)]).toEqual(['chưa xong', '30 giây', '5 phút', '2 giờ']);
    const hs = (tong: number, nguoi: number) => ({ tong_ms: tong, cho_nguoi_ms: nguoi, agent_ms: 0, buoc_agent: 0, buoc_nguoi: 0, lam_tay: 0 });
    expect(soSanhHieuSuat([
      { phuong_an: 'nguoi', trang_thai: 'xong', hieu_suat: hs(600_000, 600_000) },
      { phuong_an: 'nguoi_ai', trang_thai: 'xong', hieu_suat: hs(200_000, 100_000) },
      { phuong_an: 'nguoi_ai', trang_thai: 'xong', hieu_suat: hs(400_000, 100_000) },
      { phuong_an: 'ai', trang_thai: 'dung', hieu_suat: hs(1, 1) },
    ])).toEqual([{ pa: 'nguoi', lan: 1, tb_ms: 600_000, tb_nguoi_ms: 600_000 }, { pa: 'nguoi_ai', lan: 2, tb_ms: 300_000, tb_nguoi_ms: 100_000 }]);
  });
});
