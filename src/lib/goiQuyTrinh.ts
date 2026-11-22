import { goi } from '@/lib/goiSpace';
import type { DoThiHien, LinhVuc, NutHien, PhuongAn, SoBuoc, TaiNguyenCan } from '../../supabase/functions/_shared/quy-trinh/do-thi.ts';
import type { HieuSuat, LanChay, TrangThaiChay } from '../../supabase/functions/_shared/quy-trinh/chay.ts';

export interface GoiY { khoa: string; cau: string; hanh_dong: { thao_tac: string; [k: string]: unknown } }
export interface CanhBaoChuan { muc: 'loi' | 'nen'; cau: string; nut_id?: string }
export interface KetNoiHien { cong_cu: string; kieu: 'api' | 'mcp'; url: string; khoa_hien: string | null; cong_cu_mcp: string | null }
export interface MauThuVien { khoa: string; linh_vuc: LinhVuc; tieu_de: string; mo_ta: string; khung: string; so_buoc: number }
export type { DoThiHien, HieuSuat, LanChay, LinhVuc, NutHien, PhuongAn, SoBuoc, TaiNguyenCan, TrangThaiChay };

export interface TinQuyTrinh { id: number; vai: 'nguoi' | 'mimi'; noi_dung: string; luc: string }
export interface LichSuChay { phuong_an: PhuongAn; trang_thai: 'xong' | 'dung'; bat_dau: string; ket_thuc: string; hieu_suat: HieuSuat }

export interface ChiTietQuyTrinh {
  id: string; company_id: string; ten_khach: string; tieu_de: string; linh_vuc: LinhVuc; nguon: 'ai' | 'mau'; cau_goc: string;
  phuong_an: PhuongAn; trang_thai: 'nhap' | 'dang_chay' | 'xong' | 'dung';
  do_thi: DoThiHien; so_sanh: Record<PhuongAn, SoBuoc>; tai_nguyen: TaiNguyenCan[];
  lan_chay: LanChay | null; trang_thai_chay: TrangThaiChay | null; hieu_suat: HieuSuat | null;
  lich_su: LichSuChay[]; tin: TinQuyTrinh[];
  goi_y: GoiY[]; chuan: CanhBaoChuan[]; kien_thuc: string[]; ket_noi: KetNoiHien[];
}
export interface DongQuyTrinh {
  id: string; company_id: string; ten_khach: string; tieu_de: string; linh_vuc: LinhVuc; nguon: 'ai' | 'mau';
  phuong_an: PhuongAn; trang_thai: ChiTietQuyTrinh['trang_thai']; cap_nhat_luc: string; dem: SoBuoc | null;
  meo?: string[]; trang_thai_chay?: TrangThaiChay | null;
}

export const dsQuyTrinh = async () => ((await goi('qt_ds')).ds ?? []) as DongQuyTrinh[];
export const xemQuyTrinh = async (id: string) => (await goi('qt_xem', { id })) as unknown as ChiTietQuyTrinh;
export const taoQuyTrinh = async (company_id: string, cau: string) => String((await goi('qt_tao', { company_id, cau })).id);
export const taoTuMau = async (company_id: string, mau: string) => String((await goi('qt_tao', { company_id, mau })).id);
export const thuVien = async () => ((await goi('qt_thu_vien')).ds ?? []) as MauThuVien[];
export const suaTay = async (id: string, thao_tac: Record<string, unknown>) => { await goi('qt_sua_tay', { id, ...thao_tac }); };
export const ketNoi = async (id: string, d: { cong_cu: string; kieu: 'api' | 'mcp'; url: string; khoa?: string; cong_cu_mcp?: string }) => { await goi('qt_ket_noi', { id, ...d }); };
export const suaQuyTrinh = async (id: string, loi: string) => { await goi('qt_sua', { id, loi }); };
export const doiPhuongAn = async (id: string, phuong_an: PhuongAn) => { await goi('qt_pa', { id, phuong_an }); };
export const ganEmail = async (id: string, nut_id: string, email: string) => { await goi('qt_gan', { id, nut_id, email }); };
export const chayQuyTrinh = async (id: string) => { await goi('qt_chay', { id }); };
export const xuLyBuoc = async (id: string, nut_id: string, quyet: 'xong' | 'duyet' | 'tu_choi', ghi_chu?: string) => {
  await goi('qt_buoc', { id, nut_id, quyet, ghi_chu });
};
