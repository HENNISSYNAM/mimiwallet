import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, BarChart3, Clock, FileText, Wallet, Loader2 } from 'lucide-react';
import { formatVNDShort } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import TransactionUpload from './TransactionUpload';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

interface Snapshot {
  id: string;
  score: number;
  credit_limit: number;
  probability_of_default: number;
  computed_at: string;
}

interface Factor {
  factor_name: string;
  raw_value: number | null;
  normalized_score: number;
  weight: number;
  trend: number | null;
}

const FACTOR_META: Record<string, { label: string; icon: React.ReactNode }> = {
  revenueTrend: { label: 'Xu hướng doanh thu', icon: <TrendingUp size={16} /> },
  expenseToIncomeRatio: { label: 'Tỷ lệ chi phí/doanh thu', icon: <Wallet size={16} /> },
  invoicePunctuality: { label: 'Lịch sử thanh toán hóa đơn', icon: <Clock size={16} /> },
  loanRepaymentRatio: { label: 'Lịch sử trả nợ vay', icon: <FileText size={16} /> },
  cashFlowVolatility: { label: 'Ổn định dòng tiền', icon: <BarChart3 size={16} /> },
};

const IMPROVEMENT_TIPS: Record<string, { icon: string; title: string; desc: string }> = {
  revenueTrend: { icon: '📈', title: 'Tăng trưởng doanh thu', desc: 'Duy trì đà tăng doanh thu hàng tháng để cải thiện điểm này' },
  expenseToIncomeRatio: { icon: '📊', title: 'Kiểm soát chi phí', desc: 'Giữ tỷ lệ chi phí dưới 60% doanh thu để tối ưu điểm' },
  invoicePunctuality: { icon: '💳', title: 'Thanh toán đúng hạn', desc: 'Duy trì 100% hóa đơn thanh toán đúng hạn' },
  loanRepaymentRatio: { icon: '🏦', title: 'Trả nợ đúng hạn', desc: 'Hoàn trả các khoản vay đúng tiến độ' },
  cashFlowVolatility: { icon: '🌊', title: 'Ổn định dòng tiền', desc: 'Giảm biến động thu chi giữa các tháng' },
};

function scoreToGrade(score: number): { grade: string; color: string; label: string } {
  if (score >= 750) return { grade: 'A', color: 'text-mimi-green', label: 'Xuất sắc' };
  if (score >= 650) return { grade: 'B', color: 'text-primary', label: 'Tốt' };
  if (score >= 550) return { grade: 'C', color: 'text-mimi-amber', label: 'Trung bình' };
  return { grade: 'D', color: 'text-mimi-red', label: 'Cần cải thiện' };
}

function estimatedRate(score: number): number {
  return Math.min(15, Math.max(8, 15 - ((score - 300) / 550) * 7));
}

function ScoreGauge({ score, maxScore = 850 }: { score: number; maxScore?: number }) {
  const percentage = score / maxScore;
  const circumference = 2 * Math.PI * 70;
  const filled = percentage * circumference;
  const color = score >= 750 ? 'hsl(var(--green-500))' : score >= 550 ? 'hsl(var(--amber-500))' : 'hsl(var(--red-500))';
  const { label } = scoreToGrade(score);

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 160 160" className="w-44 h-44">
        <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
        <motion.circle
          cx="80" cy="80" r="70" fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="72" textAnchor="middle" dominantBaseline="central" fill="hsl(var(--text-primary))" fontFamily="var(--font-mono)" fontWeight="800" fontSize="32">
          {score}
        </text>
        <text x="80" y="96" textAnchor="middle" fill="hsl(var(--text-secondary))" fontFamily="var(--font-body)" fontSize="10">
          / {maxScore}
        </text>
      </svg>
      <span className="text-sm font-medium mt-2" style={{ color }}>{label}</span>
    </div>
  );
}

