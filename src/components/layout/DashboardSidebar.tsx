import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, FileText, CreditCard,
  BarChart3, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ShieldCheck, Fingerprint, Cpu,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { companyProfile } from '@/lib/mockData';
import { useState } from 'react';

const navItems = [
  { icon: LayoutDashboard, label: 'Tổng quan', path: '/dashboard' },
  { icon: TrendingUp, label: 'Dòng tiền', path: '/dashboard/cashflow' },
  { icon: FileText, label: 'Hóa đơn', path: '/dashboard/invoices' },
  { icon: CreditCard, label: 'Vay vốn', path: '/dashboard/loans' },
  { icon: ShieldCheck, label: 'Credit Score', path: '/dashboard/credit' },
  { icon: Fingerprint, label: 'Fintech Hub', path: '/dashboard/fintech' },
  { icon: BarChart3, label: 'Báo cáo', path: '/dashboard/reports' },
  { icon: Settings, label: 'Cài đặt', path: '/dashboard/settings' },
];

export default function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-secondary border-r border-border"
    >
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="font-display font-bold text-primary-foreground text-sm">ĐP</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">{companyProfile.name.substring(0, 20)}</p>
            <p className="text-xs text-kapiva-amber">Gói Growth ⭐</p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary border-l-[3px] border-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3 space-y-2">
        <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full">
          <HelpCircle size={18} className="shrink-0" />
          {!collapsed && <span>Hỗ trợ</span>}
        </button>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Đăng xuất</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}
