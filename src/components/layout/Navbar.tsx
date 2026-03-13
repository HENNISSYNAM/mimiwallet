import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-wallet-logo.png';

const navLinks = [
  { labelKey: 'nav.solutions', href: '#solutions' },
  { labelKey: 'nav.features', href: '#features' },
  { labelKey: 'nav.pricing', href: '#pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
          scrolled
            ? 'bg-background/85 backdrop-blur-xl border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={mimiLogo} alt="MIMI WALLET" className="h-8 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.labelKey}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {t(l.labelKey)}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg hover:bg-accent"
              title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
            >
              <Globe size={15} />
              <span className="font-medium">{i18n.language === 'vi' ? 'EN' : 'VI'}</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              {t('nav.login')}
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-display font-bold bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:brightness-110 transition-all hover:-translate-y-0.5"
            >
              {t('nav.startFree')}
            </button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-muted-foreground hover:text-foreground p-1.5"
            >
              <Globe size={20} />
            </button>
            <button
              className="text-foreground"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background flex flex-col items-center justify-center gap-8"
          >
            <button
              className="absolute top-5 right-5 text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X size={28} />
            </button>
            {navLinks.map((l) => (
              <a
                key={l.labelKey}
                href={l.href}
                className="text-2xl font-display font-bold text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {t(l.labelKey)}
              </a>
            ))}
            <button
              onClick={() => { setMobileOpen(false); navigate('/register'); }}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-display font-bold text-lg"
            >
              {t('nav.startFreeMobile')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
