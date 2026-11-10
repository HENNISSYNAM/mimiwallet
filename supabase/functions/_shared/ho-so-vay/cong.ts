/**
 * Cửa quyền của hồ sơ vay (10/11/2026) — hàm thuần, có test.
 *
 * Hồ sơ vay chứa toàn bộ dòng tiền của công ty và một lời đồng ý thay mặt doanh nghiệp, nên:
 *   - chỉ CHỦ SỞ HỮU và QUẢN TRỊ được đánh giá, lập, xem, xuất (`QUYEN.lap_ho_so_vay`);
 *   - thành viên bị giới hạn vào MỘT cơ sở (kế toán cơ sở) bị từ chối dù vai trò là gì — họ không được thấy số của cả
 *     công ty (`da-co-so/pham-vi.ts`). Chủ và quản trị không bao giờ bị giới hạn, nên đây là lớp phòng thủ thứ hai;
 *   - một dòng hồ sơ chỉ trả cho đúng công ty đang chọn (`thuocCongTy`), kể cả khi id bị đoán.
 */
import { biGioiHan } from '../da-co-so/pham-vi.ts';
import { cauTuChoi, duocLam, type VaiTro } from '../quyen/vai-tro.ts';

export type KetQuaCua = { ok: true } | { ok: false; status: 403; ma: 'KHONG_DU_QUYEN' | 'PHAM_VI_CO_SO'; cau: string };

export function kiemCuaHoSoVay(vaiTro: VaiTro, coSoId: string | null | undefined): KetQuaCua {
  if (biGioiHan(vaiTro, coSoId)) {
    return { ok: false, status: 403, ma: 'PHAM_VI_CO_SO', cau: 'Bạn đang phụ trách một cơ sở nên không xem được hồ sơ vay của cả công ty. Việc này dành cho chủ doanh nghiệp hoặc quản trị.' };
  }
  if (!duocLam(vaiTro, 'lap_ho_so_vay')) return { ok: false, status: 403, ma: 'KHONG_DU_QUYEN', cau: cauTuChoi(vaiTro, 'lap_ho_so_vay') };
  return { ok: true };
}

export const thuocCongTy = (dong: { company_id?: unknown } | null | undefined, companyId: string): boolean =>
  !!dong && String(dong.company_id) === companyId;

export const HANH_DONG_HO_SO_VAY = ['danh_gia', 'tao_ho_so', 'xem', 'ds', 'xuat'] as const;
export type HanhDongHoSoVay = (typeof HANH_DONG_HO_SO_VAY)[number];
export const laHanhDong = (x: unknown): x is HanhDongHoSoVay => (HANH_DONG_HO_SO_VAY as readonly string[]).includes(String(x));

/** Giới hạn tần suất mỗi người: đánh giá đọc cả năm giao dịch nên không cho dội. */
export const GIOI_HAN_HO_SO_VAY: Record<HanhDongHoSoVay, { cua_so_giay: number; toi_da: number }> = {
  danh_gia: { cua_so_giay: 60, toi_da: 10 },
  tao_ho_so: { cua_so_giay: 3600, toi_da: 20 },
  xem: { cua_so_giay: 60, toi_da: 60 },
  ds: { cua_so_giay: 60, toi_da: 60 },
  xuat: { cua_so_giay: 60, toi_da: 30 },
};
