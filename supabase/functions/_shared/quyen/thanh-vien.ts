import { duocLam, TEN_VAI_TRO, type VaiTro } from './vai-tro.ts';

/**
 * MIMI-P1-003 (phần quản lý thành viên) — ai được mời, đổi vai trò, gỡ ai.
 *
 * Hàm thuần: edge function `cong-ty` đọc dữ liệu rồi hỏi ở đây. Tách ra để mọi luật có test,
 * vì đây là chỗ một lỗi nhỏ cho người ngoài quyền duyệt chi.
 *
 * Bốn luật:
 *   1. Chỉ vai trò có `quan_ly_thanh_vien` (chủ doanh nghiệp, quản trị) được mời, đổi, gỡ người khác.
 *   2. Vai trò "cao" (chủ doanh nghiệp, quản trị) chỉ chủ doanh nghiệp mới trao, đổi hoặc gỡ được — quản trị
 *      không tự nâng người khác ngang mình, cũng không gỡ được chủ.
 *   3. Không tự đổi vai trò hay tự gỡ mình bằng các thao tác đó (dùng "Rời công ty").
 *   4. Công ty luôn còn ít nhất một chủ doanh nghiệp.
 */

export type ThaoTacThanhVien = 'moi' | 'doi_vai_tro' | 'go_bo' | 'roi';

const VAI_TRO_CAO: ReadonlySet<VaiTro> = new Set(['chu_so_huu', 'quan_tri']);

export interface TuChoi {
  ma: string;
  cau: string;
}

export function kiemThaoTac(p: {
  thaoTac: ThaoTacThanhVien;
  nguoiLam: { id: string; vai_tro: VaiTro };
  /** Người bị tác động; null khi mời người chưa là thành viên. */
  doiTuong: { id: string; vai_tro: VaiTro } | null;
  vaiTroMoi?: VaiTro | null;
  soChuSoHuu: number;
}): TuChoi | null {
  const { thaoTac, nguoiLam, doiTuong, vaiTroMoi, soChuSoHuu } = p;

  if (thaoTac === 'roi') {
    if (nguoiLam.vai_tro === 'chu_so_huu' && soChuSoHuu <= 1) {
      return { ma: 'CHU_CUOI', cau: 'Bạn là chủ doanh nghiệp duy nhất. Trao vai trò chủ doanh nghiệp cho người khác trước khi rời công ty.' };
    }
    return null;
  }

  if (!duocLam(nguoiLam.vai_tro, 'quan_ly_thanh_vien')) {
    return { ma: 'KHONG_DU_QUYEN', cau: `Vai trò ${TEN_VAI_TRO[nguoiLam.vai_tro]} không quản lý được thành viên. Chỉ chủ doanh nghiệp hoặc quản trị làm được.` };
  }

  if (thaoTac === 'moi') {
    if (doiTuong) return { ma: 'DA_LA_THANH_VIEN', cau: 'Người này đã là thành viên của công ty.' };
    if (!vaiTroMoi) return { ma: 'THAM_SO', cau: 'Chọn vai trò cho người được mời.' };
    if (VAI_TRO_CAO.has(vaiTroMoi) && nguoiLam.vai_tro !== 'chu_so_huu') {
      return { ma: 'KHONG_DU_QUYEN', cau: `Chỉ chủ doanh nghiệp mới trao được vai trò ${TEN_VAI_TRO[vaiTroMoi]}.` };
    }
    return null;
  }

  if (!doiTuong) return { ma: 'KHONG_THAY', cau: 'Người này không phải thành viên của công ty.' };
  if (doiTuong.id === nguoiLam.id) {
    return { ma: 'TU_MINH', cau: 'Không tự đổi vai trò hay tự gỡ mình. Muốn rời công ty thì dùng "Rời công ty".' };
  }
  if (VAI_TRO_CAO.has(doiTuong.vai_tro) && nguoiLam.vai_tro !== 'chu_so_huu') {
    return { ma: 'KHONG_DU_QUYEN', cau: `Chỉ chủ doanh nghiệp mới đổi hoặc gỡ được ${TEN_VAI_TRO[doiTuong.vai_tro].toLowerCase()}.` };
  }

  if (thaoTac === 'doi_vai_tro') {
    if (!vaiTroMoi) return { ma: 'THAM_SO', cau: 'Chọn vai trò mới.' };
    if (vaiTroMoi === doiTuong.vai_tro) return { ma: 'KHONG_DOI', cau: 'Người này đã có vai trò đó.' };
    if (VAI_TRO_CAO.has(vaiTroMoi) && nguoiLam.vai_tro !== 'chu_so_huu') {
      return { ma: 'KHONG_DU_QUYEN', cau: `Chỉ chủ doanh nghiệp mới trao được vai trò ${TEN_VAI_TRO[vaiTroMoi]}.` };
    }
  }

  // Gỡ hoặc hạ vai trò chủ doanh nghiệp cuối cùng thì công ty không còn ai làm chủ.
  const boChu = doiTuong.vai_tro === 'chu_so_huu' && (thaoTac === 'go_bo' || vaiTroMoi !== 'chu_so_huu');
  if (boChu && soChuSoHuu <= 1) {
    return { ma: 'CHU_CUOI', cau: 'Công ty phải còn ít nhất một chủ doanh nghiệp.' };
  }
  return null;
}

/** Email chuẩn hoá để so: bỏ khoảng trắng, chữ thường. */
export const chuanEmail = (e: string) => e.trim().toLowerCase();
export const laEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
