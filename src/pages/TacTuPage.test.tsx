import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TacTuPage from './TacTuPage';

/**
 * Màn Kiểm soát chi nằm sau đăng nhập, nên kiểm bằng dựng giao diện trên CSDL giả.
 * Dữ liệu dưới đây là đầu vào của test, không đi vào sản phẩm.
 *
 * Kiểm những thứ giao diện hứa: KPI không bịa số, duyệt nhanh chỉ cho khoản an toàn,
 * khoản bị luật từ chối không có nút duyệt, thu hồi phải xác nhận, cảnh báo người
 * nhận, và "Tạo yêu cầu chi" gửi đủ trường rồi mở khung quyết định.
 */

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= RO;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const gia = vi.hoisted(() => ({ goi: vi.fn(), duLieu: {} as Record<string, unknown> }));

vi.mock('@/lib/env', () => ({ SUPABASE_URL: 'https://vi-du.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'khoa-cong-khai' }));
vi.mock('@/lib/goiTacTu', () => ({ DIEM_GOI_TAC_TU: 'https://vi-du.supabase.co/functions/v1/tac-tu', goiTacTu: gia.goi }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1', email: 'chu@congty.vn' } } }) },
    from: (ten: string) => {
      const loc: Array<(r: Record<string, unknown>) => boolean> = [];
      const lay = () => {
        const d = gia.duLieu[ten];
        return Array.isArray(d) ? d.filter((r) => loc.every((f) => f(r))) : d;
      };
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.order = () => q;
      q.limit = () => q;
      q.eq = (cot: string, v: unknown) => { loc.push((r) => !(cot in r) || r[cot] === v); return q; };
      q.in = (cot: string, ds: unknown[]) => { loc.push((r) => ds.includes(r[cot])); return q; };
      q.gte = (cot: string, v: string) => { loc.push((r) => String(r[cot]) >= v); return q; };
      q.maybeSingle = () => Promise.resolve({ data: lay(), error: null });
      q.then = (ok: (v: unknown) => unknown, sai?: (e: unknown) => unknown) =>
        Promise.resolve({ data: lay(), error: null }).then(ok, sai);
      return q;
    },
  },
}));

const HOM_NAY = new Date(Date.now() - 60_000).toISOString();
const LAU_ROI = new Date(Date.now() - 40 * 86_400_000).toISOString();

const yc = (x: Record<string, unknown>) => ({
  cach_quyet: null, company_id: 'cty-1', created_at: HOM_NAY, da_chi_luc: null, giao_dich_id: null, het_han_luc: null,
  ly_do: [], ma_tham_chieu: 'MIMI0001', ma_yeu_cau: null, muc_dich: 'Nạp API', ngan_hang_bin: '970422',
  nguoi_quyet: null, nhom_chi: 'ha_tang_ai', quyet_luc: null, so_hoa_don: null, so_tai_khoan: '0123456789',
  so_tien: 1_000_000, so_tien_thuc_chi: null, tac_tu_id: 'tt-1', ten_nguoi_nhan: 'CONG TY ABC', trang_thai: 'cho_duyet',
  updated_at: HOM_NAY, ...x,
});
const ma = (...ds: string[]) => ds.map((m) => ({ ma: m, cau: 'Lý do máy chủ ghi.' }));

function duLieuDay() {
  return {
    companies: { id: 'cty-1' },
    tac_tu: [{
      id: 'tt-1', company_id: 'cty-1', ten: 'agent-quang-cao', trang_thai: 'hoat_dong', khoa_hien: 'mimi_ak_…abcd',
      khoa_bam: 'x', mo_ta: null, dung_lan_cuoi: null, created_at: LAU_ROI, updated_at: LAU_ROI,
    }],
    chinh_sach_chi: [{
      tac_tu_id: 'tt-1', company_id: 'cty-1', han_muc_moi_lan: 20_000_000, han_muc_ngay: 20_000_000, han_muc_thang: 20_000_000,
      nguong_can_duyet: 0, nhom_chi_duoc_phep: null, chi_tra_nguoi_nhan_da_duyet: true, het_han: null, so_yeu_cau_moi_gio: 30,
      updated_at: LAU_ROI,
    }],
    nguoi_nhan_duoc_phep: [
      { id: 'nn-1', company_id: 'cty-1', ngan_hang_bin: '970422', so_tai_khoan: '0123456789', ten_chu_tai_khoan: 'CONG TY ABC', ghi_chu: null, created_at: LAU_ROI },
      { id: 'nn-2', company_id: 'cty-1', ngan_hang_bin: '970422', so_tai_khoan: '111111', ten_chu_tai_khoan: 'Đinh Văn Nam', ghi_chu: null, created_at: LAU_ROI },
      { id: 'nn-3', company_id: 'cty-1', ngan_hang_bin: '970436', so_tai_khoan: '222222', ten_chu_tai_khoan: 'DINH VAN NAM', ghi_chu: null, created_at: LAU_ROI },
    ],
    yeu_cau_chi: [
      yc({ id: 'A', so_tien: 500_000, ly_do: ma('TREN_NGUONG_DUYET') }),
      yc({ id: 'B', so_tien: 12_800_000, ly_do: ma('DOI_SO_TAI_KHOAN'), ten_nguoi_nhan: 'CONG TY MINH LONG', so_tai_khoan: '9999888877', ma_tham_chieu: 'MIMI0002' }),
      yc({ id: 'C', so_tien: 850_000, trang_thai: 'da_chi', cach_quyet: 'tu_dong', quyet_luc: HOM_NAY, da_chi_luc: HOM_NAY, so_tien_thuc_chi: 850_000, ly_do: ma('TRONG_CHINH_SACH'), ma_tham_chieu: 'MIMI0003' }),
      yc({ id: 'D', so_tien: 9_000_000, trang_thai: 'tu_choi', quyet_luc: HOM_NAY, ly_do: ma('VUOT_HAN_MUC_NGAY'), ma_tham_chieu: 'MIMI0004' }),
    ],
    nhat_ky_tac_tu: [],
  };
}

const dung = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/tac-tu']}>
      <TacTuPage />
    </MemoryRouter>,
  );

