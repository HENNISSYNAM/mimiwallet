/**
 * TCCN-08 — gợi ý khoản chi nào có vẻ là chi tiêu cá nhân, cho hộ kinh doanh dùng chung một tài
 * khoản cho cả nhà và cửa hàng.
 *
 * CHỈ GỢI Ý, KHÔNG TỰ GẮN NHÃN. Mua hàng trên Shopee có thể là nhập hàng; tiền điện có thể là
 * điện cửa hàng. Chỉ chủ hộ biết. Nên MIMI nói "có vẻ là chi cá nhân, vì…" và người dùng bấm chọn;
 * nhãn người chọn (`source = 'human'` trong `transaction_labels`) thì máy không bao giờ ghi đè.
 *
 * Từ khoá viết không dấu, so trên tên người nhận + nội dung chuyển khoản đã bỏ dấu.
 */

export interface KhoanChiThu {
  merchant_name: string | null;
  counter_account_name: string | null;
  payment_reference: string | null;
}

const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

/** Mỗi nhóm: mẫu và lý do nói cho người dùng. Thứ tự là thứ tự ưu tiên khi nhiều nhóm cùng khớp. */
const NHOM_CA_NHAN: { mau: RegExp; ly_do: string }[] = [
  { mau: /\b(hoc phi|tien hoc|truong mam non|truong tieu hoc|truong thcs|truong thpt)\b/, ly_do: 'Nội dung giống học phí' },
  { mau: /\b(benh vien|phong kham|nha thuoc|pharmacity|long chau|an khang)\b/, ly_do: 'Người nhận giống bệnh viện hoặc nhà thuốc' },
  { mau: /\b(grabfood|grab food|shopeefood|shopee food|baemin|now\.vn)\b/, ly_do: 'Người nhận giống ứng dụng đặt đồ ăn' },
  { mau: /\b(cgv|lotte cinema|galaxy cinema|bhd star|spa|salon|gym|netflix|spotify)\b/, ly_do: 'Người nhận giống dịch vụ giải trí, làm đẹp' },
  { mau: /\b(chuyen cho (me|bo|ba|vo|chong|con|em|anh|chi)|gui (me|bo|vo|chong|con)|tien tieu vat|mung cuoi|di dam cuoi|mung sinh nhat)\b/, ly_do: 'Nội dung giống chuyển tiền cho người nhà hoặc việc riêng' },
];

export interface GoiY {
  ca_nhan: true;
  ly_do: string;
}

export function goiYCaNhan(k: KhoanChiThu): GoiY | null {
  const chu = ` ${boDau([k.merchant_name, k.counter_account_name, k.payment_reference].filter(Boolean).join(' '))} `;
  for (const n of NHOM_CA_NHAN) if (n.mau.test(chu)) return { ca_nhan: true, ly_do: n.ly_do };
  return null;
}
