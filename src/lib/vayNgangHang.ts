/**
 * Luật của sàn cho vay ngang hàng, theo Nghị định 94/2025/NĐ-CP.
 *
 * VÌ SAO LUẬT NẰM TRONG MÃ CHỨ KHÔNG NẰM TRONG GHI CHÚ. Ngày 17/08/2026 dự án
 * đã gỡ mục "Vay vốn" khỏi thanh điều hướng, và ghi lý do ngay trong
 * `DashboardSidebar.tsx`: *"MIMI has no credit licence and no disbursement
 * partner — a permanent nav slot for it advertised a service that does not
 * exist."* Dựng lại phần cho vay mà không mã hoá giới hạn pháp lý vào chính mã
 * nguồn là quay lại đúng chỗ đó, chỉ khác cái tên.
 *
 * CƠ SỞ PHÁP LÝ. Nghị định 94/2025/NĐ-CP về Cơ chế thử nghiệm có kiểm soát
 * trong lĩnh vực ngân hàng, hiệu lực 01/07/2025. Cho vay ngang hàng là một
 * trong ba giải pháp được thử nghiệm, cùng chấm điểm tín dụng và Open API.
 * Muốn vận hành thật thì phải được Ngân hàng Nhà nước cấp Giấy chứng nhận tham
 * gia cơ chế thử nghiệm — xem `CHUA_DUOC_CHAP_THUAN` ở cuối file.
 *
 * TRẦN DƯ NỢ ĐẶT RIÊNG MỘT CHỖ, VÀ CÓ LÝ DO. Hai con số dưới đây đến từ quyết
 * định của NHNN triển khai nghị định, không phải từ thân nghị định — nghĩa là
 * chúng có thể đổi mà không cần sửa luật. Gom vào một khối có ghi nguồn và ngày
 * tra, để lần sau đổi thì đổi đúng một chỗ.
 */

/**
 * Hạn mức dư nợ của bên đi vay.
 *
 * Nguồn: quyết định của NHNN triển khai Nghị định 94/2025/NĐ-CP.
 * Tra ngày 04/09/2026. Đơn vị: đồng.
 */
export const HAN_MUC = {
  /** Dư nợ tối đa của MỘT bên đi vay tại MỘT giải pháp cho vay ngang hàng. */
  MOT_GIAI_PHAP: 100_000_000,
  /** Tổng dư nợ của một bên đi vay tại TẤT CẢ giải pháp trong cơ chế thử nghiệm. */
  TAT_CA_GIAI_PHAP: 400_000_000,
  /** Hợp đồng vay không quá 02 năm (Nghị định 94). */
  KY_HAN_TOI_DA_NGAY: 730,
} as const;

/* ── Ai được đứng ở bên nào ───────────────────────────────────────────────── */

/** Tư cách pháp lý của một bên tham gia. */
export type TuCach =
  | 'ca_nhan_vn'        // cá nhân quốc tịch Việt Nam
  | 'ca_nhan_nn'        // cá nhân nước ngoài
  | 'phap_nhan_vn'      // pháp nhân thành lập theo pháp luật Việt Nam
  | 'phap_nhan_nn'      // pháp nhân nước ngoài
  | 'to_chuc_tin_dung'; // TCTD hoặc chi nhánh ngân hàng nước ngoài

export interface Ben {
  tuCach: TuCach;
  /** Là chính công ty vận hành sàn, hoặc người có liên quan tới công ty đó. */
  laNguoiLienQuan?: boolean;
  /** Là công ty cầm đồ. */
  laCamDo?: boolean;
}

export interface KetLuan {
  duoc: boolean;
  /** Lý do khi không được. `null` khi được — không bịa lý do cho trường hợp đạt. */
  vuong: string | null;
}

/**
 * Bên cho vay: pháp nhân Việt Nam (KỂ CẢ tổ chức tín dụng và chi nhánh ngân
 * hàng nước ngoài), hoặc cá nhân quốc tịch Việt Nam.
 */
