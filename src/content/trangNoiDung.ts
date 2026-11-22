/**
 * Nội dung các trang Sản phẩm (/san-pham/:slug) và Giải pháp (/giai-phap/:slug).
 *
 * MỖI CÂU PHẢI TRA ĐƯỢC VỀ MÃ HOẶC NGUỒN. Trang sản phẩm là nơi người mua đọc kỹ
 * nhất, nên luật ở đây chặt hơn trang chủ:
 *   - Chức năng mô tả theo đúng code đang chạy (ghi file ở `nguonMa` khi cần).
 *   - Chưa làm thì `trangThai: 'dang-xay'`, và trang tự hiện nhãn.
 *   - Chưa bán đại trà thì `trangThai: 'lien-he'`.
 *   - Số liệu thị trường kèm nguồn và đường dẫn; không có nguồn thì không có số.
 *   - Mục "Ranh giới" nói điều MIMI KHÔNG làm — đó là phần tạo niềm tin.
 *
 * Test `trangNoiDung.test.ts` kiểm: mọi liên kết trong menu có trang, mọi trang
 * liên quan tồn tại, mỗi trang đủ các phần tối thiểu.
 */

import { daDongBang } from '@/lib/dongBang';

export type LoaiTrang = 'san-pham' | 'giai-phap';
export type TrangThai = 'dang-chay' | 'dang-xay' | 'lien-he';

export interface SoLieu {
  so: string;
  nhan: string;
  nguon: string;
  url: string;
}

export interface TrangNoiDung {
  loai: LoaiTrang;
  slug: string;
  nhom: string;
  ten: string;
  motCau: string;
  trangThai: TrangThai;
  vanDe: { tieuDe: string; doan: string; soLieu?: SoLieu };
  cachHoatDong: Array<{ tieuDe: string; mo: string }>;
  lamDuoc: Array<{ tieuDe: string; mo: string }>;
  ranhGioi: string[];
  trongApp?: { ten: string; duong: string };
  hoiDap: Array<{ hoi: string; dap: string }>;
  /** Đường dẫn đầy đủ, vd "/san-pham/duyet-chi". */
  lienQuan: string[];
  /** Bản tiếng Anh (16/11/2026). Có thì người đọc chọn ngôn ngữ khác tiếng Việt thấy bản này. */
  en?: BanDich;
}

/** Phần chữ của một trang, dịch sang ngôn ngữ khác. Số liệu, đường dẫn, trạng thái dùng chung với bản gốc. */
export interface BanDich {
  nhom: string;
  ten: string;
  motCau: string;
  vanDe: { tieuDe: string; doan: string };
  cachHoatDong: Array<{ tieuDe: string; mo: string }>;
  lamDuoc: Array<{ tieuDe: string; mo: string }>;
  ranhGioi: string[];
  trongAppTen?: string;
  hoiDap: Array<{ hoi: string; dap: string }>;
}

const GASA: SoLieu = {
  so: '48%',
  nhan: 'thiệt hại do lừa đảo ở Đông Nam Á đi qua chuyển khoản',
  nguon: 'GASA, The State of Scams in Southeast Asia 2025',
  url: 'https://gasa.org/knowledge-base/blog/new-study-reveals-63-of-southeast-asians-experienced-scams-in-past-year',
};

const ATRADIUS: SoLieu = {
  so: '44%',
  nhan: 'doanh số bán chịu B2B ở châu Á bị trễ hạn thanh toán',
  nguon: 'Atradius, Payment Practices Barometer Asia 2025',
  url: 'https://atradius.us/knowledge-and-research/reports/b2b-payment-practices-trends-asia-2025',
};

const AWS_AI: SoLieu = {
  so: '55%',
  nhan: 'startup Việt Nam đã dùng AI; doanh nghiệp nói chung là 18%',
  nguon: 'AWS & Strand Partners, 09/2025',
  url: 'https://press.aboutamazon.com/sg/aws/2025/9/new-aws-research-shows-strong-ai-adoption-momentum-in-vietnam',
};

