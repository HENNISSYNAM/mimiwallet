import { dinhDangTien, laTien, sangBigInt, type TienVND } from '@/lib/tien';

/** "1.000.000 ₫" — cùng hàm với mọi nơi (`lib/tien.ts`); nhận cả tổng dạng chuỗi số nguyên. */
export const formatVND = (amount: TienVND | null | undefined): string => dinhDangTien(amount);

/**
 * Dạng rút gọn cho ô số liệu: "1,5 tỷ ₫", "25 triệu ₫". Đây là con số ĐÃ LÀM TRÒN để đọc nhanh — nơi cần
 * đúng từng đồng dùng `formatVND`. Trước 29/09/2026 hàm này viết "₫1.5 tỷ" / "₫5M", bỏ qua số âm.
 */
export const formatVNDShort = (amount: TienVND | null | undefined): string => {
  if (!laTien(amount)) return '—';
  const b = sangBigInt(amount);
  const tuyetDoi = b < 0n ? -b : b;
  const so = Number(b);
  const mot = (x: number) => x.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
  if (tuyetDoi >= 1_000_000_000_000n) return `${mot(so / 1e12)} nghìn tỷ ₫`;
  if (tuyetDoi >= 1_000_000_000n) return `${mot(so / 1e9)} tỷ ₫`;
  if (tuyetDoi >= 1_000_000n) return `${Math.round(so / 1e6).toLocaleString('vi-VN')} triệu ₫`;
  return dinhDangTien(amount);
};

export const formatNumber = (n: number): string => {
  return new Intl.NumberFormat('vi-VN').format(n);
};

export const formatPercent = (n: number): string => `${n.toFixed(1)}%`;

/** Ngày không đọc được hoặc là giá trị giữ chỗ (trước 1901) → null. Không dựng ngày từ mặc định. */
const ngayDungDuoc = (date: string | Date | null | undefined): Date | null => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(d.getTime()) || d.getFullYear() < 1901 ? null : d;
};

export const formatDate = (date: string | Date | null | undefined): string => {
  const d = ngayDungDuoc(date);
  return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa xác định';
};

export const formatDateShort = (date: string | Date | null | undefined): string => {
  const d = ngayDungDuoc(date);
  return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : 'Chưa xác định';
};
