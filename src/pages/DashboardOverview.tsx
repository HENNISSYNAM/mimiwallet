import { motion } from 'framer-motion';
import MimiCat from '@/components/brand/MimiCat';
import { tamTrang } from '@/lib/mimiTamTrang';
import { Wallet, TrendingUp, FileText, ShieldCheck, AlertTriangle, Lightbulb, Bell, ArrowRight, Loader2, Link2 } from 'lucide-react';
import M2MDashboardWidget from '@/components/m2m/M2MDashboardWidget';
import NewsAndLawPanel from '@/components/NewsAndLawPanel';
import { DailyBriefCard } from '@/components/DailyBriefCard';
import WelcomeCards from '@/components/onboarding/WelcomeCards';
import BatDauTuDau from '@/components/onboarding/BatDauTuDau';
import { formatVNDShort } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ThresholdClock } from '@/components/fintech/ThresholdClock';
import { InsightSpark, InvoiceDoc, CapitalVault, CashflowChart, LearnCap } from '@/components/illustrations/BrandIcons';
import { AreaChart, Area, ComposedChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';

/**
 * The overview screen, rebuilt on the company's own data.
 *
 * Every figure here used to be a constant from src/lib/mockData.ts: the
 * greeting name, a 2.85 tỷ balance, 8.32 tỷ of revenue against a 10 tỷ
 * "target", a 701 credit score, and three AI insights naming a customer and an
 * invoice number that do not exist. Everyone who signed in — including someone
 * arriving with their own Google account for the first time — saw the same
 * invented numbers presented as theirs. For a product whose whole claim is that
 * it reads your real books, that is the worst possible thing to show.
 *
 * Two rules follow from that, and they shape the whole file:
 *
 *  1. Nothing is displayed unless it can be computed from this company's rows.
 *     The old "Tổng số dư" tile is gone: no table in this schema stores a bank
 *     balance, so it could only ever have been fiction. Net cash flow over a
 *     window is real arithmetic on real transactions, so that is what the tile
 *     shows now.
 *  2. Absence is stated, not filled in. An account with no transactions gets
 *     "chưa có giao dịch" and a link to connect a bank — never a zero dressed
 *     up as a measurement, and never a placeholder that looks like data.
 */

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

interface Tx {
  id: string;
  is_synthetic?: boolean;
  amount: number;
  type: string;
  category: string | null;
  merchant_name: string | null;
  transaction_date: string;
}
interface Invoice { id: string; total: number; status: string; due_date: string; client_name: string; invoice_number: string; }
interface Snapshot { score: number; credit_limit: number; computed_at: string; }

/** Windows offered by the range selector, in days. 12T is a year. */
const RANGES = [
  { label: '7N', days: 7 },
  { label: '30N', days: 30 },
  { label: '90N', days: 90 },
  { label: '12T', days: 365 },
];

/**
 * Direction comes from `type`, magnitude from `amount`.
 *
 * The bank mapper stores a positive magnitude and puts the direction in `type`
 * (see _shared/bank/bankhub-map.ts), but CSV imports and older mock rows used a
 * negative amount for money out. Reading the sign here as well as the type
 * would double-count that negative and file an expense as income.
 */
const isIncome = (t: Tx) => t.type === 'income';
const magnitude = (t: Tx) => Math.abs(Number(t.amount) || 0);

function iso(d: Date) { return d.toISOString().slice(0, 10); }

/**
 * `primary` is the one card on the screen allowed to be the loudest.
 *
 * All four KPIs used to share `text-xl sm:text-2xl`, which meant none of them
 * won: four equally-sized numbers make the eye pick by position rather than by
 * importance. The screen's job is to answer one question first — is money
 * coming in or going out — so net cash flow gets its own full-width row and a
 * bigger face, and the other three sit below it a rank down. See docs/THIET_KE.md,
 * "Luật 1 — Mỗi màn hình có đúng một số chính".
 */
function KPICard({ icon: Icon, label, value, sub, subColor = 'text-mimi-green', muted, primary, children }: {
  icon: any; label: string; value: string; sub?: string; subColor?: string; muted?: boolean; primary?: boolean; children?: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} className={`group bg-card/60 backdrop-blur-sm border rounded-2xl transition-all duration-300 hover:shadow-[0_8px_32px_hsla(var(--blue-500)/0.06)] ${
      primary ? 'border-primary/20 p-6 hover:border-primary/30' : 'border-border/60 p-5 hover:border-primary/20'
    }`}>
      <div className={`flex items-center justify-between ${primary ? 'mb-3' : 'mb-4'}`}>
        <span className={`text-muted-foreground font-medium ${primary ? 'text-sm' : 'text-xs sm:text-sm'}`}>{label}</span>
        <div className={`rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors ${primary ? 'w-10 h-10' : 'w-8 h-8'}`}>
          <Icon size={primary ? 18 : 15} className="text-primary" />
        </div>
      </div>
      <p className={`money font-bold tracking-tight truncate ${
        primary ? 'text-3xl sm:text-[40px] leading-tight' : 'text-lg sm:text-xl'
      } ${muted ? 'text-muted-foreground' : 'text-foreground'}`}>{value}</p>
      {sub && <p className={`mt-1.5 font-medium ${primary ? 'text-sm' : 'text-xs'} ${subColor}`}>{sub}</p>}
      {children}
    </motion.div>
  );
}

function CreditScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 38;
  const filled = (Math.max(0, Math.min(850, score)) / 850) * circumference;
  return (
    <svg viewBox="0 0 100 100" className="w-16 h-16">
      <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="url(#scoreGrad)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={circumference - filled}
        transform="rotate(-90 50 50)" className="transition-all duration-1000 ease-out" />
      <defs>
        <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--blue-500))" />
          <stop offset="100%" stopColor="hsl(var(--green-500))" />
        </linearGradient>
      </defs>
      <text x="50" y="48" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--text-primary))" fontFamily="Inter, sans-serif" fontWeight="800" fontSize="15">{score}</text>
      <text x="50" y="62" textAnchor="middle" fill="hsl(var(--text-secondary))" fontFamily="Inter, sans-serif" fontSize="7">/ 850</text>
    </svg>
  );
}

/** Shown wherever a panel has nothing truthful to put in it. */
function Empty({ text, cta, onCta }: { text: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">{text}</p>
      {cta && (
        <button onClick={onCta} className="text-xs text-primary hover:underline font-medium mt-2 inline-flex items-center gap-1">
          {cta} <ArrowRight size={10} />
        </button>
      )}
    </div>
  );
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [rangeIdx, setRangeIdx] = useState(1);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [hasBank, setHasBank] = useState(false);
  /**
   * Whether the M2M widget will draw anything.
   *
   * `M2MDashboardWidget` returns `null` when the company owns no devices, which
   * is the normal case — M2M is a niche feature. A layout that hands it a fixed
   * 2-of-5 column therefore leaves 40% of that row blank for most accounts, and
   * a hole in a grid reads as a rendering failure rather than as an absence.
   * The row can only adapt if this screen knows in advance, so it asks.
   */
  const [hasDevices, setHasDevices] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setLoading(false); return; }

      // Oldest company wins, matching resolveCompany on the server. A user can
      // own several rows and an unordered limit(1) would let the dashboard and
      // the edge functions disagree about whose numbers these are.
      const { data: company } = await supabase
        .from('companies').select('id, name').eq('user_id', user.id)
        .order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (!company) { if (!cancelled) setLoading(false); return; }

      const yearAgo = new Date(); yearAgo.setDate(yearAgo.getDate() - 365);
      const [txRes, invRes, snapRes, bankRes, deviceRes] = await Promise.all([
        supabase.from('transactions')
          .select('id, amount, type, category, merchant_name, transaction_date, is_synthetic')
          .eq('company_id', company.id).gte('transaction_date', iso(yearAgo))
          .order('transaction_date', { ascending: false }),
        supabase.from('invoices')
          .select('id, total, status, due_date, client_name, invoice_number')
          .eq('company_id', company.id),
        supabase.from('credit_score_snapshots')
          .select('score, credit_limit, computed_at')
          .eq('company_id', company.id)
          .order('computed_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('bank_connections')
          .select('id').eq('company_id', company.id).eq('status', 'connected').limit(1),
        // Presence only — the widget fetches its own figures. One indexed row
        // is enough to decide the layout, and asking for more would duplicate
        // work the widget is about to do anyway.
        supabase.from('device_wallets')
          .select('id').eq('company_id', company.id).limit(1),
      ]);

      if (cancelled) return;
      setCompanyName(company.name);
      setTxs((txRes.data as Tx[]) ?? []);
      setInvoices((invRes.data as Invoice[]) ?? []);
      setSnapshot((snapRes.data as Snapshot) ?? null);
      setHasBank(!!bankRes.data?.length);
      setHasDevices(!!deviceRes.data?.length);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const m = useMemo(() => {
    // Every figure below describes the business, so generated rows are excluded
    // before any of it is computed. They stay in `txs` only so the recent list
    // can still show them, labelled.
    const real = txs.filter((x) => !x.is_synthetic);
    const days = RANGES[rangeIdx].days;
    const from = new Date(); from.setDate(from.getDate() - days);
    const inRange = real.filter((x) => x.transaction_date >= iso(from));

    const income = inRange.filter(isIncome).reduce((s, x) => s + magnitude(x), 0);
    const expense = inRange.filter((x) => !isIncome(x)).reduce((s, x) => s + magnitude(x), 0);

    const now = new Date();
    const monthStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
    const prevStart = iso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const thisMonth = real.filter((x) => isIncome(x) && x.transaction_date >= monthStart)
      .reduce((s, x) => s + magnitude(x), 0);
    const lastMonth = real.filter((x) => isIncome(x) && x.transaction_date >= prevStart && x.transaction_date < monthStart)
      .reduce((s, x) => s + magnitude(x), 0);

    // Grouped by calendar month so the chart shows the shape of the year, not
    // one bar per transaction.
    const byMonth = new Map<string, { month: string; income: number; expense: number; net: number }>();
    for (const x of [...inRange].reverse()) {
      const k = x.transaction_date.slice(0, 7);
      const row = byMonth.get(k) ?? { month: k.slice(5) + '/' + k.slice(2, 4), income: 0, expense: 0, net: 0 };
      if (isIncome(x)) row.income += magnitude(x); else row.expense += magnitude(x);
      row.net = row.income - row.expense;
      byMonth.set(k, row);
    }

    const soon = new Date(); soon.setDate(soon.getDate() + 7);
    const unpaid = invoices.filter((i) => i.status !== 'paid' && i.status !== 'Đã thanh toán');
    const dueSoon = unpaid.filter((i) => i.due_date <= iso(soon));
    const overdue = unpaid.filter((i) => i.due_date < iso(new Date()));

    return {
      income, expense, net: income - expense,
      thisMonth, lastMonth,
      chart: [...byMonth.values()],
      spark: [...byMonth.values()].map((r) => ({ v: r.net })),
      unpaidTotal: unpaid.reduce((s, i) => s + Number(i.total || 0), 0),
      unpaidCount: unpaid.length, dueSoonCount: dueSoon.length, overdue,
    };
  }, [txs, invoices, rangeIdx]);

  /** Observations, each one derived from the rows above. Nothing is asserted
   *  that the data does not already say. */
  const insights = useMemo(() => {
    const out: { icon: any; color: string; bg: string; badge: string; msg: string; cta: string; action: () => void }[] = [];
    if (m.expense > m.income && m.income > 0) {
      out.push({
        icon: AlertTriangle, color: 'text-mimi-red', bg: 'bg-mimi-red/5 border-mimi-red/10', badge: 'Cảnh báo',
        msg: `Trong ${RANGES[rangeIdx].days} ngày qua bạn chi ${formatVNDShort(m.expense)} nhưng chỉ thu ${formatVNDShort(m.income)}.`,
        // Was '/dashboard/cashflow', which renders this very component — the
        // button sent you to the screen you were already reading it on.
        // Reports is where the transactions behind these two totals actually
        // are, so that is where "xem chi tiết" should land.
        cta: 'Xem chi tiết giao dịch', action: () => navigate('/dashboard/reports'),
      });
    }
    if (m.lastMonth > 0 && m.thisMonth > m.lastMonth) {
      const pct = Math.round(((m.thisMonth - m.lastMonth) / m.lastMonth) * 100);
      out.push({
        icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/5 border-primary/10', badge: 'Cơ hội',
        // Rising revenue used to end at "Xem hạn mức" and a loans page MIMI
        // cannot lend from. Revenue going up is a tax event before it is a
        // credit event: it moves you toward the thresholds, which is something
        // this product can actually do something about.
        msg: `Doanh thu tháng này đang cao hơn tháng trước ${pct}% — kiểm tra xem bạn đang ở đâu so với ngưỡng thuế.`,
        cta: 'Xem ngưỡng thuế', action: () => navigate('/dashboard/reports'),
      });
    }
    if (m.overdue.length) {
      const i = m.overdue[0];
      out.push({
        icon: Bell, color: 'text-mimi-amber', bg: 'bg-mimi-amber/5 border-mimi-amber/10', badge: 'Nhắc nhở',
        msg: `${m.overdue.length} hoá đơn quá hạn, gần nhất là ${i.invoice_number} của ${i.client_name}.`,
        cta: 'Xem hoá đơn', action: () => navigate('/dashboard/invoices'),
      });
    }
    return out;
  }, [m, rangeIdx, navigate]);

  const dateStr = new Date().toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US',
    { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

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

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>;
  }

  const noData = txs.length === 0;

  // Gương mặt Mimi mang ở lời chào, suy ra từ dữ liệu thật đang có trên trang
  // này — không phải từ đồng hồ, không phải ngẫu nhiên. Quy tắc và thứ tự ưu
  // tiên nằm trong `lib/mimiTamTrang.ts` cùng bộ test của nó; chỗ này chỉ dịch
  // state của trang sang các sự việc mà hàm đó nhận.
  const soQuaHan = invoices.filter(
    (i) => i.status !== 'paid' && i.due_date && new Date(i.due_date) < new Date(),
  ).length;
  const mimi = tamTrang({
    chuaCoDuLieu: noData && !hasBank,
    soViecCanXuLy: soQuaHan,
    // Tiền về tính trong 3 ngày gần nhất, và chỉ khoản THU.
    vuaCoTienVe: txs.some(
      (t) =>
        t.amount > 0 &&
        Date.now() - new Date(t.transaction_date).getTime() < 3 * 864e5,
    ),
  });

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-start gap-3">
        {/* 56px, `live` — cô ấy nháy mắt và phản ứng khi bị chạm vào. Không có
            quầng sáng: quầng ngọc bích dựng cho hero trên nền kem, ở đây nó chỉ
            là một vệt màu thừa cạnh dòng chữ. */}
        <MimiCat
          variant="live"
          pose={mimi.pose}
          glow="none"
          tilt={8}
          className="w-14 shrink-0 -mt-1"
        />
        <div className="min-w-0">
          <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">
            Xin chào{companyName ? `, ${companyName}` : ''}
          </h2>
          {/* Câu của Mimi thay cho ngày tháng KHI có việc đáng nói. Không có gì
              đáng nói thì `cau` là null và ngày tháng ở lại — im lặng là trạng
              thái tốt, không phải chỗ trống cần lấp bằng một câu vui vẻ. */}
          {mimi.cau ? (
            <p className="text-sm text-foreground/80 mt-1">{mimi.cau}</p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
          )}
        </div>
      </motion.div>

      {/* Nothing to show yet is said plainly, with the one action that changes it. */}
      {noData && (
        <motion.div variants={fadeUp} className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex items-start gap-4">
          <Link2 size={20} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">Chưa có giao dịch nào</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              {hasBank
                ? 'Tài khoản ngân hàng đã liên kết nhưng chưa đồng bộ giao dịch. Bấm đồng bộ ở Fintech Hub.'
                : 'Liên kết tài khoản ngân hàng để MIMI đọc sao kê và dựng dòng tiền, hoặc tải lên file CSV giao dịch.'}
            </p>
            <button onClick={() => navigate('/dashboard/fintech')} className="text-xs text-primary hover:underline font-medium mt-2 inline-flex items-center gap-1">
              Liên kết ngân hàng <ArrowRight size={10} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Viec can lam, dat TREN cau hoi ve nguoi dung: ai vua vao lan dau can
          biet phai lam gi truoc khi duoc hoi ho la ai. Tu an khi xong het. */}
      <motion.div variants={fadeUp}><BatDauTuDau /></motion.div>

      {/* Asked here, after the numbers are on screen — not as a gate in front
          of them. Renders nothing once answered or skipped. */}
      <motion.div variants={fadeUp}><WelcomeCards /></motion.div>

      {/* Một thẻ mỗi ngày: tin kinh tế thật kèm đường về bài gốc, hoặc một mẹo
          do MIMI viết. Đặt trên các con số vì nó là thứ đọc một lần rồi thôi,
          trong khi dòng tiền phía dưới là thứ người ta quay lại xem mỗi ngày.
          Tự ẩn hẳn khi không có gì đáng nói. */}
      <motion.div variants={fadeUp}><DailyBriefCard /></motion.div>

      {/* The one number this screen exists to answer, on its own row.
          Net cash flow, not "balance": no table here stores a bank balance, so
          a balance tile could only ever have been invented. */}
      <KPICard
        primary
        icon={Wallet}
        label={`Dòng tiền ròng ${RANGES[rangeIdx].days} ngày`}
        value={noData ? '—' : formatVNDShort(m.net)}
        muted={noData}
        sub={noData ? undefined : `Thu ${formatVNDShort(m.income)} · Chi ${formatVNDShort(m.expense)}`}
        subColor={m.net >= 0 ? 'text-mimi-green' : 'text-mimi-red'}
      >
        {!noData && m.spark.length > 1 && (
          <div className="h-16 mt-4 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.spark}>
                <defs>
                  <linearGradient id="kpiGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--green-500))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--green-500))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="hsl(var(--green-500))" fill="url(#kpiGreen)" strokeWidth={1.75} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </KPICard>

      <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Compared against last month, which is measurable. The old tile
            compared against a ₫10 tỷ "target" that exists nowhere. */}
        <KPICard
          icon={TrendingUp}
          label={t('dashboard.monthlyRevenue')}
          value={noData ? '—' : formatVNDShort(m.thisMonth)}
          muted={noData}
          sub={
            noData ? undefined
              : m.lastMonth > 0
                ? `${m.thisMonth >= m.lastMonth ? '+' : ''}${Math.round(((m.thisMonth - m.lastMonth) / m.lastMonth) * 100)}% so với tháng trước`
                : 'Chưa đủ dữ liệu tháng trước để so sánh'
          }
          subColor={m.thisMonth >= m.lastMonth ? 'text-mimi-green' : 'text-mimi-red'}
        />

        <KPICard
          icon={FileText}
          label={t('dashboard.pendingInvoices')}
          value={invoices.length === 0 ? '—' : formatVNDShort(m.unpaidTotal)}
          muted={invoices.length === 0}
          sub={invoices.length === 0 ? undefined : `${m.dueSoonCount} sắp đến hạn`}
          subColor="text-mimi-amber"
        >
          {invoices.length === 0
            ? <p className="text-xs text-muted-foreground mt-1">Chưa có hoá đơn</p>
            : <p className="text-xs text-muted-foreground mt-1">{m.unpaidCount} hoá đơn chưa thu</p>}
        </KPICard>

        <KPICard icon={ShieldCheck} label={t('dashboard.creditScoreLabel')} value="" muted={!snapshot}>
          {snapshot ? (
            <div className="flex items-center gap-4 -mt-1">
              <CreditScoreRing score={snapshot.score} />
              <div>
                <p className="font-mono text-lg font-bold text-foreground">{snapshot.score}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(snapshot.computed_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </p>
              </div>
            </div>
          ) : (
            <button onClick={() => navigate('/dashboard/credit')} className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
              Chưa chấm điểm — chấm ngay <ArrowRight size={10} />
            </button>
          )}
        </KPICard>
      </motion.div>

      {/* Above the charts on purpose. For a household under 1 tỷ this is the
          only tax number that matters, and burying it below a cash-flow graph
          would put the decoration above the decision. */}
      <motion.div variants={fadeUp}>
        <ThresholdClock />
      </motion.div>

      <motion.div variants={stagger} className="grid lg:grid-cols-5 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-3 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-foreground text-lg">{t('dashboard.cashFlowTitle')}</h3>
            <div className="flex gap-1 bg-accent/50 rounded-xl p-1">
              {RANGES.map((r, i) => (
                <button key={r.label} onClick={() => setRangeIdx(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${i === rangeIdx ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {m.chart.length === 0 ? (
            <Empty text="Chưa có giao dịch trong khoảng thời gian này." cta="Liên kết ngân hàng" onCta={() => navigate('/dashboard/fintech')} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={m.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--border)/0.3)" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="hsla(0,0%,100%,0.06)" strokeDasharray="3 3" />
                  <Bar dataKey="income" fill="hsl(var(--blue-500))" radius={[6, 6, 0, 0]} barSize={14} name="income" />
                  <Bar dataKey="expense" fill="hsl(var(--bg-card-hover))" radius={[6, 6, 0, 0]} barSize={14} name="expense" />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--green-500))" fill="hsla(var(--green-500)/0.08)" strokeWidth={2} name="net" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6 space-y-4">
          <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
            <InsightSpark size={17} className="text-primary" /> {t('dashboard.aiInsights')}
          </h3>
          {insights.length === 0 ? (
            <Empty text={noData ? 'Chưa có dữ liệu để nhận xét.' : 'Chưa phát hiện điểm nào cần lưu ý.'} />
          ) : (
            insights.map((ins, i) => (
              <div key={i} className={`${ins.bg} border rounded-xl p-4 transition-all hover:shadow-sm`}>
                <p className="text-xs font-semibold mb-1.5"><span className={ins.color}>{ins.badge}</span></p>
                <p className="text-sm text-muted-foreground leading-relaxed">{ins.msg}</p>
                <button onClick={ins.action} className="text-xs text-primary mt-2 hover:underline font-medium flex items-center gap-1">
                  {ins.cta} <ArrowRight size={10} />
                </button>
              </div>
            ))
          )}
        </motion.div>
      </motion.div>

      <motion.div variants={stagger} className="grid lg:grid-cols-5 gap-4">
        <motion.div variants={fadeUp} className="lg:col-span-3 bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display font-bold text-foreground text-lg">{t('dashboard.recentTx')}</h3>
            {txs.length > 0 && (
              <button onClick={() => navigate('/dashboard/reports')} className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                {t('dashboard.viewAll')} <ArrowRight size={10} />
              </button>
            )}
          </div>
          {txs.length === 0 ? (
            <Empty text="Chưa có giao dịch nào." cta="Liên kết ngân hàng" onCta={() => navigate('/dashboard/fintech')} />
          ) : (
            <div className="space-y-1">
              {txs.slice(0, 8).map((tx, i) => (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex items-center gap-4 py-3 px-3 -mx-3 rounded-xl hover:bg-accent/40 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-bold text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {(tx.merchant_name?.trim() || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium truncate">
                      {tx.merchant_name || 'Không có mô tả'}
                      {/* Labelled where it is read, not only excluded from the
                          maths. A row that is invisible in the totals but looks
                          identical in the list is still misleading. */}
                      {tx.is_synthetic && (
                        <span className="ml-2 align-middle text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                          demo
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{tx.category || (isIncome(tx) ? 'Tiền vào' : 'Tiền ra')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`money text-sm font-semibold ${isIncome(tx) ? 'text-positive' : 'text-negative'}`}>
                      {isIncome(tx) ? '+' : '−'}{formatVNDShort(magnitude(tx))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{tx.transaction_date.slice(5)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
          <h3 className="font-display font-bold text-foreground text-lg">{t('dashboard.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: InvoiceDoc, label: t('dashboard.createInvoice'), path: '/dashboard/invoices' },
              // Second slot used to be "Đăng ký vay vốn" → /dashboard/loans.
              // Reports is where the transactions that need classifying live.
              { icon: CapitalVault, label: t('dashboard.applyLoan'), path: '/dashboard/reports' },
              { icon: CashflowChart, label: t('dashboard.viewReports'), path: '/dashboard/reports' },
              { icon: LearnCap, label: 'Học Fintech', path: '/dashboard/learn' },
            ].map((a) => (
              <motion.button key={a.label} whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} onClick={() => navigate(a.path)}
                className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5 text-center hover:border-primary/20 hover:shadow-[0_8px_24px_hsla(var(--blue-500)/0.06)] transition-all duration-300">
                <a.icon size={24} className="mx-auto mb-3 text-primary" />
                <p className="text-sm text-foreground font-medium">{a.label}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

      </motion.div>

      {/*
        NewsAndLawPanel and M2MDashboardWidget used to sit as bare children of
        the 5-column grid above, after two items that already claimed all 5
        columns (recent-tx col-span-3 + quick-actions col-span-2). Neither
        panel declares its own span, so the grid auto-placed them as implicit
        1-column items — the tabbed news/law panel was rendering at a fifth of
        the row's width, headlines clipped to two words, with the rest of the
        row blank. That is the bug in the screenshot.

        Two spans alone do not fix it, because M2MDashboardWidget returns null
        for any company without devices: a fixed 3/2 split would still leave
        two empty columns for most accounts. So the row is built from what is
        actually going to render — side by side when there are devices, one
        full-width panel when there are none, with its lists flowing in two
        columns at that width instead of one stretched stack.
      */}
      <motion.div variants={stagger} className={hasDevices ? 'grid lg:grid-cols-5 gap-4' : ''}>
        <motion.div variants={fadeUp} className={hasDevices ? 'lg:col-span-3' : ''}>
          <NewsAndLawPanel wide={!hasDevices} />
        </motion.div>
        {/* M2MDashboardWidget renders its own motion.div with variants={fadeUp}
            already (see m2m/M2MDashboardWidget.tsx); wrapping it in another
            animated element would run the same fade-up twice, so this is a
            plain div — layout only, no duplicate animation. */}
        {hasDevices && <div className="lg:col-span-2"><M2MDashboardWidget /></div>}
      </motion.div>
    </motion.div>
  );
}
