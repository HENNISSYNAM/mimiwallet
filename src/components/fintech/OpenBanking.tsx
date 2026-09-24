import { Shield, Lock } from 'lucide-react';
import { NhatKyWebhook } from '@/components/fintech/NhatKyWebhook';
import { DangKySePay } from '@/components/fintech/DangKySePay';
import CasLink from './CasLink';

/**
 * Tab "Open Banking" của Fintech Hub: chỉ còn những thứ nối với ngân hàng THẬT.
 *
 * ĐÃ GỠ 24/09/2026: lưới "Tài khoản demo" sáu ngân hàng (Vietcombank, BIDV,
 * Techcombank, VPBank, MB Bank, ACB) cùng dòng "Tổng số dư mô phỏng ₫3.37 tỷ".
 *
 * Nó không chỉ là giao diện. Mỗi lần bấm "Kết nối" hay "Đồng bộ", edge function
 * `open-banking` sinh giao dịch bằng `Math.random()` và GHI THẲNG vào bảng
 * `transactions` trên production — số dư cứng trong mã, người nhận chọn ngẫu nhiên
 * từ "Công ty ABC", "NCC Vật tư XYZ". Đó là nguồn của hàng nghìn dòng dữ liệu giả
 * mà cả tuần phải gắn nhãn, lọc, và vẫn lọt ra thành một phán quyết thuế.
 *
 * Quy tắc của dự án từ đầu là không làm mock. Một nút "Kết nối" đặt cạnh nút liên
 * kết ngân hàng thật, trông y hệt, mà bấm vào thì sinh tiền giả — người dùng không
 * có cách nào biết mình vừa nối thứ gì.
 */
export default function OpenBanking() {
  return (
    <div className="space-y-6">
      <CasLink />

      {/*
        SePay đứng NGAY DƯỚI CasLink, không nằm tách dưới cùng.

        Với người dùng thì cả hai đều là "nối tài khoản ngân hàng của tôi" —
        khác nhau ở việc Cas đọc sao kê còn SePay báo tiền về. Đặt cách nhau
        nửa trang làm người ta không thấy chúng liên quan, và không biết mình
        đã nối đủ chưa.
      */}
      <DangKySePay />

      {/* Điều thật về cách kết nối được bảo vệ — không nhận tuân thủ chuẩn nào chưa được đánh giá. */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Cách dữ liệu ngân hàng được bảo vệ</p>
            <p className="text-xs text-muted-foreground">
              Kết nối qua Cas · Quyền chỉ đọc · Mã truy cập mã hoá ML-KEM-768 + AES-256-GCM
            </p>
          </div>
        </div>
        <Lock size={16} className="text-mimi-green shrink-0" />
      </div>

      {/* Công cụ chẩn đoán, mặc định đóng — xem ghi chú trong NhatKyWebhook. */}
      <NhatKyWebhook />
    </div>
  );
}
