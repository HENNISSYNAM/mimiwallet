import { motion } from 'framer-motion';
import { Wallet, TrendingUp, FileText, ShieldCheck, ArrowUpRight, ArrowDownRight, AlertTriangle, Lightbulb, Bell, ArrowRight } from 'lucide-react';
import M2MDashboardWidget from '@/components/m2m/M2MDashboardWidget';
import { formatVND, formatVNDShort } from '@/lib/formatters';
import { companyProfile, cashFlowData, transactions, miniChartData } from '@/lib/mockData';
import { useCountUp } from '@/hooks/useCountUp';
import { useNavigate } from 'react-router-dom';
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
      <p className="font-mono text-2xl font-bold text-foreground tracking-tight">{value}</p>
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'income' ? 'Thu' : p.name === 'expense' ? 'Chi' : 'Ròng'}: {formatVNDShort(p.value)}
        </p>
      ))}
    </div>
  );
};

const statusColors: Record<string, string> = {
  'Đã thu': 'text-kapiva-green',
  'Đã chi': 'text-kapiva-red',
  'Đã nhận': 'text-primary',
};

export default function DashboardOverview() {
  const now = new Date();
  const navigate = useNavigate();
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Greeting */}
      <motion.div variants={fadeUp}>
        <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Xin chào, Anh Minh 👋</h2>
        <p className="text-sm text-muted-foreground mt-1">{dateStr} · Cập nhật lần cuối: 14:32</p>
      </motion.div>

      {/* KPI Row */}
      <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Wallet} label="Tổng số dư" value="₫2,847,500,000" sub="+₫124M so với hôm qua">
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
        <KPICard icon={TrendingUp} label="Doanh thu tháng này" value="₫8,320,000,000" sub="83% target ₫10B">
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Tiến độ</span>
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
        <KPICard icon={FileText} label="Hóa đơn chờ thanh toán" value="₫1,847,000,000" sub="3 hóa đơn sắp đến hạn" subColor="text-kapiva-amber">
          <p className="text-xs text-muted-foreground mt-1">14 hóa đơn đang hoạt động</p>
        </KPICard>
        <KPICard icon={ShieldCheck} label="MIMI Credit Score" value="" sub="Hạng A — ↑ +12 điểm">
          <div className="flex items-center gap-4 -mt-1">
            <CreditScoreRing />
            <div>
              <p className="font-mono text-lg font-bold text-foreground">782</p>
              <p className="text-xs text-kapiva-green font-medium">Rất tốt</p>
            </div>
          </div>
        </KPICard>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={stagger} className="grid lg:grid-cols-5 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-3 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-foreground text-lg">Dòng tiền</h3>
            <div className="flex gap-1 bg-accent/50 rounded-xl p-1">
              {['7N', '30N', '90N', '12T'].map((p, i) => (
                <button key={p} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${i === 1 ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{p}</button>
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
              <p className="text-sm text-foreground leading-relaxed">Tháng 4 có nguy cơ thiếu hụt <span className="font-mono font-semibold text-kapiva-amber">₫340M</span> do 2 khoản thanh toán lớn trùng nhau.</p>
              <button className="text-xs text-primary mt-2 hover:underline font-medium flex items-center gap-1">
                Xem giải pháp <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2">🧠 Insights từ AI</h3>
          {[
            { icon: AlertTriangle, color: 'text-kapiva-red', bgColor: 'bg-kapiva-red/5 border-kapiva-red/10', badge: '⚠️ Cảnh báo', msg: 'Tuần tới bạn có 3 khoản chi tổng ₫420M. Số dư hiện tại có thể không đủ.', cta: 'Ứng vốn ngay' },
            { icon: Lightbulb, color: 'text-primary', bgColor: 'bg-primary/5 border-primary/10', badge: '💡 Cơ hội', msg: 'Doanh thu T3 tăng 23%. Đây là thời điểm tốt để đề xuất tăng hạn mức vay.', cta: 'Xem hạn mức' },
            { icon: Bell, color: 'text-kapiva-amber', bgColor: 'bg-kapiva-amber/5 border-kapiva-amber/10', badge: '🔔 Nhắc nhở', msg: 'Khách hàng ABC Corp chưa thanh toán hóa đơn #INV-2841 (quá hạn 8 ngày)', cta: 'Gửi nhắc nhở' },
          ].map((insight, i) => (
            <div key={i} className={`${insight.bgColor} border rounded-xl p-4 transition-all hover:shadow-sm`}>
              <p className="text-xs font-semibold mb-1.5"><span className={insight.color}>{insight.badge}</span></p>
              <p className="text-sm text-muted-foreground leading-relaxed">{insight.msg}</p>
              <button className="text-xs text-primary mt-2 hover:underline font-medium flex items-center gap-1">
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
            <h3 className="font-display font-bold text-foreground text-lg">Giao dịch gần đây</h3>
            <button onClick={() => {}} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={10} />
            </button>
          </div>
          <div className="space-y-1">
            {transactions.slice(0, 8).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.04 }}
                className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-xl hover:bg-accent/40 transition-colors group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-bold text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  {t.merchantName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{t.merchantName}</p>
                  <p className="text-xs text-muted-foreground">{t.category}</p>
                </div>
                <div className="text-right">
                  <p className={`font-mono text-sm font-semibold ${t.amount > 0 ? 'text-positive' : 'text-negative'}`}>
                    {t.amount > 0 ? '+' : ''}{formatVNDShort(t.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t.date.slice(5)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-bold text-foreground text-lg">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🧾', label: 'Tạo hóa đơn mới', path: '/dashboard/invoices' },
              { icon: '💰', label: 'Ứng vốn hóa đơn', path: '/dashboard/invoices' },
              { icon: '📊', label: 'Xem báo cáo', path: '/dashboard/reports' },
              { icon: '💳', label: 'Đăng ký vay vốn', path: '/dashboard/loans' },
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
