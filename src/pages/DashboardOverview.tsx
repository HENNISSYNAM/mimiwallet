import { motion } from 'framer-motion';
import { Wallet, TrendingUp, FileText, ShieldCheck, ArrowUpRight, ArrowDownRight, AlertTriangle, Lightbulb, Bell, ArrowRight } from 'lucide-react';
import M2MDashboardWidget from '@/components/m2m/M2MDashboardWidget';
import { formatVND, formatVNDShort } from '@/lib/formatters';
import { companyProfile, cashFlowData, transactions, miniChartData } from '@/lib/mockData';
import { useCountUp } from '@/hooks/useCountUp';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { toast } from 'sonner';
import { AreaChart, Area, ComposedChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

function KPICard({ icon: Icon, label, value, sub, subColor = 'text-mimi-green', children }: {
  icon: any; label: string; value: string; sub: string; subColor?: string; children?: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} className="group bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5 hover:border-primary/20 hover:shadow-[0_8px_32px_hsla(var(--blue-500)/0.06)] transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
          <Icon size={16} className="text-primary" />
        </div>
      </div>
      <p className="font-mono text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">{value}</p>
      <p className={`text-xs mt-1.5 ${subColor} font-medium`}>{sub}</p>
      {children}
    </motion.div>
  );
}

function CreditScoreRing() {
  const circumference = 2 * Math.PI * 38;
  const filled = (782 / 1000) * circumference;
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16">
      <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
      <circle
        cx="50" cy="50" r="38" fill="none"
        stroke="url(#scoreGrad)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference - filled}
        transform="rotate(-90 50 50)"
        className="transition-all duration-1000 ease-out"
      />
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--blue-500))" />
          <stop offset="100%" stopColor="hsl(var(--green-500))" />
        </linearGradient>
      </defs>
      <text x="50" y="48" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--text-primary))" fontFamily="Inter, -apple-system, sans-serif" fontWeight="800" fontSize="15">782</text>
      <text x="50" y="62" textAnchor="middle" fill="hsl(var(--text-secondary))" fontFamily="Inter, -apple-system, sans-serif" fontSize="7">/ 1000</text>
    </svg>
  );
}

const statusColors: Record<string, string> = {
  'Đã thu': 'text-mimi-green',
  'Đã chi': 'text-mimi-red',
  'Đã nhận': 'text-primary',
};

