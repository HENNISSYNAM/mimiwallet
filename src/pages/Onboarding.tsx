import { useState, useRef, useCallback, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { industries, provinces } from '@/lib/mockData';
import { formatVND } from '@/lib/formatters';
import { getPasswordStrength } from '@/lib/validators';
import { Check, ArrowRight, Upload, Camera, Pen, X, Loader2, Shield, Sparkles, Zap, Globe, Brain, Banknote, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AnimatedStepFlow from '@/components/onboarding/AnimatedStepFlow';
import NetworkGraph from '@/components/onboarding/NetworkGraph';
import CreditScoreGauge from '@/components/onboarding/CreditScoreGauge';

const stepsMeta = [
  { title: 'Tạo tài khoản', icon: Lock, desc: 'Bảo mật & riêng tư' },
  { title: 'Doanh nghiệp', icon: Globe, desc: 'Thông tin kinh doanh' },
  { title: 'Kết nối dữ liệu', icon: Brain, desc: 'Tăng hạn mức vốn' },
  { title: 'Nhu cầu vốn', icon: Banknote, desc: 'Giải pháp phù hợp' },
  { title: 'Xác minh eKYC', icon: Shield, desc: 'Hoàn tất hồ sơ' },
];

const pageVariants = {
  enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60, filter: 'blur(6px)' }),
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60, filter: 'blur(6px)' }),
};

