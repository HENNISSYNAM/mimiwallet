import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChiPhiAiPage from './ChiPhiAiPage';
import { LoiGoiHam } from '@/lib/loiGoiHam';

/**
 * Màn Chi phí AI nằm sau đăng nhập: kiểm bằng dựng giao diện với edge function giả.
 * Dữ liệu dưới đây là đầu vào của test, không đi vào sản phẩm.
 */

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= RO;

const gia = vi.hoisted(() => ({ goi: vi.fn() }));
vi.mock('@/lib/goiChiPhiAi', () => ({ goiChiPhiAi: gia.goi }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }) }));

const HOM_NAY = new Date().toISOString().slice(0, 10);
const TRONG = { chi_phi: [], ket_noi: [], lo_nhap: [], ngan_sach: null };

const dung = () =>
  render(
    <MemoryRouter>
      <ChiPhiAiPage />
    </MemoryRouter>,
  );

const kpi = () => screen.getByRole('region', { name: 'Chỉ số chi phí AI' });

beforeEach(() => {
  gia.goi.mockReset();
});

describe('màn Chi phí AI', () => {
  it('chưa có dữ liệu: KPI không có con số, mời nhập file hoặc kết nối', async () => {
    gia.goi.mockResolvedValue(TRONG);
    dung();
    expect(await screen.findByText('Chưa có dữ liệu chi phí AI')).toBeTruthy();
    expect(kpi().textContent).not.toContain('$');
  });

  it('có dữ liệu: cộng đúng, số từ API thắng file trong cùng ngày, ngân sách còn lại', async () => {
    gia.goi.mockResolvedValue({
      chi_phi: [
        { nha_cung_cap: 'openai', ngay: HOM_NAY, hang_muc: 'gpt-4o', du_an: 'proj_1', so_tien_usd: 12.5, nguon: 'api' },
        { nha_cung_cap: 'openai', ngay: HOM_NAY, hang_muc: 'gpt-4o', du_an: 'proj_1', so_tien_usd: 100, nguon: 'nhap_file' },
        { nha_cung_cap: 'anthropic', ngay: HOM_NAY, hang_muc: 'claude-opus-5', du_an: 'wrkspc_1', so_tien_usd: 7.5, nguon: 'nhap_file' },
      ],
      ket_noi: [{ id: 'k1', nha_cung_cap: 'openai', khoa_hien: 'sk-admin-…abcd', trang_thai: 'hoat_dong', dong_bo_luc: new Date().toISOString(), du_lieu_toi: HOM_NAY, loi_cuoi: null }],
      lo_nhap: [],
      ngan_sach: { han_muc_thang_usd: 50, canh_bao_phan_tram: 80 },
    });
    dung();
    await screen.findByRole('heading', { level: 1, name: 'Chi phí AI' });
    await waitFor(() => expect(kpi().textContent).toContain('$20.00'));
    expect(kpi().textContent).toContain('$30.00');
    expect(kpi().textContent).toContain('Đã dùng 40%');
    expect(screen.getAllByText('claude-opus-5').length).toBeGreaterThan(0);
    // Trợ lý nói bằng lời, không lộ khoá hay thuật ngữ kỹ thuật.
    const troLy = screen.getByRole('region', { name: 'Tóm tắt của trợ lý' });
    expect(troLy.textContent).toContain('bạn đã chi $20.00 cho dịch vụ AI');
    expect(document.body.textContent).not.toContain('sk-admin-');
    expect(document.body.textContent).not.toMatch(/UTC|workspace/);
  });

  it('nhập file: đề xuất cột, bỏ dòng tổng và nói lý do, gửi đúng dòng', async () => {
    gia.goi.mockImplementation(async (hanhDong: string) =>
      hanhDong === 'nhap_file' ? { lo_nhap: { so_dong: 1 } } : TRONG);
    dung();
    // Màn trống có nút này ở cả đầu trang lẫn thẻ hướng dẫn; bấm nút đầu trang.
    fireEvent.click((await screen.findAllByRole('button', { name: /Tải file chi phí/ }))[0]);
    const form = await screen.findByRole('dialog');
    const file = new File(['date,model,cost\n2025-12-01,gpt-4o,1.50\nTotal,,1.50\n'], 'openai.csv', { type: 'text/csv' });
    fireEvent.change(within(form).getByLabelText('File CSV'), { target: { files: [file] } });

    await within(form).findByText('1 dòng hợp lệ');
    expect(form.textContent).toContain('Bỏ qua 1 dòng');
    expect(form.textContent).toContain('ngày "Total" không đọc được');

    fireEvent.click(within(form).getByRole('button', { name: /Nhập 1 dòng/ }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('nhap_file', {
      nha_cung_cap: 'openai',
      ten_file: 'openai.csv',
      dong: [{ ngay: '2025-12-01', hang_muc: 'gpt-4o', du_an: '', so_tien_usd: 1.5 }],
      thay_the: false,
    }));
  });

  it('nhập file trùng khoảng ngày: hỏi trước, chỉ thay thế khi người dùng đồng ý', async () => {
    let lan = 0;
    gia.goi.mockImplementation(async (hanhDong: string) => {
      if (hanhDong !== 'nhap_file') return TRONG;
      if (lan++ === 0) {
        throw new LoiGoiHam('Đã có lần nhập file trùng khoảng ngày.', 409, {
          trung: [{ id: 'l1', ten_file: 'cu.csv', tu_ngay: '2025-12-01', den_ngay: '2025-12-31' }],
        });
      }
      return { lo_nhap: { so_dong: 1 } };
    });
    dung();
    // Màn trống có nút này ở cả đầu trang lẫn thẻ hướng dẫn; bấm nút đầu trang.
    fireEvent.click((await screen.findAllByRole('button', { name: /Tải file chi phí/ }))[0]);
    const form = await screen.findByRole('dialog');
    fireEvent.change(within(form).getByLabelText('File CSV'), {
      target: { files: [new File(['date,cost\n2025-12-05,2\n'], 'moi.csv', { type: 'text/csv' })] },
    });
    fireEvent.click(await within(form).findByRole('button', { name: /Nhập 1 dòng/ }));

    const hoi = await screen.findByRole('alertdialog');
    expect(hoi.textContent).toContain('cu.csv');
    expect(gia.goi.mock.calls.filter((c) => c[0] === 'nhap_file')).toHaveLength(1);
    fireEvent.click(within(hoi).getByRole('button', { name: 'Thay thế' }));
    await waitFor(() => expect(gia.goi).toHaveBeenLastCalledWith('nhap_file', expect.objectContaining({ ten_file: 'moi.csv', thay_the: true })));
  });

  it('kết nối Admin key: phải xác nhận hiểu rủi ro trước khi gửi', async () => {
    gia.goi.mockImplementation(async (hanhDong: string) =>
      hanhDong === 'ket_noi' ? { ket_noi: { id: 'k', nha_cung_cap: 'anthropic', khoa_hien: 'x' }, dong_bo: { so_dong: 3 } } : TRONG);
    dung();
    fireEvent.click((await screen.findAllByRole('button', { name: /Tự động lấy số liệu/ }))[0]);
    const form = await screen.findByRole('dialog');
    fireEvent.change(within(form).getByLabelText(/Khoá quản trị Anthropic/), { target: { value: 'sk-ant-admin01-abcdefghijklmnopqrstuvwxyz' } });
    const nut = within(form).getByRole('button', { name: /Kiểm tra và kết nối/ }) as HTMLButtonElement;
    expect(nut.disabled).toBe(true);
    fireEvent.click(within(form).getByRole('checkbox'));
    expect(nut.disabled).toBe(false);
    fireEvent.click(nut);
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('ket_noi', { nha_cung_cap: 'anthropic', khoa: 'sk-ant-admin01-abcdefghijklmnopqrstuvwxyz' }));
  });
});
