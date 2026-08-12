import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, TrendingUp, FileText, CreditCard,
  BarChart3, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ShieldCheck, Fingerprint, Cpu, Leaf, Sparkles, GraduationCap, Globe,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import mimiLogo from '@/assets/mimi-cat.webp';

export default function DashboardSidebar() {
  /** The real company, not a constant. The sidebar used to print
   *  "Đức Phát Foods" from mockData while the dashboard beside it showed the
   *  signed-in company's actual name — two different companies on one screen. */
  const [companyName, setCompanyName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('companies').select('name').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (!cancelled && data?.name) setCompanyName(data.name.slice(0, 24));
    })();
    return () => { cancelled = true; };
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t('sidebar.overview'), path: '/dashboard' },
    { icon: TrendingUp, label: t('sidebar.cashflow'), path: '/dashboard/cashflow' },
    { icon: FileText, label: t('sidebar.invoices'), path: '/dashboard/invoices' },
    { icon: CreditCard, label: t('sidebar.loans'), path: '/dashboard/loans' },
    { icon: ShieldCheck, label: t('sidebar.creditScore'), path: '/dashboard/credit' },
    { icon: Fingerprint, label: t('sidebar.fintechHub'), path: '/dashboard/fintech' },
    { icon: Cpu, label: t('sidebar.m2mDevices'), path: '/dashboard/m2m' },
    { icon: Sparkles, label: t('sidebar.technology'), path: '/dashboard/tech' },
    { icon: GraduationCap, label: t('sidebar.learn'), path: '/dashboard/learn' },
    { icon: Leaf, label: t('sidebar.carbon'), path: '/dashboard/carbon' },
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
        <img src={mimiLogo} alt="MIMI WALLET" className="h-9 w-auto shrink-0 no-save" draggable={false} />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">{companyName ?? '—'}</p>
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
        <button
          onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
          aria-label={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          title={i18n.language === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full"
        >
          <Globe size={18} className="shrink-0" />
          {!collapsed && <span>{i18n.language === 'vi' ? 'Tiếng Việt · VI' : 'English · EN'}</span>}
        </button>
        <a
          href="mailto:hoc.qk2@gmail.com?subject=H%E1%BB%97%20tr%E1%BB%A3%20Mimi%20Wallet"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full"
        >
          <HelpCircle size={18} className="shrink-0" />
          {!collapsed && <span>{t('sidebar.support')}</span>}
        </a>
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
