import { useState, useRef, useCallback, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { industries, provinces } from '@/lib/mockData';
import { formatVND } from '@/lib/formatters';
import { getPasswordStrength } from '@/lib/validators';
import { Check, ArrowRight, Upload, Camera, Pen, X, Loader2, Shield, Sparkles, Zap, Globe, Brain, Banknote, Lock, Eye, EyeOff, Package, Users, Wrench, ShieldCheck, Search, Smartphone } from 'lucide-react';
import { InvoiceDoc, RevenueTrend, ScoringBolt, InsightSpark } from '@/components/illustrations/BrandIcons';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AnimatedStepFlow from '@/components/onboarding/AnimatedStepFlow';
import NetworkGraph from '@/components/onboarding/NetworkGraph';

const stepIcons = [Lock, Globe, Brain, Banknote, Shield];

const pageVariants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60, filter: 'blur(6px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60, filter: 'blur(6px)' }),
};

/* ─── Floating Input ─── */
const FloatingInput = forwardRef<HTMLInputElement, {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; warn?: string; icon?: React.ReactNode;
}>(({ label, type = 'text', value, onChange, placeholder, warn, icon }, ref) => {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const active = focused || value.length > 0;
  const isPassword = type === 'password';
  return (
    <div className="relative group">
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none z-10 ${
        active ? 'top-2 text-[10px] text-primary font-semibold tracking-wide' : 'top-3.5 text-sm text-muted-foreground'
      }`}>{label}</label>
      {icon && (
        <div className="absolute right-4 top-3.5 text-muted-foreground pointer-events-none">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        type={isPassword && showPw ? 'text' : type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={active ? placeholder : ''}
        className={`w-full bg-card/40 backdrop-blur-md border rounded-xl px-4 pt-6 pb-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none transition-all duration-300 ${
          focused 
            ? 'border-primary/50 shadow-[0_0_0_3px_hsla(var(--blue-500)/0.08),0_4px_16px_hsla(var(--blue-500)/0.06)]' 
            : 'border-border/60 hover:border-border'
        } ${isPassword || icon ? 'pr-12' : ''}`}
      />
      {isPassword && value && (
        <button 
          type="button"
          onClick={() => setShowPw(!showPw)} 
          aria-label={showPw ? t('ob.hidePassword') : t('ob.showPassword')}
          className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
      {warn && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-mimi-amber mt-1.5 ml-1 flex items-center gap-1">
          <Sparkles size={10} /> {warn}
        </motion.p>
      )}
    </div>
  );
});
FloatingInput.displayName = 'FloatingInput';

/* ─── Pill Selector ─── */
function PillSelector({ options, value, onChange, multi = false }: {
  options: { value: string; label: string }[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean;
}) {
  const isSelected = (v: string) => multi ? (value as string[]).includes(v) : value === v;
  const toggle = (v: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
    } else {
      onChange(v);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <motion.button
          key={o.value}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => toggle(o.value)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
            isSelected(o.value)
              ? 'bg-primary text-primary-foreground shadow-[0_2px_16px_hsla(var(--blue-500)/0.3)]'
              : 'bg-card/40 border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30'
          }`}
        >
          {o.label}
        </motion.button>
      ))}
    </div>
  );
}

