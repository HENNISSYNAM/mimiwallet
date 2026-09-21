/**
 * Danh mục công cụ tài chính người dùng ghim vào lối vào (15/09/2026).
 *
 * KHÔNG CÓ CÔNG CỤ GIẢ. Mỗi công cụ là một trong hai thứ đã chạy thật:
 *   - `trang`: một trang của MIMI (có route, có dữ liệu thật);
 *   - `hoi`: một câu hỏi MIMI Assistant hiểu được bằng bộ nhận ý định — test
 *     `congCu.test.ts` chạy từng câu qua `nhanYDinh` để câu nào trôi khỏi bộ luật là đỏ ngay.
 */

export type NhomCongCu = 'chung_tu' | 'thue' | 'ngan_hang' | 'chi_tieu' | 'ai' | 'ban_hang';

/** Công cụ mở trang Tờ khai thuế — lõi pháp lý của MIMI, nên đứng đầu bộ mặc định. */

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
  { khoa: 'soan_to_khai', ten: 'Soạn tờ khai thuế', nhom: 'thue', loai: 'trang', dich: '/dashboard/to-khai', mo_ta: 'MIMI điền mẫu tờ khai từ hoá đơn, sao kê và quy định trong kho văn bản.', tu_khoa: ['to khai', 'khai thue', 'thong bao doanh thu', 'gtgt', 'tncn'] },
  { khoa: 'bao_cao', ten: 'Báo cáo thu chi', nhom: 'thue', loai: 'trang', dich: '/dashboard/reports', mo_ta: 'Thu, chi, chênh lệch theo tháng từ sao kê ngân hàng.', tu_khoa: ['loi nhuan', 'lai lo', 'bao cao'] },
  { khoa: 'lien_ket_ngan_hang', ten: 'Liên kết ngân hàng', nhom: 'ngan_hang', loai: 'trang', dich: '/dashboard/fintech', mo_ta: 'Liên kết tài khoản, nhận tiền QR, kết nối Tổng cục Thuế.', tu_khoa: ['casso', 'sepay', 'qr', 'tong cuc thue'] },
  { khoa: 'kiem_truoc_khi_chuyen', ten: 'Kiểm tra trước khi chuyển tiền', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/kiem-truoc-khi-chuyen', mo_ta: 'So khoản sắp chuyển với lịch sử chi: đổi số tài khoản, người nhận lạ, kịch bản lừa đảo.', tu_khoa: ['lua dao', 'doi so tai khoan', 'chuyen khoan', 'an toan'] },
  { khoa: 'kiem_soat_agent', ten: 'Kiểm soát agent', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/tac-tu', mo_ta: 'Agent AI được phép xin chi, hạn mức, người nhận.', tu_khoa: ['agent', 'bot', 'han muc'] },
  { khoa: 'chinh_sach_chi', ten: 'Chính sách chi', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/chinh-sach', mo_ta: 'Ngưỡng duyệt, hạn mức, nhóm chi cho từng agent.', tu_khoa: ['quy dinh', 'nguong duyet'] },
  { khoa: 'chi_phi_ai', ten: 'Chi phí AI', nhom: 'ai', loai: 'trang', dich: '/dashboard/chi-phi-ai', mo_ta: 'Chi phí OpenAI, Anthropic, Gemini, OpenRouter so với ngân sách.', tu_khoa: ['openai', 'claude', 'gemini', 'ngan sach'] },
  { khoa: 'model_re_hon', ten: 'Model AI rẻ hơn', nhom: 'ai', loai: 'hoi', dich: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.', mo_ta: 'Ước tính tiết kiệm khi đổi sang model rẻ hơn cùng hãng.', tu_khoa: ['token', 'toi uu', 'tiet kiem'] },
  { khoa: 'hoa_don_ban', ten: 'Hoá đơn bán ra', nhom: 'ban_hang', loai: 'trang', dich: '/dashboard/invoices', mo_ta: 'Lập hoá đơn cho khách và theo dõi khoản chưa thu.', tu_khoa: ['xuat hoa don', 'phai thu'] },
  { khoa: 'khach_hang', ten: 'Khách hàng', nhom: 'ban_hang', loai: 'trang', dich: '/dashboard/clients', mo_ta: 'Danh sách khách, mã số thuế, tình trạng tiếp cận.', tu_khoa: ['doi tac', 'ma so thue', 'crm'] },
];

export const CONG_CU_THEO_KHOA: Record<string, CongCu> = Object.fromEntries(DANH_MUC_CONG_CU.map((c) => [c.khoa, c]));

/**
 * Bộ mặc định khi người dùng chưa tự chọn. Không có công cụ trùng mục chính của thanh điều
 * hướng (Thư viện chứng từ, Nhắc thuế, Tổng quan, Khách hàng, Kết nối) — người dùng báo trùng
 * chức năng 15/09/2026, nên các mục đó đã bỏ khỏi danh mục.
 *
 * Cũng bỏ (15/09/2026): "Đối soát tiền về" và "Khoản chờ duyệt" — MIMI Assistant đã tự đưa
 * hai việc này lên màn đầu, công cụ riêng là lặp; "Khách nợ quá hạn" — chỉ đọc hoá đơn tự lập
 * trong MIMI, nên với người lấy hoá đơn từ Tổng cục Thuế nó luôn trả "chưa có hoá đơn".
 *
 * Bỏ tiếp (16/09/2026): "Dòng tiền 6 tháng" và "Tìm khoản trả trùng" — trang Tổng quan đã có
 * đủ hai thứ này, người dùng báo trùng.
 */
export const CONG_CU_MAC_DINH = ['soan_to_khai', 'thieu_chung_tu', 'chi_phi_ai'];

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

/**
 * Công cụ gợi ý theo khảo sát đầu vào — cùng cách chia với các giải pháp trên trang chủ
 * (theo quy mô, theo ngành), chỉ khác là ở đây chọn từ công cụ đã chạy thật.
 *
 *   Hộ kinh doanh          → chứng từ chi phí, soạn tờ khai (ai cũng cần)
 *   Bán trên nền tảng số   → liên kết ngân hàng (thu tiền, tự khớp khi tiền về)
 *   Phần mềm & AI          → chi phí AI, model rẻ hơn
 *   Dịch vụ chuyên môn     → hoá đơn bán ra, khách hàng
 *   Bán lẻ, sản xuất       → báo cáo thu chi
 *   Doanh nghiệp           → chính sách chi, kiểm soát agent
 *
 * Chỉ áp khi người dùng chưa tự chọn công cụ nào — không ghi đè lựa chọn của họ.
 */
export function congCuGoiY(h: {
  loai_nguoi_nop: string | null;
  nhom_nganh: string[];
  kenh: string | null;
  nganh_dac_thu: string | null;
}): string[] {
  const ds = ['soan_to_khai', 'thieu_chung_tu'];
  if (h.kenh === 'tmdt_co_thanh_toan' || h.kenh === 'tmdt_khong_thanh_toan') ds.push('lien_ket_ngan_hang');
  for (const n of h.nhom_nganh) {
    if (n === 'noi_dung_so') ds.push('chi_phi_ai', 'model_re_hon');
    if (n === 'dich_vu') ds.push('hoa_don_ban', 'khach_hang');
    if (n === 'cho_thue_tai_san') ds.push('hoa_don_ban');
    if (n === 'phan_phoi_hang_hoa' || n === 'san_xuat_van_tai' || n === 'khac') ds.push('bao_cao');
  }
  if (h.nganh_dac_thu === 'cho_thue_bat_dong_san') ds.push('hoa_don_ban');
  if (h.loai_nguoi_nop === 'doanh_nghiep') ds.push('chinh_sach_chi', 'kiem_soat_agent');
  return [...new Set(ds)].filter((k) => CONG_CU_THEO_KHOA[k]).slice(0, 6);
}
