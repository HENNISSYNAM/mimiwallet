import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ToKhaiPage from './ToKhaiPage';
import { CAN_CU, kyGoiY, soanToKhai, suyLuan, type SuKienThue } from '@/lib/heLuat';
import type { KetQuaPhanTich } from '@/lib/goiToKhai';
import { chiaTheoHoatDong } from '../../supabase/functions/_shared/doanh-thu/theo-hoat-dong';

/** Mỗi quý một khoản; mọi khoản đã được người dùng xếp vào `nhom` (mặc định) — hoặc chưa ai xếp. */
function chiaDu(quy: [number, number, number, number], nhom: 'dich_vu' | null = 'dich_vu') {
  const khoan = quy.map((so_tien, i) => ({ nguon: 'hoa_don' as const, id: `q${i + 1}`, so_tien, ngay: `2026-${String(i * 3 + 1).padStart(2, '0')}-15` })).filter((k) => k.so_tien > 0);
  return chiaTheoHoatDong('hoa_don', khoan, nhom ? khoan.map((k) => ({ nguon: 'hoa_don' as const, nguon_id: k.id, hoat_dong: nhom })) : []);
}

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
  batDauKinhDoanh: null, daNopThueTrongNam: null, nganhDacThu: null, doanhThuNamTruoc: null, coQuanHeLienKet: null,
  hoatDong: chiaDu((p.doanhThuQuy ?? [200e6, 200e6, 200e6, 0]) as [number, number, number, number]), ...p,
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
    cong_ty: { ten: 'HỘ KINH DOANH NAM ĐINH', mst: '0123456789', loai_theo_mst: null, theo_mst: null },
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
    thanh_toan: { goi: null, con_luot: 0, gia_mot_to: 10_000, da_tra_ky_nay: false },
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

/*
 * "Mấy thông tin mà mã số thuế đã cung cấp mình không hỏi lại người dùng nữa" (24/09/2026).
 * Dữ liệu đăng ký thuế là của Vinamilk (0300588569) — công khai, dùng làm dữ liệu test chuẩn.
 */
describe('Tờ khai thuế — không hỏi lại điều mã số thuế đã trả lời', () => {
  const VINAMILK = {
    ten: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', mst: '0300588569', loai_theo_mst: 'doanh_nghiep' as const,
    theo_mst: {
      ten: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', dia_chi: '10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh',
      co_quan_thue: 'Chi cục Thuế Doanh nghiệp lớn', trang_thai: 'NNT đang hoạt động', con_hoat_dong: true, tra_luc: '2026-09-24T08:00:00Z',
    },
  };
  const voiCongTy = (cong_ty: KetQuaPhanTich['cong_ty']) => {
    gia.goi.mockImplementation(async (hanhDong: string) =>
      hanhDong === 'phan_tich' ? { ...ketQua(suKien({ loai: 'doanh_nghiep' })), cong_ty } as unknown as Record<string, unknown> : { ok: true });
  };

  it('đã tra được mã: hiện tên đăng ký, cơ quan thuế, và không hỏi "hộ hay doanh nghiệp"', async () => {
    voiCongTy(VINAMILK);
    dung();
    expect(await screen.findByText(/Chi cục Thuế Doanh nghiệp lớn/)).toBeTruthy();
    expect(screen.getByText(/10 Tân Trào/)).toBeTruthy();
    expect(screen.queryByText('Bạn nộp thuế với tư cách')).toBeNull();
  });

  it('mã đã đóng thì cảnh báo trước khi khai', async () => {
    voiCongTy({ ...VINAMILK, theo_mst: { ...VINAMILK.theo_mst, trang_thai: 'NNT ngừng hoạt động và đã đóng MST', con_hoat_dong: false } });
    dung();
    expect(await screen.findByText(/NNT ngừng hoạt động và đã đóng MST/)).toBeTruthy();
  });

  it('chưa biết loại theo mã số thuế thì vẫn hỏi', async () => {
    voiCongTy({ ten: 'Tạp hoá', mst: '0123456789', loai_theo_mst: null, theo_mst: null });
    dung();
    expect(await screen.findByText('Bạn nộp thuế với tư cách')).toBeTruthy();
  });

  it('chưa có mã số thuế thì chỉ đường sang Cài đặt', async () => {
    voiCongTy({ ten: 'Tạp hoá', mst: null, loai_theo_mst: null, theo_mst: null });
    dung();
    expect(await screen.findByRole('link', { name: /thêm trong Cài đặt/ })).toBeTruthy();
  });
});

/*
 * Thu tiền (24/09/2026): 10.000đ một kỳ khai, hoặc miễn phí khi gói còn hạn. Xem trước miễn phí.
 */