function RiskFactor({ label, value, level }: { label: string; value: number; level: 'low' | 'medium' | 'high' }) {
  const colors = { low: 'bg-mimi-green', medium: 'bg-mimi-amber', high: 'bg-mimi-red' };
  const labels = { low: 'Thấp', medium: 'TB', high: 'Cao' };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          level === 'low' ? 'bg-mimi-green/10 text-mimi-green' :
          level === 'medium' ? 'bg-mimi-amber/10 text-mimi-amber' :
          'bg-mimi-red/10 text-mimi-red'
        }`}>{labels[level]}</span>
      </div>
      <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors[level]}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export default function CreditScoring() {
  const { session } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [hasFinancialData, setHasFinancialData] = useState(false);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', session.user.id)
      .limit(1);
    const cId = companies?.[0]?.id ?? null;
    setCompanyId(cId);

    if (!cId) {
      setLoading(false);
      return;
    }

    const [{ data: snapshots }, { count: txCount }, { count: invoiceCount }, { count: loanCount }] = await Promise.all([
      supabase
        .from('credit_score_snapshots')
        .select('*')
        .eq('company_id', cId)
        .order('computed_at', { ascending: false })
        .limit(12),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', cId),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', cId),
      supabase
        .from('loan_applications')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', cId),
    ]);

    setHasFinancialData((txCount ?? 0) > 0 || (invoiceCount ?? 0) > 0 || (loanCount ?? 0) > 0);

    if (snapshots && snapshots.length > 0) {
      setSnapshot(snapshots[0]);
      setHistory([...snapshots].reverse());

      const { data: factorRows } = await supabase
        .from('credit_score_factors')
        .select('*')
        .eq('snapshot_id', snapshots[0].id);
      setFactors(factorRows ?? []);
    } else {
      setSnapshot(null);
      setHistory([]);
      setFactors([]);
    }

    setLoading(false);
  }, [session]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompute = async () => {
    setComputing(true);
    const { error } = await supabase.functions.invoke('credit-scoring?action=compute', { body: {} });
    setComputing(false);
    if (error) {
      toast.error(`Tính điểm thất bại: ${error.message}`);
      return;
    }
    toast.success('Đã cập nhật điểm tín dụng');
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Mimi Credit Score</h2>
          <p className="text-sm text-muted-foreground mt-1">Chưa có dữ liệu để tính điểm tín dụng</p>
        </div>
        <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center">
          <AlertTriangle size={32} className="text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground font-medium">Chưa có điểm tín dụng nào được tính</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Tải lên dữ liệu giao dịch hoặc tính điểm ngay nếu bạn đã có hóa đơn/khoản vay trong hệ thống.
          </p>
          {hasFinancialData && (
            <motion.button
              whileHover={{ y: -1 }}
              onClick={handleCompute}
              disabled={computing}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-display font-bold disabled:opacity-50 inline-flex items-center gap-2"
            >
              {computing && <Loader2 size={14} className="animate-spin" />} Tính điểm ngay
            </motion.button>
          )}
        </div>
        <TransactionUpload onComputed={loadData} />
      </div>
    );
  }

  const { grade, color } = scoreToGrade(snapshot.score);
  const rate = estimatedRate(snapshot.score);
  const sortedFactors = [...factors].sort((a, b) => a.normalized_score - b.normalized_score);
  const weakestFactors = sortedFactors.slice(0, 3);
  const historyScores = history.length > 0 ? history.map((s) => s.score) : [snapshot.score];
  const firstScore = historyScores[0];
  const scoreDelta = snapshot.score - firstScore;

  const volatilityFactor = factors.find((f) => f.factor_name === 'cashFlowVolatility');
  const expenseFactor = factors.find((f) => f.factor_name === 'expenseToIncomeRatio');
  const riskLevel = (score: number): 'low' | 'medium' | 'high' => (score >= 70 ? 'low' : score >= 40 ? 'medium' : 'high');

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Mimi Credit Score</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Điểm tín dụng tính từ dữ liệu thật • Cập nhật: {new Date(snapshot.computed_at).toLocaleString('vi-VN')}
          </p>
        </div>
        <motion.button
          whileHover={{ y: -1 }}
          onClick={handleCompute}
          disabled={computing}
          className="flex items-center gap-2 bg-accent hover:bg-accent/70 text-foreground px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
        >
          {computing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          Tính lại điểm
        </motion.button>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6 flex flex-col items-center">
          <ScoreGauge score={snapshot.score} />
          <div className="w-full mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hạng tín dụng</span>
              <span className={`font-bold ${color}`}>{grade}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hạn mức khả dụng</span>
              <span className="font-mono font-bold text-foreground">{formatVNDShort(snapshot.credit_limit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lãi suất ước tính</span>
              <span className="font-mono font-bold text-mimi-green">{rate.toFixed(1)}%/năm</span>
            </div>
          </div>
        </motion.div>

        {/* Score Factors */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">Yếu tố đánh giá</h3>
          <div className="space-y-4">
            {factors.map((f) => {
              const meta = FACTOR_META[f.factor_name] ?? { label: f.factor_name, icon: <BarChart3 size={16} /> };
              const positive = f.trend === null || f.trend >= 0;
              return (
                <div key={f.factor_name} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">{meta.icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-foreground font-medium">{meta.label}</span>
                      <span className={`text-xs font-mono font-medium ${positive ? 'text-mimi-green' : 'text-mimi-red'}`}>
                        {f.trend === null ? (
                          'Mới'
                        ) : (
                          <>
                            {positive ? <TrendingUp size={10} className="inline mr-1" /> : <TrendingDown size={10} className="inline mr-1" />}
                            {f.trend >= 0 ? '+' : ''}{f.trend.toFixed(0)}
                          </>
                        )}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${f.normalized_score}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Risk Assessment */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">Đánh giá rủi ro</h3>
          <div className="space-y-5">
            <RiskFactor
              label="Rủi ro vỡ nợ"
              value={snapshot.probability_of_default * 100}
              level={snapshot.probability_of_default < 0.1 ? 'low' : snapshot.probability_of_default < 0.3 ? 'medium' : 'high'}
            />
            {volatilityFactor && (
              <RiskFactor label="Rủi ro biến động dòng tiền" value={100 - volatilityFactor.normalized_score} level={riskLevel(volatilityFactor.normalized_score)} />
            )}
            {expenseFactor && (
              <RiskFactor label="Rủi ro chi phí/doanh thu" value={100 - expenseFactor.normalized_score} level={riskLevel(expenseFactor.normalized_score)} />
            )}
          </div>
          <div className={`mt-6 rounded-xl p-4 ${snapshot.probability_of_default < 0.1 ? 'bg-mimi-green/5 border border-mimi-green/10' : snapshot.probability_of_default < 0.3 ? 'bg-mimi-amber/5 border border-mimi-amber/10' : 'bg-mimi-red/5 border border-mimi-red/10'}`}>
            <p className={`text-xs font-medium flex items-center gap-2 ${snapshot.probability_of_default < 0.1 ? 'text-mimi-green' : snapshot.probability_of_default < 0.3 ? 'text-mimi-amber' : 'text-mimi-red'}`}>
              <ShieldCheck size={14} /> Xác suất vỡ nợ ước tính: <span className="font-bold">{(snapshot.probability_of_default * 100).toFixed(1)}%</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Score History */}
      <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg mb-4">Lịch sử điểm tín dụng</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {historyScores.map((s, i) => (
            <motion.div
              key={i}
              className="flex-1 flex flex-col items-center gap-1"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              transition={{ delay: i * 0.05 }}
            >
              <motion.div
                className="w-full rounded-t-md bg-gradient-to-t from-primary to-primary/60"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, ((s - 300) / 550) * 100)}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
                style={{ minHeight: 8 }}
              />
              <span className="text-[8px] text-muted-foreground font-mono">L{i + 1}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{new Date(history[0]?.computed_at ?? snapshot.computed_at).toLocaleDateString('vi-VN')}</span>
          {historyScores.length > 1 && (
            <span className={`flex items-center gap-1 font-medium ${scoreDelta >= 0 ? 'text-mimi-green' : 'text-mimi-red'}`}>
              {scoreDelta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {scoreDelta >= 0 ? '+' : ''}{scoreDelta} điểm qua {historyScores.length} lần tính
            </span>
          )}
          <span>{new Date(snapshot.computed_at).toLocaleDateString('vi-VN')}</span>
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={fadeUp} className="bg-gradient-to-r from-primary/5 to-mimi-green/5 border border-primary/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2 mb-4">🧠 Gợi ý cải thiện điểm</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {weakestFactors.map((f) => {
            const tip = IMPROVEMENT_TIPS[f.factor_name] ?? { icon: '💡', title: f.factor_name, desc: 'Cải thiện chỉ số này để tăng điểm' };
            const potentialImpact = Math.round((100 - f.normalized_score) * f.weight * 5.5);
            return (
              <div key={f.factor_name} className="bg-card/50 border border-border/60 rounded-xl p-4">
                <span className="text-2xl">{tip.icon}</span>
                <h4 className="text-sm font-semibold text-foreground mt-2">{tip.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{tip.desc}</p>
                <span className="inline-block mt-2 text-xs font-mono font-bold text-mimi-green bg-mimi-green/10 px-2 py-0.5 rounded">+{potentialImpact} điểm</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <TransactionUpload onComputed={loadData} />
    </motion.div>
  );
}
