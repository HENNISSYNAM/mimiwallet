import { Link } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { COMPANY, CONTACT, coKenhLienHeVanBan } from '@/config/company';
import { Trans, useTranslation } from 'react-i18next';

/**
 * Trang công khai mô tả cách xoá tài khoản và dữ liệu.
 *
 * VÌ SAO PHẢI LÀ MỘT TRANG RIÊNG, CÔNG KHAI. Google Play yêu cầu ứng dụng cho
 * phép tạo tài khoản phải có hai đường xoá: một ở trong ứng dụng, và một **đường
 * dẫn web mở được mà không cần cài ứng dụng hay đăng nhập** — để người đã gỡ app
 * vẫn yêu cầu xoá được. MIMI đã có đường thứ nhất (Cài đặt → Xoá tài khoản, có
 * từ khi làm theo App Store Guideline 5.1.1(v)) nhưng chưa có đường thứ hai.
 *
 * Trang này cố ý KHÔNG có nút xoá.
 *
 * Xoá tài khoản là thao tác không hoàn tác được, và một nút xoá đặt trên trang
 * công khai thì bất kỳ ai cũng bấm được — kể cả người đang mở máy của người
 * khác. Việc xoá phải diễn ra sau khi đã chứng minh mình là chủ tài khoản, tức
 * sau khi đăng nhập. Trang này làm đúng việc Play đòi: nói rõ, công khai, ai
 * cũng đọc được, rằng quyền đó tồn tại và đi tới nó bằng cách nào.
 */
export default function XoaTaiKhoan() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 size={18} />
          </span>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {t('ui1.xtk.tieuDe')}
          </h1>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            {t('ui1.xtk.quyen')}
          </p>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">{t('ui1.xtk.cachXoa')}</h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>{t('ui1.xtk.b1')}</li>
              <li><Trans i18nKey="ui1.xtk.b2" components={{ b: <strong className="text-foreground" /> }} /></li>
              <li><Trans i18nKey="ui1.xtk.b3" components={{ b: <strong className="text-foreground" /> }} /></li>
              <li>{t('ui1.xtk.b4')}</li>
            </ol>
            <Link
              to="/dashboard/settings"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              {t('ui1.xtk.toiCaiDat')} <ArrowRight size={13} />
            </Link>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">{t('ui1.xtk.biXoa')}</h2>
            <p>
              {t('ui1.xtk.biXoaMoTa')}
            </p>
            <p className="mt-2">
              <strong className="text-foreground">{t('ui1.xtk.khongHoanTac')}</strong>{' '}
              {t('ui1.xtk.xuatTruoc')}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              {t('ui1.xtk.daGo')}
            </h2>
            <p>
              {t('ui1.xtk.guiToi')}{' '}
              {coKenhLienHeVanBan() ? (
                <>
                  {CONTACT.email && (
                    <a className="text-primary hover:underline" href={`mailto:${CONTACT.email}`}>
                      {CONTACT.email}
                    </a>
                  )}
                  {CONTACT.email && CONTACT.website && ` ${t('ui1.xtk.hoac')} `}
                  {CONTACT.website && (
                    <a className="text-primary hover:underline" href={CONTACT.website} target="_blank" rel="noopener noreferrer">
                      {CONTACT.website}
                    </a>
                  )}
                </>
              ) : (
                <>
                  {t('ui1.xtk.truSo', { ten: COMPANY.legalName, dc: COMPANY.address })}
                </>
              )}
              {t('ui1.xtk.tuEmail')}
            </p>
          </section>

          <p className="border-t border-border/60 pt-4 text-xs">
            <Trans i18nKey="ui1.xtk.chiTiet" components={{ l: <Link to="/privacy" className="text-primary hover:underline" /> }} />
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