export function duocLamBenChoVay(b: Ben): KetLuan {
  if (b.laCamDo) {
    return { duoc: false, vuong: 'Nghị định 94 cấm cung ứng giải pháp cho công ty cầm đồ.' };
  }
  if (b.tuCach === 'ca_nhan_vn' || b.tuCach === 'phap_nhan_vn' || b.tuCach === 'to_chuc_tin_dung') {
    return { duoc: true, vuong: null };
  }
  return {
    duoc: false,
    vuong: 'Bên cho vay phải là pháp nhân Việt Nam hoặc cá nhân quốc tịch Việt Nam.',
  };
}

/**
 * Bên đi vay: pháp nhân Việt Nam (KHÔNG gồm tổ chức tín dụng và chi nhánh ngân
 * hàng nước ngoài), hoặc cá nhân quốc tịch Việt Nam — và không được là công ty
 * fintech vận hành sàn hay người liên quan của công ty đó.
 *
 * Điều kiện tổ chức tín dụng là chỗ khác nhau quan trọng nhất giữa hai bên: một
 * ngân hàng được CHO vay trên sàn nhưng không được ĐI vay trên sàn.
 */
export function duocLamBenDiVay(b: Ben): KetLuan {
  if (b.laNguoiLienQuan) {
    return {
      duoc: false,
      vuong: 'Công ty vận hành sàn và người liên quan không được đi vay trên chính sàn của mình.',
    };
  }
  if (b.laCamDo) {
    return { duoc: false, vuong: 'Nghị định 94 cấm cung ứng giải pháp cho công ty cầm đồ.' };
  }
  if (b.tuCach === 'to_chuc_tin_dung') {
    return {
      duoc: false,
      vuong: 'Tổ chức tín dụng và chi nhánh ngân hàng nước ngoài không được là bên đi vay.',
    };
  }
  if (b.tuCach === 'ca_nhan_vn' || b.tuCach === 'phap_nhan_vn') {
    return { duoc: true, vuong: null };
  }
  return {
    duoc: false,
    vuong: 'Bên đi vay phải là pháp nhân Việt Nam hoặc cá nhân quốc tịch Việt Nam.',
  };
}

/* ── Trần dư nợ ───────────────────────────────────────────────────────────── */

export interface TinhTrangNo {
  /** Dư nợ hiện tại của bên đi vay TRÊN CHÍNH sàn này, đơn vị đồng. */
  duNoTaiSanNay: number;
  /**
   * Dư nợ tại các sàn khác cũng trong cơ chế thử nghiệm.
   *
   * MIMI không tự biết con số này — nó nằm ở hệ thống của NHNN hoặc do bên đi
   * vay khai. `undefined` nghĩa là CHƯA BIẾT, và khác hẳn với 0.
   */
  duNoSanKhac?: number;
}

export interface KetQuaHanMuc extends KetLuan {
  /** Số tiền tối đa còn được vay thêm. Null khi số tiền hỏi vốn đã không hợp lệ. */
  conDuocVay: number | null;
  /** Chưa biết dư nợ ở sàn khác, nên chỉ kiểm được trần của riêng sàn này. */
  thieuDuLieu: boolean;
}

/**
 * Khoản vay mới có vượt trần không.
 *
 * CHƯA BIẾT KHÁC VỚI BẰNG KHÔNG. Khi không có số dư nợ ở sàn khác, hàm này vẫn
 * chặn theo trần của riêng sàn này, nhưng bật cờ `thieuDuLieu` để giao diện nói
 * đúng rằng tổng 400 triệu chưa kiểm được — chứ không im lặng coi như bằng 0
 * rồi để người dùng tưởng đã kiểm đủ. Đây là cùng một kỷ luật với `phuDe()`
 * trong `lienKetNganHang.ts`: không nói một câu dễ chịu khi chưa biết sự thật.
 */
