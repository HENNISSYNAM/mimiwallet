import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { kemCongTy } from '@/lib/congTyDangDung';
import type { MocThue } from '../../supabase/functions/_shared/luat/lich-thue.ts';
export { TEN_LOAI_MOC, type MocThue } from '../../supabase/functions/_shared/luat/lich-thue.ts';

/**
 * Lịch thuế CỦA CÔNG TY NÀY, đọc từ máy chủ (`tax-summary` → `_shared/luat/lich-thue.ts`).
 *
 * Mọi màn hình nói về hạn thuế (Tổng quan, Nhắc thuế, Bắt đầu từ đâu) đọc từ đây. Trước 25/09/2026
 * chúng tự tính từ lịch chung cả nước (`hanKeKhai.ts`) và hiện "Kỳ khai Quý 3 — còn 36 ngày" cho cả
 * hộ dưới ngưỡng, không phải khai quý — trong khi đoạn ngay bên dưới nói điều ngược lại.
 */
export interface LichThue {
  lich: MocThue[];
  mocKeTiep: MocThue | null;
  loaiNguoiNop: string | null;
}

let dangDoc: { luc: number; p: Promise<LichThue> } | null = null;
const GIU_MS = 30_000;

export async function docLichThue(): Promise<LichThue> {
  if (dangDoc && Date.now() - dangDoc.luc < GIU_MS) return dangDoc.p;
  const p = (async () => {
    const { data, error } = await supabase.functions.invoke('tax-summary', { body: await kemCongTy({}) });
    if (error || !data || data.error) throw new Error('Chưa đọc được lịch thuế.');
    return { lich: data.lich ?? [], mocKeTiep: data.mocKeTiep ?? null, loaiNguoiNop: data.loaiNguoiNop ?? null } as LichThue;
  })();
  dangDoc = { luc: Date.now(), p };
  p.catch(() => { dangDoc = null; });
  return p;
}

/** Cho test: bỏ bản đang giữ để lần đọc sau gọi lại máy chủ. */
export function quenLichThue() { dangDoc = null; }

export function useLichThue(): { du: LichThue | null; loi: boolean } {
  const [du, setDu] = useState<LichThue | null>(null);
  const [loi, setLoi] = useState(false);
  useEffect(() => {
    let huy = false;
    docLichThue().then((d) => { if (!huy) setDu(d); }).catch(() => { if (!huy) setLoi(true); });
    return () => { huy = true; };
  }, []);
  return { du, loi };
}

export const ngayMoc = (ymd: string | null) => (ymd ? ymd.split('-').reverse().join('/') : 'Chưa xác định');

/** Câu ngắn cho một mốc: "Còn 36 ngày", "Hôm nay là hạn", "Cần xác minh". */
export function cauConLai(m: MocThue): string {
  if (m.trang_thai === 'khong_ap_dung') return 'Không áp dụng';
  if (m.con_lai === null) return 'Cần xác minh';
  if (m.con_lai < 0) return `Quá hạn ${-m.con_lai} ngày`;
  if (m.con_lai === 0) return 'Hôm nay là hạn';
  return m.trang_thai === 'can_xac_minh' ? `Còn ${m.con_lai} ngày · cần xác minh` : `Còn ${m.con_lai} ngày`;
}
