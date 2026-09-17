/**
 * MIMI-P0-004 — từ điển chỉ số: mỗi con số MIMI hiện ra được gọi đúng tên của nó.
 *
 * Lỗi cần chặn: gọi tiền vào tài khoản ngân hàng là "doanh thu", chênh lệch vào–ra là "lợi nhuận",
 * và bảng tổng hợp sao kê là "báo cáo tài chính". Ba thứ đó cần sổ kế toán (ghi nhận theo kỳ, loại
 * trừ tiền vay, tiền góp vốn, chuyển khoản nội bộ…) — MIMI chưa có sổ kế toán của khách.
 *
 * Hàm thuần, không import gì: trình duyệt và Deno cùng dùng.
 */

export type TrangThaiKeToan =
  /** Chỉ là tiền ra vào tài khoản ngân hàng. */
  | 'dong_tien_ngan_hang'
  /** Tính cho mục đích thuế theo quy tắc của hệ luật, có nguồn và căn cứ. */
  | 'co_so_thue'
  /** Lập từ sổ kế toán theo chuẩn mực — MIMI CHƯA có loại này. */
  | 'so_ke_toan';

export interface DinhNghiaChiSo {
  khoa: string;
  /** Tên được phép hiện cho người dùng. */
  ten: string;
  dinh_nghia: string;
  nguon: string;
  trang_thai_ke_toan: TrangThaiKeToan;
  gioi_han: string;
}

export const TU_DIEN_CHI_SO: Record<string, DinhNghiaChiSo> = {
  tien_vao_ngan_hang: {
    khoa: 'tien_vao_ngan_hang',
    ten: 'Tiền vào',
    dinh_nghia: 'Tổng các giao dịch ghi có vào tài khoản ngân hàng đã liên kết trong kỳ.',
    nguon: 'Sao kê ngân hàng đã đồng bộ, bỏ dữ liệu thử.',
    trang_thai_ke_toan: 'dong_tien_ngan_hang',
    gioi_han: 'Gồm cả tiền vay, tiền góp vốn, hoàn tiền, chuyển khoản nội bộ — không phải doanh thu.',
  },
  tien_ra_ngan_hang: {
    khoa: 'tien_ra_ngan_hang',
    ten: 'Tiền ra',
    dinh_nghia: 'Tổng các giao dịch ghi nợ khỏi tài khoản ngân hàng đã liên kết trong kỳ.',
    nguon: 'Sao kê ngân hàng đã đồng bộ, bỏ dữ liệu thử.',
    trang_thai_ke_toan: 'dong_tien_ngan_hang',
    gioi_han: 'Gồm cả trả nợ gốc, mua tài sản, chuyển khoản nội bộ — không phải chi phí kế toán.',
  },
  chenh_lech_dong_tien: {
    khoa: 'chenh_lech_dong_tien',
    ten: 'Chênh lệch dòng tiền',
    dinh_nghia: 'Tiền vào trừ tiền ra trong kỳ.',
    nguon: 'Sao kê ngân hàng đã đồng bộ.',
    trang_thai_ke_toan: 'dong_tien_ngan_hang',
    gioi_han: 'Không phải lợi nhuận: không tính doanh thu/chi phí chưa thu chi, khấu hao, thuế phải nộp.',
  },
  doanh_thu_tinh_thue: {
    khoa: 'doanh_thu_tinh_thue',
    ten: 'Doanh thu tính thuế',
    dinh_nghia: 'Doanh thu dùng để xét ngưỡng và tính thuế của hộ kinh doanh, lấy theo thứ tự: hoá đơn điện tử bán ra, số người dùng tự khai, hoặc ước tính từ tiền vào ngân hàng.',
    nguon: 'Hệ luật thuế (`_shared/luat`), ghi rõ nguồn đã chọn cho từng kỳ.',
    trang_thai_ke_toan: 'co_so_thue',
    gioi_han: 'Khi nguồn là tiền vào ngân hàng thì chỉ là ước tính và được gắn nhãn tạm tính.',
  },
};

/** Những từ chỉ đúng khi có sổ kế toán. Số liệu chỉ từ ngân hàng không được mang các tên này. */
export const TU_CAN_SO_KE_TOAN = ['lợi nhuận', 'lãi lỗ', 'báo cáo tài chính', 'doanh thu kế toán', 'bctc'] as const;

/** Cách nói phủ định: có nó đứng trước trong cùng mệnh đề thì từ cấm được phép ("chưa phải lợi nhuận"). */
const PHU_DINH = /(chưa phải|không phải|chưa là|không là|chưa tính được|không tính được|chưa có|không có|chưa lập|chưa đủ để)/;

/**
 * Các từ cần sổ kế toán xuất hiện trong một đoạn chữ mô tả số liệu chỉ từ ngân hàng.
 * Không tính khi mệnh đề chứa từ đó (từ dấu câu gần nhất phía trước) có cách nói phủ định
 * đứng trước nó — ví dụ "chưa phải doanh thu, lợi nhuận hay báo cáo tài chính".
 */
export function tuSaiThuatNgu(chu: string): string[] {
  const s = chu.toLowerCase();
  const sai = new Set<string>();
  for (const tu of TU_CAN_SO_KE_TOAN) {
    for (let i = s.indexOf(tu); i >= 0; i = s.indexOf(tu, i + tu.length)) {
      const truoc = s.slice(0, i);
      const dau = Math.max(...['.', ';', ':', '—', '(', '\n', '!', '?'].map((k) => truoc.lastIndexOf(k)));
      if (!PHU_DINH.test(truoc.slice(dau + 1))) sai.add(tu);
    }
  }
  return [...sai];
}

/** Câu hỏi đòi một chỉ số cần sổ kế toán (lợi nhuận, lãi lỗ, BCTC). So trên chữ đã bỏ dấu. */
export function hoiChiSoKeToan(cauBoDau: string): boolean {
  return /\b(loi nhuan|lai lo|lai hay lo|bao cao tai chinh|bctc|doanh thu ke toan)\b/.test(cauBoDau);
}
