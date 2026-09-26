import { describe, expect, it } from 'vitest';
import { khoaNguoiGoi, kiemYeuCauTrungGian, safeEqual } from './trung-gian';
import { chonCongMoHinh } from './nha-cung-cap';

const K = 'a'.repeat(48);
const URL_TG = 'https://onhkrgmhltrhhmabzgzn.supabase.co/functions/v1/ai-trung-gian';

describe('trung gian Lovable AI — lọc yêu cầu', () => {
  it('chỉ chuyển tiếp các trường cần thiết, ép không stream', () => {
    const k = kiemYeuCauTrungGian({ model: 'google/gemini-3-flash-preview', messages: [{ role: 'user', content: 'x' }], stream: true, user: 'lộ', extra_headers: { a: 1 } });
    expect(k.ok).toBe(true);
    if (k.ok) expect(k.body).toEqual({ model: 'google/gemini-3-flash-preview', messages: [{ role: 'user', content: 'x' }], stream: false });
  });
  it('từ chối mô hình ngoài danh sách, tin nhắn sai, không phải đối tượng', () => {
    expect(kiemYeuCauTrungGian({ model: 'anthropic/claude-x', messages: [{ role: 'user' }] }).ok).toBe(false);
    expect(kiemYeuCauTrungGian({ model: 'google/gemini-2.5-flash', messages: [] }).ok).toBe(false);
    expect(kiemYeuCauTrungGian({ model: 'google/gemini-2.5-flash', messages: [{ content: 'thiếu role' }] }).ok).toBe(false);
    expect(kiemYeuCauTrungGian([1, 2]).ok).toBe(false);
    expect(kiemYeuCauTrungGian({ model: 'google/gemini-2.5-flash', messages: Array(61).fill({ role: 'user' }) }).ok).toBe(false);
  });
  it('so khoá thời gian không đổi; đọc Bearer', () => {
    expect(safeEqual(K, K)).toBe(true);
    expect(safeEqual(K, `${K}x`)).toBe(false);
    expect(safeEqual(K, 'b'.repeat(48))).toBe(false);
    expect(khoaNguoiGoi(`Bearer ${K}`)).toBe(K);
    expect(khoaNguoiGoi(null)).toBe('');
  });
});

describe('chọn cổng: Lovable trực tiếp → trung gian Lovable → OpenRouter', () => {
  it('có trung gian hợp lệ → dùng trung gian dù có OpenRouter', () => {
    const c = chonCongMoHinh({ trungGianUrl: URL_TG, trungGianKhoa: K, openrouter: 'or' })!;
    expect(c.ten).toBe('lovable_trung_gian');
    expect(c.url).toBe(URL_TG);
    expect(c.mo_hinh).toMatch(/^google\/gemini-/);
  });
  it('trung gian thiếu khoá, khoá ngắn, hay địa chỉ lạ → bỏ qua, xuống OpenRouter', () => {
    expect(chonCongMoHinh({ trungGianUrl: URL_TG, openrouter: 'or' })!.ten).toBe('openrouter');
    expect(chonCongMoHinh({ trungGianUrl: URL_TG, trungGianKhoa: 'ngan', openrouter: 'or' })!.ten).toBe('openrouter');
    expect(chonCongMoHinh({ trungGianUrl: 'https://evil.example.com/functions/v1/ai-trung-gian', trungGianKhoa: K, openrouter: 'or' })!.ten).toBe('openrouter');
    expect(chonCongMoHinh({ trungGianUrl: 'http://onhkrgmhltrhhmabzgzn.supabase.co/functions/v1/ai-trung-gian', trungGianKhoa: K })).toBeNull();
  });
  it('khoá Lovable trực tiếp vẫn đứng đầu', () => {
    expect(chonCongMoHinh({ lovable: 'lv', trungGianUrl: URL_TG, trungGianKhoa: K })!.ten).toBe('lovable');
  });
});
