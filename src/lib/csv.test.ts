import { describe, expect, it } from 'vitest';
import { lapCsv, oCsv } from './csv';

describe('xuất CSV', () => {
  it('dấu phẩy, ngoặc kép, xuống dòng không làm lệch cột', () => {
    expect(oCsv('Công ty A, chi nhánh 2')).toBe('"Công ty A, chi nhánh 2"');
    expect(oCsv('Nói "chào"')).toBe('"Nói ""chào"""');
    expect(oCsv('dòng 1\ndòng 2')).toBe('"dòng 1\ndòng 2"');
  });

  it('chặn CSV injection: ô bắt đầu bằng = + - @ không thành công thức', () => {
    for (const x of ['=HYPERLINK("http://x")', '+1+1', '-2+3', '@SUM(A1)']) {
      expect(oCsv(x).replace(/^"/, '').startsWith("'")).toBe(true);
    }
  });

  it('số giữ nguyên để bảng tính cộng được; rỗng là ô trống', () => {
    expect(oCsv(3_000_000)).toBe('3000000');
    expect(oCsv(-500)).toBe('-500');
    expect(oCsv(null)).toBe('');
  });

  it('có BOM cho Excel đọc đúng tiếng Việt', () => {
    expect(lapCsv(['a'], [[1]]).charCodeAt(0)).toBe(0xfeff);
  });
});
