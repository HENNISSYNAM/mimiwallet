import { motion } from 'framer-motion';
import { Shield, FileText, Check, AlertTriangle, Clock, Lock, Eye, BarChart3 } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ComplianceDashboard() {
  const complianceItems = [
    { id: 'kyc', label: 'KYC/eKYC', status: 'passed', regulation: 'TT 16/2020 NHNN', date: '09/03/2026' },
    { id: 'aml', label: 'AML Screening', status: 'passed', regulation: 'Luật PCRT 2022', date: '09/03/2026' },
    { id: 'pci', label: 'PCI DSS', status: 'passed', regulation: 'Level 1 Compliance', date: '01/01/2026' },
    { id: 'privacy', label: 'Data Privacy', status: 'passed', regulation: 'NĐ 13/2023', date: '15/01/2026' },
    { id: 'iso', label: 'ISO 27001', status: 'in-progress', regulation: 'ISMS Certification', date: 'Q2 2026' },
    { id: 'report', label: 'Báo cáo NHNN', status: 'pending', regulation: 'TT 09/2024', date: '31/03/2026' },
  ];

  const statusConfig = {
    passed: { color: 'text-kapiva-green', bg: 'bg-kapiva-green/10', icon: <Check size={14} />, label: 'Đạt' },
    'in-progress': { color: 'text-kapiva-amber', bg: 'bg-kapiva-amber/10', icon: <Clock size={14} />, label: 'Đang xử lý' },
    pending: { color: 'text-muted-foreground', bg: 'bg-accent', icon: <Clock size={14} />, label: 'Chờ' },
  };

  const passedCount = complianceItems.filter(c => c.status === 'passed').length;
  const score = Math.round((passedCount / complianceItems.length) * 100);

  return (
    <motion.div variants={{ show: { transition: { staggerChildren: 0.06 } } }} initial="hidden" animate="show" className="space-y-6">
      {/* Score Overview */}
      <motion.div variants={fadeUp} className="grid md:grid-cols-4 gap-4">
        <div className="bg-card/60 border border-border/60 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Compliance Score</p>
          <p className="font-mono text-3xl font-extrabold text-kapiva-green">{score}%</p>
          <p className="text-xs text-muted-foreground mt-1">{passedCount}/{complianceItems.length} tiêu chuẩn</p>
        </div>
        <div className="bg-card/60 border border-border/60 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Mã hóa dữ liệu</p>
          <p className="text-lg font-bold text-foreground flex items-center gap-2"><Lock size={16} className="text-kapiva-green" /> AES-256</p>
          <p className="text-xs text-muted-foreground mt-1">End-to-end encryption</p>
        </div>
        <div className="bg-card/60 border border-border/60 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Audit logs</p>
          <p className="font-mono text-lg font-bold text-foreground">12,847</p>
          <p className="text-xs text-muted-foreground mt-1">30 ngày gần nhất</p>
        </div>
        <div className="bg-card/60 border border-border/60 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Data retention</p>
          <p className="text-lg font-bold text-foreground flex items-center gap-2"><Eye size={16} className="text-primary" /> 5 năm</p>
          <p className="text-xs text-muted-foreground mt-1">Theo quy định NHNN</p>
        </div>
      </motion.div>

      {/* Compliance Checklist */}
      <motion.div variants={fadeUp} className="bg-card/60 border border-border/60 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Tuân thủ pháp lý
          </h3>
          <span className="text-xs bg-kapiva-green/10 text-kapiva-green px-3 py-1 rounded-full font-medium">
            {passedCount}/{complianceItems.length} đạt chuẩn
          </span>
        </div>

        <div className="space-y-3">
          {complianceItems.map(item => {
            const config = statusConfig[item.status as keyof typeof statusConfig];
            return (
              <div key={item.id} className="flex items-center justify-between p-4 bg-accent/30 rounded-xl hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center ${config.color}`}>
                    {config.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.regulation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono">{item.date}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Data Processing */}
      <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-6">
        <div className="bg-card/60 border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-4 flex items-center gap-2">
            <FileText size={18} className="text-primary" /> Chính sách dữ liệu
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Thu thập dữ liệu', desc: 'Chỉ thu thập dữ liệu cần thiết cho đánh giá tín dụng' },
              { label: 'Lưu trữ', desc: 'Dữ liệu lưu trên server Việt Nam, mã hóa AES-256' },
              { label: 'Chia sẻ', desc: 'Không chia sẻ dữ liệu với bên thứ 3 khi chưa có đồng ý' },
              { label: 'Xóa dữ liệu', desc: 'Người dùng có quyền yêu cầu xóa dữ liệu bất cứ lúc nào' },
            ].map(policy => (
              <div key={policy.label} className="flex items-start gap-3 p-3 bg-accent/30 rounded-lg">
                <Check size={14} className="text-kapiva-green mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{policy.label}</p>
                  <p className="text-xs text-muted-foreground">{policy.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card/60 border border-border/60 rounded-2xl p-6">
          <h3 className="font-display font-bold text-foreground text-lg mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" /> Audit Trail
          </h3>
          <div className="space-y-2">
            {[
              { action: 'eKYC xác minh thành công', user: 'System', time: '14:30' },
              { action: 'Truy cập dữ liệu ngân hàng', user: 'AI Engine', time: '14:28' },
              { action: 'Credit score cập nhật', user: 'System', time: '14:25' },
              { action: 'Đăng nhập thành công', user: 'user@company.vn', time: '14:20' },
              { action: 'API key refreshed', user: 'System', time: '14:00' },
              { action: 'Backup dữ liệu', user: 'System', time: '12:00' },
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 text-xs rounded-lg hover:bg-accent/30 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-kapiva-green" />
                  <span className="text-foreground">{log.action}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{log.user}</span>
                  <span className="font-mono">{log.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
