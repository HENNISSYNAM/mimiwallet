import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToKhaiPage from './ToKhaiPage';
import { CAN_CU, kyGoiY, soanToKhai, suyLuan, type SuKienThue } from '@/lib/heLuat';
import type { KetQuaPhanTich } from '@/lib/goiToKhai';

/**
 * Dữ liệu trả về được dựng bằng chính hệ luật và bộ soạn tờ khai của sản phẩm, nên test này đỏ
 * ngay nếu hình dạng dữ liệu giữa máy chủ và màn hình lệch nhau.
 */
const gia = vi.hoisted(() => ({ goi: vi.fn() }));
vi.mock('@/lib/goiToKhai', async (goc) => {
  const that = await goc<typeof import('./../lib/goiToKhai')>();
  return { ...that, goiToKhai: gia.goi };
});
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const HOM_NAY = '2026-10-05';

const suKien = (p: Partial<SuKienThue> = {}): SuKienThue => ({
  nam: 2026, homNay: HOM_NAY, loai: 'ho_kinh_doanh', doanhThuQuy: [200e6, 200e6, 200e6, 0],
  nguonDoanhThu: 'hoa_don_dien_tu', nhomNganh: ['dich_vu'], kenh: 'dia_diem_co_dinh', phuongPhapTncn: null,
  batDauKinhDoanh: null, daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null, ...p,
});

function ketQua(sk: SuKienThue): KetQuaPhanTich {
  const sl = suyLuan(sk);
  const ky = kyGoiY(sk, sl);
  const soan = soanToKhai(sk, sl, { ten: 'HỘ KINH DOANH NAM ĐINH', mst: '0123456789' }, ky);
  const toKhai = soan.ok === true ? soan.to_khai : null;
  const lyDo = soan.ok === true ? null : soan.ly_do;
  const canCuSoan: string[] = toKhai ? toKhai.can_cu : (soan as { can_cu: string[] }).can_cu;
  const ids = [...new Set([...sl.ket_luan.flatMap((k) => k.can_cu), ...canCuSoan])];
  return {
    nam: sk.nam,
    hom_nay: HOM_NAY,
    cong_ty: { ten: 'HỘ KINH DOANH NAM ĐINH', mst: '0123456789' },
    ho_so: {
      loai_nguoi_nop: sk.loai, nhom_nganh: sk.nhomNganh, kenh: sk.kenh, phuong_phap_tncn: sk.phuongPhapTncn,
      bat_dau_kinh_doanh: null, da_nop_thue_trong_nam: null, nganh_dac_thu: null, doanh_thu_nam_truoc: null, co_quan_he_lien_ket: null,
    },
    su_kien: sk,
    doanh_thu: { hoa_don: sk.doanhThuQuy, ngan_hang: [210e6, 200e6, 200e6, 0], so_hoa_don: 12, co_ket_noi_ngan_hang: true, quy: sk.doanhThuQuy, nguon: 'hoa_don_dien_tu' },
    suy_luan: sl,
    ky,
    ky_goi_y: ky,
    to_khai: toKhai,
    ly_do_khong_soan: lyDo,
    canh_bao: [],
    can_cu: ids.map((id) => ({
      id, van_ban: CAN_CU[id].van_ban, ten_van_ban: `Văn bản ${CAN_CU[id].van_ban}`, vi_tri: CAN_CU[id].vi_tri,
      y: CAN_CU[id].y, trich: CAN_CU[id].trich, url: 'https://congbao.chinhphu.vn/x', ngay_ban_hanh: '2026-03-05',
      da_doi_chieu: true,
      hieu_luc: { so_hieu: CAN_CU[id].van_ban, trang_thai: 'chua_ghi_nhan_bai_bo' as const, tu: null, boi: null, trich: null, co_ngoai_le: false },
      nhan_hieu_luc: 'Kho chưa ghi nhận văn bản bãi bỏ',
    })),
    chua_doi_chieu: [],
  };
}

beforeEach(() => {
  gia.goi.mockReset();
  gia.goi.mockImplementation(async (hanhDong: string) => {
    if (hanhDong === 'phan_tich') return ketQua(suKien()) as unknown as Record<string, unknown>;
    if (hanhDong === 'luu_nhap') return { id: 'n1', ma_bam: 'a'.repeat(64) };
    return { ok: true };
  });
});

