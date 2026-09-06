/**
 * Hai cách tính thuế cho hộ kinh doanh 500 triệu – 3 tỷ, và cách nào rẻ hơn.
 *
 * VÌ SAO TỒN TẠI. Từ 01/01/2026 hết thuế khoán. Hộ có doanh thu 500 triệu đến
 * 3 tỷ **được chọn** một trong hai cách tính, và chọn sai là mất tiền thật:
 *
 *   Theo lợi nhuận  — 15% trên phần lãi, CHỈ khi xác định được chi phí đầu vào.
 *   Theo doanh thu  — 0,5% đến 2% trên doanh thu, tuỳ ngành, khi không xác
 *                     định được chi phí.
 *
 * Nguồn: Nghị quyết 198/2025/QH15 và hướng dẫn kèm theo. Tra ngày 04/09/2026.
 *
 * Hiểu để chọn thì cần kiến thức thuế mà phần lớn chủ hộ không có — đó chính
 * là nỗi đau, chứ không phải việc bấm nút. Nên hàm này tính cả hai và nói ra
 * một câu: cách nào rẻ hơn, rẻ hơn bao nhiêu.
 *
 * VÀ CÂU QUAN TRỌNG NHẤT KHÔNG PHẢI "CÁCH NÀO RẺ HƠN". Là: *còn thiếu bao nhiêu
 * chứng từ nữa thì cách lợi nhuận trở nên rẻ hơn.* Con số đó biến một quyết
 * định mù thành một việc làm được — đi tìm thêm hoá đơn đầu vào, và biết tìm
 * tới mức nào thì đủ.
 *
 * ĐÂY LÀ ƯỚC TÍNH, KHÔNG PHẢI XÁC ĐỊNH THUẾ. Cùng kỷ luật với `tax-summary`:
 * tính ra một con số không có nghĩa là con số đó thay được cơ quan thuế. Ba
 * điều hàm này CỐ Ý không làm:
 *
 *   - Không đoán tỷ lệ ngành. `tyLeNganh` phải do bên gọi truyền vào, vì nó
 *     thay đổi theo ngành nghề và đoán sai là sai tiền.
 *   - Không tính thuế GTGT. Đây chỉ là phần thuế thu nhập cá nhân.
 *   - Không tự coi mọi khoản chi là chi phí được trừ. Chỉ nhận phần đã có
 *     chứng từ, do bên gọi đếm.
 */

/** Ngưỡng doanh thu năm không phải nộp thuế — nâng từ 200 triệu lên 500 triệu. */
export const NGUONG_MIEN = 500_000_000;

/** Trần của nhóm được quyền chọn cách tính. */
export const TRAN_NHOM_CHON = 3_000_000_000;

/** Thuế suất trên phần lãi, khi xác định được chi phí đầu vào. */
export const TY_LE_TREN_LAI = 0.15;

/** Khoảng tỷ lệ trên doanh thu, tuỳ ngành nghề. */
export const TY_LE_DOANH_THU = { min: 0.005, max: 0.02 } as const;

export interface DauVao {
  /** Doanh thu năm, đồng. */
  doanhThu: number;
  /** Chi phí ĐÃ CÓ CHỨNG TỪ, đồng. Không phải mọi khoản chi. */
  chiPhiCoChungTu: number;
  /**
   * Tỷ lệ trên doanh thu áp cho ngành của hộ này, dạng thập phân (0.015 = 1,5%).
   *
   * Bắt buộc truyền vào, không có mặc định: tỷ lệ thay đổi theo ngành nghề và
   * đoán hộ là đoán sai tiền của người khác.
   */
  tyLeNganh: number;
}

export type KetLuan =
  | 'ngoai_pham_vi'   // dưới ngưỡng miễn, hoặc trên trần nhóm được chọn
  | 'loi_nhuan_re_hon'
  | 'doanh_thu_re_hon'
  | 'bang_nhau';

