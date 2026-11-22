import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

// jsdom không có ResizeObserver (Recharts ResponsiveContainer cần).
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const gia = vi.hoisted(() => ({ dm: vi.fn(), bang: vi.fn(), id: vi.fn() }));
vi.mock('@/lib/goiVanPhong', () => ({ goiDanhMucKhach: gia.dm }));
vi.mock('@/lib/goiSpace', () => ({ docBang: gia.bang }));
vi.mock('@/lib/soLieuHome', () => ({ useSoLieuHome: () => ({ thang: [{ khoa: '2026-11', nhan: 'T11', vao: 5e6, ra: 2e6, rong: 3e6 }], khoanLon: [{ id: 'g1', ngay: '2026-11-20', noi_dung: 'NGUYEN VAN A — tien hang', chieu: 'vao', so_tien: 5e6 }] }) }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: gia.id, SU_KIEN_DOI_CONG_TY: 'mimi:cong-ty-doi' }));

import TongQuanPage, { khoangTien, tienGon, viecCanBan } from './TongQuanPage';

const CTY = 'c1';
const KHACH = {
  id: CTY, ten: 'Tạp hoá Hồng', vai_tro: 'chu_so_huu',
  doanh_thu: { nam: 2026, uoc_tinh: 9.2e8, can_duoi: 8.8e8, can_tren: 1.04e9, trang_thai: 'uoc_tinh', can_xem: true, nguong: [{ ma: 'mien_thue_1_ty', gia_tri: 1e9, phia: 'chua_chac' }] },
  tien_vao_cho_xac_nhan: { so_khoan: 3, so_tien: 7_500_000 },
  thue: { trang_thai: 'san_sang', ten_viec: 'Quý 4/2026', han: '2026-11-28', con_lai: 6, moc_ke_tiep: { ten: 'Khai quý 4', loai: 'khai', han: '2026-11-28', con_lai: 6 } },
  dong_tien_30_ngay: { tu: '2026-10-23', tien_vao: 120_000_000, tien_ra: 135_000_000, rong: -15_000_000 },
} as never;
const HANG = [
  { company_id: CTY, loai: 'phan_loai', so: 5_000_000 }, { company_id: CTY, loai: 'phan_loai', so: 2_500_000 },
  { company_id: 'khac', loai: 'phan_loai', so: 9e9 },
] as never;
const BANG = { viec: [
  { id: 'v1', company_id: CTY, tieu_de: 'Chốt quý 4', trang_thai: 'can_ban', hoi: { noi_dung: 'Mời anh soạn tờ khai.', lien_ket: '/dashboard/to-khai' }, buoc_xong: 3, buoc_tong: 4 },
  { id: 'v2', company_id: 'khac', tieu_de: 'Việc khách khác', trang_thai: 'can_ban', hoi: { noi_dung: 'x', lien_ket: null }, buoc_xong: 0, buoc_tong: 4 },
] } as never;

function Dich() { const l = useLocation(); return <p data-testid="dich">{l.pathname}{l.search}</p>; }
const ve = () => render(
  <MemoryRouter initialEntries={['/dashboard/tong-quan']}>
    <Routes><Route path="/dashboard/tong-quan" element={<TongQuanPage />} /><Route path="/dashboard" element={<Dich />} /></Routes>
  </MemoryRouter>,
);

describe('Home = Tổng quan tài chính', () => {
  beforeEach(() => {
    gia.id.mockResolvedValue(CTY);
    gia.dm.mockResolvedValue({ khach: [KHACH], hang_duyet: HANG, tong: 1 });
    gia.bang.mockResolvedValue(BANG);
  });

  it('câu đầu nói số việc chờ bạn; 4 ô số của đúng công ty đang dùng; cảnh báo hiện', async () => {
    ve();
    expect((await screen.findByTestId('cau-dau')).textContent).toBe('Hôm nay cần bạn quyết 3 việc.');
    const o = screen.getByRole('region', { name: 'Chỉ số' });
    expect(within(o).getByText('−15 triệu')).toBeTruthy();
    expect(within(o).getByText('880 triệu – 1,04 tỷ')).toBeTruthy();
    expect(within(o).getByText(/Chưa chắc trên hay dưới ngưỡng 1 tỷ/)).toBeTruthy();
    expect(within(o).getByText('Còn 6 ngày')).toBeTruthy();
    expect(within(o).getByText('3 khoản')).toBeTruthy();
    const can = screen.getByRole('region', { name: 'Cần bạn' });
    expect(within(can).queryByText(/Việc khách khác/)).toBeNull();
    expect(within(can).getByText(/2 khoản tiền vào \(7,5 triệu\)/)).toBeTruthy();
  });

  it('vai trò không xem được số cả công ty: nói rõ, không hiện số giả', async () => {
    gia.dm.mockResolvedValue({ khach: [], hang_duyet: [], tong: 0 });
    gia.bang.mockResolvedValue(null);
    ve();
    expect((await screen.findByTestId('cau-dau')).textContent).toMatch(/Không có việc nào chờ bạn/);
    expect(screen.queryByRole('region', { name: 'Chỉ số' })).toBeNull();
    expect(screen.getByText(/chưa xem được số của cả công ty/)).toBeTruthy();
  });

  it('lỗi máy chủ hiện ra', async () => {
    gia.dm.mockRejectedValue(new Error('Phiên đăng nhập đã hết. Đăng nhập lại.'));
    ve();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Đăng nhập lại/);
  });

  it('tiền gọn và việc cần bạn (thuần)', () => {
    expect([tienGon(1.04e9), tienGon(7_500_000), tienGon(-15e6), tienGon(900)]).toEqual(['1,04 tỷ', '7,5 triệu', '−15 triệu', '900 ₫']);
    expect(viecCanBan(null, [], null, CTY)).toEqual([]);
    expect(khoangTien(6200, 6200)).toBe('6.200 ₫');
    expect(khoangTien(8.8e8, 1.04e9)).toBe('880 triệu – 1,04 tỷ');
  });

  it('có thanh tab Home, bảng khoản lớn', async () => {
    ve();
    await screen.findByTestId('cau-dau');
    const tab = screen.getByRole('navigation', { name: 'Home' });
    expect(within(tab).getAllByRole('link').map((a) => a.textContent)).toEqual(['Hỏi MIMI', 'Tổng quan', 'Agentic AI Space']);
    expect(within(tab).getByRole('link', { name: 'Tổng quan' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('NGUYEN VAN A — tien hang')).toBeTruthy();
    // Không lặp ô Hỏi MIMI (đã có tab Hỏi MIMI).
    expect(screen.queryByLabelText('Câu hỏi cho MIMI')).toBeNull();
  });
});
