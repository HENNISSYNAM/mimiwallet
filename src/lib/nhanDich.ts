import i18n from 'i18next';
import { TEN_NHOM_CHI, type NhomChi } from '@/lib/tacTu';

/**
 * Nhãn hiển thị theo ngôn ngữ đang chọn cho các mã dùng chung giữa nhiều trang (nhóm chi, trạng thái yêu cầu chi).
 * Chỉ là lớp trình bày: mã gửi lên máy chủ và bảng tiếng Việt trong `lib/tacTu.ts` giữ nguyên. Mã lạ rơi về
 * tên tiếng Việt cũ rồi về chính mã, không bao giờ biến mất.
 *
 * Gọi trong lúc render của component đã dùng `useTranslation()` để đổi ngôn ngữ là vẽ lại.
 */
export const tenNhomChi = (n: string): string =>
  i18n.t(`app.chung.nhomChi.${n}`, { defaultValue: TEN_NHOM_CHI[n as NhomChi] ?? n });

export const nhanTrangThaiYc = (k: string): string => i18n.t(`app.chung.trangThaiYc.${k}`, { defaultValue: k });
