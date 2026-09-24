import { supabase } from '@/integrations/supabase/client';
import { dangHoatDong, loaiTheoMst, type LoaiTheoMst } from '../../supabase/functions/_shared/mst/tra-cuu.ts';

/**
 * Tra mã số thuế từ trình duyệt, qua edge function `tax-lookup` (cần đăng nhập).
 *
 * Đọc bản ghi bằng đúng quy tắc máy chủ dùng (`_shared/mst/tra-cuu.ts`), để thẻ chào mừng và
 * trang Tờ khai không bao giờ nói hai điều khác nhau về cùng một mã.
 */

export type KetQuaTraMst =
  | { trang_thai: 'thay'; ten: string; loai: LoaiTheoMst | null; trang_thai_nnt: string; con_hoat_dong: boolean }
  | { trang_thai: 'khong_thay' }
  | { trang_thai: 'loi' };

export async function traMst(ma: string): Promise<KetQuaTraMst> {
  try {
    const { data, error } = await supabase.functions.invoke('tax-lookup', { body: { taxCode: ma } });
    if (error || !data) return { trang_thai: 'loi' };
    if (!data.found || !data.record?.name) return { trang_thai: 'khong_thay' };
    const r = data.record as { name: string; orgType?: string; status?: string };
    return {
      trang_thai: 'thay',
      ten: r.name,
      loai: loaiTheoMst(ma, r.orgType),
      trang_thai_nnt: r.status ?? '',
      con_hoat_dong: dangHoatDong(r.status),
    };
  } catch {
    return { trang_thai: 'loi' };
  }
}
