import { motion } from 'framer-motion';
import { Shield, Check, Lock, Clock, X } from 'lucide-react';
import { COMPANY } from '@/config/company';

/**
 * Trạng thái an toàn thông tin và tuân thủ — bản nói thật.
 *
 * BẢN TRƯỚC CỦA FILE NÀY LÀ MỘT BẢNG CHỨNG NHẬN BỊA. Nó hiển thị:
 *
 *   PCI DSS — "Level 1 Compliance" — Đạt — 01/01/2026
 *   AML Screening — "Luật PCRT 2022" — Đạt — 09/03/2026
 *   KYC/eKYC — "TT 16/2020 NHNN" — Đạt — 09/03/2026
 *   ISO 27001 — "đang xử lý" — Q2 2026
 *   Audit logs — 12.847 (số cứng)
 *   Data retention — 5 năm "theo quy định NHNN"
 *   Lưu trữ — "trên server Việt Nam"
 *
 * rồi cộng lại thành một "Compliance Score". Không có chứng nhận nào trong số
 * đó được cấp cho {COMPANY.shortName}. PCI DSS đặc biệt vô lý vì MIMI không hề
 * chạm tới dữ liệu thẻ. ISO 27001 là thứ đã bị gỡ khỏi repo này hai lần trước.
 *
 * Một bảng tuân thủ bịa nguy hiểm hơn hầu hết chỗ khác, vì đây đúng là màn hình
 * người ta mở ra để quyết định có giao dữ liệu ngân hàng cho mình hay không.
 *
 * Quy tắc thay thế: mỗi dòng dưới đây hoặc trỏ tới một cơ chế có trong mã
 * nguồn, hoặc ghi rõ là CHƯA CÓ. Không có ô nào ở giữa, và không có điểm số —
 * điểm số chỉ tạo cảm giác đo lường mà không đo gì.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

type TinhTrang = 'co' | 'chua';

interface Muc {
  label: string;
  tinhTrang: TinhTrang;
  moTa: string;
}

/** Những cơ chế đã có thật, đối chiếu được với mã nguồn. */
const DA_CO: Muc[] = [
  {
    label: 'Mã hoá mã truy cập ngân hàng khi lưu',
    tinhTrang: 'co',
    moTa:
      'AES-256-GCM, khoá bọc bằng ML-KEM-768 (NIST FIPS 203) — kháng tấn công "thu thập hôm nay, giải mã sau". ' +
      'Xem supabase/functions/_shared/pqcCrypto.ts.',
  },
  {
    label: 'Cách ly dữ liệu giữa các doanh nghiệp',
    tinhTrang: 'co',
    moTa:
      'Row Level Security bật trên toàn bộ bảng, khoá theo tài khoản sở hữu. Không có đường truy vấn nào ' +
      'từ tài khoản này chạm tới dữ liệu của doanh nghiệp khác.',
  },
  {
    label: 'Người dùng tự thu hồi quyền',
    tinhTrang: 'co',
    moTa:
      'Ngắt liên kết ngân hàng bất cứ lúc nào, và tự xoá toàn bộ tài khoản trong Cài đặt — ' +
      'khi xoá, hệ thống thu hồi uỷ quyền ở phía nhà cung cấp trước.',
  },
  {
    label: 'Không chạm dữ liệu thẻ, không giữ tiền',
    tinhTrang: 'co',
    moTa:
      'MIMI chỉ đọc sao kê theo uỷ quyền. Không lưu số thẻ, không giữ số dư của ai, không chuyển tiền thay người dùng. ' +
      'Mã QR nhận tiền do ngân hàng của bạn phát hành.',
  },
  {
    label: 'Không bao giờ thấy mật khẩu ngân hàng',
    tinhTrang: 'co',
    moTa: 'Người dùng cấp quyền trên giao diện của ngân hàng hoặc nhà cung cấp, không nhập vào MIMI.',
  },
];

/**
 * Những thứ CHƯA CÓ.
 *
 * Liệt kê ra thay vì im lặng. Một khoảng trống được nói thẳng thì người đọc tự
 * đánh giá được rủi ro; một khoảng trống bị giấu sẽ được phát hiện đúng vào lúc
 * tệ nhất.
 */
const CHUA_CO: Muc[] = [
  {
    label: 'ISO 27001',
    tinhTrang: 'chua',
    moTa: 'Chưa có tổ chức nào cấp. Khi có, mục này sẽ ghi rõ tổ chức chứng nhận và số hiệu.',
  },
  {
    label: 'PCI DSS',
    tinhTrang: 'chua',
    moTa: 'Không áp dụng — MIMI không xử lý, truyền hay lưu dữ liệu thẻ thanh toán.',
  },
  {
    label: 'Giấy phép trung gian thanh toán / tổ chức tín dụng',
    tinhTrang: 'chua',
    moTa:
      `${COMPANY.shortName} không có và không hoạt động trong phạm vi cần các giấy phép này: ` +
      'không cho vay, không giữ tiền, không chuyển tiền.',
  },
  {
    label: 'Kiểm toán an ninh độc lập',
    tinhTrang: 'chua',
    moTa: 'Chưa thực hiện. Kết quả sẽ được công bố tại đây khi có.',
  },
];

function Dong({ muc }: { muc: Muc }) {
  const co = muc.tinhTrang === 'co';
  return (
    <div className="flex items-start gap-3 py-3.5 border-b border-border last:border-0">
      <span
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          co ? 'bg-mimi-green/10 text-mimi-green' : 'bg-muted text-muted-foreground'
        }`}
      >
        {co ? <Check size={12} /> : <X size={12} />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{muc.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{muc.moTa}</p>
      </div>
    </div>
  );
}

export default function ComplianceDashboard() {
  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Bảo mật và tuân thủ</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Trang này liệt kê cơ chế đang chạy trong hệ thống và cả những thứ chưa có.
              Không có điểm tuân thủ tổng hợp, vì một con số như vậy gộp những thứ không
              cùng đơn vị và tạo cảm giác đã đo lường trong khi chưa đo gì.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock size={14} className="text-mimi-green" /> Đang có
        </h3>
        <div className="mt-2">
          {DA_CO.map((m) => (
            <Dong key={m.label} muc={m} />
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" /> Chưa có
        </h3>
        <div className="mt-2">
          {CHUA_CO.map((m) => (
            <Dong key={m.label} muc={m} />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