export function kiemTraHanMuc(t: TinhTrangNo, soTienVay: number): KetQuaHanMuc {
  if (soTienVay <= 0) {
    return { duoc: false, vuong: 'Số tiền vay phải lớn hơn 0.', conDuocVay: null, thieuDuLieu: false };
  }

  const thieuDuLieu = t.duNoSanKhac === undefined;
  const conTaiSanNay = HAN_MUC.MOT_GIAI_PHAP - t.duNoTaiSanNay;

  if (soTienVay > conTaiSanNay) {
    return {
      duoc: false,
      vuong:
        `Vượt trần dư nợ ${trieu(HAN_MUC.MOT_GIAI_PHAP)} tại một sàn. ` +
        `Dư nợ hiện tại ${trieu(t.duNoTaiSanNay)}, còn vay được tối đa ${trieu(Math.max(0, conTaiSanNay))}.`,
      conDuocVay: Math.max(0, conTaiSanNay),
      thieuDuLieu,
    };
  }

  if (!thieuDuLieu) {
    const daCo = t.duNoTaiSanNay + (t.duNoSanKhac ?? 0);
    if (daCo + soTienVay > HAN_MUC.TAT_CA_GIAI_PHAP) {
      return {
        duoc: false,
        vuong:
          `Vượt tổng dư nợ ${trieu(HAN_MUC.TAT_CA_GIAI_PHAP)} trên tất cả sàn thử nghiệm. ` +
          `Còn vay được tối đa ${trieu(Math.max(0, HAN_MUC.TAT_CA_GIAI_PHAP - daCo))}.`,
        conDuocVay: Math.max(0, HAN_MUC.TAT_CA_GIAI_PHAP - daCo),
        thieuDuLieu: false,
      };
    }
  }

  const conRiengSan = conTaiSanNay - soTienVay;
  const con = thieuDuLieu
    ? conRiengSan
    : Math.min(
        conRiengSan,
        HAN_MUC.TAT_CA_GIAI_PHAP - t.duNoTaiSanNay - (t.duNoSanKhac ?? 0) - soTienVay,
      );

  return { duoc: true, vuong: null, conDuocVay: Math.max(0, con), thieuDuLieu };
}

/** Kỳ hạn hợp đồng vay không quá 02 năm. */
export function kyHanHopLe(soNgay: number): KetLuan {
  if (soNgay <= 0) return { duoc: false, vuong: 'Kỳ hạn phải lớn hơn 0 ngày.' };
  if (soNgay > HAN_MUC.KY_HAN_TOI_DA_NGAY) {
    return {
      duoc: false,
      vuong: `Hợp đồng vay không được quá ${HAN_MUC.KY_HAN_TOI_DA_NGAY} ngày (02 năm) theo Nghị định 94.`,
    };
  }
  return { duoc: true, vuong: null };
}

/* ── Trạng thái vận hành ──────────────────────────────────────────────────── */

/**
 * MIMI ĐÃ ĐƯỢC NHNN CẤP GIẤY CHỨNG NHẬN CHƯA.
 *
 * Đặt thành hằng số chứ không phải biến môi trường là chủ ý: đổi nó phải là một
 * lần sửa mã có người duyệt, không phải một dòng cấu hình ai bật cũng được. Khi
 * có quyết định thật của NHNN thì sửa ở đây, kèm số quyết định và ngày cấp.
 *
 * Chừng nào còn `true`, giao diện phải nói rõ sàn chưa được phép vận hành và
 * không được nhận tiền thật.
 */
export const CHUA_DUOC_CHAP_THUAN = true;

export const CAU_CANH_BAO =
  'Sàn cho vay ngang hàng của MIMI chưa được Ngân hàng Nhà nước cấp Giấy chứng nhận ' +
  'tham gia cơ chế thử nghiệm theo Nghị định 94/2025/NĐ-CP. Phần này đang ở giai đoạn ' +
  'dựng và kiểm thử — không nhận tiền thật, không phát sinh hợp đồng vay có hiệu lực.';

/** "100 triệu", "1,5 tỷ" — dùng trong câu giải thích cho người đọc. */
function trieu(dong: number): string {
  if (dong >= 1_000_000_000) {
    const ty = dong / 1_000_000_000;
    return `${Number.isInteger(ty) ? ty : ty.toFixed(1).replace('.', ',')} tỷ`;
  }
  return `${Math.round(dong / 1_000_000)} triệu`;
}
