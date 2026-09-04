/**
 * Liên kết nào có sao kê để đọc.
 *
 * SỰ VIỆC 04/09/2026. Người dùng liên kết MB Bank với scope `qrpay`, nhập OTP,
 * thành công — rồi vài giây sau dòng đó lại rơi vào `needs_relink`. Liên kết
 * lại lần nữa: y hệt. Nhìn màn hình thì tưởng liên kết hỏng; thật ra liên kết
 * tốt, và chính hệ thống đập nó hỏng.
 *
 * CƠ CHẾ. Grant `qrpay` **không có** scope `transaction`. Vòng đồng bộ vẫn gọi
 * `GET /transactions` lên nó, Cas từ chối, lỗi map thành `needsRelink`, và
 * `ingestConnection` đánh dấu `status = 'needs_relink'`. Casso gửi
 * `DEFAULT_UPDATE` rất dày — tài liệu nghiệm thu đếm được 25 lần trong một ngày
 * — nên mỗi webhook là một lần đập lại. Người dùng không bao giờ thắng được
 * cuộc đua đó.
 *
 * BỘ CHẮN CŨ ĐO SAI THỨ. `bank-link/index.ts` có một dòng bỏ qua liên kết QR:
 *
 *     if (conn.account_number.startsWith("grant:")) continue;
 *
 * Nó đúng vào lúc viết, vì hồi đó `fetchQrPayIdentity` luôn thất bại và
 * `exchange` rơi về khoá tổng hợp `grant:<grantId>`. Tức bộ chắn đang đo **triệu
 * chứng của một lần dò hỏng**, không đo **sự thật rằng đây là liên kết QR**.
 * Ngày dò danh tính chạy được — chính là ngày liên kết MB thành công, số tài
 * khoản thật `••••2002` được ghi vào — bộ chắn lặng lẽ ngừng bảo vệ. Không có
 * lỗi nào báo ra; nó chỉ thôi không nổ nữa.
 *
 * Cùng một họ với ngõ cụt "bấm Cập nhật": một quy tắc gắn vào dấu hiệu phụ thay
 * vì gắn vào dữ liệu nói thẳng điều cần biết. Nay `scopes` đã có trong bảng thì
 * dùng `scopes`.
 *
 * VÌ SAO ĐẶT Ở `ingestConnection` CHỨ KHÔNG Ở HAI NƠI GỌI. Có hai đường tới:
 * `bank-link` (đồng bộ theo yêu cầu) và `cas-webhook` (đẩy từ Casso). Đường thứ
 * hai **chưa từng có bộ chắn nào**. Vá hai chỗ thì đường thứ ba viết sau này lại
 * thiếu. Đặt ở chỗ nghẽn chung thì mọi đường đều đi qua.
 */

/** Chỉ cần đúng những trường quyết định — để test không phải dựng cả một dòng DB. */
export interface KetNoiRutGon {
  account_number: string;
  /** `transaction` | `qrpay` | `gdt`. Có thể null với dòng cũ trước khi có cột. */
  scopes?: string | null;
}

/**
 * Liên kết này có sao kê để đọc không.
 *
 * `false` KHÔNG có nghĩa là liên kết hỏng. Nó có nghĩa là không có gì để đọc,
 * nên đừng gọi `/transactions` và tuyệt đối đừng suy ra trạng thái hỏng từ việc
 * lời gọi đó thất bại.
 */
export function coSaoKeDeDoc(conn: KetNoiRutGon): boolean {
  // Grant QR: theo định nghĩa không có scope `transaction`.
  if (conn.scopes === "qrpay") return false;

  // Grant thuế: cũng không phải nguồn sao kê ngân hàng.
  if (conn.scopes === "gdt") return false;

  /*
   * Dòng cũ chưa có `scopes`, hoặc dò danh tính thất bại nên `exchange` rơi về
   * khoá tổng hợp. Giữ lại phép thử cũ làm lớp hai — nó vẫn đúng cho những dòng
   * đó, chỉ là một mình nó thì không đủ.
   */
  if (conn.account_number.startsWith("grant:")) return false;

  return true;
}