const choTai = () => screen.findByRole('heading', { level: 1, name: 'Kiểm soát chi' });

beforeEach(() => {
  gia.goi.mockReset().mockResolvedValue({ ok: true });
  gia.duLieu = duLieuDay();
});

describe('màn Kiểm soát chi', () => {
  it('chưa có agent: KPI hiện trạng thái trống, không có con số nào', async () => {
    gia.duLieu = { ...duLieuDay(), tac_tu: [], chinh_sach_chi: [], yeu_cau_chi: [] };
    const { container } = dung();
    await choTai();
    const kpi = container.querySelector('[data-mimi="tac-tu.kpi"]')!;
    expect(kpi.textContent).toContain('Chưa có agent');
    expect(kpi.textContent).not.toMatch(/\d/);
  });

  it('KPI tính từ dữ liệu đã tải', async () => {
    const { container } = dung();
    await choTai();
    const kpi = container.querySelector('[data-mimi="tac-tu.kpi"]')!.textContent!;
    expect(kpi).toContain('Yêu cầu cần duyệt2');
    expect(kpi).toContain('850.000đ');
    // 20.000.000 − (500.000 + 12.800.000 + 850.000) đang giữ hạn mức.
    expect(kpi).toContain('5.850.000đ');
    expect(kpi).toContain('Khoản chi cần xem xét1');
  });

  it('duyệt nhanh chỉ có ở khoản "Đang chờ", khoản đổi số tài khoản phải mở xem', async () => {
    const { container } = dung();
    await choTai();
    const nutDuyet = [...container.querySelectorAll('[data-mimi="tac-tu.duyet"]')];
    expect(nutDuyet.length).toBeGreaterThan(0);
    for (const n of nutDuyet) {
      const dong = n.closest('tr, li')!.textContent!;
      expect(dong).toContain('500.000đ');
      expect(dong).not.toContain('12.800.000đ');
    }
    fireEvent.click(nutDuyet[0]);
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('duyet', { yeu_cau_id: 'A', them_nguoi_nhan: false }));
  });

  it('TCCN-01: máy chủ dừng việc duyệt vì dấu hiệu bất thường → hộp xác minh → chỉ gửi lại khi đã tích xác minh', async () => {
    const dauHieu = [{ ma: 'noi_dung_lua_dao', muc_do: 'cao', cau: 'Nội dung nhắc tới công an, viện kiểm sát hoặc toà án.', can_cu: [] }];
    gia.goi
      .mockRejectedValueOnce(Object.assign(new Error('Khoản này có dấu hiệu bất thường.'), { ma: 'CAN_XAC_MINH', duLieu: { dau_hieu: dauHieu, lich_su_du: true } }))
      .mockResolvedValue({ ok: true });
    const { container } = dung();
    await choTai();
    fireEvent.click(container.querySelector('[data-mimi="tac-tu.duyet"]')!);

    const hop = await screen.findByRole('alertdialog');
    expect(hop.textContent).toContain('Dừng lại trước khi duyệt');
    expect(hop.textContent).toContain('công an');
    expect(gia.goi).toHaveBeenCalledTimes(1);

    fireEvent.click(within(hop).getByRole('checkbox', { name: 'Tôi đã xác minh người nhận' }));
    fireEvent.click(within(hop).getByRole('button', { name: 'Đã xác minh, vẫn duyệt' }));
    await waitFor(() => expect(gia.goi).toHaveBeenLastCalledWith('duyet', { yeu_cau_id: 'A', them_nguoi_nhan: false, da_xac_minh: true }));
  });

  it('TCCN-01: bấm "Chưa duyệt" thì không gửi lại gì', async () => {
    gia.goi.mockRejectedValueOnce(Object.assign(new Error('x'), {
      ma: 'CAN_XAC_MINH', duLieu: { dau_hieu: [{ ma: 'doi_so_tai_khoan', muc_do: 'cao', cau: 'Đổi số tài khoản.', can_cu: [] }], lich_su_du: true },
    }));
    const { container } = dung();
    await choTai();
    fireEvent.click(container.querySelector('[data-mimi="tac-tu.duyet"]')!);
    const hop = await screen.findByRole('alertdialog');
    fireEvent.click(within(hop).getByRole('button', { name: 'Chưa duyệt' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(gia.goi.mock.calls.filter((c) => c[0] === 'duyet')).toHaveLength(1);
  });

  it('khoản bị luật từ chối: khung chi tiết nói lý do và không có nút duyệt', async () => {
    const { container } = dung();
    await choTai();
    fireEvent.click(container.querySelector('[data-mimi="tac-tu.tab.yeu-cau"]')!);
    fireEvent.click(within(screen.getByRole('group', { name: 'Lọc theo trạng thái' })).getByRole('button', { name: /Từ chối/ }));
    const dongBang = container.querySelectorAll('table tbody tr');
    expect(dongBang).toHaveLength(1);
    fireEvent.click(within(dongBang[0] as HTMLElement).getByRole('button', { name: 'Xem' }));
    const khung = await screen.findByRole('dialog');
    // Nói bằng tên luật, không lộ mã máy.
    expect(khung.textContent).toContain('Vượt hạn mức ngày');
    expect(khung.textContent).not.toContain('VUOT_HAN_MUC_NGAY');
    expect(khung.textContent).toContain('Không ai duyệt lại được');
    expect(khung.querySelector('[data-mimi="tac-tu.duyet"]')).toBeNull();
  });

  it('thu hồi agent phải qua hộp xác nhận', async () => {
    dung();
    await choTai();
    const menu = screen.getAllByRole('button', { name: 'Hành động cho agent-quang-cao' })[0];
    fireEvent.keyDown(menu, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Thu hồi/ }));
    const hop = await screen.findByRole('alertdialog');
    expect(gia.goi).not.toHaveBeenCalled();
    fireEvent.click(within(hop).getByRole('button', { name: 'Thu hồi agent' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('doi_trang_thai', { tac_tu_id: 'tt-1', trang_thai: 'thu_hoi' }));
  });

  it('tab Người nhận cảnh báo đổi số tài khoản và cùng tên nhiều tài khoản', async () => {
    const { container } = dung();
    await choTai();
    fireEvent.click(container.querySelector('[data-mimi="tac-tu.tab.nguoi-nhan"]')!);
    expect(container.textContent).toContain('Tài khoản nhận thay đổi');
    expect(container.textContent).toContain('Cùng tên, nhiều số tài khoản trong danh sách');
    expect(container.querySelector('[data-mimi="tac-tu.nguoi-nhan.stk"]')).not.toBeNull();
  });

  it('tạo yêu cầu chi: kiểm tra trước theo hạn mức, gửi đủ trường, rồi mở khung quyết định', async () => {
    gia.goi.mockImplementation(async (hanhDong: string) =>
      hanhDong === 'tao_yeu_cau' ? { yeu_cau: { id: 'A', trang_thai: 'cho_duyet' } } : { ok: true });
    dung();
    await choTai();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo yêu cầu chi' }));
    const form = await screen.findByRole('dialog');

    const soTien = within(form).getByLabelText('Số tiền');
    // Hôm nay đã giữ 14.150.000đ trên trần ngày 20.000.000đ.
    fireEvent.change(soTien, { target: { value: '9000000' } });
    expect(form.textContent).toContain('Sẽ bị từ chối');
    expect(form.textContent).toContain('Vượt hạn mức ngày');

    fireEvent.change(soTien, { target: { value: '500000' } });
    expect(form.textContent).toContain('Cần duyệt');
    fireEvent.change(within(form).getByLabelText('Mục đích'), { target: { value: 'Nạp API tháng 9' } });
    fireEvent.click(form.querySelector('[data-mimi="tac-tu.tao-yeu-cau.gui"]')!);

    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('tao_yeu_cau', expect.objectContaining({
      tac_tu_id: 'tt-1',
      so_tien: 500_000,
      ngan_hang_bin: '970422',
      so_tai_khoan: '0123456789',
      nhom_chi: 'ha_tang_ai',
      muc_dich: 'Nạp API tháng 9',
      ma_yeu_cau: expect.stringMatching(/^nguoi-dung-/),
    })));
    await waitFor(() => expect(screen.getAllByRole('dialog').some((d) => d.textContent?.includes('Kết quả đánh giá'))).toBe(true));
  });
});
