import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatVND, formatNumber } from '@/lib/formatters';
import { Download, Users, CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] },
});

const funnelData = [
  { stage: 'Visits', value: 12400 },
  { stage: 'Signups', value: 1247 },
  { stage: 'Onboarded', value: 890 },
  { stage: 'First Loan', value: 624 },
];

const industryData = [
  { name: 'F&B', value: 32, fill: 'hsl(225,100%,57%)' },
  { name: 'Bán lẻ', value: 24, fill: 'hsl(158,100%,43%)' },
  { name: 'Sản xuất', value: 18, fill: 'hsl(38,92%,50%)' },
  { name: 'XNK', value: 14, fill: 'hsl(270,70%,60%)' },
  { name: 'Khác', value: 12, fill: 'hsl(215,19%,45%)' },
];

const mockLeads = [
  { time: '14:32', name: 'Nguyễn Văn An', company: 'An Phát Foods', industry: 'F&B', revenue: '₫2.5 tỷ', email: 'an@anphat.vn' },
  { time: '13:15', name: 'Trần Thị Bình', company: 'Bình Minh Logistics', industry: 'Logistics', revenue: '₫5.1 tỷ', email: 'binh@bmlog.vn' },
  { time: '11:42', name: 'Lê Hoàng Cường', company: 'Cường Thịnh JSC', industry: 'Sản xuất', revenue: '₫12 tỷ', email: 'cuong@cthinh.vn' },
  { time: '10:08', name: 'Phạm Minh Đức', company: 'Đức Phát Trading', industry: 'XNK', revenue: '₫8.3 tỷ', email: 'duc@dptrading.vn' },
  { time: '09:30', name: 'Vũ Thị Hoa', company: 'Hoa Sen Retail', industry: 'Bán lẻ', revenue: '₫3.2 tỷ', email: 'hoa@hoasen.vn' },
];

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [shake, setShake] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'kapiva2025') {
      setAuthenticated(true);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.form
          onSubmit={handleAuth}
          animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="card-base p-6 w-full max-w-sm"
        >
          <h2 className="font-display font-bold text-xl text-foreground text-center mb-4">Admin Access</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
            className="w-full bg-accent border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors mb-4"
          />
          <button type="submit" className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-display font-bold">
            Đăng nhập
          </button>
        </motion.form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="font-display font-extrabold text-2xl text-foreground">Admin Dashboard</h1>

        {/* Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Leads hôm nay', value: '24', sub: '+8 vs hôm qua', color: 'text-primary' },
            { icon: Users, label: 'Total users', value: '1,247', sub: '', color: 'text-foreground' },
            { icon: CreditCard, label: 'Active loans', value: '₫12.4 tỷ', sub: '', color: 'text-kapiva-green' },
            { icon: DollarSign, label: 'Revenue MTD', value: '₫284M', sub: '', color: 'text-kapiva-amber' },
          ].map((kpi) => (
            <motion.div key={kpi.label} {...fadeUp(0)} className="card-base p-4">
              <kpi.icon size={16} className="text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className={`font-mono text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              {kpi.sub && <p className="text-xs text-kapiva-green">{kpi.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Leads table */}
        <motion.div {...fadeUp(0.1)} className="card-base overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <h3 className="font-display font-bold text-foreground">Leads gần đây</h3>
            <button className="text-xs bg-card border border-border px-3 py-1.5 rounded-lg text-muted-foreground flex items-center gap-1">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Thời gian', 'Tên', 'Công ty', 'Ngành', 'Doanh thu', 'Email'].map((h) => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockLeads.map((l, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{l.time}</td>
                    <td className="px-4 py-3 text-foreground">{l.name}</td>
                    <td className="px-4 py-3 text-foreground">{l.company}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.industry}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{l.revenue}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Funnel */}
          <motion.div {...fadeUp(0.15)} className="card-base p-5">
            <h3 className="font-display font-bold text-foreground mb-4">Funnel chuyển đổi</h3>
            <div className="space-y-3">
              {funnelData.map((d, i) => (
                <div key={d.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{d.stage}</span>
                    <span className="font-mono text-foreground">{formatNumber(d.value)}</span>
                  </div>
                  <div className="w-full bg-accent rounded-full h-3">
                    <div className="h-3 rounded-full bg-primary transition-all" style={{ width: `${(d.value / funnelData[0].value) * 100}%` }} />
                  </div>
                  {i < funnelData.length - 1 && (
                    <p className="text-xs text-muted-foreground text-right mt-0.5">
                      {((funnelData[i + 1].value / d.value) * 100).toFixed(1)}% →
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Industry pie */}
          <motion.div {...fadeUp(0.2)} className="card-base p-5">
            <h3 className="font-display font-bold text-foreground mb-4">Phân bổ ngành nghề</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={industryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {industryData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 justify-center">
              {industryData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full" style={{ background: d.fill }} />
                  {d.name} {d.value}%
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
