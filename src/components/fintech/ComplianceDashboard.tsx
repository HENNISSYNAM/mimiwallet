import { motion } from 'framer-motion';
import { Shield, Check, Lock, Clock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
    label: 'ui2.tuanThu.maHoa',
    tinhTrang: 'co',
    moTa: 'ui2.tuanThu.maHoaMo',
  },
  {
    label: 'ui2.tuanThu.cachLy',
    tinhTrang: 'co',
    moTa: 'ui2.tuanThu.cachLyMo',
  },
  {
    label: 'ui2.tuanThu.thuHoi',
    tinhTrang: 'co',
    moTa: 'ui2.tuanThu.thuHoiMo',
  },
  {
    label: 'ui2.tuanThu.khongThe',
    tinhTrang: 'co',
    moTa: 'ui2.tuanThu.khongTheMo',
  },
  {
    label: 'ui2.tuanThu.matKhau',
    tinhTrang: 'co',
    moTa: 'ui2.tuanThu.matKhauMo',
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
    moTa: 'ui2.tuanThu.isoMo',
  },
  {
    label: 'PCI DSS',
    tinhTrang: 'chua',
    moTa: 'ui2.tuanThu.pciMo',
  },
  {
    label: 'ui2.tuanThu.giayPhep',
    tinhTrang: 'chua',
    moTa: 'ui2.tuanThu.giayPhepMo',
  },
  {
    label: 'ui2.tuanThu.kiemToan',
    tinhTrang: 'chua',
    moTa: 'ui2.tuanThu.kiemToanMo',
  },
];

/** `label` và `moTa` là khoá i18n (khối `ui2.tuanThu`); tên chuẩn như ISO 27001 để nguyên. */
function Dong({ muc }: { muc: Muc }) {
  const { t } = useTranslation();
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
        <p className="text-sm font-medium text-foreground">{muc.label.startsWith('ui2.') ? t(muc.label) : muc.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(muc.moTa, { congTy: COMPANY.shortName })}</p>
      </div>
    </div>
  );
}

export default function ComplianceDashboard() {
  const { t } = useTranslation();
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
            <p className="text-sm font-semibold text-foreground">{t('ui2.tuanThu.tieuDe')}</p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {t('ui2.tuanThu.moTa')}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock size={14} className="text-mimi-green" /> {t('ui2.tuanThu.dangCo')}
        </h3>
        <div className="mt-2">
          {DA_CO.map((m) => (
            <Dong key={m.label} muc={m} />
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" /> {t('ui2.tuanThu.chuaCo')}
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
