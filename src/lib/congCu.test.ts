import { describe, expect, it } from 'vitest';
import { CONG_CU_MAC_DINH, CONG_CU_THEO_KHOA, DANH_MUC_CONG_CU, duongDanCongCu, SO_CONG_CU_TOI_DA, timCongCu } from './congCu';
import { nhanYDinh } from '../../supabase/functions/_shared/tro-ly/y-dinh';

const TRANG_CO_THAT = new Set([
  '/dashboard', '/dashboard/thu-vien', '/dashboard/chung-tu', '/dashboard/nhac-thue', '/dashboard/reports', '/dashboard/fintech',
  '/dashboard/tac-tu', '/dashboard/chinh-sach', '/dashboard/chi-phi-ai', '/dashboard/invoices', '/dashboard/clients',
]);

describe('danh mục công cụ', () => {
  it('không có công cụ giả: trang phải có thật, câu hỏi phải được trợ lý hiểu', () => {
    for (const c of DANH_MUC_CONG_CU) {
      expect(c.khoa).toMatch(/^[a-z0-9_]{2,40}$/);
      if (c.loai === 'trang') expect(TRANG_CO_THAT.has(c.dich), c.khoa).toBe(true);
      else expect(nhanYDinh(c.dich).length, c.dich).toBeGreaterThan(0);
    }
  });

  it('khoá không trùng; bộ mặc định đều có trong danh mục và không quá giới hạn', () => {
    expect(new Set(DANH_MUC_CONG_CU.map((c) => c.khoa)).size).toBe(DANH_MUC_CONG_CU.length);
    expect(CONG_CU_MAC_DINH.every((k) => CONG_CU_THEO_KHOA[k])).toBe(true);
    expect(CONG_CU_MAC_DINH.length).toBeLessThanOrEqual(SO_CONG_CU_TOI_DA);
  });

  it('tìm không dấu, nhiều từ, theo cả từ khoá', () => {
    expect(timCongCu('hoá đơn').map((c) => c.khoa)).toContain('thu_vien');
    expect(timCongCu('tờ khai').map((c) => c.khoa)).toEqual(['nhac_thue']);
    expect(timCongCu('claude').map((c) => c.khoa)).toEqual(['chi_phi_ai']);
    expect(timCongCu('không có gì như vầy')).toEqual([]);
    expect(timCongCu('  ')).toHaveLength(DANH_MUC_CONG_CU.length);
  });

  it('công cụ câu hỏi mở trợ lý với câu hỏi đã mã hoá', () => {
    expect(duongDanCongCu(CONG_CU_THEO_KHOA.doi_soat)).toBe(`/dashboard/tro-ly?hoi=${encodeURIComponent('Tiền về tháng này khớp hoá đơn nào?')}`);
    expect(duongDanCongCu(CONG_CU_THEO_KHOA.thu_vien)).toBe('/dashboard/thu-vien');
  });
});
