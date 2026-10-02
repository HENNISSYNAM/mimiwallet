import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { goiTroLy } from '@/lib/goiTroLy';
import { docGiong } from '@/lib/docGiong';
import type { TraLoi } from '@/lib/troLy';

/**
 * HỎI MIMI TỪ PET — CHẠY NGẦM (26/09/2026).
 *
 * Gõ (hoặc nói) ở ô nhỏ dưới mèo: câu hỏi đi vào ĐÚNG hành động `hoi` của Trợ lý MIMI (cùng bộ não, cùng
 * nhật ký hội thoại ở máy chủ), nhưng người dùng KHÔNG bị chuyển trang. Trả lời xong thì pet bật một
 * thông báo; bấm vào thông báo mới mở Trợ lý MIMI, hiện đúng câu hỏi và câu trả lời đó (không hỏi lại).
 *
 * Kho ở cấp mô-đun, ngoài React: pet bị tháo khỏi trang khi mở Trợ lý MIMI hoặc khi ẩn (Alt+Shift+M) —
 * câu hỏi đang chạy không được mất theo.
 */
export interface LanHoiPet {
  id: string;
  cau: string;
  trang_thai: 'dang' | 'xong' | 'loi';
  tra_loi: TraLoi | null;
  loi: string | null;
  /** Hỏi bằng giọng → trả lời xong thì đọc to. */
  bang_giong: boolean;
  luc: number;
  /** Người dùng đã bấm xem (hoặc gạt đi) thông báo này. */
  da_xem: boolean;
}

const TOI_DA = 6;
let ds: readonly LanHoiPet[] = [];
const nguoiNghe = new Set<() => void>();
const doi = (f: (d: readonly LanHoiPet[]) => readonly LanHoiPet[]) => { ds = f(ds); nguoiNghe.forEach((g) => g()); };

export const layLanHoi = () => ds;
export const dangKyLanHoi = (g: () => void) => { nguoiNghe.add(g); return () => { nguoiNghe.delete(g); }; };
export const useLanHoiPet = () => useSyncExternalStore(dangKyLanHoi, layLanHoi, layLanHoi);

let dem = 0;
export async function hoiNgam(cau: string, o: { bangGiong?: boolean } = {}): Promise<void> {
  const c = cau.trim().slice(0, 1000);
  if (!c) return;
  const id = `p${Date.now()}-${++dem}`;
  doi((d) => [{ id, cau: c, trang_thai: 'dang' as const, tra_loi: null, loi: null, bang_giong: !!o.bangGiong, luc: Date.now(), da_xem: false }, ...d].slice(0, TOI_DA));
  try {
    const tl = (await goiTroLy('hoi', { cau: c })) as TraLoi;
    doi((d) => d.map((x) => (x.id === id ? { ...x, trang_thai: 'xong' as const, tra_loi: tl } : x)));
    if (o.bangGiong && tl?.cau) {
      const kq = await docGiong(tl.cau);
      if (kq === 'khong_co_giong_viet') toast.error('Máy này chưa có giọng đọc tiếng Việt nên MIMI chưa đọc to được. Bấm thông báo để xem câu trả lời.');
    }
  } catch (e) {
    doi((d) => d.map((x) => (x.id === id ? { ...x, trang_thai: 'loi' as const, loi: e instanceof Error ? e.message : 'Chưa hỏi được MIMI.' } : x)));
  }
}

export const daXemLanHoi = (id: string) => doi((d) => d.map((x) => (x.id === id ? { ...x, da_xem: true } : x)));
export const boLanHoi = (id: string) => doi((d) => d.filter((x) => x.id !== id));
/** Chỉ cho test: xoá sạch giữa các ca. */
export const xoaHetLanHoi = () => doi(() => []);

/** Một dòng ngắn của câu trả lời, cho thông báo trên pet. */
export const trichTraLoi = (tl: TraLoi | null, toiDa = 90): string => {
  const s = (tl?.cau ?? '').replace(/\s+/g, ' ').trim();
  return s.length > toiDa ? `${s.slice(0, toiDa - 1).trimEnd()}…` : s;
};
