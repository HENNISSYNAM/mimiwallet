import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VanPhongPage from './VanPhongPage';
import type { AgentDangLam, DanhMucKhach, DeXuat, KhachVanPhong } from '@/lib/goiVanPhong';
import { mauBan, viTriAgent } from '@/components/van-phong/hangDuyet';

/**
 * Văn phòng kế toán dựng với máy chủ giả. jsdom không có WebGL — đúng tình huống máy yếu: trang tự về lưới 2D.
 * Hàng duyệt: "Chấp nhận" đi qua đường ghi quyết định có sẵn (`to-khai` · `xac_nhan_tien_vao`) với đúng công ty của
 * khách; "Bỏ qua" không gọi máy chủ; phím tắt; duyệt hàng loạt chỉ việc không làm giảm doanh thu; bàn xanh khi hàng sạch.
 */
const gia = vi.hoisted(() => ({ goi: vi.fn(), toKhai: vi.fn(), chon: vi.fn(), ba: vi.fn() }));
vi.mock('@/lib/goiVanPhong', async (goc) => ({ ...(await goc<typeof import('@/lib/goiVanPhong')>()), goiDanhMucKhach: gia.goi }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: gia.toKhai }));
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

type MauPl = Partial<Omit<DeXuat, 'loai'>> & { company_id: string; tx: string; loai: 'business_revenue' | 'family_transfer'; tien: number };
const deXuatPl = (o: MauPl): DeXuat => ({
  khoa: `pl:${o.company_id}:${o.tx}`, ten_khach: o.ten_khach ?? o.company_id, loai: 'phan_loai', agent: 'phan_loai',
  muc: o.muc ?? 'xanh', co_the_duyet: o.co_the_duyet ?? true, duyet_hang_loat: o.duyet_hang_loat ?? o.loai === 'business_revenue',
  phan_loai: { transaction_id: o.tx, de_xuat: o.loai, hien_tai: null, may_da_quyet: false, anh_huong: o.loai === 'business_revenue' ? 'include' : 'exclude' },
  bang_chung: { dong: [{ transaction_id: o.tx, ngay: '2026-10-20', so_tien: o.tien, noi_dung: o.loai === 'family_transfer' ? 'ME GUI TIEN' : 'NGUYEN VAN A CK' }], nguon: o.loai === 'business_revenue' ? 'than_trong' : 'quy_tac_noi_dung', ly_do: 'lý do', tin_cay: o.loai === 'business_revenue' ? 'thap' : 'trung_binh' },
  tac_dong: o.tac_dong ?? null, so: o.tien, ngay: '2026-10-20', ten_viec: null, company_id: o.company_id,
});

const HANG: DeXuat[] = [
  deXuatPl({
    company_id: 'c-an', ten_khach: 'Tiệm An', tx: 't-an-2', loai: 'business_revenue', tien: 100_000_000, muc: 'do',
    tac_dong: { truoc: { can_duoi: 950_000_000, can_tren: 1_050_000_000 }, sau: { can_duoi: 1_050_000_000, can_tren: 1_050_000_000 }, nguong: [{ ma: 'mien_thue_1_ty', gia_tri: 1e9, truoc: 'chua_chac', sau: 'tren' }], doi_phia: true },
  }),
  deXuatPl({ company_id: 'c-an', ten_khach: 'Tiệm An', tx: 't-an-3', loai: 'family_transfer', tien: 30_000_000, muc: 'vang' }),
  {
    khoa: 'han:c-binh:2026-11-20', company_id: 'c-binh', ten_khach: 'Quán Bình', loai: 'han_thue', agent: 'thue', muc: 'vang',
    co_the_duyet: false, duyet_hang_loat: false, phan_loai: null, tac_dong: null,
    bang_chung: { dong: [], nguon: 'lich_thue', ly_do: null, tin_cay: 'cao' }, so: 9, ngay: '2026-11-20', ten_viec: 'Tờ khai quý 3',
  },
  deXuatPl({ company_id: 'c-an', ten_khach: 'Tiệm An', tx: 't-an-4', loai: 'business_revenue', tien: 5_000_000 }),
  // Khách mà vai trò không được xác nhận tiền vào: không có nút chấp nhận, không vào hàng loạt.
  deXuatPl({ company_id: 'c-cuong', ten_khach: 'Cửa hàng Cường', tx: 't-cuong-9', loai: 'business_revenue', tien: 2_000_000, co_the_duyet: false, duyet_hang_loat: false }),
];