const dung = () => render(<MemoryRouter><ToKhaiPage /></MemoryRouter>);

describe('Tờ khai thuế', () => {
  it('in ra đúng mẫu 01/TKN-CNKD với doanh thu thật và không có số thuế bịa', async () => {
    dung();
    expect(await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM')).toBeTruthy();
    expect(screen.getByText(/Mẫu số: 01\/TKN-CNKD/)).toBeTruthy();
    expect(document.body.textContent).toContain('Thông tư số 50/2026/TT-BTC');
    const bang = screen.getAllByRole('table').find((t) => t.textContent?.includes('Tổng cộng')) as HTMLElement;
    // Doanh thu 600 triệu của ba quý đầu, điền vào dòng dịch vụ và dòng tổng cộng.
    expect(within(bang).getAllByText('600.000.000').length).toBeGreaterThanOrEqual(2);
    // Không có ô thuế nào bị điền 0 cho đẹp.
    expect(within(bang).queryByText('0')).toBeNull();
  });

  it('không bày chuỗi suy luận trên trang — người dùng hỏi MIMI Assistant mới trả lời', async () => {
    dung();
    await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    expect(screen.queryByRole('heading', { name: /MIMI suy luận/ })).toBeNull();
    expect(screen.queryByText(CAN_CU.nd68_d3_k1.trich)).toBeNull();
  });

  it('có đường nộp trên Cổng dịch vụ công và nói rõ MIMI không nộp thay', async () => {
    dung();
    await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    const nut = screen.getByRole('link', { name: /Nộp trên Cổng dịch vụ công/ });
    expect(nut.getAttribute('href')).toBe('https://dichvucong.gdt.gov.vn/tthc/homelogin');
    expect(nut.getAttribute('rel')).toContain('noopener');
    expect(document.body.textContent).toContain('MIMI không nộp và không ký thay bạn');
  });

  it('lưu bản nháp gọi đúng backend với kỳ đang xem', async () => {
    dung();
    await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    fireEvent.click(screen.getByRole('button', { name: /Lưu bản nháp/ }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('luu_nhap', { nam: 2026, ky: { loai: 'nam', nam: 2026 } }));
  });

  it('đổi kỳ thì hỏi lại máy chủ đúng kỳ đó', async () => {
    dung();
    await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    fireEvent.click(screen.getByRole('button', { name: 'Quý 3/2026' }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('phan_tich', { nam: 2026, ky: { loai: 'quy', nam: 2026, quy: 3 } }));
  });

  it('lưu hồ sơ thuế rồi đọc lại phân tích', async () => {
    dung();
    await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu hồ sơ thuế' }));
    await waitFor(() => expect(gia.goi.mock.calls.some((c) => c[0] === 'luu_ho_so')).toBe(true));
  });

  it('kỳ chưa soạn được thì nói lý do và chỉ đường, không hiện tờ khai rỗng', async () => {
    gia.goi.mockImplementation(async (hanhDong: string) => {
      if (hanhDong !== 'phan_tich') return { ok: true };
      const sk = suKien({ doanhThuQuy: [200e6, 200e6, 200e6, 0] });
      const r = ketQua(sk);
      return { ...r, ky: { loai: 'quy', nam: 2026, quy: 2 }, to_khai: null, ly_do_khong_soan: 'Doanh thu năm chưa vượt 01 tỷ đồng: chưa phải khai theo quý.' } as unknown as Record<string, unknown>;
    });
    dung();
    expect(await screen.findByText(/chưa phải khai theo quý/)).toBeTruthy();
    expect(screen.queryByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM')).toBeNull();
    expect(screen.getByRole('button', { name: /Soạn cho Năm 2026/ })).toBeTruthy();
  });

  it('lỗi máy chủ thì nói thật, không hiện số nào', async () => {
    gia.goi.mockRejectedValue(new Error('Chưa đọc được dữ liệu thuế.'));
    dung();
    expect(await screen.findByText('Chưa đọc được dữ liệu thuế.')).toBeTruthy();
  });
});
