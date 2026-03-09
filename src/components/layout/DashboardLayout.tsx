import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import DashboardSidebar from './DashboardSidebar';
import { Bell, Search, LayoutDashboard, FileText, CreditCard, BarChart3, Settings, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { NavLink } from 'react-router-dom';
import AIChatWidget from '@/components/AIChatWidget';

const mobileNav = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/dashboard' },
  { icon: FileText, label: 'Hóa đơn', path: '/dashboard/invoices' },
  { icon: CreditCard, label: 'Vay vốn', path: '/dashboard/loans' },
  { icon: BarChart3, label: 'Báo cáo', path: '/dashboard/reports' },
  { icon: Settings, label: 'Cài đặt', path: '/dashboard/settings' },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/dashboard/cashflow': 'Dòng tiền',
  '/dashboard/invoices': 'Hóa đơn',
  '/dashboard/loans': 'Vay vốn',
  '/dashboard/reports': 'Báo cáo',
  '/dashboard/settings': 'Cài đặt',
};

export default function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 bg-secondary/50 backdrop-blur-sm sticky top-0 z-30">
          <h1 className="font-display font-bold text-lg text-foreground">{title}</h1>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                placeholder="Tìm hóa đơn, giao dịch..."
                className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-48"
              />
            </div>
            <button className="relative text-muted-foreground hover:text-foreground transition-colors">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-secondary" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">AM</span>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-secondary border-t border-border flex justify-around py-2 z-40">
          {mobileNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