export default function DashboardOverview() {
  const now = new Date();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selectedRange, setSelectedRange] = useState(1);
  const dateStr = now.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
        <p className="text-muted-foreground font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name === 'income' ? t('dashboard.income') : p.name === 'expense' ? t('dashboard.expense') : t('dashboard.net')}: {formatVNDShort(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Greeting */}
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">{t('dashboard.greeting')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{dateStr} · {t('dashboard.lastUpdate')}</p>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Wallet} label={t('dashboard.totalBalance')} value="₫2.85 tỷ" sub="+₫124M so với hôm qua">
          <div className="h-10 mt-3 -mx-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={miniChartData}>
                <defs>
                  <linearGradient id="kpiGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--green-500))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--green-500))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="hsl(var(--green-500))" fill="url(#kpiGreen)" strokeWidth={1.5} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </KPICard>
        <KPICard icon={TrendingUp} label={t('dashboard.monthlyRevenue')} value="₫8.32 tỷ" sub="83% target ₫10 tỷ">
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>{t('dashboard.progress')}</span>
              <span className="font-mono">83%</span>
            </div>
            <div className="w-full bg-accent rounded-full h-1.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '83%' }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
                className="bg-primary h-1.5 rounded-full"
              />
            </div>
          </div>
        </KPICard>
        <KPICard icon={FileText} label={t('dashboard.pendingInvoices')} value="₫1.85 tỷ" sub={`3 ${t('dashboard.invoicesDue')}`} subColor="text-mimi-amber">
          <p className="text-xs text-muted-foreground mt-1">14 {t('dashboard.invoicesActive')}</p>
        </KPICard>
        <KPICard icon={ShieldCheck} label={t('dashboard.creditScoreLabel')} value="" sub={t('dashboard.rankA')}>
          <div className="flex items-center gap-4 -mt-1">
            <CreditScoreRing />
            <div>
              <p className="font-mono text-lg font-bold text-foreground">782</p>
              <p className="text-xs text-mimi-green font-medium">{t('dashboard.veryGood')}</p>
            </div>
          </div>
        </KPICard>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={stagger} className="grid lg:grid-cols-5 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-3 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-foreground text-lg">{t('dashboard.cashFlowTitle')}</h3>
            <div className="flex gap-1 bg-accent/50 rounded-xl p-1">
              {['7N', '30N', '90N', '12T'].map((p, i) => (
                <button
                  key={p}
                  onClick={() => setSelectedRange(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${i === selectedRange ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border)/0.3)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12, fontFamily: 'Inter, -apple-system, sans-serif' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10, fontFamily: 'JetBrains Mono, SF Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsla(0,0%,100%,0.06)" strokeDasharray="3 3" />
                <Bar dataKey="income" fill="hsl(var(--blue-500))" radius={[6, 6, 0, 0]} barSize={14} name="income" />
                <Bar dataKey="expense" fill="hsl(var(--bg-card-hover))" radius={[6, 6, 0, 0]} barSize={14} name="expense" />
                <Area type="monotone" dataKey="net" stroke="hsl(var(--green-500))" fill="hsla(var(--green-500)/0.08)" strokeWidth={2} name="net" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-base mt-0.5">🧠</span>
            <div className="flex-1">
              <p className="text-sm text-foreground leading-relaxed">Tháng 4 có nguy cơ thiếu hụt <span className="font-mono font-semibold text-mimi-amber">₫340M</span> do 2 khoản thanh toán lớn trùng nhau.</p>
              <button onClick={() => navigate('/dashboard/loans')} className="text-xs text-primary mt-2 hover:underline font-medium flex items-center gap-1">
                {t('dashboard.viewSolution')} <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2">{t('dashboard.aiInsights')}</h3>
          {[
            { icon: AlertTriangle, color: 'text-mimi-red', bgColor: 'bg-mimi-red/5 border-mimi-red/10', badge: t('dashboard.warning'), msg: 'Tuần tới bạn có 3 khoản chi tổng ₫420M. Số dư hiện tại có thể không đủ.', cta: 'Ứng vốn ngay', action: () => navigate('/dashboard/invoices') },
            { icon: Lightbulb, color: 'text-primary', bgColor: 'bg-primary/5 border-primary/10', badge: t('dashboard.opportunity'), msg: 'Doanh thu T3 tăng 23%. Đây là thời điểm tốt để đề xuất tăng hạn mức vay.', cta: 'Xem hạn mức', action: () => navigate('/dashboard/loans') },
            { icon: Bell, color: 'text-mimi-amber', bgColor: 'bg-mimi-amber/5 border-mimi-amber/10', badge: t('dashboard.reminder'), msg: 'Khách hàng ABC Corp chưa thanh toán hóa đơn #INV-2841 (quá hạn 8 ngày)', cta: 'Gửi nhắc nhở', action: () => toast('Tính năng gửi nhắc nhở tự động đang được phát triển, sẽ ra mắt sớm') },
          ].map((insight, i) => (
            <div key={i} className={`${insight.bgColor} border rounded-xl p-4 transition-all hover:shadow-sm`}>
              <p className="text-xs font-semibold mb-1.5"><span className={insight.color}>{insight.badge}</span></p>
              <p className="text-sm text-muted-foreground leading-relaxed">{insight.msg}</p>
              <button onClick={insight.action} className="text-xs text-primary mt-2 hover:underline font-medium flex items-center gap-1">
                {insight.cta} <ArrowRight size={10} />
              </button>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Transactions + Quick Actions */}
      <motion.div variants={stagger} className="grid lg:grid-cols-5 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-3 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-foreground text-lg">{t('dashboard.recentTx')}</h3>
            <button onClick={() => navigate('/dashboard/reports')} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
              {t('dashboard.viewAll')} <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-1">
            {transactions.slice(0, 8).map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-xl hover:bg-accent/40 transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-bold text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {tx.merchantName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{tx.merchantName}</p>
                  <p className="text-xs text-muted-foreground">{tx.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-semibold ${tx.amount > 0 ? 'text-positive' : 'text-negative'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatVNDShort(tx.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{tx.date.slice(5)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-bold text-foreground text-lg">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🧾', label: t('dashboard.createInvoice'), path: '/dashboard/invoices' },
              { icon: '💰', label: t('dashboard.advanceInvoice'), path: '/dashboard/invoices' },
              { icon: '📊', label: t('dashboard.viewReports'), path: '/dashboard/reports' },
              { icon: '💳', label: t('dashboard.applyLoan'), path: '/dashboard/loans' },
            ].map((a) => (
              <motion.button
                key={a.label}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(a.path)}
                className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5 text-center hover:border-primary/20 hover:shadow-[0_8px_24px_hsla(var(--blue-500)/0.06)] transition-all duration-300"
              >
                <div className="text-3xl mb-3">{a.icon}</div>
                <p className="text-sm text-foreground font-medium">{a.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* M2M Widget */}
        <M2MDashboardWidget />
      </motion.div>
    </motion.div>
  );
}
