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

export const TRANG_SAN_PHAM: TrangNoiDung[] = [
  /* ── Chi tiêu & duyệt ─────────────────────────────────────────── */
  {
    loai: 'san-pham', slug: 'kiem-soat-agent', nhom: 'Chi tiêu & duyệt', trangThai: 'dang-chay',
    ten: 'Kiểm soát agent',
    motCau: 'Mỗi agent AI một khoá riêng, một chính sách riêng. Agent xin chi; MIMI xét theo luật bạn đặt, hỏi bạn khi cần, và ghi mọi bước vào nhật ký không sửa được.',
    vanDe: {
      tieuDe: 'Agent làm việc nhanh — cũng chi tiền nhanh',
      doan: 'Khi agent được phép trả tiền cho API, quảng cáo hay nhà cung cấp, một lỗi cấu hình hay một vòng lặp có thể biến thành hàng trăm khoản chi trước khi có người nhìn thấy. Kiểm soát phải nằm trước lúc tiền đi, không phải trong báo cáo cuối tháng.',
      soLieu: AWS_AI,
    },
    cachHoatDong: [
      { tieuDe: 'Tạo agent', mo: 'Đặt tên, nhận khoá dạng mimi_ak_… Khoá chỉ hiện một lần; MIMI chỉ lưu bản băm SHA-256.' },
      { tieuDe: 'Đặt chính sách', mo: 'Trần mỗi lần, mỗi ngày, mỗi tháng (tính theo giờ Việt Nam), ngưỡng phải duyệt, nhóm chi được phép, người nhận lạ bị chặn hay phải hỏi, số yêu cầu tối đa mỗi giờ.' },
      { tieuDe: 'Agent xin chi', mo: 'Qua MCP hoặc API. Yêu cầu được ghi trước để giữ chỗ hạn mức, rồi mới xét — hai yêu cầu đồng thời không cùng lọt trần.' },
      { tieuDe: 'MIMI quyết', mo: 'Tự duyệt, chờ bạn duyệt, hoặc từ chối — luôn kèm mã lý do cho agent đọc và câu giải thích cho bạn đọc.' },
    ],
    lamDuoc: [
      { tieuDe: 'Mặc định chặt', mo: 'Agent mới phải xin duyệt mọi khoản và chỉ được chi cho người nhận trong danh sách. Bạn nới dần khi đã tin nó.' },
      { tieuDe: 'Sáu nhóm chi', mo: 'Hạ tầng AI, phần mềm, quảng cáo, nhà cung cấp hàng hoá, vận chuyển, khác — chọn nhóm nào agent được chi.' },
      { tieuDe: 'Tạm dừng và thu hồi', mo: 'Tạm dừng để chặn tạm. Thu hồi là vĩnh viễn và huỷ mọi khoản đã duyệt mà chưa trả của agent đó.' },
      { tieuDe: 'Chính sách có hạn', mo: 'Đặt ngày hết hạn; qua ngày đó agent không xin chi được cho tới khi bạn gia hạn.' },
      { tieuDe: 'Nhật ký chỉ thêm', mo: 'Tạo agent, đổi chính sách, xin chi, duyệt, từ chối, đã chi — mỗi sự kiện một dòng, CSDL chặn sửa.' },
      { tieuDe: 'Chống trùng', mo: 'Agent gửi lại cùng mã yêu cầu (mất mạng, thử lại) thì nhận lại yêu cầu cũ, không sinh khoản thứ hai.' },
    ],
    ranhGioi: [
      'MIMI không chuyển tiền. "Đã duyệt" nghĩa là có lệnh trả để bạn trả trong app ngân hàng.',
      'Luật xét khoản chi là luật tất định, không có mô hình ngôn ngữ nào quyết thay bạn.',
      'Khoá bị lộ thì kẻ lấy khoá cũng chỉ xin được trong trần, tới người nhận đã được phép, và vẫn cần người trả.',
    ],
    trongApp: { ten: 'Kiểm soát agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Agent của tôi viết bằng gì cũng dùng được?', dap: 'Được. Agent nào gọi được HTTP hoặc hỗ trợ MCP (Claude, Cursor…) đều nối được bằng khoá agent.' },
      { hoi: 'Tôi quên lưu khoá thì sao?', dap: 'MIMI không lưu khoá gốc nên không xem lại được. Cấp khoá mới cho agent đó; khoá cũ hết hiệu lực.' },
      { hoi: 'Bộ luật có được kiểm thử không?', dap: 'Có. Bộ 49 tình huống chuẩn phủ đủ mọi mã lý do, chạy lại mỗi lần sửa mã, kèm test cả vòng xin chi.' },
    ],
    lienQuan: ['/san-pham/duyet-chi', '/san-pham/chong-chuyen-nham', '/san-pham/mcp-api'],
  },
  {
    loai: 'san-pham', slug: 'duyet-chi', nhom: 'Chi tiêu & duyệt', trangThai: 'dang-chay',
    ten: 'Duyệt chi',
    motCau: 'Khoản trên ngưỡng hoặc tới người nhận mới dừng lại chờ bạn. Bạn đọc số tiền bằng chữ và lý do, bấm Duyệt — tiền chỉ đi khi bạn trả trong app ngân hàng.',
    vanDe: {
      tieuDe: 'Duyệt qua tin nhắn là duyệt mù',
      doan: 'Một tin "anh duyệt giúp em khoản này" không kèm người nhận, lý do hay lịch sử. Tiền Việt nhiều số 0, duyệt vội trên điện thoại rất dễ nhìn nhầm một chữ số.',
    },
    cachHoatDong: [
      { tieuDe: 'Khoản chờ duyệt đứng đầu trang', mo: 'Mở Kiểm soát agent là thấy ngay khoản đang chờ, trước mọi phần cấu hình.' },
      { tieuDe: 'Đọc đủ ngữ cảnh', mo: 'Số tiền, số tiền bằng chữ, người nhận, ngân hàng, nhóm chi, số hoá đơn nếu có, và lý do vì sao chờ bạn.' },
      { tieuDe: 'Duyệt hoặc từ chối', mo: 'Từ chối kèm lý do — agent đọc được để không gửi lại y nguyên.' },
      { tieuDe: 'Trả bằng lệnh trả VietQR', mo: 'Khoản đã duyệt có mã QR và nội dung chuyển khoản mang mã tham chiếu MIMI. Sao kê khớp mã thì tự thành "Đã chi".' },
    ],
    lamDuoc: [
      { tieuDe: 'Số tiền bằng chữ', mo: '"Bốn triệu năm trăm nghìn đồng" ngay dưới con số — thừa một số 0 là đọc ra khác hẳn.' },
      { tieuDe: 'Người nhận mới', mo: 'Cảnh báo riêng kèm cách gọi xác nhận; tick để thêm tài khoản vào danh sách được phép sau khi đã kiểm.' },
      { tieuDe: 'Trả ngay trên điện thoại', mo: 'Lưu ảnh mã QR để mở trong app ngân hàng, hoặc chép từng dòng: số tài khoản, số tiền, nội dung.' },
      { tieuDe: 'Lệnh trả có hạn 72 giờ', mo: 'Quá hạn thì trang nhắc kiểm lại trước khi trả. Bạn huỷ lệnh được bất cứ lúc nào trước khi trả.' },
      { tieuDe: 'Không có nút "đánh dấu đã chi"', mo: '"Đã chi" chỉ xuất hiện khi sao kê xác nhận — không ai tự khai được.' },
      { tieuDe: 'Khoản nhỏ tự duyệt', mo: 'Dưới ngưỡng, đúng nhóm, người nhận quen thì tự duyệt, bạn chỉ còn việc trả.' },
    ],
    ranhGioi: [
      'MIMI không trả tiền thay bạn và không giữ số dư nào.',
      'Duyệt hai người cho khoản lớn và thông báo đẩy tới điện thoại chưa có — nằm trong lộ trình.',
    ],
    trongApp: { ten: 'Kiểm soát agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Tôi trả sai nội dung chuyển khoản thì sao?', dap: 'Sao kê không khớp được mã tham chiếu nên khoản đó chưa tự thành "Đã chi". Giữ nguyên nội dung MIMI đưa để tự khớp.' },
      { hoi: 'Khoản đã duyệt có tự chuyển tiền không?', dap: 'Không. Tiền chỉ đi khi bạn trả trong app ngân hàng của mình.' },
    ],
    lienQuan: ['/san-pham/kiem-soat-agent', '/san-pham/chong-chuyen-nham', '/san-pham/doi-soat-sao-ke'],
  },
  {
    loai: 'san-pham', slug: 'chong-chuyen-nham', nhom: 'Chi tiêu & duyệt', trangThai: 'dang-chay',
    ten: 'Chống chuyển nhầm',
    motCau: 'Chặn người nhận lạ, giữ người nhận mới 24 giờ, cảnh báo đỏ khi cùng người nhận mà đổi số tài khoản, và chặn agent chạy vòng lặp.',
    vanDe: {
      tieuDe: 'Chuyển khoản nhanh, và khó lấy lại',
      doan: 'Kiểu lừa đảo hay gặp nhất với doanh nghiệp: giả làm nhà cung cấp quen, báo "đã đổi số tài khoản". Tên giữ nguyên, số tài khoản đổi. Kẻ gian thắng bằng sự vội — hai phần ba vụ diễn ra trong 24 giờ kể từ lần liên lạc đầu.',
      soLieu: GASA,
    },
    cachHoatDong: [
      { tieuDe: 'Người nhận lạ', mo: 'Tuỳ chính sách: từ chối thẳng, hoặc dừng lại chờ bạn xác nhận đúng tài khoản.' },
      { tieuDe: 'Người nhận vừa thêm', mo: 'Tài khoản thêm vào danh sách chưa đủ 24 giờ thì chưa được tự duyệt — mọi khoản phải có người bấm.' },
      { tieuDe: 'Đổi số tài khoản', mo: 'Cùng tên người nhận (so bỏ dấu, không phân biệt hoa thường) nhưng khác tài khoản đã trả trong 180 ngày qua → chờ duyệt, cảnh báo đỏ.' },
      { tieuDe: 'Vòng lặp', mo: 'Agent gửi quá số yêu cầu mỗi giờ (mặc định 30) thì bị từ chối — bắt được kiểu hỏng mà trần tiền bỏ lọt.' },
    ],
    lamDuoc: [
      { tieuDe: 'Từ chối thắng chờ duyệt', mo: 'Vượt trần hay vòng lặp là từ chối, không bị đẩy sang người duyệt như một cách lách.' },
      { tieuDe: 'Cách kiểm không qua kênh kẻ gian', mo: 'Cảnh báo hướng dẫn gọi xác nhận qua số điện thoại đã lưu từ trước, không dùng số trong tin nhắn đề nghị chuyển tiền.' },
      { tieuDe: 'Mã lý do rõ ràng', mo: 'NGUOI_NHAN_MOI_THEM, DOI_SO_TAI_KHOAN, VUOT_TAN_SUAT — agent và kế toán cùng đọc được.' },
      { tieuDe: 'Được kiểm thử bằng ca biên', mo: 'Thêm đúng 24 giờ, thiếu 1 phút, tên viết không dấu, tên quá ngắn — đều có tình huống chuẩn.' },
    ],
    ranhGioi: [
      'MIMI chưa tra được tên chủ tài khoản từ ngân hàng. Luôn đọc tên app ngân hàng hiện ra trước khi xác nhận.',
      'Tên quá ngắn (dưới 4 ký tự sau khi bỏ dấu) không được so, để tránh báo nhầm.',
      'Cảnh báo không thay được việc gọi xác nhận — nó chỉ làm bạn chậm lại đúng lúc.',
    ],
    trongApp: { ten: 'Kiểm soát agent → chính sách từng agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Nhà cung cấp đổi tài khoản thật thì sao?', dap: 'Gọi xác nhận, rồi thêm tài khoản mới vào danh sách được phép. Sau 24 giờ khoản chi tới tài khoản đó chạy bình thường.' },
      { hoi: 'Tôi muốn bỏ giới hạn số yêu cầu mỗi giờ?', dap: 'Để trống ô "Tối đa yêu cầu mỗi giờ" trong chính sách của agent đó.' },
    ],
    lienQuan: ['/san-pham/duyet-chi', '/san-pham/kiem-soat-agent', '/giai-phap/doanh-nghiep-nho-va-vua'],
  },

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
      { tieuDe: 'Khai tài khoản nhận', mo: 'Khai số tài khoản ở khối SePay trong Fintech Hub — chỉ khai số để nhận diện, không cấp quyền gì.' },
      { tieuDe: 'Tạo hoá đơn, bấm mã QR', mo: 'Mã VietQR trỏ tới tài khoản của bạn, kèm số tiền và mã tham chiếu MIMI trong nội dung chuyển khoản.' },
      { tieuDe: 'Khách quét và trả', mo: 'Tiền vào thẳng tài khoản ngân hàng của bạn, không đi qua MIMI.' },
      { tieuDe: 'Tự khớp', mo: 'SePay báo tiền về; mã tham chiếu và số tiền khớp thì hoá đơn chuyển sang đã thu.' },
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
      { hoi: 'Có cần nối ngân hàng qua Cas không?', dap: 'Không bắt buộc. Mã VietQR dựng ngay trên máy, còn báo tiền về đi qua SePay.' },
      { hoi: 'Khách trả bằng ví điện tử được không?', dap: 'Được nếu ví đó quét và trả được mã VietQR chuyển khoản ngân hàng.' },
    ],
    lienQuan: ['/san-pham/doi-soat-sao-ke', '/san-pham/chung-tu-chi-phi', '/giai-phap/thuong-mai-dien-tu'],
  },
  {
    loai: 'san-pham', slug: 'chung-tu-chi-phi', nhom: 'Hoá đơn & chứng từ', trangThai: 'dang-chay',
    ten: 'Chứng từ chi phí',
    motCau: 'Ghép tiền đã chi trong sao kê với hoá đơn đầu vào từ cơ quan thuế, để biết khoản nào đã có giấy tờ, khoản nào còn thiếu — theo đúng kỳ kê khai đang tới hạn.',
    vanDe: {
      tieuDe: 'Không có giấy tờ thì không được trừ chi phí',
      doan: 'Từ 2026 hộ kinh doanh được chọn tính thuế theo lợi nhuận — nhưng chỉ khi chứng minh được chi phí. Tiền ra nằm ở ngân hàng, hoá đơn nằm ở cơ quan thuế; không ai ghép hai thứ đó lại cho bạn.',
    },
    cachHoatDong: [
      { tieuDe: 'Đọc hai nguồn', mo: 'Tiền ra từ sao kê ngân hàng, và hoá đơn mua vào kéo từ Tổng cục Thuế.' },
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
      { hoi: 'Trang trống thì làm gì?', dap: 'Mỗi trạng thái trống đều chỉ việc cần làm: nối ngân hàng để có tiền ra, hoặc kết nối Tổng cục Thuế để có hoá đơn.' },
      { hoi: 'Vì sao chỉ đọc một quý?', dap: 'Chi phí được trừ trong kỳ phát sinh. Gộp cả năm ra một con số to hơn nhưng không mang đi khai được.' },
    ],
    lienQuan: ['/san-pham/hoa-don-dien-tu', '/san-pham/hai-cach-tinh-thue', '/giai-phap/ho-kinh-doanh'],
  },
  {
    loai: 'san-pham', slug: 'hoa-don-dien-tu', nhom: 'Hoá đơn & chứng từ', trangThai: 'dang-chay',
    ten: 'Hoá đơn điện tử',
    motCau: 'Kéo hoá đơn điện tử bán ra và mua vào từ hệ thống của cơ quan thuế — chỉ đọc, chỉ sau khi bạn đồng ý.',
    vanDe: {
      tieuDe: 'Hoá đơn đã có, chỉ là nằm ở chỗ khác',
      doan: 'Hoá đơn điện tử của bạn đã nằm trên hệ thống thuế. Tải tay từng tháng, lưu vào thư mục, rồi đối chiếu với sao kê là việc lặp lại mà không thêm giá trị nào.',
    },
    cachHoatDong: [
      { tieuDe: 'Đồng ý chia sẻ', mo: 'MIMI ghi nhận sự đồng ý chia sẻ dữ liệu thuế, kèm phiên bản điều khoản bạn đã đọc.' },
      { tieuDe: 'Kết nối qua Cas', mo: 'Bấm "Kết nối Tổng Cục Thuế" trong Fintech Hub và xác thực trên giao diện của Cas.' },
      { tieuDe: 'Đồng bộ', mo: 'MIMI kéo hoá đơn trong khoảng thời gian bạn chọn; hoá đơn đã có không bị ghi trùng.' },
    ],
    lamDuoc: [
      { tieuDe: 'Chứng từ chi phí', mo: 'Hoá đơn mua vào được ghép với tiền đã chi.' },
      { tieuDe: 'Doanh thu từ hoá đơn', mo: 'Hoá đơn bán ra cho con số doanh thu thay vì đoán từ nội dung chuyển khoản.' },
      { tieuDe: 'Ngắt bất cứ lúc nào', mo: 'Ngắt kết nối thì mã truy cập bị xoá khỏi hệ thống.' },
    ],
    ranhGioi: [
      'Chỉ đọc. MIMI không phát hành hoá đơn và không nộp hồ sơ thuế thay bạn.',
      'Logo cơ quan thuế trên trang không hàm ý chứng nhận hay bảo trợ.',
    ],
    trongApp: { ten: 'Fintech Hub → Kết nối Tổng Cục Thuế', duong: '/dashboard/fintech' },
    hoiDap: [
      { hoi: 'MIMI có thấy mật khẩu của tôi không?', dap: 'Không. Bạn xác thực trên giao diện của Cas; MIMI chỉ nhận mã truy cập đã mã hoá.' },
      { hoi: 'Đồng bộ báo thiếu mã số thuế?', dap: 'Vào Cài đặt điền mã số thuế của doanh nghiệp rồi đồng bộ lại.' },
    ],
    lienQuan: ['/san-pham/chung-tu-chi-phi', '/san-pham/ket-noi', '/san-pham/bao-mat'],
  },

  /* ── Sổ & thuế ────────────────────────────────────────────────── */
  {
    loai: 'san-pham', slug: 'doi-soat-sao-ke', nhom: 'Sổ & thuế', trangThai: 'dang-chay',
    ten: 'Đối soát sao kê',
    motCau: 'Khớp tiền vào, tiền ra với hoá đơn và lệnh trả bằng mã tham chiếu — không đoán theo nội dung tự do.',
    vanDe: {
      tieuDe: 'Sao kê nhiều dòng, không dòng nào tự nói nó là gì',
      doan: 'Dò sao kê bằng mắt là cách phổ biến nhất và dễ sai nhất. Khi có mã tham chiếu do chính hệ thống sinh ra, khớp là chắc chắn đúng khoản.',
    },
    cachHoatDong: [
      { tieuDe: 'Sinh mã tham chiếu', mo: 'Mỗi hoá đơn QR và lệnh trả có mã MIMI kèm ký tự ngẫu nhiên, đặt trong nội dung chuyển khoản.' },
      { tieuDe: 'Nhận giao dịch', mo: 'SePay báo từng giao dịch theo thời gian thực; liên kết Cas đọc lịch sử giao dịch.' },
      { tieuDe: 'Khớp', mo: 'Theo mã tham chiếu, hoặc theo tài khoản ảo của mã QR. Số tiền phải khớp.' },
      { tieuDe: 'Chuyển trạng thái', mo: 'Hoá đơn thành đã thu; lệnh trả của agent thành "Đã chi".' },
    ],
    lamDuoc: [
      { tieuDe: 'Hai đường độc lập', mo: 'SePay và Cas chạy song song — một bên trục trặc, bên kia vẫn nhận được giao dịch.' },
      { tieuDe: 'Lệch thì để người xem', mo: 'Trả thiếu hay trả thừa không tự áp, không tự đóng hoá đơn.' },
      { tieuDe: 'Nhật ký webhook', mo: 'Mọi thông báo nhận được đều ghi lại trước khi xử lý, kể cả thông báo không đọc được.' },
    ],
    ranhGioi: [
      'Giao dịch không mang mã tham chiếu thì không tự khớp — MIMI không đoán.',
      'Thông báo từ bên ngoài chỉ là lời báo; MIMI hỏi lại nguồn trước khi đổi trạng thái liên kết.',
    ],
    trongApp: { ten: 'Fintech Hub', duong: '/dashboard/fintech' },
    hoiDap: [
      { hoi: 'Có cần cả SePay lẫn Cas không?', dap: 'Không. SePay đủ để báo tiền về; Cas thêm lịch sử giao dịch và kết nối hoá đơn điện tử.' },
      { hoi: 'Tiền vào không có mã thì sao?', dap: 'Vẫn được ghi vào sổ; chỉ là không tự khớp với hoá đơn nào.' },
    ],
    lienQuan: ['/san-pham/hoa-don-qr', '/san-pham/ket-noi', '/san-pham/duyet-chi'],
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
    lienQuan: ['/san-pham/chung-tu-chi-phi', '/san-pham/hoa-don-dien-tu', '/giai-phap/ho-kinh-doanh'],
  },

  /* ── Nền tảng ─────────────────────────────────────────────────── */
  {
    loai: 'san-pham', slug: 'mcp-api', nhom: 'Nền tảng', trangThai: 'dang-chay',
    ten: 'MCP & API cho agent',
    motCau: 'Nối agent vào MIMI bằng một lệnh. Bốn công cụ qua MCP, cùng một bộ xử lý với API HTTP — hai cửa không bao giờ kiểm khác nhau.',
    vanDe: {
      tieuDe: 'Mỗi agent một kiểu tích hợp là mỗi chỗ một lỗ hổng',
      doan: 'Nếu mỗi cửa vào tự viết lại cách xin chi, sẽ có ngày một cửa quên kiểm hạn mức — và agent sẽ đi đúng cửa đó.',
    },
    cachHoatDong: [
      { tieuDe: 'Tạo khoá', mo: 'Trong Kiểm soát agent, tạo agent và lấy khoá mimi_ak_…' },
      { tieuDe: 'Nối', mo: 'Claude Code: claude mcp add --transport http mimi …/functions/v1/mcp --header "x-mimi-agent-key: mimi_ak_…". Cursor: thêm vào mcp.json. Client chỉ đặt được Bearer thì dùng Authorization: Bearer.' },
      { tieuDe: 'Gọi', mo: 'xem_chinh_sach → xin_chi → xem_yeu_cau cho tới khi sao kê xác nhận đã chi.' },
    ],
    lamDuoc: [
      { tieuDe: 'xem_chinh_sach', mo: 'Hạn mức còn lại mỗi lần, ngày, tháng và nhóm chi — hỏi trước thay vì thử rồi bị từ chối.' },
      { tieuDe: 'xin_chi', mo: 'Gửi yêu cầu; nhận quyết định kèm lý do. Đã duyệt thì có lệnh trả với nội dung chuyển khoản.' },
      { tieuDe: 'xem_yeu_cau', mo: 'Theo dõi trạng thái; "da_chi" kèm giao dịch sao kê là bằng chứng.' },
      { tieuDe: 'tra_ma_ngan_hang', mo: 'Tra mã BIN ngân hàng từ tên thường gọi.' },
      { tieuDe: 'Chống trùng', mo: 'ma_yeu_cau giống nhau thì nhận lại yêu cầu cũ, trung_lap: true.' },
      { tieuDe: 'Liệt kê không cần khoá', mo: 'tools/list trả danh sách công cụ khi chưa có khoá; gọi công cụ thì bắt buộc khoá.' },
    ],
    ranhGioi: [
      'Bị từ chối theo chính sách (HTTP 422) không phải lỗi công cụ — agent đọc lý do và sửa yêu cầu.',
      'Agent chỉ đọc được yêu cầu của chính nó, không thấy của agent khác.',
      'Không có công cụ chuyển tiền.',
    ],
    trongApp: { ten: 'Kiểm soát agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Có SDK không?', dap: 'Chưa. MCP và một endpoint HTTP JSON là đủ cho phần lớn agent; tài liệu đầy đủ đi kèm khi bạn tạo khoá.' },
      { hoi: 'Có môi trường thử không?', dap: 'Tạo một agent riêng với trần thấp và chính sách phải duyệt mọi khoản để thử an toàn.' },
    ],
    lienQuan: ['/san-pham/kiem-soat-agent', '/giai-phap/phan-mem-ai', '/giai-phap/startup-cong-nghe'],
  },
  {
    loai: 'san-pham', slug: 'chi-phi-ai', nhom: 'Nền tảng', trangThai: 'dang-xay',
    ten: 'Chi phí AI',
    motCau: 'Thấy chi phí AI theo mô hình, người dùng và dự án, đặt ngân sách tháng và nhận cảnh báo khi gần chạm. Chức năng đang xây.',
    vanDe: {
      tieuDe: 'Chi phí AI tăng mà không ai thấy',
      doan: 'Tiền trả cho API AI thường đi qua thẻ quốc tế nên sao kê chuyển khoản không thấy đủ. Muốn biết chi bao nhiêu, cho dự án nào, phải nối thẳng dữ liệu sử dụng của nhà cung cấp.',
      soLieu: AWS_AI,
    },
    cachHoatDong: [
      { tieuDe: 'Nối khoá quản trị chỉ-đọc', mo: 'Dự kiến nối khoá xem sử dụng của nhà cung cấp AI — không cần nối ngân hàng.' },
      { tieuDe: 'Chia theo mô hình và dự án', mo: 'Chi phí theo mô hình, người dùng, dự án.' },
      { tieuDe: 'Ngân sách và cảnh báo', mo: 'Đặt ngân sách tháng, cảnh báo khi gần chạm.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hôm nay đã làm được', mo: 'Cho agent chi nhóm "Hạ tầng AI" với trần mỗi lần, ngày, tháng riêng trong Kiểm soát agent.' },
      { tieuDe: 'Mốc dự kiến', mo: 'Chu kỳ S1, 29/09–12/10/2026. Đây là mục tiêu, không phải cam kết.' },
      { tieuDe: 'Đăng ký dùng sớm', mo: 'Để lại liên hệ để được mời thử khi chức năng sẵn sàng.' },
    ],
    ranhGioi: [
      'Chức năng này CHƯA có trong app.',
      'Trước khi làm, MIMI sẽ đọc tài liệu API sử dụng của từng nhà cung cấp để xác nhận trường dữ liệu và quyền chỉ-đọc.',
    ],
    hoiDap: [
      { hoi: 'Khi nào có?', dap: 'Mục tiêu là chu kỳ 29/09–12/10/2026. Trang Cập nhật sản phẩm sẽ ghi khi chức năng thật sự chạy.' },
    ],
    lienQuan: ['/san-pham/kiem-soat-agent', '/giai-phap/phan-mem-ai', '/giai-phap/startup-cong-nghe'],
  },
  {
    loai: 'san-pham', slug: 'bao-mat', nhom: 'Nền tảng', trangThai: 'dang-chay',
    ten: 'Bảo mật',
    motCau: 'Mã truy cập ngân hàng mã hoá kháng lượng tử, dữ liệu mỗi công ty tách ở tầng cơ sở dữ liệu, khoá agent chỉ lưu bản băm, nhật ký không sửa được.',
    vanDe: {
      tieuDe: 'Dữ liệu tài chính là thứ phải giữ chặt nhất',
      doan: 'Sao kê, hoá đơn và quyền đọc tài khoản ngân hàng nói lên toàn bộ việc kinh doanh. Bảo vệ phải nằm ở tầng dữ liệu, không chỉ ở màn hình đăng nhập.',
    },
    cachHoatDong: [
      { tieuDe: 'Mã hoá mã truy cập', mo: 'Mã truy cập ngân hàng mã hoá bằng ML-KEM-768 (chuẩn NIST FIPS 203) kết hợp AES-256-GCM.' },
      { tieuDe: 'Tách dữ liệu', mo: 'Row-Level Security: mỗi công ty chỉ đọc được dữ liệu của mình, chặn ngay trong cơ sở dữ liệu.' },
      { tieuDe: 'Khoá agent', mo: 'Chỉ lưu SHA-256 của khoá; lộ cơ sở dữ liệu không lộ khoá dùng được.' },
      { tieuDe: 'Nhật ký', mo: 'Nhật ký agent có ràng buộc chặn sửa ở tầng cơ sở dữ liệu.' },
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
    lienQuan: ['/san-pham/ket-noi', '/san-pham/kiem-soat-agent', '/san-pham/hoa-don-dien-tu'],
  },
  {
    loai: 'san-pham', slug: 'ket-noi', nhom: 'Nền tảng', trangThai: 'dang-chay',
    ten: 'Kết nối',
    motCau: 'Những dịch vụ MIMI đang kết nối tới để đọc giao dịch, nhận thông báo tiền về, kéo hoá đơn điện tử và cho agent gọi vào.',
    vanDe: {
      tieuDe: 'Một khoản chi đi qua nhiều hệ thống',
      doan: 'Ngân hàng giữ tiền, cơ quan thuế giữ hoá đơn, agent chạy ở chỗ khác. MIMI nối các nguồn đó lại để một khoản chi có đủ lý do, lệnh trả, sao kê và hoá đơn.',
    },
    cachHoatDong: [
      { tieuDe: 'Cas', mo: 'Liên kết tài khoản ngân hàng để đọc giao dịch, và kết nối Tổng cục Thuế để kéo hoá đơn điện tử. Ngắt quyền trong app Cas thì MIMI tự ghi nhận.' },
      { tieuDe: 'SePay', mo: 'Báo tiền về theo thời gian thực. Bạn chỉ khai số tài khoản, không cấp quyền gì.' },
      { tieuDe: 'VietQR', mo: 'Chuẩn mã QR chuyển khoản, dựng ngay trên máy cho hoá đơn và lệnh trả.' },
      { tieuDe: 'MCP', mo: 'Claude, Cursor và ứng dụng hỗ trợ MCP gọi vào MIMI bằng khoá agent.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hai đường nhận giao dịch', mo: 'SePay và Cas độc lập nhau.' },
      { tieuDe: 'Ngắt được mọi kết nối', mo: 'Ngắt thì mã truy cập bị xoá khỏi hệ thống.' },
      { tieuDe: 'Nhật ký kết nối', mo: 'Thông báo từ Cas và SePay được ghi lại, xem được trong Fintech Hub.' },
    ],
    ranhGioi: [
      'Đây là dịch vụ MIMI kết nối tới, không phải thoả thuận đối tác.',
      'Danh sách ngân hàng hiển thị trên trang chủ là lộ trình tích hợp, không phải thoả thuận với từng ngân hàng.',
    ],
    trongApp: { ten: 'Fintech Hub', duong: '/dashboard/fintech' },
    hoiDap: [
      { hoi: 'Ngân hàng của tôi có được hỗ trợ không?', dap: 'Cas Link hiện danh sách ngân hàng hỗ trợ khi bạn bấm liên kết. Báo tiền về qua SePay theo danh sách ngân hàng của SePay.' },
    ],
    lienQuan: ['/san-pham/doi-soat-sao-ke', '/san-pham/hoa-don-dien-tu', '/san-pham/bao-mat'],
  },
];