const SAN_PHAM_DAY_DU: TrangNoiDung[] = [
  /* ── Bán được ngay (16/11/2026): bốn việc MIMI bán ───────────────────────────────────────────────
   * Mỗi câu tra được về mã: ToKhaiPage.tsx + lib/heLuat (tờ khai), supabase/functions/_shared/pos/* + lib/pos/*
   * (bán tại quầy), _shared/ho-so-vay/ho-so.ts + _shared/xac-minh/* (hồ sơ vay, doanh thu đã xác minh),
   * _shared/van-phong/danh-muc.ts (văn phòng kế toán). Không có số tự nghĩ ra.
   */
  {
    loai: 'san-pham', slug: 'khai-thue-ho-kinh-doanh', nhom: 'Thuế & sổ sách', trangThai: 'dang-chay',
    ten: 'Khai thuế cho hộ kinh doanh',
    motCau: 'MIMI đọc sao kê và hồ sơ thuế của bạn rồi điền sẵn tờ khai đúng mẫu 01/TKN-CNKD hoặc 01/CNKD. Bạn tự kiểm, tự nộp trên cổng của cơ quan thuế.',
    vanDe: {
      tieuDe: 'Hết thuế khoán, hộ kinh doanh tự khai trên doanh thu thật',
      doan: 'Từ 01/01/2026 hộ kinh doanh tự kê khai. Doanh thu lấy từ tài khoản ngân hàng, nhưng tài khoản đó còn có tiền vay, tiền người nhà gửi, tiền chuyển qua lại giữa các tài khoản của chính mình. Cộng nhầm là khai thừa thuế.',
    },
    cachHoatDong: [
      { tieuDe: 'Hồ sơ thuế', mo: 'Nhập mã số thuế: tên đăng ký, loại người nộp và cơ quan thuế quản lý được tra sẵn. Bạn chỉ trả lời vài điều chỉ bạn biết, như nhóm ngành và nơi bán.' },
      { tieuDe: 'Tách tiền không phải doanh thu', mo: 'Khoản tiền vào chưa rõ thì MIMI hỏi bạn. Khoản bạn xác nhận không phải doanh thu được trừ ra và in thành phụ lục giải trình kèm tờ khai.' },
      { tieuDe: 'Điền đúng mẫu', mo: 'Bản nháp theo mẫu 01/TKN-CNKD hoặc 01/CNKD, in được. Mẫu đổi theo thông tư áp cho kỳ khai.' },
      { tieuDe: 'Bạn nộp', mo: 'Nút cuối mở Cổng dịch vụ công của cơ quan thuế để bạn tự nộp.' },
    ],
    lamDuoc: [
      { tieuDe: 'Xem trước miễn phí', mo: 'Xem, sửa số và lưu nháp không mất tiền. Bản chưa xuất mang dấu "BẢN XEM TRƯỚC".' },
      { tieuDe: 'Nhắc hạn theo quý', mo: 'Đếm ngày tới hạn kê khai theo lịch của bạn, cùng ngưỡng doanh thu năm.' },
      { tieuDe: 'Hai cách tính thuế', mo: 'Hộ doanh thu trên 01 tỷ đến 3 tỷ: so cách theo lợi nhuận với cách theo tỷ lệ doanh thu.' },
      { tieuDe: 'Chứng từ chi phí', mo: 'Khoản chi nào đã có giấy tờ, khoản nào còn thiếu, theo quý đang tới hạn.' },
    ],
    ranhGioi: [
      'MIMI không nộp tờ khai thay bạn và không thay cơ quan thuế xác định số thuế.',
      'Doanh thu chỉ tính từ tiền đã vào sổ MIMI (sao kê ngân hàng, bán tại quầy). Tiền chưa vào sổ thì MIMI không biết.',
    ],
    trongApp: { ten: 'Tờ khai thuế', duong: '/dashboard/to-khai' },
    hoiDap: [
      { hoi: 'Tôi chưa liên kết ngân hàng thì sao?', dap: 'Tải tệp sao kê Excel/CSV từ app ngân hàng lên là đủ để MIMI đọc doanh thu.' },
      { hoi: 'Tờ khai in bằng tiếng gì?', dap: 'Luôn bằng tiếng Việt, vì đây là giấy tờ nộp cho cơ quan thuế Việt Nam, dù bạn dùng app bằng ngôn ngữ nào.' },
    ],
    lienQuan: ['/san-pham/hai-cach-tinh-thue', '/san-pham/chung-tu-chi-phi', '/giai-phap/ho-kinh-doanh'],
    en: {
      nhom: 'Tax & books', ten: 'Tax returns for household businesses',
      motCau: 'MIMI reads your bank statements and tax profile, then pre-fills the 01/TKN-CNKD or 01/CNKD form. You check it and file it yourself on the tax authority’s portal.',
      vanDe: {
        tieuDe: 'Lump-sum tax is gone. Households now declare real revenue',
        doan: 'Since 01/01/2026 household businesses self-declare. Revenue comes from the bank account, but that account also holds loans, money from family and transfers between your own accounts. Counting those as sales means overpaying tax.',
      },
      cachHoatDong: [
        { tieuDe: 'Tax profile', mo: 'Enter your tax code: registered name, taxpayer type and tax office are looked up for you. You only answer what only you know, such as your industry and where you sell.' },
        { tieuDe: 'Separate money that is not revenue', mo: 'MIMI asks you about unclear incoming money. What you confirm is not revenue is taken out and printed as an explanatory appendix with the return.' },
        { tieuDe: 'The right form', mo: 'A printable draft on form 01/TKN-CNKD or 01/CNKD. The form follows the circular that applies to the filing period.' },
        { tieuDe: 'You file', mo: 'The last button opens the tax authority’s public service portal, where you file it yourself.' },
      ],
      lamDuoc: [
        { tieuDe: 'Free preview', mo: 'Viewing, editing numbers and saving drafts cost nothing. Drafts not yet exported carry a "PREVIEW" mark.' },
        { tieuDe: 'Quarterly reminders', mo: 'Days left until each filing deadline on your schedule, plus the annual revenue thresholds.' },
        { tieuDe: 'Two tax methods', mo: 'For revenue above 1 billion up to 3 billion VND: compare the profit method with the revenue-percentage method.' },
        { tieuDe: 'Expense records', mo: 'Which expenses already have paperwork and which do not, for the quarter that is due.' },
      ],
      ranhGioi: [
        'MIMI does not file the return for you and does not decide your tax in place of the tax authority.',
        'Revenue only counts money already in MIMI’s books (bank statements, counter sales). MIMI cannot see money that never reached the books.',
      ],
      trongAppTen: 'Tax return',
      hoiDap: [
        { hoi: 'I have not linked a bank yet?', dap: 'Upload an Excel/CSV statement from your banking app. That is enough for MIMI to read revenue.' },
        { hoi: 'Which language is the printed return in?', dap: 'Always Vietnamese: it is filed with the Vietnamese tax authority, whatever language you use in the app.' },
      ],
    },
  },
  {
    loai: 'san-pham', slug: 'ho-so-vay', nhom: 'Hồ sơ vay', trangThai: 'dang-chay',
    ten: 'Hồ sơ vay & doanh thu đã xác minh',
    motCau: 'Từ sổ MIMI, dựng hồ sơ vay để bạn tự in, tự mang đi, và báo cáo doanh thu có mã kiểm tra để gửi cho đúng người bạn chọn. MIMI không cho vay.',
    vanDe: {
      tieuDe: 'Đi vay mà không chứng minh được doanh thu',
      doan: 'Hộ kinh doanh bán được hàng nhưng ít khi có giấy tờ cho thấy điều đó. Bên cho vay hỏi doanh thu, chủ hộ đưa sao kê dày cả xấp, lộ luôn tên người chuyển và từng khoản.',
    },
    cachHoatDong: [
      { tieuDe: 'Nhập đề nghị vay', mo: 'Số tiền, kỳ hạn (1 tới 120 tháng) và mục đích.' },
      { tieuDe: 'MIMI ghép hồ sơ', mo: 'Tên và mã số thuế, bảng dòng tiền 12 tháng, khoảng doanh thu kèm bằng chứng, tình trạng tờ khai thuế, khả năng trả nợ, dự báo 3 tháng, giấy tờ còn thiếu.' },
      { tieuDe: 'Báo cáo doanh thu đã xác minh', mo: 'Doanh thu tính bằng cùng bộ máy với tờ khai, ghi thành khoảng từ cận dưới tới cận trên. Mã băm của báo cáo được ghi dấu thời gian công khai trên OpenTimestamps.' },
      { tieuDe: 'Bạn chọn gửi cho ai', mo: 'Mỗi lần chia sẻ là một đường dẫn riêng cho một người nhận, một mục đích, hết hạn tối đa 30 ngày, thu hồi được bất cứ lúc nào.' },
    ],
    lamDuoc: [
      { tieuDe: 'Không lộ từng giao dịch', mo: 'Báo cáo không có từng khoản, tên người chuyển, nội dung chuyển khoản hay số tài khoản.' },
      { tieuDe: 'Người nhận tự kiểm', mo: 'Ai cầm báo cáo và tệp .ots đều kiểm được ở opentimestamps.org mà không cần tin MIMI.' },
      { tieuDe: 'Chỉ chủ và quản trị chia sẻ', mo: 'Mã chia sẻ chỉ hiện một lần lúc tạo; MIMI chỉ lưu bản băm của mã.' },
    ],
    ranhGioi: [
      'MIMI không cho vay, không môi giới, không gửi hồ sơ cho bên cho vay nào và không hứa được duyệt.',
      'Báo cáo doanh thu do chủ hộ chia sẻ, không phải điểm tín dụng.',
    ],
    trongApp: { ten: 'Vay vốn · Doanh thu đã xác minh', duong: '/dashboard/vay-von' },
    hoiDap: [
      { hoi: 'Doanh thu ghi thành khoảng là sao?', dap: 'Một phần tiền vào chưa rõ có phải doanh thu hay không, nên doanh thu ghi từ cận dưới tới cận trên. Khi khoảng đó cắt ngưỡng 01 tỷ hoặc 3 tỷ, báo cáo nói rõ kết luận còn phụ thuộc phần chưa rõ.' },
      { hoi: 'Tôi đổi ý sau khi gửi thì sao?', dap: 'Thu hồi đường dẫn; người nhận mở lại sẽ không xem được nữa.' },
    ],
    lienQuan: ['/san-pham/khai-thue-ho-kinh-doanh', '/san-pham/bao-mat'],
    en: {
      nhom: 'Loan file', ten: 'Loan file & verified revenue',
      motCau: 'From MIMI’s books, build a loan file you print and carry yourself, plus a revenue report with a verification code that you send only to people you choose. MIMI does not lend.',
      vanDe: {
        tieuDe: 'Asking for a loan without proof of revenue',
        doan: 'Household businesses sell, but rarely have papers that show it. When a lender asks for revenue, owners hand over a stack of statements that also exposes every sender and every payment.',
      },
      cachHoatDong: [
        { tieuDe: 'Enter the request', mo: 'Amount, term (1 to 120 months) and purpose.' },
        { tieuDe: 'MIMI assembles the file', mo: 'Name and tax code, a 12-month cash-flow table, a revenue range with evidence, tax filing status, repayment capacity, a 3-month forecast and missing documents.' },
        { tieuDe: 'Verified revenue report', mo: 'Revenue is computed by the same engine as the tax return and shown as a range from lower to upper bound. The report’s hash is timestamped publicly on OpenTimestamps.' },
        { tieuDe: 'You choose who sees it', mo: 'Each share is its own link for one recipient and one purpose, expires within 30 days at most, and can be revoked at any time.' },
      ],
      lamDuoc: [
        { tieuDe: 'No individual transactions', mo: 'The report has no line items, sender names, transfer notes or account numbers.' },
        { tieuDe: 'Recipients verify it themselves', mo: 'Anyone with the report and its .ots file can check it at opentimestamps.org without trusting MIMI.' },
        { tieuDe: 'Only owners and admins share', mo: 'The share code is shown once when created; MIMI stores only its hash.' },
      ],
      ranhGioi: [
        'MIMI does not lend, broker, send your file to any lender or promise approval.',
        'The revenue report is shared by the owner. It is not a credit score.',
      ],
      trongAppTen: 'Loans · Verified revenue',
      hoiDap: [
        { hoi: 'Why is revenue a range?', dap: 'Some incoming money may or may not be revenue, so revenue is shown from a lower to an upper bound. When that range crosses the 1 billion or 3 billion VND threshold, the report says the conclusion still depends on the unclear part.' },
        { hoi: 'What if I change my mind after sending?', dap: 'Revoke the link; the recipient can no longer open the report.' },
      ],
    },
  },

  /* ── Chi tiêu & duyệt (đóng băng 16/11/2026, `lib/dongBang.ts`) ─────────────────────────────────────────── */

  /* ── Hoá đơn & chứng từ ───────────────────────────────────────── */
  {
    loai: 'san-pham', slug: 'hoa-don-qr', nhom: 'Hoá đơn & chứng từ', trangThai: 'dang-chay',
    ten: 'Hoá đơn kèm mã QR',
    motCau: 'Mỗi hoá đơn có mã VietQR mang mã tham chiếu riêng. Khách quét và trả; tiền vào thẳng tài khoản của bạn, hoá đơn tự chuyển sang đã thu khi sao kê khớp.',
    vanDe: {
      tieuDe: 'Thu được tiền rồi mà không biết khoản nào',
      doan: 'Khách chuyển khoản với nội dung tuỳ ý, kế toán phải dò từng dòng sao kê để biết hoá đơn nào đã thu. Công nợ trễ hạn là chuyện phổ biến, và dò tay làm nó trễ thêm.',
      soLieu: ATRADIUS,
    },
    cachHoatDong: [
      { tieuDe: 'Liên kết tài khoản nhận', mo: 'Liên kết tài khoản nhận tiền qua Cas (QR Pay) ở trang Kết nối — chỉ quyền nhận tiền bằng mã QR.' },
      { tieuDe: 'Tạo hoá đơn, bấm mã QR', mo: 'Mã VietQR trỏ tới tài khoản của bạn, kèm số tiền và mã tham chiếu MIMI trong nội dung chuyển khoản.' },
      { tieuDe: 'Khách quét và trả', mo: 'Tiền vào thẳng tài khoản ngân hàng của bạn, không đi qua MIMI.' },
      { tieuDe: 'Tự khớp', mo: 'Khi giao dịch về sổ (liên kết Cas hoặc tệp sao kê tải lên) mang đúng mã tham chiếu và số tiền, hoá đơn chuyển sang đã thu.' },
    ],
    lamDuoc: [
      { tieuDe: 'Mã QR cho khoản thu rời', mo: 'Tạo mã cho một số tiền bất kỳ, không cần phát hành hoá đơn trước.' },
      { tieuDe: 'Trả thiếu không tự đóng', mo: 'Số tiền lệch thì không tự tất toán — khoản còn thiếu không bị giấu đi.' },
      { tieuDe: 'Xuất danh sách hoá đơn', mo: 'Tải danh sách hoá đơn dạng CSV để đưa cho kế toán.' },
    ],
    ranhGioi: [
      'MIMI không giữ tiền và không thu hộ — tiền vào thẳng tài khoản của bạn.',
      'Khách sửa nội dung chuyển khoản thì không tự khớp được; bạn xác nhận tay.',
      'Đây là hoá đơn nội bộ để thu tiền, không thay hoá đơn điện tử phát hành với cơ quan thuế.',
    ],
    trongApp: { ten: 'Hoá đơn', duong: '/dashboard/invoices' },
    hoiDap: [
      { hoi: 'Có cần nối ngân hàng qua Cas không?', dap: 'Không bắt buộc. Không liên kết thì bạn tải tệp sao kê lên; giao dịch có mã tham chiếu vẫn tự khớp.' },
      { hoi: 'Khách trả bằng ví điện tử được không?', dap: 'Được nếu ví đó quét và trả được mã VietQR chuyển khoản ngân hàng.' },
    ],
    lienQuan: ['/san-pham/doi-soat-sao-ke', '/san-pham/chung-tu-chi-phi', '/giai-phap/thuong-mai-dien-tu'],
  },
  {
    loai: 'san-pham', slug: 'chung-tu-chi-phi', nhom: 'Hoá đơn & chứng từ', trangThai: 'dang-chay',
    ten: 'Chứng từ chi phí',
    motCau: 'Ghép tiền đã chi trong sao kê với chứng từ bạn chụp, để biết khoản nào đã có giấy tờ, khoản nào còn thiếu — theo đúng kỳ kê khai đang tới hạn.',
    vanDe: {
      tieuDe: 'Không có giấy tờ thì không được trừ chi phí',
      doan: 'Từ 2026 hộ kinh doanh được chọn tính thuế theo lợi nhuận — nhưng chỉ khi chứng minh được chi phí. Tiền ra nằm ở ngân hàng, hoá đơn nằm ở cơ quan thuế; không ai ghép hai thứ đó lại cho bạn.',
    },
    cachHoatDong: [
      { tieuDe: 'Đọc hai nguồn', mo: 'Tiền ra từ sao kê ngân hàng, và hoá đơn, chứng từ bạn lưu trong Thư viện chứng từ.' },
      { tieuDe: 'Ghép', mo: 'Theo số hoá đơn có trong nội dung chuyển khoản, hoặc theo số tiền và ngày gần nhau.' },
      { tieuDe: 'Chia ba nhóm', mo: 'Đã ghép · cần xem (ghép mơ hồ) · chưa có giấy tờ.' },
      { tieuDe: 'Theo kỳ đang tới hạn', mo: 'Chỉ đọc quý đang tới hạn kê khai, kèm số ngày còn lại.' },
    ],
    lamDuoc: [
      { tieuDe: 'Không ghép đoán', mo: 'Hai hoá đơn cùng số tiền trong cùng tuần thì xếp vào "cần xem", không chọn đại một cái.' },
      { tieuDe: 'Nói đúng chữ', mo: 'Khoản chi chưa có hoá đơn là "chưa có giấy tờ", không phải "không hợp lệ" — có thể bạn có hoá đơn giấy.' },
      { tieuDe: 'Hoá đơn trả tiền mặt vẫn tính', mo: 'Hoá đơn không có khoản chuyển khoản tương ứng vẫn là giấy tờ hợp lệ.' },
      { tieuDe: 'Nối sang cách tính thuế', mo: 'Tổng chi phí có chứng từ đi thẳng vào khối so sánh hai cách tính thuế.' },
    ],
    ranhGioi: [
      'MIMI không nộp tờ khai thay bạn.',
      'Việc một khoản chi có được trừ hay không vẫn theo quy định thuế; MIMI chỉ chỉ ra khoản nào đã có giấy tờ.',
    ],
    trongApp: { ten: 'Chứng từ chi phí', duong: '/dashboard/chung-tu' },
    hoiDap: [
      { hoi: 'Trang trống thì làm gì?', dap: 'Mỗi trạng thái trống đều chỉ việc cần làm: nối ngân hàng để có tiền ra, hoặc chụp hoá đơn để có giấy tờ.' },
      { hoi: 'Vì sao chỉ đọc một quý?', dap: 'Chi phí được trừ trong kỳ phát sinh. Gộp cả năm ra một con số to hơn nhưng không mang đi khai được.' },
    ],
    lienQuan: ['/san-pham/hai-cach-tinh-thue', '/giai-phap/ho-kinh-doanh'],
  },
  {
    loai: 'san-pham', slug: 'doi-soat-sao-ke', nhom: 'Sổ & thuế', trangThai: 'dang-chay',
    ten: 'Đối soát sao kê',
    motCau: 'Khớp tiền vào với hoá đơn và lần bán tại quầy bằng mã tham chiếu — không đoán theo nội dung chuyển khoản tự do.',
    vanDe: {
      tieuDe: 'Sao kê nhiều dòng, không dòng nào tự nói nó là gì',
      doan: 'Dò sao kê bằng mắt là cách phổ biến nhất và dễ sai nhất. Khi có mã tham chiếu do chính hệ thống sinh ra, khớp là chắc chắn đúng khoản.',
    },
    cachHoatDong: [
      { tieuDe: 'Sinh mã tham chiếu', mo: 'Mỗi hoá đơn QR và lần bán VietQR tại quầy có mã MIMI kèm ký tự ngẫu nhiên, đặt trong nội dung chuyển khoản.' },
      { tieuDe: 'Nhận giao dịch', mo: 'Liên kết Cas đọc lịch sử giao dịch; hoặc bạn tải tệp sao kê Excel/CSV lên.' },
      { tieuDe: 'Khớp', mo: 'Theo mã tham chiếu, hoặc theo tài khoản ảo của mã QR. Số tiền phải khớp.' },
      { tieuDe: 'Chuyển trạng thái', mo: 'Hoá đơn thành đã thu; lần bán chuyển khoản tại quầy thành đã thu.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hai đường độc lập', mo: 'Liên kết Cas và tệp sao kê chạy song song — liên kết trục trặc thì vẫn tải sao kê được.' },
      { tieuDe: 'Lệch thì để người xem', mo: 'Trả thiếu hay trả thừa không tự áp, không tự đóng hoá đơn.' },
      { tieuDe: 'Nhật ký webhook', mo: 'Mọi thông báo nhận được đều ghi lại trước khi xử lý, kể cả thông báo không đọc được.' },
    ],
    ranhGioi: [
      'Giao dịch không mang mã tham chiếu thì không tự khớp — MIMI không đoán.',
      'Thông báo từ bên ngoài chỉ là lời báo; MIMI hỏi lại nguồn trước khi đổi trạng thái liên kết.',
    ],
    trongApp: { ten: 'Fintech Hub', duong: '/dashboard/fintech' },
    hoiDap: [
      { hoi: 'Có bắt buộc liên kết ngân hàng không?', dap: 'Không. Tải tệp sao kê là đủ; liên kết Cas giúp giao dịch tự về, khỏi tải tay.' },
      { hoi: 'Tiền vào không có mã thì sao?', dap: 'Vẫn được ghi vào sổ; chỉ là không tự khớp với hoá đơn nào.' },
    ],
    lienQuan: ['/san-pham/hoa-don-qr', '/san-pham/ket-noi'],
  },
  {
    loai: 'san-pham', slug: 'hai-cach-tinh-thue', nhom: 'Sổ & thuế', trangThai: 'dang-chay',
    ten: 'Hai cách tính thuế',
    motCau: 'Hộ kinh doanh doanh thu trên 01 tỷ đến 3 tỷ được chọn cách tính thuế. MIMI so hai cách và cho biết còn thiếu bao nhiêu chứng từ thì cách theo lợi nhuận rẻ hơn.',
    vanDe: {
      tieuDe: 'Chọn sai là mất tiền thật',
      doan: 'Từ 01/01/2026 hết thuế khoán. Hộ trên 01 tỷ đến 3 tỷ được chọn: 15% trên thu nhập (doanh thu trừ chi phí, chỉ khi có chứng từ) hoặc tỷ lệ theo ngành trên phần doanh thu vượt 01 tỷ. Căn cứ: Luật Thuế TNCN 109/2025/QH15; Nghị định 68/2026/NĐ-CP sửa bởi Nghị định 141/2026/NĐ-CP (nâng ngưỡng lên 01 tỷ).',
    },
    cachHoatDong: [
      { tieuDe: 'Doanh thu năm', mo: 'Lấy doanh thu năm — ngưỡng là ngưỡng năm, không dùng doanh thu một quý.' },
      { tieuDe: 'Chi phí có chứng từ', mo: 'Chỉ tính phần chi phí đã có giấy tờ, lấy từ Chứng từ chi phí.' },
      { tieuDe: 'Tỷ lệ ngành của bạn', mo: 'Bạn nhập tỷ lệ áp cho ngành nghề của mình — MIMI không đoán hộ.' },
      { tieuDe: 'So và giải thích', mo: 'Thuế theo từng cách, chênh lệch, và số chứng từ còn thiếu để cách theo lợi nhuận rẻ hơn.' },
    ],
    lamDuoc: [
      { tieuDe: 'Ngưỡng đúng', mo: 'Từ 01 tỷ trở xuống: chưa phải nộp thuế TNCN và GTGT (vẫn phải thông báo doanh thu). Trên 3 tỷ: không còn được chọn.' },
      { tieuDe: 'Trừ 01 tỷ trước khi nhân', mo: 'Cách theo tỷ lệ tính trên phần vượt 01 tỷ, không nhân trên toàn bộ doanh thu.' },
      { tieuDe: 'Hạn kê khai theo quý', mo: 'Quý I hạn 30/04, quý II 31/07, quý III 31/10, quý IV 31/01 năm sau — đếm ngày còn lại.' },
    ],
    ranhGioi: [
      'Đây là ước tính giúp bạn quyết định, không phải xác định thuế thay cơ quan thuế.',
      'Không tính thuế giá trị gia tăng; chỉ phần thuế thu nhập cá nhân.',
      'Không tự lùi hạn khi rơi vào ngày nghỉ — hiển thị ngày luật định, là mốc sớm nhất.',
    ],
    trongApp: { ten: 'Chứng từ chi phí → chọn cách tính thuế', duong: '/dashboard/chung-tu' },
    hoiDap: [
      { hoi: 'Tôi không biết tỷ lệ ngành mình?', dap: 'Hỏi kế toán hoặc cơ quan thuế quản lý. MIMI để bạn nhập vì đoán sai tỷ lệ là sai tiền.' },
      { hoi: 'MIMI có nộp tờ khai giúp tôi không?', dap: 'Không. MIMI chuẩn bị số liệu và chứng từ; bạn hoặc kế toán nộp.' },
    ],
    lienQuan: ['/san-pham/chung-tu-chi-phi', '/giai-phap/ho-kinh-doanh'],
  },

  /* ── Nền tảng ─────────────────────────────────────────────────── */
  {
    loai: 'san-pham', slug: 'bao-mat', nhom: 'Nền tảng', trangThai: 'dang-chay',
    ten: 'Bảo mật',
    motCau: 'Mã truy cập ngân hàng mã hoá kháng lượng tử, dữ liệu mỗi công ty tách ở tầng cơ sở dữ liệu, đường dẫn chia sẻ báo cáo chỉ lưu bản băm.',
    vanDe: {
      tieuDe: 'Dữ liệu tài chính là thứ phải giữ chặt nhất',
      doan: 'Sao kê, hoá đơn và quyền đọc tài khoản ngân hàng nói lên toàn bộ việc kinh doanh. Bảo vệ phải nằm ở tầng dữ liệu, không chỉ ở màn hình đăng nhập.',
    },
    cachHoatDong: [
      { tieuDe: 'Mã hoá mã truy cập', mo: 'Mã truy cập ngân hàng mã hoá bằng ML-KEM-768 (chuẩn NIST FIPS 203) kết hợp AES-256-GCM.' },
      { tieuDe: 'Tách dữ liệu', mo: 'Row-Level Security: mỗi công ty chỉ đọc được dữ liệu của mình, chặn ngay trong cơ sở dữ liệu.' },
      { tieuDe: 'Mã chia sẻ', mo: 'Đường dẫn chia sẻ báo cáo doanh thu mang mã ngẫu nhiên 256 bit; MIMI chỉ lưu SHA-256 của mã, lộ cơ sở dữ liệu cũng không mở được báo cáo.' },
      { tieuDe: 'Dấu thời gian công khai', mo: 'Chỉ mã băm của báo cáo doanh thu rời MIMI để ghi lên OpenTimestamps — không tên, không số tiền, không mã số thuế.' },
    ],
    lamDuoc: [
      { tieuDe: 'Không thấy mật khẩu ngân hàng', mo: 'Bạn nhập thông tin đăng nhập trên giao diện của Cas; MIMI không nhìn thấy.' },
      { tieuDe: 'Đồng ý có phiên bản', mo: 'Sự đồng ý chia sẻ dữ liệu được ghi kèm phiên bản điều khoản, theo tinh thần Nghị định 13/2023/NĐ-CP.' },
      { tieuDe: 'Định danh đọc một lần', mo: 'Khi bắt buộc đọc thông tin định danh, MIMI chỉ giữ tên trường, không lưu giá trị, và thu hồi quyền ngay.' },
      { tieuDe: 'Webhook không được tin mù', mo: 'Thông báo thu hồi quyền phải được hỏi lại nguồn trước khi MIMI hành động.' },
    ],
    ranhGioi: [
      'MIMI không giữ tiền và không có quyền chuyển tiền — quyền truy cập ngân hàng chỉ ở mức đọc.',
      'Mã hoá kháng lượng tử bảo vệ mã truy cập lưu trữ; nó không thay việc bạn giữ an toàn thiết bị và tài khoản của mình.',
    ],
    hoiDap: [
      { hoi: 'Tôi ngắt liên kết thì dữ liệu còn không?', dap: 'Mã truy cập bị xoá ngay khi ngắt. Dòng liên kết giữ lại để có dấu vết kiểm toán về thời điểm ngắt.' },
    ],
    lienQuan: ['/san-pham/ket-noi', '/san-pham/ho-so-vay'],
  },
  {
    loai: 'san-pham', slug: 'ket-noi', nhom: 'Nền tảng', trangThai: 'dang-chay',
    ten: 'Kết nối',
    motCau: 'Những dịch vụ MIMI đang kết nối tới để đọc giao dịch, nhận thông báo tiền về và thu tiền bằng mã QR.',
    vanDe: {
      tieuDe: 'Tiền và giấy tờ nằm ở nhiều chỗ',
      doan: 'Ngân hàng giữ tiền, tiền mặt nằm ở quầy, hoá đơn nằm trong ngăn kéo. MIMI nối các nguồn đó lại để doanh thu và chi phí trên tờ khai có nguồn.',
    },
    cachHoatDong: [
      { tieuDe: 'Cas', mo: 'Liên kết tài khoản ngân hàng để đọc giao dịch và nhận tiền QR. Ngắt quyền trong app Cas thì MIMI tự ghi nhận.' },
      { tieuDe: 'Tệp sao kê', mo: 'Tải tệp Excel/CSV từ ứng dụng ngân hàng — không cần cấp quyền gì.' },
      { tieuDe: 'VietQR', mo: 'Chuẩn mã QR chuyển khoản, cho hoá đơn và cho lần bán tại quầy.' },
      { tieuDe: 'Máy POS Android', mo: 'Màn bán tại quầy chạy trên trình duyệt của máy POS Android và điện thoại.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hai đường nhận giao dịch', mo: 'Liên kết Cas và tệp sao kê độc lập nhau.' },
      { tieuDe: 'Ngắt được mọi kết nối', mo: 'Ngắt thì mã truy cập bị xoá khỏi hệ thống.' },
      { tieuDe: 'Nhật ký kết nối', mo: 'Thông báo từ Cas được ghi lại, xem được trong Fintech Hub.' },
    ],
    ranhGioi: [
      'Đây là dịch vụ MIMI kết nối tới, không phải thoả thuận đối tác.',
    ],
    trongApp: { ten: 'Fintech Hub', duong: '/dashboard/fintech' },
    hoiDap: [
      { hoi: 'Ngân hàng của tôi có được hỗ trợ không?', dap: 'Cas Link hiện danh sách ngân hàng hỗ trợ khi bạn bấm liên kết. Ngân hàng nào xuất được tệp sao kê Excel/CSV thì đều tải lên được.' },
    ],
    lienQuan: ['/san-pham/doi-soat-sao-ke', '/san-pham/bao-mat'],
  },
];

