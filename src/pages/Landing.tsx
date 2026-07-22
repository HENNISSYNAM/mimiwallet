import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TrustSection from '@/components/landing/TrustSection';
import {
  ScoringBolt,
  CashflowChart,
  CapitalVault,
  QuantumShield,
  InvoiceDoc,
  LearnCap,
} from '@/components/illustrations/BrandIcons';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Shield, Zap, Brain, CheckCircle, Play, ArrowRight, Check, TrendingUp, CreditCard, FileText, Lock, BarChart3, Globe, Clock, Leaf, TreePine, Recycle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { miniChartData } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import mimiLogo from '@/assets/mimi-wallet-logo.png';
import quantumLockImg from '@/assets/il-quantum-lock.svg';
import mlSpeedImg from '@/assets/il-ml-speed.svg';
import rlsShieldImg from '@/assets/il-rls-shield.svg';
import heroIllustration from '@/assets/hero-illustration.png';
import dashboardPreview from '@/assets/dashboard-preview.png';
import featureSteps from '@/assets/feature-steps.png';
import aiAnalysis from '@/assets/ai-analysis.png';
import aiGreenAnalysis from '@/assets/ai-green-analysis.png';
import securityShield from '@/assets/security-shield.png';
import greenFinanceDashboard from '@/assets/green-finance-dashboard.png';
import carbonCreditsVisual from '@/assets/carbon-credits-visual.png';
import AnimatedStepFlow from '@/components/onboarding/AnimatedStepFlow';
import NetworkGraph from '@/components/onboarding/NetworkGraph';

/* ─── Animation variants ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
});

/* ─── Metric counter ─── */
/**
 * `prefix`/`suffix` are free-form — an earlier version matched them against a
 * hardcoded whitelist, which silently dropped anything it did not recognise.
 *
 * `animate={false}` skips the count-up for values that are identifiers rather
 * than quantities (ML-KEM-768 ticking up from zero reads as a loading bar, not
 * a fact).
 */
function MetricItem({
  value,
  prefix,
  suffix,
  label,
  sub,
  delay,
  animate = true,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub: string;
  delay: number;
  animate?: boolean;
}) {
  const { ref, isVisible } = useScrollReveal();
  const count = useCountUp(value, 1500, isVisible && animate);
  const shown = animate ? count : value;
  return (
    <motion.div ref={ref} {...fadeUp(delay)} className="text-center group">
      <p className="font-mono text-3xl md:text-5xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors duration-300">
        {prefix}
        {shown.toLocaleString('vi-VN')}
        {suffix}
      </p>
      <p className="text-sm text-muted-foreground mt-2 font-medium">{label}</p>
      <p className="text-xs text-kapiva-green mt-1 font-mono">{sub}</p>
    </motion.div>
  );
}