describe('Tờ khai thuế — xuất tờ khai có tính tiền', () => {
  const voiThanhToan = (thanh_toan: KetQuaPhanTich['thanh_toan']) => {
    gia.goi.mockImplementation(async (hanhDong: string) => {
      if (hanhDong === 'phan_tich') return { ...ketQua(suKien()), thanh_toan } as unknown as Record<string, unknown>;
      if (hanhDong === 'xuat') return { id: 'x1', ma_bam: 'b'.repeat(64), cach_tra: 'luot', con_luot: thanh_toan.con_luot - 1 };
      return { ok: true };
    });
  };

  it('nói giá ngay trên nút, và bản chưa xuất mang dấu "BẢN XEM TRƯỚC"', async () => {
    voiThanhToan({ goi: null, con_luot: 0, gia_mot_to: 10_000, da_tra_ky_nay: false });
    dung();
    expect(await screen.findByRole('button', { name: /Xuất tờ khai · 10\.000đ/ })).toBeTruthy();
    expect(screen.getByText('BẢN XEM TRƯỚC — CHƯA XUẤT')).toBeTruthy();
  });

  it('còn lượt: xuất, bỏ dấu xem trước, rồi mở hộp in', async () => {
    const inRa = vi.spyOn(window, 'print').mockImplementation(() => {});
    voiThanhToan({ goi: null, con_luot: 2, gia_mot_to: 10_000, da_tra_ky_nay: false });
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /dùng 1 lượt \(còn 2\)/ }));
    await waitFor(() => expect(gia.goi).toHaveBeenCalledWith('xuat', expect.objectContaining({ nam: 2026 })));
    await waitFor(() => expect(screen.queryByText('BẢN XEM TRƯỚC — CHƯA XUẤT')).toBeNull());
    await waitFor(() => expect(inRa).toHaveBeenCalled(), { timeout: 2000 });
    inRa.mockRestore();
  });

  it('hết lượt: máy chủ trả 402 thì hiện chỗ mua lượt, không in', async () => {
    const { LoiGoiHam } = await import('@/lib/loiGoiHam');
    const inRa = vi.spyOn(window, 'print').mockImplementation(() => {});
    gia.goi.mockImplementation(async (hanhDong: string) => {
      if (hanhDong === 'phan_tich') return ketQua(suKien()) as unknown as Record<string, unknown>;
      if (hanhDong === 'xuat') throw new LoiGoiHam('Cần 10.000đ', 402, { ma: 'CAN_THANH_TOAN' });
      return { ok: true };
    });
    dung();
    fireEvent.click(await screen.findByRole('button', { name: /Xuất tờ khai · 10\.000đ/ }));
    expect(await screen.findByText(/Tiền về là MIMI tự cộng lượt và xuất tờ khai ngay/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /4 quý trong năm · 40\.000đ/ })).toBeTruthy();
    expect(inRa).not.toHaveBeenCalled();
    inRa.mockRestore();
  });

  it('gói còn hạn: nút nói rõ là miễn phí', async () => {
    voiThanhToan({ goi: { plan: 'growth', het_han: '2026-10-24' }, con_luot: 0, gia_mot_to: 10_000, da_tra_ky_nay: false });
    dung();
    expect(await screen.findByRole('button', { name: /gói còn hạn/ })).toBeTruthy();
  });
});

describe('Tờ khai thuế — phụ lục giải trình in kèm', () => {
  it('có khoản đã xác nhận không phải doanh thu: in phụ lục với nguyên văn nội dung và tổng', async () => {
    gia.goi.mockImplementation(async (h: string) => (h === 'phan_tich'
      ? { ...ketQua(suKien()), phu_luc_giai_trinh: [
        { ngay: '2026-03-08', so_tien: 200_000_000, noi_dung: 'NGAN HANG TMCP (MINH HOA) — GIAI NGAN HDTD 0126', loai: 'Tiền vay', ghi_chu: null, vai_tro: 'chu_so_huu', xac_nhan_luc: '2026-09-24T08:00:00Z' },
        { ngay: '2026-08-20', so_tien: 3_000_000, noi_dung: 'CON GUI BA ME TIEU THANG 08/2026', loai: 'Người nhà chuyển', ghi_chu: null, vai_tro: 'ke_toan', xac_nhan_luc: '2026-09-24T08:00:00Z' },
      ] } as unknown as Record<string, unknown>
      : { ok: true }));
    dung();
    expect(await screen.findByText(/Phụ lục: các khoản tiền vào tài khoản không phải doanh thu/)).toBeTruthy();
    expect(screen.getByText('NGAN HANG TMCP (MINH HOA) — GIAI NGAN HDTD 0126')).toBeTruthy();
    expect(screen.getByText('203.000.000')).toBeTruthy();
  });

  it('không có khoản nào: không in phụ lục', async () => {
    gia.goi.mockImplementation(async (h: string) => (h === 'phan_tich' ? ketQua(suKien()) as unknown as Record<string, unknown> : { ok: true }));
    dung();
    await screen.findByText('THÔNG BÁO DOANH THU/TỜ KHAI THUẾ NĂM');
    expect(screen.queryByText(/Phụ lục: các khoản tiền vào/)).toBeNull();
  });
});

/*
 * 25/09/2026: doanh thu chưa rõ nhóm hoạt động thì KHÔNG xuất — nút khoá, lý do hiện ngay trên nút,
 * và chỗ xếp nhóm hiện tại chỗ.
 */
describe('Tờ khai thuế — chặn khi còn doanh thu chưa rõ nhóm', () => {
  it('nói số chưa rõ, khoá nút xuất', async () => {
    const sk = suKien({ hoatDong: chiaDu([200e6, 200e6, 200e6, 0], null) });
    gia.goi.mockImplementation(async (h: string) => (h === 'phan_tich' ? ketQua(sk) as unknown as Record<string, unknown> : { loai: 'ho_kinh_doanh', nguon: null, tong: 0 }));
    dung();
    expect(await screen.findByText('Chưa xuất được tờ khai này')).toBeTruthy();
    expect(screen.getByText(/600\.000\.000 đồng doanh thu chưa xác định nhóm hoạt động|600 triệu|chưa xác định nhóm hoạt động/)).toBeTruthy();
    const nut = screen.getByRole('button', { name: /Xuất tờ khai/ }) as HTMLButtonElement;
    expect(nut.disabled).toBe(true);
  });
});
