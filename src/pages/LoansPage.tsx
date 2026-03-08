import { motion } from 'framer-motion';
import { useState } from 'react';
import { loans } from '@/lib/mockData';
import { formatVND, formatDateShort } from '@/lib/formatters';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] as const },
});

const statusLabel: Record<string, { text: string; cls: string }> = {
  on_track: { text: '🟢 Đúng hạn', cls: 'text-kapiva-green' },
  completed: { text: '✅ Hoàn thành', cls: 'text-kapiva-green' },
  due_soon: { text: '🟡 Sắp đến hạn', cls: 'text-kapiva-amber' },
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
    <div className="space-y-6">
      {/* Credit Score Hero */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div {...fadeUp(0)} className="card-base p-6 flex flex-col items-center justify-center">
          <svg viewBox="0 0 200 130" className="w-48 mb-4">
            <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="hsl(220,25%,18%)" strokeWidth="12" strokeLinecap="round" />
            <path d="M 20 110 A 80 80 0 0 1 168 55" fill="none" stroke="url(#loanGauge)" strokeWidth="12" strokeLinecap="round" />
            <defs>
              <linearGradient id="loanGauge" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(0,84%,60%)" />
                <stop offset="50%" stopColor="hsl(38,92%,50%)" />
                <stop offset="100%" stopColor="hsl(158,100%,43%)" />
              </linearGradient>
            </defs>
            <text x="100" y="95" textAnchor="middle" fill="hsl(214,100%,97%)" fontFamily="Syne" fontWeight="800" fontSize="36">782</text>
            <text x="100" y="115" textAnchor="middle" fill="hsl(215,19%,62%)" fontFamily="DM Sans" fontSize="12">Hạng A — Xuất sắc</text>
          </svg>
          <p className="text-xs text-muted-foreground">Cập nhật: 09/03/2026</p>
        </motion.div>

        <motion.div {...fadeUp(0.1)} className="card-base p-6">
          <h3 className="font-display font-bold text-foreground mb-4">Phân tích điểm tín dụng</h3>
          <div className="space-y-4">
            {scoreFactors.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono text-foreground">{f.score}/100</span>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${f.score}%`,
                      background: f.score >= 85 ? 'hsl(158,100%,43%)' : f.score >= 70 ? 'hsl(225,100%,57%)' : 'hsl(38,92%,50%)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 text-xs text-primary hover:underline">3 cách để tăng điểm ngay →</button>
        </motion.div>
      </div>

      {/* Loan Calculator */}
      <motion.div {...fadeUp(0.15)} className="card-base p-6">
        <h3 className="font-display font-bold text-foreground mb-4">Tính toán khoản vay</h3>
        <div className="flex gap-2 mb-6">
          {['Vốn lưu động', 'Ứng hóa đơn', 'Mở rộng'].map((t, i) => (
            <button
              key={t}
              onClick={() => setLoanType(i)}
              className={`text-xs px-3 py-2 rounded-lg transition-colors ${loanType === i ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <label className="text-sm text-muted-foreground">Số tiền vay</label>
                <span className="font-mono text-lg font-bold text-foreground">{formatVND(loanAmount)}</span>
              </div>
              <input
                type="range"
                min={100_000_000}
                max={10_000_000_000}
                step={100_000_000}
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full accent-primary h-2 rounded-full appearance-none bg-accent cursor-pointer"
                style={{ accentColor: 'hsl(225,100%,57%)' }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>₫100M</span><span>₫10 tỷ</span>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Thời hạn</label>
              <div className="flex gap-2">
                {[30, 60, 90, 180].map((d) => (
                  <button
                    key={d}
                    onClick={() => setLoanTerm(d)}
                    className={`flex-1 text-sm py-2 rounded-lg transition-colors ${loanTerm === d ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}
                  >
                    {d}N
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card-base bg-accent p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Số tiền nhận được</span>
              <span className="font-mono text-lg font-bold text-kapiva-green">{formatVND(received)}</span>
            </div>
            <div className="border-t border-border pt-2 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Phí</span>
                <span className="font-mono text-foreground">{formatVND(fee)} (2%/kỳ)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ngày đến hạn</span>
                <span className="text-foreground">{formatDateShort(new Date(Date.now() + loanTerm * 86400000))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Lãi suất hiệu dụng</span>
                <span className="font-mono text-foreground">{((fee / loanAmount) * (365 / loanTerm) * 100).toFixed(1)}%/năm</span>
              </div>
            </div>
            <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 transition-all mt-3">
              → Đăng ký vay ngay
            </button>
          </div>
        </div>
      </motion.div>

      {/* Active Loans */}
      <motion.div {...fadeUp(0.2)} className="card-base overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-bold text-foreground">Khoản vay đang hoạt động ({loans.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Mã vay', 'Số tiền', 'Loại', 'Giải ngân', 'Đến hạn', 'Tiến độ', 'Trạng thái'].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-foreground">{l.code}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{formatVND(l.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.type}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateShort(l.disbursedDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateShort(l.dueDate)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-accent rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${l.progress}%`,
                            background: l.progress === 100 ? 'hsl(158,100%,43%)' : 'hsl(225,100%,57%)',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{l.progress}%</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs ${statusLabel[l.status].cls}`}>
                    {statusLabel[l.status].text}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
