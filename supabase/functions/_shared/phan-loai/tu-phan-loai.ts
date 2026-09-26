/**
 * MIMI TỰ PHÂN LOẠI TIỀN VÀO — không hỏi người dùng (26/09/2026).
 *
 * Người dùng chọn: "Tự quyết hết, không hỏi", kể cả khoản làm GIẢM doanh thu khai thuế, sau khi được
 * nói rõ rủi ro (đọc sai nội dung → khai thiếu doanh thu). Nên:
 *   - mọi khoản tiền vào chưa ai phân loại đều được MIMI phân loại, theo nguyên tắc kế toán;
 *   - có dấu hiệu rõ trong nội dung chuyển khoản (giải ngân vay, góp vốn, người nhà cho, hoàn tiền, đặt
 *     cọc) → loại ra khỏi doanh thu, kèm đúng lý do (`phan-loai/tien-vao.ts`);
 *   - KHÔNG có dấu hiệu nào → tính là DOANH THU. Nguyên tắc thận trọng: không tự làm giảm thuế khi không
 *     có căn cứ. (Cũng là cách tính trước đây cho khoản chưa rõ.)
 *   - chuyển giữa các tài khoản của chính mình đã được loại riêng (`ledger/internal-transfer.ts`), không
 *     đụng tới ở đây;
 *   - KHÔNG BAO GIỜ ghi đè khoản người dùng đã tự phân loại.
 * Mỗi quyết định ghi nguồn `rule`, người quyết là MIMI (mã rỗng), lý do, và một dòng sự kiện — nên vẫn
 * truy vết và hoàn tác được như một lần phân loại tay.
 */
import { anhHuong, goiYPhanLoai, type LoaiPhanLoai } from '../doanh-thu/phan-loai.ts';
import type { KhoanTienVao } from './tien-vao.ts';

export const MIMI_TU_DONG = '00000000-0000-0000-0000-000000000000';
export const VAI_MIMI = 'mimi_tu_dong';

export interface QuyetDinhTuDong {
  loai: LoaiPhanLoai;
  anh_huong: 'include' | 'exclude';
  ly_do: string;
  nguon: 'noi_dung' | 'than_trong';
}

export const LY_DO_THAN_TRONG =
  'Nội dung chuyển khoản không có dấu hiệu tiền vay, góp vốn, người nhà, hoàn tiền hay đặt cọc — theo nguyên tắc thận trọng, MIMI tính là doanh thu.';

export function tuPhanLoai(t: KhoanTienVao): QuyetDinhTuDong {
  const g = goiYPhanLoai(t);
  if (g) return { loai: g.loai, anh_huong: anhHuong(g.loai) === 'include' ? 'include' : 'exclude', ly_do: g.ly_do, nguon: 'noi_dung' };
  return { loai: 'business_revenue', anh_huong: 'include', ly_do: LY_DO_THAN_TRONG, nguon: 'than_trong' };
}

export interface GiaoDichTuDong extends KhoanTienVao { id: string; amount: number; type?: string | null }

/**
 * Chọn khoản cần MIMI tự phân loại: tiền vào, chưa có phân loại, không phải chuyển nội bộ.
 * `daPhanLoai`: id giao dịch đã có dòng trong `revenue_classifications` (kể cả của người dùng).
 */
export function canTuPhanLoai<T extends GiaoDichTuDong>(ds: readonly T[], daPhanLoai: Set<string>, noiBo: Set<string>, laTienVao: (t: T) => boolean): T[] {
  return ds.filter((t) => laTienVao(t) && !daPhanLoai.has(String(t.id)) && !noiBo.has(String(t.id)));
}
