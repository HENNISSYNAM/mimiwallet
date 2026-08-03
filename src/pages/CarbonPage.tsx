import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, RefreshCw, Info } from 'lucide-react';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { CarbonLeaf, InsightSpark } from '@/components/illustrations/BrandIcons';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * Carbon footprint, estimated from the company's own transactions.
 *
 * Every figure here is a spend-based estimate, and the page says so in the open
 * rather than in a footnote. The landing page used to advertise carbon tracking
 * with invented tonnage and no feature behind it; the fix was to compute it for
 * real and be exact about what "computed" means.
 */

interface CategoryRow {
  category: string;
  spend: number;
  emissions: number;
  factor: number;
}

interface MonthRow {
  month: string;
  emissions: number;
}

interface Footprint {
  totalEmissions: number;
  totalSpend: number;
  totalRevenue: number;
  intensityPerRevenue: number;
  byCategory: CategoryRow[];
  byMonth: MonthRow[];
  tips: { category: string; share: number; tip: string }[];
  transactionsAnalysed: number;
  monthsAnalysed: number;
  method: string;
  factorSource: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

/** kg reads badly past a tonne; switch units rather than print six digits. */
function formatCo2(kg: number, tonUnit: string, kgUnit: string): { value: string; unit: string } {
  if (kg >= 1000) return { value: (kg / 1000).toFixed(2), unit: tonUnit };
  return { value: Math.round(kg).toLocaleString('vi-VN'), unit: kgUnit };
}

export default function CarbonPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Footprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async (notify = false) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('carbon-footprint');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setData(data as Footprint);
      if (notify) toast.success(t('pg.carbon.recomputedToast'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('pg.carbon.computeErrorFallback'));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    compute();
  }, [compute]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  const total = data ? formatCo2(data.totalEmissions, t('pg.carbon.tonUnit'), t('pg.carbon.kgUnit')) : null;
  const chartData = (data?.byMonth ?? []).map((m) => ({
    month: m.month.slice(5), // MM
    emissions: Math.round(m.emissions),
  }));

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={fadeUp} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl bg-mimi-green/10 flex items-center justify-center text-mimi-green">
              <CarbonLeaf size={19} />
            </span>
            <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
              {t('pg.carbon.title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {t('pg.carbon.subtitle', { months: data?.monthsAnalysed ?? 12 })}
          </p>
        </div>
        <button
          onClick={() => compute(true)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold pressable disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {t('pg.carbon.recompute')}
        </button>
      </motion.div>

      {error && (
        <motion.p variants={fadeUp} className="text-sm text-mimi-red">
          {error}
        </motion.p>
      )}

      {data && (
        <>
          {/* Stated up front, not buried: these are estimates, and the method is named. */}
          <motion.div
            variants={fadeUp}
            className="flex items-start gap-2.5 rounded-2xl border hairline bg-accent/40 p-4"
          >
            <Info size={15} className="text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">{data.method}</p>
              <p className="mt-1">
                {t('pg.carbon.methodNote', { factorSource: data.factorSource })}
              </p>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-card border hairline rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm text-muted-foreground">{t('pg.carbon.totalEmissions')}</p>
              <p className="money text-2xl font-bold text-foreground mt-1.5">
                {total?.value} <span className="text-base text-muted-foreground">{total?.unit}</span>
              </p>
            </div>
            <div className="bg-card border hairline rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm text-muted-foreground">{t('pg.carbon.intensity')}</p>
              <p className="money text-2xl font-bold text-foreground mt-1.5">
                {data.intensityPerRevenue}
                <span className="text-base text-muted-foreground"> {t('pg.carbon.intensityUnit')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{t('pg.carbon.intensityNote')}</p>
            </div>
            <div className="bg-card border hairline rounded-2xl p-5 col-span-2 lg:col-span-1" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className="text-sm text-muted-foreground">{t('pg.carbon.dataAnalysed')}</p>
              <p className="money text-2xl font-bold text-foreground mt-1.5">
                {data.transactionsAnalysed}
                <span className="text-base text-muted-foreground"> {t('pg.carbon.transactionsUnit')}</span>
              </p>
            </div>
          </motion.div>

          {chartData.length > 0 && (
            <motion.div variants={fadeUp} className="bg-card border hairline rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="font-display font-bold text-foreground mb-4">{t('pg.carbon.byMonth')}</h3>
              <div className="h-56 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--text-muted))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--text-muted))" />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [`${v.toLocaleString('vi-VN')} kg CO₂e`, t('pg.carbon.chartEmissionsLabel')]}
                    />
                    <Bar dataKey="emissions" fill="hsl(var(--green-500))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}

          {data.byCategory.length > 0 && (
            <motion.div variants={fadeUp} className="bg-card border hairline rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="font-display font-bold text-foreground mb-4">{t('pg.carbon.byCategory')}</h3>
              <div className="space-y-3">
                {data.byCategory.map((c) => {
                  const share = data.totalEmissions > 0 ? (c.emissions / data.totalEmissions) * 100 : 0;
                  const f = formatCo2(c.emissions, t('pg.carbon.tonUnit'), t('pg.carbon.kgUnit'));
                  return (
                    <div key={c.category}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-foreground truncate">{c.category}</span>
                        <span className="money text-sm text-muted-foreground shrink-0">
                          {f.value} {f.unit} · {share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-mimi-green"
                          initial={{ width: 0 }}
                          animate={{ width: `${share}%` }}
                          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {data.tips.length > 0 && (
            <motion.div variants={fadeUp} className="bg-card border hairline rounded-2xl p-5" style={{ boxShadow: 'var(--shadow-card)' }}>
              <h3 className="font-display font-bold text-foreground mb-1 flex items-center gap-2">
                <InsightSpark size={18} className="text-primary" /> {t('pg.carbon.tipsTitle')}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t('pg.carbon.tipsSubtitle')}
              </p>
              <div className="space-y-3">
                {data.tips.map((tip) => (
                  <div key={tip.category} className="rounded-xl bg-mimi-green/5 border border-mimi-green/10 p-3">
                    <p className="text-sm font-semibold text-foreground">
                      {tip.category} <span className="text-mimi-green">{t('pg.carbon.tipShare', { share: tip.share })}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
