/**
 * MIMI đọc câu trả lời bằng GIỌNG CÓ SẴN CỦA TRÌNH DUYỆT (Web Speech API) — 26/09/2026.
 *
 * Thay cho ElevenLabs: không tốn tiền, không cần khoá, không có máy chủ nào để bot tấn công, và câu trả
 * lời (có số tiền của công ty) không rời khỏi máy người dùng. Đổi lại giọng kém tự nhiên hơn và tuỳ máy:
 * Android có Google Tiếng Việt, iPhone/Mac có "Linh", Windows cần cài gói giọng tiếng Việt.
 *
 * KHÔNG ĐỌC BẰNG GIỌNG TIẾNG ANH. Máy không có giọng tiếng Việt thì nói rõ cho người dùng, vì giọng tiếng
 * Anh đọc tiếng Việt thành chuỗi âm vô nghĩa — tệ hơn không đọc.
 */

export interface GiongTL { name: string; lang: string; localService: boolean }

/** Chọn giọng tiếng Việt: đúng vi-VN trước, giọng Google (tự nhiên hơn) trước giọng hệ điều hành. */
export function chonGiongViet<T extends GiongTL>(ds: readonly T[]): T | null {
  const viet = ds.filter((g) => g.lang.toLowerCase().replace('_', '-').startsWith('vi'));
  if (!viet.length) return null;
  const diem = (g: GiongTL) => (g.lang.toLowerCase().replace('_', '-') === 'vi-vn' ? 2 : 0) + (/google/i.test(g.name) ? 1 : 0);
  return [...viet].sort((a, b) => diem(b) - diem(a))[0];
}

/** Bỏ ký hiệu định dạng, đường dẫn, biểu tượng; đọc "₫" thành "đồng". */
export function lamSachDeDoc(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_#`>|~]/g, ' ')
    .replace(/\s*₫/g, ' đồng')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cắt thành đoạn ≤ `toiDa` ký tự theo câu: Chrome tự dừng khi một câu đọc quá ~15 giây, nên đọc từng
 * đoạn ngắn nối tiếp nhau.
 */
export function catDoan(s: string, toiDa = 180): string[] {
  const cau = s.match(/[^.!?;:\n]+[.!?;:]?/g) ?? [];
  const ra: string[] = [];
  let hienTai = '';
  for (const c of cau.map((x) => x.trim()).filter(Boolean)) {
    if (c.length > toiDa) {
      if (hienTai) { ra.push(hienTai); hienTai = ''; }
      const tu = c.split(' ');
      let manh = '';
      for (const w of tu) {
        if ((manh + ' ' + w).trim().length > toiDa) { ra.push(manh.trim()); manh = w; } else manh = `${manh} ${w}`;
      }
      if (manh.trim()) ra.push(manh.trim());
    } else if ((hienTai + ' ' + c).trim().length > toiDa) {
      ra.push(hienTai.trim());
      hienTai = c;
    } else hienTai = `${hienTai} ${c}`.trim();
  }
  if (hienTai) ra.push(hienTai);
  return ra;
}

export type KetQuaDoc = 'xong' | 'da_dung' | 'khong_ho_tro' | 'khong_co_giong_viet';

export const coHoTro = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** Danh sách giọng nạp chậm trên Chrome: chờ `voiceschanged`, tối đa 1,5 giây. */
function docGiongCoSan(): Promise<SpeechSynthesisVoice[]> {
  const ss = window.speechSynthesis;
  const co = ss.getVoices();
  if (co.length) return Promise.resolve(co);
  return new Promise((xong) => {
    const t = setTimeout(() => xong(ss.getVoices()), 1500);
    ss.addEventListener('voiceschanged', () => { clearTimeout(t); xong(ss.getVoices()); }, { once: true });
  });
}

export function dungDoc() {
  if (coHoTro()) window.speechSynthesis.cancel();
}

export async function docGiong(van: string): Promise<KetQuaDoc> {
  if (!coHoTro()) return 'khong_ho_tro';
  const giong = chonGiongViet(await docGiongCoSan());
  if (!giong) return 'khong_co_giong_viet';
  const doan = catDoan(lamSachDeDoc(van).slice(0, 3000));
  const ss = window.speechSynthesis;
  ss.cancel();
  for (const d of doan) {
    const kq = await new Promise<'ok' | 'dung'>((xong) => {
      const u = new SpeechSynthesisUtterance(d);
      u.voice = giong;
      u.lang = giong.lang;
      u.rate = 1;
      u.onend = () => xong('ok');
      // `cancel()` (người dùng bấm dừng) báo lỗi "interrupted"/"canceled": coi là dừng, không phải hỏng.
      u.onerror = () => xong('dung');
      ss.speak(u);
    });
    if (kq === 'dung') return 'da_dung';
  }
  return 'xong';
}