const AGENT: AgentDangLam[] = [
  { agent: 'phan_loai', company_id: 'c-an', ly_do: 'su_kien_24h', luc: '2026-11-11T00:00:00Z', so: 1 },
  { agent: 'thue', company_id: null, ly_do: null, luc: null, so: 0 },
  { agent: 'du_bao', company_id: null, ly_do: null, luc: null, so: 0 },
  { agent: 'ban_hang', company_id: 'c-binh', ly_do: 'su_kien_24h', luc: '2026-11-11T02:00:00Z', so: 2 },
  { agent: 'tai_lieu', company_id: null, ly_do: null, luc: null, so: 0 },
];

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
  agent: AGENT,
  dem: { do: 1, vang: 1, xanh: 1 },
  loai_tru: { gioi_han_co_so: 1, vai_tro_khong_lam_so: 0, vuot_tran: 0 },
  co_bang_ban_hang: true,
  hang_duyet: HANG,
  hang_duyet_tong: HANG.length,
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
const hangDuyet = () => screen.findByTestId('hang-duyet');
const dongCua = (khoa: string) => document.querySelector(`[data-khoa="${khoa}"]`) as HTMLElement;
const denBan = (ten: RegExp) => screen.getByRole('button', { name: ten }).querySelector('[data-den]')!.getAttribute('data-den');

beforeEach(() => {
  // Máy không có WebGL (như jsdom thật, nhưng không in cảnh báo "chưa cài canvas").
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  localStorage.clear();
  sessionStorage.clear();
  gia.goi.mockReset().mockResolvedValue(DU);
  gia.toKhai.mockReset().mockResolvedValue({ ok: true });
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
    expect(within(screen.getByRole('button', { name: /Tiệm An/ })).getByText('Mèo Phân loại')).toBeInTheDocument();
    expect(screen.getByText(/1 khách không hiện vì bạn chỉ phụ trách một cơ sở/)).toBeInTheDocument();
  });

  it('chế độ danh sách hiện đúng đèn của từng khách', async () => {
    dung();
    await screen.findByTestId('luoi-ban');
    fireEvent.click(screen.getByRole('button', { name: 'Danh sách' }));
    const dong = within(screen.getByTestId('danh-sach-khach')).getAllByRole('row').slice(1);
    expect(dong.map((r) => r.querySelector('[data-den]')?.getAttribute('data-den'))).toEqual(['do', 'vang', 'xanh']);
    expect(dong[0]).toHaveTextContent('Tiệm An');
    expect(dong[0]).toHaveTextContent(/trên hoặc dưới 1 tỷ/);
  });

  it('bấm bàn mở bảng khách; "Soạn tờ khai" đổi công ty đang dùng rồi mở trang tờ khai', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Tiệm An/ }));
    const bang = screen.getByTestId('bang-khach');
    expect(bang).toHaveTextContent('từ 950 triệu đến 1,05 tỷ');
    fireEvent.click(within(bang).getByRole('button', { name: 'Soạn tờ khai' }));
    expect(gia.chon).toHaveBeenCalledWith('c-an');
    expect(await screen.findByText('trang tờ khai')).toBeInTheDocument();
  });

  it('chưa làm sổ cho ai: nói rõ, không vẽ bàn trống', async () => {
    gia.goi.mockResolvedValue({ ...DU, tong: 0, khach: [], hang_duyet: [], hang_duyet_tong: 0, dem: { do: 0, vang: 0, xanh: 0 }, loai_tru: { gioi_han_co_so: 0, vai_tro_khong_lam_so: 0, vuot_tran: 0 } });
    dung();
    expect(await screen.findByText(/chưa làm sổ cho khách nào/)).toBeInTheDocument();
    expect(screen.queryByTestId('luoi-ban')).toBeNull();
  });
});

