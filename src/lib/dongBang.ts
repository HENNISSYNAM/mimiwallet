/**
 * Tính năng ĐÓNG BĂNG (28/09/2026).
 *
 * Trọng tâm MIMI: kiểm một khoản thanh toán TRƯỚC khi tiền rời tài khoản, và đối soát SAU khi tiền đi.
 * Thuế giữ lại như một mô-đun. Những gì dưới đây không phục vụ vòng đó nên rời giao diện:
 *   - Chi phí AI + "Model AI rẻ hơn": Ramp đã có sản phẩm riêng; MIMI không có kênh phân phối cho
 *     trận đó lúc này.
 *   - Khách hàng (CRM): danh sách tra cứu, không nằm trong vòng kiểm → duyệt → trả → đối soát.
 *
 * ĐÓNG BĂNG, KHÔNG XOÁ: mã, bảng dữ liệu và máy chủ giữ nguyên; bỏ một khoá khỏi đây là mở lại.
 * Ai mở đường dẫn cũ thấy trang `TamDung` nói rõ vì sao, không bị chuyển hướng im lặng.
 */
// 06/10/2026: Chi phí AI + Model AI rẻ hơn mở lại thành nhóm "Tuỳ chọn" trong kho công cụ (không ghim sẵn).
// 11/11/2026: MIMI gọn lại quanh việc kiếm ra tiền ngay — thuế, bán tại quầy, dòng tiền, hồ sơ vay. Chi phí AI và
// "Model AI rẻ hơn" đóng băng lại (không phục vụ việc nào trong số đó); bảng `ngan_sach_ai`, máy chủ `chi-phi-ai` giữ nguyên.
// 16/11/2026 (đợt 2): bỏ mọi thứ không ra tiền. MIMI bán: thuế cho hộ kinh doanh, bán tại quầy, hồ sơ vay / doanh thu
// đã xác minh, văn phòng kế toán, giới thiệu ngân hàng có đồng ý. Kiểm soát chi của agent (kiểm soát agent, chính sách chi,
// kiểm trước khi chuyển), Soạn giấy tờ và Đăng ký kinh doanh đóng băng. Bảng, máy chủ `tac-tu`/`chinh-sach`/`kiem-chuyen-tien`,
// `giay-to`, `dang-ky-kinh-doanh` giữ nguyên.
export const CONG_CU_DONG_BANG = new Set([
  'khach_hang', 'chi_phi_ai', 'model_re_hon',
  'kiem_truoc_khi_chuyen', 'kiem_soat_agent', 'chinh_sach_chi', 'soan_giay_to', 'dang_ky_kinh_doanh',
]);

/**
 * Nhóm năng lực của trợ lý không còn hiện cho người dùng (11/11/2026): `ai_token` là chi phí AI / ngân sách AI.
 * Máy chủ vẫn hiểu câu hỏi nhóm này — chỉ không mời người dùng chọn, không gợi ý, không đưa lên "việc cần chú ý".
 */
export const NHOM_NANG_LUC_DONG_BANG: ReadonlySet<string> = new Set(['ai_token']);

/** Việc máy chủ đưa lên màn đầu nhưng thuộc tính năng đóng băng. */
export const VIEC_DONG_BANG: ReadonlySet<string> = new Set(['ngan_sach_ai']);

const LY_DO_AGENT = 'Kiểm soát chi của agent tạm dừng để MIMI tập trung vào thuế, bán tại quầy, hồ sơ vay và văn phòng kế toán. Agent, chính sách và nhật ký cũ vẫn được giữ nguyên.';
const LY_DO_GON = 'Tính năng này tạm dừng để MIMI tập trung vào thuế, bán tại quầy, hồ sơ vay và văn phòng kế toán. Dữ liệu cũ vẫn được giữ nguyên.';
const LY_DO_CONG_KHAI = 'Trang này tạm dừng: MIMI giờ tập trung vào khai thuế cho hộ kinh doanh, bán tại quầy, hồ sơ vay và văn phòng kế toán.';