export interface KetQua {
  ketLuan: KetLuan;
  /** Thuế nếu tính theo lợi nhuận. `null` khi không áp dụng được. */
  theoLoiNhuan: number | null;
  /** Thuế nếu tính theo tỷ lệ doanh thu. `null` khi ngoài phạm vi. */
  theoDoanhThu: number | null;
  /** Chênh lệch tuyệt đối giữa hai cách. `null` khi không so được. */
  chenhLech: number | null;
  /**
   * Cần thêm bao nhiêu đồng chi phí CÓ CHỨNG TỪ nữa thì cách lợi nhuận rẻ hơn.
   *
   * `null` khi cách lợi nhuận đã rẻ hơn rồi, hoặc khi ngoài phạm vi. Đây là con
   * số biến một quyết định mù thành một việc làm được.
   */
  chungTuConThieu: number | null;
  /** Câu giải thích, viết cho người không biết gì về thuế. */
  cau: string;
}

const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

export function soSanhThue(v: DauVao): KetQua {
  const { doanhThu, chiPhiCoChungTu, tyLeNganh } = v;

  if (doanhThu < NGUONG_MIEN) {
    return {
      ketLuan: 'ngoai_pham_vi', theoLoiNhuan: null, theoDoanhThu: null,
      chenhLech: null, chungTuConThieu: null,
      cau: `Doanh thu dưới ${dong(NGUONG_MIEN)} một năm thì chưa phải nộp thuế thu nhập cá nhân.`,
    };
  }

  if (doanhThu > TRAN_NHOM_CHON) {
    return {
      ketLuan: 'ngoai_pham_vi', theoLoiNhuan: null, theoDoanhThu: null,
      chenhLech: null, chungTuConThieu: null,
      cau: `Trên ${dong(TRAN_NHOM_CHON)} một năm thì không còn được chọn cách tính. Cần kế toán xem giúp.`,
    };
  }

  const lai = doanhThu - chiPhiCoChungTu;
  // Lỗ thì không có phần lãi để đánh thuế. Không trả số âm.
  const theoLoiNhuan = Math.max(0, lai) * TY_LE_TREN_LAI;
  const theoDoanhThu = doanhThu * tyLeNganh;
  const chenhLech = Math.abs(theoLoiNhuan - theoDoanhThu);

  if (theoLoiNhuan < theoDoanhThu) {
    return {
      ketLuan: 'loi_nhuan_re_hon', theoLoiNhuan, theoDoanhThu, chenhLech,
      chungTuConThieu: null,
      cau: `Tính theo lợi nhuận rẻ hơn ${dong(chenhLech)}. Chi phí bạn đang chứng minh được đã đủ để chọn cách này.`,
    };
  }

  if (theoLoiNhuan > theoDoanhThu) {
    /*
     * Cần thêm bao nhiêu chứng từ nữa để hoà? Giải theo lãi:
     *   0.15 × (doanhThu − chiPhi) = tyLeNganh × doanhThu
     *   chiPhi = doanhThu × (1 − tyLeNganh / 0.15)
     * Phần thiếu là hiệu so với chi phí đang có.
     */
    const chiPhiCanCo = doanhThu * (1 - tyLeNganh / TY_LE_TREN_LAI);
    const conThieu = Math.max(0, chiPhiCanCo - chiPhiCoChungTu);
    return {
      ketLuan: 'doanh_thu_re_hon', theoLoiNhuan, theoDoanhThu, chenhLech,
      chungTuConThieu: conThieu,
      cau:
        `Hiện tính theo tỷ lệ doanh thu rẻ hơn ${dong(chenhLech)}. ` +
        `Nếu gom thêm được ${dong(conThieu)} chi phí có chứng từ thì hai cách hoà nhau, ` +
        'quá mức đó thì tính theo lợi nhuận bắt đầu có lợi.',
    };
  }

  return {
    ketLuan: 'bang_nhau', theoLoiNhuan, theoDoanhThu, chenhLech: 0,
    chungTuConThieu: 0,
    cau: 'Hai cách ra cùng một số. Chọn cách nào cũng được.',
  };
}