const GIAI_PHAP_DAY_DU: TrangNoiDung[] = [
  /* ── Theo quy mô ──────────────────────────────────────────────── */
  {
    loai: 'giai-phap', slug: 'ho-kinh-doanh', nhom: 'Theo quy mô', trangThai: 'dang-chay',
    ten: 'Hộ kinh doanh',
    motCau: 'Từ 2026 hết thuế khoán. MIMI dựng sổ chi phí có chứng từ và so hai cách tính thuế, để bạn chọn cách có lợi với số liệu thật.',
    vanDe: {
      tieuDe: 'Tự kê khai theo quý, và chỉ được chọn khi có chứng từ',
      doan: 'Hộ doanh thu trên 01 tỷ đến 3 tỷ được chọn tính thuế theo lợi nhuận hoặc theo tỷ lệ doanh thu. Muốn chọn theo lợi nhuận phải chứng minh được chi phí.',
    },
    cachHoatDong: [
      { tieuDe: 'Nối sao kê và hoá đơn', mo: 'Tiền ra từ ngân hàng, hoá đơn mua vào từ Tổng cục Thuế.' },
      { tieuDe: 'Xem chứng từ còn thiếu', mo: 'Theo quý đang tới hạn, kèm số ngày còn lại.' },
      { tieuDe: 'So hai cách tính', mo: 'Thuế theo từng cách và số chứng từ còn thiếu để cách lợi nhuận rẻ hơn.' },
    ],
    lamDuoc: [
      { tieuDe: 'Theo dõi ngưỡng 01 tỷ', mo: 'Từ 01 tỷ trở xuống chưa phải nộp thuế TNCN và GTGT.' },
      { tieuDe: 'Hạn kê khai theo quý', mo: '30/04 · 31/07 · 31/10 · 31/01 năm sau.' },
      { tieuDe: 'Thu tiền bằng QR', mo: 'Mã QR cho khoản thu, tự khớp khi tiền về.' },
    ],
    ranhGioi: ['MIMI ước tính để bạn quyết định; không xác định thuế và không nộp tờ khai thay bạn.'],
    trongApp: { ten: 'Tờ khai thuế', duong: '/dashboard/to-khai' },
    hoiDap: [
      { hoi: 'Doanh thu dưới 01 tỷ có cần MIMI?', dap: 'Vẫn cần thông báo doanh thu; sổ thu chi và theo dõi ngưỡng giúp biết lúc nào sắp vượt.' },
    ],
    lienQuan: ['/san-pham/khai-thue-ho-kinh-doanh', '/san-pham/hai-cach-tinh-thue'],
  },
  {
    // 16/11/2026: trang "Cho văn phòng kế toán" — viết lại theo màn /dashboard/van-phong đã chạy
    // (`supabase/functions/_shared/van-phong/danh-muc.ts`). Giá vẫn báo khi liên hệ.
    loai: 'giai-phap', slug: 'van-phong-ke-toan', nhom: 'Theo quy mô', trangThai: 'dang-chay',
    ten: 'Cho văn phòng kế toán',
    motCau: 'Bạn giữ sổ cho nhiều hộ kinh doanh. Màn Văn phòng gom mọi khách vào một chỗ: doanh thu năm so với ngưỡng, hạn thuế kế tiếp, tiền vào chờ chủ xác nhận và việc còn mở.',
    vanDe: {
      tieuDe: 'Nhiều khách, mỗi khách một mớ sao kê và một hạn thuế',
      doan: 'Từ 2026 hộ kinh doanh tự khai thuế, và nhiều hộ nhờ văn phòng dịch vụ làm. Mở từng khách để xem ai sắp tới hạn, ai sắp vượt ngưỡng là việc lặp lại mỗi tuần.',
    },
    cachHoatDong: [
      { tieuDe: 'Mỗi khách là một công ty trong MIMI', mo: 'Bạn là thành viên của công ty đó với vai chủ, quản trị hoặc kế toán.' },
      { tieuDe: 'Một danh mục', mo: 'Mỗi khách một dòng: doanh thu năm nay dạng khoảng so với ngưỡng 01 tỷ và 3 tỷ, sẵn sàng khai thuế và mốc kế tiếp.' },
      { tieuDe: 'Xếp việc cần làm trước', mo: 'Danh mục xếp khách cần làm trước lên đầu, kèm số khoản tiền vào chờ chủ xác nhận và hồ sơ việc còn mở.' },
      { tieuDe: 'Làm việc cho từng khách', mo: 'Chuyển sang công ty của khách để soạn tờ khai, xem chứng từ và bán tại quầy, trên cùng số liệu với danh mục.' },
    ],
    lamDuoc: [
      { tieuDe: 'Cùng một cách tính', mo: 'Danh mục dùng đúng số liệu doanh thu và lịch thuế mà tờ khai của khách dùng, không tính lại kiểu khác.' },
      { tieuDe: 'Bán tại quầy hôm nay', mo: 'Thấy khách nào có bán tại quầy trong ngày.' },
      { tieuDe: 'Phân quyền chặt', mo: 'Người chỉ được xem một cơ sở của khách thì không thấy khách đó trong danh mục, vì doanh thu và thuế là số của cả công ty.' },
    ],
    ranhGioi: [
      'MIMI không nộp tờ khai thay văn phòng; bạn hoặc khách tự nộp.',
      'Mỗi lần tính tối đa 100 khách; quá số đó MIMI nói rõ bao nhiêu khách bị bỏ ngoài.',
    ],
    trongApp: { ten: 'Văn phòng kế toán', duong: '/dashboard/van-phong' },
    hoiDap: [
      { hoi: 'Giá bao nhiêu?', dap: 'Gói cho văn phòng báo giá khi liên hệ, tuỳ số khách và nhu cầu.' },
      { hoi: 'Khách của tôi có phải dùng MIMI không?', dap: 'Mỗi khách cần một công ty trong MIMI có bạn là thành viên với vai chủ, quản trị hoặc kế toán.' },
    ],
    lienQuan: ['/san-pham/khai-thue-ho-kinh-doanh', '/giai-phap/ho-kinh-doanh'],
    en: {
      nhom: 'By size', ten: 'For accounting firms',
      motCau: 'You keep the books for many household businesses. The Office screen puts every client in one place: annual revenue against the thresholds, the next tax deadline, incoming money awaiting the owner’s confirmation, and open work.',
      vanDe: {
        tieuDe: 'Many clients, each with a pile of statements and a deadline',
        doan: 'Since 2026 household businesses file their own tax, and many hand it to a bookkeeping firm. Opening each client to see who is near a deadline or a threshold is the same chore every week.',
      },
      cachHoatDong: [
        { tieuDe: 'Each client is a company in MIMI', mo: 'You are a member of that company as owner, admin or accountant.' },
        { tieuDe: 'One portfolio', mo: 'One row per client: this year’s revenue as a range against the 1 billion and 3 billion VND thresholds, tax readiness and the next deadline.' },
        { tieuDe: 'Most urgent first', mo: 'Clients that need work first are listed on top, with the count of incoming payments awaiting the owner and open cases.' },
        { tieuDe: 'Work on each client', mo: 'Switch to the client’s company to prepare the return, review expense records and counter sales, on the same figures as the portfolio.' },
      ],
      lamDuoc: [
        { tieuDe: 'One way of counting', mo: 'The portfolio uses exactly the revenue figures and tax calendar the client’s return uses.' },
        { tieuDe: 'Counter sales today', mo: 'See which clients sold at the counter today.' },
        { tieuDe: 'Strict permissions', mo: 'Members limited to one branch of a client do not see that client, because revenue and tax are company-wide figures.' },
      ],
      ranhGioi: [
        'MIMI does not file returns for the firm; you or the client file.',
        'Up to 100 clients are computed per run; beyond that MIMI states how many were left out.',
      ],
      trongAppTen: 'Accounting office',
      hoiDap: [
        { hoi: 'How much does it cost?', dap: 'The firm plan is quoted on contact, depending on the number of clients and your needs.' },
        { hoi: 'Do my clients have to use MIMI?', dap: 'Each client needs a company in MIMI with you as a member, as owner, admin or accountant.' },
      ],
    },
  },

  /* ── Theo ngành ───────────────────────────────────────────────── */
  {
    loai: 'giai-phap', slug: 'thuong-mai-dien-tu', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Thương mại điện tử',
    motCau: 'Thu tiền bằng mã QR có mã tham chiếu, tự khớp khi tiền về, và đưa doanh thu đã khớp vào tờ khai thuế.',
    vanDe: {
      tieuDe: 'Nhiều đơn, nhiều khoản chuyển khoản nhỏ',
      doan: 'Đơn nào đã trả, đơn nào chưa — dò bằng nội dung chuyển khoản tuỳ ý của khách là việc tốn thời gian nhất cuối ngày.',
      soLieu: ATRADIUS,
    },
    cachHoatDong: [
      { tieuDe: 'Tạo mã QR cho đơn', mo: 'Mỗi mã mang mã tham chiếu riêng.' },
      { tieuDe: 'Khách trả', mo: 'Tiền vào thẳng tài khoản của bạn.' },
      { tieuDe: 'Tự khớp', mo: 'Giao dịch về sổ mang đúng mã và số tiền thì tự khớp.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hoá đơn kèm mã QR', mo: 'Và mã QR cho khoản thu rời.' },
      { tieuDe: 'Đối soát sao kê', mo: 'Trả thiếu không tự đóng.' },
      { tieuDe: 'Khai thuế', mo: 'Doanh thu đã khớp đi vào tờ khai của hộ kinh doanh.' },
    ],
    ranhGioi: ['MIMI không nối sàn thương mại điện tử hay cổng thanh toán; mã QR là chuyển khoản ngân hàng.'],
    trongApp: { ten: 'Hoá đơn · Fintech Hub', duong: '/dashboard/invoices' },
    hoiDap: [
      { hoi: 'Tiền từ sàn đối soát được không?', dap: 'Khoản sàn chuyển về vẫn vào sổ; chỉ là không mang mã tham chiếu nên không tự khớp với đơn nào.' },
    ],
    lienQuan: ['/san-pham/hoa-don-qr', '/san-pham/doi-soat-sao-ke', '/san-pham/khai-thue-ho-kinh-doanh'],
  },
  {
    loai: 'giai-phap', slug: 'ban-le-dich-vu', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Bán lẻ & dịch vụ',
    motCau: 'Thu tiền mặt và VietQR tại quầy, sổ chi phí có chứng từ sẵn cho kỳ kê khai, và đếm ngày tới hạn.',
    vanDe: {
      tieuDe: 'Cửa hàng bận bán, sổ sách để cuối quý',
      doan: 'Tiền về nhiều khoản nhỏ, hoá đơn nhập hàng rải rác. Tới hạn kê khai mới gom lại thì thường thiếu chứng từ.',
    },
    cachHoatDong: [
      { tieuDe: 'Bán tại quầy', mo: 'Tiền mặt vào sổ ngay; VietQR tự khớp khi tiền về.' },
      { tieuDe: 'Nối hoá đơn nhập hàng', mo: 'Kéo hoá đơn mua vào từ Tổng cục Thuế.' },
      { tieuDe: 'Xem chứng từ theo quý', mo: 'Khoản nào còn thiếu, còn bao nhiêu ngày tới hạn.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hai cách tính thuế', mo: 'Cho hộ doanh thu trên 01 tỷ đến 3 tỷ.' },
      { tieuDe: 'Hạn kê khai', mo: 'Đếm ngày còn lại tới hạn quý.' },
      { tieuDe: 'Đối soát sao kê', mo: 'Tiền về khớp mã tham chiếu.' },
    ],
    ranhGioi: ['Bán tại quầy của MIMI thu tiền và ghi sổ; chưa quản lý tồn kho.'],
    hoiDap: [
      { hoi: 'Khách trả tiền mặt thì sao?', dap: 'Tiền mặt không có trong sao kê; bán bằng màn Bán tại quầy thì lần bán tiền mặt vào thẳng sổ của MIMI.' },
    ],
    lienQuan: ['/san-pham/hai-cach-tinh-thue', '/san-pham/chung-tu-chi-phi'],
  },
];

