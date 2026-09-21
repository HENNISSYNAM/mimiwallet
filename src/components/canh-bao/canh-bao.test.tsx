import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import HopXacMinh from './HopXacMinh';
import TheBatThuong from './TheBatThuong';
import { canXacMinh } from '@/lib/batThuong';
import type { CanhBao, DauHieu } from '@/lib/batThuong';

/**
 * TCCN-01 phía giao diện: hộp dừng lại lúc bấm Duyệt, và thẻ cảnh báo ở màn Tổng quan.
 * Dữ liệu dưới đây là đầu vào của test, không đi vào sản phẩm.
 */

const gia = vi.hoisted(() => ({ goiTroLy: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.goiTroLy }));

const dauHieu: DauHieu[] = [
  { ma: 'doi_so_tai_khoan', muc_do: 'cao', cau: 'Trước đây bạn trả vào …1111; lần này là …9999.', can_cu: ['g1'] },
  { ma: 'tach_nho', muc_do: 'trung_binh', cau: '3 khoản tới cùng người nhận trong ngày.', can_cu: [] },
];

describe('HopXacMinh', () => {
  it('liệt kê từng dấu hiệu kèm mức; nút đi tiếp khoá tới khi tích ô xác minh', () => {
    const vanDuyet = vi.fn();
    render(<HopXacMinh dauHieu={dauHieu} lichSuDu onHuy={vi.fn()} onVanDuyet={vanDuyet} />);
    const ds = screen.getByRole('list', { name: 'Dấu hiệu bất thường' });
    expect(ds.textContent).toContain('Mức cao');
    expect(ds.textContent).toContain('…9999');
    expect(ds.textContent).toContain('Cần để ý');

    const nut = screen.getByRole('button', { name: 'Đã xác minh, vẫn duyệt' });
    expect(nut).toBeDisabled();
    fireEvent.click(nut);
    expect(vanDuyet).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Tôi đã xác minh người nhận' }));
    expect(nut).toBeEnabled();
    fireEvent.click(nut);
    expect(vanDuyet).toHaveBeenCalledTimes(1);
  });

  it('nút an toàn "Chưa duyệt" được focus sẵn — Enter theo thói quen không đi tiếp', () => {
    render(<HopXacMinh dauHieu={dauHieu} lichSuDu onHuy={vi.fn()} onVanDuyet={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Chưa duyệt' }));
  });

  it('nói rõ khi lịch sử chưa đủ, vì "người nhận mới" khi đó có thể báo nhầm', () => {
    render(<HopXacMinh dauHieu={dauHieu} lichSuDu={false} onHuy={vi.fn()} onVanDuyet={vi.fn()} />);
    expect(document.body.textContent).toContain('chỉ đọc được một phần lịch sử');
  });

  it('dauHieu = null thì hộp đóng', () => {
    render(<HopXacMinh dauHieu={null} lichSuDu onHuy={vi.fn()} onVanDuyet={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('canXacMinh', () => {
  it('nhận đúng lỗi CAN_XAC_MINH, bỏ qua mọi lỗi khác', () => {
    const loi = Object.assign(new Error('Khoản này có dấu hiệu bất thường.'), { ma: 'CAN_XAC_MINH', duLieu: { dau_hieu: dauHieu, lich_su_du: false } });
    expect(canXacMinh(loi)).toEqual({ dauHieu, lichSuDu: false });
    expect(canXacMinh(Object.assign(new Error('x'), { ma: 'KHONG_CON_CHO', duLieu: {} }))).toBeNull();
    expect(canXacMinh(new Error('mạng'))).toBeNull();
    expect(canXacMinh(null)).toBeNull();
  });
});

function ViTri() {
  const l = useLocation();
  return <span data-testid="vi-tri">{l.pathname + l.search}</span>;
}

const dungThe = () => render(
  <MemoryRouter initialEntries={['/dashboard']}>
    <Routes>
      <Route path="/dashboard" element={<TheBatThuong />} />
      <Route path="/dashboard/tro-ly" element={<ViTri />} />
    </Routes>
  </MemoryRouter>,
);

const canhBao = (x: Partial<CanhBao['khoan']>, muc: 'cao' | 'trung_binh', cau: string): CanhBao => ({
  khoan: { id: 'g9', so_tien: 45_000_000, ngay: '2026-09-14', ten_nguoi_nhan: 'Nguyen Van H', so_tai_khoan: '1234567890', noi_dung: null, ...x },
  muc_do: muc,
  dau_hieu: [{ ma: 'nguoi_nhan_moi_so_lon', muc_do: muc, cau, can_cu: [] }],
});

beforeEach(() => { gia.goiTroLy.mockReset(); });

describe('TheBatThuong (màn Tổng quan)', () => {
  it('gọi đúng action bat_thuong của tro-ly', async () => {
    gia.goiTroLy.mockResolvedValue({ tong: 0, so_cao: 0, canh_bao: [], lich_su_du: true, so_khoan_da_xet: 12 });
    dungThe();
    await waitFor(() => expect(gia.goiTroLy).toHaveBeenCalledWith('bat_thuong'));
  });

  it('chưa có sao kê: không hiện gì (thẻ liên kết ngân hàng đã nói việc cần làm)', async () => {
    gia.goiTroLy.mockResolvedValue({ tong: 0, so_cao: 0, canh_bao: [], lich_su_du: true, so_khoan_da_xet: 0 });
    const { container } = dungThe();
    await waitFor(() => expect(gia.goiTroLy).toHaveBeenCalled());
    expect(container.textContent).toBe('');
  });

  it('không có dấu hiệu: một dòng xác nhận đã kiểm, kèm số khoản đã so', async () => {
    gia.goiTroLy.mockResolvedValue({ tong: 0, so_cao: 0, canh_bao: [], lich_su_du: true, so_khoan_da_xet: 128 });
    dungThe();
    expect(await screen.findByText('Không thấy dấu hiệu bất thường trong 30 ngày qua')).toBeTruthy();
    expect(document.body.textContent).toContain('128 khoản chi');
  });

  it('có dấu hiệu: đếm, nêu mức và lý do, nói rõ "chưa phải kết luận", và dẫn sang MIMI Assistant', async () => {
    gia.goiTroLy.mockResolvedValue({
      tong: 2, so_cao: 1, lich_su_du: true, so_khoan_da_xet: 40,
      canh_bao: [
        canhBao({}, 'cao', 'Lần đầu trả cho người nhận này, và 45.000.000 ₫ là khoản lớn.'),
        canhBao({ id: 'g8', so_tien: 9_000_000, ten_nguoi_nhan: 'Công ty A' }, 'trung_binh', 'Vượt xa mức thường trả.'),
      ],
    });
    dungThe();
    const the = await screen.findByRole('region', { name: 'Dấu hiệu bất thường' });
    expect(the.textContent).toContain('2 khoản chi 30 ngày qua có dấu hiệu bất thường · 1 khoản mức cao');
    expect(the.textContent).toContain('14/09/2026 · 45.000.000 ₫ · Nguyen Van H');
    expect(the.textContent).toContain('Lần đầu trả cho người nhận này');
    expect(the.textContent).toContain('chưa phải kết luận');
    // Không có nút "bỏ qua" giả: chưa có chỗ lưu lựa chọn đó ở máy chủ.
    expect(screen.queryByRole('button', { name: /bỏ qua/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Hỏi MIMI chi tiết/ }));
    const viTri = await screen.findByTestId('vi-tri');
    expect(decodeURIComponent(viTri.textContent!)).toBe('/dashboard/tro-ly?hoi=Có giao dịch nào bất thường hay có dấu hiệu lừa đảo không?');
  });

  it('lỗi máy chủ: không hiện thẻ nào, không bịa trạng thái "an toàn"', async () => {
    gia.goiTroLy.mockRejectedValue(new Error('500'));
    const { container } = dungThe();
    await waitFor(() => expect(gia.goiTroLy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).not.toContain('Không thấy dấu hiệu');
  });
});
