/**
 * Danh mục công cụ tài chính người dùng ghim vào lối vào (15/09/2026).
 *
 * KHÔNG CÓ CÔNG CỤ GIẢ. Mỗi công cụ là một trong hai thứ đã chạy thật:
 *   - `trang`: một trang của MIMI (có route, có dữ liệu thật);
 *   - `hoi`: một câu hỏi MIMI Assistant hiểu được bằng bộ nhận ý định — test
 *     `congCu.test.ts` chạy từng câu qua `nhanYDinh` để câu nào trôi khỏi bộ luật là đỏ ngay.
 */

export type NhomCongCu = 'chung_tu' | 'thue' | 'ngan_hang' | 'chi_tieu' | 'ai' | 'ban_hang';

export interface CongCu {
  khoa: string;
  ten: string;
  mo_ta: string;
  nhom: NhomCongCu;
  loai: 'trang' | 'hoi';
  /** Đường dẫn (trang) hoặc câu hỏi gửi MIMI Assistant (hoi). */
  dich: string;
  tu_khoa: string[];
}

export const TEN_NHOM_CONG_CU: Record<NhomCongCu, string> = {
  chung_tu: 'Hoá đơn & chứng từ',
  thue: 'Thuế',
  ngan_hang: 'Ngân hàng & dòng tiền',
  chi_tieu: 'Kiểm soát chi',
  ai: 'Chi phí AI',
  ban_hang: 'Bán hàng & công nợ',
};

export const DANH_MUC_CONG_CU: CongCu[] = [
  { khoa: 'thieu_chung_tu', ten: 'Khoản chi thiếu chứng từ', nhom: 'chung_tu', loai: 'trang', dich: '/dashboard/chung-tu', mo_ta: 'Khoản chi trong kỳ kê khai chưa có hoá đơn điện tử.', tu_khoa: ['chi phi', 'hoa don dau vao', 'khau tru'] },
  { khoa: 'bao_cao', ten: 'Báo cáo thu chi', nhom: 'thue', loai: 'trang', dich: '/dashboard/reports', mo_ta: 'Thu, chi, chênh lệch theo tháng từ sao kê ngân hàng.', tu_khoa: ['loi nhuan', 'lai lo', 'bao cao'] },
  { khoa: 'dong_tien', ten: 'Dòng tiền 6 tháng', nhom: 'ngan_hang', loai: 'hoi', dich: 'Dòng tiền 6 tháng qua thế nào?', mo_ta: 'Tiền vào, tiền ra, chênh lệch từng tháng.', tu_khoa: ['thu chi', 'tien vao', 'tien ra'] },
  { khoa: 'doi_soat', ten: 'Đối soát tiền về', nhom: 'ngan_hang', loai: 'hoi', dich: 'Tiền về tháng này khớp hoá đơn nào?', mo_ta: 'Khoản tiền về có thể là tiền của hoá đơn nào đang chờ thu.', tu_khoa: ['khop', 'tien ve', 'da thu'] },
  { khoa: 'lien_ket_ngan_hang', ten: 'Liên kết ngân hàng', nhom: 'ngan_hang', loai: 'trang', dich: '/dashboard/fintech', mo_ta: 'Liên kết tài khoản, nhận tiền QR, kết nối Tổng cục Thuế.', tu_khoa: ['casso', 'sepay', 'qr', 'tong cuc thue'] },
  { khoa: 'duyet_chi', ten: 'Khoản chờ duyệt', nhom: 'chi_tieu', loai: 'hoi', dich: 'Khoản nào đang chờ tôi duyệt?', mo_ta: 'Yêu cầu chi đang chờ bạn duyệt hoặc từ chối.', tu_khoa: ['phe duyet', 'yeu cau chi'] },
  { khoa: 'tra_trung', ten: 'Tìm khoản trả trùng', nhom: 'chi_tieu', loai: 'hoi', dich: 'Có khoản nào bị trả trùng không?', mo_ta: 'Hai khoản cùng người nhận, cùng số tiền, sát ngày nhau.', tu_khoa: ['trung lap', 'tiet kiem', 'hai lan'] },
  { khoa: 'kiem_soat_agent', ten: 'Kiểm soát agent', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/tac-tu', mo_ta: 'Agent AI được phép xin chi, hạn mức, người nhận.', tu_khoa: ['agent', 'bot', 'han muc'] },
  { khoa: 'chinh_sach_chi', ten: 'Chính sách chi', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/chinh-sach', mo_ta: 'Ngưỡng duyệt, hạn mức, nhóm chi cho từng agent.', tu_khoa: ['quy dinh', 'nguong duyet'] },
  { khoa: 'chi_phi_ai', ten: 'Chi phí AI', nhom: 'ai', loai: 'trang', dich: '/dashboard/chi-phi-ai', mo_ta: 'Chi phí OpenAI, Anthropic, Gemini, OpenRouter so với ngân sách.', tu_khoa: ['openai', 'claude', 'gemini', 'ngan sach'] },
  { khoa: 'model_re_hon', ten: 'Model AI rẻ hơn', nhom: 'ai', loai: 'hoi', dich: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.', mo_ta: 'Ước tính tiết kiệm khi đổi sang model rẻ hơn cùng hãng.', tu_khoa: ['token', 'toi uu', 'tiet kiem'] },
  { khoa: 'hoa_don_ban', ten: 'Hoá đơn bán ra', nhom: 'ban_hang', loai: 'trang', dich: '/dashboard/invoices', mo_ta: 'Lập hoá đơn cho khách và theo dõi khoản chưa thu.', tu_khoa: ['xuat hoa don', 'phai thu'] },
  { khoa: 'cong_no', ten: 'Khách nợ quá hạn', nhom: 'ban_hang', loai: 'hoi', dich: 'Khách nào đang nợ quá hạn?', mo_ta: 'Hoá đơn bán ra đã quá hạn, lâu nhất trước.', tu_khoa: ['cong no', 'nhac no', 'qua han'] },
];

export const CONG_CU_THEO_KHOA: Record<string, CongCu> = Object.fromEntries(DANH_MUC_CONG_CU.map((c) => [c.khoa, c]));

/**
 * Bộ mặc định khi người dùng chưa tự chọn. Không có công cụ trùng mục chính của thanh điều
 * hướng (Thư viện chứng từ, Nhắc thuế, Tổng quan, Khách hàng, Kết nối) — người dùng báo trùng
 * chức năng 15/09/2026, nên các mục đó đã bỏ khỏi danh mục.
 */
export const CONG_CU_MAC_DINH = ['thieu_chung_tu', 'doi_soat', 'duyet_chi', 'chi_phi_ai', 'cong_no'];

export const SO_CONG_CU_TOI_DA = 12;

const boDau = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();

/** Tìm không dấu trong tên, mô tả, từ khoá. Chuỗi rỗng trả cả danh mục. */
export function timCongCu(tuKhoa: string, ds: CongCu[] = DANH_MUC_CONG_CU): CongCu[] {
  const k = boDau(tuKhoa);
  if (!k) return ds;
  const tu = k.split(/\s+/);
  return ds.filter((c) => {
    const noi = boDau(`${c.ten} ${c.mo_ta} ${c.tu_khoa.join(' ')}`);
    return tu.every((t) => noi.includes(t));
  });
}

/** Đường mở công cụ: trang thì đi thẳng; câu hỏi thì mở MIMI Assistant và hỏi luôn. */
export function duongDanCongCu(c: CongCu): string {
  return c.loai === 'trang' ? c.dich : `/dashboard/tro-ly?hoi=${encodeURIComponent(c.dich)}`;
}
