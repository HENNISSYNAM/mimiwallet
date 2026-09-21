import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { congCuGoiY, CONG_CU_MAC_DINH, CONG_CU_THEO_KHOA, DANH_MUC_CONG_CU, duongDanCongCu, SO_CONG_CU_TOI_DA, timCongCu } from './congCu';
import { nhanYDinh } from '../../supabase/functions/_shared/tro-ly/y-dinh';

/**
 * Trang có thật = route con của `/dashboard` khai trong `App.tsx`. Đọc thẳng từ router thay
 * vì chép tay: danh sách chép tay đỏ mỗi lần thêm trang thật, và xanh mãi nếu ai đó xoá route
 * mà quên sửa danh sách.
 */
const APP = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
const TRANG_CO_THAT = new Set([
  '/dashboard',
  ...[...APP.matchAll(/<Route path="([a-z0-9-]+)"/g)].map((m) => `/dashboard/${m[1]}`),
]);

describe('danh mục công cụ', () => {
  it('không có công cụ giả: trang phải có thật, câu hỏi phải được trợ lý hiểu', () => {
    // Chốt bộ đọc route: đọc hỏng thì mọi công cụ "trang" đều đỏ, không xanh giả.
    expect(TRANG_CO_THAT.has('/dashboard/tac-tu')).toBe(true);
    expect(TRANG_CO_THAT.has('/dashboard/khong-co-that')).toBe(false);
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
    expect(timCongCu('hoá đơn').map((c) => c.khoa)).toContain('thieu_chung_tu');
    expect(timCongCu('tờ khai').map((c) => c.khoa)).toEqual(['soan_to_khai']);
    expect(timCongCu('claude').map((c) => c.khoa)).toEqual(['chi_phi_ai']);
    expect(timCongCu('không có gì như vầy')).toEqual([]);
    expect(timCongCu('  ')).toHaveLength(DANH_MUC_CONG_CU.length);
  });

  it('công cụ câu hỏi mở trợ lý với câu hỏi đã mã hoá', () => {
    expect(duongDanCongCu(CONG_CU_THEO_KHOA.model_re_hon)).toBe(`/dashboard/tro-ly?hoi=${encodeURIComponent('Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.')}`);
    expect(duongDanCongCu(CONG_CU_THEO_KHOA.thieu_chung_tu)).toBe('/dashboard/chung-tu');
  });

  it('đã bỏ công cụ trùng trang trợ lý và công cụ không chạy được', () => {
    for (const k of ['doi_soat', 'duyet_chi', 'cong_no', 'dong_tien', 'tra_trung']) {
      expect(CONG_CU_THEO_KHOA[k], k).toBeUndefined();
      expect(CONG_CU_MAC_DINH).not.toContain(k);
    }
  });

  it('không công cụ nào trùng mục chính của thanh điều hướng', () => {
    const mucChinh = ['/dashboard/tro-ly', '/dashboard/thu-vien', '/dashboard/nhac-thue', '/dashboard/ket-noi', '/dashboard'];
    expect(DANH_MUC_CONG_CU.filter((c) => c.loai === 'trang' && mucChinh.includes(c.dich))).toEqual([]);
  });

  it('gợi ý công cụ theo khảo sát: đúng ngành, chỉ công cụ có thật, tối đa 6', () => {
    const ho = congCuGoiY({ loai_nguoi_nop: 'ho_kinh_doanh', nhom_nganh: ['noi_dung_so'], kenh: 'tmdt_khong_thanh_toan', nganh_dac_thu: 'khong' });
    expect(ho).toEqual(['soan_to_khai', 'thieu_chung_tu', 'lien_ket_ngan_hang', 'chi_phi_ai', 'model_re_hon']);
    const dn = congCuGoiY({ loai_nguoi_nop: 'doanh_nghiep', nhom_nganh: ['dich_vu'], kenh: null, nganh_dac_thu: null });
    expect(dn).toEqual(['soan_to_khai', 'thieu_chung_tu', 'hoa_don_ban', 'khach_hang', 'chinh_sach_chi', 'kiem_soat_agent']);
    const nhieu = congCuGoiY({ loai_nguoi_nop: 'doanh_nghiep', nhom_nganh: ['noi_dung_so', 'dich_vu', 'khac'], kenh: 'tmdt_co_thanh_toan', nganh_dac_thu: 'cho_thue_bat_dong_san' });
    expect(nhieu.length).toBe(6);
    for (const k of nhieu) expect(CONG_CU_THEO_KHOA[k], k).toBeTruthy();
  });
});
