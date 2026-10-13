import i18n from 'i18next';
import type { O } from '../../../supabase/functions/_shared/sao-ke/doc-sao-ke.ts';
import type { LoaiNguoiLaoDong } from '../../../supabase/functions/_shared/thue-tncn/khau-tru.ts';

/**
 * Bảng lương người dùng nhập trên màn hình (hoặc từ tệp) — giữ dạng chữ như người gõ, máy chủ mới
 * kiểm và đổi ra số (`docBangLuong`). Số định danh (MST/CCCD) chỉ ở trình duyệt để người dùng nhận
 * ra ai là ai: `guiLen` bỏ nó đi, máy chủ không cần và không nên có.
 */
export interface DongNhap {
  khoa: string;
  ho_ten: string;
  ma_dinh_danh: string;
  loai: LoaiNguoiLaoDong;
  so_nguoi_phu_thuoc: string;
  thang: { tn: string; bh: string }[];
  thue_da_khau_tru_quy: string;
}

let dem = 0;
export const khoaMoi = () => `d${Date.now().toString(36)}${(dem++).toString(36)}`;

export const dongTrong = (): DongNhap => ({
  khoa: khoaMoi(), ho_ten: '', ma_dinh_danh: '', loai: 'cu_tru_hdld', so_nguoi_phu_thuoc: '0',
  thang: [{ tn: '', bh: '' }, { tn: '', bh: '' }, { tn: '', bh: '' }], thue_da_khau_tru_quy: '',
});

/** Thân yêu cầu gửi máy chủ — không có số định danh. */
export function guiLen(ds: DongNhap[]) {
  return ds.map((d) => ({
    ho_ten: d.ho_ten,
    loai: d.loai,
    so_nguoi_phu_thuoc: d.so_nguoi_phu_thuoc,
    thang: d.thang.map((t) => ({ thu_nhap_chiu_thue: t.tn, bao_hiem_bat_buoc: t.bh })),
    thue_da_khau_tru_quy: d.loai === 'cu_tru_hdld' ? null : d.thue_da_khau_tru_quy,
  }));
}

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

/** Cột "Loại": nhận mã hoặc chữ thường. Ô trống hay chữ lạ → null (không đoán). */
export function docLoai(o: O): LoaiNguoiLaoDong | null {
  const s = boDau(String(o ?? ''));
  if (!s) return null;
  if (s === 'khong_cu_tru' || s.includes('khong cu tru')) return 'khong_cu_tru';
  if (s === 'cu_tru_khac' || s === 'khac' || s.includes('vang lai') || s.includes('khong hdld') || s.includes('khong co hdld')) return 'cu_tru_khac';
  if (s === 'cu_tru_hdld' || s === 'hdld' || s.includes('hdld') || s.includes('hop dong lao dong')) return 'cu_tru_hdld';
  return null;
}

const chu = (o: O) => (o === null || o === undefined ? '' : o instanceof Date ? '' : String(o).trim());

/**
 * Tệp bảng lương, cột cố định (mẫu MIMI hiện trên màn hình):
 * Họ tên | MST/CCCD | Loại | Số người phụ thuộc | TN tháng 1 | BH tháng 1 | TN tháng 2 | BH tháng 2 |
 * TN tháng 3 | BH tháng 3 | Thuế đã khấu trừ trong quý (chỉ người không có HĐLĐ từ 03 tháng / không cư trú).
 * Dòng tiêu đề (cột thu nhập không phải số) và dòng không có họ tên được bỏ qua.
 */
export function docBangTinh(bang: O[][]): { ok: true; ds: DongNhap[] } | { ok: false; cau: string } {
  const ds: DongNhap[] = [];
  for (let i = 0; i < bang.length; i++) {
    const h = bang[i] ?? [];
    const ten = chu(h[0]);
    if (!ten) continue;
    const tn1 = chu(h[4]);
    if (tn1 && !/^[\d.\s]+$/.test(tn1)) continue; // dòng tiêu đề
    const loai = docLoai(h[2]);
    if (!loai) return { ok: false, cau: i18n.t('ui1.bangLuong.loaiSai', { hang: i + 1 }) };
    ds.push({
      khoa: khoaMoi(), ho_ten: ten, ma_dinh_danh: chu(h[1]), loai, so_nguoi_phu_thuoc: chu(h[3]) || '0',
      thang: [0, 1, 2].map((j) => ({ tn: chu(h[4 + j * 2]), bh: chu(h[5 + j * 2]) })),
      thue_da_khau_tru_quy: chu(h[10]),
    });
  }
  if (!ds.length) return { ok: false, cau: i18n.t('ui1.bangLuong.trong') };
  return { ok: true, ds };
}
