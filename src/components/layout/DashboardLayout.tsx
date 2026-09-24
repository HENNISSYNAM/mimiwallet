import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import { Bell, ChevronRight, Clock, HelpCircle, Images, LayoutDashboard, LogOut, Menu, Puzzle, Search, Settings, Store, Users, X } from 'lucide-react';
import { IconMeo } from '@/components/brand/IconMeo';
import { HopTaiUngDung } from './HopTaiUngDung';
import { NhanMinhHoa } from './NhanMinhHoa';
import { useCongTy } from '@/hooks/useCongTy';
import { TRANG_CHI_TIET } from '@/lib/trangChiTiet';
import { useAuthStore } from '@/store/useAuthStore';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { duongDanCongCu } from '@/lib/congCu';
import { IconCongCu } from '@/components/cong-cu/IconCongCu';
import { KhoCongCu } from '@/components/cong-cu/KhoCongCu';
import { NutQuetChungTu } from '@/components/chung-tu/NutQuetChungTu';
import { useCoMoHinh } from '@/hooks/useTrangThaiTroLy';
import { ScanLine } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import AIChatWidget from '@/components/AIChatWidget';
import { MimiLamHoProvider } from '@/components/mimi/MimiLamHo';
import { toast } from 'sonner';
import { useScrolled } from '@/hooks/useScrolled';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { congTyDangDung, idCongTyDangDung } from '@/lib/congTyDangDung';
import { layDichSauDangNhap } from '@/lib/sauDangNhap';

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
/*
 * 15/09/2026, tính lại cho điện thoại: bốn chỗ người dùng quay lại hằng ngày — cùng thứ tự
 * thanh bên máy tính — và ô thứ năm "Thêm" mở bảng chứa mọi nơi khác. Năm ô rộng tối thiểu
 * 56px vừa màn 320px, chữ nhãn một từ để không xuống dòng.
 */
/*
 * Người dùng ưu tiên quét hoá đơn trên điện thoại (15/09/2026, như nút quét giữa của MoMo):
 * giữa thanh là nút quét nhô lên, bấm là mở máy ảnh sau. Hai ô trái, hai ô phải; Kết nối vào
 * bảng "Thêm".
 */
const mobileNav = [
  { icon: IconMeo, khoa: 'man.ten.troLyNgan', path: '/dashboard/tro-ly' },
  { icon: Images, khoa: 'man.ten.thuVienNgan', path: '/dashboard/thu-vien' },
  { icon: Clock, khoa: 'man.ten.nhacThue', path: '/dashboard/nhac-thue' },
];

