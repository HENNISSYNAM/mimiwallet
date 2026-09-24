import { describe, expect, it } from 'vitest';
import { MST_HOP_LE, chuanHoaMst } from './maSoThue';

/**
 * Quy tắc này trước nằm hai nơi dưới hai bản chép. Test ở đây để hai màn hình
 * — thẻ chào mừng và trang Cài đặt — không bao giờ nhận hai tập chuỗi khác nhau
 * cho cùng một người dùng.
 */
describe('mã số thuế', () => {
  it('nhận 10 chữ số', () => {
    expect(MST_HOP_LE('0312345678')).toBe(true);
  });

  it('nhận 10 chữ số kèm 3 số đơn vị trực thuộc', () => {
    expect(MST_HOP_LE('0312345678-001')).toBe(true);
  });

  // Hộ kinh doanh: số định danh cá nhân thay mã số thuế từ 01/07/2025.
  it('nhận 12 chữ số của hộ kinh doanh, cá nhân', () => {
    expect(MST_HOP_LE('079203012345')).toBe(true);
    expect(MST_HOP_LE('07920301234')).toBe(false);
    expect(MST_HOP_LE('0792030123456')).toBe(false);
  });

  it('bỏ qua khoảng trắng người dùng gõ thừa', () => {
    expect(MST_HOP_LE(' 0312345678 ')).toBe(true);
    expect(chuanHoaMst(' 0312345678 ')).toBe('0312345678');
  });

  it('từ chối độ dài sai', () => {
    expect(MST_HOP_LE('031234567')).toBe(false);
    expect(MST_HOP_LE('03123456789')).toBe(false);
    expect(MST_HOP_LE('0312345678-01')).toBe(false);
  });

  it('từ chối chữ cái và chuỗi rỗng', () => {
    expect(MST_HOP_LE('031234567A')).toBe(false);
    expect(MST_HOP_LE('')).toBe(false);
  });

  it('giữ nguyên dấu gạch của phần chi nhánh khi chuẩn hoá', () => {
    // Bỏ dấu gạch thì thành 13 chữ số liền — một mã khác hẳn.
    expect(chuanHoaMst('0312345678-001')).toBe('0312345678-001');
  });
});
