import { motion } from 'framer-motion';
import { revenueExpenseData, invoiceAgingData, expenseBreakdown } from '@/lib/mockData';
import { formatVNDShort } from '@/lib/formatters';
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { FileText, Download } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] as const },
});

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-base p-3 text-xs space-y-1">
      <p className="text-muted-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>{p.name}: {formatVNDShort(p.value)}</p>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-display font-bold text-foreground">Báo cáo & Phân tích</h2>
        <div className="flex gap-2">
          {['Hôm nay', '7 ngày', 'Tháng này', 'Quý này', 'Năm này'].map((p, i) => (
            <button key={p} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${i === 2 ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{p}</button>
          ))}
          <button className="bg-card border border-border px-3 py-1.5 rounded-lg text-xs text-muted-foreground flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>
      </motion.div>

      {/* Revenue vs Expenses */}
      <motion.div {...fadeUp(0.05)} className="card-base p-5">
        <h3 className="font-display font-bold text-foreground mb-4">Doanh thu & Chi phí</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueExpenseData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsla(220,20%,18%,0.5)" />
              <XAxis dataKey="month" tick={{ fill: 'hsl(215,19%,62%)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215,19%,62%)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatVNDShort(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="revenue" name="Thu nhập" fill="hsl(225,100%,57%)" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar dataKey="expense" name="Chi phí" fill="hsl(220,25%,25%)" radius={[4, 4, 0, 0]} barSize={20} />
              <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="hsl(158,100%,43%)" strokeWidth={2} dot={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Invoice Aging */}
        <motion.div {...fadeUp(0.1)} className="card-base p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Phân tích tuổi hóa đơn</h3>
          <div className="space-y-3">
            {invoiceAgingData.map((d) => (
              <div key={d.range}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{d.range}</span>
                  <span className="font-mono text-foreground">{formatVNDShort(d.amount)}</span>
                </div>
                <div className="w-full bg-accent rounded-full h-3">
                  <div className="h-3 rounded-full transition-all" style={{ width: `${(d.amount / 800_000_000) * 100}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Expense Breakdown */}
        <motion.div {...fadeUp(0.15)} className="card-base p-5">
          <h3 className="font-display font-bold text-foreground mb-4">Phân bổ chi phí</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {expenseBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend
                  verticalAlign="bottom"
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* AI Summary */}
      <motion.div {...fadeUp(0.2)} className="card-base p-5 border-l-4 border-l-primary">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-3">🧠 Tóm tắt từ AI — Tháng 03/2026</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          Doanh thu tháng 3 đạt ₫8.32 tỷ, tăng 15.5% so với tháng trước. Chi phí nhập hàng tăng 8% do giá nguyên liệu tăng.
          Dòng tiền ròng vẫn dương nhờ thu hồi công nợ tốt.
        </p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>Nên đàm phán lại điều khoản thanh toán với nhà cung cấp lớn nhất</li>
          <li>3 hóa đơn quá hạn cần theo dõi sát để giảm rủi ro nợ xấu</li>
          <li>Cân nhắc ứng vốn hóa đơn cho khoản phải thu lớn để tối ưu dòng tiền</li>
        </ul>
      </motion.div>
    </div>
  );
}
