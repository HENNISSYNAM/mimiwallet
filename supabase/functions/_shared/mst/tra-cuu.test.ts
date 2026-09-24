import { describe, expect, it, vi } from 'vitest';
import {
  chonBanGhi, dangHoatDong, dongBoMstCongTy, loaiTheoMst, mstDungHinh, tinhTuDiaChi, traCuuMst,
  type BanGhiThue,
} from './tra-cuu';

/*
 * DỮ LIỆU TEST CHUẨN: Công ty CP Sữa Việt Nam (Vinamilk), MST 0300588569.
 *
 * Dữ liệu đăng ký thuế là công khai. Bản ghi dưới đây là đúng điều `tax-lookup` trên production
 * trả về ngày 24/09/2026 — kèm hai con số thật: mã này có 25 bản ghi, 18 bản còn hoạt động.
 * Đó là lý do chọn nó: một mã, nhiều chi nhánh, có bản đã đóng — đúng ca khó cho `chonBanGhi`.
 *
 * Hai bản ghi CHI_NHANH và DA_DONG là dựng theo hình của bản ghi thật để thử thứ tự ưu tiên,
 * không phải bản ghi thật của Vinamilk.
 */
const VINAMILK: BanGhiThue = {
  orgType: 'Doanh nghiệp / Đơn vị sự nghiệp công lập',
  taxID: '0300588569',
  name: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
  address: '10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh',
  taxDepartment: 'Chi cục Thuế Doanh nghiệp lớn',
  status: 'NNT đang hoạt động',
};
const CHI_NHANH: BanGhiThue = { ...VINAMILK, orgType: 'Chi nhánh', taxID: '0300588569-001', address: 'Dựng để thử, Phường A, Tỉnh B' };
const DA_DONG: BanGhiThue = { ...VINAMILK, status: 'NNT ngừng hoạt động và đã đóng MST' };

const traLoi = (data: BanGhiThue[], success = true) =>
  vi.fn(async () => new Response(JSON.stringify({ success, data }), { status: 200 })) as unknown as typeof fetch;

const CFG = { clientId: 'x', apiKey: 'y' };

describe('hình dạng mã số thuế', () => {
  it('nhận 10 số, 10 số kèm đơn vị trực thuộc, và 12 số của hộ kinh doanh', () => {
    expect(mstDungHinh('0300588569')).toBe(true);
    expect(mstDungHinh('0300588569-001')).toBe(true);
    expect(mstDungHinh('079203012345')).toBe(true);
    expect(mstDungHinh('03005885')).toBe(false);
    expect(mstDungHinh('0300588569-01')).toBe(false);
  });
});

describe('đọc bản ghi đăng ký thuế', () => {
  it('Vinamilk: doanh nghiệp, ở TP Hồ Chí Minh, đang hoạt động', () => {
    expect(loaiTheoMst('0300588569', VINAMILK.orgType)).toBe('doanh_nghiep');
    expect(tinhTuDiaChi(VINAMILK.address)).toBe('TP Hồ Chí Minh');
    expect(dangHoatDong(VINAMILK.status)).toBe(true);
    expect(dangHoatDong(DA_DONG.status)).toBe(false);
  });

  it('hộ kinh doanh theo orgType, và theo mã 12 số khi chưa tra được', () => {
    expect(loaiTheoMst('8123456789', 'Hộ kinh doanh cá thể')).toBe('ho_kinh_doanh');
    expect(loaiTheoMst('079203012345', null)).toBe('ho_kinh_doanh');
  });

  it('loại lạ thì không đoán — để còn hỏi người dùng', () => {
    expect(loaiTheoMst('0300588569', 'Tổ chức khác')).toBeNull();
    expect(loaiTheoMst('0300588569', null)).toBeNull();
  });

  it('địa chỉ không có dấu phẩy thì không đoán tỉnh', () => {
    expect(tinhTuDiaChi('Hà Nội')).toBeNull();
    expect(tinhTuDiaChi(null)).toBeNull();
  });

  it('một mã nhiều bản ghi: chọn bản chính còn hoạt động, không lấy chi nhánh hay bản đã đóng', () => {
    expect(chonBanGhi([DA_DONG, CHI_NHANH, VINAMILK], '0300588569')).toBe(VINAMILK);
  });
});

describe('traCuuMst', () => {
  it('Vinamilk: trả bản ghi chính kèm số bản ghi và số bản còn hoạt động', async () => {
    const kq = await traCuuMst('0300588569', CFG, traLoi([DA_DONG, CHI_NHANH, VINAMILK]));
    expect(kq).toMatchObject({ trang_thai: 'thay', ban_ghi: VINAMILK, tong_so_ban_ghi: 3, so_con_hoat_dong: 2, con_hoat_dong: true });
  });

  it('không có bản ghi thì nói không thấy', async () => {
    expect(await traCuuMst('0300588569', CFG, traLoi([], false))).toEqual({ trang_thai: 'khong_thay' });
  });

  it('mã sai hình thì không gọi ra ngoài', async () => {
    const goi = traLoi([VINAMILK]);
    expect((await traCuuMst('123', CFG, goi)).trang_thai).toBe('loi');
    expect(goi).not.toHaveBeenCalled();
  });
});

