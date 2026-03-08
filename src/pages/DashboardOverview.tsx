import { motion } from 'framer-motion';
import { Wallet, TrendingUp, FileText, ShieldCheck, ArrowUpRight, ArrowDownRight, AlertTriangle, Lightbulb, Bell } from 'lucide-react';
import { formatVND, formatVNDShort } from '@/lib/formatters';
import { companyProfile, cashFlowData, transactions, miniChartData } from '@/lib/mockData';
import { useCountUp } from '@/hooks/useCountUp';
import { AreaChart, Area, BarChart, Bar, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] },
});

function KPICard({ icon: Icon, label, value, sub, subColor = 'text-kapiva-green', delay, children }: { icon: any; label: string; value: string; sub: string; subColor?: string; delay: number; children?: React.ReactNode }) {
  return (
    <motion.div {...fadeUp(delay)} className="card-base card-hover p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon size={16} className="text-primary" />
        </div>
      </div>
      <p className="font-mono text-2xl font-bold text-foreground">{value}</p>
      <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
      {children}
    </motion.div>
  );
}

function CreditScoreRing() {
  const circumference = 2 * Math.PI * 38;
  const filled = (782 / 1000) * circumference;
  return (
    <svg viewBox="0 0 100 100" className="w-14 h-14">
      <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(220,25%,18%)" strokeWidth="6" />
      <circle
        cx="50" cy="50" r="38" fill="none"
        stroke="url(#scoreGrad)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference - filled}
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(225,100%,57%)" />
          <stop offset="100%" stopColor="hsl(158,100%,43%)" />
        </linearGradient>
      </defs>
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="hsl(214,100%,97%)" fontFamily="Syne" fontWeight="800" fontSize="14">782</text>
    </svg>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-base p-3 text-xs space-y-1">
      <p className="text-muted-foreground">{label}</p>
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
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)}>
        <h2 className="text-xl font-display font-bold text-foreground">Xin chào, Anh Minh 👋</h2>
        <p className="text-sm text-muted-foreground">{dateStr} | Cập nhật lần cuối: 14:32</p>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Wallet} label="Tổng số dư" value="₫2,847,500,000" sub="+₫124M so với hôm qua" delay={0.05}>
          <div className="h-10 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={miniChartData}>
                <defs>
                  <linearGradient id="kpiGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(158,100%,43%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(158,100%,43%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="hsl(158,100%,43%)" fill="url(#kpiGreen)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </KPICard>
        <KPICard icon={TrendingUp} label="Doanh thu tháng này" value="₫8,320,000,000" sub="83% target ₫10B" delay={0.1}>
          <div className="w-full bg-accent rounded-full h-1.5 mt-2">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: '83%' }} />
          </div>
        </KPICard>
        <KPICard icon={FileText} label="Hóa đơn chờ thanh toán" value="₫1,847,000,000" sub="3 hóa đơn sắp đến hạn" subColor="text-kapiva-amber" delay={0.15} />
        <KPICard icon={ShieldCheck} label="KAPIVA Credit Score" value="" sub="Hạng A — ↑ +12 điểm" delay={0.2}>
          <div className="flex items-center gap-3 -mt-1">
            <CreditScoreRing />
            <div>
              <p className="font-mono text-lg font-bold text-foreground">782</p>
              <p className="text-xs text-kapiva-green">Rất tốt</p>
            </div>
          </div>
        </KPICard>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-5 gap-4">
        <motion.div {...fadeUp(0.25)} className="lg:col-span-3 card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground">Dòng tiền</h3>
            <div className="flex gap-1">
              {['7N', '30N', '90N', '12T'].map((p, i) => (
                <button key={p} className={`text-xs px-2.5 py-1 rounded-md transition-colors ${i === 1 ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsla(220,20%,18%,0.5)" />
                <XAxis dataKey="month" tick={{ fill: 'hsl(215,19%,62%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215,19%,62%)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="hsla(0,0%,100%,0.1)" strokeDasharray="3 3" />
                <Bar dataKey="income" fill="hsl(225,100%,57%)" radius={[4, 4, 0, 0]} barSize={16} name="income" />
                <Bar dataKey="expense" fill="hsl(220,25%,25%)" radius={[4, 4, 0, 0]} barSize={16} name="expense" />
                <Area type="monotone" dataKey="net" stroke="hsl(158,100%,43%)" fill="hsla(158,100%,43%,0.1)" strokeWidth={2} name="net" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
            <span className="text-sm">🧠</span>
            <div>
              <p className="text-xs text-foreground">AI: Tháng 4 có nguy cơ thiếu hụt ₫340M do 2 khoản thanh toán lớn trùng nhau.</p>
              <button className="text-xs text-primary mt-1 hover:underline">→ Xem giải pháp</button>
            </div>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.3)} className="lg:col-span-2 card-base p-5 space-y-4">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">🧠 Insights từ AI</h3>
          {[
            { icon: AlertTriangle, color: 'text-kapiva-red', badge: '⚠️ Cảnh báo', msg: 'Tuần tới bạn có 3 khoản chi tổng ₫420M. Số dư hiện tại có thể không đủ.', cta: '→ Ứng vốn ngay' },
            { icon: Lightbulb, color: 'text-primary', badge: '💡 Cơ hội', msg: 'Doanh thu T3 tăng 23%. Đây là thời điểm tốt để đề xuất tăng hạn mức vay.', cta: '→ Xem hạn mức' },
            { icon: Bell, color: 'text-kapiva-amber', badge: '🔔 Nhắc nhở', msg: 'Khách hàng ABC Corp chưa thanh toán hóa đơn #INV-2841 (quá hạn 8 ngày)', cta: '→ Gửi nhắc nhở' },
          ].map((insight, i) => (
            <div key={i} className="bg-accent rounded-lg p-3">
              <p className="text-xs font-semibold mb-1"><span className={insight.color}>{insight.badge}</span></p>
              <p className="text-xs text-muted-foreground leading-relaxed">{insight.msg}</p>
              <button className="text-xs text-primary mt-1.5 hover:underline">{insight.cta}</button>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Transactions + Quick Actions */}
      <div className="grid lg:grid-cols-5 gap-4">
        <motion.div {...fadeUp(0.35)} className="lg:col-span-3 card-base p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-foreground">Giao dịch gần đây</h3>
            <button className="text-xs text-primary hover:underline">Xem tất cả →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {transactions.slice(0, 8).map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-foreground">
                        {t.merchantName[0]}
                      </div>
                    </td>
                    <td className="py-2.5">
                      <p className="text-foreground text-sm">{t.merchantName}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </td>
                    <td className={`py-2.5 font-mono text-sm text-right ${t.amount > 0 ? 'text-positive' : 'text-negative'}`}>
                      {t.amount > 0 ? '+' : ''}{formatVNDShort(t.amount)}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground text-right pl-4">
                      {t.date.slice(5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div {...fadeUp(0.4)} className="lg:col-span-2 space-y-3">
          <h3 className="font-display font-bold text-foreground">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🧾', label: 'Tạo hóa đơn mới', path: '/dashboard/invoices' },
              { icon: '💰', label: 'Ứng vốn hóa đơn', path: '/dashboard/invoices' },
              { icon: '📊', label: 'Xem báo cáo', path: '/dashboard/reports' },
              { icon: '💳', label: 'Đăng ký vay vốn', path: '/dashboard/loans' },
            ].map((a) => (
              <button key={a.label} className="card-base card-hover p-4 text-center">
                <div className="text-2xl mb-2">{a.icon}</div>
                <p className="text-xs text-foreground">{a.label}</p>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
