/**
 * LOA QUẦY TIN — đọc to kết quả bằng giọng tiếng Việt của chính máy (Web Speech API). Không tải gì, không gửi gì đi.
 *
 * Máy không có giọng vi-VN: vẫn đọc bằng giọng mặc định thì nghe sai dấu — tệ hơn im lặng. Khi đó KHÔNG đọc, chỉ
 * báo `coGiongViet() === false` để giao diện hiện chữ to và nhắc một lần.
 *
 * Bật/tắt nhớ trong localStorage, bọc try/catch (chế độ riêng tư, máy POS khoá bộ nhớ vẫn chạy).
 */
const KHOA_TAT = 'mimi.loa.tat';

type Speech = Pick<SpeechSynthesis, 'speak' | 'cancel' | 'getVoices'>;

function moTa(): Speech | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

export function chonGiongViet(giong: readonly Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>[]) {
  const vi = giong.filter((g) => g.lang?.toLowerCase().replace('_', '-').startsWith('vi'));
  // Ưu tiên giọng chạy trên máy (không cần mạng), rồi giọng Google.
  return vi.find((g) => g.localService) ?? vi.find((g) => /google/i.test(g.name)) ?? vi[0] ?? null;
}

export function loaDangTat(): boolean {
  try { return localStorage.getItem(KHOA_TAT) === '1'; } catch { return false; }
}

export function datLoa(bat: boolean): void {
  try { if (bat) localStorage.removeItem(KHOA_TAT); else localStorage.setItem(KHOA_TAT, '1'); } catch { /* bỏ qua */ }
  if (!bat) moTa()?.cancel();
}

export function coGiongViet(): boolean {
  const s = moTa();
  return !!s && !!chonGiongViet(s.getVoices());
}

/**
 * Đọc một câu. `chen`: bỏ câu đang đọc dở (kết quả mới quan trọng hơn câu cũ). Trả về false nếu không đọc được.
 */
export function noi(cau: string, o: { chen?: boolean } = {}): boolean {
  const s = moTa();
  if (!s || !cau.trim() || loaDangTat()) return false;
  const giong = chonGiongViet(s.getVoices());
  if (!giong) return false;
  if (o.chen !== false) s.cancel();
  const u = new SpeechSynthesisUtterance(cau);
  u.voice = giong as SpeechSynthesisVoice;
  u.lang = giong.lang;
  u.rate = 0.95;
  u.volume = 1;
  s.speak(u);
  return true;
}

/** Danh sách giọng trên Chrome nạp trễ: gọi lại khi có. */
export function khiCoGiong(fn: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => {};
  const s = window.speechSynthesis;
  s.addEventListener?.('voiceschanged', fn);
  return () => s.removeEventListener?.('voiceschanged', fn);
}
