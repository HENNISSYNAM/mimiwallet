/**
 * DANH BẠ CỔNG CƠ QUAN (12/10/2026) — "kết nối tới cơ quan liên quan" của đề BTL86-58.
 *
 * MIMI không có kết nối máy-với-máy tới cơ quan thuế / đăng ký kinh doanh (không có quyền, không giả vờ có).
 * Thứ MIMI làm được và làm đúng: đưa người dùng tới ĐÚNG cổng cho ĐÚNG việc, nói trước cần gì để đăng nhập,
 * các bước chung, và việc phải làm sau khi nộp (lưu thông báo tiếp nhận, nộp tiền trước hạn).
 *
 * Mỗi đường dẫn đã mở thử và trả HTTP 200 ngày `KIEM_LUC`. Bước làm viết ở mức chung (không gọi tên từng
 * nút trên cổng — giao diện cổng đổi thì câu vẫn đúng). Hàm thuần, dùng chung cho giao diện và trợ lý.
 */

export const KIEM_LUC = '2026-10-12';

export type ViecCoQuan = 'nop_to_khai' | 'nop_tien_thue' | 'hoa_don_dien_tu' | 'dang_ky_kinh_doanh' | 'bao_hiem_xa_hoi' | 'tra_cuu_mst';
export type LoaiNguoiNop = 'ho_kinh_doanh' | 'doanh_nghiep';

export interface CongCoQuan {
  id: string;
  ten: string;
  co_quan: string;
  url: string;
  /** Cần gì để đăng nhập/nộp — nói trước để người dùng chuẩn bị. */
  can: string[];
}

export const CONG: Record<string, CongCoQuan> = {
  thue_dien_tu: {
    id: 'thue_dien_tu', ten: 'Thuế điện tử (eTax) — doanh nghiệp', co_quan: 'Cục Thuế', url: 'https://thuedientu.gdt.gov.vn',
    can: ['Mã số thuế và mật khẩu tài khoản thuế điện tử', 'Chữ ký số (USB token hoặc chữ ký số từ xa) để ký tờ khai'],
  },
  thue_ca_nhan: {
    id: 'thue_ca_nhan', ten: 'Thuế điện tử — cá nhân, hộ kinh doanh', co_quan: 'Cục Thuế', url: 'https://canhan.gdt.gov.vn',
    can: ['Mã số thuế (hoặc số định danh cá nhân) và mật khẩu', 'Điện thoại nhận mã OTP'],
  },
  dich_vu_cong_thue: {
    id: 'dich_vu_cong_thue', ten: 'Dịch vụ công của ngành thuế', co_quan: 'Cục Thuế', url: 'https://dichvucong.gdt.gov.vn/tthc/homelogin',
    can: ['Tài khoản thuế điện tử hoặc tài khoản định danh điện tử (VNeID)'],
  },
  hoa_don: {
    id: 'hoa_don', ten: 'Hệ thống hoá đơn điện tử', co_quan: 'Cục Thuế', url: 'https://hoadondientu.gdt.gov.vn',
    can: ['Mã số thuế và tài khoản đăng nhập hệ thống hoá đơn'],
  },
  dang_ky_kd: {
    id: 'dang_ky_kd', ten: 'Cổng thông tin quốc gia về đăng ký doanh nghiệp', co_quan: 'Cơ quan đăng ký kinh doanh', url: 'https://dangkykinhdoanh.gov.vn',
    can: ['Tài khoản định danh điện tử (VNeID) hoặc tài khoản đăng ký kinh doanh', 'Bản scan hồ sơ đã ký (PDF)'],
  },
  dich_vu_cong_qg: {
    id: 'dich_vu_cong_qg', ten: 'Cổng Dịch vụ công quốc gia', co_quan: 'Văn phòng Chính phủ', url: 'https://dichvucong.gov.vn',
    can: ['Tài khoản định danh điện tử (VNeID)'],
  },
  bhxh: {
    id: 'bhxh', ten: 'Dịch vụ công Bảo hiểm xã hội', co_quan: 'Bảo hiểm xã hội Việt Nam', url: 'https://dichvucong.baohiemxahoi.gov.vn',
    can: ['Mã đơn vị BHXH và tài khoản giao dịch điện tử'],
  },
  tra_cuu_mst: {
    id: 'tra_cuu_mst', ten: 'Tra cứu thông tin người nộp thuế', co_quan: 'Cục Thuế', url: 'https://tracuunnt.gdt.gov.vn/tcnnt/mstdn.jsp',
    can: ['Mã số thuế cần tra'],
  },
};

