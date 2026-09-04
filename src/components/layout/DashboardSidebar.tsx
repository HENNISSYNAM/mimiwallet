import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FileText, Users,
  BarChart3, Settings, HelpCircle, LogOut, ChevronLeft, ChevronRight, ShieldCheck, Fingerprint, Cpu, HandCoins, Leaf, Sparkles, GraduationCap, Globe,
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

  /**
   * Twelve destinations, grouped by what the person came to do.
   *
   * They used to be one flat list, which meant "Cài đặt" and "Hóa đơn" carried
   * the same visual weight — a list that long reads as an undifferentiated
   * wall and pushes the daily work (hoá đơn, dòng tiền) into the same scan as
   * things opened once a quarter. Grouping is the cheapest fix: four short
   * lists are read as four, a twelve-item list is read as twelve.
   *
   * "Dòng tiền" is deliberately absent. `/dashboard/cashflow` renders the very
   * same `DashboardOverview` component as `/dashboard` (see App.tsx), so the
   * sidebar was offering two doors into one room — press either and the screen
   * does not change. The route stays alive because links point at it; only the
   * duplicate door is gone.
   *
   * "Công nghệ" is absent for a different reason: it is a marketing page —
   * hero, three pillars, a pipeline diagram, no data belonging to this company.
   * That is a page to show someone before they sign up, not a tab beside their
   * invoices. It stays reachable at /dashboard/tech and from the public site.
   *
   * "Thiết bị M2M" nhường ô cho "Vay ngang hàng" ngày 04/09/2026. Ba bảng M2M
   * (device_wallets, device_rules, m2m_transactions), edge function
   * m2m-operations và route /dashboard/m2m đều còn nguyên — chỉ là không chiếm
   * một ô cố định nữa. Bộ máy điều kiện trong device_rules dùng lại được cho
   * quy tắc trả nợ tự động, nên xoá là mất không.
   *
   * Sàn vay ngang hàng chưa được NHNN cấp Giấy chứng nhận tham gia cơ chế thử
   * nghiệm theo Nghị định 94/2025/NĐ-CP, và trang tự nói ra điều đó bằng một
   * dải cảnh báo không tắt được. Đây là chỗ khác với "Vay vốn" ngày 17/08: lần
   * đó ô điều hướng quảng cáo một dịch vụ không tồn tại và không nói gì thêm.
   *
   * "Vay vốn" is absent as of 17/08/2026 because MIMI has no credit licence and
   * no disbursement partner — a permanent nav slot for it advertised a service
   * that does not exist. "Điểm tín dụng" stays: it describes the customer's own
   * profile from their own data and promises nothing about who will lend
   * against it. The route survives for when there is a partner.
   */
  const navGroups = [
    {
      label: null, // Tổng quan stands alone above the groups — it is the home.
      items: [{ icon: LayoutDashboard, label: t('sidebar.overview'), path: '/dashboard' }],
    },
    {
      label: t('sidebar.groupDaily'),
      items: [
        { icon: FileText, label: t('sidebar.invoices'), path: '/dashboard/invoices' },
        { icon: Users, label: 'Khách hàng', path: '/dashboard/clients' },
        { icon: BarChart3, label: t('sidebar.reports'), path: '/dashboard/reports' },
        { icon: ShieldCheck, label: t('sidebar.creditScore'), path: '/dashboard/credit' },
      ],
    },
    {
      label: t('sidebar.groupConnect'),
      items: [
        { icon: Fingerprint, label: t('sidebar.fintechHub'), path: '/dashboard/fintech' },
        { icon: HandCoins, label: 'Vay ngang hàng', path: '/dashboard/p2p' },
        { icon: Leaf, label: t('sidebar.carbon'), path: '/dashboard/carbon' },
      ],
    },
    {
      label: t('sidebar.groupMore'),
      items: [
        { icon: GraduationCap, label: t('sidebar.learn'), path: '/dashboard/learn' },
        { icon: Settings, label: t('sidebar.settings'), path: '/dashboard/settings' },
      ],
    },
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

      <nav className="flex-1 py-4 px-2 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? 'root'} className={gi === 0 ? '' : 'mt-5'}>
            {/* When collapsed there is no room for a word, so the grouping is
                carried by a hairline instead — the rhythm survives, the label
                does not need to. */}
            {group.label &&
              (collapsed ? (
                <div className="mx-3 mb-2 border-t border-border/60" />
              ) : (
                <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
              ))}
            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/dashboard'}
                  title={collapsed ? item.label : undefined}
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
            </div>
          </div>
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