describe('hàng duyệt kiểu Cursor', () => {
  it('mỗi việc hiện khách, đề xuất, bằng chứng và tác động lên khoảng doanh thu + phía ngưỡng', async () => {
    dung();
    const h = await hangDuyet();
    const dau = dongCua('pl:c-an:t-an-2');
    expect(dau).toHaveAttribute('aria-selected', 'true');
    expect(dau).toHaveTextContent('Tiệm An');
    expect(dau).toHaveTextContent('Xếp khoản 100 triệu là tiền bán hàng (doanh thu)');
    expect(dau).toHaveTextContent('NGUYEN VAN A CK');
    expect(dau).toHaveTextContent(/tin cậy thấp/);
    expect(within(dau).getByTestId('tac-dong')).toHaveTextContent('trước: 950 triệu – 1,05 tỷ → sau: 1,05 tỷ – 1,05 tỷ');
    expect(within(dau).getByTestId('tac-dong')).toHaveTextContent('Ngưỡng 1 tỷ: chưa chắc → trên');
    expect(within(h).getAllByRole('option')).toHaveLength(5);
  });

  it('Chấp nhận đi qua đường ghi quyết định có sẵn, đúng công ty của khách; đọc lại số sau đó', async () => {
    dung();
    await hangDuyet();
    fireEvent.click(within(dongCua('pl:c-an:t-an-2')).getByRole('button', { name: 'Chấp nhận' }));
    await waitFor(() => expect(gia.toKhai).toHaveBeenCalledTimes(1));
    expect(gia.toKhai).toHaveBeenCalledWith('xac_nhan_tien_vao', { company_id: 'c-an', transaction_ids: ['t-an-2'], loai: 'business_revenue' });
    await waitFor(() => expect(dongCua('pl:c-an:t-an-2')).toBeNull());
    expect(gia.goi).toHaveBeenCalledTimes(2);
    // Không đổi "công ty đang dùng" chỉ để duyệt: company_id đi thẳng trong lời gọi, máy chủ kiểm thành viên.
    expect(gia.chon).not.toHaveBeenCalled();
  });

  it('máy chủ từ chối (vd. không đủ quyền): việc ở lại, hiện câu của máy chủ', async () => {
    gia.toKhai.mockRejectedValueOnce(new Error('Vai trò của bạn trong công ty (Người xem) không được làm việc này.'));
    dung();
    await hangDuyet();
    fireEvent.click(within(dongCua('pl:c-an:t-an-2')).getByRole('button', { name: 'Chấp nhận' }));
    expect(await within(dongCua('pl:c-an:t-an-2')).findByRole('alert')).toHaveTextContent(/không được làm việc này/);
  });

  it('Bỏ qua không ghi gì lên máy chủ: chỉ ẩn trong phiên', async () => {
    dung();
    await hangDuyet();
    fireEvent.click(within(dongCua('pl:c-an:t-an-3')).getByRole('button', { name: 'Bỏ qua' }));
    expect(dongCua('pl:c-an:t-an-3')).toBeNull();
    expect(gia.toKhai).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('mimi:van-phong:bo-qua')!)).toEqual(['pl:c-an:t-an-3']);
  });

  it('vai trò không được xác nhận: nút chấp nhận tắt, Enter không gọi máy chủ', async () => {
    dung();
    const h = await hangDuyet();
    const d = dongCua('pl:c-cuong:t-cuong-9');
    expect(within(d).getByRole('button', { name: 'Chấp nhận' })).toBeDisabled();
    fireEvent.click(d);
    fireEvent.keyDown(h, { key: 'Enter' });
    expect(within(d).getByText(/không được xác nhận tiền vào/)).toBeInTheDocument();
    expect(gia.toKhai).not.toHaveBeenCalled();
  });

  it('duyệt hàng loạt chỉ gồm việc không thể làm giảm doanh thu, gom theo khách + loại', async () => {
    dung();
    await hangDuyet();
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận 2 việc rủi ro thấp' }));
    await waitFor(() => expect(gia.toKhai).toHaveBeenCalledTimes(1));
    expect(gia.toKhai).toHaveBeenCalledWith('xac_nhan_tien_vao', { company_id: 'c-an', transaction_ids: ['t-an-2', 't-an-4'], loai: 'business_revenue' });
    // Khoản "người nhà" (làm giảm doanh thu) và khách không đủ quyền vẫn còn chờ.
    await waitFor(() => expect(dongCua('pl:c-an:t-an-2')).toBeNull());
    expect(dongCua('pl:c-an:t-an-3')).not.toBeNull();
    expect(dongCua('pl:c-cuong:t-cuong-9')).not.toBeNull();
  });

  it('phím tắt: J/K chọn, Esc bỏ qua, Enter chấp nhận; việc chỉ dẫn đường thì Enter mở trang', async () => {
    dung();
    const h = await hangDuyet();
    h.focus();
    fireEvent.keyDown(h, { key: 'j' });
    expect(dongCua('pl:c-an:t-an-3')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(h, { key: 'k' });
    expect(dongCua('pl:c-an:t-an-2')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(h, { key: 'j' });
    fireEvent.keyDown(h, { key: 'Escape' }); // bỏ qua "người nhà"
    expect(dongCua('pl:c-an:t-an-3')).toBeNull();
    expect(gia.toKhai).not.toHaveBeenCalled();
    // Đang chọn việc kế tiếp: hạn thuế của Quán Bình → Tab mở trang tờ khai cho đúng khách.
    expect(dongCua('han:c-binh:2026-11-20')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(h, { key: 'Tab' });
    expect(gia.chon).toHaveBeenCalledWith('c-binh');
    expect(await screen.findByText('trang tờ khai')).toBeInTheDocument();
    expect(gia.toKhai).not.toHaveBeenCalled();
  });

  it('Enter trên đề xuất phân loại = chấp nhận qua máy chủ', async () => {
    dung();
    const h = await hangDuyet();
    fireEvent.keyDown(h, { key: 'Enter' });
    await waitFor(() => expect(gia.toKhai).toHaveBeenCalledWith('xac_nhan_tien_vao', { company_id: 'c-an', transaction_ids: ['t-an-2'], loai: 'business_revenue' }));
  });

  it('Ctrl+K mở bảng lệnh: gõ tên khách không dấu, Enter mở khách đó', async () => {
    dung();
    await hangDuyet();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const bang = screen.getByTestId('bang-lenh');
    const o = within(bang).getByRole('textbox');
    fireEvent.change(o, { target: { value: 'mo quan binh' } });
    fireEvent.keyDown(o, { key: 'Enter' });
    expect(screen.queryByTestId('bang-lenh')).toBeNull();
    expect(screen.getByTestId('bang-khach')).toHaveTextContent('Quán Bình');
  });

  it('bàn chuyển xanh khi hàng của khách đó đã sạch', async () => {
    dung();
    await hangDuyet();
    expect(denBan(/^Tiệm An/)).toBe('do');
    for (const k of ['pl:c-an:t-an-2', 'pl:c-an:t-an-3', 'pl:c-an:t-an-4']) {
      await act(async () => { fireEvent.click(within(dongCua(k)).getByRole('button', { name: 'Bỏ qua' })); });
    }
    expect(denBan(/^Tiệm An/)).toBe('xanh');
    expect(screen.getByTestId('dem-xanh')).toHaveTextContent('2');
  });
});

describe('vị trí mèo và đèn bàn (thuần)', () => {
  it('mèo đi tới bàn có đề xuất của nó đang chờ; hết việc thì về nghỉ; mèo bán hàng giữ chỗ theo lần bán thật', () => {
    const r = viTriAgent(AGENT, HANG);
    expect(r.find((a) => a.agent === 'phan_loai')).toMatchObject({ company_id: 'c-an', ly_do: 'su_kien_24h' });
    expect(r.find((a) => a.agent === 'thue')).toMatchObject({ company_id: 'c-binh', ly_do: 'viec_cho' });
    const het = viTriAgent(AGENT, []);
    expect(het.find((a) => a.agent === 'phan_loai')?.company_id).toBeNull();
    expect(het.find((a) => a.agent === 'ban_hang')?.company_id).toBe('c-binh');
  });
  it('đèn: còn việc → màu nặng nhất; hết việc → xanh; không có việc trong hàng → giữ đèn máy chủ', () => {
    const an = DU.khach[0];
    expect(mauBan(an, HANG, HANG)).toBe('do');
    expect(mauBan(an, HANG, HANG.filter((d) => d.company_id !== 'c-an'))).toBe('xanh');
    expect(mauBan({ ...DU.khach[1], id: 'khac' }, HANG, HANG)).toBe('vang');
  });
});
