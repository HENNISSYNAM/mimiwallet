import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const gia = vi.hoisted(() => ({ goi: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: (...a: unknown[]) => gia.goi(...a) }));
vi.mock('@/lib/congTyDangDung', () => ({ idCongTyDangDung: async () => 'cty-1', SU_KIEN_DOI_CONG_TY: 'mimi:cong-ty-doi' }));

import { KhoiDieuPhoi } from './KhoiDieuPhoi';
import { datLaiNaoChoTest, useNaoMimi } from '@/store/naoMimi';

/* Dữ liệu kiểm thử — không phải số của ai. */
const DAN = {
  lan_chay_id: 'lc-1', cong_ty_id: 'cty-1', bat_dau: '2026-09-28T01:00:00Z', ket_thuc: '2026-09-28T01:00:02Z',
  trang_thai: 'mot_phan',
  tac_vu: [
    { agent_id: 'a-sao-ke', nang_luc: 'doc_sao_ke', ten: 'Đọc sao kê', trang_thai: 'hoan_tat', thoi_gian_ms: 420, tai_su_dung: false, cau: 'Đọc 38 giao dịch mới.' },
    { agent_id: 'a-chung-tu', nang_luc: 'thieu_chung_tu', ten: 'Tìm khoản thiếu chứng từ', trang_thai: 'loi', thoi_gian_ms: 1300, tai_su_dung: false, cau: 'Không đọc được bảng chứng từ.' },
    { agent_id: 'a-sao-ke', nang_luc: 'phan_loai', ten: 'Xếp loại khoản chi', trang_thai: 'hoan_tat', thoi_gian_ms: 5, tai_su_dung: true, cau: 'Dùng lại kết quả đọc sao kê.' },
  ],
  tai_nguyen: { so_agent: 2, so_tac_vu: 3, so_nguon_doc: 2, so_luot_mo_hinh: 0, so_luot_tai_su_dung: 1, gioi_han_song_song: 3 },
  gioi_han: ['Nhắc nợ chỉ là bản nháp — MIMI không tự gửi.'],
};
const traLoi = (them: Record<string, unknown> = {}) => ({
  cau: 'Đã chạy kế toán hằng ngày.', buoc: [], che_do: 'co_dinh', do_day: 'partial', hoi_thoai_id: 'ht-1',
  ket_qua: [{
    nang_luc: 'thieu_chung_tu', nhom: 'chung_tu', tom_tat: '2 khoản chi chưa có chứng từ.', the: [],
    de_xuat: [{ khoa: 'dx-1', loai: 'duyet_yeu_cau', nhan: 'Duyệt', mo_ta: 'Duyệt khoản chi', tham_so: { yeu_cau_id: 'yc-1' } }],
    nguon: [{ ten: 'Sao kê ngân hàng', mo_ta: '' }], trang: [],
  }],
  ...them,
});

// Các ca dưới đây kiểm phần đàn agent khi được MỞ; mặc định trên production đang đóng băng (ca cuối).
const dung = () => render(<MemoryRouter><KhoiDieuPhoi moDanAgent /></MemoryRouter>);

beforeEach(() => {
  gia.goi.mockReset();
  datLaiNaoChoTest();
  useNaoMimi.getState().datPhamVi('u-1:cty-1');
});