/* ─── Floating Input ─── */
function FloatingInput({ label, type = 'text', value, onChange, placeholder, warn, icon }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; warn?: string; icon?: React.ReactNode;
}) {
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
          className="absolute right-4 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
      {warn && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-kapiva-amber mt-1.5 ml-1 flex items-center gap-1">
          <Sparkles size={10} /> {warn}
        </motion.p>
      )}
    </div>
  );
}

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

  // Step 3
  const [connectedBanks, setConnectedBanks] = useState<string[]>([]);
  const [connectingBank, setConnectingBank] = useState<string | null>(null);
  const [dataTab, setDataTab] = useState(0);

  // Step 4
  const [purposes, setPurposes] = useState<string[]>([]);
  const [desiredAmount, setDesiredAmount] = useState(1_000_000_000);
  const [desiredTerm, setDesiredTerm] = useState('90');

  // Step 5
  const [eKYCConfirm, setEKYCConfirm] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<string[]>([]);

  const [lookingUpTax, setLookingUpTax] = useState(false);

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const lookupTaxId = async () => {
    if (taxId.length !== 10 || lookingUpTax) return;
    setLookingUpTax(true);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', { body: { taxId } });
      if (data?.success && data?.data?.markdown) {
        const markdown = data.data.markdown;
        const nameMatch = markdown.match(/Tên công ty[:\s]+([^\n]+)/i) || markdown.match(/Tên doanh nghiệp[:\s]+([^\n]+)/i);
        if (nameMatch) setCompanyName(nameMatch[1].trim());
        toast.success('Đã tra cứu thông tin MST');
      } else {
        toast.info('Không tìm thấy, vui lòng nhập thủ công');
      }
    } catch { toast.error('Lỗi tra cứu MST'); }
    setLookingUpTax(false);
  };

  const pwStrength = getPasswordStrength(password);
  const strengthLabels = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const strengthColors = ['bg-muted', 'bg-kapiva-red', 'bg-kapiva-amber', 'bg-kapiva-green', 'bg-kapiva-green'];
  const emailWarn = email && /(@gmail|@yahoo|@hotmail)/i.test(email) ? 'Nên dùng email doanh nghiệp để tăng điểm tín dụng' : '';

  const banks = ['Vietcombank', 'BIDV', 'Techcombank', 'MB Bank', 'VPBank', 'Agribank', 'ACB', 'Sacombank', 'TPBank'];

  const purposeOptions = [
    { icon: '📦', label: 'Nhập hàng tồn kho', desc: 'Vòng quay hàng hóa' },
    { icon: '🧾', label: 'Ứng tiền hóa đơn', desc: 'Nhận trước 80%' },
    { icon: '📈', label: 'Mở rộng kinh doanh', desc: 'Chi nhánh, sản phẩm mới' },
    { icon: '👥', label: 'Trả lương nhân viên', desc: 'Giữ chân nhân tài' },
    { icon: '🔧', label: 'Đầu tư thiết bị', desc: 'Máy móc, công nghệ' },
    { icon: '🛡️', label: 'Dự phòng dòng tiền', desc: 'An toàn tài chính' },
  ];

  const connectBank = (bank: string) => {
    if (connectedBanks.includes(bank)) return;
    setConnectingBank(bank);
    setTimeout(() => {
      setConnectedBanks(prev => [...prev, bank]);
      setConnectingBank(null);
    }, 1500);
  };

  const togglePurpose = (p: string) => setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  const simulateUpload = (docType: string) => { if (!uploadedDocs.includes(docType)) setUploadedDocs(prev => [...prev, docType]); };

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
        connected_banks: connectedBanks,
      });
    }
    setRegistering(false);
    setCompleted(true);
  };

  const next = () => { setDirection(1); setStep(s => Math.min(s + 1, 4)); };
  const prev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };
  const estimatedLimit = 200_000_000 + connectedBanks.length * 300_000_000;
  const overallProgress = ((step + 1) / 5) * 100;

  // Canvas drawing
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = 'hsl(214, 100%, 97%)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
    setHasSigned(true);
  }, [isDrawing]);
  const stopDraw = useCallback(() => setIsDrawing(false), []);
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height); setHasSigned(false);
  };

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
            className="w-24 h-24 rounded-full bg-kapiva-green/10 border-2 border-kapiva-green/30 flex items-center justify-center mx-auto mb-8">
            <Check size={40} className="text-kapiva-green" strokeWidth={3} />
          </motion.div>
          <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Hồ sơ đã được gửi thành công!</h2>
          <p className="text-muted-foreground mb-6">AI đang phân tích dữ liệu của bạn</p>

          {/* Animated analysis steps */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 mb-6 text-left space-y-4">
            {[
              { text: 'Phân tích dữ liệu ngân hàng...', icon: '🔍', delay: 0.8 },
              { text: 'Tính toán điểm tín dụng AI...', icon: '🤖', delay: 1.6 },
              { text: 'Xác định hạn mức phù hợp...', icon: '💡', delay: 2.4 },
              { text: 'Gửi kết quả qua SMS/Email...', icon: '📱', delay: 3.2 },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: item.delay, duration: 0.4 }}
                className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-muted-foreground flex-1">{item.text}</span>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: item.delay + 0.6, type: 'spring' }}>
                  <div className="w-5 h-5 rounded-full bg-kapiva-green/20 flex items-center justify-center"><Check size={12} className="text-kapiva-green" /></div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Credit score gauge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.5 }}>
            <CreditScoreGauge score={782} maxScore={1000} />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.2, duration: 0.5 }}>
            <p className="text-sm text-muted-foreground mb-1">Dự kiến hạn mức</p>
            <p className="font-mono text-4xl font-bold text-kapiva-green mb-1">₫1,500,000,000</p>
            <p className="text-sm text-muted-foreground mb-8">Chúng tôi sẽ liên hệ trong 24 giờ</p>
            <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/dashboard')}
              className="bg-primary text-primary-foreground px-10 py-4 rounded-xl font-display font-bold text-base hover:brightness-110 transition-all shadow-[0_4px_24px_hsla(var(--blue-500)/0.3)]">
              Vào Dashboard ngay →
            </motion.button>
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
              <span className="font-display font-extrabold text-primary-foreground text-sm">K</span>
            </div>
            <div>
              <span className="font-display font-bold text-foreground text-lg tracking-tight">KAPIVA</span>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Vốn thông minh cho SME</p>
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
                      isDone ? 'bg-kapiva-green/12 text-kapiva-green' :
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
            {step === 2 && (
              <motion.div key="network" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-2xl p-4 mb-4">
                <p className="text-[10px] text-primary font-semibold tracking-wider uppercase mb-2">Mô hình dữ liệu AI</p>
                <NetworkGraph labels={['Ngân hàng', 'Hóa đơn', 'Dòng tiền', 'Tín dụng']} />
              </motion.div>
            )}
            {step === 3 && (
              <motion.div key="gauge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-2xl p-4 mb-4">
                <p className="text-[10px] text-primary font-semibold tracking-wider uppercase mb-2">Điểm tín dụng ước tính</p>
                <CreditScoreGauge score={Math.min(500 + purposes.length * 47, 850)} maxScore={1000} />
                <p className="text-center text-xs text-muted-foreground mt-1">Hạng {purposes.length >= 3 ? 'A' : purposes.length >= 1 ? 'B' : 'C'}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Trust badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-kapiva-green/10 flex items-center justify-center shrink-0">
              <Shield size={14} className="text-kapiva-green" />
            </div>
            <div>
              <p className="text-xs text-foreground font-medium">Bảo mật ISO 27001</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">Dữ liệu được mã hóa AES-256 đầu cuối</p>
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
              <span className="font-display font-bold text-foreground text-sm">KAPIVA</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono bg-card/50 px-2.5 py-1 rounded-lg border border-border/40">{step + 1}/{stepsMeta.length}</span>
          </div>
          <div className="flex gap-1.5">
            {stepsMeta.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-accent/50">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-kapiva-green"
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
                        <span className="text-[11px] text-primary font-semibold">Miễn phí — Setup 5 phút</span>
                      </motion.div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Tạo tài khoản</h2>
                      <p className="text-muted-foreground text-sm">Bắt đầu hành trình vốn thông minh cùng KAPIVA</p>
                    </div>
                    <div className="space-y-4">
                      <FloatingInput label="Họ và tên *" value={fullName} onChange={setFullName} />
                      <FloatingInput label="Email doanh nghiệp *" type="email" value={email} onChange={setEmail} placeholder="ten@congty.vn" warn={emailWarn} />
                      <FloatingInput label="Số điện thoại *" type="tel" value={phone} onChange={setPhone} placeholder="0912 345 678" />
                      <div className="space-y-1.5">
                        <FloatingInput label="Mật khẩu *" type="password" value={password} onChange={setPassword} />
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
                            <p className={`text-[11px] font-medium ${pwStrength >= 3 ? 'text-kapiva-green' : pwStrength >= 2 ? 'text-kapiva-amber' : 'text-kapiva-red'}`}>
                              {strengthLabels[pwStrength]}
                            </p>
                          </div>
                        )}
                      </div>
                      <FloatingInput label="Xác nhận mật khẩu *" type="password" value={confirmPw} onChange={setConfirmPw} />
                    </div>
                    <label className="flex items-start gap-3 group cursor-pointer bg-card/30 p-4 rounded-xl border border-border/30 hover:border-primary/20 transition-all">
                      <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                        agreed ? 'bg-primary border-primary' : 'border-border/60 group-hover:border-primary/40'
                      }`} onClick={() => setAgreed(!agreed)}>
                        {agreed && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed" onClick={() => setAgreed(!agreed)}>
                        Tôi đồng ý với <span className="text-primary hover:underline">Điều khoản</span> và <span className="text-primary hover:underline">Chính sách bảo mật</span>
                      </span>
                    </label>
                  </div>
                )}

                {/* ═══ STEP 2: Business ═══ */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Thông tin doanh nghiệp</h2>
                      <p className="text-muted-foreground text-sm">Giúp AI phân tích chính xác hơn</p>
                    </div>
                    <div className="space-y-4">
                      <FloatingInput label="Tên doanh nghiệp *" value={companyName} onChange={setCompanyName} />
                      <div className="relative">
                        <FloatingInput label="Mã số thuế *" value={taxId} onChange={(v) => setTaxId(v.replace(/\D/g, '').slice(0, 10))} placeholder="10 chữ số" />
                        {taxId.length === 10 && (
                          <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={lookupTaxId} disabled={lookingUpTax}
                            className="absolute right-3 top-3 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg font-semibold hover:bg-primary/20 transition-all flex items-center gap-1.5 disabled:opacity-50">
                            {lookingUpTax ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />} Tra cứu
                          </motion.button>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">Ngành nghề *</label>
                        <div className="grid grid-cols-2 gap-2">
                          {industries.map((ind) => (
                            <motion.button key={ind.label} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={() => setIndustry(ind.label)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 ${
                                industry === ind.label
                                  ? 'bg-primary/10 border border-primary/30 text-foreground shadow-[0_0_0_2px_hsla(var(--blue-500)/0.08)]'
                                  : 'bg-card/30 border border-border/40 text-muted-foreground hover:border-primary/20'
                              }`}>
                              <span>{ind.icon}</span>
                              <span className="truncate text-xs">{ind.label}</span>
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">Tỉnh/Thành phố *</label>
                        <select value={province} onChange={(e) => setProvince(e.target.value)}
                          className="w-full bg-card/40 backdrop-blur-sm border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                          <option value="">Chọn tỉnh/thành</option>
                          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">Thời gian hoạt động</label>
                        <PillSelector options={[{ value: '<1', label: 'Dưới 1 năm' }, { value: '1-3', label: '1-3 năm' }, { value: '3-5', label: '3-5 năm' }, { value: '5+', label: 'Trên 5 năm' }]} value={yearsOp} onChange={setYearsOp} />
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between mb-3 ml-1">
                          <label className="text-xs text-muted-foreground font-medium">Doanh thu hàng tháng</label>
                          <span className="font-mono text-base font-bold text-foreground">{formatVND(revenue)}</span>
                        </div>
                        <input type="range" min={50_000_000} max={50_000_000_000} step={50_000_000} value={revenue}
                          onChange={(e) => setRevenue(Number(e.target.value))}
                          className="w-full accent-primary h-1.5 rounded-full appearance-none bg-accent/50 cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)] [&::-webkit-slider-thumb]:appearance-none"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1"><span>₫50M</span><span>₫50 tỷ</span></div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">Số lượng nhân viên</label>
                        <PillSelector options={['1-5', '6-20', '21-50', '51-200', '200+'].map(v => ({ value: v, label: v }))} value={empCount} onChange={setEmpCount} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ STEP 3: Data connections ═══ */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Kết nối dữ liệu</h2>
                      <p className="text-muted-foreground text-sm">Kết nối càng nhiều, AI phân tích càng chính xác</p>
                    </div>

                    {/* Connection status */}
                    <motion.div layout className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-blue-400/5 to-kapiva-green/5 border border-primary/15 rounded-2xl p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <motion.div
                              className="w-2 h-2 rounded-full bg-kapiva-green"
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                            <p className="text-xs text-muted-foreground font-medium">{connectedBanks.length}/3 kết nối</p>
                          </div>
                          <p className="font-mono text-xl font-bold text-foreground">{formatVND(estimatedLimit)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Hạn mức ước tính AI</p>
                        </div>
                        <div className="flex -space-x-2">
                          {connectedBanks.slice(0, 4).map((b) => (
                            <motion.div key={b} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                              className="w-8 h-8 rounded-full bg-kapiva-green/15 border-2 border-background flex items-center justify-center text-[10px] font-bold text-kapiva-green">
                              {b[0]}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                      {/* Animated progress bar */}
                      <div className="mt-3 h-1 bg-border/30 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-gradient-to-r from-primary to-kapiva-green rounded-full"
                          animate={{ width: `${Math.min(connectedBanks.length / 3 * 100, 100)}%` }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                    </motion.div>

                    {/* Tabs */}
                    <div className="bg-card/30 backdrop-blur-sm rounded-xl p-1 flex gap-1 border border-border/30">
                      {['🏦 Ngân hàng', '📊 Kế toán', '🛒 Thương mại'].map((t, i) => (
                        <button key={t} onClick={() => setDataTab(i)}
                          className={`flex-1 text-xs py-2.5 rounded-lg font-medium transition-all duration-300 ${
                            dataTab === i ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}>{t}</button>
                      ))}
                    </div>

                    {dataTab === 0 && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {banks.map((b) => {
                          const connected = connectedBanks.includes(b);
                          const connecting = connectingBank === b;
                          return (
                            <motion.button key={b} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              onClick={() => connectBank(b)} disabled={connected || connecting}
                              className={`relative rounded-xl p-3.5 text-center transition-all duration-300 ${
                                connected ? 'bg-kapiva-green/5 border-2 border-kapiva-green/30' :
                                connecting ? 'bg-primary/5 border-2 border-primary/30' :
                                'bg-card/30 border border-border/40 hover:border-primary/30 hover:shadow-[0_6px_20px_hsla(var(--blue-500)/0.08)]'
                              }`}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 text-sm font-bold transition-all ${
                                connected ? 'bg-kapiva-green/12 text-kapiva-green' : 'bg-accent/50 text-foreground'
                              }`}>
                                {connecting ? <Loader2 size={16} className="animate-spin text-primary" /> : b[0] + b[1]}
                              </div>
                              <p className="text-[11px] text-foreground font-medium truncate">{b}</p>
                              <p className={`text-[9px] mt-0.5 font-medium ${
                                connected ? 'text-kapiva-green' : connecting ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                {connected ? '✓ Đã kết nối' : connecting ? 'Đang...' : 'Kết nối'}
                              </p>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {dataTab === 1 && (
                      <div className="space-y-2.5">
                        {['MISA SME', 'Fast Accounting', '1C Vietnam'].map((s) => (
                          <div key={s} className="bg-card/30 border border-border/40 rounded-xl p-4 flex items-center justify-between hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center text-sm font-bold text-foreground">{s[0]}</div>
                              <span className="text-sm text-foreground font-medium">{s}</span>
                            </div>
                            <button className="text-xs bg-primary text-primary-foreground px-3.5 py-2 rounded-lg font-semibold hover:brightness-110 transition-all">Kết nối</button>
                          </div>
                        ))}
                        <div className="border-2 border-dashed border-border/40 rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer group">
                          <Upload size={24} className="text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
                          <p className="text-xs text-muted-foreground">Kéo thả file .xlsx / .csv</p>
                        </div>
                      </div>
                    )}

                    {dataTab === 2 && (
                      <div className="space-y-2.5">
                        {['Shopee', 'Lazada', 'TikTok Shop', 'Tiki'].map((s) => (
                          <div key={s} className="bg-card/30 border border-border/40 rounded-xl p-4 flex items-center justify-between hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-accent/50 flex items-center justify-center text-sm font-bold text-foreground">{s[0]}</div>
                              <span className="text-sm text-foreground font-medium">{s}</span>
                            </div>
                            <button className="text-xs bg-primary text-primary-foreground px-3.5 py-2 rounded-lg font-semibold hover:brightness-110 transition-all">Kết nối</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ STEP 4: Capital needs ═══ */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Nhu cầu vốn</h2>
                      <p className="text-muted-foreground text-sm">AI sẽ đề xuất giải pháp tối ưu cho bạn</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {purposeOptions.map((p) => {
                        const selected = purposes.includes(p.label);
                        return (
                          <motion.button key={p.label} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => togglePurpose(p.label)}
                            className={`relative rounded-xl p-4 text-left transition-all duration-300 ${
                              selected
                                ? 'bg-primary/8 border-2 border-primary/30 shadow-[0_0_0_2px_hsla(var(--blue-500)/0.06)]'
                                : 'bg-card/30 border border-border/40 hover:border-primary/20'
                            }`}>
                            {selected && (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}
                                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                              </motion.div>
                            )}
                            <span className="text-xl">{p.icon}</span>
                            <p className="text-xs text-foreground font-semibold mt-2">{p.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between ml-1">
                        <label className="text-xs text-muted-foreground font-medium">Hạn mức mong muốn</label>
                        <motion.span key={desiredAmount} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                          className="font-mono text-xl font-bold text-foreground">{formatVND(desiredAmount)}</motion.span>
                      </div>
                      <input type="range" min={100_000_000} max={10_000_000_000} step={100_000_000} value={desiredAmount}
                        onChange={(e) => setDesiredAmount(Number(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full appearance-none bg-accent/50 cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)] [&::-webkit-slider-thumb]:appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground px-1"><span>₫100M</span><span>₫10 tỷ</span></div>
                      <motion.div key={desiredAmount} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="bg-kapiva-green/5 border border-kapiva-green/15 rounded-lg p-2.5 flex items-center gap-2">
                        <Sparkles size={12} className="text-kapiva-green shrink-0" />
                        <p className="text-[11px] text-kapiva-green font-medium">
                          AI ước tính: <span className="font-mono font-bold">{formatVND(Math.min(desiredAmount * 1.5, 10_000_000_000))}</span>
                        </p>
                      </motion.div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-2 block ml-1 font-medium">Thời hạn ưa thích</label>
                      <PillSelector options={[
                        { value: '30', label: '30 ngày' }, { value: '60', label: '60 ngày' },
                        { value: '90', label: '90 ngày' }, { value: '180', label: '180 ngày' },
                      ]} value={desiredTerm} onChange={setDesiredTerm} />
                    </div>
                  </div>
                )}

                {/* ═══ STEP 5: eKYC ═══ */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Xác minh danh tính</h2>
                      <p className="text-muted-foreground text-sm">Bước cuối cùng — eKYC nhanh chóng & bảo mật</p>
                    </div>

                    {/* ID Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      {['front', 'back'].map((side) => {
                        const label = side === 'front' ? 'CCCD Mặt trước' : 'CCCD Mặt sau';
                        const uploaded = uploadedDocs.includes(side);
                        return (
                          <motion.div key={side} whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => simulateUpload(side)}
                            className={`relative rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                              uploaded ? 'bg-kapiva-green/5 border-2 border-kapiva-green/30' :
                              'border-2 border-dashed border-border/40 hover:border-primary/40 hover:bg-primary/3'
                            }`}>
                            {uploaded ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                <div className="w-10 h-10 rounded-xl bg-kapiva-green/12 flex items-center justify-center mx-auto mb-2">
                                  <Check size={18} className="text-kapiva-green" strokeWidth={3} />
                                </div>
                                <p className="text-xs text-kapiva-green font-semibold">Đã tải lên</p>
                              </motion.div>
                            ) : (
                              <>
                                <Camera size={22} className="text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs text-foreground font-medium">{label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Chụp / tải lên</p>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Selfie */}
                    <motion.div whileHover={{ y: -2 }} onClick={() => simulateUpload('selfie')}
                      className={`rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                        uploadedDocs.includes('selfie') ? 'bg-kapiva-green/5 border-2 border-kapiva-green/30' :
                        'border-2 border-dashed border-border/40 hover:border-primary/40'
                      }`}>
                      {uploadedDocs.includes('selfie') ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                          <div className="w-14 h-14 rounded-full bg-kapiva-green/12 flex items-center justify-center mx-auto mb-2">
                            <Check size={22} className="text-kapiva-green" strokeWidth={3} />
                          </div>
                          <p className="text-xs text-kapiva-green font-semibold">Ảnh selfie đã tải lên</p>
                        </motion.div>
                      ) : (
                        <>
                          <div className="w-16 h-16 rounded-full border-2 border-border/40 mx-auto mb-2 flex items-center justify-center">
                            <Camera size={22} className="text-muted-foreground" />
                          </div>
                          <p className="text-xs text-foreground font-medium">Chụp ảnh selfie xác thực</p>
                        </>
                      )}
                    </motion.div>

                    {/* Signature */}
                    <div>
                      <div className="flex items-center justify-between mb-2 ml-1">
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5"><Pen size={12} /> Chữ ký số</p>
                        {hasSigned && <button onClick={clearCanvas} className="text-[10px] text-primary hover:underline font-semibold">Xóa & ký lại</button>}
                      </div>
                      <canvas ref={canvasRef} width={400} height={120} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                        className="w-full h-28 bg-card/30 border border-border/40 rounded-xl cursor-crosshair hover:border-primary/30 transition-colors" />
                      {!hasSigned && <p className="text-[10px] text-muted-foreground text-center mt-1.5">Vẽ chữ ký của bạn ở đây</p>}
                    </div>

                    {/* Confirmation */}
                    <label className="flex items-start gap-3 group cursor-pointer bg-card/30 p-4 rounded-xl border border-border/30 hover:border-primary/20 transition-all">
                      <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                        eKYCConfirm ? 'bg-primary border-primary' : 'border-border/60 group-hover:border-primary/40'
                      }`} onClick={() => setEKYCConfirm(!eKYCConfirm)}>
                        {eKYCConfirm && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className="text-xs text-muted-foreground leading-relaxed" onClick={() => setEKYCConfirm(!eKYCConfirm)}>
                        Tôi xác nhận thông tin chính xác và đồng ý cho KAPIVA xử lý dữ liệu theo <span className="text-primary">Chính sách bảo mật</span>
                      </span>
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* ─── Navigation ─── */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/20">
              {step > 0 ? (
                <motion.button whileHover={{ x: -3 }} onClick={prev}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 font-medium">
                  ← Quay lại
                </motion.button>
              ) : <div />}
              {step === 2 && (
                <button onClick={next} className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                  Bỏ qua →
                </button>
              )}
              {step < 4 ? (
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={next}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-display font-bold hover:brightness-110 transition-all shadow-[0_4px_20px_hsla(var(--blue-500)/0.25)] flex items-center gap-2">
                  Tiếp tục <ArrowRight size={14} />
                </motion.button>
              ) : (
                <motion.button whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleComplete} disabled={registering}
                  className="bg-gradient-to-r from-primary to-kapiva-green text-primary-foreground px-8 py-3 rounded-xl text-sm font-display font-bold hover:brightness-110 transition-all shadow-[0_4px_20px_hsla(var(--green-500)/0.25)] flex items-center gap-2 disabled:opacity-50">
                  {registering ? <Loader2 size={14} className="animate-spin" /> : '🚀'} Hoàn tất đăng ký
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
