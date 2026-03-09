import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, BarChart3, Clock, FileText, Wallet } from 'lucide-react';
import { formatVNDShort } from '@/lib/formatters';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

function ScoreGauge({ score, maxScore = 1000 }: { score: number; maxScore?: number }) {
  const percentage = score / maxScore;
  const circumference = 2 * Math.PI * 70;
  const filled = percentage * circumference;
  const color = score >= 750 ? 'hsl(var(--green-500))' : score >= 500 ? 'hsl(var(--amber-500))' : 'hsl(var(--red-500))';
  const label = score >= 750 ? 'Xuất sắc' : score >= 600 ? 'Tốt' : score >= 400 ? 'Trung bình' : 'Cần cải thiện';

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

function RiskFactor({ label, value, maxValue, level }: { label: string; value: number; maxValue: number; level: 'low' | 'medium' | 'high' }) {
  const colors = { low: 'bg-kapiva-green', medium: 'bg-kapiva-amber', high: 'bg-kapiva-red' };
  const labels = { low: 'Thấp', medium: 'TB', high: 'Cao' };
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          level === 'low' ? 'bg-kapiva-green/10 text-kapiva-green' :
          level === 'medium' ? 'bg-kapiva-amber/10 text-kapiva-amber' :
          'bg-kapiva-red/10 text-kapiva-red'
        }`}>{labels[level]}</span>
      </div>
      <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${colors[level]}`}
          initial={{ width: 0 }}
          animate={{ width: `${(value / maxValue) * 100}%` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export default function CreditScoring() {
  const factors = [
    { label: 'Lịch sử thanh toán', value: 95, icon: <Clock size={16} />, trend: '+3%', positive: true },
    { label: 'Tỷ lệ sử dụng tín dụng', value: 42, icon: <Wallet size={16} />, trend: '-5%', positive: true },
    { label: 'Đa dạng tín dụng', value: 78, icon: <FileText size={16} />, trend: '+2%', positive: true },
    { label: 'Dòng tiền ổn định', value: 88, icon: <BarChart3 size={16} />, trend: '+7%', positive: true },
  ];

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">KAPIVA Credit Score</h2>
          <p className="text-sm text-muted-foreground mt-1">Điểm tín dụng AI • Cập nhật: Hôm nay 14:30</p>
        </div>
        <div className="flex items-center gap-2 bg-kapiva-green/10 text-kapiva-green px-3 py-1.5 rounded-lg text-xs font-medium">
          <ShieldCheck size={14} /> Đã xác minh
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6 flex flex-col items-center">
          <ScoreGauge score={782} />
          <div className="w-full mt-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hạng tín dụng</span>
              <span className="font-bold text-kapiva-green">A</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Hạn mức khả dụng</span>
              <span className="font-mono font-bold text-foreground">₫5.2 tỷ</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Lãi suất ưu đãi</span>
              <span className="font-mono font-bold text-kapiva-green">8.5%/năm</span>
            </div>
          </div>
        </motion.div>

        {/* Score Factors */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">Yếu tố đánh giá</h3>
          <div className="space-y-4">
            {factors.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-foreground font-medium">{f.label}</span>
                    <span className={`text-xs font-mono font-medium ${f.positive ? 'text-kapiva-green' : 'text-kapiva-red'}`}>
                      {f.positive ? <TrendingUp size={10} className="inline mr-1" /> : <TrendingDown size={10} className="inline mr-1" />}
                      {f.trend}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${f.value}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Risk Assessment */}
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">Đánh giá rủi ro</h3>
          <div className="space-y-5">
            <RiskFactor label="Rủi ro vỡ nợ" value={12} maxValue={100} level="low" />
            <RiskFactor label="Rủi ro thanh khoản" value={28} maxValue={100} level="low" />
            <RiskFactor label="Rủi ro ngành" value={45} maxValue={100} level="medium" />
            <RiskFactor label="Rủi ro thị trường" value={35} maxValue={100} level="low" />
          </div>
          <div className="mt-6 bg-kapiva-green/5 border border-kapiva-green/10 rounded-xl p-4">
            <p className="text-xs text-kapiva-green font-medium flex items-center gap-2">
              <ShieldCheck size={14} /> Mức rủi ro tổng hợp: <span className="font-bold">THẤP</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Score History */}
      <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg mb-4">Lịch sử điểm tín dụng</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {[650, 670, 695, 710, 720, 738, 745, 755, 762, 770, 778, 782].map((s, i) => (
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
                animate={{ height: `${((s - 600) / 200) * 100}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 }}
                style={{ minHeight: 8 }}
              />
              <span className="text-[8px] text-muted-foreground font-mono">T{i + 1}</span>
            </motion.div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Tháng 4/2025</span>
          <span className="flex items-center gap-1 text-kapiva-green font-medium">
            <TrendingUp size={10} /> +132 điểm trong 12 tháng
          </span>
          <span>Tháng 3/2026</span>
        </div>
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={fadeUp} className="bg-gradient-to-r from-primary/5 to-kapiva-green/5 border border-primary/10 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2 mb-4">🧠 Gợi ý cải thiện điểm</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: '💳', title: 'Thanh toán đúng hạn', desc: 'Duy trì 100% thanh toán đúng hạn để tăng 15 điểm', impact: '+15' },
            { icon: '📊', title: 'Giảm tỷ lệ sử dụng', desc: 'Giữ tỷ lệ sử dụng tín dụng dưới 30%', impact: '+10' },
            { icon: '🏦', title: 'Kết nối thêm ngân hàng', desc: 'Thêm dữ liệu giúp AI đánh giá chính xác hơn', impact: '+8' },
          ].map((rec, i) => (
            <div key={i} className="bg-card/50 border border-border/60 rounded-xl p-4">
              <span className="text-2xl">{rec.icon}</span>
              <h4 className="text-sm font-semibold text-foreground mt-2">{rec.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{rec.desc}</p>
              <span className="inline-block mt-2 text-xs font-mono font-bold text-kapiva-green bg-kapiva-green/10 px-2 py-0.5 rounded">{rec.impact} điểm</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