/** CSDL giả: ghi lại lệnh update và các điều kiện lọc kèm theo. */
function dbGia(dong: Record<string, unknown> | null, laDemo = false) {
  const cap: { update?: Record<string, unknown>; loc: [string, unknown][] } = { loc: [] };
  const db = {
    from: (bang: string) => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: bang === 'profiles' ? { is_demo: laDemo } : dong, error: null }) }) }),
      update: (u: Record<string, unknown>) => {
        cap.update = u;
        const chuoi = { eq: (k: string, v: unknown) => { cap.loc.push([k, v]); return chuoi; } };
        return chuoi;
      },
    }),
  };
  return { db, cap };
}

describe('dongBoMstCongTy', () => {
  const bayGio = new Date('2026-09-24T08:00:00Z');

  it('ghi tên, địa chỉ, cơ quan thuế, loại; điền tỉnh và loại tài khoản còn trống', async () => {
    const { db, cap } = dbGia({ tax_id: '0300588569', mst_tra_luc: null, ten_theo_mst: null, province: null, account_type: null });
    await dongBoMstCongTy(db, 'c1', CFG, { bayGio, goi: traLoi([VINAMILK]) });
    expect(cap.update).toEqual({
      ten_theo_mst: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
      dia_chi_theo_mst: '10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh',
      co_quan_thue: 'Chi cục Thuế Doanh nghiệp lớn',
      loai_theo_mst: 'doanh_nghiep',
      trang_thai_mst: 'NNT đang hoạt động',
      mst_tra_luc: bayGio.toISOString(),
      province: 'TP Hồ Chí Minh',
      account_type: 'business',
    });
    // Chỉ ghi nếu mã số thuế vẫn là mã vừa tra.
    expect(cap.loc).toContainEqual(['tax_id', '0300588569']);
  });

  it('không đè tỉnh và loại tài khoản người dùng đã tự khai', async () => {
    const { db, cap } = dbGia({ tax_id: '0300588569', mst_tra_luc: null, ten_theo_mst: null, province: 'Đồng Nai', account_type: 'household' });
    await dongBoMstCongTy(db, 'c1', CFG, { bayGio, goi: traLoi([VINAMILK]) });
    expect(cap.update).not.toHaveProperty('province');
    expect(cap.update).not.toHaveProperty('account_type');
  });

  it('đã tra thấy rồi thì không gọi lại', async () => {
    const goi = traLoi([VINAMILK]);
    const { db } = dbGia({ tax_id: '0300588569', mst_tra_luc: '2026-09-01T00:00:00Z', ten_theo_mst: 'X', province: null, account_type: null });
    await dongBoMstCongTy(db, 'c1', CFG, { bayGio, goi });
    expect(goi).not.toHaveBeenCalled();
  });

  it('không thấy thì đợi một ngày mới tra lại', async () => {
    const goi = traLoi([VINAMILK]);
    const { db } = dbGia({ tax_id: '0300588569', mst_tra_luc: '2026-09-24T02:00:00Z', ten_theo_mst: null, province: null, account_type: null });
    await dongBoMstCongTy(db, 'c1', CFG, { bayGio, goi });
    expect(goi).not.toHaveBeenCalled();
  });

  it('tra hỏng thì im lặng, không ghi gì, không ném lỗi', async () => {
    const goi = vi.fn(async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    const { db, cap } = dbGia({ tax_id: '0300588569', mst_tra_luc: null, ten_theo_mst: null, province: null, account_type: null });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(dongBoMstCongTy(db, 'c1', CFG, { bayGio, goi })).resolves.toBeUndefined();
    expect(cap.update).toBeUndefined();
    log.mockRestore();
  });

  it('công ty của tài khoản demo: không tra, không ghi — demo không được hiện tên doanh nghiệp thật', async () => {
    const goi = traLoi([VINAMILK]);
    const { db, cap } = dbGia({ tax_id: '0312345678', mst_tra_luc: null, ten_theo_mst: null, province: null, account_type: null, user_id: 'demo' }, true);
    await dongBoMstCongTy(db, 'c1', CFG, { bayGio, goi });
    expect(goi).not.toHaveBeenCalled();
    expect(cap.update).toBeUndefined();
  });

  it('chưa cấu hình XInvoice thì không làm gì', async () => {
    const { db, cap } = dbGia({ tax_id: '0300588569', mst_tra_luc: null, ten_theo_mst: null, province: null, account_type: null });
    await dongBoMstCongTy(db, 'c1', null, { bayGio });
    expect(cap.update).toBeUndefined();
  });
});