export default function Onboarding() {
  const { t } = useTranslation();
  const stepsMetaRaw = t('ob.stepsMeta', { returnObjects: true }) as { title: string; desc: string }[];
  const stepsMeta = stepsMetaRaw.map((s, i) => ({ ...s, icon: stepIcons[i] }));
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  // Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Step 2
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [industry, setIndustry] = useState('');
  const [province, setProvince] = useState('');
  const [yearsOp, setYearsOp] = useState('');
  const [revenue, setRevenue] = useState(2_500_000_000);
  const [empCount, setEmpCount] = useState('');

  const [lookingUpTax, setLookingUpTax] = useState(false);

  /**
   * Tra cứu mã số thuế, điền sẵn tên và tỉnh/thành.
   *
   * Ba chỗ sửa 18/08:
   *
   * 1. Chốt độ dài cũ là `!== 10`, tức chặn đúng nhóm khách chính. Từ 01/07/2025
   *    số định danh cá nhân (12 số trên CCCD) thay thế mã số thuế cho cá nhân,
   *    hộ gia đình và hộ kinh doanh — nên một hộ kinh doanh nhập đúng mã của
   *    mình thì nút tra cứu im lặng không làm gì.
   *
   * 2. Bỏ Firecrawl scrape masothue.com + regex trên markdown, chuyển sang API
   *    có cấu trúc của XInvoice (dữ liệu Tổng cục Thuế). Regex trên trang người
   *    khác hỏng bất cứ lúc nào họ đổi bố cục, và hỏng im lặng.
   *
   * 3. Kiểm `status`. Một mã đã đóng vẫn trả về tên và địa chỉ bình thường —
   *    điền vào biểu mẫu mà không nói gì là để khách đăng ký bằng một pháp nhân
   *    không còn tồn tại. Vẫn điền, nhưng nói rõ.
   *
   * Ngành nghề không có trong phản hồi nên vẫn để khách tự chọn.
   */
  const lookupTaxId = async () => {
    const ma = taxId.trim();
    const goc = ma.split('-')[0];
    if (!/^\d{10}$|^\d{12}$/.test(goc) || lookingUpTax) return;
    setLookingUpTax(true);
    try {
      const { data } = await supabase.functions.invoke('tax-lookup', { body: { taxCode: ma } });

      if (!data?.found) {
        toast.info(t('ob.taxLookupNotFound'));
      } else {
        const r = data.record ?? {};
        if (r.name) setCompanyName(r.name);
        if (r.address) {
          // `provinces` là danh sách của ô chọn. Chỉ nhận khi tên tỉnh thật sự
          // xuất hiện trong địa chỉ — không khớp thì để khách tự chọn, không đoán.
          const khop = provinces.find((tinh) => r.address.toLowerCase().includes(tinh.toLowerCase()));
          if (khop) setProvince(khop);
        }

        if (!data.conHoatDong) {
          toast.warning(t('ob.taxLookupInactive', { status: r.status ?? '' }));
        } else if (data.soConHoatDong > 1) {
          toast.info(t('ob.taxLookupMultiple', { count: data.soConHoatDong }));
        } else {
          toast.success(t('ob.taxLookupSuccess'));
        }
      }
    } catch { toast.error(t('ob.taxLookupError')); }
    setLookingUpTax(false);
  };

  const pwStrength = getPasswordStrength(password);
  const strengthLabels = t('ob.strengthLabels', { returnObjects: true }) as string[];
  const strengthColors = ['bg-muted', 'bg-mimi-red', 'bg-mimi-amber', 'bg-mimi-green', 'bg-mimi-green'];
  const emailWarn = email && /(@gmail|@yahoo|@hotmail)/i.test(email) ? t('onboarding.emailWarn') : '';

  const banks = t('ob.banks', { returnObjects: true }) as string[];

  const purposeIcons = [Package, InvoiceDoc, RevenueTrend, Users, Wrench, ShieldCheck];
  const purposeOptionsRaw = t('ob.purposeOptions', { returnObjects: true }) as { label: string; desc: string }[];
  const purposeOptions = purposeOptionsRaw.map((p, i) => ({ ...p, icon: purposeIcons[i] }));

  const [registering, setRegistering] = useState(false);

  const handleComplete = async () => {
    setRegistering(true);
    const { error } = await register(email, password, { full_name: fullName, phone });
    if (error) { toast.error(error); setRegistering(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('companies').insert({
        user_id: user.id, name: companyName, tax_id: taxId, industry, province,
        years_operating: yearsOp, monthly_revenue: revenue, employee_count: empCount,
        // connected_banks bỏ đi cùng bước "Kết nối dữ liệu": các ô ngân hàng ở
        // đó chỉ setTimeout 1,5 giây rồi tự đánh dấu đã nối, không gọi API nào.
        // Liên kết thật nằm ở Fintech Hub qua Cas Link, và ghi vào
        // bank_connections chứ không phải cột này.
      });
    }
    setRegistering(false);
    setCompleted(true);
  };

  /*
   * BUOC CUOI LA 1, khong phai 2.
   *
   * Truoc day next() chan o 2 trong khi nut "Hoan tat dang ky" chi hien khi
   * `step < 3` sai — tuc phai step >= 3. Step khong bao gio vuot 2, nen nut do
   * KHONG BAO GIO hien ra va handleComplete (chi co mot noi goi) khong bao gio
   * chay: luong dang ky la mot ngo cut.
   *
   * Sau khi go buoc eKYC trang tri, con hai buoc (0 va 1), nen chan o 1.
   */
  const next = () => { setDirection(1); setStep(s => Math.min(s + 1, 1)); };
  const prev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };
  const overallProgress = ((step + 1) / 2) * 100;

  // ─── SUCCESS SCREEN ───
  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div key={i} className="absolute w-2 h-2 rounded-sm"
            style={{
              left: `${Math.random() * 100}%`, top: '-10px',
              background: ['hsl(var(--blue-500))', 'hsl(var(--green-500))', 'hsl(var(--amber-500))', 'hsl(var(--red-500))'][i % 4],
              animation: `confetti-fall ${2 + Math.random() * 3}s ease-in ${Math.random() * 2}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', duration: 0.6 }} className="text-center max-w-lg relative z-10">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-mimi-green/10 border-2 border-mimi-green/30 flex items-center justify-center mx-auto mb-8">
            <Check size={40} className="text-mimi-green" strokeWidth={3} />
          </motion.div>
          <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">{t('ob.successTitle')}</h2>
          <p className="text-muted-foreground mb-6">{t('ob.successSub')}</p>

          {/* Animated analysis steps */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 mb-6 text-left space-y-4">
            {(t('ob.analysisSteps', { returnObjects: true }) as string[]).map((text, i) => ({
              text, icon: [Search, ScoringBolt, InsightSpark, Smartphone][i], delay: 0.8 + i * 0.8,
            })).map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: item.delay, duration: 0.4 }}
                className="flex items-center gap-3">
                <item.icon size={16} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground flex-1">{item.text}</span>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: item.delay + 0.6, type: 'spring' }}>
                  <div className="w-5 h-5 rounded-full bg-mimi-green/20 flex items-center justify-center"><Check size={12} className="text-mimi-green" /></div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/*
            Màn hình cuối từng hiện điểm tín dụng 701 và hạn mức ₫1.500.000.000,
            cả hai viết cứng — nghĩa là mọi người vừa đăng ký đều được báo cùng
            một con số, không đo từ dữ liệu của ai, trên một sản phẩm không cấp
            vốn. Cùng loại với "AM" trên avatar và mockData đã xoá.
            Thay bằng việc thật sự tiếp theo: nối tài khoản ngân hàng, vì chưa
            có nó thì chưa tính được gì cho khách.
          */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}>
            <p className="text-sm text-muted-foreground mb-2">{t('ob.nextStepLabel')}</p>
            <p className="text-base text-foreground mb-8 max-w-md mx-auto leading-relaxed">{t('ob.nextStepDesc')}</p>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard/fintech')}
              className="bg-primary text-primary-foreground px-10 py-4 rounded-xl font-display font-bold text-base hover:brightness-110 transition-all shadow-[0_4px_24px_hsla(var(--blue-500)/0.3)]">
              {t('ob.connectBankNow')}
            </motion.button>
            <button onClick={() => navigate('/dashboard')} className="block mx-auto mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t('ob.goToDashboard')}
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div className="absolute top-[10%] right-[5%] w-[400px] h-[400px] rounded-full blur-[120px] opacity-[0.04]"
          style={{ background: 'hsl(var(--blue-500))' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 30, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div className="absolute bottom-[10%] left-[5%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-[0.03]"
          style={{ background: 'hsl(var(--green-500))' }}
          animate={{ scale: [1, 1.15, 1], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* ─── LEFT SIDEBAR ─── */}
      <div className="hidden lg:flex w-[420px] flex-col sticky top-0 h-screen border-r border-border/30">
        {/* Gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/80 via-background to-secondary/40" />
        <div className="relative z-10 flex flex-col h-full p-8">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_2px_12px_hsla(var(--blue-500)/0.3)]">
              <img src="/mimi-favicon.png" alt="MIMI WALLET logo" draggable={false} className="w-6 h-6 no-save" />
            </div>
            <div>
              <span className="font-display font-bold text-foreground text-lg tracking-tight">MIMI WALLET</span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">{t('onboarding.smartCapital')}</p>
            </div>
          </motion.div>

          {/* Animated step flow visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-2xl mb-8 overflow-hidden"
          >
            <AnimatedStepFlow activeStep={Math.min(step, 2)} />
          </motion.div>

          {/* Step progress */}
          <div className="space-y-1 flex-1">
            {stepsMeta.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <motion.div
                  key={i}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 cursor-pointer ${
                    isActive ? 'bg-primary/8 border border-primary/15' : 'hover:bg-card/30'
                  }`}
                  animate={{ opacity: i <= step ? 1 : 0.35 }}
                  onClick={() => { if (i < step) { setDirection(i < step ? -1 : 1); setStep(i); } }}
                >
                  <motion.div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                      isDone ? 'bg-mimi-green/12 text-mimi-green' :
                      isActive ? 'bg-primary text-primary-foreground shadow-[0_2px_12px_hsla(var(--blue-500)/0.3)]' :
                      'bg-card/50 border border-border/60 text-muted-foreground'
                    }`}
                    animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {isDone ? <Check size={14} strokeWidth={3} /> : <StepIcon size={14} />}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium block ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s.title}</span>
                    <span className="text-[10px] text-muted-foreground">{s.desc}</span>
                    {isActive && (
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-[2px] bg-gradient-to-r from-primary/50 to-transparent rounded-full mt-1.5" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Dynamic sidebar visual based on step */}
          <AnimatePresence mode="wait">
          </AnimatePresence>

          {/* Trust badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-mimi-green/10 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-mimi-green" />
            </div>
            <div>
              <p className="text-xs text-foreground font-medium">{t('ob.isoSecurity')}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{t('ob.isoSecurityDesc')}</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ─── RIGHT CONTENT ─── */}
      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        {/* Mobile header */}
        <div className="lg:hidden px-5 pt-5 pb-3 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-[10px]">K</span>
              </div>
              <span className="font-display font-bold text-foreground text-sm">MIMI WALLET</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-card/50 px-2.5 py-1 rounded-lg border border-border/40">{step + 1}/{stepsMeta.length}</span>
          </div>
          <div className="flex gap-1.5">
            {stepsMeta.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-accent/50">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-mimi-green"
                  initial={{ width: 0 }} animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center p-6 lg:p-12 xl:p-16">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* ═══ STEP 1: Account ═══ */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-2 bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-lg mb-4">
                        <Sparkles size={12} className="text-primary" />
                        <span className="text-[11px] text-primary font-semibold">{t('ob.freeSetup')}</span>
                      </motion.div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">{t('ob.createAccountTitle')}</h2>
                      <p className="text-muted-foreground text-sm">{t('ob.createAccountSub')}</p>
                    </div>
                    <div className="space-y-4">
                      <FloatingInput label={t('ob.fullNameLabel')} value={fullName} onChange={setFullName} />
                      <FloatingInput label={t('ob.emailLabel')} type="email" value={email} onChange={setEmail} placeholder={t('ob.emailPlaceholder')} warn={emailWarn} />
                      <FloatingInput label={t('ob.phoneLabel')} type="tel" value={phone} onChange={setPhone} placeholder={t('ob.phonePlaceholder')} />
                      <div className="space-y-1.5">
                        <FloatingInput label={t('ob.passwordLabel')} type="password" value={password} onChange={setPassword} />
                        {password && (
                          <div className="px-1">
                            <div className="flex gap-1 mb-1">
                              {[0, 1, 2, 3].map((i) => (
                                <motion.div key={i}
                                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < pwStrength ? strengthColors[pwStrength] : 'bg-accent/50'}`}
                                  initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05 }}
                                />
                              ))}
                            </div>
                            <p className={`text-[11px] font-medium ${pwStrength >= 3 ? 'text-mimi-green' : pwStrength >= 2 ? 'text-mimi-amber' : 'text-mimi-red'}`}>
                              {strengthLabels[pwStrength]}
                            </p>
                          </div>
                        )}
                      </div>
                      <FloatingInput label={t('ob.confirmPasswordLabel')} type="password" value={confirmPw} onChange={setConfirmPw} />
                    </div>
                    <label className="flex items-start gap-3 group cursor-pointer bg-card/30 p-4 rounded-xl border border-border/30 hover:border-primary/20 transition-all">
                      <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                        agreed ? 'bg-primary border-primary' : 'border-border/60 group-hover:border-primary/40'
                      }`} onClick={() => setAgreed(!agreed)}>
                        {agreed && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed" onClick={() => setAgreed(!agreed)}>
                        {t('ob.agreeTermsPrefix')} <span className="text-primary hover:underline">{t('ob.termsLink')}</span> {t('ob.andWord')} <span className="text-primary hover:underline">{t('ob.privacyPolicyLink')}</span>
                      </span>
                    </label>
                  </div>
                )}

                {/* ═══ STEP 2: Business ═══ */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">{t('ob.businessInfoTitle')}</h2>
                      <p className="text-muted-foreground text-sm">{t('ob.businessInfoSub')}</p>
                    </div>
                    <div className="space-y-4">
                      <FloatingInput label={t('ob.companyNameLabel')} value={companyName} onChange={setCompanyName} />
                      <div className="relative">
                        <FloatingInput label={t('ob.taxIdLabel')} value={taxId} onChange={(v) => setTaxId(v.replace(/\D/g, '').slice(0, 10))} placeholder={t('ob.taxIdPlaceholder')} />
                        {/* Nút hiện ở cả 10 số (doanh nghiệp) lẫn 12 số (hộ kinh doanh dùng
                            số định danh cá nhân). Chốt cũ chỉ 10 nên nhóm khách
                            chính không bao giờ thấy nút này. */}
                        {(taxId.trim().length === 10 || taxId.trim().length === 12) && (
                          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={lookupTaxId} disabled={lookingUpTax}
                            className="absolute right-3 top-3 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
                            {lookingUpTax ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />} {t('ob.lookup')}
                          </motion.button>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">{t('ob.industryLabel')}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {industries.map((ind) => (
                            <motion.button key={ind.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={() => setIndustry(ind.label)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 ${
                                industry === ind.label
                                  ? 'bg-primary/10 border border-primary/30 text-foreground shadow-[0_0_0_2px_hsla(var(--blue-500)/0.08)]'
                                  : 'bg-card/30 border border-border/40 text-muted-foreground hover:border-primary/20'
                              }`}>
                              <span className="truncate text-xs">{ind.label}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">{t('ob.provinceLabel')}</label>
                        <select value={province} onChange={(e) => setProvince(e.target.value)}
                          className="w-full bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                          <option value="">{t('ob.selectProvince')}</option>
                          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">{t('ob.yearsOpLabel')}</label>
                        <PillSelector options={t('ob.yearsOptions', { returnObjects: true }) as { value: string; label: string }[]} value={yearsOp} onChange={setYearsOp} />
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between mb-3 ml-1">
                          <label className="text-xs text-muted-foreground font-medium">{t('ob.monthlyRevenueLabel')}</label>
                          <span className="font-mono text-base font-bold text-foreground">{formatVND(revenue)}</span>
                        </div>
                        <input type="range" min={50_000_000} max={50_000_000_000} step={50_000_000} value={revenue}
                          onChange={(e) => setRevenue(Number(e.target.value))}
                          className="w-full accent-primary h-1.5 rounded-full appearance-none bg-accent/50 cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)] [&::-webkit-slider-thumb]:appearance-none"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1"><span>{t('ob.revenueMin')}</span><span>{t('ob.revenueMax')}</span></div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">{t('ob.employeeCountLabel')}</label>
                        <PillSelector options={['1-5', '6-20', '21-50', '51-200', '200+'].map(v => ({ value: v, label: v }))} value={empCount} onChange={setEmpCount} />
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>

            {/* ─── Navigation ─── */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/20">
              {step > 0 ? (
                <motion.button whileHover={{ x: -3 }} onClick={prev}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-medium">
                  {t('ob.back')}
                </motion.button>
              ) : <div />}
              {step < 1 ? (
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={next}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-display font-bold hover:brightness-110 transition-all shadow-[0_4px_20px_hsla(var(--blue-500)/0.25)] flex items-center gap-2">
                  {t('ob.continueWithArrow')} <ArrowRight size={14} />
                </motion.button>
              ) : (
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleComplete} disabled={registering}
                  className="bg-gradient-to-r from-primary to-mimi-green text-primary-foreground px-8 py-3 rounded-xl text-sm font-display font-bold hover:brightness-110 transition-all shadow-[0_4px_20px_hsla(var(--green-500)/0.25)] flex items-center gap-2 disabled:opacity-50">
                  {registering && <Loader2 size={14} className="animate-spin" />} {t('ob.completeRegistration')}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
