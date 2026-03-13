import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, FileText, CreditCard,
  BarChart3, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ShieldCheck, Fingerprint, Cpu, Leaf,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { companyProfile } from '@/lib/mockData';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-wallet-logo.png';

export default function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t('sidebar.overview'), path: '/dashboard' },
    { icon: TrendingUp, label: t('sidebar.cashflow'), path: '/dashboard/cashflow' },
    { icon: FileText, label: t('sidebar.invoices'), path: '/dashboard/invoices' },
    { icon: CreditCard, label: t('sidebar.loans'), path: '/dashboard/loans' },
    { icon: ShieldCheck, label: t('sidebar.creditScore'), path: '/dashboard/credit' },
    { icon: Fingerprint, label: t('sidebar.fintechHub'), path: '/dashboard/fintech' },
    { icon: Cpu, label: t('sidebar.m2mDevices'), path: '/dashboard/m2m' },
    { icon: BarChart3, label: t('sidebar.reports'), path: '/dashboard/reports' },
    { icon: Settings, label: t('sidebar.settings'), path: '/dashboard/settings' },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-secondary border-r border-border"
    >
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <img src={mimiLogo} alt="MIMI WALLET" className="h-9 w-auto shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">{companyProfile.name.substring(0, 20)}</p>
            <p className="text-xs text-mimi-green flex items-center gap-1"><Leaf size={10} /> {t('sidebar.greenPlan')}</p>
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
          {!collapsed && <span>{t('sidebar.support')}</span>}
        </button>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all w-full"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
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