export const TRANG_DONG_BANG: Record<string, { ten: string; ly_do: string }> = {
  '/dashboard/clients': {
    ten: 'Khách hàng',
    ly_do: 'Danh sách khách hàng tạm dừng để MIMI tập trung vào kiểm tra khoản thanh toán trước khi chuyển tiền. Dữ liệu cũ vẫn được giữ nguyên.',
  },
  '/dashboard/chi-phi-ai': {
    ten: 'Chi phí AI',
    ly_do: 'Theo dõi chi phí AI tạm dừng để MIMI tập trung vào thuế, bán tại quầy, dòng tiền và hồ sơ vay. Dữ liệu cũ vẫn được giữ nguyên.',
  },
  // ── Đợt 2, 16/11/2026: kiểm soát chi của agent ──
  '/dashboard/tac-tu': { ten: 'Kiểm soát agent', ly_do: LY_DO_AGENT },
  '/dashboard/chinh-sach': { ten: 'Chính sách chi', ly_do: LY_DO_AGENT },
  '/dashboard/kiem-truoc-khi-chuyen': { ten: 'Kiểm tra trước khi chuyển tiền', ly_do: LY_DO_AGENT },
  // ── Đợt 2: trang không ra tiền ──
  '/dashboard/giay-to': { ten: 'Soạn giấy tờ', ly_do: LY_DO_GON },
  '/dashboard/dang-ky-kinh-doanh': { ten: 'Đăng ký kinh doanh', ly_do: LY_DO_GON },
  '/khao-sat-gia': { ten: 'Khảo sát giá', ly_do: 'Khảo sát giá đã đóng. Cảm ơn bạn đã quan tâm tới MIMI.' },
  // ── Đợt 2: trang công khai dựng quanh việc agent chi tiền ──
  '/tri-tue-nhan-tao': { ten: 'Trí tuệ nhân tạo', ly_do: LY_DO_CONG_KHAI },
  '/kham-pha/agent-ai': { ten: 'AI chi tiêu theo luật của bạn', ly_do: LY_DO_CONG_KHAI },
  '/san-pham/kiem-soat-agent': { ten: 'Kiểm soát agent', ly_do: LY_DO_CONG_KHAI },
  '/san-pham/duyet-chi': { ten: 'Duyệt chi', ly_do: LY_DO_CONG_KHAI },
  '/san-pham/chong-chuyen-nham': { ten: 'Chống chuyển nhầm', ly_do: LY_DO_CONG_KHAI },
  '/san-pham/mcp-api': { ten: 'MCP & API cho agent', ly_do: LY_DO_CONG_KHAI },
  '/giai-phap/startup-cong-nghe': { ten: 'Startup & công ty công nghệ', ly_do: LY_DO_CONG_KHAI },
  '/giai-phap/doanh-nghiep-nho-va-vua': { ten: 'Doanh nghiệp nhỏ và vừa', ly_do: LY_DO_CONG_KHAI },
  '/giai-phap/agency-quang-cao': { ten: 'Agency & quảng cáo', ly_do: LY_DO_CONG_KHAI },
  '/giai-phap/phan-mem-ai': { ten: 'Phần mềm & AI', ly_do: LY_DO_CONG_KHAI },
  // Dựa vào danh bạ khách hàng (đóng băng 28/09/2026) — trang hứa một tính năng không còn hiện.
  '/giai-phap/dich-vu-chuyen-mon': { ten: 'Dịch vụ chuyên môn', ly_do: LY_DO_CONG_KHAI },
};

/**
 * Ẩn RIÊNG trong ứng dụng Android (TWA trên Google Play), 17/11/2026. Bản web giữ nguyên.
 * Lý do: Google xét app có chữ "vay" rất kỹ (chính sách Personal Loans / Financial features); bản Play đầu tiên chỉ giữ
 * thuế, bán tại quầy, sổ tiền để duyệt nhanh. Bỏ khoá khỏi đây là mở lại ở bản cập nhật sau.
 */
const LY_DO_TRONG_APP = 'Trang này chưa có trong ứng dụng Android. Mở www.mimiwallet.online trên trình duyệt để dùng — tài khoản và dữ liệu là một.';
export const TRANG_AN_TRONG_APP: Record<string, { ten: string; ly_do: string }> = {
  '/dashboard/vay-von': { ten: 'Vay vốn', ly_do: LY_DO_TRONG_APP },
  '/dashboard/co-hoi': { ten: 'Cơ hội phát triển', ly_do: LY_DO_TRONG_APP },
};
export const CONG_CU_AN_TRONG_APP: ReadonlySet<string> = new Set(['vay_von', 'co_hoi_phat_trien']);

/** Đường dẫn công khai (ngoài /dashboard) đã đóng băng — trang tạm dừng có thanh điều hướng của trang chủ. */
export const laTrangCongKhaiDongBang = (duong: string) => daDongBang(duong) && !duong.startsWith('/dashboard');

/** Bỏ truy vấn, mốc và gạch chéo cuối: "/dashboard/tac-tu?tab=yeu-cau" cũng là trang đã đóng băng. */
export const daDongBang = (duong: string) => {
  const d = duong.split(/[?#]/)[0].replace(/(.)\/+$/, '$1');
  return Object.prototype.hasOwnProperty.call(TRANG_DONG_BANG, d);
};

// 12/10/2026: cờ DAN_AGENT_DONG_BANG đã gỡ cùng nhánh giao diện đàn agent trong `components/nao/KhoiDieuPhoi.tsx`
// (đóng băng vĩnh viễn từ 29/09, không ai thấy). Có máy chủ `danh_sach_agent`/`chay_dan_agent` thì dựng lại.
