/**
 * Đọc khoản thanh toán QR mà webhook `TRANSACTIONS` của Casso báo về.
 *
 * Hình dạng lấy từ lần giao thật đầu tiên, 14/09/2026 20:54:40 (nghiệm thu case
 * 15), không phải từ tài liệu:
 *
 *   { webhookType: "TRANSACTIONS", webhookCode: "DEFAULT_UPDATE", grantId,
 *     transaction: { id, amount, reference, accountNumber, transactionDateTime,
 *                    paymentMeta: { referenceNumber: "MIMI…" }, … } }
 *
 * `paymentMeta.referenceNumber` chỉ có trên bản gửi tới grant QR đã tạo mã đó;
 * Casso gửi cùng giao dịch tới các grant cũ của cùng tài khoản với
 * `paymentMeta: {}`.
 *
 * ĐÂY LÀ LỜI BÁO, KHÔNG PHẢI BẰNG CHỨNG. Webhook Casso không có chữ ký, nên hàm
 * này chỉ trích ra để ghi nhật ký và kích hoạt đối soát. Mã QR chỉ được tất
 * toán khi đối soát tìm thấy một giao dịch ngân hàng thật khớp — xem
 * `cas-webhook/index.ts`.
 */

export interface ThanhToanQrCas {
  maThamChieu: string;
  soTien: number | null;
  /** Mã giao dịch phía ngân hàng, ví dụ `FT26257034131893`. */
  maNganHang: string | null;
  soTaiKhoan: string | null;
}

function doiTuong(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function chuoi(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export function docThanhToanQrCas(payload: unknown): ThanhToanQrCas | null {
  const gd = doiTuong(doiTuong(payload)?.transaction);
  const maThamChieu = chuoi(doiTuong(gd?.paymentMeta)?.referenceNumber);
  if (!gd || !maThamChieu) return null;

  const soTien = typeof gd.amount === 'number' && Number.isFinite(gd.amount) ? gd.amount : null;
  return {
    maThamChieu,
    soTien,
    maNganHang: chuoi(gd.reference),
    soTaiKhoan: chuoi(gd.accountNumber),
  };
}
