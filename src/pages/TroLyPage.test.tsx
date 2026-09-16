import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TroLyPage from './TroLyPage';
import type { BoiCanh, TraLoi } from '@/lib/troLy';

/**
 * MIMI Assistant nằm sau đăng nhập: kiểm bằng dựng giao diện với edge function giả.
 * Dữ liệu dưới đây là đầu vào của test, không đi vào sản phẩm.
 */

class RO { observe() {} unobserve() {} disconnect() {} }
(globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver ??= RO;

const gia = vi.hoisted(() => ({ troLy: vi.fn(), tacTu: vi.fn(), chiPhiAi: vi.fn(), saoKe: vi.fn(), toKhai: vi.fn(), datLai: vi.fn() }));
vi.mock('@/lib/goiTroLy', () => ({ goiTroLy: gia.troLy, dongBoSaoKe: gia.saoKe }));
vi.mock('@/lib/goiTacTu', () => ({ goiTacTu: gia.tacTu }));
vi.mock('@/lib/goiChiPhiAi', () => ({ goiChiPhiAi: gia.chiPhiAi }));
vi.mock('@/lib/goiToKhai', () => ({ goiToKhai: gia.toKhai, DUONG_DAN_NOP_TO_KHAI: 'https://dichvucong.gdt.gov.vn/tthc/homelogin' }));
// Canvas và ảnh động không chạy trong jsdom; cả hai chỉ trang trí.
vi.mock('@/components/tro-ly/NenVongHat', () => ({ NenVongHat: () => <canvas aria-hidden="true" data-testid="nen" /> }));
vi.mock('@/components/brand/MimiCat', () => ({ default: () => <span /> }));
vi.mock('@/hooks/useCongCuGhim', async () => {
  const { CONG_CU_MAC_DINH, CONG_CU_THEO_KHOA } = await import('@/lib/congCu');
  return {
    useCongCuGhim: () => ({
      ds: CONG_CU_MAC_DINH.map((k) => CONG_CU_THEO_KHOA[k]), laMacDinh: true, daTai: true,
      ghim: vi.fn(), boGhim: vi.fn(), datLai: gia.datLai, dangLuu: false, loi: null,
    }),
  };
});
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }) }));

const DUYET_Y1 = { khoa: 'duyet:y1', loai: 'duyet_yeu_cau' as const, nhan: 'Duyệt 2.000.000 ₫', mo_ta: 'Cho phép trả 2.000.000 ₫ cho CONG TY A. MIMI không chuyển tiền.', tham_so: { yeu_cau_id: 'y1' } };

