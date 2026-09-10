import { describe, expect, it } from 'vitest';
import { provinces } from './danhMucHanhChinh';

describe('danh mục tỉnh, thành sau sắp xếp 2025', () => {
  it('đúng 34 đơn vị, không trùng', () => {
    expect(provinces).toHaveLength(34);
    expect(new Set(provinces).size).toBe(34);
  });

  it('không còn tên tỉnh đã sáp nhập', () => {
    for (const cu of ['Bình Dương', 'Vĩnh Phúc', 'Bà Rịa - Vũng Tàu', 'Hà Giang', 'Bắc Giang', 'Thừa Thiên Huế']) {
      expect(provinces).not.toContain(cu);
    }
  });
});
