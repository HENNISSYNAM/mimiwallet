/**
 * Nghĩa vụ suy ra từ DỮ KIỆN — bộ tối thiểu để chứng minh kiến trúc, chưa phải toàn bộ tuân thủ.
 *
 *   loại người nộp + trạng thái doanh nghiệp + nhóm hoạt động + doanh thu + lao động + luật hiệu lực
 *   = danh sách nghĩa vụ, mỗi cái có trạng thái và việc cần làm.
 *
 * NGUYÊN TẮC: thiếu dữ kiện thì trạng thái là `can_du_kien` kèm ĐÚNG MỘT câu hỏi và lý do hỏi —
 * không đoán "không áp dụng", không liệt kê mọi nghĩa vụ có thể có để người dùng tự lọc.
 *
 * Hàm thuần, tính khi đọc. CHƯA lưu bảng: nghĩa vụ ra từ dữ kiện, dữ kiện đổi thì nghĩa vụ đổi theo;
 * lưu sớm là có hai bản sự thật lệch nhau. Sẽ lưu khi cần theo dõi "đã làm xong" của từng kỳ.
 */
import type { SuyLuan } from '../luat/he-luat.ts';
import type { ChiaHoatDong } from '../doanh-thu/theo-hoat-dong.ts';
import { CHAN_KHAI_THUONG, TEN_TRANG_THAI, type TrangThaiDoanhNghiep } from '../doanh-nghiep/trang-thai.ts';

export type TrangThaiNghiaVu = 'ap_dung' | 'co_dieu_kien' | 'can_du_kien' | 'khong_ap_dung' | 'qua_han' | 'chua_ro';

export interface NghiaVu {
  ma: 'khai_thue_ky_toi' | 'xep_nhom_hoat_dong' | 'trang_thai_doanh_nghiep' | 'lao_dong_bhxh';
  ten: string;
  trang_thai: TrangThaiNghiaVu;
  vi_sao: string;
  han: string | null;
  can_cu: string[];
  /** Khi `can_du_kien`: đúng một câu hỏi, kèm vì sao câu trả lời quan trọng. */
  cau_hoi?: { cau: string; vi_sao: string };
  viec_tiep: string | null;
}

export interface DuKienNghiaVu {
  homNay: string;
  loai: 'ho_kinh_doanh' | 'doanh_nghiep' | null;
  trangThai: TrangThaiDoanhNghiep;
  suyLuan: SuyLuan | null;
  hoatDong: ChiaHoatDong | null;
  /** `companies.employee_count`: '1' = "Chỉ mình tôi"; khác là tổng số người (có thể gồm người nhà). */
  soNguoi: string | null;
}

export function tinhNghiaVu(dk: DuKienNghiaVu): NghiaVu[] {
  const ra: NghiaVu[] = [];

  // 1. Trạng thái doanh nghiệp — đặt đầu: nó thay đổi mọi nghĩa vụ phía sau.
  if (CHAN_KHAI_THUONG.includes(dk.trangThai)) {
    ra.push({
      ma: 'trang_thai_doanh_nghiep', ten: 'Xử lý trạng thái mã số thuế', trang_thai: 'ap_dung',
      vi_sao: `Cơ quan thuế ghi: ${TEN_TRANG_THAI[dk.trangThai]}. Khai thuế kỳ thường có thể không đúng thủ tục.`,
      han: null, can_cu: [], viec_tiep: 'Kiểm với cơ quan thuế quản lý trước khi lập tờ khai kỳ này.',
    });
  }

  // 2. Kỳ khai thuế tới — lấy thẳng từ hệ luật, không suy lại.
  const kl = dk.suyLuan?.ket_luan.find((k) => k.loai === 'nghia_vu' && (k.han ?? []).length);
  if (kl) {
    const han = (kl.han ?? []).find((h) => h >= dk.homNay) ?? (kl.han ?? [])[0] ?? null;
    ra.push({
      ma: 'khai_thue_ky_toi', ten: kl.mau ? `Khai thuế mẫu ${kl.mau}` : 'Khai thuế', trang_thai: han && han < dk.homNay ? 'qua_han' : 'ap_dung',
      vi_sao: kl.cau, han, can_cu: kl.can_cu, viec_tiep: 'Mở Tờ khai thuế để xem bản nháp.',
    });
  }

  // 3. Doanh thu chưa rõ nhóm hoạt động — chặn tờ khai của hộ kinh doanh.
  const cr = dk.hoatDong?.nhom.chua_ro;
  if (dk.loai === 'ho_kinh_doanh' && cr && cr.so_tien > 0) {
    ra.push({
      ma: 'xep_nhom_hoat_dong', ten: 'Xếp doanh thu vào nhóm hoạt động', trang_thai: 'ap_dung',
      vi_sao: `${Math.round(cr.so_tien).toLocaleString('vi-VN')}đ (${cr.so_khoan} khoản) chưa rõ nhóm; mỗi nhóm một dòng và một tỷ lệ thuế trên tờ khai.`,
      han: null, can_cu: ['tt50_mau_tkn', 'tt50_mau_cnkd'], viec_tiep: 'Xếp nhóm ở trang Tờ khai thuế.',
    });
  }

  // 4. Lao động / BHXH — thiếu dữ kiện thì HỎI, không kết luận.
  if (dk.soNguoi === '1') {
    ra.push({
      ma: 'lao_dong_bhxh', ten: 'Nghĩa vụ lao động, bảo hiểm xã hội', trang_thai: 'khong_ap_dung',
      vi_sao: 'Bạn cho biết chỉ có mình bạn làm, không thuê người lao động.', han: null, can_cu: [], viec_tiep: null,
    });
  } else {
    ra.push({
      ma: 'lao_dong_bhxh', ten: 'Nghĩa vụ lao động, bảo hiểm xã hội', trang_thai: dk.soNguoi ? 'co_dieu_kien' : 'can_du_kien',
      vi_sao: dk.soNguoi
        ? `Bạn cho biết có ${dk.soNguoi} người, nhưng chưa rõ ai là người lao động có hợp đồng — người nhà cùng làm thì khác.`
        : 'MIMI chưa biết bạn có thuê người lao động không.',
      han: null, can_cu: [],
      cau_hoi: {
        cau: 'Hiện bạn có thuê người lao động theo hợp đồng không?',
        vi_sao: 'Câu trả lời quyết định MIMI có cần theo dõi nghĩa vụ lao động và bảo hiểm xã hội cho bạn hay không.',
      },
      viec_tiep: 'Trả lời một câu hỏi.',
    });
  }

  return ra;
}
