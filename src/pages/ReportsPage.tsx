import { motion } from 'framer-motion';
import { revenueExpenseData, invoiceAgingData, expenseBreakdown } from '@/lib/mockData';
import { formatVNDShort } from '@/lib/formatters';
import { InsightSpark } from '@/components/illustrations/BrandIcons';
import { useState } from 'react';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, Line, ComposedChart,
} from 'recharts';
import { Download, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

function exportReportCsv() {
  const header = ['month', 'revenue', 'expense', 'profit'];
  const lines = [header.join(',')].concat(
    revenueExpenseData.map((r: any) => [r.month, r.revenue, r.expense, r.profit].join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bao-cao-doanh-thu-chi-phi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>{p.name}: {formatVNDShort(p.value)}</p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState(2);
  const periods = t('fin.reports.periods', { returnObjects: true }) as Record<string, string>;
  const periodOrder = ['today', 'sevenDays', 'thisMonth', 'thisQuarter', 'thisYear'] as const;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">{t('fin.reports.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('fin.reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-accent/30 rounded-xl p-1">
            {periodOrder.map((key, i) => (
              <button
                key={key}
                onClick={() => setDateRange(i)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  i === dateRange ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {periods[key]}
              </button>
            ))}
          </div>
          <button onClick={exportReportCsv} className="bg-card/60 border border-border/60 px-3 py-1.5 rounded-xl text-xs text-muted-foreground flex items-center gap-1.5 hover:border-primary/20 transition-all">
            <Download size={12} /> {t('fin.reports.export')}
          </button>
        </div>
      </motion.div>

      {/* Revenue vs Expenses */}
      <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg mb-6">{t('fin.reports.revenueExpense.title')}</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={revenueExpenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border)/0.3)" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12, fontFamily: 'Inter, -apple-system, sans-serif' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10, fontFamily: 'JetBrains Mono, SF Mono, monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVNDShort(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" name={t('fin.reports.revenueExpense.revenue')} fill="hsl(var(--blue-500))" radius={[6, 6, 0, 0]} barSize={18} />
              <Bar dataKey="expense" name={t('fin.reports.revenueExpense.expense')} fill="hsl(var(--bg-card-hover))" radius={[6, 6, 0, 0]} barSize={18} />
              <Line type="monotone" dataKey="profit" name={t('fin.reports.revenueExpense.profit')} stroke="hsl(var(--green-500))" strokeWidth={2} dot={{ fill: 'hsl(var(--green-500))', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={stagger} className="grid lg:grid-cols-2 gap-6">
        {/* Invoice Aging */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">{t('fin.reports.invoiceAging.title')}</h3>
          <div className="space-y-5">
            {invoiceAgingData.map((d) => (
              <div key={d.range}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">{d.range}</span>
                  <span className="font-mono text-foreground font-semibold">{formatVNDShort(d.amount)}</span>
                </div>
                <div className="w-full bg-accent rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.amount / 800_000_000) * 100}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] as const }}
                    className="h-3 rounded-full"
                    style={{ background: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">{t('fin.reports.expenseBreakdown.title')}</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} strokeWidth={0}>
                  {expenseBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </motion.div>

      {/* AI Summary */}
      <motion.div variants={fadeUp} className="bg-gradient-to-r from-primary/5 to-mimi-green/5 border border-primary/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2 mb-4"><InsightSpark size={19} className="text-primary" /> {t('fin.reports.aiSummary.title')}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {t('fin.reports.aiSummary.body')}
        </p>
        <div className="space-y-2 mb-4">
          {(t('fin.reports.aiSummary.recommendations', { returnObjects: true }) as string[]).map((rec, i) => (
            <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-primary text-[10px] font-bold">{i + 1}</span>
              </div>
              <span>{rec}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => toast(t('fin.reports.aiSummary.toastComingSoon'))}
          className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
        >
          {t('fin.reports.aiSummary.viewFullReport')} <ArrowRight size={10} />
        </button>
      </motion.div>
    </motion.div>
  );
}
