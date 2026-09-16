import { useEffect, useRef, useState } from 'react';
import ChuyenSangToi from '@/components/ChuyenSangToi';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useScrolled } from '@/hooks/useScrolled';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-cat.png';
import { CAC_MENU, MenuDiDong, TamMenu, ngonNguMenu, type KhoaMenu } from '@/components/layout/MenuXo';

/*
 * "Giải pháp" và "Tính năng" từng là liên kết thẳng tới một khu trên trang chủ.
 * Từ 14/09/2026 chúng nằm trong ba menu xổ (Sản phẩm, Giải pháp, Đối tác — xem
 * MenuXo.tsx); chỉ Bảng giá còn là liên kết thẳng.
 */
const navLinks = [{ labelKey: 'nav.pricing', href: '#pricing' }];
// Trang riêng (route), khác navLinks là mốc trên trang chủ.
const navRoutes = [{ labelKey: 'nav.customers', to: '/khach-hang' }];

// Kept apart from navLinks: those are in-page anchors, this is a route.

/*
 * DẢI THÔNG BÁO. Chỉ báo điều đã chạy thật trên production — ở đây là ba luật an
 * toàn cho agent (14/09/2026). Đổi nội dung thì đổi cả KHOA_THONG_BAO để người đã
 * đóng bản cũ vẫn thấy bản mới.
 */
const KHOA_THONG_BAO = 'mimi-thong-bao-luat-an-toan-2026-09';
const CAO_THONG_BAO = 36;

function daDongThongBao(): boolean {
  try {
    return localStorage.getItem(KHOA_THONG_BAO) === '1';
  } catch {
    return false;
  }
}

