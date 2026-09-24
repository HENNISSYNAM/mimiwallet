import { describe, expect, it } from 'vitest';
import { docHoSo, hoSoCongTy } from './doc-su-kien';

/*
 * "Mấy thông tin mà mã số thuế đã cung cấp mình không hỏi lại người dùng nữa" (24/09/2026).
 * Dòng công ty dưới đây mang đúng dữ liệu đăng ký thuế công khai của Vinamilk (0300588569) —
 * dữ liệu test chuẩn, xem `_shared/mst/tra-cuu.test.ts`.
 */
const VINAMILK = {
  id: 'c1', name: 'Sữa của tôi', tax_id: '0300588569', account_type: null,
  ten_theo_mst: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
  dia_chi_theo_mst: '10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh',
  co_quan_thue: 'Chi cục Thuế Doanh nghiệp lớn',
  loai_theo_mst: 'doanh_nghiep',
  trang_thai_mst: 'NNT đang hoạt động',
  mst_tra_luc: '2026-09-24T08:00:00Z',
};

/** CSDL giả trả một dòng công ty và một dòng hồ sơ thuế. */
const dbGia = (congTy: Record<string, unknown> | null, hoSo: Record<string, unknown> | null) => ({
  from: (bang: string) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: bang === 'companies' ? congTy : hoSo, error: null }) }) }),
  }),
});

describe('hồ sơ công ty theo mã số thuế', () => {
  it('đã tra thấy: tờ khai dùng tên đăng ký, không dùng tên người dùng đặt', () => {
    const ct = hoSoCongTy('c1', VINAMILK);
    expect(ct.ten).toBe('CÔNG TY CỔ PHẦN SỮA VIỆT NAM');
    expect(ct.loai_theo_mst).toBe('doanh_nghiep');
    expect(ct.theo_mst).toMatchObject({ co_quan_thue: 'Chi cục Thuế Doanh nghiệp lớn', con_hoat_dong: true });
  });

  it('mã đã đóng thì báo không còn hoạt động', () => {
    const ct = hoSoCongTy('c1', { ...VINAMILK, trang_thai_mst: 'NNT ngừng hoạt động và đã đóng MST' });
    expect(ct.theo_mst?.con_hoat_dong).toBe(false);
  });

  it('chưa tra được nhưng mã 12 số: vẫn biết là hộ kinh doanh', () => {
    const ct = hoSoCongTy('c1', { id: 'c1', name: 'Tạp hoá Minh Anh', tax_id: '079203012345', mst_tra_luc: null });
    expect(ct.loai_theo_mst).toBe('ho_kinh_doanh');
    expect(ct.ten).toBe('Tạp hoá Minh Anh');
    expect(ct.theo_mst).toBeNull();
  });

  it('chưa có mã số thuế: không biết gì, phải hỏi', () => {
    const ct = hoSoCongTy('c1', { id: 'c1', name: 'X', tax_id: null });
    expect(ct.loai_theo_mst).toBeNull();
    expect(ct.theo_mst).toBeNull();
  });
});

describe('docHoSo: điều mã số thuế đã trả lời thì không hỏi lại', () => {
  it('chưa có hồ sơ thuế: loại người nộp lấy theo đăng ký thuế', async () => {
    const { ho_so } = await docHoSo(dbGia(VINAMILK, null), 'c1');
    expect(ho_so.loai_nguoi_nop).toBe('doanh_nghiep');
  });

  it('câu trả lời tay trái với đăng ký thuế: theo đăng ký thuế', async () => {
    const { ho_so } = await docHoSo(dbGia(VINAMILK, { loai_nguoi_nop: 'ho_kinh_doanh', nhom_nganh: [] }), 'c1');
    expect(ho_so.loai_nguoi_nop).toBe('doanh_nghiep');
  });

  it('không có mã số thuế: giữ câu người dùng đã trả lời', async () => {
    const { ho_so } = await docHoSo(dbGia({ id: 'c1', name: 'X', tax_id: null }, { loai_nguoi_nop: 'ho_kinh_doanh', nhom_nganh: [] }), 'c1');
    expect(ho_so.loai_nguoi_nop).toBe('ho_kinh_doanh');
  });
});
