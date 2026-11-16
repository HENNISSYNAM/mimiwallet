import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@/i18n';
import i18n from 'i18next';
import CoHoiPage from './CoHoiPage';

/**
 * Cơ hội phát triển với edge function giả: hiện mức, dấu hiệu, gói (đã / chưa xác minh); màn đồng ý có công bố phân
 * tích, mặc định chỉ mức + nhu cầu, nút đồng ý khoá tới khi chủ tích "đã đọc"; liên hệ chỉ hiện khi chủ muốn được liên hệ.
 */
const gia = vi.hoisted(() => ({ goi: vi.fn() }));
vi.mock('@/lib/goiGioiThieu', () => ({ goiCoHoi: gia.goi }));
vi.mock('@/lib/congTyDangDung', () => ({ SU_KIEN_DOI_CONG_TY: 'x' }));

const GOI = {
  id: '00000000-0000-4000-8000-000000000001', ma: 'g1', ngan_hang: 'UOB Việt Nam', phap_nhan_nhan: 'Ngân hàng TNHH MTV United Overseas Bank (Việt Nam)',
  ten_goi: 'Tiền gửi cho doanh nghiệp (chờ xác minh)', mo_ta: 'Tài khoản tiền gửi.', da_xac_minh: false, nguon: null, tieu_chi: null,
  nhan_xac_minh: 'Chưa xác minh', phu_hop: 'chua_kiem_duoc', ly_do_dieu_kien: [],
};
const DU = {
  tin_hieu: {
    phien_ban: 'v', hom_nay: '2026-11-16', so_thang: 8, muc: 'dang_len', ten_muc: { vi: 'Đang lên', en: 'Rising' }, ly_do_muc: { vi: 'luật', en: 'rule' },
    tin_hieu: [{ ma: 'tien_du_dong_lai', gia_tri: 1, don_vi: 'dong', do_tin_cay: 'cao', tin_cay_so: 0.85, bang_chung: { thang: ['2026-10'], giao_dich: [], so: {} }, giai_thich: { vi: 'Có phần tiền dư đều đặn.', en: 'Steady surplus.' } }],
    doanh_thu_12_thang: null, chuoi_thang: [], du_bao: null, nhan: { vi: 'Không phải điểm tín dụng.', en: 'Not a credit score.' },
  },
  nhu_cau: [{ nhu_cau: 'tien_gui', ten: 'Tiền gửi cho khoản tiền dư', do_manh: 0.8, tin_cay: 0.85, muc_tin_cay: 'cao', tu_dau_hieu: ['tien_du_dong_lai'], ly_do: 'Lý do.', goi: [GOI] }],
  hanh_dong: [{ nhu_cau: 'tien_gui', kenh: 'the_trong_ung_dung', ten_kenh: 'Thẻ', luc: 'sau_han_khai_thue', ngay_goi_y: '2027-02-01', gia_tri_ky_vong: 0.4, thanh_phan: { tin_cay: 0.85, do_manh: 0.8, hop_kenh: 0.7 }, cau: 'MIMI nhắc lại.', kenh_khac: [], can_chu_yeu_cau: false }],
  ghi_chu_thu_tu: 'heuristic',
  cong_bo: ['MIMI phân tích dữ liệu ngân hàng bạn đã kết nối.'],
  truong_chia_se: [
    { ma: 'muc_tang_truong', ten: 'Mức tăng trưởng', mac_dinh: true }, { ma: 'nhu_cau', ten: 'Nhu cầu', mac_dinh: true },
    { ma: 'doanh_thu_12_thang', ten: 'Số tiền bán 12 tháng', mac_dinh: false }, { ma: 'lien_he_email', ten: 'Email liên hệ', mac_dinh: false },
  ],
};

describe('CoHoiPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
    gia.goi.mockReset();
    gia.goi.mockImplementation(async (hd: string) => (hd === 'tin_hieu' ? DU : hd === 'ds' ? { dong_y: [], gioi_thieu: [] } : { ok: true }));
  });

  it('hiện mức, dấu hiệu, gói chưa xác minh; đồng ý cần tích đã đọc, mặc định chỉ mức + nhu cầu', async () => {
    render(<CoHoiPage />);
    expect(await screen.findByText('Đang lên')).toBeTruthy();
    expect(screen.getByText('Có phần tiền dư đều đặn.')).toBeTruthy();
    expect(screen.getByText('Chưa xác minh', { selector: 'span' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Tôi quan tâm/ }));
    expect(screen.getByText('MIMI phân tích dữ liệu ngân hàng bạn đã kết nối.')).toBeTruthy();
    expect((screen.getByLabelText('Mức tăng trưởng') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Số tiền bán 12 tháng') as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByLabelText('Email liên hệ')).toBeNull();
    const nut = screen.getByRole('button', { name: /Đồng ý và lập gói/ }) as HTMLButtonElement;
    expect(nut.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Tôi đã đọc/));
    fireEvent.click(nut);
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('dong_y', expect.objectContaining({
      goi_id: GOI.id, pham_vi: ['muc_tang_truong', 'nhu_cau'], yeu_cau_lien_he: false, hieu_phan_tich: true,
    })));
  });
});