export default function Navbar() {
  const { pathname } = useLocation();
  // Anchors point at sections that only exist on the landing page, but the
  // navbar renders on every route. Prefixing with the root sends the reader
  // home first and then to the section.
  const onLanding = pathname === '/';
  const anchor = (href: string) => (onLanding ? href : `/${href}`);

  const scrolled = useScrolled(80);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const nn = ngonNguMenu(i18n.language);
  const vi = nn === 'vi';

  const [dongThongBao, setDongThongBao] = useState(daDongThongBao);
  // Dải chỉ đứng ở đầu trang; cuộn xuống thì nhường chỗ cho thanh điều hướng.
  const coThongBao = !dongThongBao && !scrolled;

  const [menuMo, setMenuMo] = useState<KhoaMenu | null>(null);
  const henDong = useRef<ReturnType<typeof setTimeout> | null>(null);
  const huyHen = () => {
    if (henDong.current) clearTimeout(henDong.current);
  };
  const moMenu = (khoa: KhoaMenu) => {
    huyHen();
    setMenuMo(khoa);
  };
  const giuMenu = () => huyHen();
  // Trễ một nhịp để rê chuột từ nút xuống tấm menu không làm menu đóng giữa đường.
  const dongTre = () => {
    huyHen();
    henDong.current = setTimeout(() => setMenuMo(null), 140);
  };

  useEffect(() => {
    if (!menuMo) return;
    const phim = (e: KeyboardEvent) => e.key === 'Escape' && setMenuMo(null);
    window.addEventListener('keydown', phim);
    return () => window.removeEventListener('keydown', phim);
  }, [menuMo]);

  useEffect(() => huyHen, []);

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi');
  };

  const dongDaiThongBao = () => {
    setDongThongBao(true);
    try { localStorage.setItem(KHOA_THONG_BAO, '1'); } catch { /* chế độ riêng tư: chỉ ẩn trong phiên này */ }
  };

  const tren = coThongBao ? CAO_THONG_BAO : 0;
  const menuDangMo = CAC_MENU.find((m) => m.khoa === menuMo) ?? null;

  return (
    <>
      <AnimatePresence>
        {coThongBao && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 top-0 z-[51] flex items-center justify-center gap-3 bg-foreground px-10 text-[13px] text-background"
            style={{ height: CAO_THONG_BAO }}
          >
            <span className="truncate">
              <strong className="font-semibold">{vi ? 'Mới:' : 'New:'}</strong>{' '}
              {vi ? 'Ba luật chống chuyển nhầm cho agent' : 'Three transfer-safety rules for agents'}
              <span className="hidden sm:inline">
                {vi ? ' — giữ người nhận mới 24 giờ, bắt đổi số tài khoản.' : ' — 24-hour hold on new payees, account-swap alerts.'}
              </span>
            </span>
            <a href={anchor('#demo')} className="shrink-0 font-medium underline underline-offset-4">
              {vi ? 'Xem cách hoạt động' : 'See how it works'}
            </a>
            <button
              type="button"
              onClick={dongDaiThongBao}
              aria-label={vi ? 'Đóng thông báo' : 'Dismiss'}
              className="absolute right-3 grid h-7 w-7 place-items-center rounded-md opacity-80 hover:opacity-100"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className={`fixed left-0 right-0 z-50 h-16 flex items-center transition-all duration-300 ${
          scrolled || menuMo
            ? 'lg-surface lg-regular border-b hairline'
            : 'bg-transparent'
        }`}
        style={{ top: tren }}
      >
        <div className="container mx-auto flex items-center justify-between px-4 lg:px-8">
          {/* Head plus wordmark. The old asset carried its own lettering; the
              cat does not, so the name is set in type beside it. */}
          <Link to="/" className="mimi-lockup group">
            <img
              src={mimiLogo}
              alt=""
              aria-hidden
              draggable={false}
              className="h-9 w-9 no-save transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
            />
            <span className="mimi-wordmark">MIMI WALLET</span>
          </Link>

          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            {CAC_MENU.map((m) => {
              const dangMo = menuMo === m.khoa;
              return (
                <div key={m.khoa} onMouseEnter={() => moMenu(m.khoa)} onMouseLeave={dongTre}>
                  <button
                    type="button"
                    onClick={() => (dangMo ? setMenuMo(null) : moMenu(m.khoa))}
                    aria-expanded={dangMo}
                    aria-controls="menu-xo"
                    className={`flex items-center gap-1 text-sm transition-colors ${dangMo ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {m.ten[nn]}
                    <ChevronDown size={14} className={`transition-transform duration-200 ${dangMo ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              );
            })}
            {navRoutes.map((r) => (
              <Link key={r.labelKey} to={r.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t(r.labelKey)}
              </Link>
            ))}
            {navLinks.map((l) => (
              <a
                key={l.labelKey}
                href={anchor(l.href)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {t(l.labelKey)}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ChuyenSangToi />
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

      {/* Tấm menu — nằm ngoài <nav> để rộng theo container, không theo hàng nút. */}
      <AnimatePresence>
        {menuDangMo && (
          <motion.div
            key={menuDangMo.khoa}
            id="menu-xo"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            onMouseEnter={giuMenu}
            onMouseLeave={dongTre}
            className="fixed inset-x-0 z-50 hidden md:block"
            style={{ top: tren + 64 }}
          >
            <div className="container mx-auto px-4 lg:px-8">
              <TamMenu cauHinh={menuDangMo} lang={i18n.language} anchor={anchor} dong={() => setMenuMo(null)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background flex flex-col items-center gap-8 overflow-y-auto px-6 pb-12 pt-20"
          >
            <button
              className="absolute top-5 right-5 text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              <X size={28} />
            </button>
            {CAC_MENU.map((m) => (
              <MenuDiDong key={m.khoa} cauHinh={m} lang={i18n.language} anchor={anchor} dong={() => setMobileOpen(false)} />
            ))}
            {navRoutes.map((r) => (
              <Link key={r.labelKey} to={r.to} className="text-2xl font-display font-bold text-foreground" onClick={() => setMobileOpen(false)}>
                {t(r.labelKey)}
              </Link>
            ))}
            {navLinks.map((l) => (
              <a
                key={l.labelKey}
                href={anchor(l.href)}
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
