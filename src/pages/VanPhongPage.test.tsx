import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VanPhongPage from './VanPhongPage';
import type { DanhMucKhach, KhachVanPhong } from '@/lib/goiVanPhong';

/**
 * Văn phòng kế toán dựng với edge function giả. jsdom không có WebGL — đúng tình huống máy yếu: trang phải tự về lưới
 * 2D và nói vì sao. Danh sách hiện đúng đèn; bấm bàn mở bảng khách; nút trong bảng đổi công ty đang dùng rồi mở trang.
 */
const gia = vi.hoisted(() => ({ goi: vi.fn(), chon: vi.fn(), ba: vi.fn() }));
vi.mock('@/lib/goiVanPhong', () => ({ goiDanhMucKhach: gia.goi }));
vi.mock('@/lib/congTyDangDung', () => ({ chonCongTy: gia.chon }));
// Không bao giờ được tải cảnh 3D khi máy không có WebGL.
vi.mock('@/components/van-phong/VanPhong3D', () => { gia.ba(); return { default: () => null }; });

const khach = (o: Partial<KhachVanPhong>): KhachVanPhong => ({
  id: 'k', ten: 'K', vai_tro: 'ke_toan', la_demo: false, muc: 'xanh', ly_do: [],
  doanh_thu: { nam: 2026, uoc_tinh: 10_000_000, can_duoi: 10_000_000, can_tren: 10_000_000, trang_thai: 'chac', nguong: [], can_xem: false },
  tien_vao_cho_xac_nhan: { so_khoan: 0, so_tien: 0 },
  thue: { trang_thai: 'san_sang', ten_viec: null, han: null, con_lai: null, moc_ke_tiep: null },
  viec_mo: { so: 0, chan: 0, gap: 0 }, ban_hang_hom_nay: null, dong_tien_30_ngay: null,
  hoat_dong_24h: { phan_loai: 0, thong_bao: 0, nhiem_vu: [], gan_nhat: null }, loi: null, ...o,
});

const DU: DanhMucKhach = {
  hom_nay: '2026-11-11', nam: 2026, tong: 3, trang: 1, kich_thuoc: 24, so_trang: 1,
  khach: [
    khach({
      id: 'c-an', ten: 'Tiệm An', muc: 'do',
      ly_do: [{ ma: 'nguong_chua_chac', muc: 'do', nguong: 1_000_000_000 }, { ma: 'tien_vao_cho_xac_nhan', muc: 'vang', so: 1 }],
      doanh_thu: { nam: 2026, uoc_tinh: 1_050_000_000, can_duoi: 950_000_000, can_tren: 1_050_000_000, trang_thai: 'can_xem', nguong: [{ ma: 'mien_thue_1_ty', gia_tri: 1e9, phia: 'chua_chac' }], can_xem: true },
      tien_vao_cho_xac_nhan: { so_khoan: 1, so_tien: 100_000_000 },
    }),
    khach({ id: 'c-binh', ten: 'Quán Bình', muc: 'vang', ly_do: [{ ma: 'viec_mo', muc: 'vang', so: 1 }], viec_mo: { so: 1, chan: 0, gap: 0 }, ban_hang_hom_nay: { so_lan: 2, tong: 75_000, gan_nhat: null } }),
    khach({ id: 'c-cuong', ten: 'Cửa hàng Cường', muc: 'xanh' }),
  ],
  agent: [
    { agent: 'phan_loai', company_id: 'c-an', ly_do: 'su_kien_24h', luc: '2026-11-11T00:00:00Z', so: 1 },
    { agent: 'thue', company_id: null, ly_do: null, luc: null, so: 0 },
    { agent: 'du_bao', company_id: null, ly_do: null, luc: null, so: 0 },
    { agent: 'ban_hang', company_id: 'c-binh', ly_do: 'su_kien_24h', luc: '2026-11-11T02:00:00Z', so: 2 },
    { agent: 'tai_lieu', company_id: 'c-binh', ly_do: 'viec_cho', luc: null, so: 1 },
  ],
  dem: { do: 1, vang: 1, xanh: 1 },
  loai_tru: { gioi_han_co_so: 1, vai_tro_khong_lam_so: 0, vuot_tran: 0 },
  co_bang_ban_hang: true,
};

const dung = () => render(
  <MemoryRouter initialEntries={['/dashboard/van-phong']}>
    <Routes>
      <Route path="/dashboard/van-phong" element={<VanPhongPage />} />
      <Route path="/dashboard/to-khai" element={<p>trang tờ khai</p>} />
      <Route path="/dashboard/nhac-thue" element={<p>trang nhắc thuế</p>} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => {
  // Máy không có WebGL (như jsdom thật, nhưng không in cảnh báo "chưa cài canvas").
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  localStorage.clear();
  gia.goi.mockReset().mockResolvedValue(DU);
  gia.chon.mockReset();
  gia.ba.mockReset();
});

