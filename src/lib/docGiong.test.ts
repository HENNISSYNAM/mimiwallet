import { describe, expect, it } from 'vitest';
import { catDoan, chonGiongViet, lamSachDeDoc } from './docGiong';

const g = (name: string, lang: string, localService = true) => ({ name, lang, localService });

describe('chọn giọng', () => {
  it('ưu tiên vi-VN, rồi giọng Google', () => {
    const ds = [g('Samantha', 'en-US'), g('Microsoft An', 'vi-VN'), g('Google Tiếng Việt', 'vi-VN', false), g('Linh', 'vi')];
    expect(chonGiongViet(ds)?.name).toBe('Google Tiếng Việt');
  });
  it('nhận cả dạng vi_VN', () => expect(chonGiongViet([g('X', 'vi_VN')])?.name).toBe('X'));
  it('không có giọng tiếng Việt → null, KHÔNG rơi về giọng tiếng Anh', () => {
    expect(chonGiongViet([g('Samantha', 'en-US'), g('Google US English', 'en-US')])).toBeNull();
  });
});

describe('làm sạch trước khi đọc', () => {
  it('bỏ định dạng, đường dẫn, biểu tượng; đọc ₫ thành đồng', () => {
    expect(lamSachDeDoc('**Tiền vào** 3.000.000 ₫ 🎉 xem [đây](https://x.vn) https://mimi.vn/a'))
      .toBe('Tiền vào 3.000.000 đồng xem đây');
  });
});

describe('cắt đoạn', () => {
  it('mỗi đoạn không quá giới hạn, không mất chữ', () => {
    const s = 'Câu một ngắn. ' + 'dài '.repeat(80) + '. Câu cuối!';
    const ds = catDoan(s, 50);
    expect(ds.every((d) => d.length <= 50)).toBe(true);
    expect(ds.join(' ').replace(/\s+/g, ' ')).toBe(s.replace(/\s+/g, ' ').trim());
  });
  it('câu ngắn gộp chung một đoạn', () => {
    expect(catDoan('A. B. C.', 180)).toEqual(['A. B. C.']);
  });
});
