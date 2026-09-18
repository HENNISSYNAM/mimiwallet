/**
 * MIMI-P1-003 — vai trò nào thấy nút nào.
 *
 * Backend đã chặn hành động (`company.ts` → `kiemQuyen`), nên đây KHÔNG phải lớp bảo vệ; nó chỉ
 * để người xem không nhìn thấy nút "Duyệt 12.000.000 ₫" rồi bấm vào và nhận lỗi. Bày một nút
 * không bấm được là hứa một việc sản phẩm không cho làm.
 *
 * Hàm thuần, dùng chung cho câu trả lời của trợ lý và màn đầu.
 */
import type { DeXuat, KetQuaNangLuc, LoaiDeXuat, PhanTichNhanh } from '../tro-ly/kieu.ts';
import { duocLam, type HanhDong, type VaiTro } from './vai-tro.ts';

/** Mỗi loại đề xuất tương ứng một hành động cần quyền. */
export const QUYEN_DE_XUAT: Record<LoaiDeXuat, HanhDong> = {
  duyet_yeu_cau: 'duyet_chi',
  tu_choi_yeu_cau: 'duyet_chi',
  tam_dung_agent: 'quan_ly_agent',
  dong_bo_chi_phi_ai: 'dong_bo_du_lieu',
  cap_nhat_bang_gia: 'dong_bo_du_lieu',
  dong_bo_ngan_hang: 'dong_bo_du_lieu',
  luu_chung_tu_quet: 'ghi_chung_tu',
  mo_trang: 'xem',
};

export const deXuatDuocPhep = (dx: DeXuat, vai: VaiTro): boolean => duocLam(vai, QUYEN_DE_XUAT[dx.loai]);

/** Bỏ các nút vai trò này không được bấm, giữ nguyên số liệu và câu chữ. */
export function locDeXuat(ds: KetQuaNangLuc[], vai: VaiTro): KetQuaNangLuc[] {
  return ds.map((r) => ({ ...r, de_xuat: r.de_xuat.filter((dx) => deXuatDuocPhep(dx, vai)) }));
}

/** Màn đầu: thẻ "cần bạn xác nhận" bỏ nút duyệt khi vai trò không được duyệt. */
export function locPhanTich(p: PhanTichNhanh, vai: VaiTro): PhanTichNhanh {
  return {
    ...p,
    can_xac_nhan: {
      ...p.can_xac_nhan,
      muc: p.can_xac_nhan.muc.map((m) => ({ ...m, duyet: m.duyet && deXuatDuocPhep(m.duyet, vai) ? m.duyet : null })),
    },
  };
}