describe('văn phòng kế toán', () => {
  it('máy không có WebGL: tự về lưới 2D, nói vì sao, không tải cảnh 3D, nút 3D bị tắt', async () => {
    dung();
    const luoi = await screen.findByTestId('luoi-ban');
    expect(within(luoi).getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('status')).toHaveTextContent(/không vẽ được 3D/);
    expect(screen.getByRole('button', { name: 'Văn phòng 3D' })).toBeDisabled();
    expect(gia.ba).not.toHaveBeenCalled();
    // Mèo phân loại đứng ở bàn Tiệm An (hoạt động thật), mèo thuế đang nghỉ.
    expect(within(screen.getByRole('button', { name: /Tiệm An/ })).getByText('Mèo Phân loại')).toBeInTheDocument();
    expect(screen.getByTestId('agent-thue')).toHaveTextContent(/đang nghỉ/);
    expect(screen.getByText(/1 khách không hiện vì bạn chỉ phụ trách một cơ sở/)).toBeInTheDocument();
  });

  it('chế độ danh sách hiện đúng đèn của từng khách, theo thứ tự máy chủ xếp', async () => {
    dung();
    await screen.findByTestId('luoi-ban');
    fireEvent.click(screen.getByRole('button', { name: 'Danh sách' }));
    const bang = screen.getByTestId('danh-sach-khach');
    const dong = within(bang).getAllByRole('row').slice(1);
    expect(dong.map((r) => r.querySelector('[data-den]')?.getAttribute('data-den'))).toEqual(['do', 'vang', 'xanh']);
    expect(dong[0]).toHaveTextContent('Tiệm An');
    expect(dong[0]).toHaveTextContent('Cần làm ngay');
    expect(dong[0]).toHaveTextContent(/trên hoặc dưới 1 tỷ/);
    expect(dong[2]).toHaveTextContent('Ổn');
    expect(screen.getByTestId('dem-do')).toHaveTextContent('1');
  });

  it('bấm bàn mở bảng khách với số của khách đó; "Soạn tờ khai" đổi công ty đang dùng rồi mở trang tờ khai', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Tiệm An/ }));
    const bang = screen.getByTestId('bang-khach');
    expect(bang).toHaveTextContent('Tiệm An');
    expect(bang).toHaveTextContent('1,05 tỷ');
    expect(bang).toHaveTextContent('từ 950 triệu đến 1,05 tỷ');
    expect(bang).toHaveTextContent('1 khoản · 100 triệu');
    fireEvent.click(within(bang).getByRole('button', { name: 'Soạn tờ khai' }));
    expect(gia.chon).toHaveBeenCalledWith('c-an');
    expect(await screen.findByText('trang tờ khai')).toBeInTheDocument();
  });

  it('hàng chờ duyệt gom việc cần người quyết, nặng trước, mỗi dòng một nút tới đúng trang', async () => {
    dung();
    const hang = await screen.findByTestId('hang-duyet');
    const dong = within(hang).getAllByRole('listitem');
    expect(dong).toHaveLength(3); // khách xanh không có dòng nào
    expect(dong[0]).toHaveTextContent('Tiệm An');
    fireEvent.click(within(dong[1]).getByRole('button', { name: 'Xem tiền vào' }));
    expect(gia.chon).toHaveBeenCalledWith('c-an');
    expect(await screen.findByText('trang nhắc thuế')).toBeInTheDocument();
  });

  it('chưa làm sổ cho ai: nói rõ, không vẽ bàn trống', async () => {
    gia.goi.mockResolvedValue({ ...DU, tong: 0, khach: [], dem: { do: 0, vang: 0, xanh: 0 }, loai_tru: { gioi_han_co_so: 0, vai_tro_khong_lam_so: 0, vuot_tran: 0 } });
    dung();
    expect(await screen.findByText(/chưa làm sổ cho khách nào/)).toBeInTheDocument();
    expect(screen.queryByTestId('luoi-ban')).toBeNull();
  });

  it('máy chủ lỗi: hiện lỗi và nút tải lại', async () => {
    gia.goi.mockRejectedValueOnce(new Error('Chưa đọc được danh mục khách.'));
    dung();
    expect(await screen.findByRole('alert')).toHaveTextContent('Chưa đọc được danh mục khách.');
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByTestId('luoi-ban')).toBeInTheDocument();
  });
});
