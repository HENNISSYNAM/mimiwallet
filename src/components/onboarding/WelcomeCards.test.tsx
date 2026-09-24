import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import WelcomeCards from './WelcomeCards';

/*
 * "Mấy thông tin mà mã số thuế đã cung cấp mình không hỏi lại người dùng nữa" (24/09/2026).
 * Mã mẫu là của Vinamilk (0300588569) — dữ liệu đăng ký thuế công khai, dữ liệu test chuẩn.
 */
const gia = vi.hoisted(() => ({ traMst: vi.fn(), capNhat: vi.fn(), goiToKhai: vi.fn() }));

vi.mock('@/lib/traMst', () => ({ traMst: gia.traMst }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: gia.goiToKhai }));
vi.mock('@/lib/congTyDangDung', () => ({
  congTyDangDung: async () => ({ id: 'c1', vai_tro: 'chu_so_huu' }),
  idCongTyDangDung: async () => 'c1',
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'c1', name: 'Nguyễn Văn A', tax_id: null, onboarding_done_at: null } }) }) }),
      update: (u: Record<string, unknown>) => { gia.capNhat(u); return { eq: async () => ({ error: null }) }; },
    }),
  },
}));

beforeEach(() => {
  gia.traMst.mockReset();
  gia.capNhat.mockReset();
  gia.goiToKhai.mockReset().mockResolvedValue({});
});

const goMa = async (ma: string) => {
  render(<WelcomeCards />);
  const o = await screen.findByPlaceholderText('0319436143');
  fireEvent.change(o, { target: { value: ma } });
};

describe('thẻ chào mừng — mã số thuế trả lời thay người dùng', () => {
  it('tra thấy: hiện tên đăng ký, bỏ câu tên và câu loại hình, chỉ còn một nút', async () => {
    gia.traMst.mockResolvedValue({ trang_thai: 'thay', ten: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', loai: 'doanh_nghiep', trang_thai_nnt: 'NNT đang hoạt động', con_hoat_dong: true });
    await goMa('0300588569');
    expect(await screen.findByText('CÔNG TY CỔ PHẦN SỮA VIỆT NAM')).toBeTruthy();
    expect(screen.getByText('MIMI đã tìm thấy cửa hàng của bạn')).toBeTruthy();
    expect(screen.queryByText('Tên cửa hàng / công ty')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Hộ kinh doanh' })).toBeNull();
    expect(gia.traMst).toHaveBeenCalledWith('0300588569');

    fireEvent.click(screen.getByRole('button', { name: 'Đúng, tiếp tục' }));
    // Sang câu ngành nghề — thứ mã số thuế không trả lời được — và không hỏi lại mã.
    expect(await screen.findByText('Bạn đang kinh doanh ngành gì?')).toBeTruthy();
    expect(screen.queryByPlaceholderText('0319436143')).toBeNull();
  });

  it('bỏ qua ở bước sau vẫn lưu tên đăng ký, loại hình và mã', async () => {
    gia.traMst.mockResolvedValue({ trang_thai: 'thay', ten: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', loai: 'doanh_nghiep', trang_thai_nnt: 'NNT đang hoạt động', con_hoat_dong: true });
    await goMa('0300588569');
    fireEvent.click(await screen.findByRole('button', { name: 'Đúng, tiếp tục' }));
    await screen.findByText('Bạn đang kinh doanh ngành gì?');
    fireEvent.click(screen.getAllByRole('button', { name: /Bỏ qua/ })[0]);
    await waitFor(() => expect(gia.capNhat).toHaveBeenCalled());
    expect(gia.capNhat.mock.calls[0][0]).toMatchObject({ name: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', account_type: 'business', tax_id: '0300588569' });
    // Và nhờ máy chủ ghi phần còn lại (địa chỉ, cơ quan thuế) vào hồ sơ.
    await waitFor(() => expect(gia.goiToKhai).toHaveBeenCalledWith('ho_so'));
  });

  it('mã đã đóng thì cảnh báo', async () => {
    gia.traMst.mockResolvedValue({ trang_thai: 'thay', ten: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', loai: 'doanh_nghiep', trang_thai_nnt: 'NNT ngừng hoạt động và đã đóng MST', con_hoat_dong: false });
    await goMa('0300588569');
    expect(await screen.findByText(/không còn hoạt động/)).toBeTruthy();
  });

  it('tra không thấy: vẫn hỏi tên và loại hình như cũ', async () => {
    gia.traMst.mockResolvedValue({ trang_thai: 'khong_thay' });
    await goMa('0300588569');
    expect(await screen.findByText(/Chưa thấy mã này/)).toBeTruthy();
    expect(screen.getByText('Tên cửa hàng / công ty')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hộ kinh doanh' })).toBeTruthy();
  });

  it('mã sai hình thì không tra', async () => {
    await goMa('03005');
    expect(await screen.findByText(/Mã số thuế gồm 10 chữ số/)).toBeTruthy();
    await new Promise((r) => setTimeout(r, 600));
    expect(gia.traMst).not.toHaveBeenCalled();
  });
});
