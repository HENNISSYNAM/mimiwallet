import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import { Bell, Search, LayoutDashboard, FileText, ShieldCheck, BarChart3, Fingerprint, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import AIChatWidget from '@/components/AIChatWidget';
import { toast } from 'sonner';
import { useScrolled } from '@/hooks/useScrolled';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

/**
 * Two initials for the avatar, from whatever real name we actually have.
 *
 * It used to be the string "AM" — Anh Minh, from the deleted mockData — printed
 * for every account that ever signed in, which is the same fiction the sidebar
 * was carrying when it showed "Đức Phát Foods" to everyone. A name we do not
 * have is shown as a dash, not as somebody else's.
 */
function initialsOf(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Five slots, so each one has to earn its place by being a job the owner comes
 * here to do.
 *
 * "Vay vốn" held one of them, and an older note here called it "the entire
 * point of the product". It is not, and cannot be: MIMI has no credit licence
 * and no disbursement partner, so the slot advertised something that does not
 * exist. It is replaced by Fintech Hub — connecting a bank is the one action
 * everything else on this product depends on, and it was previously buried in
 * the sidebar where a phone user would rarely find it.
 */
const mobileNav = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/dashboard' },
  { icon: FileText, label: 'Hóa đơn', path: '/dashboard/invoices' },
  { icon: Fingerprint, label: 'Kết nối', path: '/dashboard/fintech' },
  { icon: ShieldCheck, label: 'Điểm', path: '/dashboard/credit' },
  { icon: BarChart3, label: 'Báo cáo', path: '/dashboard/reports' },
];

/**
 * Header title per route, keyed to the same i18n strings the sidebar uses.
 *
 * These were hardcoded Vietnamese while the sidebar beside them was already
 * translated, so switching the app to English left the page heading in
 * Vietnamese — and worse, the two could drift apart, naming one destination
 * two ways on one screen. One source of truth for the name of a place.
 */
const pageTitleKeys: Record<string, string> = {
  '/dashboard': 'sidebar.overview',
  '/dashboard/cashflow': 'sidebar.cashflow',
  '/dashboard/invoices': 'sidebar.invoices',
  '/dashboard/loans': 'sidebar.loans',
  '/dashboard/credit': 'sidebar.creditScore',
  '/dashboard/fintech': 'sidebar.fintechHub',
  '/dashboard/m2m': 'sidebar.m2mDevices',
  '/dashboard/reports': 'sidebar.reports',
  '/dashboard/settings': 'sidebar.settings',
  '/dashboard/tech': 'sidebar.technology',
  '/dashboard/learn': 'sidebar.learn',
  '/dashboard/carbon': 'sidebar.carbon',
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const titleKey = pageTitleKeys[location.pathname];
  const title = titleKey ? t(titleKey) : 'Dashboard';
  // The header only takes definition once content is travelling beneath it.
  const scrolled = useScrolled(8);

  const [query, setQuery] = useState('');
  const [mobileSearch, setMobileSearch] = useState(false);
  const [initials, setInitials] = useState('—');
  /**
   * Google profile photo, when the account signed in that way.
   *
   * Supabase copies the OAuth provider's claims into `user_metadata`, and
   * Google's photo lands under `avatar_url` (older sessions may only carry the
   * raw OIDC `picture` claim), so both are checked. Email/password accounts
   * have neither and keep the initials.
   *
   * `avatarFailed` exists because that URL points at googleusercontent.com and
   * can 403 once the photo is made private or the account is deleted. Without
   * the fallback the header would show a broken-image glyph where a person's
   * face used to be, which looks like the app is broken rather than like a
   * missing photo.
   */
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies').select('name').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (cancelled) return;
      // Company name first, then the email local part — never an invented one.
      setInitials(initialsOf(data?.name ?? user.email?.split('@')[0] ?? null));

      // Google puts the photo here. Both keys are read because Supabase passes
      // the provider claims through largely untouched, and which one is present
      // depends on when the session was created.
      const meta = user.user_metadata ?? {};
      const photo =
        (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
        (typeof meta.picture === 'string' && meta.picture) ||
        null;
      setAvatarUrl(photo);
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * The box used to have no `value`, no `onChange` and no submit — a control
   * that looked live, accepted typing and threw it away. The mobile magnifier
   * beside it was worse: it fired `toast('Chưa có thông báo mới')`, the
   * notification bell's message, copied onto a search button.
   *
   * Rather than delete the affordance, it now does the one thing it promises.
   * InvoicesPage already filters by client name and invoice number, so the
   * header hands it the term through the URL and lets that page do the work.
   */
  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;
    navigate(`/dashboard/invoices?q=${encodeURIComponent(q)}`);
    setMobileSearch(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className={`h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 safe-top transition-[background-color,box-shadow,border-color] duration-300 ${
            scrolled ? 'lg-surface lg-regular border-b hairline' : 'bg-background border-b border-transparent'
          }`}
        >
          <h1 className="font-display font-bold text-[19px] text-foreground tracking-tight">{title}</h1>
          <div className="flex items-center gap-3">
            <form
              onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
              className="hidden md:flex items-center gap-2 bg-accent rounded-xl px-3 py-2 focus-within:ring-1 focus-within:ring-primary/40 transition-shadow"
            >
              <Search size={14} className="text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm hóa đơn theo tên hoặc số..."
                aria-label="Tìm hóa đơn"
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-44"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Xoá tìm kiếm" className="text-muted-foreground hover:text-foreground shrink-0">
                  <X size={13} />
                </button>
              )}
            </form>
            <button
              onClick={() => setMobileSearch((v) => !v)}
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors pressable"
              aria-label="Tìm kiếm"
              aria-expanded={mobileSearch}
            >
              <Search size={19} />
            </button>
            <button
              onClick={() => toast('Chưa có thông báo mới')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors pressable"
              aria-label="Thông báo"
            >
              <Bell size={19} />
            </button>
            {/* The gradient stays as the backing layer, so it shows through
                while the photo is still loading and remains the whole avatar
                when there is no photo — no empty circle, no layout shift. */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-mimi-green flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
              {avatarUrl && !avatarFailed ? (
                <img
                  src={avatarUrl}
                  alt=""
                  aria-hidden="true"
                  // Google serves these cross-origin; without this the request
                  // carries no credentials and stays a plain public fetch.
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-white">{initials}</span>
              )}
            </div>
          </div>
        </header>

        {/* On phones the field drops below the bar when asked for, instead of
            fighting the title for the same 16px-tall row. */}
        {mobileSearch && (
          <form
            onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
            className="md:hidden px-4 pb-3 flex items-center gap-2 bg-background border-b hairline"
          >
            <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2.5 flex-1">
              <Search size={15} className="text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm hóa đơn theo tên hoặc số..."
                aria-label="Tìm hóa đơn"
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
              />
            </div>
            <button type="button" onClick={() => { setMobileSearch(false); setQuery(''); }} className="text-sm text-muted-foreground px-1">
              Huỷ
            </button>
          </form>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav — iOS tab bar */}
        {/* Tab bar always has content underneath, so it always reads as glass. */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 lg-surface lg-regular border-t hairline flex justify-around z-40 safe-bottom">
          {mobileNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[52px] py-1.5 text-[11px] font-medium transition-colors pressable ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* AI Chat Widget */}
        <AIChatWidget />
      </div>
    </div>
  );
}
