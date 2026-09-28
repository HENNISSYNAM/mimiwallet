import { useMemo } from 'react';
import { toast } from 'sonner';
import { docGiong } from '@/lib/docGiong';
import type { TraLoi } from '@/lib/troLy';
import { datLaiNaoChoTest, useNaoMimi, type LuotNao } from '@/store/naoMimi';

/**
 * HỎI MIMI TỪ PET — CHẠY NGẦM (26/09/2026), nay trên BỘ NÃO DÙNG CHUNG (28/09/2026, `store/naoMimi.ts`).
 *
 * Gõ (hoặc nói) ở ô nhỏ dưới mèo: câu hỏi vào đúng hành động `hoi` của Trợ lý MIMI, người dùng KHÔNG bị
 * chuyển trang. Lượt hỏi nằm trong kho chung, nên Trợ lý MIMI và Tổng quan thấy CÙNG kết quả mà không hỏi
 * lại; pet chỉ vẽ trạng thái thật của request (đang / xong / lỗi / đã ngừng chờ) — không tự nhận "đã xong".
 *
 * File này giữ nguyên API cũ cho PetMimi (`useLanHoiPet`, `hoiNgam`…) như một lớp mỏng trên kho.
 */
export interface LanHoiPet {
  id: number;
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

const sangLanHoi = (l: LuotNao): LanHoiPet => ({
  id: l.id,
  cau: l.cau,
  // "Đã ngừng chờ" hiện như lỗi trên pet: không có câu trả lời, và câu `loi` nói rõ máy chủ có thể vẫn xong.
  trang_thai: l.trangThai === 'ngung_cho' ? 'loi' : l.trangThai,
  tra_loi: l.traLoi,
  loi: l.loi,
  bang_giong: l.bangGiong,
  luc: l.luc,
  da_xem: l.daXem,
});

/** Lượt pet đã hỏi, mới nhất trước. */
export function useLanHoiPet(): LanHoiPet[] {
  const luot = useNaoMimi((s) => s.luot);
  return useMemo(() => luot.filter((l) => l.nguon === 'pet').slice(-TOI_DA).reverse().map(sangLanHoi), [luot]);
}

export const layLanHoi = (): LanHoiPet[] =>
  useNaoMimi.getState().luot.filter((l) => l.nguon === 'pet').slice(-TOI_DA).reverse().map(sangLanHoi);

export async function hoiNgam(cau: string, o: { bangGiong?: boolean } = {}): Promise<void> {
  const c = cau.trim().slice(0, 1000);
  if (!c) return;
  const kq = await useNaoMimi.getState().hoi(c, { nguon: 'pet', bangGiong: !!o.bangGiong });
  if (kq.trangThai === 'xong' && kq.bangGiong && kq.traLoi?.cau) {
    const doc = await docGiong(kq.traLoi.cau);
    if (doc === 'khong_co_giong_viet') toast.error('Máy này chưa có giọng đọc tiếng Việt nên MIMI chưa đọc to được. Bấm thông báo để xem câu trả lời.');
  }
}

export const daXemLanHoi = (id: number) => useNaoMimi.getState().danhDauDaXem(id);
export const boLanHoi = (id: number) => useNaoMimi.getState().boLuot(id);
/** Chỉ cho test: xoá sạch giữa các ca. */
export const xoaHetLanHoi = () => datLaiNaoChoTest();

/** Một dòng ngắn của câu trả lời, cho thông báo trên pet. */
export const trichTraLoi = (tl: TraLoi | null, toiDa = 90): string => {
  const s = (tl?.cau ?? '').replace(/\s+/g, ' ').trim();
  return s.length > toiDa ? `${s.slice(0, toiDa - 1).trimEnd()}…` : s;
};
