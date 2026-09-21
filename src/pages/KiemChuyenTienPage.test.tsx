import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import KiemChuyenTienPage from './KiemChuyenTienPage';

/**
 * TCCN-02 — Kiểm tra trước khi chuyển tiền. Dữ liệu dưới đây là đầu vào của test.
 */

const gia = vi.hoisted(() => ({ goiTroLy: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.goiTroLy }));

const nhap = (nhan: RegExp | string, v: string) => fireEvent.change(screen.getByLabelText(nhan), { target: { value: v } });
const bam = () => fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }));

beforeEach(() => { gia.goiTroLy.mockReset(); });

describe('Kiểm tra trước khi chuyển tiền', () => {
  it('nói rõ MIMI không chuyển tiền và không lưu thông tin nhập vào', () => {
    render(<KiemChuyenTienPage />);
    expect(document.body.textContent).toContain('MIMI không chuyển tiền và không lưu thông tin bạn nhập ở đây');
  });

  it('thiếu số tài khoản hoặc số tiền: báo tại chỗ, không gọi máy chủ', () => {
    render(<KiemChuyenTienPage />);
    nhap('Số tài khoản người nhận', '12');
    bam();
    expect(screen.getByRole('alert').textContent).toContain('ít nhất 6 chữ số');
    nhap('Số tài khoản người nhận', '0123456789');
    bam();
    expect(screen.getByRole('alert').textContent).toContain('Nhập số tiền');
    expect(gia.goiTroLy).not.toHaveBeenCalled();
  });

  it('gửi đúng dữ liệu: chỉ chữ số, số tiền là số, kèm hoàn cảnh đã tích', async () => {
    gia.goiTroLy.mockResolvedValue({ muc_do: null, dau_hieu: [], lich_su_du: true, trong_danh_sach_tin_cay: false, lan_tra_truoc: 0, lan_cuoi: null, lon_nhat_da_tra: null });
    render(<KiemChuyenTienPage />);
    nhap('Số tài khoản người nhận', '0123 456 789');
    nhap(/Tên người nhận/, ' Nguyen Van H ');
    nhap('Số tiền (₫)', '45.000.000');
    expect((screen.getByLabelText('Số tiền (₫)') as HTMLInputElement).value).toBe('45.000.000');
    fireEvent.click(screen.getByLabelText(/giục chuyển ngay/));
    bam();
    await waitFor(() => expect(gia.goiTroLy).toHaveBeenCalledWith('kiem_truoc_khi_chuyen', {
      so_tai_khoan: '0123456789', ten_nguoi_nhan: 'Nguyen Van H', so_tien: 45_000_000, noi_dung: '', hoan_canh: ['giuc_gap'],
    }));
  });

  it('mức cao: "Dừng lại", từng dấu hiệu, và việc nên làm (gọi lại số cũ, không đưa OTP)', async () => {
    gia.goiTroLy.mockResolvedValue({
      muc_do: 'cao', lich_su_du: true, trong_danh_sach_tin_cay: false, lan_tra_truoc: 0, lan_cuoi: null, lon_nhat_da_tra: null,
      dau_hieu: [{ ma: 'bi_ep_buoc', muc_do: 'cao', cau: 'Bạn đang gặp một tình huống hay gặp trong lừa đảo.', can_cu: [] }],
    });
    render(<KiemChuyenTienPage />);
    nhap('Số tài khoản người nhận', '0123456789');
    nhap('Số tiền (₫)', '45000000');
    bam();
    const kq = await screen.findByRole('region', { name: 'Kết quả kiểm tra' });
    expect(kq.textContent).toContain('Dừng lại — chưa nên chuyển');
    expect(kq.textContent).toContain('Mức cao');
    expect(kq.textContent).toContain('Không đưa mã OTP');
    expect(kq.textContent).toContain('chưa từng trả tài khoản này');
  });

  it('không có dấu hiệu: vẫn nói rõ "không có dấu hiệu không có nghĩa là an toàn", kèm lịch sử đã trả', async () => {
    gia.goiTroLy.mockResolvedValue({
      muc_do: null, dau_hieu: [], lich_su_du: true, trong_danh_sach_tin_cay: true, lan_tra_truoc: 4, lan_cuoi: '2026-09-05', lon_nhat_da_tra: 2_000_000,
    });
    render(<KiemChuyenTienPage />);
    nhap('Số tài khoản người nhận', '0011223344');
    nhap('Số tiền (₫)', '1500000');
    bam();
    const kq = await screen.findByRole('region', { name: 'Kết quả kiểm tra' });
    expect(kq.textContent).toContain('Không thấy dấu hiệu trong dữ liệu của MIMI');
    expect(kq.textContent).toContain('đã trả tài khoản này 4 lần trong 180 ngày, lần gần nhất 05/09/2026, lớn nhất 2.000.000 ₫');
    expect(kq.textContent).toContain('danh sách người nhận được phép');
    expect(kq.textContent).toContain('không có dấu hiệu không có nghĩa là an toàn');
    expect(kq.textContent).not.toContain('Việc nên làm');
  });

  it('máy chủ lỗi: báo lỗi, không hiện kết quả nào', async () => {
    gia.goiTroLy.mockRejectedValue(new Error('Quá nhiều yêu cầu, thử lại sau.'));
    render(<KiemChuyenTienPage />);
    nhap('Số tài khoản người nhận', '0123456789');
    nhap('Số tiền (₫)', '1000000');
    bam();
    expect((await screen.findByRole('alert')).textContent).toContain('Quá nhiều yêu cầu');
    expect(screen.queryByRole('region', { name: 'Kết quả kiểm tra' })).toBeNull();
  });
});
