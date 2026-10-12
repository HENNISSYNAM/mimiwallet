import { describe, expect, it } from 'vitest';
import { docNganhVsic, goiYNhomChoHoSo, goiYNhomTuVsic } from './nganh-vsic';
import { NHOM_NGANH } from './he-luat';

describe('khai ngành VSIC cấp 4', () => {
  it('mã đúng 4 chữ số, có tên, không trùng; ngành chính phải nằm trong danh sách', () => {
    expect(docNganhVsic([{ ma: '4711', ten: '  Bán lẻ   tổng hợp ' }], null)).toEqual({ ok: true, nganh: [{ ma: '4711', ten: 'Bán lẻ tổng hợp' }], nganh_chinh: '4711' });
    expect(docNganhVsic([], null)).toEqual({ ok: true, nganh: [], nganh_chinh: null });
    expect(docNganhVsic([{ ma: '471', ten: 'Bán lẻ' }], null).ok).toBe(false);
    expect(docNganhVsic([{ ma: '4711', ten: '' }], null).ok).toBe(false);
    expect(docNganhVsic([{ ma: '4711', ten: 'A1' }, { ma: '4711', ten: 'A2' }], null).ok).toBe(false);
    expect(docNganhVsic([{ ma: '4711', ten: 'Bán lẻ' }], '5610').ok).toBe(false);
    expect(docNganhVsic('4711', null).ok).toBe(false);
  });
});

describe('gợi ý nhóm hoạt động — chỉ khi mã chỉ ra một nhóm rõ ràng', () => {
  it('ngành rõ ràng → đúng nhóm trong bộ mã của hệ luật', () => {
    expect(goiYNhomTuVsic('1071').nhom).toBe('san_xuat_van_tai');
    expect(goiYNhomTuVsic('4711').nhom).toBe('phan_phoi_hang_hoa');
    expect(goiYNhomTuVsic('4933').nhom).toBe('san_xuat_van_tai');
    expect(goiYNhomTuVsic('5510').nhom).toBe('dich_vu');
    expect(goiYNhomTuVsic('5610').nhom).toBe('san_xuat_van_tai');
    expect(goiYNhomTuVsic('7730').nhom).toBe('cho_thue_tai_san');
    expect(goiYNhomTuVsic('9631').nhom).toBe('dich_vu');
    for (const m of ['1071', '4711', '5510', '7730']) expect(NHOM_NGANH).toContain(goiYNhomTuVsic(m).nhom);
  });

  it('ngành có thể rơi vào hai nhóm hoặc chưa có căn cứ → KHÔNG gợi ý, nói vì sao', () => {
    for (const m of ['4100', '4330', '4520', '4610', '6810', '7310', '6201', '0111']) {
      const g = goiYNhomTuVsic(m);
      expect(g.nhom, m).toBeNull();
      expect(g.vi_sao.length).toBeGreaterThan(10);
    }
  });

  it('gợi ý luôn nhắc người dùng xác nhận; đã có nhóm thì đánh dấu da_co', () => {
    expect(goiYNhomTuVsic('4711').vi_sao).toContain('xác nhận');
    expect(goiYNhomChoHoSo('4711', ['phan_phoi_hang_hoa'])?.da_co).toBe(true);
    expect(goiYNhomChoHoSo(null, [])).toBeNull();
  });
});
