import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Giải pháp', href: '#solutions' },
  { label: 'Tính năng', href: '#features' },
  { label: 'Bảng giá', href: '#pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

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
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="font-display font-extrabold text-primary-foreground text-sm">K</span>
            </div>
            <span className="font-display font-bold text-foreground text-lg">KAPIVA</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
              >
                {l.label}
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-display font-bold bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:brightness-110 transition-all hover:-translate-y-0.5"
            >
              Bắt đầu miễn phí →
            </button>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={24} />
          </button>
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
                key={l.label}
                href={l.href}
                className="text-2xl font-display font-bold text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <button
              onClick={() => { setMobileOpen(false); navigate('/register'); }}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-display font-bold text-lg"
            >
              Bắt đầu miễn phí
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
