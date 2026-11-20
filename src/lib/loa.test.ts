import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chonGiongViet, datLoa, loaDangTat, noi } from './loa';

const giong = (lang: string, name: string, localService = false) => ({ lang, name, localService }) as SpeechSynthesisVoice;

describe('chonGiongViet', () => {
  it('ưu tiên giọng tiếng Việt chạy trên máy', () => {
    const g = chonGiongViet([giong('en-US', 'A', true), giong('vi-VN', 'Google tiếng Việt'), giong('vi_VN', 'Linh', true)]);
    expect(g?.name).toBe('Linh');
  });
  it('không có giọng Việt → null (không đọc bằng giọng Anh)', () => {
    expect(chonGiongViet([giong('en-US', 'A', true)])).toBeNull();
  });
});

describe('noi', () => {
  const speak = vi.fn();
  const cancel = vi.fn();
  let voices: SpeechSynthesisVoice[] = [];
  beforeEach(() => {
    speak.mockReset(); cancel.mockReset();
    voices = [giong('vi-VN', 'Linh', true)];
    vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => voices });
    vi.stubGlobal('SpeechSynthesisUtterance', class { text: string; voice: unknown; lang = ''; rate = 1; volume = 1; constructor(t: string) { this.text = t; } });
    datLoa(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('đọc bằng giọng Việt, cắt câu cũ', () => {
    expect(noi('Đã nhận một trăm nghìn.')).toBe(true);
    expect(cancel).toHaveBeenCalled();
    expect(speak.mock.calls[0][0].text).toBe('Đã nhận một trăm nghìn.');
    expect(speak.mock.calls[0][0].lang).toBe('vi-VN');
  });
  it('tắt loa → không đọc, nhớ trạng thái', () => {
    datLoa(false);
    expect(loaDangTat()).toBe(true);
    expect(noi('x')).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });
  it('máy không có giọng Việt → không đọc', () => {
    voices = [giong('en-US', 'A', true)];
    expect(noi('x')).toBe(false);
  });
});
