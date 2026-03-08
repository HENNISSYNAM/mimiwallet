import { motion } from 'framer-motion';
import { useState } from 'react';
import { loans } from '@/lib/mockData';
import { formatVND, formatDateShort } from '@/lib/formatters';
import { ArrowRight } from 'lucide-react';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

const statusLabel: Record<string, { text: string; cls: string; dot: string }> = {
  on_track: { text: 'Đúng hạn', cls: 'text-kapiva-green', dot: 'bg-kapiva-green' },
  completed: { text: 'Hoàn thành', cls: 'text-kapiva-green', dot: 'bg-kapiva-green' },
  due_soon: { text: 'Sắp đến hạn', cls: 'text-kapiva-amber', dot: 'bg-kapiva-amber' },
};

const scoreFactors = [
  { label: 'Lịch sử thanh toán', score: 89 },
  { label: 'Sức khỏe dòng tiền', score: 76 },
  { label: 'Tỷ lệ sử dụng vốn', score: 91 },
  { label: 'Thời gian hoạt động', score: 78 },
];

export default function LoansPage() {
  const [loanAmount, setLoanAmount] = useState(1_000_000_000);
  const [loanTerm, setLoanTerm] = useState(90);
  const [loanType, setLoanType] = useState(0);

  const fee = loanAmount * 0.02;
  const received = loanAmount - fee;

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Credit Score Hero */}
      <motion.div variants={stagger} className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/3 to-transparent" />
          <div className="relative z-10 text-center">
            <svg viewBox="0 0 200 130" className="w-52 mb-6">
              <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="hsl(var(--border))" strokeWidth="10" strokeLinecap="round" />
              <motion.path
                d="M 20 110 A 80 80 0 0 1 168 55"
                fill="none" stroke="url(#loanGauge)" strokeWidth="10" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              />
              <defs>
                <linearGradient id="loanGauge" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--red-500))" />
                  <stop offset="50%" stopColor="hsl(var(--amber-500))" />
                  <stop offset="100%" stopColor="hsl(var(--green-500))" />
                </linearGradient>
              </defs>
              <text x="100" y="90" textAnchor="middle" fill="hsl(var(--text-primary))" fontFamily="Syne" fontWeight="800" fontSize="36">782</text>
              <text x="100" y="110" textAnchor="middle" fill="hsl(var(--text-secondary))" fontFamily="DM Sans" fontSize="12">Hạng A — Xuất sắc</text>
            </svg>
            <p className="text-xs text-muted-foreground">Cập nhật: 09/03/2026</p>
            <p className="text-xs text-muted-foreground mt-1">Cao hơn 84% doanh nghiệp cùng ngành</p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-6">Phân tích điểm tín dụng</h3>
          <div className="space-y-5">
            {scoreFactors.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground font-medium">{f.label}</span>
                  <span className="font-mono text-foreground font-semibold">{f.score}/100</span>
                </div>
                <div className="w-full bg-accent rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${f.score}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="h-2 rounded-full"
                    style={{
                      background: f.score >= 85 ? 'hsl(var(--green-500))' : f.score >= 70 ? 'hsl(var(--blue-500))' : 'hsl(var(--amber-500))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-5 text-xs text-primary hover:underline font-medium flex items-center gap-1">
            3 cách để tăng điểm ngay <ArrowRight size={10} />
          </button>
        </motion.div>
      </motion.div>

      {/* Loan Calculator */}
      <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-6">
        <h3 className="font-display font-bold text-foreground text-lg mb-6">Tính toán khoản vay</h3>
        <div className="flex gap-1 bg-accent/30 rounded-xl p-1 mb-6 w-fit">
          {['Vốn lưu động', 'Ứng hóa đơn', 'Mở rộng KD'].map((t, i) => (
            <button
              key={t}
              onClick={() => setLoanType(i)}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                loanType === i ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <label className="text-sm text-muted-foreground font-medium">Số tiền vay</label>
                <span className="font-mono text-xl font-bold text-foreground">{formatVND(loanAmount)}</span>
              </div>
              <input
                type="range"
                min={100_000_000} max={10_000_000_000} step={100_000_000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-full appearance-none bg-accent cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)] [&::-webkit-slider-thumb]:appearance-none"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>₫100M</span><span>₫10 tỷ</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground font-medium mb-3 block">Thời hạn</label>
              <div className="flex gap-2">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => setLoanTerm(d)}
                    className={`flex-1 text-sm py-2.5 rounded-xl font-medium transition-all duration-200 ${
                      loanTerm === d
                        ? 'bg-primary text-primary-foreground shadow-[0_2px_12px_hsla(var(--blue-500)/0.2)]'
                        : 'bg-card/50 border border-border text-muted-foreground hover:border-primary/20'
                    }`}
                  >
                    {d}N
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-kapiva-green/5 border border-primary/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Số tiền nhận được</p>
                <p className="font-mono text-3xl font-bold text-kapiva-green">{formatVND(received)}</p>
              </div>
              <div className="border-t border-border/30 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí</span>
                  <span className="font-mono text-foreground">{formatVND(fee)} <span className="text-muted-foreground">(2%/kỳ)</span></span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ngày đến hạn</span>
                  <span className="text-foreground">{formatDateShort(new Date(Date.now() + loanTerm * 86400000))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lãi suất hiệu dụng</span>
                  <span className="font-mono text-foreground">{((fee / loanAmount) * (365 / loanTerm) * 100).toFixed(1)}%/năm</span>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-[0_4px_16px_hsla(var(--blue-500)/0.25)] mt-6"
            >
              Đăng ký vay ngay →
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Active Loans */}
      <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border/30">
          <h3 className="font-display font-bold text-foreground text-lg">Khoản vay đang hoạt động ({loans.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                {['Mã vay', 'Số tiền', 'Loại', 'Giải ngân', 'Đến hạn', 'Tiến độ', 'Trạng thái'].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground/70 font-medium px-5 py-4 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map((l, i) => (
                <motion.tr
                  key={l.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="border-b border-border/20 last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <td className="px-5 py-4 font-mono text-foreground font-medium">{l.code}</td>
                  <td className="px-5 py-4 font-mono text-foreground">{formatVND(l.amount)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{l.type}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDateShort(l.disbursedDate)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDateShort(l.dueDate)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-accent rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${l.progress}%` }}
                          transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: [0.4, 0, 0.2, 1] }}
                          className="h-2 rounded-full"
                          style={{
                            background: l.progress === 100 ? 'hsl(var(--green-500))' : 'hsl(var(--blue-500))',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground w-8">{l.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusLabel[l.status].cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusLabel[l.status].dot}`} />
                      {statusLabel[l.status].text}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
