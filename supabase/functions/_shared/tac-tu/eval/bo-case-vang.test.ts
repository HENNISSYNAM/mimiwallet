import { describe, expect, it } from 'vitest';
import { MA_LY_DO } from '../chinh-sach';
import { BO_CASE_VANG, TEN_NHOM_CASE } from './bo-case-vang';
import { chayBoCase, chayMotCase } from './chay-eval';

/**
 * Bộ case vàng phải đạt 100%. Case trượt không được sửa kỳ vọng cho khớp — xem
 * ghi chú đầu `bo-case-vang.ts`.
 */
describe('bộ case vàng — bộ luật chi của agent', () => {
  it.each(BO_CASE_VANG.map((c) => [c.id, c.moTa, c] as const))('%s · %s', (_id, _mo, c) => {
    const k = chayMotCase(c);
    expect(k.loi, `${c.id}: ${k.loi.join('; ')} (mã thực tế: ${k.maThucTe.join(', ')})`).toEqual([]);
  });
});

describe('vệ sinh bộ case', () => {
  it('mã case không trùng', () => {
    const ids = BO_CASE_VANG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mỗi nhóm có ít nhất 5 case', () => {
    for (const nhom of Object.keys(TEN_NHOM_CASE)) {
      expect(BO_CASE_VANG.filter((c) => c.nhom === nhom).length, nhom).toBeGreaterThanOrEqual(5);
    }
  });

  it('mọi case ghi nguồn và có kỳ vọng rõ', () => {
    for (const c of BO_CASE_VANG) {
      expect(c.nguon.length, c.id).toBeGreaterThan(2);
      expect(c.moTa.length, c.id).toBeGreaterThan(8);
    }
  });

  it('độ phủ: mọi mã lý do của bộ luật đều có case chạm tới', () => {
    const b = chayBoCase();
    expect(b.maChuaPhu, `chưa phủ: ${b.maChuaPhu.join(', ')} / tổng ${MA_LY_DO.length}`).toEqual([]);
  });

  /*
   * KIỂM NGƯỜI KIỂM. Bộ chấm đạt 100% chỉ có nghĩa nếu nó biết trượt. Ba case cố
   * ý sai dưới đây phải bị chấm trượt — nếu bộ chấm cho qua, 100% ở trên là vô nghĩa.
   */
  it('bộ chấm phát hiện được kỳ vọng sai', () => {
    const sai = [
      { ...BO_CASE_VANG[0], kyVong: { ketQua: 'tu_choi' as const } },
      { ...BO_CASE_VANG[0], kyVong: { ketQua: 'tu_dong_duyet' as const, phaiCo: ['VUOT_TAN_SUAT' as const] } },
      { ...BO_CASE_VANG[0], kyVong: { ketQua: 'tu_dong_duyet' as const, khongDuocCo: ['TRONG_CHINH_SACH' as const] } },
    ];
    for (const c of sai) expect(chayMotCase(c).dat).toBe(false);
  });

  it('bảng điểm tổng 100%', () => {
    const b = chayBoCase();
    expect(b.dat).toBe(b.tong);
  });
});
