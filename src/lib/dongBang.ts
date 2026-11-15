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
export const CONG_CU_DONG_BANG = new Set(['khach_hang', 'chi_phi_ai', 'model_re_hon']);

/**
 * Nhóm năng lực của trợ lý không còn hiện cho người dùng (11/11/2026): `ai_token` là chi phí AI / ngân sách AI.
 * Máy chủ vẫn hiểu câu hỏi nhóm này — chỉ không mời người dùng chọn, không gợi ý, không đưa lên "việc cần chú ý".
 */
export const NHOM_NANG_LUC_DONG_BANG: ReadonlySet<string> = new Set(['ai_token']);

/** Việc máy chủ đưa lên màn đầu nhưng thuộc tính năng đóng băng. */
export const VIEC_DONG_BANG: ReadonlySet<string> = new Set(['ngan_sach_ai']);

export const TRANG_DONG_BANG: Record<string, { ten: string; ly_do: string }> = {
  '/dashboard/clients': {
    ten: 'Khách hàng',
    ly_do: 'Danh sách khách hàng tạm dừng để MIMI tập trung vào kiểm tra khoản thanh toán trước khi chuyển tiền. Dữ liệu cũ vẫn được giữ nguyên.',
  },
  '/dashboard/chi-phi-ai': {
    ten: 'Chi phí AI',
    ly_do: 'Theo dõi chi phí AI tạm dừng để MIMI tập trung vào thuế, bán tại quầy, dòng tiền và hồ sơ vay. Dữ liệu cũ vẫn được giữ nguyên.',
  },
};

export const daDongBang = (duong: string) => duong in TRANG_DONG_BANG;

// 12/10/2026: cờ DAN_AGENT_DONG_BANG đã gỡ cùng nhánh giao diện đàn agent trong `components/nao/KhoiDieuPhoi.tsx`
// (đóng băng vĩnh viễn từ 29/09, không ai thấy). Có máy chủ `danh_sach_agent`/`chay_dan_agent` thì dựng lại.
