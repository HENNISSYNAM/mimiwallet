import { GIU_NGUOI_NHAN_MOI_MS, TEN_NHOM_CHI, type NhomChi } from './tacTu';

/**
 * Viết chính sách chi thành chữ, từ đúng các trường mà `xetYeuCau` đọc.
 *
 * Mỗi câu nói rõ hậu quả — "bị từ chối" hay "phải có người duyệt" — và hậu quả
 * đó phải khớp luật trong `_shared/tac-tu/chinh-sach.ts`: vượt hạn mức, sai nhóm
 * chi, người nhận ngoài danh sách (khi chặn), quá tần suất, hết hạn → từ chối;
 * trên ngưỡng, người nhận mới thêm, đổi số tài khoản → hỏi. Sửa luật bên đó thì
 * sửa câu bên này.
 */

export interface ChinhSachDoc {
  han_muc_moi_lan: number;
  han_muc_ngay: number;
  han_muc_thang: number;
  nguong_can_duyet: number;
  nhom_chi_duoc_phep: string[] | null;
  chi_tra_nguoi_nhan_da_duyet: boolean;
  het_han: string | null;
  so_yeu_cau_moi_gio: number | null;
}

export const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

const ngayVN = (iso: string) =>
  new Date(iso).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });

const tenNhom = (ds: string[]) => ds.map((n) => TEN_NHOM_CHI[n as NhomChi] ?? n).join(', ');

/** Giá trị ngắn hiện ở cuối mỗi hàng cài đặt. */
export function tomTatChinhSach(cs: ChinhSachDoc, soNguoiNhan: number) {
  return {
    duyet: cs.nguong_can_duyet === 0 ? 'Mọi khoản' : `Trên ${dong(cs.nguong_can_duyet)}`,
    'nguoi-la': cs.chi_tra_nguoi_nhan_da_duyet ? 'Từ chối' : 'Hỏi tôi duyệt',
    'han-muc': `${dong(cs.han_muc_moi_lan)} / khoản`,
    'tan-suat': cs.so_yeu_cau_moi_gio == null ? 'Không giới hạn' : `${cs.so_yeu_cau_moi_gio} / giờ`,
    'het-han': cs.het_han ? `Tới ${ngayVN(cs.het_han)}` : 'Không hết hạn',
    'nhom-chi': cs.nhom_chi_duoc_phep === null ? 'Mọi nhóm' : `${cs.nhom_chi_duoc_phep.length} nhóm`,
    'nguoi-nhan': `${soNguoiNhan} tài khoản`,
  };
}

export function vanBanChinhSach(cs: ChinhSachDoc): string[] {
  const gioGiu = GIU_NGUOI_NHAN_MOI_MS / 3_600_000;
  return [
    `Mỗi khoản tối đa ${dong(cs.han_muc_moi_lan)}, mỗi ngày tối đa ${dong(cs.han_muc_ngay)}, mỗi tháng tối đa ${dong(cs.han_muc_thang)}. Khoản đang chờ duyệt cũng tính vào phần đã dùng. Vượt hạn mức thì yêu cầu bị từ chối.`,
    cs.nguong_can_duyet === 0
      ? 'Mọi khoản đều phải có người duyệt.'
      : `Khoản trên ${dong(cs.nguong_can_duyet)} phải có người duyệt. Khoản từ ${dong(cs.nguong_can_duyet)} trở xuống được tự duyệt nếu đạt mọi luật khác.`,
    cs.nhom_chi_duoc_phep === null
      ? 'Được chi cho mọi nhóm chi.'
      : `Chỉ được chi cho các nhóm: ${tenNhom(cs.nhom_chi_duoc_phep)}. Nhóm khác bị từ chối.`,
    cs.chi_tra_nguoi_nhan_da_duyet
      ? 'Chỉ chi cho tài khoản trong danh sách người nhận được phép. Tài khoản khác bị từ chối.'
      : 'Tài khoản ngoài danh sách người nhận được phép phải có người duyệt.',
    cs.so_yeu_cau_moi_gio == null
      ? 'Không giới hạn số yêu cầu mỗi giờ.'
      : `Tối đa ${cs.so_yeu_cau_moi_gio} yêu cầu mỗi giờ. Quá số này thì yêu cầu bị từ chối.`,
    `Người nhận thêm vào danh sách chưa đủ ${gioGiu} giờ thì không được tự duyệt.`,
    'Cùng tên người nhận với một khoản đã duyệt trong 180 ngày qua nhưng khác số tài khoản thì phải có người duyệt, kèm cảnh báo.',
    cs.het_han
      ? `Chính sách hết hiệu lực sau ngày ${ngayVN(cs.het_han)}. Sau đó mọi yêu cầu bị từ chối cho tới khi gia hạn.`
      : 'Chính sách không có ngày hết hạn.',
    'MIMI không giữ và không chuyển tiền. Khoản đã duyệt được trả trong ứng dụng ngân hàng, và chỉ thành "Đã chi" khi sao kê xác nhận.',
  ];
}
