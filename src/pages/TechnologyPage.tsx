import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Lock, Database, Cpu, ArrowRight, CheckCircle2 } from 'lucide-react';
import quantumLock from '@/assets/il-quantum-lock.svg';
import mlSpeed from '@/assets/il-ml-speed.svg';
import rlsShield from '@/assets/il-rls-shield.svg';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const PILLARS = [
  {
    icon: Lock,
    tone: 'text-primary bg-primary/10',
    title: 'Mã hóa kháng lượng tử',
    tag: 'ML-KEM-768 · NIST FIPS 203',
    img: quantumLock,
    desc: 'Dữ liệu định danh (CCCD, họ tên) được mã hóa bằng thuật toán trao đổi khóa kháng lượng tử vừa được NIST chuẩn hóa năm 2024 — an toàn kể cả trước máy tính lượng tử tương lai.',
    points: ['Chuẩn quốc tế FIPS 203', 'Chống "harvest-now, decrypt-later"', 'Khóa quản lý qua secrets manager'],
  },
  {
    icon: Zap,
    tone: 'text-mimi-green bg-mimi-green/10',
    title: 'Chấm điểm AI trong ~3 giây',
    tag: 'Machine Learning · giải thích được',
    img: mlSpeed,
    desc: 'Mô hình học máy trích 5 đặc trưng từ 12 tháng dữ liệu giao dịch thật, cho ra điểm 300–850 kèm bảng phân tích từng yếu tố — thay vì chờ nhiều ngày thẩm định thủ công.',
    points: ['5 đặc trưng tài chính thật', 'Scorecard + hồi quy logistic', 'Mỗi điểm số đều giải thích được'],
  },
  {
    icon: ShieldCheck,
    tone: 'text-[hsl(270_60%_50%)] bg-[hsl(270_60%_55%/0.1)]',
    title: 'Bảo mật RLS theo doanh nghiệp',
    tag: 'Row-Level Security',
    img: rlsShield,
    desc: 'Mỗi doanh nghiệp chỉ truy cập được đúng dữ liệu của mình — quyền được áp đặt ngay ở tầng cơ sở dữ liệu, không phụ thuộc logic phía ứng dụng.',
    points: ['Cách ly dữ liệu tài chính', 'Áp ở tầng PostgreSQL', 'An toàn kể cả khi app lỗi'],
  },
];

const PIPELINE = [
  { icon: Database, label: 'Dữ liệu giao dịch', sub: '12 tháng thu–chi, hóa đơn, khoản vay' },
  { icon: Cpu, label: 'Feature engineering', sub: '5 đặc trưng chuẩn hóa 0–100' },
  { icon: Zap, label: 'Mô hình chấm điểm', sub: 'Scorecard + logistic regression' },
  { icon: CheckCircle2, label: 'Điểm + giải thích', sub: 'Điểm 300–850 kèm yếu tố' },
];

export default function TechnologyPage() {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8 max-w-5xl">
      {/* Hero */}
      <motion.div variants={fadeUp} className="text-center pt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
          <Cpu size={13} /> Công nghệ lõi
        </span>
        <h2 className="mt-3 text-[28px] sm:text-4xl font-display font-extrabold text-foreground tracking-tight">
          Nhanh gọn. Minh bạch. An toàn chuẩn quốc tế.
        </h2>
        <p className="mt-3 text-[15px] text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Ba công nghệ nền tảng giúp doanh nghiệp nhỏ được thẩm định tín dụng trong vài giây,
          hiểu rõ vì sao, và yên tâm dữ liệu được bảo vệ ở mức cao nhất.
        </p>
      </motion.div>

      {/* Three pillars */}
      <div className="space-y-5">
        {PILLARS.map((p) => (
          <motion.div
            key={p.title}
            variants={fadeUp}
            className="bg-card border hairline rounded-3xl overflow-hidden grid md:grid-cols-2"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <div className="p-6 sm:p-8 flex flex-col justify-center order-2 md:order-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${p.tone}`}>
                  <p.icon size={20} strokeWidth={2.2} />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground font-mono">{p.tag}</span>
              </div>
              <h3 className="text-xl font-display font-bold text-foreground">{p.title}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground leading-relaxed">{p.desc}</p>
              <ul className="mt-4 space-y-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-[13px] text-foreground">
                    <CheckCircle2 size={15} className="text-mimi-green shrink-0" /> {pt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 md:order-2 p-5 sm:p-6 flex items-center justify-center bg-accent/40">
              <img src={p.img} alt={p.title} className="w-full max-w-[340px]" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pipeline "from data to score" */}
      <motion.div variants={fadeUp} className="bg-card border hairline rounded-3xl p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
          <h3 className="text-lg font-display font-bold text-foreground">Từ dữ liệu đến điểm số</h3>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mimi-green/10 text-mimi-green px-3 py-1 text-xs font-bold">
            <Zap size={13} /> Toàn bộ trong ~3 giây
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PIPELINE.map((step, i) => (
            <div key={step.label} className="relative">
              <div className="bg-accent/50 rounded-2xl p-4 h-full">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5">
                  <step.icon size={18} className="text-primary" />
                </div>
                <p className="text-[13px] font-semibold text-foreground leading-snug">{step.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{step.sub}</p>
              </div>
              {i < PIPELINE.length - 1 && (
                <ArrowRight size={16} className="hidden md:block absolute top-1/2 -right-2.5 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trust footer */}
      <motion.div variants={fadeUp} className="text-center pb-4">
        <p className="text-[13px] text-muted-foreground">
          Mã nguồn công khai tại{' '}
          <a href="https://github.com/HENNISSYNAM/mimiwallet" target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline">
            github.com/HENNISSYNAM/mimiwallet
          </a>
        </p>
      </motion.div>
    </motion.div>
  );
}
