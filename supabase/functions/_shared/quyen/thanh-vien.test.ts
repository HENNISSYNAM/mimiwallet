import { describe, expect, it } from 'vitest';
import { chuanEmail, kiemThaoTac, laEmail } from './thanh-vien';
import type { VaiTro } from './vai-tro';

const nguoi = (id: string, vai_tro: VaiTro) => ({ id, vai_tro });
const CHU = nguoi('chu', 'chu_so_huu');
const QT = nguoi('qt', 'quan_tri');
const KT = nguoi('kt', 'ke_toan');
const ma = (r: ReturnType<typeof kiemThaoTac>) => r?.ma ?? null;

describe('mời thành viên', () => {
  it('chủ sở hữu mời được mọi vai trò', () => {
    for (const v of ['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan', 'nguoi_xem'] as VaiTro[]) {
      expect(ma(kiemThaoTac({ thaoTac: 'moi', nguoiLam: CHU, doiTuong: null, vaiTroMoi: v, soChuSoHuu: 1 }))).toBeNull();
    }
  });

  it('quản trị mời được kế toán, KHÔNG trao được quản trị hay chủ sở hữu', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'moi', nguoiLam: QT, doiTuong: null, vaiTroMoi: 'ke_toan', soChuSoHuu: 1 }))).toBeNull();
    expect(ma(kiemThaoTac({ thaoTac: 'moi', nguoiLam: QT, doiTuong: null, vaiTroMoi: 'quan_tri', soChuSoHuu: 1 }))).toBe('KHONG_DU_QUYEN');
    expect(ma(kiemThaoTac({ thaoTac: 'moi', nguoiLam: QT, doiTuong: null, vaiTroMoi: 'chu_so_huu', soChuSoHuu: 1 }))).toBe('KHONG_DU_QUYEN');
  });

  it('kế toán, người duyệt, người xem không mời được ai', () => {
    for (const v of ['ke_toan', 'nguoi_duyet', 'nguoi_xem'] as VaiTro[]) {
      expect(ma(kiemThaoTac({ thaoTac: 'moi', nguoiLam: nguoi('x', v), doiTuong: null, vaiTroMoi: 'nguoi_xem', soChuSoHuu: 1 }))).toBe('KHONG_DU_QUYEN');
    }
  });

  it('đã là thành viên thì không mời lại', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'moi', nguoiLam: CHU, doiTuong: KT, vaiTroMoi: 'ke_toan', soChuSoHuu: 1 }))).toBe('DA_LA_THANH_VIEN');
  });
});

describe('đổi vai trò và gỡ', () => {
  it('quản trị không đổi, không gỡ được chủ sở hữu hay quản trị khác', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'go_bo', nguoiLam: QT, doiTuong: CHU, soChuSoHuu: 2 }))).toBe('KHONG_DU_QUYEN');
    expect(ma(kiemThaoTac({ thaoTac: 'doi_vai_tro', nguoiLam: QT, doiTuong: nguoi('qt2', 'quan_tri'), vaiTroMoi: 'nguoi_xem', soChuSoHuu: 1 }))).toBe('KHONG_DU_QUYEN');
  });

  it('quản trị không nâng kế toán lên quản trị', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'doi_vai_tro', nguoiLam: QT, doiTuong: KT, vaiTroMoi: 'quan_tri', soChuSoHuu: 1 }))).toBe('KHONG_DU_QUYEN');
    expect(ma(kiemThaoTac({ thaoTac: 'doi_vai_tro', nguoiLam: QT, doiTuong: KT, vaiTroMoi: 'nguoi_duyet', soChuSoHuu: 1 }))).toBeNull();
  });

  it('không tự đổi vai trò hay tự gỡ mình', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'doi_vai_tro', nguoiLam: CHU, doiTuong: CHU, vaiTroMoi: 'nguoi_xem', soChuSoHuu: 2 }))).toBe('TU_MINH');
    expect(ma(kiemThaoTac({ thaoTac: 'go_bo', nguoiLam: CHU, doiTuong: CHU, soChuSoHuu: 2 }))).toBe('TU_MINH');
  });

  it('công ty luôn còn ít nhất một chủ sở hữu', () => {
    const chu2 = nguoi('chu2', 'chu_so_huu');
    expect(ma(kiemThaoTac({ thaoTac: 'go_bo', nguoiLam: CHU, doiTuong: chu2, soChuSoHuu: 1 }))).toBe('CHU_CUOI');
    expect(ma(kiemThaoTac({ thaoTac: 'doi_vai_tro', nguoiLam: CHU, doiTuong: chu2, vaiTroMoi: 'quan_tri', soChuSoHuu: 1 }))).toBe('CHU_CUOI');
    expect(ma(kiemThaoTac({ thaoTac: 'go_bo', nguoiLam: CHU, doiTuong: chu2, soChuSoHuu: 2 }))).toBeNull();
  });

  it('người không phải thành viên thì không đổi, không gỡ được', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'go_bo', nguoiLam: CHU, doiTuong: null, soChuSoHuu: 1 }))).toBe('KHONG_THAY');
  });
});

describe('rời công ty', () => {
  it('ai cũng rời được, trừ chủ sở hữu duy nhất', () => {
    expect(ma(kiemThaoTac({ thaoTac: 'roi', nguoiLam: KT, doiTuong: null, soChuSoHuu: 1 }))).toBeNull();
    expect(ma(kiemThaoTac({ thaoTac: 'roi', nguoiLam: CHU, doiTuong: null, soChuSoHuu: 1 }))).toBe('CHU_CUOI');
    expect(ma(kiemThaoTac({ thaoTac: 'roi', nguoiLam: CHU, doiTuong: null, soChuSoHuu: 2 }))).toBeNull();
  });
});

describe('email', () => {
  it('chuẩn hoá và kiểm dạng', () => {
    expect(chuanEmail('  KeToan@ThinhPhat.VN ')).toBe('ketoan@thinhphat.vn');
    expect(laEmail('ketoan@thinhphat.vn')).toBe(true);
    expect(laEmail('ketoan@thinhphat')).toBe(false);
  });
});
