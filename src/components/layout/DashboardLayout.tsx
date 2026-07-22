import { Outlet, useLocation } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import { Bell, Search, LayoutDashboard, FileText, ShieldCheck, BarChart3, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import AIChatWidget from '@/components/AIChatWidget';
import { toast } from 'sonner';
import { useScrolled } from '@/hooks/useScrolled';

const mobileNav = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/dashboard' },
  { icon: FileText, label: 'Hóa đơn', path: '/dashboard/invoices' },
  { icon: ShieldCheck, label: 'Điểm', path: '/dashboard/credit' },
  { icon: BarChart3, label: 'Báo cáo', path: '/dashboard/reports' },
  { icon: Sparkles, label: 'Công nghệ', path: '/dashboard/tech' },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/dashboard/cashflow': 'Dòng tiền',
  '/dashboard/invoices': 'Hóa đơn',
  '/dashboard/loans': 'Vay vốn',
  '/dashboard/credit': 'Điểm tín dụng',
  '/dashboard/fintech': 'Fintech Hub',
  '/dashboard/m2m': 'Thiết bị M2M',
  '/dashboard/reports': 'Báo cáo',
  '/dashboard/settings': 'Cài đặt',
  '/dashboard/tech': 'Công nghệ',
  '/dashboard/learn': 'Học Fintech',
};

export default function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';
  // The header only takes definition once content is travelling beneath it.
  const scrolled = useScrolled(8);

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
            <div className="hidden md:flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                placeholder="Tìm hóa đơn, giao dịch..."
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-44"
              />
            </div>
            <button
              onClick={() => toast('Chưa có thông báo mới')}
              className="md:hidden w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors pressable"
              aria-label="Tìm kiếm"
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-mimi-green flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-white">AM</span>
            </div>
          </div>
        </header>

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
