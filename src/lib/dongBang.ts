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
export const CONG_CU_DONG_BANG = new Set(['chi_phi_ai', 'model_re_hon', 'khach_hang']);

export const TRANG_DONG_BANG: Record<string, { ten: string; ly_do: string }> = {
  '/dashboard/chi-phi-ai': {
    ten: 'Chi phí AI',
    ly_do: 'MIMI đang tập trung vào một việc: kiểm từng khoản thanh toán trước khi tiền rời tài khoản, rồi đối soát sau khi tiền đi. Theo dõi chi phí AI tạm dừng; dữ liệu cũ vẫn được giữ nguyên.',
  },
  '/dashboard/clients': {
    ten: 'Khách hàng',
    ly_do: 'Danh sách khách hàng tạm dừng để MIMI tập trung vào kiểm tra khoản thanh toán trước khi chuyển tiền. Dữ liệu cũ vẫn được giữ nguyên.',
  },
};

export const daDongBang = (duong: string) => duong in TRANG_DONG_BANG;

/**
 * Đàn agent trên khối Điều phối (29/09/2026). Giao diện đã dựng, nhưng máy chủ chưa có `danh_sach_agent` /
 * `chay_dan_agent`: mỗi lần mở Tổng quan, mọi người dùng thấy "Chưa chạy được đàn agent — máy chủ báo:
 * Hành động không hợp lệ." Chủ sản phẩm đã chốt KHÔNG thêm agent lúc này, nên đóng băng: không gọi, không
 * hiện. Máy chủ có hành động đó thì đổi thành false.
 */
export const DAN_AGENT_DONG_BANG = true;