export interface HuongDanNop {
  viec: ViecCoQuan;
  cong: CongCoQuan[];
  truoc: string[];
  buoc: string[];
  sau: string[];
}

/** Cổng và các bước cho một việc, theo loại người nộp. */
export function huongDanCoQuan(viec: ViecCoQuan, loai: LoaiNguoiNop): HuongDanNop {
  switch (viec) {
    case 'nop_to_khai':
      return {
        viec,
        cong: loai === 'doanh_nghiep' ? [CONG.thue_dien_tu, CONG.dich_vu_cong_thue] : [CONG.thue_ca_nhan, CONG.dich_vu_cong_thue],
        truoc: [
          'Đối chiếu từng chỉ tiêu trên cổng với bản MIMI đã xuất (bảng số liệu tải kèm).',
          'Kiểm mã số thuế đăng nhập đúng là của người nộp trên tờ khai.',
          loai === 'doanh_nghiep' ? 'Cắm chữ ký số (hoặc mở ứng dụng ký số từ xa) trước khi nộp.' : 'Mở sẵn điện thoại để nhận mã OTP.',
        ],
        buoc: [
          'Đăng nhập cổng, vào phần khai thuế.',
          'Chọn đúng mẫu tờ khai và kỳ tính thuế như trên bản MIMI.',
          'Nhập số theo bảng số liệu (hoặc dùng "Điền hộ lên cổng" nếu đã bật).',
          'Kiểm lại, ký và nộp. Tự bạn ký và bấm nộp — MIMI không ký, không nộp thay.',
        ],
        sau: [
          'Tải thông báo tiếp nhận / thông báo chấp nhận của cơ quan thuế.',
          'Lưu thông báo đó vào MIMI (Tài liệu → ghi nhận đã nộp) để có bằng chứng và để MIMI ngừng nhắc.',
          'Nếu có số thuế phải nộp: nộp tiền trước hạn (xem mục "Nộp tiền thuế").',
        ],
      };
    case 'nop_tien_thue':
      return {
        viec,
        cong: loai === 'doanh_nghiep' ? [CONG.thue_dien_tu] : [CONG.thue_ca_nhan],
        truoc: ['Biết số tiền, tiểu mục và kỳ thuế cần nộp (lấy từ tờ khai hoặc thông báo của cơ quan thuế).'],
        buoc: ['Đăng nhập cổng thuế, lập giấy nộp tiền vào ngân sách.', 'Chọn ngân hàng liên kết và xác nhận thanh toán.'],
        sau: ['Lưu chứng từ nộp tiền (giấy nộp tiền có xác nhận của ngân hàng) vào MIMI.'],
      };
    case 'hoa_don_dien_tu':
      return {
        viec, cong: [CONG.hoa_don],
        truoc: ['Có ký hiệu mẫu, ký hiệu hoá đơn, số hoá đơn và mã số thuế người bán.'],
        buoc: ['Vào hệ thống hoá đơn điện tử, mục tra cứu hoá đơn, nhập thông tin hoá đơn để kiểm.'],
        sau: ['Lưu tệp XML và kết quả tra cứu cùng chứng từ chi phí trong MIMI.'],
      };
    case 'dang_ky_kinh_doanh':
      return {
        viec, cong: [CONG.dang_ky_kd, CONG.dich_vu_cong_qg],
        truoc: ['Soạn đủ hồ sơ theo loại hình (MIMI → Đăng ký kinh doanh), ký và scan thành PDF.'],
        buoc: ['Đăng nhập cổng đăng ký doanh nghiệp, tạo hồ sơ mới theo loại hình.', 'Tải lên các tệp PDF đã ký, nộp và theo dõi trạng thái xử lý.'],
        sau: ['Lưu giấy chứng nhận / thông báo của cơ quan đăng ký vào MIMI, rồi nhập mã số doanh nghiệp vào Cài đặt.'],
      };
    case 'bao_hiem_xa_hoi':
      return {
        viec, cong: [CONG.bhxh],
        truoc: ['Danh sách người lao động và mức lương đóng bảo hiểm.'],
        buoc: ['Đăng nhập cổng BHXH, lập hồ sơ báo tăng/giảm hoặc nộp hồ sơ theo kỳ.'],
        sau: ['Lưu thông báo kết quả vào MIMI.'],
      };
    case 'tra_cuu_mst':
      return { viec, cong: [CONG.tra_cuu_mst], truoc: [], buoc: ['Nhập mã số thuế và mã xác nhận để xem trạng thái người nộp thuế.'], sau: [] };
  }
}
