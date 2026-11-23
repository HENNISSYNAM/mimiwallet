/** Nhãn ngày trong khung chat kiểu Zalo ("Hôm nay", "Hôm qua", dd/mm/yyyy) — tính theo giờ Việt Nam. */
const VN = 'Asia/Ho_Chi_Minh';
const ngayVN = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: VN }); // yyyy-mm-dd

export const khoaNgay = (luc: string): string => { const d = new Date(luc); return Number.isNaN(d.getTime()) ? '' : ngayVN(d); };

export function nhanNgay(luc: string, bayGio: Date = new Date()): string {
  const d = new Date(luc);
  if (Number.isNaN(d.getTime())) return '';
  const k = ngayVN(d);
  if (k === ngayVN(bayGio)) return 'Hôm nay';
  if (k === ngayVN(new Date(bayGio.getTime() - 86_400_000))) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { timeZone: VN, day: '2-digit', month: '2-digit', year: 'numeric' });
}
