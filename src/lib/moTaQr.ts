/**
 * Nội dung của một mã QR nhận tiền, và giới hạn độ dài của nó.
 *
 * PHÁT HIỆN 04/09/2026, BẰNG MỘT LẦN CHẠY THẬT. Sau khi liên kết MB Bank với
 * scope `qrpay` sống được, lần tạo mã đầu tiên trả về:
 *
 *     description must has maximum 9 characters (INVALID_PARAM)
 *     requestId Bgv44JpvIbxfvfmr
 *
 * Đây là ràng buộc **không có trong tài liệu Cas**. Trang QR Pay chỉ liệt kê ba
 * trường `amount`, `description`, `referenceNumber` mà không nói giới hạn nào.
 * Chín ký tự là con số ngắn đến mức không ai đoán ra, nên nó chỉ lộ ra khi có
 * một grant thật đi tới được khâu kiểm tham số.
 *
 * VIỆC NÀY ĐÃ LÀM HỎNG MỘT LUỒNG KHÁC MÀ CHƯA AI BIẾT. `InvoicesPage` gửi
 * `Thanh toan ${invoice_number}` — dài gấp đôi giới hạn. Nghĩa là nút tạo QR
 * trên trang Hoá đơn **chưa từng chạy được**, và không ai phát hiện vì case 12
 * bị chặn từ trước đó nên chưa lần nào chạm tới khâu này.
 *
 * KHÔNG DÙNG NỘI DUNG NÀY ĐỂ ĐỐI SOÁT. Chín ký tự không đủ mang số hoá đơn cho
 * mọi trường hợp, nhưng điều đó không sao: `referenceNumber` mới là khoá đối
 * soát, do máy chủ sinh ra và quay lại trên webhook `TRANSACTIONS`
 * (`bank-link/index.ts`). Nội dung chỉ để người trả tiền nhìn thấy.
 */

/**
 * Giới hạn Cas/MB áp cho `description`.
 *
 * Lấy từ phản hồi thật ngày 04/09, requestId `Bgv44JpvIbxfvfmr`. Nếu Cas nới ra
 * hoặc ngân hàng khác có giới hạn khác, sửa ở đây — mọi nơi trong ứng dụng đều
 * đi qua hằng số này.
 */
export const MO_TA_TOI_DA = 9;

/**
 * Cắt một nội dung mong muốn cho vừa giới hạn.
 *
 * Cắt từ **cuối** chứ không từ đầu là chủ ý cho trường hợp số hoá đơn: phần
 * mang thông tin phân biệt thường nằm ở đuôi (`INV-2026-0042` — cái đáng giữ là
 * `0042`, không phải `INV-`). Nhưng khi chuỗi đã vừa thì trả nguyên vẹn.
 */
export function moTaQr(mong: string): string {
  const s = mong.trim();
  if (s.length <= MO_TA_TOI_DA) return s;
  return s.slice(-MO_TA_TOI_DA);
}

export interface KetQuaKiemMoTa {
  hopLe: boolean;
  /** Câu nói cho người dùng khi không hợp lệ. `null` khi hợp lệ. */
  vuong: string | null;
}

/**
 * Nội dung người dùng tự gõ có hợp lệ không.
 *
 * Tách khỏi `moTaQr` vì hai việc khác nhau: chuỗi do hệ thống dựng thì **cắt**
 * cho vừa, còn chuỗi người dùng gõ thì **báo** để họ tự sửa. Tự cắt chữ của
 * người dùng rồi gửi đi là đổi nội dung họ định viết mà không hỏi.
 */
export function kiemMoTa(mong: string): KetQuaKiemMoTa {
  const s = mong.trim();
  if (!s) return { hopLe: false, vuong: 'Nhập nội dung cho mã QR.' };
  if (s.length > MO_TA_TOI_DA) {
    return {
      hopLe: false,
      vuong: `Ngân hàng chỉ nhận tối đa ${MO_TA_TOI_DA} ký tự — đang thừa ${s.length - MO_TA_TOI_DA}.`,
    };
  }
  return { hopLe: true, vuong: null };
}