/** Trang chi tiết mở từ MIMI Assistant: tiêu đề kèm đường quay về trợ lý. */
const TRANG_CHI_TIET_CUA_TRO_LY = new Set(TRANG_CHI_TIET.map((t) => t.duong_dan));

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
  '/dashboard/fintech': 'sidebar.fintechHub',
  '/dashboard/reports': 'sidebar.reports',
  '/dashboard/settings': 'sidebar.settings',
  // Chưa có khoá dịch: i18next trả lại chính chuỗi khi không thấy khoá, nên tên
  // hiện đúng. Trước 10/09/2026 bốn trang này có tiêu đề "Dashboard".
  '/dashboard/tro-ly': 'man.ten.troLy',
  '/dashboard/thu-vien': 'man.ten.thuVien',
  '/dashboard/nhac-thue': 'man.ten.nhacThue',
  '/dashboard/ket-noi': 'man.ten.ketNoi',
  '/dashboard/chinh-sach': 'man.ten.chinhSach',
  '/dashboard/tac-tu': 'man.ten.tacTu',
  '/dashboard/chi-phi-ai': 'man.ten.chiPhiAi',
  '/dashboard/chung-tu': 'man.ten.chungTu',
  '/dashboard/to-khai': 'man.ten.toKhai',
  '/dashboard/clients': 'man.ten.khachHang',
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
  const [moThem, setMoThem] = useState(false);
  const [moTaiApp, setMoTaiApp] = useState(false);
  const [moKho, setMoKho] = useState(false);
  const congTy = useCongTy();
  const congCuGhim = useCongCuGhim();
  const coMoHinh = useCoMoHinh();

  const oDieuHuong = (item: (typeof mobileNav)[number]) => (
    <NavLink
      key={item.path}
      to={item.path}
      data-mimi={`nav:${item.path}`}
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
          <span>{t(item.khoa)}</span>
        </>
      )}
    </NavLink>
  );
  const logout = useAuthStore((s) => s.logout);

  // Link email và Google quay về /dashboard (URL đã khai với Supabase); đích thật do trang
  // đăng ký nhớ ở trình duyệt — xem `lib/sauDangNhap.ts`. Chỉ đọc một lần khi vào layout.
  useEffect(() => {
    const dich = layDichSauDangNhap();
    if (dich && dich !== location.pathname && location.pathname === '/dashboard') navigate(dich, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await nguoiDungHienTai();
      if (!user) return;
      const ct = await congTyDangDung().catch(() => null);
      if (cancelled) return;
      // Company name first, then the email local part — never an invented one.
      setInitials(initialsOf(ct?.ten ?? user.email?.split('@')[0] ?? null));

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
          className={`h-[72px] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 safe-top transition-[background-color,box-shadow,border-color] duration-300 ${
            scrolled ? 'lg-surface lg-regular border-b hairline' : 'bg-background border-b border-transparent'
          }`}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            {TRANG_CHI_TIET_CUA_TRO_LY.has(location.pathname) && (
              <>
                <NavLink to="/dashboard/tro-ly" className="hidden shrink-0 text-sm text-muted-foreground hover:text-foreground sm:inline">
                  {t('man.ten.troLy')}
                </NavLink>
                <ChevronRight size={14} className="hidden shrink-0 text-muted-foreground sm:inline" aria-hidden />
              </>
            )}
            <h1 className="truncate font-display font-bold text-[19px] text-foreground tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <form
              onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
              className="mimi-o-kinh hidden h-10 items-center gap-2 rounded-full px-4 transition-shadow focus-within:ring-2 focus-within:ring-primary/25 md:flex"
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
              onClick={() => toast(t('man.chung.chuaCoThongBao'))}
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
            <div className="mimi-o-kinh flex h-10 flex-1 items-center gap-2 rounded-full px-3.5">
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
          <NhanMinhHoa />
          <Outlet />
        </main>

        {/* Mobile bottom nav — iOS tab bar */}
        {/* Tab bar always has content underneath, so it always reads as glass. */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 lg-surface lg-regular border-t hairline flex justify-around z-40 safe-bottom">
          {mobileNav.slice(0, 2).map(oDieuHuong)}
          <div className="flex min-w-[64px] flex-col items-center justify-end pb-1">
            <NutQuetChungTu
              coMoHinh={coMoHinh}
              nhanAn="Quét hoá đơn"
              className="-mt-7 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_hsla(var(--blue-500)/0.4)] ring-4 ring-background pressable"
            >
              <ScanLine size={26} strokeWidth={2.2} />
            </NutQuetChungTu>
            <span className="mt-0.5 text-[11px] font-medium text-primary">{t('man.chung.quet')}</span>
          </div>
          {mobileNav.slice(2).map(oDieuHuong)}
          <button
            type="button"
            onClick={() => setMoThem(true)}
            aria-expanded={moThem}
            className="flex min-h-[52px] min-w-[56px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium text-muted-foreground pressable"
          >
            <Menu size={22} strokeWidth={1.9} />
            <span>{t('man.chung.them')}</span>
          </button>
        </nav>

        <Sheet open={moThem} onOpenChange={setMoThem}>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
            <SheetHeader className="text-left">
              <SheetTitle className="truncate">{congTy?.ten ?? t('man.chung.congTyCuaBan')}</SheetTitle>
              <SheetDescription className="sr-only">{t('man.chung.moiTrangKhac')}</SheetDescription>
            </SheetHeader>
            <nav className="mt-4 grid gap-1" aria-label="Thêm">
              {[
                { icon: Puzzle, khoa: 'man.ten.ketNoi', duong: '/dashboard/ket-noi' },
                { icon: LayoutDashboard, khoa: 'man.ten.tongQuanGiaoDich', duong: '/dashboard' },
                { icon: Users, khoa: 'man.ten.khachHang', duong: '/dashboard/clients' },
                { icon: Settings, khoa: 'man.ten.caiDat', duong: '/dashboard/settings' },
              ].map((m) => (
                <NavLink key={m.duong} to={m.duong} end onClick={() => setMoThem(false)} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] text-foreground hover:bg-accent">
                  <m.icon size={20} className="text-muted-foreground" /> {t(m.khoa)}
                </NavLink>
              ))}
              <p className="mt-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('man.chung.congCuCuaBan')}</p>
              {congCuGhim.ds.filter((c) => ![...mobileNav.map((m) => m.path), '/dashboard/ket-noi', '/dashboard', '/dashboard/clients', '/dashboard/settings'].includes(c.dich)).map((c) => (
                <NavLink key={c.khoa} to={duongDanCongCu(c)} end onClick={() => setMoThem(false)} className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-foreground hover:bg-accent">
                  <IconCongCu khoa={c.khoa} size={19} className="text-muted-foreground" /> {c.ten}
                </NavLink>
              ))}
              <button type="button" onClick={() => { setMoThem(false); setMoKho(true); }} className="flex min-h-11 items-center rounded-lg px-3 text-left text-[15px] text-primary hover:bg-accent">
                + Tuỳ chỉnh công cụ
              </button>
              <p className="mt-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('man.chung.trangChiTiet')}</p>
              {TRANG_CHI_TIET.map((tr) => (
                <NavLink key={tr.duong_dan} to={tr.duong_dan} onClick={() => setMoThem(false)} className="flex min-h-11 items-center rounded-lg px-3 text-[15px] text-foreground hover:bg-accent">
                  {t(tr.khoa)}
                </NavLink>
              ))}
              <div className="mt-3 grid gap-1 border-t border-border pt-3">
                <button type="button" onClick={() => { setMoThem(false); setMoTaiApp(true); }} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-[15px] text-foreground hover:bg-accent">
                  <Store size={20} className="text-muted-foreground" /> Dùng MIMI như ứng dụng
                </button>
                <a href="mailto:hoc.qk2@gmail.com?subject=H%E1%BB%97%20tr%E1%BB%A3%20Mimi%20Wallet" className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] text-foreground hover:bg-accent">
                  <HelpCircle size={20} className="text-muted-foreground" /> Hỗ trợ
                </a>
                <button type="button" onClick={() => { setMoThem(false); void logout(); navigate('/'); }} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-left text-[15px] text-destructive hover:bg-destructive/10">
                  <LogOut size={20} /> Đăng xuất
                </button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        <HopTaiUngDung mo={moTaiApp} onDong={() => setMoTaiApp(false)} tab="dien_thoai" />
        <KhoCongCu mo={moKho} onDong={() => setMoKho(false)} />

        {/* AI Chat Widget — bọc trong con trỏ mèo để trợ lý làm hộ được trên giao diện. */}
        {/* Trên màn MIMI Assistant đã có ô hỏi ở giữa; nút chat nổi chỉ là ô hỏi thứ hai. */}
        <MimiLamHoProvider>
          {location.pathname !== '/dashboard/tro-ly' && <AIChatWidget />}
        </MimiLamHoProvider>
      </div>
    </div>
  );
}