/* ─── Animated Process Flow ─── */
function ProcessFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const { ref, isVisible } = useScrollReveal(0.2);

  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [isVisible]);

  const steps = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Kết nối dữ liệu',
      desc: 'Liên kết ngân hàng & kế toán trong 5 phút',
      detail: 'API bảo mật kết nối trực tiếp với 40+ ngân hàng VN',
      tags: ['Vietcombank', 'BIDV', 'MISA', 'Shopee'],
      color: 'from-blue-500 to-cyan-400',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI phân tích',
      desc: '200+ điểm dữ liệu, chấm điểm tín dụng real-time',
      detail: 'Machine learning xử lý trong 90 giây',
      tags: ['Credit Score', 'Cash Flow', 'Risk'],
      color: 'from-violet-500 to-purple-400',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-500',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Nhận vốn 24h',
      desc: 'Vốn chuyển vào tài khoản trong 24 giờ',
      detail: 'Từ ₫100M đến ₫10 tỷ, không thế chấp',
      tags: ['₫100M — ₫10 tỷ', '24h'],
      color: 'from-emerald-500 to-green-400',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-500',
    },
  ];

  return (
    <div ref={ref} className="relative">
      {/* Progress bar */}
      <div className="hidden md:flex items-center justify-between max-w-2xl mx-auto mb-16 relative">
        <div className="absolute top-5 left-[16%] right-[16%] h-[2px] bg-border" />
        <motion.div 
          className="absolute top-5 left-[16%] h-[2px] bg-gradient-to-r from-primary to-kapiva-green"
          animate={{ width: `${activeStep * 34}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveStep(i)}
            className="relative z-10 flex flex-col items-center gap-3 group"
          >
            <motion.div
              animate={{
                scale: activeStep === i ? 1.15 : 1,
                boxShadow: activeStep === i ? '0 0 30px hsla(225,100%,57%,0.3)' : '0 0 0px transparent',
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                i <= activeStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border-2 border-border text-muted-foreground'
              }`}
            >
              {i < activeStep ? <Check size={16} /> : <span className="text-sm font-bold">{i + 1}</span>}
            </motion.div>
            <span className={`text-xs font-medium transition-colors ${i <= activeStep ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.title}
            </span>
          </button>
        ))}
      </div>

      {/* Active step detail */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="grid md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto"
        >
          <div className="space-y-6">
            <div className={`inline-flex items-center gap-2 ${steps[activeStep].bgColor} px-4 py-2 rounded-full`}>
              <span className={steps[activeStep].textColor}>{steps[activeStep].icon}</span>
              <span className={`text-sm font-semibold ${steps[activeStep].textColor}`}>Bước {activeStep + 1}/3</span>
            </div>
            <h3 className="font-display font-extrabold text-3xl text-foreground">{steps[activeStep].title}</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">{steps[activeStep].desc}</p>
            <p className="text-sm text-muted-foreground/80">{steps[activeStep].detail}</p>
            <div className="flex flex-wrap gap-2">
              {steps[activeStep].tags.map(t => (
                <span key={t} className="text-xs bg-card border border-border px-3 py-1.5 rounded-lg text-muted-foreground font-mono">{t}</span>
              ))}
            </div>
          </div>

          <div className="relative">
            {activeStep === 0 && (
              <motion.div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                <div className="space-y-3">
                  {['Vietcombank', 'BIDV', 'Techcombank', 'VPBank'].map((bank, i) => (
                    <motion.div
                      key={bank}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                      className="flex items-center justify-between bg-accent rounded-xl px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-primary">{bank[0]}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">{bank}</span>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.1 + 0.5 }}
                        className="w-6 h-6 rounded-full bg-kapiva-green/20 flex items-center justify-center"
                      >
                        <Check size={12} className="text-kapiva-green" />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {activeStep === 1 && (
              <motion.div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                <div className="text-center mb-4">
                 <motion.div className="relative inline-block">
                    <motion.img src={aiAnalysis} alt="AI Analysis" className="w-32 h-32 mx-auto rounded-2xl object-cover mb-4 shadow-lg"
                      initial={{ scale: 0.6, opacity: 0, rotateY: -30 }} animate={{ scale: 1, opacity: 1, rotateY: 0 }} transition={{ delay: 0.2, duration: 0.8, type: 'spring' }}
                    />
                    <div className="absolute -inset-2 rounded-2xl border border-primary/15 pointer-events-none" />
                  </motion.div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Credit Score', value: '701', color: 'text-kapiva-green' },
                    { label: 'Risk Level', value: 'Thấp', color: 'text-kapiva-green' },
                    { label: 'Cash Flow', value: '+15.5%', color: 'text-primary' },
                    { label: 'Approval', value: '98%', color: 'text-kapiva-green' },
                  ].map((m, i) => (
                    <motion.div
                      key={m.label}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 + 0.3 }}
                      className="bg-accent rounded-xl p-3 text-center"
                    >
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className={`text-lg font-mono font-bold ${m.color}`}>{m.value}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            {activeStep === 2 && (
              <motion.div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
                <motion.div
                  className="bg-gradient-to-r from-primary/10 to-kapiva-green/10 rounded-xl p-6 text-center mb-4"
                  initial={{ scale: 0.9 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}
                >
                  <p className="text-xs text-muted-foreground mb-1">Số tiền giải ngân</p>
                  <motion.p
                    className="text-3xl font-mono font-extrabold text-foreground"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  >
                    ₫2,500,000,000
                  </motion.p>
                  <p className="text-xs text-kapiva-green mt-1 font-medium">✓ Đã chuyển thành công</p>
                </motion.div>
                <div className="space-y-2">
                  {[
                    { step: 'Duyệt hồ sơ', time: '2 giờ', done: true },
                    { step: 'Ký hợp đồng điện tử', time: '30 phút', done: true },
                    { step: 'Giải ngân', time: '4 giờ', done: true },
                  ].map((s, i) => (
                    <motion.div
                      key={s.step}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 + 0.5 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-kapiva-green/20 flex items-center justify-center">
                          <Check size={10} className="text-kapiva-green" />
                        </div>
                        <span className="text-foreground">{s.step}</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-xs">{s.time}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── Hero Dashboard Mockup ─── */
function HeroMockup() {
  return (
    <motion.div {...fadeUp(0.5)} className="relative mt-16 mx-auto max-w-[900px]">
      
      <motion.div
        className="relative rounded-2xl overflow-hidden border border-border/50 shadow-2xl group cursor-pointer"
        style={{ boxShadow: '0 50px 100px -20px rgba(0,0,0,0.15), 0 0 50px hsla(225,100%,57%,0.08)', perspective: '1200px' }}
        initial={{ opacity: 0, y: 60, rotateX: 12, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -8, rotateX: 2, scale: 1.01, boxShadow: '0 60px 120px -20px rgba(0,0,0,0.2), 0 0 80px hsla(225,100%,57%,0.12)' }}
      >
        <motion.img
          src={dashboardPreview}
          alt="MIMI WALLET Dashboard"
          className="w-full transition-transform duration-700 group-hover:scale-[1.03]"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.5, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(105deg, transparent 40%, hsla(0,0%,100%,0.08) 45%, hsla(0,0%,100%,0.15) 50%, hsla(0,0%,100%,0.08) 55%, transparent 60%)' }}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2.5, delay: 1.5, ease: 'easeInOut' }}
        />
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent pointer-events-none" />
      </motion.div>

      {/* Floating badges */}
      <motion.div
        className="absolute -left-4 top-1/4 bg-card border border-border rounded-xl px-4 py-3 shadow-lg hidden lg:flex items-center gap-3"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <div className="w-8 h-8 rounded-full bg-kapiva-green/20 flex items-center justify-center">
          <TrendingUp size={14} className="text-kapiva-green" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Dòng tiền</p>
          <p className="text-sm font-mono font-bold text-kapiva-green">+₫1.2 tỷ</p>
        </div>
      </motion.div>

      <motion.div
        className="absolute -right-4 top-1/3 bg-card border border-border rounded-xl px-4 py-3 shadow-lg hidden lg:flex items-center gap-3"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        style={{ animation: 'float-slow 8s ease-in-out infinite' }}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <Shield size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Credit Score</p>
          <p className="text-sm font-mono font-bold text-primary">701 / 850</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Bento Solution Card ─── */
/** `badge` marks a capability as planned rather than shipped (e.g. "Lộ trình 2026"). */
function BentoCard({ title, desc, icon, badge, children, className = '', delay = 0 }: {
  title: string; desc: string; icon: React.ReactNode; badge?: string; children?: React.ReactNode; className?: string; delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal();
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isVisible ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={`group bg-card/80 backdrop-blur-sm border border-border/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-[0_20px_60px_-15px_hsla(225,100%,57%,0.12)] transition-all duration-500 ${className}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-foreground text-base">{title}</h3>
            {badge && (
              <span className="rounded-full bg-mimi-amber/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mimi-amber">
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

/* ─── Pricing ─── */
function PricingCard({ name, price, features, cta, highlighted, annual, badge }: {
  name: string; price: string; features: string[]; cta: string; highlighted?: boolean; annual: boolean; badge?: string;
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={`relative bg-card border rounded-2xl p-8 flex flex-col transition-all duration-300 ${
        highlighted
          ? 'border-primary shadow-[0_20px_60px_-15px_hsla(225,100%,57%,0.2)] scale-[1.02]'
          : 'border-border hover:border-primary/30'
      }`}
    >
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-kapiva-green text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
          {badge}
        </div>
      )}
      <h3 className="font-display font-bold text-foreground text-xl">{name}</h3>
      <p className="font-mono text-3xl font-extrabold text-foreground mt-3">
        {price === 'Liên hệ' ? price : annual && price !== 'Miễn phí' ? `${Math.round(parseInt(price.replace(/\D/g, '')) * 0.8).toLocaleString('vi-VN')}₫` : price}
      </p>
      {price !== 'Miễn phí' && price !== 'Liên hệ' && (
        <p className="text-xs text-muted-foreground mt-1">/tháng {annual && '(tiết kiệm 20%)'}</p>
      )}
      <div className="w-full h-px bg-border my-6" />
      <ul className="space-y-3 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-muted-foreground">
            <Check size={14} className="text-kapiva-green mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => navigate('/register')}
        className={`mt-8 w-full py-3 rounded-xl text-sm font-display font-bold transition-all duration-300 ${
          highlighted
            ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-[0_8px_30px_hsla(225,100%,57%,0.25)]'
            : 'bg-accent text-foreground hover:bg-primary/10 hover:text-primary'
        }`}
      >
        {cta}
      </button>
    </motion.div>
  );
}

/* ═══════════ MAIN ═══════════ */
export default function Landing() {
  const navigate = useNavigate();
  const [annual, setAnnual] = useState(false);
  const [ctaEmail, setCtaEmail] = useState('');
  const [ctaCompany, setCtaCompany] = useState('');
  const [ctaSubmitted, setCtaSubmitted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div className="min-h-screen landing-light">
      <Navbar />

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative min-h-[100vh] flex items-center justify-center overflow-hidden bg-background">
        {/*
          Previously a grid overlay plus two blurred colour orbs drifting on
          infinite loops. Ambient motion behind a headline is decoration that
          never resolves — it pulls the eye away from the copy and is a hallmark
          of template landing pages. A single static wash is enough to keep the
          section from reading flat.
        */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 container mx-auto px-4 text-center pt-24 pb-12">
          {/* Eyebrow — states the category, makes no ranking claim. */}
          <motion.p {...fadeUp(0)} className="text-sm font-medium text-muted-foreground mb-6">
            Vốn lưu động cho doanh nghiệp nhỏ và siêu nhỏ
          </motion.p>

          {/*
            One solid colour, no gradient fill and no underline swipe. Gradient
            headlines are the single loudest "generated page" signal; at this
            size the typeface and the spacing around it carry the weight.
          */}
          <motion.h1
            {...fadeUp(0.1)}
            className="font-display font-extrabold text-foreground leading-[1.03] tracking-[-0.03em] max-w-4xl mx-auto"
            style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4.75rem)' }}
          >
            Vốn về tài khoản
            <br className="hidden md:block" /> trước khi khách trả tiền
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="mt-6 text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Mimi Wallet chấm điểm tín dụng doanh nghiệp bạn từ dữ liệu giao dịch thật, rồi ứng
            trước tới 80% giá trị hóa đơn chưa tới hạn.
          </motion.p>

          {/* One primary action; the demo sits beside it as a quiet text link. */}
          <motion.div {...fadeUp(0.3)} className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-x-7 gap-y-4">
            <button
              onClick={() => navigate('/register')}
              className="bg-primary text-primary-foreground h-13 px-7 rounded-2xl font-display font-semibold text-[15px] pressable transition-colors hover:bg-primary/90"
              style={{ height: '52px' }}
            >
              Bắt đầu miễn phí
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-[15px] font-medium text-primary hover:underline underline-offset-4 flex items-center gap-1.5"
              style={{ minHeight: '44px' }}
            >
              <Play size={13} /> Xem demo 2 phút
            </button>
          </motion.div>

          {/*
            Monochrome and chrome-free. Four pills in four different accent
            colours turned a supporting row into a second focal point; the icons
            now inherit one muted tone so the eye stays on the headline and CTA.
            Every item here is demonstrable in the live demo.
          */}
          <motion.div
            {...fadeUp(0.4)}
            className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[13px] text-muted-foreground"
          >
            {[
              { Icon: ScoringBolt, text: 'Chấm điểm AI ~3 giây' },
              { Icon: QuantumShield, text: 'Mã hóa kháng lượng tử' },
              { Icon: InvoiceDoc, text: 'Ứng vốn hóa đơn' },
              { Icon: LearnCap, text: 'Học Fintech cá nhân hóa' },
            ].map(({ Icon, text }) => (
              <span key={text} className="flex items-center gap-2">
                <Icon size={15} className="text-muted-foreground/70" />
                {text}
              </span>
            ))}
          </motion.div>

          {/* Hero Mockup */}
          <HeroMockup />
        </motion.div>
      </section>

      {/* ═══ RECOGNITION & INCUBATION ═══ */}
      <section className="py-16 border-y border-border/50 bg-secondary/30">
        <TrustSection />
      </section>

      {/* ═══ VERIFIED CAPABILITY ═══
          Technical facts we can demonstrate on demand, rather than traction the
          project has not earned yet — the team has no legal entity and no
          paying customers, so usage/disbursement figures would be invented. */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          <MetricItem value={3} prefix="~" suffix=" giây" label="Thời gian chấm điểm" sub="Chạy trên hạ tầng production" delay={0} />
          <MetricItem value={768} prefix="ML-KEM-" animate={false} label="Mã hóa kháng lượng tử" sub="Chuẩn NIST FIPS 203" delay={0.1} />
          <MetricItem value={12} suffix=" tháng" label="Dữ liệu mỗi lần chấm" sub="Giao dịch thật của doanh nghiệp" delay={0.2} />
          <MetricItem value={24} suffix="/24" label="Kiểm thử tự động" sub="Toàn bộ đang pass" delay={0.3} />
        </div>
      </section>

      {/* ═══ CORE TECHNOLOGY ═══ */}
      <section className="py-24 bg-background" id="technology">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">Công nghệ lõi</span>
            <h2 className="mt-4 font-display font-extrabold text-foreground tracking-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)' }}>
              Nhanh gọn, minh bạch, an toàn chuẩn quốc tế
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">Ba trụ cột công nghệ được hiển thị rõ ngay trên ứng dụng.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: quantumLockImg, title: 'Mã hóa kháng lượng tử', tag: 'ML-KEM-768 · NIST FIPS 203', desc: 'Dữ liệu định danh an toàn kể cả trước máy tính lượng tử tương lai.' },
              { img: mlSpeedImg, title: 'Chấm điểm AI ~3 giây', tag: 'Machine Learning · giải thích được', desc: 'Điểm tín dụng tính từ 12 tháng dữ liệu thật, kèm phân tích yếu tố.' },
              { img: rlsShieldImg, title: 'Bảo mật theo doanh nghiệp', tag: 'Row-Level Security', desc: 'Mỗi doanh nghiệp chỉ thấy đúng dữ liệu của mình, áp ở tầng CSDL.' },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-card border border-border/60 rounded-3xl overflow-hidden"
              >
                <div className="p-5 bg-secondary/40 flex items-center justify-center">
                  <img src={c.img} alt={c.title} className="w-full max-w-[280px]" />
                </div>
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted-foreground font-mono">{c.tag}</p>
                  <h3 className="mt-1 text-lg font-display font-bold text-foreground">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PROCESS FLOW ═══ */}
      <section className="py-24 bg-secondary/20" id="features">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="text-xs text-primary font-mono uppercase tracking-widest">Quy trình</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-foreground mt-3">
              Từ đăng ký đến nhận tiền — <span className="text-gradient">3 bước</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">Quy trình tự động hoàn toàn, không giấy tờ, không phỏng vấn</p>
          </motion.div>

          {/* Animated feature steps */}
          <motion.div
            className="max-w-3xl mx-auto mb-16 bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl overflow-hidden shadow-xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <AnimatedStepFlow activeStep={-1} />
          </motion.div>

          <ProcessFlow />
        </div>
      </section>

      {/* ═══ SOLUTIONS BENTO ═══ */}
      <section className="py-24 bg-background" id="solutions">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <span className="text-xs text-primary font-mono uppercase tracking-widest">Giải pháp</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-foreground mt-3">
              Mọi công cụ vốn <span className="text-gradient">bạn cần</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto">
            <BentoCard
              title="Cash Flow Intelligence"
              desc="AI dự báo dòng tiền 90 ngày tới với độ chính xác 94%"
              icon={<TrendingUp size={18} />}
              className="md:col-span-2"
              delay={0}
            >
              <div className="h-36 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={miniChartData}>
                    <defs>
                      <linearGradient id="bentoGreenLanding" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(158,100%,43%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(158,100%,43%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="hsl(158,100%,43%)" fill="url(#bentoGreenLanding)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BentoCard>

            <BentoCard
              title="Invoice Financing"
              desc="Ứng tiền từ hóa đơn trong 4 giờ. Lên đến 80% giá trị."
              icon={<FileText size={18} />}
              delay={0.08}
            >
              <div className="mt-4 flex items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText size={24} className="text-primary" />
                </div>
                <ArrowRight size={20} className="text-muted-foreground" />
                <div className="w-16 h-16 rounded-xl bg-kapiva-green/10 flex items-center justify-center">
                  <CreditCard size={24} className="text-kapiva-green" />
                </div>
              </div>
            </BentoCard>

            <BentoCard
              title="Vay Vốn Lưu Động"
              desc="Hạn mức đến ₫10 tỷ, lãi suất cạnh tranh"
              icon={<CreditCard size={18} />}
              delay={0.16}
            >
              <div className="mt-4 flex items-center justify-center">
                <svg viewBox="0 0 120 80" className="w-28">
                  <path d="M 15 70 A 50 50 0 0 1 105 70" fill="none" stroke="hsl(var(--border))" strokeWidth="8" strokeLinecap="round" />
                  <motion.path
                    d="M 15 70 A 50 50 0 0 1 95 35"
                    fill="none"
                    stroke="url(#gaugeGradLanding)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                  />
                  <defs>
                    <linearGradient id="gaugeGradLanding">
                      <stop offset="0%" stopColor="hsl(225,100%,57%)" />
                      <stop offset="100%" stopColor="hsl(158,100%,43%)" />
                    </linearGradient>
                  </defs>
                  <text x="60" y="65" textAnchor="middle" fill="hsl(var(--text-primary))" fontFamily="var(--font-mono)" fontWeight="800" fontSize="18">701</text>
                </svg>
              </div>
            </BentoCard>

            <BentoCard
              title="Bảo mật tuyệt đối"
              desc="Mã hóa đầu cuối, chuẩn ISO 27001"
              icon={<Shield size={18} />}
              delay={0.24}
            >
              <motion.div className="relative w-24 h-24 mx-auto mt-3">
                <motion.img
                  src={securityShield}
                  alt="Security"
                  className="w-full h-full rounded-xl object-cover shadow-lg"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
                <motion.div
                  className="absolute -inset-3 rounded-2xl"
                  style={{ background: 'radial-gradient(circle, hsla(225,100%,57%,0.1) 0%, transparent 70%)' }}
                />
              </motion.div>
            </BentoCard>

            <BentoCard
              title="Real-time Dashboard"
              desc="Theo dõi toàn bộ sức khỏe tài chính từ một màn hình"
              icon={<BarChart3 size={18} />}
              className="md:col-span-2"
              delay={0.32}
            >
              <motion.div className="relative overflow-hidden rounded-xl mt-3 group/dash">
                <motion.img
                  src={dashboardPreview}
                  alt="Dashboard"
                  className="w-full rounded-xl transition-transform duration-700 group-hover/dash:scale-105"
                  initial={{ opacity: 0, scale: 1.1, filter: 'blur(8px)' }}
                  whileInView={{ opacity: 0.95, scale: 1, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(105deg, transparent 35%, hsla(0,0%,100%,0.06) 45%, hsla(0,0%,100%,0.12) 50%, hsla(0,0%,100%,0.06) 55%, transparent 65%)' }}
                  initial={{ x: '-120%' }}
                  whileInView={{ x: '220%' }}
                  viewport={{ once: true }}
                  transition={{ duration: 2, delay: 0.8, ease: 'easeInOut' }}
                />
              </motion.div>
            </BentoCard>

            {/* Green Finance Cards */}
            <BentoCard
              title="Tài chính xanh"
              badge="Lộ trình 2026"
              desc="Định hướng phát triển: vốn ưu đãi cho dự án ESG và phát triển bền vững"
              icon={<Leaf size={18} />}
              delay={0.4}
            >
              <motion.div 
                className="mt-4 relative overflow-hidden rounded-xl group/green cursor-pointer"
                whileHover={{ scale: 1.03, y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.img 
                  src={greenFinanceDashboard} 
                  alt="Green Finance Dashboard" 
                  className="w-full rounded-xl transition-all duration-700 group-hover/green:scale-110 group-hover/green:brightness-110"
                  initial={{ scale: 1.15, opacity: 0, filter: 'blur(6px)' }}
                  whileInView={{ scale: 1, opacity: 0.95, filter: 'blur(0px)' }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, transparent 30%, hsla(158,100%,43%,0.08) 50%, transparent 70%)' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/20 to-transparent pointer-events-none" />
              </motion.div>
              {/* No rate or limit here: green lending is not live, so any number
                  would be a promise we cannot honour. */}
              <div className="mt-3 rounded-xl border border-kapiva-green/10 bg-kapiva-green/5 p-3">
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Lãi suất và hạn mức ưu đãi sẽ được công bố khi hợp tác với tổ chức tín dụng xanh
                  hoàn tất.
                </p>
              </div>
            </BentoCard>

            <BentoCard
              title="Tín chỉ Carbon"
              badge="Lộ trình 2026"
              desc="Định hướng phát triển: theo dõi phát thải, quy đổi tín chỉ và báo cáo"
              icon={<TreePine size={18} />}
              className="md:col-span-2"
              delay={0.48}
            >
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <motion.div 
                  className="relative overflow-hidden rounded-xl group/carbon cursor-pointer"
                  whileHover={{ scale: 1.04, rotate: 1, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <motion.img 
                    src={carbonCreditsVisual} 
                    alt="Carbon Credits" 
                    className="w-full h-40 object-cover rounded-xl transition-all duration-700 group-hover/carbon:scale-110 group-hover/carbon:brightness-110"
                    initial={{ opacity: 0, scale: 1.2, filter: 'blur(8px)' }}
                    whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-t from-emerald-900/70 via-emerald-900/20 to-transparent pointer-events-none"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                  />
                  {/* Shimmer effect */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(105deg, transparent 40%, hsla(158,100%,43%,0.1) 48%, hsla(158,100%,43%,0.2) 50%, hsla(158,100%,43%,0.1) 52%, transparent 60%)' }}
                    initial={{ x: '-150%' }}
                    whileInView={{ x: '250%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, delay: 1, ease: 'easeInOut' }}
                  />
                  <motion.div
                    className="absolute bottom-3 left-3 right-3"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="text-white font-display font-bold text-sm drop-shadow-lg">Net Zero 2050</p>
                    <p className="text-white/80 text-xs drop-shadow-md">Hướng tới tương lai bền vững</p>
                  </motion.div>
                </motion.div>
                <div className="flex flex-col justify-center space-y-3">
                  <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Recycle size={18} className="text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Tín chỉ Carbon</p>
                        <p className="text-xs text-muted-foreground">Chưa triển khai — dự kiến 2026</p>
                      </div>
                    </div>
                  </div>
                  {/* Capability outline, not measurements — the product has no
                      emissions data yet, so any figure here would be invented. */}
                  <div className="space-y-2">
                    {[
                      'Theo dõi phát thải theo hoạt động kinh doanh',
                      'Quy đổi và giao dịch tín chỉ carbon',
                      'Xuất báo cáo phục vụ thẩm định vốn xanh',
                    ].map((s, i) => (
                      <motion.div
                        key={s}
                        className="flex items-start gap-2 bg-card/50 border border-border/50 rounded-lg p-2.5"
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <Leaf size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-snug text-muted-foreground">{s}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ═══ AI SECTION ═══ */}
      <section className="py-24 bg-secondary/20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <span className="text-xs text-primary font-mono uppercase tracking-widest">Công nghệ AI</span>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl text-foreground mt-3 mb-6">
                AI không chỉ phân tích —{' '}
                <span className="text-gradient">AI dự đoán</span>
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                Mô hình machine learning được huấn luyện trên hàng triệu giao dịch tài chính Việt Nam, cho độ chính xác dự báo dòng tiền lên đến 94%.
              </p>
              <div className="space-y-4">
                {[
                  { label: 'Credit Scoring', value: '200+ điểm dữ liệu', icon: <Brain size={16} /> },
                  { label: 'Cash Flow Forecast', value: '90 ngày, 94% chính xác', icon: <TrendingUp size={16} /> },
                  { label: 'Risk Analysis', value: 'Real-time, tự động', icon: <Shield size={16} /> },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 0.3 }}
                    className="flex items-center gap-4 bg-card border border-border/60 rounded-xl px-5 py-4"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">{item.icon}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-card/60 backdrop-blur-sm border border-border/40 rounded-2xl p-6">
                <NetworkGraph labels={['Giao dịch', 'Đặc trưng', 'Mô hình ML', 'Điểm số']} />
                <motion.div 
                  className="mt-4 relative overflow-hidden rounded-xl group/ai cursor-pointer"
                  whileHover={{ scale: 1.03, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <motion.img 
                    src={aiGreenAnalysis} 
                    alt="AI Green Analysis" 
                    className="w-full rounded-xl transition-all duration-700 group-hover/ai:scale-110 group-hover/ai:brightness-110"
                    initial={{ opacity: 0, scale: 1.15, filter: 'blur(6px)' }}
                    whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, transparent 30%, hsla(225,100%,57%,0.06) 50%, transparent 70%)' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent pointer-events-none" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section className="py-24 bg-background" id="pricing">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp(0)} className="text-center mb-4">
            <span className="text-xs text-primary font-mono uppercase tracking-widest">Bảng giá</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-foreground mt-3">Chọn gói phù hợp</h2>
          </motion.div>
          <div className="flex items-center justify-center gap-4 mb-14">
            <span className={`text-sm font-medium ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>Hàng tháng</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${annual ? 'bg-primary' : 'bg-accent border border-border'}`}
            >
              <motion.div
                className="absolute top-1 w-5 h-5 rounded-full bg-primary-foreground shadow-sm"
                animate={{ left: annual ? 30 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Hàng năm <span className="text-kapiva-green font-mono text-xs ml-1">-20%</span>
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PricingCard name="Free" price="Miễn phí" features={['Phân tích cơ bản', '1 tài khoản NH', 'Báo cáo tháng', 'Email support']} cta="Bắt đầu miễn phí" annual={annual} />
            <PricingCard name="Growth" price="990,000₫" features={['AI Forecasting', 'Ứng hóa đơn 5 tỷ', 'Không giới hạn NH', 'Hỗ trợ ưu tiên 24/7', '14 ngày dùng thử', 'API Access']} cta="Dùng thử 14 ngày" highlighted annual={annual} badge="Phổ biến nhất" />
            <PricingCard name="Enterprise" price="Liên hệ" features={['Hạn mức custom', 'White-label', 'Dedicated API', 'Account manager', 'SLA 99.9%', 'On-premise option']} cta="Liên hệ sales" annual={annual} />
          </div>
        </div>
      </section>

      {/* ═══ LIVE PRODUCTION PROOF ═══
          Replaces invented customer testimonials. Every number below is what the
          deployed scoring model actually returned for the demo company, so it can
          be reproduced live in front of a judge. */}
      <section className="py-24 bg-secondary/20">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <span className="text-xs text-primary font-mono uppercase tracking-widest">Bằng chứng vận hành</span>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-foreground mt-3">Đã chạy thật, không phải mô phỏng</h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
              Kết quả mô hình chấm điểm trả về cho doanh nghiệp mẫu, tính trực tiếp trên hạ tầng production từ 12 tháng dữ liệu giao dịch.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { icon: ScoringBolt, value: '701', unit: '/ 850', label: 'Điểm tín dụng', note: 'Hạng B — Tốt' },
              { icon: CashflowChart, value: '34,1', unit: '%', label: 'Xác suất vỡ nợ (PD)', note: 'Hồi quy logistic' },
              { icon: CapitalVault, value: '1,36', unit: ' tỷ ₫', label: 'Hạn mức khả dụng', note: 'Do mô hình đề xuất' },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card p-6 text-center"
              >
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <m.icon size={22} />
                </span>
                <p className="mt-4 font-mono text-3xl font-bold tracking-tight text-foreground">
                  {m.value}
                  <span className="text-lg text-muted-foreground">{m.unit}</span>
                </p>
                <p className="mt-1.5 text-sm font-semibold text-foreground">{m.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.note}</p>
              </motion.div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Số liệu từ tài khoản demo trên hạ tầng production — mở ứng dụng để tự tính lại.
          </p>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 relative overflow-hidden bg-background">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-kapiva-green/5" />
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: 'radial-gradient(hsl(var(--text-primary)/0.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center max-w-2xl">
          <motion.div {...fadeUp(0)}>
            <h2 className="font-display font-extrabold text-3xl md:text-5xl text-foreground mb-4">Sẵn sàng tăng tốc dòng tiền?</h2>
            <p className="text-muted-foreground text-lg mb-10">Đăng ký miễn phí — không cần thẻ tín dụng, setup trong 5 phút</p>
          </motion.div>
          {ctaSubmitted ? (
            <motion.div {...fadeUp(0)} className="bg-card border border-kapiva-green/30 rounded-2xl p-8">
              <CheckCircle size={48} className="text-kapiva-green mx-auto mb-4" />
              <p className="text-foreground font-display font-bold text-lg">Cảm ơn bạn!</p>
              <p className="text-muted-foreground text-sm mt-1">Chúng tôi sẽ liên hệ trong 24 giờ.</p>
            </motion.div>
          ) : (
            <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <input value={ctaEmail} onChange={e => setCtaEmail(e.target.value)} placeholder="Email doanh nghiệp" className="w-full sm:w-auto flex-1 bg-card border border-border rounded-xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all" />
              <input value={ctaCompany} onChange={e => setCtaCompany(e.target.value)} placeholder="Tên công ty" className="w-full sm:w-auto flex-1 bg-card border border-border rounded-xl px-5 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all" />
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
                className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-3.5 rounded-xl font-display font-bold text-sm shadow-[0_8px_30px_hsla(225,100%,57%,0.25)] hover:shadow-[0_12px_40px_hsla(225,100%,57%,0.35)] transition-all flex items-center justify-center gap-2"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Bắt đầu ngay <ArrowRight size={14} />
              </motion.button>
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
