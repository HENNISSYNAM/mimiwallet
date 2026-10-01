import i18n from 'i18next';
import { MAU_HANH_TRINH, TEN_LOAI_BANG_CHUNG, TEN_LOAI_NGAY, TEN_MUC, TEN_TRANG_THAI_BUOC, TEN_TRANG_THAI_HO_SO, TEN_XAC_MINH } from '@/lib/hanhTrinh';

/**
 * Nhãn "Việc cần làm" theo ngôn ngữ đang chọn. Bảng nhãn gốc nằm ở `supabase/functions/_shared` (dùng chung cho máy chủ,
 * giữ tiếng Việt); ở đây chỉ lớp trình bày: mã → khoá dịch `app.viec.*`, mã lạ rơi về nhãn tiếng Việt gốc rồi về chính mã.
 * Gọi trong lúc render của component đã dùng `useTranslation()`.
 */
const dich = (khoa: string, goc: string | undefined, ma: string | number) => i18n.t(`app.viec.${khoa}.${ma}`, { defaultValue: goc ?? String(ma) });

export const tenMucViec = (m: number) => dich('muc', (TEN_MUC as Record<number, string>)[m], m);
export const tenLoaiNgay = (l: string) => dich('loaiNgay', (TEN_LOAI_NGAY as Record<string, string>)[l], l);
export const tenTrangThaiViec = (t: string) => dich('trangThai', (TEN_TRANG_THAI_HO_SO as Record<string, string>)[t], t);
export const tenTrangThaiBuoc = (t: string) => dich('buoc', TEN_TRANG_THAI_BUOC[t], t);
export const tenLoaiBangChung = (l: string) => dich('bangChung', (TEN_LOAI_BANG_CHUNG as Record<string, string>)[l], l);
export const tenXacMinh = (x: string) => dich('xacMinh', (TEN_XAC_MINH as Record<string, string>)[x], x);
export const tenLoaiHanhTrinh = (l: string) => dich('loaiHt', (MAU_HANH_TRINH as Record<string, { tieu_de: string }>)[l]?.tieu_de, l);