export const TRANG_GIAI_PHAP: TrangNoiDung[] = [
  /* ── Theo quy mô ──────────────────────────────────────────────── */
  {
    loai: 'giai-phap', slug: 'startup-cong-nghe', nhom: 'Theo quy mô', trangThai: 'dang-chay',
    ten: 'Startup & công ty công nghệ',
    motCau: 'Bạn đã dùng AI và bắt đầu giao việc cho agent. MIMI là lớp kiểm soát để agent chi được tiền mà bạn vẫn giữ quyền quyết.',
    vanDe: {
      tieuDe: 'Nhóm dùng AI sớm nhất cũng chịu rủi ro sớm nhất',
      doan: 'Agent gọi API, mua phần mềm, nạp quảng cáo. Khi số khoản chi nhỏ tăng lên, duyệt tay từng khoản không kịp, còn để agent tự chi thì không yên tâm.',
      soLieu: AWS_AI,
    },
    cachHoatDong: [
      { tieuDe: 'Tạo agent và đặt trần', mo: 'Nhóm "Hạ tầng AI" và "Phần mềm" với trần riêng mỗi lần, ngày, tháng.' },
      { tieuDe: 'Nối qua MCP', mo: 'Một lệnh trong Claude Code hoặc một dòng trong mcp.json của Cursor.' },
      { tieuDe: 'Để khoản nhỏ tự chạy', mo: 'Dưới ngưỡng, người nhận quen thì tự duyệt; khoản lớn chờ bạn.' },
      { tieuDe: 'Xem bằng chứng', mo: 'Sao kê khớp mã tham chiếu thì khoản đó thành "Đã chi".' },
    ],
    lamDuoc: [
      { tieuDe: 'Kiểm soát agent', mo: 'Khoá riêng, chính sách riêng, tạm dừng và thu hồi.' },
      { tieuDe: 'Chặn vòng lặp', mo: 'Trần số yêu cầu mỗi giờ bắt được agent hỏng gửi đi gửi lại.' },
      { tieuDe: 'Chống chuyển nhầm', mo: 'Người nhận mới giữ 24 giờ, cảnh báo đổi số tài khoản.' },
      { tieuDe: 'Chi phí AI (đang xây)', mo: 'Chi phí theo mô hình và dự án, ngân sách tháng.' },
    ],
    ranhGioi: ['MIMI không cầm tiền và không cấp thẻ cho agent — tiền đi bằng chuyển khoản khi bạn trả.'],
    trongApp: { ten: 'Kiểm soát agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Tôi có nhiều agent cho nhiều việc?', dap: 'Tạo mỗi agent một khoá và một chính sách; khoá này lộ không ảnh hưởng agent kia.' },
    ],
    lienQuan: ['/san-pham/kiem-soat-agent', '/san-pham/mcp-api', '/san-pham/chi-phi-ai'],
  },
  {
    loai: 'giai-phap', slug: 'doanh-nghiep-nho-va-vua', nhom: 'Theo quy mô', trangThai: 'dang-chay',
    ten: 'Doanh nghiệp nhỏ và vừa',
    motCau: 'Duyệt chi có lý do, chặn chuyển nhầm và đối soát sao kê — trên đường chuyển khoản mà doanh nghiệp Việt đang dùng hằng ngày.',
    vanDe: {
      tieuDe: 'Chuyển khoản là mặc định, và cũng là chỗ mất tiền',
      doan: 'Nhân viên xin chi qua tin nhắn, giám đốc duyệt vội, kế toán dò sao kê cuối tháng. Mỗi khâu rời rạc là một chỗ để chuyển nhầm hoặc bị lừa.',
      soLieu: GASA,
    },
    cachHoatDong: [
      { tieuDe: 'Nối nguồn tiền', mo: 'Khai tài khoản với SePay để nhận tiền về, hoặc liên kết qua Cas để đọc giao dịch.' },
      { tieuDe: 'Lập danh sách người nhận được phép', mo: 'Nhà cung cấp quen, số tài khoản đã kiểm.' },
      { tieuDe: 'Duyệt chi', mo: 'Khoản trên ngưỡng hoặc người nhận mới chờ bạn, kèm số tiền bằng chữ.' },
      { tieuDe: 'Đối soát', mo: 'Lệnh trả và hoá đơn QR tự khớp khi sao kê về.' },
    ],
    lamDuoc: [
      { tieuDe: 'Duyệt chi', mo: 'Một chạm, có lý do, tiền đi khi bạn trả.' },
      { tieuDe: 'Chống chuyển nhầm', mo: 'Người nhận lạ, người nhận mới, đổi số tài khoản.' },
      { tieuDe: 'Hoá đơn kèm mã QR', mo: 'Thu tiền và tự khớp.' },
      { tieuDe: 'Chứng từ chi phí', mo: 'Khoản nào đã có hoá đơn, khoản nào còn thiếu.' },
    ],
    ranhGioi: ['Duyệt hai người cho khoản lớn chưa có — nằm trong lộ trình.'],
    trongApp: { ten: 'Kiểm soát agent · Fintech Hub', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Không dùng agent AI thì MIMI có ích không?', dap: 'Có. Duyệt chi, chống chuyển nhầm, hoá đơn QR và đối soát đều dùng được mà không cần agent.' },
    ],
    lienQuan: ['/san-pham/duyet-chi', '/san-pham/chong-chuyen-nham', '/san-pham/doi-soat-sao-ke'],
  },
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
    trongApp: { ten: 'Chứng từ chi phí', duong: '/dashboard/chung-tu' },
    hoiDap: [
      { hoi: 'Doanh thu dưới 01 tỷ có cần MIMI?', dap: 'Vẫn cần thông báo doanh thu; sổ thu chi và theo dõi ngưỡng giúp biết lúc nào sắp vượt.' },
    ],
    lienQuan: ['/san-pham/hai-cach-tinh-thue', '/san-pham/chung-tu-chi-phi', '/san-pham/hoa-don-dien-tu'],
  },
  {
    loai: 'giai-phap', slug: 'van-phong-ke-toan', nhom: 'Theo quy mô', trangThai: 'lien-he',
    ten: 'Văn phòng kế toán',
    motCau: 'Bạn giữ sổ cho nhiều doanh nghiệp và hộ kinh doanh. Gói Kế toán & đại lý thuế đang mở theo hình thức liên hệ — chúng tôi trao đổi nhu cầu cụ thể trước khi triển khai.',
    vanDe: {
      tieuDe: 'Nhiều khách, mỗi khách một mớ sao kê và hoá đơn',
      doan: 'Việc ghép chứng từ, theo dõi hạn kê khai và so cách tính thuế lặp lại ở từng khách, phần lớn vẫn làm tay.',
    },
    cachHoatDong: [
      { tieuDe: 'Liên hệ', mo: 'Để lại email và tên văn phòng ở cuối trang chủ.' },
      { tieuDe: 'Trao đổi', mo: 'Đội MIMI hỏi số khách, loại hình và cách bạn đang làm.' },
      { tieuDe: 'Triển khai', mo: 'Mỗi khách dùng các chức năng hiện có: chứng từ chi phí, hai cách tính thuế, đối soát, nhật ký.' },
    ],
    lamDuoc: [
      { tieuDe: 'Chứng từ chi phí cho từng khách', mo: 'Khoản đã có giấy tờ, cần xem, chưa có giấy tờ.' },
      { tieuDe: 'Hai cách tính thuế', mo: 'Số chứng từ còn thiếu để cách theo lợi nhuận rẻ hơn.' },
      { tieuDe: 'Nhật ký', mo: 'Ai duyệt khoản nào, lúc nào.' },
    ],
    ranhGioi: ['Màn hình quản lý nhiều khách trên một chỗ chưa mở công khai — trao đổi khi liên hệ.'],
    hoiDap: [
      { hoi: 'Giá bao nhiêu?', dap: 'Gói này báo giá khi liên hệ, tuỳ số khách và nhu cầu.' },
    ],
    lienQuan: ['/san-pham/chung-tu-chi-phi', '/san-pham/hai-cach-tinh-thue', '/giai-phap/ho-kinh-doanh'],
  },

  /* ── Theo ngành ───────────────────────────────────────────────── */
  {
    loai: 'giai-phap', slug: 'agency-quang-cao', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Agency & quảng cáo',
    motCau: 'Duyệt ngân sách quảng cáo trước khi nạp, giới hạn theo nhóm chi, và giữ chứng từ cho từng khoản.',
    vanDe: {
      tieuDe: 'Ngân sách quảng cáo nạp nhiều lần, nhiều người',
      doan: 'Nạp quảng cáo là khoản chi lặp lại, số tiền lớn, nhiều người đề xuất. Không có trần và người duyệt, ngân sách tháng dễ vượt trước giữa tháng.',
    },
    cachHoatDong: [
      { tieuDe: 'Agent hoặc nhân viên xin nạp', mo: 'Nhóm chi "Quảng cáo", kèm mục đích.' },
      { tieuDe: 'Chính sách xét', mo: 'Trần ngày, trần tháng, ngưỡng phải duyệt.' },
      { tieuDe: 'Bạn duyệt', mo: 'Khoản trên ngưỡng dừng lại; bạn thấy số tiền bằng chữ và lý do.' },
      { tieuDe: 'Trả và khớp', mo: 'Lệnh trả VietQR, sao kê xác nhận đã chi.' },
    ],
    lamDuoc: [
      { tieuDe: 'Trần tháng cho quảng cáo', mo: 'Vượt trần là từ chối, không phải cảnh báo.' },
      { tieuDe: 'Chứng từ', mo: 'Ghép hoá đơn mua vào với khoản đã nạp.' },
      { tieuDe: 'Nhật ký', mo: 'Ai đề xuất, ai duyệt, lúc nào.' },
    ],
    ranhGioi: ['MIMI không nối trực tiếp tài khoản quảng cáo; kiểm soát nằm ở khoản chi trả tiền.'],
    trongApp: { ten: 'Kiểm soát agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Nạp quảng cáo bằng thẻ thì sao?', dap: 'MIMI kiểm soát khoản chi bằng chuyển khoản. Khoản trả bằng thẻ chưa đi qua luật duyệt của MIMI.' },
    ],
    lienQuan: ['/san-pham/duyet-chi', '/san-pham/kiem-soat-agent', '/san-pham/chung-tu-chi-phi'],
  },
  {
    loai: 'giai-phap', slug: 'thuong-mai-dien-tu', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Thương mại điện tử',
    motCau: 'Thu tiền bằng mã QR có mã tham chiếu, tự khớp khi tiền về, và giữ chứng từ cho tiền hàng trả nhà cung cấp.',
    vanDe: {
      tieuDe: 'Nhiều đơn, nhiều khoản chuyển khoản nhỏ',
      doan: 'Đơn nào đã trả, đơn nào chưa — dò bằng nội dung chuyển khoản tuỳ ý của khách là việc tốn thời gian nhất cuối ngày.',
      soLieu: ATRADIUS,
    },
    cachHoatDong: [
      { tieuDe: 'Tạo mã QR cho đơn', mo: 'Mỗi mã mang mã tham chiếu riêng.' },
      { tieuDe: 'Khách trả', mo: 'Tiền vào thẳng tài khoản của bạn.' },
      { tieuDe: 'Tự khớp', mo: 'SePay báo tiền về, khớp mã và số tiền.' },
      { tieuDe: 'Trả nhà cung cấp có kiểm soát', mo: 'Danh sách người nhận được phép, cảnh báo đổi số tài khoản.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hoá đơn kèm mã QR', mo: 'Và mã QR cho khoản thu rời.' },
      { tieuDe: 'Đối soát sao kê', mo: 'Trả thiếu không tự đóng.' },
      { tieuDe: 'Chống chuyển nhầm', mo: 'Khi trả tiền hàng cho nhà cung cấp.' },
    ],
    ranhGioi: ['MIMI không nối sàn thương mại điện tử hay cổng thanh toán; mã QR là chuyển khoản ngân hàng.'],
    trongApp: { ten: 'Hoá đơn · Fintech Hub', duong: '/dashboard/invoices' },
    hoiDap: [
      { hoi: 'Tiền từ sàn đối soát được không?', dap: 'Khoản sàn chuyển về vẫn vào sổ; chỉ là không mang mã tham chiếu nên không tự khớp với đơn nào.' },
    ],
    lienQuan: ['/san-pham/hoa-don-qr', '/san-pham/doi-soat-sao-ke', '/san-pham/chong-chuyen-nham'],
  },
  {
    loai: 'giai-phap', slug: 'phan-mem-ai', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Phần mềm & AI',
    motCau: 'Giới hạn chi cho API, máy chủ và công cụ AI theo từng agent, chặn vòng lặp, và nối vào quy trình qua MCP.',
    vanDe: {
      tieuDe: 'Chi phí hạ tầng tăng theo mỗi lần gọi',
      doan: 'Một thay đổi cấu hình hay một agent chạy vòng lặp có thể nhân chi phí trong vài giờ. Trần phải chặn trước khi tiền đi.',
    },
    cachHoatDong: [
      { tieuDe: 'Agent cho từng việc', mo: 'Agent nạp API, agent gia hạn máy chủ — mỗi cái một chính sách.' },
      { tieuDe: 'Nhóm "Hạ tầng AI"', mo: 'Trần mỗi lần, ngày, tháng; trần số yêu cầu mỗi giờ.' },
      { tieuDe: 'Nối MCP', mo: 'Agent hỏi hạn mức còn lại trước khi xin.' },
    ],
    lamDuoc: [
      { tieuDe: 'Chặn vòng lặp', mo: 'Quá số yêu cầu mỗi giờ là từ chối.' },
      { tieuDe: 'Kiểm soát agent', mo: 'Tạm dừng, thu hồi, chính sách có hạn.' },
      { tieuDe: 'Chi phí AI (đang xây)', mo: 'Theo mô hình và dự án.' },
    ],
    ranhGioi: ['Khoản trả bằng thẻ quốc tế cho nhà cung cấp AI chưa đi qua luật duyệt của MIMI.'],
    trongApp: { ten: 'Kiểm soát agent', duong: '/dashboard/tac-tu' },
    hoiDap: [
      { hoi: 'Agent CI/CD của tôi gọi được không?', dap: 'Được, bằng API HTTP với header x-mimi-agent-key.' },
    ],
    lienQuan: ['/san-pham/mcp-api', '/san-pham/chi-phi-ai', '/san-pham/kiem-soat-agent'],
  },
  {
    loai: 'giai-phap', slug: 'dich-vu-chuyen-mon', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Dịch vụ chuyên môn',
    motCau: 'Hoá đơn, chứng từ và công nợ khách hàng ở một chỗ; tra mã số thuế đối tác để thấy rủi ro trước khi giao việc chịu.',
    vanDe: {
      tieuDe: 'Làm trước, thu tiền sau',
      doan: 'Công ty tư vấn, thiết kế, luật, kế toán thường xuất hoá đơn rồi chờ khách trả. Công nợ trễ hạn và đối tác ngừng hoạt động là hai rủi ro âm thầm.',
      soLieu: ATRADIUS,
    },
    cachHoatDong: [
      { tieuDe: 'Danh bạ khách hàng', mo: 'Một nơi duy nhất cho tên và mã số thuế từng khách.' },
      { tieuDe: 'Tra trạng thái người nộp thuế', mo: 'Thấy khách đã ngừng hoạt động trước khi giao việc chịu.' },
      { tieuDe: 'Hoá đơn kèm mã QR', mo: 'Khách trả, tự khớp.' },
      { tieuDe: 'Đối soát công nợ', mo: 'Không có số hoá đơn trong nội dung thì khớp theo tên khách trong danh bạ.' },
    ],
    lamDuoc: [
      { tieuDe: 'Khách hàng', mo: 'Danh bạ có mã số thuế.' },
      { tieuDe: 'Hoá đơn', mo: 'Trạng thái chờ, quá hạn, đã thu.' },
      { tieuDe: 'Chứng từ chi phí', mo: 'Chi phí có giấy tờ theo quý.' },
    ],
    ranhGioi: ['MIMI không đòi nợ thay bạn; nhắc nợ tự động nằm trong lộ trình.'],
    trongApp: { ten: 'Khách hàng · Hoá đơn', duong: '/dashboard/clients' },
    hoiDap: [
      { hoi: 'Một khách viết tên nhiều kiểu thì sao?', dap: 'Danh bạ là nơi duy nhất để tra tên, để cùng một khách không thành ba người trong công nợ.' },
    ],
    lienQuan: ['/san-pham/hoa-don-qr', '/san-pham/chung-tu-chi-phi', '/san-pham/doi-soat-sao-ke'],
  },
  {
    loai: 'giai-phap', slug: 'ban-le-dich-vu', nhom: 'Theo ngành', trangThai: 'dang-chay',
    ten: 'Bán lẻ & dịch vụ',
    motCau: 'Thu tiền bằng QR, sổ chi phí có chứng từ sẵn cho kỳ kê khai, và đếm ngày tới hạn.',
    vanDe: {
      tieuDe: 'Cửa hàng bận bán, sổ sách để cuối quý',
      doan: 'Tiền về nhiều khoản nhỏ, hoá đơn nhập hàng rải rác. Tới hạn kê khai mới gom lại thì thường thiếu chứng từ.',
    },
    cachHoatDong: [
      { tieuDe: 'Thu bằng QR', mo: 'Mã QR có mã tham chiếu cho khoản thu.' },
      { tieuDe: 'Nối hoá đơn nhập hàng', mo: 'Kéo hoá đơn mua vào từ Tổng cục Thuế.' },
      { tieuDe: 'Xem chứng từ theo quý', mo: 'Khoản nào còn thiếu, còn bao nhiêu ngày tới hạn.' },
    ],
    lamDuoc: [
      { tieuDe: 'Hai cách tính thuế', mo: 'Cho hộ doanh thu trên 01 tỷ đến 3 tỷ.' },
      { tieuDe: 'Hạn kê khai', mo: 'Đếm ngày còn lại tới hạn quý.' },
      { tieuDe: 'Đối soát sao kê', mo: 'Tiền về khớp mã tham chiếu.' },
    ],
    ranhGioi: ['MIMI không thay phần mềm bán hàng hay máy tính tiền.'],
    trongApp: { ten: 'Chứng từ chi phí', duong: '/dashboard/chung-tu' },
    hoiDap: [
      { hoi: 'Khách trả tiền mặt thì sao?', dap: 'Tiền mặt không có trong sao kê; hoá đơn liên quan vẫn là giấy tờ hợp lệ trong Chứng từ chi phí.' },
    ],
    lienQuan: ['/san-pham/hai-cach-tinh-thue', '/san-pham/chung-tu-chi-phi', '/san-pham/hoa-don-qr'],
  },
];

export const TAT_CA_TRANG: TrangNoiDung[] = [...TRANG_SAN_PHAM, ...TRANG_GIAI_PHAP];

export const duongDanTrang = (t: Pick<TrangNoiDung, 'loai' | 'slug'>) => `/${t.loai}/${t.slug}`;

export function timTrang(duong: string): TrangNoiDung | undefined {
  return TAT_CA_TRANG.find((t) => duongDanTrang(t) === duong);
}
