import { describe, expect, it } from 'vitest';
import { hoSoTheoMst } from './ho-so-mst';
import { hoSoCongTy } from '../luat/doc-su-kien';

/*
 * Bản ghi theo hình dữ liệu thật của `tra-cuu.test.ts` (Vinamilk, công khai). Bản ghi chi nhánh và hộ
 * kinh doanh là dựng theo hình, không phải của ai.
 */
const TRA = (p: Record<string, unknown> = {}) => hoSoCongTy('c1', {
  tax_id: '0300588569', name: 'Sữa', ten_theo_mst: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM', dia_chi_theo_mst: '10 Tân Trào, Phường Tân Mỹ, TP Hồ Chí Minh',
  co_quan_thue: 'Chi cục Thuế Doanh nghiệp lớn', loai_theo_mst: 'doanh_nghiep', trang_thai_mst: 'NNT đang hoạt động', mst_tra_luc: '2026-09-24T00:00:00Z', ...p,
});

describe('hồ sơ theo mã số thuế — suy đủ, không suy quá', () => {
  it('doanh nghiệp đã tra: loại, trạng thái, cơ quan thuế quản lý, tỉnh — mỗi dòng có nguồn và vì sao', () => {
    const h = hoSoTheoMst(TRA());
    expect(h).toMatchObject({
      mst: '0300588569', loai: 'doanh_nghiep', don_vi_truc_thuoc: false, trang_thai: 'dang_hoat_dong',
      co_quan_thue: 'Chi cục Thuế Doanh nghiệp lớn', tinh: 'TP Hồ Chí Minh', da_tra: true, ten: 'CÔNG TY CỔ PHẦN SỮA VIỆT NAM',
    });
    expect(h.dieu_suy.map((d) => d.truong)).toEqual(['mst', 'loai', 'ten', 'trang_thai', 'co_quan_thue', 'tinh']);
    for (const d of h.dieu_suy) expect(d.vi_sao.length).toBeGreaterThan(10);
    expect(h.dieu_suy.find((d) => d.truong === 'trang_thai')?.gia_tri).toContain('"NNT đang hoạt động"');
    expect(h.dieu_suy.find((d) => d.truong === 'co_quan_thue')?.nguon).toBe('tong_cuc_thue');
  });

  it('MST có đuôi -xxx: đơn vị trực thuộc, biết mã chủ quản — suy từ hình mã số', () => {
    const h = hoSoTheoMst(TRA({ tax_id: '0300588569-001' }));
    expect(h).toMatchObject({ loai: 'don_vi_truc_thuoc', don_vi_truc_thuoc: true, mst_chu_quan: '0300588569' });
    expect(h.dieu_suy.find((d) => d.truong === 'loai')).toMatchObject({ nguon: 'hinh_ma_so' });
  });

  it('tạm ngừng / đã đóng MST đọc từ câu gốc, giữ câu gốc', () => {
    expect(hoSoTheoMst(TRA({ trang_thai_mst: 'NNT tạm ngừng kinh doanh có thời hạn' })).trang_thai).toBe('tam_ngung');
    const dong = hoSoTheoMst(TRA({ trang_thai_mst: 'NNT ngừng hoạt động và đã hoàn thành thủ tục chấm dứt hiệu lực MST' }));
    expect(dong.trang_thai).toBe('da_dong_mst');
    expect(dong.trang_thai_goc).toContain('chấm dứt hiệu lực');
  });

  it('chưa tra được: mã 12 số vẫn biết là hộ kinh doanh (theo hình mã số); không bịa trạng thái, cơ quan thuế', () => {
    const h = hoSoTheoMst(hoSoCongTy('c1', { tax_id: '079203012345', name: 'Tạp hoá' }));
    expect(h).toMatchObject({ loai: 'ho_kinh_doanh', da_tra: false, trang_thai: 'chua_ro', co_quan_thue: null, tinh: null });
    expect(h.dieu_suy.map((d) => d.truong)).toEqual(['mst', 'loai']);
    expect(h.dieu_suy.every((d) => d.nguon === 'hinh_ma_so')).toBe(true);
  });

  it('không có MST: không có dòng nào', () => {
    expect(hoSoTheoMst(hoSoCongTy('c1', { name: 'X' })).dieu_suy).toEqual([]);
  });
});
