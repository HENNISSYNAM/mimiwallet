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

vi.mock('@/components/quy-trinh/PhongChatMeo', () => ({
  default: ({ companyId, nhom, nhomMo, onChonNhom, moi }: { companyId: string; nhom: { id: string; tieu_de: string }[]; nhomMo: string | null; onChonNhom: (id: string) => void; moi: React.ReactNode }) => (
    <div><p>phong chat {companyId}</p><p data-testid="nhom-mo">{nhomMo ?? 'khong'}</p>
      {nhom.map((g) => <button key={g.id} type="button" onClick={() => onChonNhom(g.id)}>{g.tieu_de}</button>)}{moi}</div>
  ),
}));
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

  it('một phòng duy nhất: không còn tab; thư viện lọc theo lĩnh vực; danh sách nhóm của công ty', async () => {
    ve();
    expect(await screen.findByText('Thanh toán nhà cung cấp (P2P)')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Workflow' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Bảo mật' }));
    expect(screen.queryByText('Thanh toán nhà cung cấp (P2P)')).toBeNull();
    expect(screen.getByText('Ứng phó sự cố bảo mật')).toBeTruthy();
    expect(screen.getByText(`phong chat ${CTY}`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Trả NCC tuần này' })).toBeTruthy();
  });

  it('dùng mẫu → mở NHÓM CHAT ngay trong phòng (?nhom=), không đổi đường dẫn', async () => {
    gia.mau.mockResolvedValue(QID);
    ve();
    await screen.findByText('Thanh toán nhà cung cấp (P2P)');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /Dùng mẫu/ })[0].hasAttribute('disabled')).toBe(false));
    fireEvent.click(screen.getAllByRole('button', { name: /Dùng mẫu/ })[0]);
    await waitFor(() => expect(gia.mau).toHaveBeenCalledWith(CTY, 'tra_ncc'));
    await waitFor(() => expect(screen.getByTestId('dia').textContent).toBe(`/dashboard/space?nhom=${QID}`));
    expect(screen.getByTestId('nhom-mo').textContent).toBe(QID);
  });

  it('mô tả việc → dựng → mở nhóm tại chỗ', async () => {
    gia.tao.mockResolvedValue(QID);
    ve();
    await screen.findByText('Trả NCC tuần này');
    fireEvent.change(screen.getByLabelText('Mô tả việc'), { target: { value: 'Hoàn ứng công tác phí' } });
    fireEvent.click(screen.getByRole('button', { name: /Dựng workflow/ }));
    await waitFor(() => expect(gia.tao).toHaveBeenCalledWith(CTY, 'Hoàn ứng công tác phí'));
    await waitFor(() => expect(screen.getByTestId('nhom-mo').textContent).toBe(QID));
  });

  it('lỗi máy chủ hiện ra', async () => {
    gia.ds.mockRejectedValue(new Error('Phiên đăng nhập đã hết. Đăng nhập lại.'));
    ve();
    expect((await screen.findByRole('alert')).textContent).toMatch(/Đăng nhập lại/);
  });

  it('?qt= mở sơ đồ đầy đủ (Mở khung)', async () => {
    render(<MemoryRouter initialEntries={[`/dashboard/space?qt=${QID}`]}><Routes><Route path="/dashboard/space" element={<AgenticSpacePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText(`khung ${QID}`)).toBeTruthy();
  });
});
