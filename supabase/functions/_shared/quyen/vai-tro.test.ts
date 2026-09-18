import { describe, expect, it } from 'vitest';
import { cauTuChoi, duocLam, HANH_DONG, MUC_DO, QUYEN, VAI_TRO, type HanhDong, type VaiTro } from './vai-tro';

/** MIMI-P1-003 — ma trận quyền: mỗi ô là một quyết định, nên mỗi ô phải có test. */

const BANG: Record<VaiTro, HanhDong[]> = {
  chu_so_huu: [...HANH_DONG],
  quan_tri: HANH_DONG.filter((h) => h !== 'xoa_cong_ty'),
  nguoi_duyet: ['xem', 'hoi_tro_ly', 'tao_yeu_cau_chi', 'duyet_chi', 'huy_yeu_cau'],
  ke_toan: ['xem', 'hoi_tro_ly', 'ghi_chung_tu', 'soan_to_khai', 'sua_ho_so_thue', 'tao_yeu_cau_chi', 'huy_yeu_cau', 'dong_bo_du_lieu'],
  nguoi_xem: ['xem', 'hoi_tro_ly'],
};

describe('ma trận quyền', () => {
  for (const vai of VAI_TRO) {
    it(`${vai}: đúng những việc được phép, không hơn`, () => {
      const duoc = HANH_DONG.filter((h) => duocLam(vai, h));
      expect([...duoc].sort()).toEqual([...BANG[vai]].sort());
    });
  }

  it('không có vai trò (chưa là thành viên) thì không được làm gì, kể cả xem', () => {
    for (const h of HANH_DONG) {
      expect(duocLam(null, h)).toBe(false);
      expect(duocLam(undefined, h)).toBe(false);
      expect(duocLam('admin' as VaiTro, h)).toBe(false);
    }
  });

  it('người xem không duyệt chi, không đổi kết nối, không cấp khoá agent', () => {
    for (const h of ['duyet_chi', 'noi_ngan_hang', 'cap_khoa_agent', 'quan_ly_thanh_vien'] as HanhDong[]) {
      expect(duocLam('nguoi_xem', h), h).toBe(false);
    }
  });

  it('kế toán không duyệt chi; người duyệt không sửa hồ sơ thuế', () => {
    expect(duocLam('ke_toan', 'duyet_chi')).toBe(false);
    expect(duocLam('nguoi_duyet', 'sua_ho_so_thue')).toBe(false);
    expect(duocLam('nguoi_duyet', 'ghi_chung_tu')).toBe(false);
  });

  it('chỉ chủ doanh nghiệp xoá được công ty', () => {
    expect(QUYEN.xoa_cong_ty).toEqual(['chu_so_huu']);
  });

  it('mọi hành động đều được phân loại mức độ, và việc chạm tiền là sensitive', () => {
    for (const h of HANH_DONG) expect(MUC_DO[h], h).toBeTruthy();
    expect(MUC_DO.duyet_chi).toBe('sensitive');
    expect(MUC_DO.cap_khoa_agent).toBe('sensitive');
    expect(MUC_DO.soan_to_khai).toBe('regulated');
  });

  it('câu từ chối nói rõ vai trò hiện tại và ai làm được', () => {
    const cau = cauTuChoi('nguoi_xem', 'duyet_chi');
    expect(cau).toContain('Người xem');
    expect(cau).toContain('Người duyệt chi');
  });
});