/**
 * ĐÓNG BĂNG (16/11/2026, `lib/dongBang.ts`): trang dựng quanh việc agent chi tiền (kiểm soát agent, duyệt chi, chống
 * chuyển nhầm, MCP & API, startup công nghệ, doanh nghiệp nhỏ và vừa, agency quảng cáo, phần mềm & AI) và trang dựa
 * vào danh bạ khách hàng đã đóng băng (dịch vụ chuyên môn). Nội dung giữ ở trên; bỏ khỏi `TRANG_DONG_BANG` là mở lại.
 */
const conHien = (t: TrangNoiDung) => !daDongBang(`/${t.loai}/${t.slug}`);
export const TRANG_SAN_PHAM: TrangNoiDung[] = SAN_PHAM_DAY_DU.filter(conHien);
export const TRANG_GIAI_PHAP: TrangNoiDung[] = GIAI_PHAP_DAY_DU.filter(conHien);
export const TRANG_NOI_DUNG_DONG_BANG: TrangNoiDung[] = [...SAN_PHAM_DAY_DU, ...GIAI_PHAP_DAY_DU].filter((t) => !conHien(t));

export const TAT_CA_TRANG: TrangNoiDung[] = [...TRANG_SAN_PHAM, ...TRANG_GIAI_PHAP];

export const duongDanTrang = (t: Pick<TrangNoiDung, 'loai' | 'slug'>) => `/${t.loai}/${t.slug}`;

export function timTrang(duong: string): TrangNoiDung | undefined {
  return TAT_CA_TRANG.find((t) => duongDanTrang(t) === duong);
}

/** Trang theo ngôn ngữ người đọc: khác tiếng Việt mà trang có bản tiếng Anh thì dùng bản đó. */
export function trangTheoNgonNgu(t: TrangNoiDung, lang: string): TrangNoiDung {
  if (!t.en || lang.startsWith('vi')) return t;
  const { trongAppTen, vanDe, ...con } = t.en;
  return {
    ...t,
    ...con,
    vanDe: { ...t.vanDe, ...vanDe },
    trongApp: t.trongApp && { ...t.trongApp, ten: trongAppTen ?? t.trongApp.ten },
  };
}
