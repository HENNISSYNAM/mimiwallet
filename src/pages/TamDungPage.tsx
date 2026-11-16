import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, FileText, PauseCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { TRANG_DONG_BANG } from '@/lib/dongBang';

/**
 * Trang của tính năng đã đóng băng (`lib/dongBang.ts`): nói rõ vì sao, và chỉ lối tới việc chính.
 *
 * 16/11/2026: lối về đổi từ "Kiểm tra một khoản trước khi chuyển" (đã đóng băng) sang "Soạn tờ khai thuế" — việc
 * ra tiền đầu tiên của MIMI.
 */
function NoiDungTamDung({ congKhai }: { congKhai: boolean }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const duong = pathname.replace(/(.)\/+$/, '$1');
  const tt = TRANG_DONG_BANG[duong] ?? { ten: t('ui2.tamDung.tinhNangNay'), ly_do: t('ui2.tamDung.lyDoMacDinh') };
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <PauseCircle size={32} className="mx-auto text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold text-foreground">{t('ui2.tamDung.dangTamDung', { ten: tt.ten })}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{tt.ly_do}</p>
      {congKhai ? (
        <Link
          to="/san-pham/khai-thue-ho-kinh-doanh"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {t('ui2.tamDung.xemSanPham')} <ArrowRight size={16} />
        </Link>
      ) : (
        <Link
          to="/dashboard/to-khai"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <FileText size={16} /> {t('ui2.tamDung.soanToKhai')}
        </Link>
      )}
    </div>
  );
}

export default function TamDungPage() {
  return <NoiDungTamDung congKhai={false} />;
}

/** Bản cho trang công khai (ngoài khu đăng nhập): có thanh điều hướng và chân trang của trang chủ. */
export function TamDungCongKhai() {
  return (
    <div className="min-h-screen landing-light bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24">
        <NoiDungTamDung congKhai />
      </main>
      <Footer />
    </div>
  );
}
