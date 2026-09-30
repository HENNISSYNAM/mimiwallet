import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-cat.png';
import { COMPANY, CONTACT, hasContact, hoacToken, THONG_BAO_BCT } from '@/config/company';
import { DANH_MUC_CHINH_SACH, TRANG_THONG_TIN } from '@/pages/chinh-sach/danhMuc';
import { Facebook, Mail, Globe, Phone } from 'lucide-react';

/**
 * Chân trang — danh tính pháp nhân, không phải trang trí.
 *
 * Bản trước của file này có ba vấn đề, và cả ba đều đang hiển thị công khai:
 *
 * 1. `footer.copyright` ghi "Được cấp phép bởi NHNN Việt Nam". KHÔNG CÓ giấy
 *    phép nào như vậy. Mạo nhận được Ngân hàng Nhà nước cấp phép là chuyện
 *    khác hẳn nói quá về tính năng — nó là tuyên bố sai về tư cách pháp lý,
 *    trong đúng lĩnh vực mà tư cách đó bị quản chặt nhất.
 *
 * 2. Tên pháp nhân ghi "MIMI WALLET Technology JSC" và mã số thuế ghi
 *    "0123456789" — một chuỗi placeholder. Đơn vị vận hành thật là
 *    CÔNG TY CỔ PHẦN CLI NUTRIX, mã số 0319436143.
 *
 * 3. Toàn bộ liên kết, gồm cả cột "Pháp lý" có "Điều khoản sử dụng" và "Bảo
 *    mật", đều là `href="#"`. Chân trang trông như đã có chính sách bảo mật
 *    trong khi không có trang nào cả. App Store kiểm đúng URL đó đầu tiên, và
 *    Nghị định 52/2013/NĐ-CP thì buộc công bố thông tin thương nhân thật.
 *
 * Nguyên tắc từ đây: chân trang chỉ liệt kê thứ dẫn tới một trang có thật. Một
 * cột trống trung thực hơn một cột đầy liên kết chết.
 */

interface NavItem {
  label: string;
  to: string;
}

export default function Footer() {
  const { t } = useTranslation();

  // Chỉ những đường dẫn thật sự tồn tại trong bảng route.
  const sanPham: NavItem[] = [
    { label: 'MIMI Trợ lý', to: '/dashboard' },
    { label: 'Hoá đơn', to: '/dashboard/invoices' },
    { label: 'Báo cáo', to: '/dashboard/reports' },
  ];

  const phapLy: NavItem[] = [
    { label: 'Chính sách bảo mật', to: '/privacy' },
    { label: 'Điều khoản sử dụng', to: '/terms' },
    // Google Play đòi đường xoá tài khoản mở được không cần cài app; để ở chân
    // trang là chỗ người duyệt và người dùng đều tìm tới đầu tiên.
    { label: 'Xoá tài khoản', to: '/xoa-tai-khoan' },
    { label: 'Về chúng tôi', to: '/about' },
    { label: TRANG_THONG_TIN.tieuDe, to: TRANG_THONG_TIN.duong },
  ];

  // Bảy trang công bố theo hồ sơ thông báo TMĐT (online.gov.vn) — Bộ kiểm chúng từ chân trang.
  // Văn bản pháp lý giữ tiếng Việt (không qua i18n), như Privacy/Terms.
  const chinhSach: NavItem[] = DANH_MUC_CHINH_SACH.map((m) => ({ label: m.tieuDe, to: m.duong }));

  return (
    <footer className="border-t border-border bg-background py-16 safe-bottom safe-x">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 md:col-span-2">
            <Link to="/" className="mimi-lockup mb-4">
              <img src={mimiLogo} alt="" aria-hidden draggable={false} className="h-9 w-9 no-save" />
              <span className="mimi-wordmark">MIMI WALLET</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-5">{t('footer.tagline')}</p>

            <dl className="space-y-1.5 text-sm text-muted-foreground">
              <div>
                <dt className="sr-only">Đơn vị vận hành</dt>
                <dd className="font-medium text-foreground">{COMPANY.legalName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">Mã số doanh nghiệp:</dt>
                <dd className="font-mono">{COMPANY.taxCode}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">Cấp ngày:</dt>
                <dd>
                  {COMPANY.incorporatedOn} tại {hoacToken(COMPANY.registrationPlace, 'NOI_CAP_DKDN')}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">Trụ sở:</dt>
                <dd>{COMPANY.address}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0">Người đại diện:</dt>
                <dd>
                  {COMPANY.legalRepresentative.name} — {COMPANY.legalRepresentative.title}
                </dd>
              </div>
            </dl>

            {hasContact() && (
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                {CONTACT.email && (
                  <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="w-3.5 h-3.5" /> {CONTACT.email}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {hoacToken(CONTACT.phone, 'SO_DIEN_THOAI')}
                </span>
                {CONTACT.facebook && (
                  <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="MIMI trên Facebook" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Facebook className="w-3.5 h-3.5" /> Facebook
                  </a>
                )}
                {CONTACT.website && (
                  <a href={CONTACT.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Globe className="w-3.5 h-3.5" /> {CONTACT.website}
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="font-body font-semibold text-foreground text-sm mb-4">{t('footer.products')}</h4>
            <ul className="space-y-2">
              {sanPham.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-body font-semibold text-foreground text-sm mb-4">Chính sách</h4>
            <ul className="space-y-2">
              {chinhSach.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-body font-semibold text-foreground text-sm mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              {phapLy.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground space-y-1.5">
          <p>
            © {new Date().getFullYear()} {COMPANY.legalName}. {COMPANY.product.name} là sản phẩm
            do {COMPANY.shortName} vận hành.
          </p>
          {/* Nói rõ cái KHÔNG có, vì bản trước của dòng này khẳng định ngược lại. */}
          <p>
            {COMPANY.shortName} không phải tổ chức tín dụng và không phải trung gian thanh toán.
            MIMI Wallet không cho vay, không giữ tiền và không chuyển tiền thay người dùng.
          </p>
          {/* Logo "Đã thông báo Bộ Công Thương": chỉ hiện khi đã được xác nhận và đã điền
              THONG_BAO_BCT trong config/company.ts — gắn trước khi được xác nhận là công bố sai. */}
          {THONG_BAO_BCT.url && THONG_BAO_BCT.anh && (
            <a href={THONG_BAO_BCT.url} target="_blank" rel="noopener noreferrer" className="inline-block pt-2">
              <img src={THONG_BAO_BCT.anh} alt="Đã thông báo Bộ Công Thương" className="h-12 w-auto" />
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
