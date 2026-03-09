import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Shield, Zap, Brain, CheckCircle, Play, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { miniChartData } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import kapivaLogo from '@/assets/kapiva-logo.png';
import heroIllustration from '@/assets/hero-illustration.png';
import dashboardPreview from '@/assets/dashboard-preview.png';
import featureSteps from '@/assets/feature-steps.png';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] as const },
});

function MetricItem({ value, suffix, label, sub, delay }: { value: number; suffix?: string; label: string; sub: string; delay: number }) {
  const { ref, isVisible } = useScrollReveal();
  const count = useCountUp(value, 1500, isVisible);
  return (
    <motion.div ref={ref} {...fadeUp(delay)} className="text-center">
      <p className="font-mono text-3xl md:text-4xl font-bold text-foreground">
        {suffix === '₫' ? `₫${count.toLocaleString('vi-VN')}` : count.toLocaleString('vi-VN')}{suffix === '%' ? '%' : suffix === ' Nghìn tỷ' ? ' Nghìn tỷ' : suffix === ' giờ' ? ' giờ' : ''}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      <p className="text-xs text-kapiva-green mt-0.5">{sub}</p>
    </motion.div>
  );
}

function HeroMockup() {
  const mockInvoices = [
    { name: 'Highlands Coffee', amount: '₫48,000,000', status: 'Chưa TT', color: 'text-kapiva-amber' },
    { name: 'Lotteria VN', amount: '₫67,500,000', status: 'Đã ứng', color: 'text-primary' },
  ];
  return (
    <motion.div
      {...fadeUp(0.5)}
      className="relative mt-12 mx-auto max-w-[600px]"
    >
      {/* Hero illustration behind the card */}
      <motion.img
        src={heroIllustration}
        alt="KAPIVA Financial Intelligence"
        className="absolute -top-20 -left-20 -right-20 w-[calc(100%+160px)] opacity-40 blur-sm pointer-events-none"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.4, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.div
        className="card-base rounded-2xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-sm"
        style={{ boxShadow: '0 40px 80px rgba(0,0,0,0.3), 0 0 40px hsla(225,100%,57%,0.1)' }}
        whileHover={{ y: -4, transition: { duration: 0.3 } }}
      >
        <div className="flex items-center gap-3 mb-4">
          <img src={kapivaLogo} alt="KAPIVA" className="w-8 h-8 rounded-full" />
          <div>
            <p className="text-sm font-semibold text-foreground">Cà phê Highlands</p>
            <p className="text-xs text-muted-foreground">TP. Hồ Chí Minh</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div className="bg-accent rounded-lg p-3" whileHover={{ scale: 1.02 }}>
            <p className="text-xs text-muted-foreground">Số dư</p>
            <p className="font-mono text-lg font-bold text-foreground">₫2.8 tỷ</p>
          </motion.div>
          <motion.div className="bg-accent rounded-lg p-3" whileHover={{ scale: 1.02 }}>
            <p className="text-xs text-muted-foreground">Credit Score</p>
            <p className="font-mono text-lg font-bold text-kapiva-green">782</p>
          </motion.div>
        </div>
        <div className="h-20 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={miniChartData}>
              <defs>
                <linearGradient id="miniGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(158,100%,43%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(158,100%,43%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="hsl(158,100%,43%)" fill="url(#miniGreen)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">
          {mockInvoices.map((inv, i) => (
            <motion.div
              key={inv.name}
              className="flex items-center justify-between bg-accent rounded-lg px-3 py-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.15 }}
            >
              <span className="text-xs text-foreground">{inv.name}</span>
              <span className="font-mono text-xs text-foreground">{inv.amount}</span>
              <span className={`text-xs ${inv.color}`}>{inv.status}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepCard({ step, icon, title, desc, tags, delay }: { step: number; icon: string; title: string; desc: string; tags?: string[]; delay: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="card-base card-hover p-6 text-center"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-4">{icon}</div>
      <div className="text-xs text-primary font-mono mb-2">Bước {step}</div>
      <h3 className="font-display font-bold text-foreground text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{desc}</p>
      {tags && (
        <div className="flex flex-wrap justify-center gap-2">
          {tags.map((t) => (
            <span key={t} className="text-xs bg-accent px-2 py-1 rounded-md text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PricingCard({ name, price, features, cta, highlighted, annual }: { name: string; price: string; features: string[]; cta: string; highlighted?: boolean; annual: boolean }) {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`card-base p-6 flex flex-col ${highlighted ? 'border-primary ring-1 ring-primary/30 scale-[1.02]' : ''}`}
    >
      <h3 className="font-display font-bold text-foreground text-lg">{name} {highlighted && '⭐'}</h3>
      <p className="font-mono text-2xl font-bold text-foreground mt-2">
        {price === 'Liên hệ' ? price : annual && price !== 'Miễn phí' ? `${Math.round(parseInt(price.replace(/\D/g, '')) * 0.8).toLocaleString('vi-VN')}₫/tháng` : price}
      </p>
      <ul className="mt-4 space-y-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check size={14} className="text-kapiva-green mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate('/register')}
        className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
          highlighted ? 'bg-primary text-primary-foreground hover:brightness-110' : 'bg-accent text-foreground hover:bg-accent/80'
        }`}
      >
        {cta}
      </button>
    </motion.div>
  );
}

function TestimonialCard({ initials, name, role, quote, metric, delay }: { initials: string; name: string; role: string; quote: string; metric: string; delay: number }) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card-base card-hover p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">{initials}</div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => <span key={i} className="text-kapiva-amber text-sm">⭐</span>)}
      </div>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{quote}"</p>
      <div className="bg-kapiva-green/10 text-kapiva-green text-xs px-3 py-1.5 rounded-lg inline-block font-mono">{metric}</div>
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaCompany, setCtaCompany] = useState('');
  const [ctaSubmitted, setCtaSubmitted] = useState(false);

  return (
    <div className="min-h-screen landing-light">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden grain-overlay bg-background">
        {/* BG layers */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 60% 40%, hsla(225,100%,57%,0.08) 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 80%, hsla(158,100%,43%,0.05) 0%, transparent 50%)' }} />
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(hsla(220,30%,20%,0.06) 1px, transparent 1px), linear-gradient(90deg, hsla(220,30%,20%,0.06) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${2 + Math.random() * 3}px`,
              height: `${2 + Math.random() * 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? 'hsl(158,100%,43%)' : 'hsl(225,100%,57%)',
              opacity: 0.25,
            }}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 10 - 5, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 12,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: Math.random() * 5,
            }}
          />
        ))}

        <div className="relative z-10 container mx-auto px-4 text-center pt-20">
          <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 border border-kapiva-green/30 bg-kapiva-green/10 px-4 py-1.5 rounded-full mb-6">
            <span className="text-sm text-foreground">🏆 Nền tảng vốn SME #1 Việt Nam</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.1)} className="font-display font-extrabold text-foreground leading-tight" style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>
            Vốn thông minh cho{' '}
            <span className="text-gradient">doanh nghiệp Việt.</span>
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="mt-6 text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed font-body">
            KAPIVA phân tích dòng tiền, hoá đơn và lịch sử giao dịch của doanh nghiệp bạn — cấp vốn lưu động trong 24 giờ. Không cần tài sản thế chấp.
          </motion.p>

          <motion.div {...fadeUp(0.3)} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={() => navigate('/register')}
              className="bg-primary text-primary-foreground px-7 py-3.5 rounded-xl font-display font-bold text-base hover:brightness-110 transition-all bg-glow-blue"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              → Bắt đầu miễn phí
            </motion.button>
            <motion.button
              className="border border-border text-foreground px-7 py-3.5 rounded-xl font-body text-sm hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center gap-2"
              whileHover={{ y: -2 }}
            >
              <Play size={14} /> Xem demo 2 phút
            </motion.button>
          </motion.div>

          <motion.div {...fadeUp(0.4)} className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            {[
              { icon: <Shield size={14} />, text: 'Bảo mật ngân hàng' },
              { icon: <Zap size={14} />, text: 'Giải ngân 24h' },
              { icon: <Brain size={14} />, text: 'AI Credit Scoring' },
              { icon: <CheckCircle size={14} />, text: 'Không thế chấp' },
            ].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {t.icon} {t.text}
                {i < 3 && <span className="ml-3 text-border">•</span>}
              </span>
            ))}
          </motion.div>

          <HeroMockup />
        </div>
      </section>

      {/* METRICS */}
      <section className="border-y border-border py-16 bg-secondary/50">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <MetricItem value={1247} label="Doanh nghiệp đang dùng" sub="+23% tháng này" delay={0} />
          <MetricItem value={2.8} suffix=" Nghìn tỷ" label="Vốn đã giải ngân" sub="↑ từ ₫1.2T năm 2024" delay={0.1} />
          <MetricItem value={24} suffix=" giờ" label="Thời gian giải ngân" sub="Trung bình" delay={0.2} />
          <MetricItem value={97} suffix="%" label="Tỷ lệ hài lòng" sub="⭐⭐⭐⭐⭐" delay={0.3} />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-background" id="features">
        <div className="container mx-auto px-4">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground text-center mb-4">
            Từ đăng ký đến nhận tiền — <span className="text-gradient">3 bước</span>
          </h2>
          {/* Feature steps illustration */}
          <motion.div
            className="max-w-3xl mx-auto mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img src={featureSteps} alt="3 bước đơn giản" className="w-full rounded-2xl" />
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <StepCard step={1} icon="🔌" title="Kết nối dữ liệu" desc="Liên kết tài khoản ngân hàng, phần mềm kế toán hoặc sàn thương mại điện tử trong 5 phút" tags={['Vietcombank', 'BIDV', 'MISA', 'Shopee']} delay={0} />
            <StepCard step={2} icon="🧠" title="AI phân tích" desc="Thuật toán AI phân tích 200+ điểm dữ liệu, chấm điểm tín dụng thời gian thực" tags={['Chỉ 90 giây']} delay={0.1} />
            <StepCard step={3} icon="💰" title="Nhận vốn" desc="Vốn được chuyển vào tài khoản ngân hàng của bạn trong vòng 24 giờ" tags={['₫100M — ₫10 tỷ']} delay={0.2} />
          </div>
        </div>
      </section>

      {/* SOLUTIONS BENTO */}
      <section className="py-24 bg-secondary/30" id="solutions">
        <div className="container mx-auto px-4">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground text-center mb-16">
            Mọi công cụ vốn <span className="text-gradient">bạn cần</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            <motion.div
              className="md:col-span-2 card-base card-hover p-6 relative overflow-hidden"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <h3 className="font-display font-bold text-foreground text-lg mb-2">Cash Flow Intelligence</h3>
              <p className="text-sm text-muted-foreground mb-4">AI dự báo dòng tiền 90 ngày tới với độ chính xác 94%</p>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={miniChartData}>
                    <defs>
                      <linearGradient id="bentoGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(158,100%,43%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(158,100%,43%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="hsl(158,100%,43%)" fill="url(#bentoGreen)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
            <motion.div className="card-base card-hover p-6" whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <h3 className="font-display font-bold text-foreground text-lg mb-2">Invoice Financing</h3>
              <p className="text-sm text-muted-foreground">Ứng tiền từ hóa đơn trong 4 giờ. Lên đến 80% giá trị hóa đơn.</p>
              <div className="mt-4 text-4xl text-center">💴 → 🏦</div>
            </motion.div>
            <motion.div className="card-base card-hover p-6" whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <h3 className="font-display font-bold text-foreground text-lg mb-2">Vay Vốn Lưu Động</h3>
              <p className="text-sm text-muted-foreground mb-3">Hạn mức đến ₫10 tỷ</p>
              <div className="flex items-center justify-center">
                <svg viewBox="0 0 120 80" className="w-24">
                  <path d="M 15 70 A 50 50 0 0 1 105 70" fill="none" stroke="hsl(220,13%,91%)" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 15 70 A 50 50 0 0 1 95 35" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" />
                  <defs><linearGradient id="gaugeGrad"><stop offset="0%" stopColor="hsl(225,100%,57%)" /><stop offset="100%" stopColor="hsl(158,100%,43%)" /></linearGradient></defs>
                  <text x="60" y="65" textAnchor="middle" fill="hsl(var(--text-primary))" fontFamily="Inter, -apple-system, sans-serif" fontWeight="800" fontSize="18">782</text>
                </svg>
              </div>
            </motion.div>
            <motion.div className="card-base card-hover p-6" whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <h3 className="font-display font-bold text-foreground text-lg mb-2">Không thế chấp</h3>
              <p className="text-sm text-muted-foreground">Chấp thuận dựa trên dữ liệu kinh doanh, không phải tài sản.</p>
              <div className="mt-3 flex justify-center">
                <CheckCircle size={48} className="text-kapiva-green" />
              </div>
            </motion.div>
            <motion.div
              className="md:col-span-2 card-base card-hover p-6 relative overflow-hidden"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <h3 className="font-display font-bold text-foreground text-lg mb-2">Real-time Dashboard</h3>
              <p className="text-sm text-muted-foreground mb-4">Theo dõi toàn bộ sức khỏe tài chính từ một màn hình</p>
              <motion.img
                src={dashboardPreview}
                alt="KAPIVA Dashboard Preview"
                className="w-full rounded-xl opacity-90"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 0.9, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24 bg-background" id="pricing">
        <div className="container mx-auto px-4">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground text-center mb-4">Bảng giá</h2>
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Hàng tháng</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`w-12 h-6 rounded-full transition-colors relative ${annual ? 'bg-primary' : 'bg-accent'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-foreground transition-transform ${annual ? 'left-7' : 'left-1'}`} />
            </button>
            <span className={`text-sm ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>Hàng năm <span className="text-kapiva-green">-20%</span></span>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <PricingCard name="Free" price="Miễn phí" features={['Phân tích cơ bản', '1 tài khoản NH', 'Báo cáo tháng']} cta="Bắt đầu" annual={annual} />
            <PricingCard name="Growth" price="990,000₫/tháng" features={['AI Forecasting', 'Ứng hóa đơn 5 tỷ', 'Không giới hạn NH', 'Hỗ trợ ưu tiên', '14 ngày dùng thử']} cta="Dùng thử 14 ngày" highlighted annual={annual} />
            <PricingCard name="Enterprise" price="Liên hệ" features={['Hạn mức custom', 'White-label', 'API access', 'Account manager', 'SLA 99.9%']} cta="Liên hệ sales" annual={annual} />
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground text-center mb-16">Khách hàng nói gì</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <TestimonialCard initials="NT" name="Nguyễn Thành" role="CEO, Phúc Lộc Foods" quote="Trước đây mỗi tháng đều lo tiền nhập hàng. Giờ KAPIVA lo hết, tôi chỉ cần focus bán hàng." metric="Cash cycle: 45 ngày → 8 ngày" delay={0} />
            <TestimonialCard initials="MC" name="Minh Châu" role="CFO, Chuỗi nhà hàng 9 chi nhánh" quote="Dashboard dự báo dòng tiền giúp tôi tránh được một lần thiếu hụt tiền lương nhân viên." metric="Tiết kiệm 3 ngày/tháng kế toán" delay={0.1} />
            <TestimonialCard initials="ĐH" name="Đức Huy" role="Founder, XNK Đức Phát" quote="Hóa đơn xuất khẩu ứng được 80%, giải ngân trong 4 tiếng. Không ngân hàng nào làm được vậy." metric="₫2.4 tỷ đã được ứng vốn" delay={0.2} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-kapiva-green/5" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mb-4">Sẵn sàng tăng tốc dòng tiền?</h2>
          <p className="text-muted-foreground mb-8">Đăng ký miễn phí — không cần thẻ tín dụng</p>
          {ctaSubmitted ? (
            <motion.div {...fadeUp(0)} className="card-base p-6 max-w-md mx-auto">
              <CheckCircle size={40} className="text-kapiva-green mx-auto mb-3" />
              <p className="text-foreground font-semibold">Cảm ơn bạn! Chúng tôi sẽ liên hệ sớm.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
              <input value={ctaEmail} onChange={e => setCtaEmail(e.target.value)} placeholder="Email doanh nghiệp" className="w-full sm:w-auto flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_hsla(var(--blue-500)/0.08)] transition-all" />
              <input value={ctaCompany} onChange={e => setCtaCompany(e.target.value)} placeholder="Tên công ty" className="w-full sm:w-auto flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:shadow-[0_0_0_3px_hsla(var(--blue-500)/0.08)] transition-all" />
              <motion.button
                onClick={async () => {
                  if (!ctaEmail || !ctaCompany) return;
                  try {
                    const params = new URLSearchParams(window.location.search);
                    await supabase.from('waitlist').insert({
                      email: ctaEmail,
                      company_name: ctaCompany,
                      utm_source: params.get('utm_source'),
                      utm_medium: params.get('utm_medium'),
                      utm_campaign: params.get('utm_campaign'),
                    });
                    setCtaSubmitted(true);
                    toast.success('Đã đăng ký thành công!');
                  } catch {
                    toast.error('Có lỗi xảy ra, vui lòng thử lại.');
                  }
                }}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-xl font-display font-bold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Bắt đầu ngay <ArrowRight size={14} />
              </motion.button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
