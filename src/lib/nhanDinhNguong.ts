import { dinhDangTien } from './tien';

/**
 * Câu kết luận về ngưỡng 1 tỷ — KHÔNG kết luận quá sớm (29/09/2026).
 *
 * Thử bằng khách giả lập, chạy đúng mã MIMI (docs/PHAN_HOI_GIA_LAP_WTP.md):
 *  - Tiệm vàng bán chủ yếu tiền mặt: MIMI thấy 938 triệu, báo "chưa vượt 1 tỷ"; doanh thu thật 2,59 tỷ.
 *  - Tạp hoá vừa nhập sao kê: khoản vay 200 triệu chưa ai xác nhận đẩy lên 1,20 tỷ, báo "đã vượt";
 *    doanh thu thật 961 triệu.
 *  - Bán trên sàn: sàn trả tiền ròng (đã trừ phí), doanh thu tính thuế là giá bán — cao hơn.
 *
 * Hàm thuần: nhận số của `tax-summary`, trả câu nói và việc cần hỏi. Giao diện chỉ hiện.
 */

export type TienMat = 'gan_nhu_khong' | 'mot_phan' | 'phan_lon';

export type MucNguong = 'da_vuot' | 'co_the_chua_vuot' | 'co_the_vuot' | 'chua_ket_luan' | 'chua_vuot';

export interface VaoNhanDinh {
  doanhThu: number;
  nguong: number;
  /** Khoản chưa ai xác nhận mà MIMI đoán không phải doanh thu (vay, góp vốn, người nhà…). */
  goiYLoaiRa?: { so_tien: number; so_khoan: number } | null;
  /** Tiền sàn TMĐT trả về (ròng). */
  tienSan?: { so_tien: number; so_khoan: number } | null;
  /** Câu trả lời trong hồ sơ; null/undefined = chưa hỏi. */
  tienMat?: TienMat | null;
}

export interface NhanDinh {
  muc: MucNguong;
  cau: string;
  /** Hiện câu hỏi "khách trả tiền mặt nhiều không?". */
  hoiTienMat: boolean;
  /** Ghi chú thêm về tiền sàn, nếu có. */
  ghiChuSan: string | null;
}

export function nhanDinhNguong(v: VaoNhanDinh): NhanDinh {
  const { doanhThu, nguong } = v;
  const loaiRa = v.goiYLoaiRa?.so_tien ?? 0;
  const soLoaiRa = v.goiYLoaiRa?.so_khoan ?? 0;
  const ghiChuSan = (v.tienSan?.so_tien ?? 0) > 0
    ? `${dinhDangTien(v.tienSan!.so_tien)} là tiền sàn thương mại điện tử trả về, đã trừ phí. Doanh thu tính thuế là giá bán trước phí — cao hơn số này; lấy số từ báo cáo của sàn.`
    : null;

  if (doanhThu > nguong) {
    if (loaiRa > 0 && doanhThu - loaiRa <= nguong) {
      return {
        muc: 'co_the_chua_vuot',
        cau: `Có thể CHƯA vượt: ${dinhDangTien(loaiRa)} trong số này (${soLoaiRa} khoản) giống tiền vay, góp vốn hoặc tiền người nhà nhưng chưa ai xác nhận. Xác nhận các khoản đó để biết chắc.`,
        hoiTienMat: false, ghiChuSan,
      };
    }
    return { muc: 'da_vuot', cau: 'Đã vượt ngưỡng 1 tỷ theo tiền vào tài khoản.', hoiTienMat: false, ghiChuSan };
  }

  const conLai = nguong - doanhThu;
  if (v.tienMat === 'phan_lon') {
    return {
      muc: 'co_the_vuot',
      cau: `Có thể ĐÃ vượt: bạn nói phần lớn khách trả tiền mặt, mà MIMI chỉ thấy tiền qua ngân hàng. Nếu tiền mặt thu trong năm hơn ${dinhDangTien(conLai)} thì bạn đã vượt 1 tỷ — cộng theo sổ bán hàng trước khi kết luận.`,
      hoiTienMat: false, ghiChuSan,
    };
  }
  if (v.tienMat === 'mot_phan') {
    return {
      muc: 'chua_ket_luan',
      cau: `Số này chưa gồm tiền mặt. Nếu tiền mặt thu trong năm hơn ${dinhDangTien(conLai)} thì bạn đã vượt 1 tỷ.`,
      hoiTienMat: false, ghiChuSan,
    };
  }
  if (v.tienMat === 'gan_nhu_khong') {
    return { muc: 'chua_vuot', cau: 'Chưa vượt ngưỡng 1 tỷ.', hoiTienMat: false, ghiChuSan };
  }
  return {
    muc: 'chua_ket_luan',
    cau: 'Chưa kết luận được: MIMI chỉ thấy tiền qua ngân hàng. Khách của bạn có hay trả tiền mặt không?',
    hoiTienMat: true, ghiChuSan,
  };
}
