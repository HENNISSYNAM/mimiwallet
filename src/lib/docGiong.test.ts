import { afterEach, describe, expect, it, vi } from 'vitest';
import { catDoan, chonGiongViet, coHoTro, docGiong, lamSachDeDoc } from './docGiong';

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

describe('đọc thành tiếng khi bộ đọc của trình duyệt không có hoặc biến mất', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('khoá speechSynthesis còn nhưng giá trị undefined → coi là không hỗ trợ, không ném lỗi', async () => {
    vi.stubGlobal('speechSynthesis', undefined);
    expect(coHoTro()).toBe(false);
    await expect(docGiong('Xin chào')).resolves.toBe('khong_ho_tro');
  });

  it('bộ đọc mất TRONG LÚC chờ nạp danh sách giọng → trả khong_ho_tro, không gọi cancel trên undefined', async () => {
    vi.useFakeTimers();
    let lan = 0;
    const ss = {
      // Lần đầu chưa có giọng (phải chờ); lần sau trả giọng tiếng Việt — và đúng lúc đó bộ đọc bị gỡ.
      getVoices: () => {
        if (lan++ === 0) return [];
        vi.stubGlobal('speechSynthesis', undefined);
        return [{ name: 'An', lang: 'vi-VN', localService: true }] as SpeechSynthesisVoice[];
      },
      addEventListener: () => {}, cancel: vi.fn(), speak: vi.fn(),
    };
    vi.stubGlobal('speechSynthesis', ss);
    vi.stubGlobal('SpeechSynthesisUtterance', function U() {});
    const p = docGiong('Xin chào');
    await vi.advanceTimersByTimeAsync(1600);
    await expect(p).resolves.toBe('khong_ho_tro');
    expect(ss.cancel).not.toHaveBeenCalled();
  });
});
