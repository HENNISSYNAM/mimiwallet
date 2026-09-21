import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GiayToPage from './GiayToPage';

/**
 * Soạn giấy tờ (TCCN-12, công văn thuế). CSDL giả: dữ liệu dưới đây là đầu vào của test.
 */

const gia = vi.hoisted(() => ({
  congTy: { id: 'cty-1', name: 'Hộ kinh doanh Thịnh Phát', tax_id: '0312345678', province: 'TP. Hồ Chí Minh' } as Record<string, unknown> | null,
  giaoDich: null as Record<string, unknown> | null,
  hoi: [] as { bang: string; loc: Record<string, unknown> }[],
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'u-1' } } }) },
    from: (bang: string) => {
      const loc: Record<string, unknown> = {};
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.order = () => q;
      q.limit = () => q;
      q.eq = (cot: string, v: unknown) => { loc[cot] = v; return q; };
      q.maybeSingle = () => {
        gia.hoi.push({ bang, loc: { ...loc } });
        return Promise.resolve({ data: bang === 'companies' ? gia.congTy : gia.giaoDich, error: null });
      };
      return q;
    },
  },
}));

const dung = (duong = '/dashboard/giay-to') => render(
  <MemoryRouter initialEntries={[duong]}><GiayToPage /></MemoryRouter>,
);
const giay = () => screen.getByRole('article', { name: 'Bản nháp' });

beforeEach(() => {
  gia.hoi = [];
  gia.giaoDich = null;
  gia.congTy = { id: 'cty-1', name: 'Hộ kinh doanh Thịnh Phát', tax_id: '0312345678', province: 'TP. Hồ Chí Minh' };
});

describe('Soạn giấy tờ', () => {
  it('điền sẵn tên, mã số thuế, địa danh từ hồ sơ công ty; nói rõ MIMI không gửi thay', async () => {
    dung();
    await waitFor(() => expect(giay().textContent).toContain('Hộ kinh doanh Thịnh Phát'), { timeout: 8000 });
    expect(giay().textContent).toContain('0312345678');
    expect(giay().textContent).toContain('TP. Hồ Chí Minh, ngày');
    expect(document.body.textContent).toContain('MIMI không gửi thay và không lưu bản nháp');
  });

  it('mở từ cảnh báo (?giao_dich=): đọc đúng dòng sao kê đó và điền vào đơn tra soát', async () => {
    gia.giaoDich = {
      id: 'gd-9', transaction_date: '2026-09-14T00:00:00', amount: -45_000_000, counter_account_name: 'NGUYEN VAN H',
      counter_account_number: '1234567890', payment_reference: 'chuyen tien', reference_id: 'FT2625712345',
      source_bank: 'MB Bank', account_number: '0011223344',
    };
    dung('/dashboard/giay-to?loai=don_tra_soat&giao_dich=gd-9');
    await waitFor(() => expect(giay().textContent).toContain('FT2625712345'), { timeout: 8000 });
    expect(gia.hoi).toContainEqual({ bang: 'transactions', loc: { id: 'gd-9', is_synthetic: false } });
    const chu = giay().textContent!;
    expect(chu).toContain('ĐƠN ĐỀ NGHỊ TRA SOÁT GIAO DỊCH CHUYỂN TIỀN');
    expect(chu).toContain('Kính gửi: Ngân hàng MB Bank');
    expect(chu).toContain('45.000.000 đồng');
    expect(chu).toContain('1234567890');
  });

  it('giao dịch không đọc được: báo rõ, vẫn cho tự điền', async () => {
    dung('/dashboard/giay-to?loai=don_tra_soat&giao_dich=khong-co');
    expect((await screen.findByRole('alert')).textContent).toContain('Bạn vẫn có thể tự điền');
  });

  it('còn ô trống thì báo đúng tên từng ô trước khi in', async () => {
    dung();
    const bao = await screen.findByRole('status');
    expect(bao.textContent).toContain('Địa chỉ trụ sở');
    expect(bao.textContent).toContain('Người đại diện');
    fireEvent.change(screen.getByLabelText('Địa chỉ trụ sở'), { target: { value: '12 Lê Lợi' } });
    await waitFor(() => expect(screen.getByRole('status').textContent).not.toContain('Địa chỉ trụ sở'));
    expect(giay().textContent).toContain('Địa chỉ: 12 Lê Lợi');
  });

  it('đổi sang công văn huỷ tờ khai: có lưu ý "không phải tờ khai nào cũng huỷ được" và câu xin hướng dẫn điều chỉnh', async () => {
    dung();
    fireEvent.click(within(screen.getByRole('tablist', { name: 'Loại giấy tờ' })).getByRole('tab', { name: 'Công văn đề nghị huỷ tờ khai' }));
    expect(document.body.textContent).toContain('Không phải tờ khai nào cũng huỷ được');
    fireEvent.change(screen.getByLabelText('Mẫu tờ khai'), { target: { value: '01/CNKD' } });
    fireEvent.change(screen.getByLabelText('Kỳ tính thuế'), { target: { value: 'Quý 2/2026' } });
    await waitFor(() => expect(giay().textContent).toContain('V/v đề nghị huỷ tờ khai 01/CNKD kỳ Quý 2/2026'));
    expect(giay().textContent).toContain('hướng dẫn chúng tôi thực hiện điều chỉnh');
  });

  it('?loai= lạ thì về mẫu mặc định, không vỡ trang', () => {
    dung('/dashboard/giay-to?loai=<script>');
    expect(screen.getByRole('tab', { name: 'Đơn đề nghị tra soát giao dịch' }).getAttribute('aria-selected')).toBe('true');
  });
});
