/**
 * Pet MIMI — cơ chế theo đúng tài liệu "Pets" của ChatGPT (learn.chatgpt.com/docs/pets, đọc 26/09/2026),
 * dùng mèo và tên của MIMI, không dùng hình hay thương hiệu của OpenAI.
 *
 * - Bốn trạng thái, ưu tiên: CẦN BẠN > BỊ CHẶN > XONG CHƯA XEM > ĐANG CHẠY (khi nhiều việc cùng có hoạt động).
 * - Ba nút dưới pet: gõ chat, nói, khay hoạt động. Chuột phải: ẩn, Mini, kích thước.
 * - Kéo đi đâu cũng được, nhớ vị trí; đổi kích thước; chế độ Mini (chỉ nút, không pet).
 * - Phím tắt bật/tắt, lệnh `/pet` trong khung chat.
 * - Người bật giảm chuyển động: ảnh tĩnh, không nhún nhảy.
 * Khác bản desktop của ChatGPT: MIMI là web nên pet nổi trên trang MIMI, không nổi trên app khác; phím
 * Windows không bắt được trong trình duyệt nên phím tắt là Alt+Shift+M.
 */
import type { Pose } from '@/lib/mimiTamTrang';

/** Sự kiện cửa sổ: lệnh `/pet` gõ trong Trợ lý MIMI → pet ẩn/hiện. */
export const SU_KIEN_LENH_PET = 'mimi:lenh-pet';

export type TrangThaiPet = 'can_ban' | 'bi_chan' | 'xong_chua_xem' | 'dang_chay' | 'nghi';

export interface TinHieuPet {
  dangTraLoi: boolean;
  dangLamHo: boolean;
  loi: boolean;
  /** Việc đang chờ người dùng: câu hỏi của hành trình, đề xuất chờ xác nhận. */
  soCanBan: number;
  /** Câu trả lời mới người dùng chưa mở xem. */
  chuaDoc: number;
}

/** Nhiều tín hiệu cùng lúc → theo thứ tự ưu tiên của tài liệu. */
export function trangThaiPet(t: TinHieuPet): TrangThaiPet {
  if (t.soCanBan > 0) return 'can_ban';
  if (t.loi) return 'bi_chan';
  if (t.chuaDoc > 0) return 'xong_chua_xem';
  if (t.dangTraLoi || t.dangLamHo) return 'dang_chay';
  return 'nghi';
}

export const TEN_TRANG_THAI_PET: Record<TrangThaiPet, string> = {
  can_ban: 'Cần bạn', bi_chan: 'Bị chặn', xong_chua_xem: 'Xong — chưa xem', dang_chay: 'Đang làm', nghi: 'Sẵn sàng',
};

/** Dáng mèo cho từng trạng thái. `nguLau`: nghỉ quá lâu thì ngủ. */
export function dangMeo(tt: TrangThaiPet, nguLau: boolean): Pose {
  switch (tt) {
    case 'can_ban': return 'sit'; // ngồi chờ bạn — không vẫy tay
    case 'bi_chan': return 'surprised';
    case 'xong_chua_xem': return 'happy';
    case 'dang_chay': return 'run';
    case 'nghi': return (nguLau ? 'sleep' : 'idle');
  }
}

// ── Cài đặt: vị trí, kích thước, chế độ, ẩn — lưu ở trình duyệt, lỗi thì dùng mặc định ───────────────
export type CoPet = 'nho' | 'vua' | 'lon';
export const KICH_THUOC: Record<CoPet, number> = { nho: 56, vua: 76, lon: 104 };

export interface CaiDatPet { x: number | null; y: number | null; co: CoPet; mini: boolean; an: boolean }
export const MAC_DINH: CaiDatPet = { x: null, y: null, co: 'vua', mini: false, an: false };
const KHOA = 'mimi.pet.v1';

export function docCaiDat(kho: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): CaiDatPet {
  try {
    const v = JSON.parse(kho?.getItem(KHOA) ?? 'null');
    if (!v || typeof v !== 'object') return { ...MAC_DINH };
    return {
      x: Number.isFinite(v.x) ? v.x : null,
      y: Number.isFinite(v.y) ? v.y : null,
      co: v.co === 'nho' || v.co === 'lon' ? v.co : 'vua',
      mini: v.mini === true,
      an: v.an === true,
    };
  } catch {
    return { ...MAC_DINH };
  }
}

export function luuCaiDat(c: CaiDatPet, kho: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage) {
  try { kho?.setItem(KHOA, JSON.stringify(c)); } catch { /* chế độ riêng tư, bộ nhớ đầy: bỏ qua */ }
}

/** Giữ pet trong màn hình, chừa lề 8px; khi màn nhỏ lại (xoay máy), kéo pet vào trong. */
export function giuTrongMan(p: { x: number; y: number }, kt: { rong: number; cao: number }, man: { rong: number; cao: number }) {
  return {
    x: Math.min(Math.max(8, p.x), Math.max(8, man.rong - kt.rong - 8)),
    y: Math.min(Math.max(8, p.y), Math.max(8, man.cao - kt.cao - 8)),
  };
}

/** Phím tắt: Alt+Shift+M (không bắt được phím Windows trong trình duyệt). */
export const laPhimTat = (e: Pick<KeyboardEvent, 'altKey' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'code'>) =>
  e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyM';

/** Lệnh `/pet` gõ trong khung chat. */
export const laLenhPet = (cau: string) => /^\/pet\s*$/i.test(cau.trim());