const BOI_CANH: BoiCanh = {
  cong_ty: 'Công ty Thử',
  co_mo_hinh: false,
  thue: null,
  viec: [
    { khoa: 'cho_duyet', nhom: 'tro_ly', cau: '1 khoản chi đang chờ bạn duyệt, tổng 2.000.000 ₫', hoi: 'Khoản nào đang chờ tôi duyệt?', muc_do: 'can_chu_y' },
    { khoa: 'qua_han', nhom: 'chung_tu', cau: '2 hoá đơn bán ra quá hạn, tổng 9.000.000 ₫', hoi: 'Khách nào đang nợ quá hạn?', muc_do: 'can_chu_y' },
  ],
  ket_noi: [
    { khoa: 'ngan_hang', ten: 'Ngân hàng', loai: 'ngan_hang', trang_thai: 'can_xu_ly', cau: '1 tài khoản đọc sao kê, có tài khoản cần đăng nhập lại.', duong_dan: '/dashboard/fintech' },
    { khoa: 'anthropic', ten: 'Anthropic', loai: 'ai', trang_thai: 'dang_chay', cau: 'Tự lấy số liệu.', duong_dan: '/dashboard/chi-phi-ai' },
  ],
  phan_tich: {
    chi_phi_ai: {
      thang_nay_usd: 50, thay_doi_phan_tram: 25, ngan_sach_usd: null, phan_tram_ngan_sach: null,
      theo_thang: [
        { khoa: '2026-05', nhan: 'T5', usd: null }, { khoa: '2026-06', nhan: 'T6', usd: null }, { khoa: '2026-07', nhan: 'T7', usd: null },
        { khoa: '2026-08', nhan: 'T8', usd: 540 }, { khoa: '2026-09', nhan: 'T9', usd: 50 },
      ],
    },
    toi_uu: { y: ['Đặt ngân sách AI tháng để được cảnh báo trước khi vượt'], tiet_kiem_usd: null, hoi: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.' },
    can_xac_nhan: {
      so_khoan: 1, tong_tien: 2_000_000,
      muc: [{ yeu_cau_id: 'y1', muc_dich: 'Quảng cáo', nguoi_nhan: 'CONG TY A', agent: 'Trợ lý quảng cáo', so_tien: 2_000_000, ngay: '2026-09-14', duyet: DUYET_Y1 }],
    },
  },
};

const TRA_LOI: TraLoi = {
  cau: 'Có 1 khoản đang chờ bạn duyệt, tổng 2.000.000 ₫.',
  che_do: 'co_dinh',
  buoc: [
    { ten: 'hieu', cau: 'Hiểu là bạn hỏi về trợ lý & agent.' },
    { ten: 'du_lieu', cau: 'Đã đọc: Yêu cầu chi.' },
  ],
  ket_qua: [{
    nang_luc: 'yeu_cau_cho_duyet',
    nhom: 'tro_ly',
    tom_tat: 'x',
    the: [{
      loai: 'bang', tieu_de: 'Khoản đang chờ bạn duyệt',
      cot: [{ nhan: 'Người nhận', don_vi: 'chu' }, { nhan: 'Số tiền', don_vi: 'vnd' }, { nhan: 'Gửi ngày', don_vi: 'ngay' }],
      dong: [['CONG TY A', 2_000_000, '2026-09-14']],
    }],
    de_xuat: [
      DUYET_Y1,
      { khoa: 'tu_choi:y1', loai: 'tu_choi_yeu_cau', nhan: 'Từ chối', mo_ta: 'Từ chối khoản 2.000.000 ₫.', tham_so: { yeu_cau_id: 'y1', ghi_chu: 'Từ chối qua MIMI Assistant.' } },
    ],
    nguon: [{ ten: 'Yêu cầu chi', mo_ta: 'Ghi ở máy chủ MIMI.' }],
    trang: [{ nhan: 'Mở danh sách yêu cầu chi', duong_dan: '/dashboard/tac-tu?tab=yeu-cau' }],
  }],
};

const dung = () => render(<MemoryRouter><TroLyPage /></MemoryRouter>);
const hoiBangTay = (cau: string) => {
  fireEvent.change(screen.getByLabelText('Câu hỏi cho MIMI'), { target: { value: cau } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi câu hỏi' }));
};

beforeEach(() => {
  gia.toKhai.mockReset();
  gia.datLai.mockReset();
  gia.troLy.mockReset();
  gia.tacTu.mockReset();
  gia.troLy.mockImplementation(async (hanhDong: string) => (hanhDong === 'boi_canh' ? BOI_CANH : TRA_LOI));
});

describe('MIMI Assistant — màn đầu', () => {
  it('câu hỏi, chip nhóm việc trong ô hỏi, hàng kết nối, nền chỉ trang trí', async () => {
    dung();
    expect(screen.getByRole('heading', { name: 'MIMI có thể giúp gì cho bạn?' })).toBeTruthy();
    // Như ChatGPT: không hàng chip cuộn ngang trong ô hỏi — chỉ một nút chọn nhóm việc.
    expect(screen.getByRole('button', { name: /Nhóm việc/ }).closest('form')).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'Chọn nhóm việc' })).toBeNull();
    // Kết nối gọn một nút; bấm mới mở danh sách.
    await screen.findByRole('region', { name: 'Chi phí AI tháng này' });
    expect(screen.queryByRole('list', { name: 'Các kết nối' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Kết nối/ }));
    const ketNoi = await screen.findByRole('list', { name: 'Các kết nối' });
    expect(within(ketNoi).getByRole('link', { name: /Ngân hàng/ }).textContent).toContain('Cần xử lý');
    fireEvent.change(screen.getByLabelText('Tìm kết nối'), { target: { value: 'anthro' } });
    expect(within(screen.getByRole('list', { name: 'Các kết nối' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByTestId('nen').getAttribute('aria-hidden')).toBe('true');
    // Chưa có mô hình thì nói thật cách MIMI đang hiểu câu hỏi.
    expect(document.body.textContent).toContain('theo các mẫu có sẵn');
  });

  it('ba thẻ phân tích lấy số từ máy chủ; tháng chưa có số không vẽ thành 0', async () => {
    dung();
    const chiPhi = await screen.findByRole('region', { name: 'Chi phí AI tháng này' });
    expect(chiPhi.textContent).toContain('$50.00');
    expect(chiPhi.textContent).toContain('25% so với cùng kỳ tháng trước');
    expect(within(chiPhi).getByRole('table', { hidden: true }).textContent).toContain('T5Chưa có số liệu');
    expect(screen.getByRole('region', { name: 'Đề xuất tối ưu' }).textContent).toContain('Đặt ngân sách AI tháng');
    expect(screen.getByRole('region', { name: 'Cần bạn xác nhận' }).textContent).toContain('1 khoản chi cần phê duyệt, tổng 2.000.000 ₫');
    // Việc đã có thẻ riêng không lặp lại thành chip; việc khác vẫn hiện.
    const deY = screen.getByRole('region', { name: 'Cũng cần để ý' });
    expect(deY.textContent).toContain('hoá đơn bán ra quá hạn');
    expect(deY.textContent).not.toContain('chờ bạn duyệt');
  });

  it('phê duyệt từ thẻ: hỏi xác nhận rồi mới gọi backend duyệt', async () => {
    gia.tacTu.mockResolvedValue({ yeu_cau: {} });
    dung();
    const nut = await screen.findByRole('button', { name: 'Phê duyệt 2.000.000 ₫ cho CONG TY A' });
    expect(nut.hasAttribute('data-mimi-khong-tu-bam')).toBe(true);
    fireEvent.click(nut);
    const hop = await screen.findByRole('alertdialog');
    expect(gia.tacTu).not.toHaveBeenCalled();
    fireEvent.click(within(hop).getByRole('button', { name: 'Xác nhận duyệt' }));
    await waitFor(() => expect(gia.tacTu).toHaveBeenCalledWith('duyet', { yeu_cau_id: 'y1' }));
    // Thẻ tải lại số liệu sau khi duyệt.
    await waitFor(() => expect(gia.troLy.mock.calls.filter((c) => c[0] === 'boi_canh').length).toBe(2));
  });

  it('chọn nhóm việc rồi bấm mẹo nhanh: câu hỏi gửi kèm phạm vi', async () => {
    dung();
    await screen.findByRole('region', { name: 'Chi phí AI tháng này' });
    fireEvent.click(screen.getByRole('button', { name: /Nhóm việc/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'AI & token' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.' }));
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('hoi', expect.objectContaining({ pham_vi: 'ai_token' })));
  });
});

describe('MIMI Assistant — công cụ', () => {
  it('công cụ đã ghim hiện ở màn đầu; công cụ câu hỏi mở trợ lý và hỏi đúng một lần', async () => {
    render(
      <MemoryRouter initialEntries={[`/dashboard/tro-ly?hoi=${encodeURIComponent('Khách nào đang nợ quá hạn?')}`]}>
        <TroLyPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('hoi', { cau: 'Khách nào đang nợ quá hạn?', pham_vi: null, lich_su: [] }));
    expect(gia.troLy.mock.calls.filter((c) => c[0] === 'hoi')).toHaveLength(1);
  });

  it('dải công cụ dùng đường dẫn thật', async () => {
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /^Công cụ$/ }));
    const vung = await screen.findByRole('list', { name: 'Công cụ của bạn' });
    expect(within(vung).getByRole('link', { name: /Khoản chi thiếu chứng từ/ }).getAttribute('href')).toBe('/dashboard/chung-tu');
    expect(within(vung).getByRole('link', { name: /Soạn tờ khai thuế/ }).getAttribute('href')).toBe('/dashboard/to-khai');
    expect(within(vung).queryByRole('link', { name: /Đối soát tiền về|Khoản chờ duyệt|Khách nợ quá hạn|Dòng tiền 6 tháng|Tìm khoản trả trùng/ })).toBeNull();
  });
});

describe('MIMI Assistant — hỏi đáp', () => {
  it('hỏi → gửi đúng câu, hiện bước làm, bảng số, nguồn và nút việc', async () => {
    dung();
    await screen.findByRole('region', { name: 'Chi phí AI tháng này' });
    hoiBangTay('Khoản nào đang chờ tôi duyệt?');

    await waitFor(() => expect(gia.troLy).toHaveBeenCalledWith('hoi', { cau: 'Khoản nào đang chờ tôi duyệt?', pham_vi: null, lich_su: [] }));
    const bang = await screen.findByRole('table');
    expect(within(bang).getByText('2.000.000 ₫')).toBeTruthy();
    expect(within(bang).getByText('14/09/2026')).toBeTruthy();
    expect(screen.getByLabelText('MIMI đã làm gì').textContent).toContain('Đã đọc: Yêu cầu chi.');
    expect(document.body.textContent).toContain('Nguồn: Yêu cầu chi');
    expect(screen.getByRole('link', { name: 'Mở danh sách yêu cầu chi' }).getAttribute('href')).toBe('/dashboard/tac-tu?tab=yeu-cau');
  });

  it('duyệt trong câu trả lời: phải xác nhận; duyệt xong thì nút từ chối khoá', async () => {
    gia.tacTu.mockResolvedValue({ yeu_cau: {} });
    dung();
    hoiBangTay('Khoản nào đang chờ tôi duyệt?');
    const nutDuyet = await screen.findByRole('button', { name: 'Duyệt 2.000.000 ₫' });
    expect(nutDuyet.hasAttribute('data-mimi-khong-tu-bam')).toBe(true);
    fireEvent.click(nutDuyet);
    const hop = await screen.findByRole('alertdialog');
    expect(hop.textContent).toContain('MIMI không chuyển tiền');
    fireEvent.click(within(hop).getByRole('button', { name: 'Xác nhận duyệt' }));
    await waitFor(() => expect(gia.tacTu).toHaveBeenCalledWith('duyet', { yeu_cau_id: 'y1' }));
    expect(await screen.findByText(/Đã duyệt/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Từ chối' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('máy chủ lỗi: nói lỗi bằng lời, cho hỏi lại; cuộc hỏi mới về lại màn đầu', async () => {
    let lan = 0;
    gia.troLy.mockImplementation(async (hanhDong: string) => {
      if (hanhDong === 'boi_canh') return BOI_CANH;
      if (lan++ === 0) throw new Error('MIMI gặp lỗi khi đọc dữ liệu. Thử lại sau ít phút.');
      return TRA_LOI;
    });
    dung();
    hoiBangTay('dòng tiền');
    fireEvent.click(await screen.findByRole('button', { name: /Hỏi lại/ }));
    expect(await screen.findByRole('table')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Cuộc hỏi mới/ }));
    expect(await screen.findByRole('region', { name: 'Chi phí AI tháng này' })).toBeTruthy();
  });
});

const HO_SO_TRONG = {
  loai_nguoi_nop: null, nhom_nganh: [], kenh: null, phuong_phap_tncn: null, bat_dau_kinh_doanh: null,
  da_nop_thue_trong_nam: null, nganh_dac_thu: null, doanh_thu_nam_truoc: null, co_quan_he_lien_ket: null,
};

describe('MIMI Assistant — khảo sát đầu vào và thuế cá nhân hoá', () => {
  it('chưa có hồ sơ: hỏi bốn câu, lưu qua backend, chọn công cụ theo ngành, rồi đọc lại màn đầu', async () => {
    gia.toKhai.mockResolvedValue({ ok: true });
    gia.datLai.mockResolvedValue(true);
    gia.troLy.mockImplementation(async (hanhDong: string) => (hanhDong === 'boi_canh'
      ? { ...BOI_CANH, thue: { co_ho_so: false, ho_so: HO_SO_TRONG, nam: 2026, doanh_thu_nam: null, nguon_doanh_thu: null, tam_tinh: true, quy_vuot: null, nghia_vu: [], thieu: [] } }
      : TRA_LOI));
    dung();
    expect(await screen.findByRole('heading', { name: 'Bạn nộp thuế với tư cách nào?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hộ kinh doanh / cá nhân kinh doanh' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Dịch vụ, tư vấn, xây dựng không kèm vật tư' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sàn thương mại điện tử có thanh toán' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cho thuê nhà, đất, mặt bằng' }));

    await waitFor(() => expect(gia.toKhai).toHaveBeenCalledWith('luu_ho_so', {
      ho_so: expect.objectContaining({
        loai_nguoi_nop: 'ho_kinh_doanh', nhom_nganh: ['dich_vu'], kenh: 'tmdt_co_thanh_toan', nganh_dac_thu: 'cho_thue_bat_dong_san',
      }),
    }));
    // Người dùng chưa tự chọn công cụ nên MIMI chọn theo ngành.
    expect(gia.datLai).toHaveBeenCalledWith(['soan_to_khai', 'thieu_chung_tu', 'lien_ket_ngan_hang', 'hoa_don_ban', 'khach_hang']);
    await waitFor(() => expect(gia.troLy.mock.calls.filter((c) => c[0] === 'boi_canh').length).toBeGreaterThanOrEqual(2));
  });

  it('doanh nghiệp chỉ hỏi hai câu', async () => {
    gia.toKhai.mockResolvedValue({ ok: true });
    gia.datLai.mockResolvedValue(true);
    gia.troLy.mockImplementation(async (hanhDong: string) => (hanhDong === 'boi_canh'
      ? { ...BOI_CANH, thue: { co_ho_so: false, ho_so: HO_SO_TRONG, nam: 2026, doanh_thu_nam: null, nguon_doanh_thu: null, tam_tinh: true, quy_vuot: null, nghia_vu: [], thieu: [] } }
      : TRA_LOI));
    dung();
    fireEvent.click(await screen.findByRole('button', { name: 'Doanh nghiệp' }));
    expect(screen.getByText('Câu 2/2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Nội dung số, phần mềm, quảng cáo số' }));
    await waitFor(() => expect(gia.toKhai).toHaveBeenCalledWith('luu_ho_so', {
      ho_so: expect.objectContaining({ loai_nguoi_nop: 'doanh_nghiep', nhom_nganh: ['noi_dung_so'] }),
    }));
  });

  it('đã có hồ sơ: thẻ thuế nói đúng nghĩa vụ, mẫu, hạn và dẫn sang Tờ khai', async () => {
    gia.troLy.mockImplementation(async (hanhDong: string) => (hanhDong === 'boi_canh'
      ? {
        ...BOI_CANH,
        thue: {
          co_ho_so: true,
          ho_so: { ...HO_SO_TRONG, loai_nguoi_nop: 'ho_kinh_doanh', nhom_nganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', nganh_dac_thu: 'khong' },
          nam: 2026, doanh_thu_nam: 600_000_000, nguon_doanh_thu: 'hoa_don_dien_tu', tam_tinh: true, quy_vuot: null,
          nghia_vu: [{ id: 'thong_bao_doanh_thu', cau: 'Thông báo doanh thu thực tế năm 2026 với cơ quan thuế.', mau: '01/TKN-CNKD', han: '2027-01-31' }],
          thieu: [],
        },
      }
      : TRA_LOI));
    dung();
    const the = await screen.findByRole('region', { name: /Thuế của bạn năm 2026/ });
    expect(the.textContent).toContain('Hộ kinh doanh / cá nhân kinh doanh · Dịch vụ, tư vấn, xây dựng không kèm vật tư · Cửa hàng, địa điểm cố định');
    expect(the.textContent).toContain('Doanh thu tới nay: 600.000.000 ₫');
    expect(the.textContent).toContain('Mẫu 01/TKN-CNKD');
    expect(the.textContent).toContain('Hạn 31/01/2027');
    expect(within(the).getByRole('link', { name: /Soạn tờ khai/ }).getAttribute('href')).toBe('/dashboard/to-khai');
    // Không hỏi lại khảo sát khi đã có hồ sơ.
    expect(screen.queryByRole('heading', { name: 'Bạn nộp thuế với tư cách nào?' })).toBeNull();
    fireEvent.click(within(the).getByRole('button', { name: /Sửa câu trả lời/ }));
    expect(await screen.findByRole('heading', { name: 'Bạn nộp thuế với tư cách nào?' })).toBeTruthy();
  });
});
