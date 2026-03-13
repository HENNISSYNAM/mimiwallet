import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-wallet-logo.png';

export default function Footer() {
  const { t } = useTranslation();

  const footerLinks = {
    [t('footer.products')]: t('footer.productLinks', { returnObjects: true }) as string[],
    [t('footer.company')]: t('footer.companyLinks', { returnObjects: true }) as string[],
    [t('footer.legal')]: t('footer.legalLinks', { returnObjects: true }) as string[],
  };

  return (
    <footer className="border-t border-border bg-background py-16">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={mimiLogo} alt="MIMI WALLET" className="h-8 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">{t('footer.tagline')}</p>
          </div>
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="font-body font-semibold text-foreground text-sm mb-4">{title}</h4>
              <ul className="space-y-2">
                {(links as string[]).map((l: string) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-6 text-center text-xs text-muted-foreground">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
