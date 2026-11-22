import { goi } from '@/lib/goiSpace';
import type { DoThiHien, LinhVuc, NutHien, PhuongAn, SoBuoc, TaiNguyenCan } from '../../supabase/functions/_shared/quy-trinh/do-thi.ts';
import type { HieuSuat, LanChay, TrangThaiChay } from '../../supabase/functions/_shared/quy-trinh/chay.ts';

export type { DoThiHien, HieuSuat, LanChay, LinhVuc, NutHien, PhuongAn, SoBuoc, TaiNguyenCan, TrangThaiChay };

export interface TinQuyTrinh { id: number; vai: 'nguoi' | 'mimi'; noi_dung: string; luc: string }
export interface LichSuChay { phuong_an: PhuongAn; trang_thai: 'xong' | 'dung'; bat_dau: string; ket_thuc: string; hieu_suat: HieuSuat }

export interface ChiTietQuyTrinh {
  id: string; company_id: string; ten_khach: string; tieu_de: string; linh_vuc: LinhVuc; nguon: 'ai' | 'mau'; cau_goc: string;
  phuong_an: PhuongAn; trang_thai: 'nhap' | 'dang_chay' | 'xong' | 'dung';
  do_thi: DoThiHien; so_sanh: Record<PhuongAn, SoBuoc>; tai_nguyen: TaiNguyenCan[];
  lan_chay: LanChay | null; trang_thai_chay: TrangThaiChay | null; hieu_suat: HieuSuat | null;
  lich_su: LichSuChay[]; tin: TinQuyTrinh[];
}
export interface DongQuyTrinh {
  id: string; company_id: string; ten_khach: string; tieu_de: string; linh_vuc: LinhVuc; nguon: 'ai' | 'mau';
  phuong_an: PhuongAn; trang_thai: ChiTietQuyTrinh['trang_thai']; cap_nhat_luc: string; dem: SoBuoc | null;
}

export const dsQuyTrinh = async () => ((await goi('qt_ds')).ds ?? []) as DongQuyTrinh[];
export const xemQuyTrinh = async (id: string) => (await goi('qt_xem', { id })) as unknown as ChiTietQuyTrinh;
export const taoQuyTrinh = async (company_id: string, cau: string) => String((await goi('qt_tao', { company_id, cau })).id);
export const suaQuyTrinh = async (id: string, loi: string) => { await goi('qt_sua', { id, loi }); };
export const doiPhuongAn = async (id: string, phuong_an: PhuongAn) => { await goi('qt_pa', { id, phuong_an }); };
export const ganEmail = async (id: string, nut_id: string, email: string) => { await goi('qt_gan', { id, nut_id, email }); };
export const chayQuyTrinh = async (id: string) => { await goi('qt_chay', { id }); };
export const xuLyBuoc = async (id: string, nut_id: string, quyet: 'xong' | 'duyet' | 'tu_choi', ghi_chu?: string) => {
  await goi('qt_buoc', { id, nut_id, quyet, ghi_chu });
};
