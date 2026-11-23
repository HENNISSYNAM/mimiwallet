import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const gia = vi.hoisted(() => ({ ds: vi.fn(), tao: vi.fn(), mau: vi.fn(), tv: vi.fn(), bang: vi.fn(), id: vi.fn() }));
vi.mock('@/lib/goiQuyTrinh', () => ({ dsQuyTrinh: gia.ds, taoQuyTrinh: gia.tao, taoTuMau: gia.mau, thuVien: gia.tv }));
vi.mock('@/lib/goiSpace', () => ({ docBang: gia.bang }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: gia.id }));
vi.mock('@/components/quy-trinh/KhongGianQuyTrinh', () => ({
  default: ({ id }: { id: string }) => <p>khung {id}</p>, TEN_PA: { nguoi: 'Người làm', nguoi_ai: 'Người + AI', ai: 'AI tối đa' },
}));

vi.mock('@/components/quy-trinh/PhongChatMeo', () => ({ default: ({ companyId }: { companyId: string }) => <p>phong chat {companyId}</p> }));
import AgenticSpacePage, { MEO_KHOA } from './AgenticSpacePage';

const CTY = '11111111-1111-4111-8111-111111111111';
const QID = '22222222-2222-4222-8222-222222222222';
function Dia() { const l = useLocation(); return <p data-testid="dia">{l.pathname}{l.search}</p>; }
const ve = () => render(<MemoryRouter initialEntries={['/dashboard/space']}><Routes>
  <Route path="/dashboard/space" element={<><AgenticSpacePage /><Dia /></>} />
</Routes></MemoryRouter>);

describe('Agentic AI Space', () => {
  beforeEach(() => {
    Object.values(gia).forEach((f) => f.mockReset());
    gia.id.mockResolvedValue(CTY);
    gia.bang.mockResolvedValue({ khach: [{ id: CTY, ten: 'Tạp hoá Hồng' }], agent: [], viec: [], dem: {} });
    gia.tv.mockResolvedValue([
      { khoa: 'tra_ncc', linh_vuc: 'thanh_toan', tieu_de: 'Thanh toán nhà cung cấp (P2P)', mo_ta: 'Khớp 3 bên', khung: 'Procure-to-Pay', so_buoc: 6 },
      { khoa: 'su_co', linh_vuc: 'bao_mat', tieu_de: 'Ứng phó sự cố bảo mật', mo_ta: '4 pha', khung: 'NIST SP 800-61', so_buoc: 6 },
    ]);
    gia.ds.mockResolvedValue([{ id: QID, company_id: CTY, ten_khach: 'Tạp hoá Hồng', tieu_de: 'Trả NCC tuần này', linh_vuc: 'thanh_toan', nguon: 'mau', phuong_an: 'nguoi_ai', trang_thai: 'nhap', cap_nhat_luc: '', dem: null, meo: ['dong_tien', 'bao_ve'] }]);
  });

  it('thư viện lọc theo lĩnh vực; đội 12 mèo có số workflow; danh sách có mèo', async () => {
    ve();
    expect(await screen.findByText('Thanh toán nhà cung cấp (P2P)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bảo mật' }));
    expect(screen.queryByText('Thanh toán nhà cung cấp (P2P)')).toBeNull();
    expect(screen.getByText('Ứng phó sự cố bảo mật')).toBeTruthy();
    const doi = screen.getByRole('region', { name: 'Đội mèo agent' });
    expect(within(doi).getAllByRole('img')).toHaveLength(MEO_KHOA.length);
    expect(within(doi).getByText(/Mèo Dòng tiền · 1 workflow/)).toBeTruthy();
  });

  it('dùng mẫu → mở workflow NGAY TRONG TRANG (?qt=), không đổi đường dẫn', async () => {
    gia.mau.mockResolvedValue(QID);
    ve();
    await screen.findByText('Thanh toán nhà cung cấp (P2P)');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Dùng mẫu/ })[0].hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getAllByRole('button', { name: /Dùng mẫu/ })[0]);
    await waitFor(() => expect(gia.mau).toHaveBeenCalledWith(CTY, 'tra_ncc'));
    expect(await screen.findByText(`khung ${QID}`)).toBeTruthy();
    expect(screen.getByTestId('dia').textContent).toBe(`/dashboard/space?qt=${QID}`);
  });

  it('mô tả việc → dựng → mở tại chỗ; bấm workflow trong danh sách cũng mở tại chỗ', async () => {
    gia.tao.mockResolvedValue(QID);
    ve();
    await screen.findByText('Trả NCC tuần này');
    fireEvent.change(screen.getByLabelText('Mô tả việc'), { target: { value: 'Hoàn ứng công tác phí' } });
    fireEvent.click(screen.getByRole('button', { name: /Dựng workflow/ }));
    await waitFor(() => expect(gia.tao).toHaveBeenCalledWith(CTY, 'Hoàn ứng công tác phí'));
    expect(await screen.findByText(`khung ${QID}`)).toBeTruthy();
  });

  it('lỗi máy chủ hiện ra', async () => {
    gia.ds.mockRejectedValue(new Error('Phiên đăng nhập đã hết. Đăng nhập lại.'));
    ve();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Đăng nhập lại/);
  });

  it('tab Trò chuyện mở phòng chat NGAY TRONG TRANG (?tab=chat), không đổi đường dẫn', async () => {
    ve();
    await screen.findByText('Trả NCC tuần này');
    fireEvent.click(screen.getByRole('tab', { name: 'Trò chuyện' }));
    expect(await screen.findByText(`phong chat ${CTY}`)).toBeTruthy();
    expect(screen.getByTestId('dia').textContent).toBe('/dashboard/space?tab=chat');
    expect(screen.queryByRole('region', { name: 'Thư viện workflow' })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Workflow' }));
    expect(await screen.findByRole('region', { name: 'Thư viện workflow' })).toBeTruthy();
    expect(screen.getByTestId('dia').textContent).toBe('/dashboard/space?tab=wf');
  });

  it('điện thoại: mở Space ra là danh bạ trò chuyện (như Zalo); chọn Workflow thì theo lựa chọn', async () => {
    const cu = window.matchMedia;
    window.matchMedia = ((q: string) => ({ matches: q.includes('max-width: 767px'), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false, onchange: null })) as typeof window.matchMedia;
    try {
      ve();
      expect(await screen.findByText(`phong chat ${CTY}`)).toBeTruthy();
      fireEvent.click(screen.getByRole('tab', { name: 'Workflow' }));
      expect(await screen.findByRole('region', { name: 'Thư viện workflow' })).toBeTruthy();
    } finally { window.matchMedia = cu; }
  });
});
