/**
 * Hai cách tính thuế thu nhập cá nhân cho hộ kinh doanh trên 01 tỷ đến 3 tỷ, và
 * cách nào rẻ hơn.
 *
 * VÌ SAO TỒN TẠI. Từ 01/01/2026 hết thuế khoán. Hộ có doanh thu năm trên 01 tỷ
 * đến 3 tỷ **được chọn** một trong hai cách tính, và chọn sai là mất tiền thật:
 *
 *   Theo thu nhập — 15% × (doanh thu − chi phí), CHỈ khi xác định được chi phí.
 *   Theo tỷ lệ    — (doanh thu − 01 tỷ) × tỷ lệ ngành. Phần 01 tỷ được trừ
 *                   TRƯỚC khi nhân, không nhân trên toàn bộ doanh thu.
 *
 * NGUỒN, tra ngày 10/09/2026:
 *   - Luật Thuế thu nhập cá nhân số 109/2025/QH15: quyền chọn hai cách, và mức
 *     không chịu thuế được "trừ trước khi tính thuế theo tỷ lệ trên doanh thu"
 *     (bài giới thiệu luật trên xaydungchinhsach.chinhphu.vn).
 *   - Nghị định 68/2026/NĐ-CP, sửa bởi Nghị định 141/2026/NĐ-CP ngày 29/04/2026:
 *     đổi "500 triệu đồng" thành "01 tỷ đồng", áp dụng từ 01/01/2026.
 *
 * HAI LỖI ĐÃ SỬA NGÀY 10/09/2026, cả hai đều làm thuế theo tỷ lệ trông đắt hơn
 * thật, và vì thế đẩy người dùng đi gom chứng từ cho một khoản không cần:
 *   1. Ngưỡng để 500 triệu — đúng theo Luật 109, nhưng Nghị định 141 đã nâng lên
 *      01 tỷ từ bốn tháng trước.
 *   2. Nhân tỷ lệ với toàn bộ doanh thu. Hộ 1,2 tỷ ngành 1%: đúng là 2 triệu,
 *      hàm cũ ra 12 triệu.
 *
 * VÀ CÂU QUAN TRỌNG NHẤT KHÔNG PHẢI "CÁCH NÀO RẺ HƠN". Là: *còn thiếu bao nhiêu
 * chứng từ nữa thì cách thu nhập trở nên rẻ hơn.* Con số đó biến một quyết
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

/**
 * Ngưỡng doanh thu năm không phải nộp thuế GTGT và TNCN.
 *
 * "Từ 01 tỷ đồng trở xuống" — nên đúng bằng ngưỡng vẫn chưa phải nộp.
 * 200 triệu → 500 triệu (Luật 109/2025/QH15) → 01 tỷ (Nghị định 141/2026/NĐ-CP).
 */
export const NGUONG_MIEN = 1_000_000_000;

/** Trần của nhóm được quyền chọn cách tính. "Đến 3 tỷ" — tính cả 3 tỷ. */
export const TRAN_NHOM_CHON = 3_000_000_000;

/** Thuế suất trên thu nhập, khi xác định được chi phí đầu vào. */
export const TY_LE_TREN_LAI = 0.15;

/** Khoảng tỷ lệ trên doanh thu, tuỳ ngành nghề. */
export const TY_LE_DOANH_THU = { min: 0.005, max: 0.02 } as const;

export interface DauVao {
  /** Doanh thu NĂM, đồng. Không truyền doanh thu quý — ngưỡng là ngưỡng năm. */
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
  | 'ngoai_pham_vi'   // từ ngưỡng miễn trở xuống, hoặc trên trần nhóm được chọn
  | 'loi_nhuan_re_hon'
  | 'doanh_thu_re_hon'
  | 'bang_nhau';

export interface KetQua {
  ketLuan: KetLuan;
  /** Thuế nếu tính theo thu nhập. `null` khi không áp dụng được. */
  theoLoiNhuan: number | null;
  /** Thuế nếu tính theo tỷ lệ trên phần doanh thu vượt ngưỡng. `null` khi ngoài phạm vi. */
  theoDoanhThu: number | null;
  /** Chênh lệch tuyệt đối giữa hai cách. `null` khi không so được. */
  chenhLech: number | null;
  /**
   * Cần thêm bao nhiêu đồng chi phí CÓ CHỨNG TỪ nữa thì cách thu nhập rẻ hơn.
   *
   * `null` khi cách thu nhập đã rẻ hơn rồi, hoặc khi ngoài phạm vi. Đây là con
   * số biến một quyết định mù thành một việc làm được.
   */
  chungTuConThieu: number | null;
  /** Câu giải thích, viết cho người không biết gì về thuế. */
  cau: string;
}

const dong = (n: number) => `${Math.round(n).toLocaleString('vi-VN')}đ`;

export function soSanhThue(v: DauVao): KetQua {
  const { doanhThu, chiPhiCoChungTu, tyLeNganh } = v;

  if (doanhThu <= NGUONG_MIEN) {
    return {
      ketLuan: 'ngoai_pham_vi', theoLoiNhuan: null, theoDoanhThu: null,
      chenhLech: null, chungTuConThieu: null,
      cau:
        `Doanh thu từ ${dong(NGUONG_MIEN)} một năm trở xuống thì chưa phải nộp thuế thu nhập ` +
        'cá nhân và thuế giá trị gia tăng. Vẫn phải thông báo doanh thu với cơ quan thuế.',
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
  const theoDoanhThu = (doanhThu - NGUONG_MIEN) * tyLeNganh;
  const chenhLech = Math.abs(theoLoiNhuan - theoDoanhThu);

  if (theoLoiNhuan < theoDoanhThu) {
    return {
      ketLuan: 'loi_nhuan_re_hon', theoLoiNhuan, theoDoanhThu, chenhLech,
      chungTuConThieu: null,
      cau: `Tính theo thu nhập rẻ hơn ${dong(chenhLech)}. Chi phí bạn đang chứng minh được đã đủ để chọn cách này.`,
    };
  }

  if (theoLoiNhuan > theoDoanhThu) {
    /*
     * Cần thêm bao nhiêu chứng từ nữa để hoà? Giải theo lãi:
     *   0.15 × (doanhThu − chiPhi) = theoDoanhThu
     *   chiPhi = doanhThu − theoDoanhThu / 0.15
     * Phần thiếu là hiệu so với chi phí đang có.
     */
    const chiPhiCanCo = doanhThu - theoDoanhThu / TY_LE_TREN_LAI;
    const conThieu = Math.max(0, chiPhiCanCo - chiPhiCoChungTu);
    return {
      ketLuan: 'doanh_thu_re_hon', theoLoiNhuan, theoDoanhThu, chenhLech,
      chungTuConThieu: conThieu,
      cau:
        `Hiện tính theo tỷ lệ doanh thu rẻ hơn ${dong(chenhLech)}. ` +
        `Nếu gom thêm được ${dong(conThieu)} chi phí có chứng từ thì hai cách hoà nhau, ` +
        'quá mức đó thì tính theo thu nhập bắt đầu có lợi.',
    };
  }

  return {
    ketLuan: 'bang_nhau', theoLoiNhuan, theoDoanhThu, chenhLech: 0,
    chungTuConThieu: 0,
    cau: 'Hai cách ra cùng một số. Chọn cách nào cũng được.',
  };
}
