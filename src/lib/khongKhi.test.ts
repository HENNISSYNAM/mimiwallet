import { describe, it, expect } from 'vitest';
import { buoiCuaGio, khongKhi, type Buoi } from './khongKhi';

describe('buoiCuaGio — cắt theo nhịp sinh hoạt Việt Nam', () => {
  it('trưa là một buổi riêng, không gộp vào chiều', () => {
    // Đây là điểm khác mặc định phương Tây và là chủ ý: 11–14h là giờ nghỉ
    // trưa thật, không phải phần đầu của buổi chiều.
    expect(buoiCuaGio(11)).toBe('trua');
    expect(buoiCuaGio(13)).toBe('trua');
    expect(buoiCuaGio(14)).toBe('chieu');
  });

  it('khuya bắt đầu từ 22h, không phải nửa đêm', () => {
    expect(buoiCuaGio(21)).toBe('toi');
    expect(buoiCuaGio(22)).toBe('khuya');
    expect(buoiCuaGio(0)).toBe('khuya');
    expect(buoiCuaGio(4)).toBe('khuya');
    expect(buoiCuaGio(5)).toBe('sang');
  });

  it('phủ kín 24 giờ, không giờ nào rơi ra ngoài', () => {
    for (let g = 0; g < 24; g++) {
      expect(['khuya', 'sang', 'trua', 'chieu', 'toi']).toContain(buoiCuaGio(g));
    }
  });

  it('không nhảy buổi giữa chừng — mỗi buổi là một đoạn liền', () => {
    // Nếu ai chỉnh mốc giờ mà làm vỡ tính liền đoạn, nền sẽ nhấp nháy qua lại
    // giữa hai cảnh trong cùng một buổi. Test này bắt đúng chuyện đó.
    const chuoi: Buoi[] = [];
    for (let g = 5; g < 29; g++) chuoi.push(buoiCuaGio(g % 24));
    const doan = chuoi.filter((b, i) => i === 0 || b !== chuoi[i - 1]);
    expect(new Set(doan).size).toBe(doan.length);
  });
});

describe('khongKhi — mỗi buổi có đủ một khung cảnh', () => {
  it('mọi giờ đều trả về gradient, pose và câu', () => {
    for (let g = 0; g < 24; g++) {
      const k = khongKhi(new Date(2026, 8, 4, g, 0, 0));
      expect(k.troi).toContain('gradient');
      expect(k.pose).toBeTruthy();
      expect(k.cau.length).toBeGreaterThan(0);
    }
  });

  it('khuya và tối là nền tối, ban ngày là nền sáng', () => {
    // `toi` quyết định màu chữ bên trên. Sai cờ này là chữ trắng trên nền trắng.
    expect(khongKhi(new Date(2026, 8, 4, 23)).toi).toBe(true);
    expect(khongKhi(new Date(2026, 8, 4, 20)).toi).toBe(true);
    expect(khongKhi(new Date(2026, 8, 4, 9)).toi).toBe(false);
    expect(khongKhi(new Date(2026, 8, 4, 12)).toi).toBe(false);
    expect(khongKhi(new Date(2026, 8, 4, 16)).toi).toBe(false);
  });

  it('khuya thì MIMI ngủ — dùng đúng pose lâu nay nằm không', () => {
    expect(khongKhi(new Date(2026, 8, 4, 2)).pose).toBe('sleep');
    expect(khongKhi(new Date(2026, 8, 4, 7)).pose).toBe('stretch');
    expect(khongKhi(new Date(2026, 8, 4, 12)).pose).toBe('sit');
  });
});
