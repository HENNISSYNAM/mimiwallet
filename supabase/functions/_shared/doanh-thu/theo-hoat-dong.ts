/**
 * Doanh thu theo NHÓM HOẠT ĐỘNG — một chỗ tính cho tờ khai, trợ lý và giao diện.
 *
 * Tiền (bao nhiêu) đến từ `so-lieu.ts`. Ở đây chỉ chia số tiền ĐÃ LÀ DOANH THU vào từng nhóm hoạt
 * động — và phần không ai xác nhận nhóm thì để ở `chua_ro`, KHÔNG chia đều, KHÔNG dồn vào ngành đăng
 * ký. Lý do: hai nhóm khác nhau có tỷ lệ thuế khác nhau; đoán sai nhóm là khai sai thuế.
 *
 * Tầng ngữ nghĩa, theo thứ tự (không bỏ tầng):
 *   tiền vào → bản chất (revenue_classifications) → nhóm hoạt động (phan_loai_hoat_dong)
 *   → cách hạch toán (`nghiaKeToan`, suy ra) → dòng tờ khai (`luat/to-khai.ts`).
 */
import type { NhomNganh } from '../luat/he-luat.ts';

export type HoatDong = NhomNganh;
export const HOAT_DONG: HoatDong[] = ['phan_phoi_hang_hoa', 'dich_vu', 'cho_thue_tai_san', 'san_xuat_van_tai', 'noi_dung_so', 'khac'];
export type NhomChia = HoatDong | 'chua_ro';

export type NguonDoanhThuKhoan = 'giao_dich' | 'hoa_don' | 'tu_nhap';

export interface KhoanDoanhThu {
  nguon: NguonDoanhThuKhoan;
  id: string;
  so_tien: number;
  /** YYYY-MM-DD */
  ngay: string;
}

export interface PhanLoaiHoatDong {
  nguon: NguonDoanhThuKhoan;
  nguon_id: string;
  hoat_dong: HoatDong;
}

type Bon = [number, number, number, number];
const quyCua = (ngay: string) => Math.max(1, Math.min(4, Math.ceil(Number(ngay.slice(5, 7)) / 3)));

export interface NhomDaChia {
  so_tien: number;
  so_khoan: number;
  theo_quy: Bon;
  /** Để bấm vào một con số trên tờ khai và thấy nó gồm khoản nào. */
  ids: string[];
}

export interface ChiaHoatDong {
  nguon: NguonDoanhThuKhoan;
  tong: number;
  nhom: Record<NhomChia, NhomDaChia>;
}

export const khoaPhanLoai = (nguon: NguonDoanhThuKhoan, id: string) => `${nguon}:${id}`;

const rong = (): NhomDaChia => ({ so_tien: 0, so_khoan: 0, theo_quy: [0, 0, 0, 0], ids: [] });

/** Chia các khoản doanh thu theo nhóm hoạt động người đã xác nhận. Hàm thuần. */
export function chiaTheoHoatDong(nguon: NguonDoanhThuKhoan, khoan: KhoanDoanhThu[], phanLoai: PhanLoaiHoatDong[]): ChiaHoatDong {
  const theoKhoa = new Map(phanLoai.filter((p) => p.nguon === nguon).map((p) => [p.nguon_id, p.hoat_dong]));
  const nhom = Object.fromEntries([...HOAT_DONG, 'chua_ro'].map((k) => [k, rong()])) as Record<NhomChia, NhomDaChia>;
  let tong = 0;
  for (const k of khoan) {
    const n: NhomChia = theoKhoa.get(k.id) ?? 'chua_ro';
    const o = nhom[n];
    o.so_tien += k.so_tien;
    o.so_khoan += 1;
    o.theo_quy[quyCua(k.ngay) - 1] += k.so_tien;
    o.ids.push(k.id);
    tong += k.so_tien;
  }
  return { nguon, tong, nhom };
}

/** Số tiền của một nhóm trong một kỳ (cả năm hoặc một quý / nửa năm đầu). */
export function tienTrongKy(o: NhomDaChia, quy: number[]): number {
  return quy.reduce((s, q) => s + o.theo_quy[q - 1], 0);
}

/**
 * Doanh thu tự nhập theo quý: mỗi quý là MỘT khoản, nhóm hoạt động do người xác nhận cho cả quý.
 * `nguon_id` = "<năm>-q<quý>".
 */
export function khoanTuNhap(nam: number, quy: [number | null, number | null, number | null, number | null]): KhoanDoanhThu[] {
  const ra: KhoanDoanhThu[] = [];
  quy.forEach((v, i) => {
    if (typeof v === 'number' && v > 0) ra.push({ nguon: 'tu_nhap', id: `${nam}-q${i + 1}`, so_tien: v, ngay: `${nam}-${String(i * 3 + 1).padStart(2, '0')}-15` });
  });
  return ra;
}

/**
 * Gợi ý nhóm hoạt động cho khoản chưa phân loại. CHỈ là gợi ý để người bấm một lần cho nhanh — không
 * bao giờ tự gắn. Hồ sơ đăng ký đúng một nhóm → gợi ý nhóm đó; nhiều nhóm hoặc không có → không gợi ý
 * (hỏi người, đừng đoán).
 */
export function goiYHoatDong(nganhDangKy: HoatDong[]): HoatDong | null {
  return nganhDangKy.length === 1 ? nganhDangKy[0] : null;
}

/**
 * Cách hạch toán suy ra từ bản chất + nhóm hoạt động. Tầng này CHƯA phải sổ kép — chỉ là nghĩa kế
 * toán để báo cáo và trợ lý nói đúng tên. Suy ra, không lưu: hai nguồn sự thật là bản chất (người
 * xác nhận) và nhóm hoạt động (người xác nhận); lưu thêm bản thứ ba là mở chỗ cho lệch nhau.
 */
export type NghiaKeToan =
  | 'doanh_thu_ban_hang' | 'doanh_thu_dich_vu' | 'thu_nhap_hoat_dong_khac'
  | 'no_vay' | 'von_chu_so_huu' | 'nhan_dat_coc' | 'hoan_tien' | 'thu_ho' | 'chuyen_noi_bo' | 'chua_ro';

export function nghiaKeToan(banChat: string | null | undefined, hoatDong: HoatDong | null | undefined): NghiaKeToan {
  switch (banChat) {
    case 'business_revenue':
      if (!hoatDong) return 'chua_ro';
      if (hoatDong === 'phan_phoi_hang_hoa' || hoatDong === 'san_xuat_van_tai') return 'doanh_thu_ban_hang';
      if (hoatDong === 'khac') return 'thu_nhap_hoat_dong_khac';
      return 'doanh_thu_dich_vu';
    case 'loan': return 'no_vay';
    case 'capital_contribution': return 'von_chu_so_huu';
    case 'deposit': return 'nhan_dat_coc';
    case 'refund': return 'hoan_tien';
    case 'collection_on_behalf': return 'thu_ho';
    case 'internal_transfer': return 'chuyen_noi_bo';
    default: return 'chua_ro';
  }
}
