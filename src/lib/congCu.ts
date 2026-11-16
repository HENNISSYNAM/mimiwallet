/**
 * Danh mục công cụ tài chính người dùng ghim vào lối vào (15/09/2026).
 *
 * KHÔNG CÓ CÔNG CỤ GIẢ. Mỗi công cụ là một trong hai thứ đã chạy thật:
 *   - `trang`: một trang của MIMI (có route, có dữ liệu thật);
 *   - `hoi`: một câu hỏi MIMI Assistant hiểu được bằng bộ nhận ý định — test
 *     `congCu.test.ts` chạy từng câu qua `nhanYDinh` để câu nào trôi khỏi bộ luật là đỏ ngay.
 */

import { CONG_CU_DONG_BANG } from './dongBang';

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
  ai: 'Tuỳ chọn · cho công ty dùng AI',
  ban_hang: 'Bán hàng & công nợ',
};

const DANH_MUC_DAY_DU: CongCu[] = [
  { khoa: 'thieu_chung_tu', ten: 'Khoản chi thiếu chứng từ', nhom: 'chung_tu', loai: 'trang', dich: '/dashboard/chung-tu', mo_ta: 'Khoản chi trong kỳ kê khai chưa có hoá đơn, chứng từ.', tu_khoa: ['chi phi', 'hoa don dau vao', 'khau tru'] },
  { khoa: 'soan_to_khai', ten: 'Soạn tờ khai thuế', nhom: 'thue', loai: 'trang', dich: '/dashboard/to-khai', mo_ta: 'MIMI điền mẫu tờ khai từ hoá đơn, sao kê và quy định trong kho văn bản.', tu_khoa: ['to khai', 'khai thue', 'thong bao doanh thu', 'gtgt', 'tncn'] },
  { khoa: 'doc_bao_cao', ten: 'Đọc báo cáo tài chính & tờ khai', nhom: 'thue', loai: 'trang', dich: '/dashboard/doc-bao-cao', mo_ta: 'Tải báo cáo tài chính hoặc tờ khai (Excel/CSV): xếp từng chỉ tiêu, kiểm đẳng thức kế toán, cảnh báo mẫu hết hiệu lực.', tu_khoa: ['bao cao tai chinh', 'bang can doi ke toan', 'tinh hinh tai chinh', 'ket qua kinh doanh', 'luu chuyen tien te', 'quyet toan', 'b01', 'b02'] },
  { khoa: 'bao_cao', ten: 'Báo cáo thu chi', nhom: 'thue', loai: 'trang', dich: '/dashboard/reports', mo_ta: 'Thu, chi, chênh lệch theo tháng từ sao kê ngân hàng.', tu_khoa: ['loi nhuan', 'lai lo', 'bao cao'] },
  { khoa: 'lien_ket_ngan_hang', ten: 'Liên kết ngân hàng', nhom: 'ngan_hang', loai: 'trang', dich: '/dashboard/fintech', mo_ta: 'Liên kết tài khoản để MIMI đọc tiền vào, tiền ra; nhận tiền bằng mã QR.', tu_khoa: ['casso', 'sepay', 'qr', 'sao ke'] },
  { khoa: 'vay_von', ten: 'Vay vốn', nhom: 'ngan_hang', loai: 'trang', dich: '/dashboard/vay-von', mo_ta: 'Đánh giá sẵn sàng vay từ dòng tiền thật, có lý do và gợi ý; soạn hồ sơ vay để bạn tự in. MIMI không cho vay.', tu_khoa: ['vay', 'vay von', 'ho so vay', 'tin dung', 'ngan hang'] },
  { khoa: 'doanh_thu_xac_minh', ten: 'Doanh thu đã xác minh', nhom: 'ngan_hang', loai: 'trang', dich: '/dashboard/doanh-thu-xac-minh', mo_ta: 'Báo cáo doanh thu từ sao kê, có mã kiểm tra; bạn chọn gửi cho ai để kèm hồ sơ vay.', tu_khoa: ['doanh thu', 'xac minh', 'ho so vay', 'chung minh thu nhap'] },
  { khoa: 'co_hoi_phat_trien', ten: 'Cơ hội phát triển', nhom: 'ngan_hang', loai: 'trang', dich: '/dashboard/co-hoi', mo_ta: 'Dấu hiệu tăng trưởng của doanh nghiệp bạn từ dòng tiền thật, nhu cầu có thể có và gói ngân hàng phù hợp; chỉ chia sẻ khi bạn đồng ý.', tu_khoa: ['co hoi', 'tang truong', 'goi ngan hang', 'khach hang uu tien'] },
  { khoa: 'ban_tai_quay', ten: 'Bán tại quầy', nhom: 'ban_hang', loai: 'trang', dich: '/pos', mo_ta: 'Thu tiền mặt hoặc VietQR tại quầy; tiền QR về là tự khớp đơn, tự vào sổ.', tu_khoa: ['pos', 'ban hang', 'thu ngan', 'vietqr', 'quay', 'bien lai'] },
  { khoa: 'van_phong', ten: 'Văn phòng kế toán', nhom: 'thue', loai: 'trang', dich: '/dashboard/van-phong', mo_ta: 'Mọi khách bạn làm sổ ở một chỗ: đèn trạng thái, hạn thuế, tiền vào chờ xác nhận và việc các agent MIMI đang làm.', tu_khoa: ['van phong', 'nhieu khach', 'danh muc khach', 'dich vu ke toan'] },
  { khoa: 'tach_chi_ca_nhan', ten: 'Tách chi cá nhân', nhom: 'thue', loai: 'trang', dich: '/dashboard/chi-ca-nhan', mo_ta: 'Tách chi tiêu cá nhân khỏi chi phí kinh doanh khi dùng chung một tài khoản.', tu_khoa: ['ca nhan', 'gia dinh', 'chi phi kinh doanh', 'chung tai khoan'] },
  { khoa: 'viec_can_lam', ten: 'Việc cần làm', nhom: 'thue', loai: 'trang', dich: '/dashboard/viec-can-lam', mo_ta: 'Tạm ngừng, kinh doanh lại, đóng mã số thuế, hoá đơn sai, trả lời giải trình — hỏi từng câu, làm từng bước.', tu_khoa: ['tam ngung', 'giai trinh', 'hoa don sai', 'dong ma so thue', 'giai the', 'mo ho kinh doanh'] },
  { khoa: 'tai_lieu', ten: 'Tài liệu & Chứng từ', nhom: 'thue', loai: 'trang', dich: '/dashboard/tai-lieu', mo_ta: 'Báo cáo phân tích, gói sẵn sàng khai thuế, gói bằng chứng, công văn MIMI soạn.', tu_khoa: ['bao cao', 'goi bang chung', 'tai lieu', 'cong van'] },
  { khoa: 'soan_giay_to', ten: 'Soạn giấy tờ', nhom: 'thue', loai: 'trang', dich: '/dashboard/giay-to', mo_ta: 'Đơn tra soát chuyển nhầm, công văn giải trình, công văn đề nghị huỷ tờ khai.', tu_khoa: ['cong van', 'giai trinh', 'huy to khai', 'tra soat', 'chuyen nham'] },
  { khoa: 'dang_ky_kinh_doanh', ten: 'Đăng ký kinh doanh', nhom: 'thue', loai: 'trang', dich: '/dashboard/dang-ky-kinh-doanh', mo_ta: 'Chọn loại hình, hồ sơ và các bước nộp có căn cứ; điền sẵn Giấy đề nghị theo mẫu gốc để in.', tu_khoa: ['thanh lap cong ty', 'dang ky doanh nghiep', 'ho kinh doanh', 'cong ty co phan', 'tnhh', 'dieu le'] },
  { khoa: 'kiem_truoc_khi_chuyen', ten: 'Kiểm tra trước khi chuyển tiền', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/kiem-truoc-khi-chuyen', mo_ta: 'So khoản sắp chuyển với lịch sử chi: đổi số tài khoản, người nhận lạ, kịch bản lừa đảo.', tu_khoa: ['lua dao', 'doi so tai khoan', 'chuyen khoan', 'an toan'] },
  { khoa: 'kiem_soat_agent', ten: 'Kiểm soát agent', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/tac-tu', mo_ta: 'Agent AI được phép xin chi, hạn mức, người nhận.', tu_khoa: ['agent', 'bot', 'han muc'] },
  { khoa: 'chinh_sach_chi', ten: 'Chính sách chi', nhom: 'chi_tieu', loai: 'trang', dich: '/dashboard/chinh-sach', mo_ta: 'Ngưỡng duyệt, hạn mức, nhóm chi cho từng agent.', tu_khoa: ['quy dinh', 'nguong duyet'] },
  { khoa: 'hoa_don_ban', ten: 'Hoá đơn bán ra', nhom: 'ban_hang', loai: 'trang', dich: '/dashboard/invoices', mo_ta: 'Lập hoá đơn cho khách và theo dõi khoản chưa thu.', tu_khoa: ['xuat hoa don', 'phai thu'] },
  { khoa: 'khach_hang', ten: 'Khách hàng', nhom: 'ban_hang', loai: 'trang', dich: '/dashboard/clients', mo_ta: 'Danh sách khách, mã số thuế, tình trạng tiếp cận.', tu_khoa: ['doi tac', 'ma so thue', 'crm'] },
  // Đóng băng 11/11/2026 (`lib/dongBang.ts`) — lọc khỏi danh mục người dùng thấy; giữ ở đây để mở lại chỉ cần bỏ một khoá.
  { khoa: 'chi_phi_ai', ten: 'Chi phí AI', nhom: 'ai', loai: 'trang', dich: '/dashboard/chi-phi-ai', mo_ta: 'Chi phí OpenAI, Anthropic, Gemini, OpenRouter so với ngân sách.', tu_khoa: ['openai', 'claude', 'gemini', 'ngan sach'] },
  { khoa: 'model_re_hon', ten: 'Model AI rẻ hơn', nhom: 'ai', loai: 'hoi', dich: 'Tìm các khoản chi AI vượt ngân sách và đề xuất model rẻ hơn.', mo_ta: 'So giá token với model rẻ hơn cùng hãng — chưa đo chất lượng.', tu_khoa: ['token', 'toi uu', 'tiet kiem'] },
];

/** Danh mục người dùng thấy: bỏ công cụ đóng băng (`lib/dongBang.ts`) — mã và dữ liệu vẫn giữ. */
export const DANH_MUC_CONG_CU: CongCu[] = DANH_MUC_DAY_DU.filter((c) => !CONG_CU_DONG_BANG.has(c.khoa));

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
/**
 * Công cụ ghim sẵn cho người chưa chọn gì.
 *
 * `kiem_truoc_khi_chuyen` thêm ngày 23/09/2026 sau khi thử app bằng agent đóng
 * vai ông Dũng, 67 tuổi, đang bị gọi điện giả danh công an hối chuyển 180 triệu.
 * Ông đi hết thanh dưới, kho công cụ, trang Kết nối, Fintech Hub và kết luận:
 * "không có bất kỳ nút, trang hay tính năng nào tên kiểm tra chuyển khoản".
 *
 * Trang /dashboard/kiem-truoc-khi-chuyen đã có đủ cả backend lẫn test từ trước.
 * Nó chỉ không nằm trong danh sách này, nên người dùng mới phải tự vào "Thêm
 * công cụ" rồi tự ghim. Một người đang bị hối chuyển tiền trong vài phút sẽ
 * không đi lục kho công cụ.
 *
 * Đây là công cụ duy nhất trong danh mục mà việc tìm thấy nó CHẬM vài phút có
 * thể khiến người dùng mất tiền, nên nó đứng đầu.
 */
// 28/09/2026: "Chi phí AI" đóng băng (`lib/dongBang.ts`); liên kết ngân hàng thay chỗ — vòng kiểm → đối soát cần sao kê.
// 11/11/2026: tờ khai, bán tại quầy và hồ sơ vay — ba việc ra tiền ngay — ghim sẵn ngay sau kiểm trước khi chuyển.
// Liên kết ngân hàng đã có lối cố định "Kết nối" trên thanh bên nên đứng cuối.
// 16/11/2026 (đóng băng đợt 2): "Kiểm trước khi chuyển" đóng băng cùng kiểm soát chi của agent (`lib/dongBang.ts`).
// Tờ khai — việc ra tiền đầu tiên — đứng đầu; doanh thu đã xác minh vào thay chỗ (đi cùng hồ sơ vay).
export const CONG_CU_MAC_DINH = ['soan_to_khai', 'ban_tai_quay', 'vay_von', 'doanh_thu_xac_minh', 'thieu_chung_tu', 'lien_ket_ngan_hang'];

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
 *   Ai cũng cần            → soạn tờ khai, bán tại quầy, vay vốn, chứng từ chi phí
 *   Bán trên nền tảng số   → liên kết ngân hàng (thu tiền, tự khớp khi tiền về)
 *   Dịch vụ chuyên môn     → hoá đơn bán ra, khách hàng
 *   Bán lẻ, sản xuất       → báo cáo thu chi
 *   (Doanh nghiệp → chính sách chi, kiểm soát agent: đóng băng 16/11/2026)
 *
 * Chỉ áp khi người dùng chưa tự chọn công cụ nào — không ghi đè lựa chọn của họ.
 */
export function congCuGoiY(h: {
  loai_nguoi_nop: string | null;
  nhom_nganh: string[];
  kenh: string | null;
  nganh_dac_thu: string | null;
}): string[] {
  // 28/09/2026: vòng chính (kiểm trước khi chuyển + sao kê để đối soát) đứng đầu cho MỌI ngành; thuế theo sau.
  // 11/11/2026: tờ khai, bán tại quầy, hồ sơ vay lên trước; liên kết ngân hàng xuống cuối (đã có lối "Kết nối").
  // 16/11/2026: kiểm trước khi chuyển, chính sách chi, kiểm soát agent đóng băng — không gợi ý.
  const ds = ['soan_to_khai', 'ban_tai_quay', 'vay_von', 'thieu_chung_tu'];
  for (const n of h.nhom_nganh) {
    // Chi phí AI đóng băng 11/11/2026 (`lib/dongBang.ts`): không có trong kho, không gợi ý.
    if (n === 'dich_vu') ds.push('hoa_don_ban', 'khach_hang');
    if (n === 'cho_thue_tai_san') ds.push('hoa_don_ban');
    if (n === 'phan_phoi_hang_hoa' || n === 'san_xuat_van_tai' || n === 'khac') ds.push('bao_cao');
  }
  if (h.nganh_dac_thu === 'cho_thue_bat_dong_san') ds.push('hoa_don_ban');
  ds.push('lien_ket_ngan_hang');
  return [...new Set(ds)].filter((k) => CONG_CU_THEO_KHOA[k]).slice(0, 6);
}