describe('Khối điều phối trên Tổng quan', () => {
  it('lối thu nạp dữ liệu chỉ trỏ tới trang có thật, không có nút tải lên giả', async () => {
    gia.goi.mockResolvedValue({});
    dung();
    const nav = screen.getByRole('navigation', { name: 'Thu nạp dữ liệu' });
    const duong = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(duong).toEqual(['/dashboard/fintech', '/dashboard/thu-vien', '/dashboard/invoices', '/dashboard/doc-bao-cao', '/dashboard/ket-noi']);
    expect(screen.queryByLabelText(/tải lên|upload/i)).toBeNull();
  });

  it('bấm quy trình hai lần → một request; báo cáo hiện agent thật, agent lỗi, không gọi mô hình, giới hạn, thiếu dữ liệu', async () => {
    let xong!: (v: unknown) => void;
    gia.goi.mockImplementation((h: string) => (h === 'danh_sach_agent' ? Promise.resolve({ danh_sach_agent: [] }) : new Promise((r) => { xong = r; })));
    dung();
    const nut = await screen.findByRole('button', { name: /Kế toán hằng ngày/ });
    fireEvent.click(nut); fireEvent.click(nut);
    expect(gia.goi.mock.calls.filter((c) => c[0] === 'chay_dan_agent')).toHaveLength(1);
    await waitFor(() => expect(nut.hasAttribute('disabled')).toBe(true));

    xong(traLoi({ dan_agent: DAN }));
    const dan = await screen.findByRole('region', { name: 'Đàn agent đã chạy' });
    expect(dan.textContent).toContain('Xong một phần');
    expect(dan.textContent).toContain('Tìm khoản thiếu chứng từ');
    expect(within(dan).getAllByText('Lỗi')).toHaveLength(1);
    expect(dan.textContent).toContain('Dùng lại kết quả');
    expect(dan.textContent).toContain('không gọi mô hình');
    expect(dan.textContent).toContain('Nhắc nợ chỉ là bản nháp');
    expect(dan.textContent).toMatch(/Không phải báo cáo tài chính pháp định/);
    expect(screen.getByText(/Chưa có mô hình ngôn ngữ/)).toBeTruthy();
    expect(screen.getByText(/Dữ liệu bị cắt bớt/).textContent).toMatch(/thiếu không phải bằng 0/);
    await waitFor(() => expect(nut.hasAttribute('disabled')).toBe(false));
  });

  it('việc thay đổi dữ liệu KHÔNG chạy ở đây: dẫn sang MIMI Assistant để xác nhận', async () => {
    gia.goi.mockImplementation((h: string) => Promise.resolve(h === 'danh_sach_agent' ? { danh_sach_agent: [] } : traLoi()));
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Kiểm tra sổ sách/ }));
    const link = await screen.findByRole('link', { name: /Xem và xác nhận việc cần làm ở MIMI Assistant/ });
    expect(link.getAttribute('href')).toBe('/dashboard/tro-ly');
    expect(screen.queryByRole('button', { name: 'Duyệt' })).toBeNull();
    expect(gia.goi.mock.calls.map((c) => c[0])).not.toContain('xac_nhan');
  });

  it('máy chủ cũ chưa có action danh_sach_agent → KHÔNG hiện nút quy trình, hiện NGUYÊN VĂN câu lỗi máy chủ; thu nạp vẫn dùng được', async () => {
    gia.goi.mockImplementation((h: string) => (h === 'danh_sach_agent' ? Promise.reject(new Error('Hành động không hợp lệ.')) : Promise.resolve({})));
    dung();
    expect(await screen.findByText(/máy chủ báo: Hành động không hợp lệ\./)).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Quy trình' })).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Thu nạp dữ liệu' })).toBeTruthy();
    // Danh mục là action nhẹ: không gọi boi_canh (đọc sao kê, chứng từ) chỉ để lấy danh sách agent.
    expect(gia.goi.mock.calls.map((c) => c[0])).not.toContain('boi_canh');
  });

  it('máy chủ có danh sách agent nhưng chạy quy trình lỗi → báo đúng câu lỗi, nút mở lại', async () => {
    gia.goi.mockImplementation((h: string) => (h === 'danh_sach_agent' ? Promise.resolve({ danh_sach_agent: [] }) : Promise.reject(new Error('Hành động không hợp lệ.'))));
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Thu hồi công nợ/ }));
    expect((await screen.findByRole('alert')).textContent).toBe('Hành động không hợp lệ.');
    await waitFor(() => expect(screen.getByRole('button', { name: /Thu hồi công nợ/ }).hasAttribute('disabled')).toBe(false));
  });

  it('câu trả lời không có dan_agent (máy chủ cũ) vẫn hiện; lượt hỏi từ pet hiện ở đây, không hỏi lại', async () => {
    gia.goi.mockImplementation((h: string) => Promise.resolve(h === 'danh_sach_agent' ? {} : traLoi({ do_day: 'complete' })));
    await useNaoMimi.getState().hoi('Khoản chi nào chưa có chứng từ?', { nguon: 'pet' });
    dung();
    expect(await screen.findByText('Đã chạy kế toán hằng ngày.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Đàn agent đã chạy' })).toBeNull();
    expect(gia.goi.mock.calls.filter((c) => c[0] === 'hoi')).toHaveLength(1);
  });

  it('danh sách agent từ bối cảnh: hiện đúng quyền "chỉ đọc và soạn nháp"', async () => {
    gia.goi.mockResolvedValue({ danh_sach_agent: [{ id: 'a-1', ten: 'Kế toán', mo_ta: 'Đọc sổ', nang_luc: ['doc_sao_ke'], trang_thai: 'can_ket_noi', quyen: 'chi_doc_va_soan_nhap' }] });
    dung();
    const ds = await screen.findByRole('list', { name: 'Agent của MIMI' });
    expect(ds.textContent).toContain('Kế toán · cần kết nối · chỉ đọc và soạn nháp');
  });

  // Hồi quy 29/09/2026: máy chủ chưa có `danh_sach_agent` → mọi người dùng thấy lỗi 400 trên Tổng quan.
  it('mặc định (đóng băng): không gọi danh_sach_agent, không hiện lỗi, lối thu nạp vẫn còn', async () => {
    render(<MemoryRouter><KhoiDieuPhoi /></MemoryRouter>);
    expect(screen.getByRole('navigation', { name: 'Thu nạp dữ liệu' })).toBeTruthy();
    await new Promise((r) => setTimeout(r, 50));
    expect(gia.goi).not.toHaveBeenCalledWith('danh_sach_agent', expect.anything(), expect.anything());
    expect(screen.queryByText(/Chưa chạy được đàn agent/)).toBeNull();
  });
});
