/**
 * Kế hoạch xoá tài khoản: công ty nào bị xoá theo, công ty nào phải sống tiếp.
 *
 * `companies.user_id` là ON DELETE CASCADE tới `auth.users`: xoá người TẠO công ty là xoá cả công ty,
 * kể cả khi còn kế toán và chủ khác đang dùng. Xoá tệp Storage theo cùng quy tắc đó sẽ xoá dữ liệu
 * của những người không hề xoá tài khoản. Nên:
 *
 *   - công ty do người này tạo và KHÔNG còn thành viên nào khác  → xoá công ty và toàn bộ tệp;
 *   - công ty do người này tạo nhưng còn thành viên khác         → chuyển `companies.user_id` sang một
 *     thành viên còn lại (ưu tiên chủ sở hữu, rồi quản trị…, rồi vào sớm nhất) để CASCADE không cuốn
 *     công ty đi; tệp giữ nguyên;
 *   - công ty người này chỉ là thành viên                        → dòng thành viên tự mất theo CASCADE;
 *     tệp giữ nguyên.
 *
 * Hàm thuần: nơi gọi đọc dữ liệu rồi hỏi ở đây.
 */

import type { VaiTro } from '../quyen/vai-tro.ts';

export interface DongThanhVienKeHoach {
  company_id: string;
  user_id: string;
  vai_tro: VaiTro | string;
  tao_luc?: string | null;
}

export interface KeHoachXoaTaiKhoan {
  /** Công ty bị xoá theo (không còn ai khác): dọn tệp rồi để CASCADE xoá dòng. */
  cong_ty_xoa: string[];
  /** Công ty còn người khác: phải đổi `companies.user_id` TRƯỚC khi xoá tài khoản. */
  chuyen_nguoi_tao: { company_id: string; user_id_moi: string; vai_tro_moi: string }[];
  /** Trong các công ty ở trên, những công ty sẽ không còn chủ sở hữu nào sau khi người này đi. */
  can_chu_moi: string[];
}

const THU_TU_VAI_TRO = ['chu_so_huu', 'quan_tri', 'nguoi_duyet', 'ke_toan', 'nguoi_xem'];
const hang = (v: string) => {
  const i = THU_TU_VAI_TRO.indexOf(v);
  return i === -1 ? THU_TU_VAI_TRO.length : i;
};

export function lapKeHoachXoaTaiKhoan(p: {
  userId: string;
  /** Id các công ty có `companies.user_id = userId`. */
  congTyDoNguoiTao: string[];
  /** Dòng thành viên của các công ty đó (có thể kèm cả dòng của chính người xoá). */
  thanhVien: DongThanhVienKeHoach[];
}): KeHoachXoaTaiKhoan {
  const kq: KeHoachXoaTaiKhoan = { cong_ty_xoa: [], chuyen_nguoi_tao: [], can_chu_moi: [] };
  for (const id of [...new Set(p.congTyDoNguoiTao)].sort()) {
    const khac = p.thanhVien.filter((t) => t.company_id === id && t.user_id !== p.userId);
    if (khac.length === 0) {
      kq.cong_ty_xoa.push(id);
      continue;
    }
    const nguoiKe = [...khac].sort((a, b) =>
      hang(a.vai_tro) - hang(b.vai_tro)
      || String(a.tao_luc ?? '').localeCompare(String(b.tao_luc ?? ''))
      || a.user_id.localeCompare(b.user_id))[0];
    kq.chuyen_nguoi_tao.push({ company_id: id, user_id_moi: nguoiKe.user_id, vai_tro_moi: String(nguoiKe.vai_tro) });
    if (!khac.some((t) => t.vai_tro === 'chu_so_huu')) kq.can_chu_moi.push(id);
  }
  return kq;
}

/** Thư mục Storage cần dọn: id công ty bị xoá theo, cộng thư mục mang id người dùng (nếu sau này có). */
export function thuMucCanDon(userId: string, kh: KeHoachXoaTaiKhoan): string[] {
  return [...kh.cong_ty_xoa, userId];
}
