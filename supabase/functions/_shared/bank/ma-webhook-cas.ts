/**
 * Đọc mã sự kiện từ envelope webhook của Casso (BankHub).
 *
 * VÌ SAO TÁCH RA. Envelope có dạng `{ webhookType: "GRANT", webhookCode: "…", grantId }`.
 * Bản đọc cũ trong `cas-webhook` nhận ra `webhookType` nhưng dò mã ở `code`,
 * `errorCode`, `eventCode`, `status` — thiếu đúng `webhookCode`. Nên mọi dòng
 * GRANT trong nhật ký có cột Mã trống.
 *
 * Tìm ra ngày 12/09/2026 khi nghiệm thu case 10: người dùng ngắt quyền trong app
 * Cas, một phút sau Casso gửi GRANT cho grant cũ — và không ai biết đó là
 * `USER_PERMISSION_REVOKED` hay một cập nhật thường, vì mã không được đọc.
 *
 * Dùng chung cho `cas-webhook` (ghi mã lúc nhận) và `bank-link` webhook-log
 * (rút mã từ payload đã lưu cho những dòng cũ, không trả payload ra ngoài).
 */

const DUONG_MA: string[][] = [
  ["webhookCode"],
  ["data", "webhookCode"],
  ["code"],
  ["eventCode"],
  ["errorCode"],
  ["status"],
  ["data", "code"],
  ["data", "status"],
];

export function docMaWebhookCas(payload: unknown): string | null {
  for (const duong of DUONG_MA) {
    let hien: unknown = payload;
    for (const khoa of duong) {
      hien = hien && typeof hien === "object" ? (hien as Record<string, unknown>)[khoa] : undefined;
    }
    if (typeof hien === "string" && hien.trim()) return hien.trim().slice(0, 80);
  }
  return null;
}
