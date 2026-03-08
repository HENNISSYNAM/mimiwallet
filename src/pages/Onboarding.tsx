import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { industries, provinces } from '@/lib/mockData';
import { formatVND } from '@/lib/formatters';
import { getPasswordStrength } from '@/lib/validators';
import { Check, ArrowRight, Upload, Camera, Pen, X, Loader2 } from 'lucide-react';

const steps = ['Tạo tài khoản', 'Doanh nghiệp', 'Kết nối dữ liệu', 'Nhu cầu vốn', 'Xác minh eKYC'];

const pageVariants = {
  enter: { opacity: 0, x: 40, filter: 'blur(4px)' },
  center: { opacity: 1, x: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, x: -40, filter: 'blur(4px)' },
};

function FloatingInput({ label, type = 'text', value, onChange, placeholder, warn }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; warn?: string;
}) {
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;
  return (
    <div className="relative group">
      <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
        active ? 'top-2 text-[10px] text-primary font-medium' : 'top-3.5 text-sm text-muted-foreground'
      }`}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={active ? placeholder : ''}
        className={`w-full bg-card/50 backdrop-blur-sm border rounded-2xl px-4 pt-6 pb-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 ${
          focused ? 'border-primary/60 shadow-[0_0_0_3px_hsla(var(--blue-500)/0.08)]' : 'border-border hover:border-border/80'
        }`}
      />
      {warn && <p className="text-[11px] text-kapiva-amber mt-1 ml-1">{warn}</p>}
    </div>
  );
}

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
        <button
          key={o.value}
          onClick={() => toggle(o.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            isSelected(o.value)
              ? 'bg-primary text-primary-foreground shadow-[0_2px_12px_hsla(var(--blue-500)/0.25)]'
              : 'bg-card/60 border border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ProgressRing({ progress }: { progress: number }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg viewBox="0 0 120 120" className="w-16 h-16">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
      <circle
        cx="60" cy="60" r={radius} fill="none"
        stroke="url(#progGrad)" strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
        className="transition-all duration-700 ease-out"
      />
      <defs>
        <linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--blue-500))" />
          <stop offset="100%" stopColor="hsl(var(--green-500))" />
        </linearGradient>
      </defs>
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central"
        fill="hsl(var(--text-primary))" fontFamily="Syne" fontWeight="800" fontSize="18">
        {Math.round(progress)}%
      </text>
    </svg>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [direction, setDirection] = useState(1);
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

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

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const pwStrength = getPasswordStrength(password);
  const strengthLabels = ['', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  const strengthColors = ['bg-muted', 'bg-kapiva-red', 'bg-kapiva-amber', 'bg-kapiva-green', 'bg-kapiva-green'];

  const emailWarn = email && /(@gmail|@yahoo|@hotmail)/i.test(email) ? 'Nên dùng email doanh nghiệp để tăng xác minh' : '';

  const banks = ['Vietcombank', 'BIDV', 'Techcombank', 'MB Bank', 'VPBank', 'Agribank', 'ACB', 'Sacombank', 'TPBank'];

  const purposeOptions = [
    { icon: '📦', label: 'Nhập hàng tồn kho' },
    { icon: '🧾', label: 'Ứng tiền hóa đơn' },
    { icon: '📈', label: 'Mở rộng kinh doanh' },
    { icon: '👥', label: 'Trả lương nhân viên' },
    { icon: '🔧', label: 'Đầu tư thiết bị' },
    { icon: '🛡️', label: 'Dự phòng dòng tiền' },
  ];

  const connectBank = (bank: string) => {
    if (connectedBanks.includes(bank)) return;
    setConnectingBank(bank);
    setTimeout(() => {
      setConnectedBanks(prev => [...prev, bank]);
      setConnectingBank(null);
    }, 1500);
  };

  const togglePurpose = (p: string) => {
    setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const simulateUpload = (docType: string) => {
    if (uploadedDocs.includes(docType)) return;
    setUploadedDocs(prev => [...prev, docType]);
  };

  const handleComplete = () => {
    setCompleted(true);
    login();
  };

  const next = () => { setDirection(1); setStep(s => Math.min(s + 1, 4)); };
  const prev = () => { setDirection(-1); setStep(s => Math.max(s - 1, 0)); };

  const estimatedLimit = 200_000_000 + connectedBanks.length * 300_000_000;
  const overallProgress = ((step + 1) / 5) * 100;

  // Canvas drawing
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = 'hsl(214, 100%, 97%)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSigned(true);
  }, [isDrawing]);

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Success screen
  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti */}
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-sm"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-10px',
              background: ['hsl(var(--blue-500))', 'hsl(var(--green-500))', 'hsl(var(--amber-500))', 'hsl(var(--red-500))'][i % 4],
              animation: `confetti-fall ${2 + Math.random() * 3}s ease-in ${Math.random() * 2}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', duration: 0.6 }} className="text-center max-w-lg relative z-10">
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="w-24 h-24 rounded-full bg-kapiva-green/10 border-2 border-kapiva-green/30 flex items-center justify-center mx-auto mb-8"
          >
            <motion.div initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}>
              <Check size={40} className="text-kapiva-green" strokeWidth={3} />
            </motion.div>
          </motion.div>

          <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Hồ sơ đã được gửi thành công!</h2>
          <p className="text-muted-foreground mb-8">Hệ thống đang xử lý hồ sơ của bạn</p>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 mb-8 text-left space-y-4">
            {[
              { text: 'Đang phân tích dữ liệu ngân hàng...', icon: '🔍', delay: 0.8 },
              { text: 'Tính toán điểm tín dụng...', icon: '📊', delay: 1.6 },
              { text: 'Xác định hạn mức phù hợp...', icon: '💡', delay: 2.4 },
              { text: 'Gửi kết quả qua SMS/Email...', icon: '📱', delay: 3.2 },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: item.delay, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-muted-foreground flex-1">{item.text}</span>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: item.delay + 0.6, type: 'spring' }}
                >
                  <div className="w-5 h-5 rounded-full bg-kapiva-green/20 flex items-center justify-center">
                    <Check size={12} className="text-kapiva-green" />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 4.2, duration: 0.5 }}>
            <p className="text-sm text-muted-foreground mb-2">Dự kiến hạn mức</p>
            <p className="font-mono text-4xl font-bold text-kapiva-green mb-1">₫1,500,000,000</p>
            <p className="text-sm text-muted-foreground mb-8">Chúng tôi sẽ liên hệ trong 24 giờ</p>

            <button
              onClick={() => navigate('/dashboard')}
              className="bg-primary text-primary-foreground px-10 py-4 rounded-2xl font-display font-bold text-base hover:brightness-110 hover:-translate-y-0.5 transition-all shadow-[0_4px_24px_hsla(var(--blue-500)/0.3)]"
            >
              Vào Dashboard ngay →
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — Apple-style clean sidebar */}
      <div className="hidden lg:flex w-[400px] bg-gradient-to-b from-secondary to-background flex-col p-10 sticky top-0 h-screen border-r border-border/50">
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-[0_2px_12px_hsla(var(--blue-500)/0.3)]">
            <span className="font-display font-extrabold text-primary-foreground text-sm">K</span>
          </div>
          <span className="font-display font-bold text-foreground text-lg tracking-tight">KAPIVA</span>
        </div>

        {/* Progress visualization */}
        <div className="flex justify-center mb-10">
          <ProgressRing progress={overallProgress} />
        </div>

        {/* Steps */}
        <div className="space-y-1 flex-1">
          {steps.map((s, i) => (
            <motion.div
              key={s}
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 ${
                i === step ? 'bg-primary/8' : ''
              }`}
              animate={{ opacity: i <= step ? 1 : 0.4 }}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                i < step ? 'bg-kapiva-green/15 text-kapiva-green' :
                i === step ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)]' :
                'bg-card border border-border text-muted-foreground'
              }`}>
                {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <div>
                <span className={`text-sm font-medium ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
                {i === step && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-0.5 bg-primary/40 rounded-full mt-1"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-5 mt-auto">
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            "97% doanh nghiệp nhận được vốn sau lần đăng ký đầu tiên"
          </p>
          <div className="flex gap-0.5 mt-3">
            {[...Array(5)].map((_, i) => <span key={i} className="text-kapiva-amber text-xs">⭐</span>)}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile progress */}
        <div className="lg:hidden px-6 pt-6 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <span className="font-display font-bold text-primary-foreground text-xs">K</span>
              </div>
              <span className="font-display font-bold text-foreground text-sm">KAPIVA</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">{step + 1}/{steps.length}</span>
          </div>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <motion.div
                key={i}
                className="h-1 flex-1 rounded-full overflow-hidden bg-accent"
                initial={false}
              >
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] as const }}
                />
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex items-start justify-center p-6 lg:p-16">
          <div className="w-full max-w-lg">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] as const }}
              >
                {/* STEP 1: Account */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Tạo tài khoản</h2>
                      <p className="text-muted-foreground">Bắt đầu hành trình vốn thông minh cùng KAPIVA</p>
                    </div>
                    <div className="space-y-4">
                      <FloatingInput label="Họ và tên *" value={fullName} onChange={setFullName} />
                      <FloatingInput label="Email doanh nghiệp *" type="email" value={email} onChange={setEmail} placeholder="ten@congty.vn" warn={emailWarn} />
                      <FloatingInput label="Số điện thoại *" type="tel" value={phone} onChange={setPhone} placeholder="0912 345 678" />
                      <div className="space-y-1">
                        <FloatingInput label="Mật khẩu *" type="password" value={password} onChange={setPassword} />
                        {password && (
                          <div className="px-1">
                            <div className="flex gap-1 mb-1">
                              {[0, 1, 2, 3].map((i) => (
                                <motion.div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < pwStrength ? strengthColors[pwStrength] : 'bg-accent'}`}
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ delay: i * 0.05 }}
                                />
                              ))}
                            </div>
                            <p className={`text-[11px] ${pwStrength >= 3 ? 'text-kapiva-green' : pwStrength >= 2 ? 'text-kapiva-amber' : 'text-kapiva-red'}`}>
                              {strengthLabels[pwStrength]}
                            </p>
                          </div>
                        )}
                      </div>
                      <FloatingInput label="Xác nhận mật khẩu *" type="password" value={confirmPw} onChange={setConfirmPw} />
                    </div>
                    <label className="flex items-start gap-3 group cursor-pointer">
                      <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                        agreed ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/40'
                      }`} onClick={() => setAgreed(!agreed)}>
                        {agreed && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed" onClick={() => setAgreed(!agreed)}>
                        Tôi đồng ý với <span className="text-primary hover:underline cursor-pointer">Điều khoản dịch vụ</span> và <span className="text-primary hover:underline cursor-pointer">Chính sách bảo mật</span>
                      </span>
                    </label>
                  </div>
                )}

                {/* STEP 2: Business */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Thông tin doanh nghiệp</h2>
                      <p className="text-muted-foreground">Giúp chúng tôi hiểu doanh nghiệp của bạn</p>
                    </div>
                    <div className="space-y-4">
                      <FloatingInput label="Tên doanh nghiệp *" value={companyName} onChange={setCompanyName} />
                      <div className="relative">
                        <FloatingInput label="Mã số thuế *" value={taxId} onChange={(v) => setTaxId(v.replace(/\D/g, '').slice(0, 10))} placeholder="10 chữ số" />
                        {taxId.length === 10 && (
                          <button className="absolute right-3 top-3.5 text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium hover:bg-primary/20 transition-colors">
                            🔍 Tra cứu
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block ml-1">Ngành nghề *</label>
                        <div className="grid grid-cols-2 gap-2">
                          {industries.map((ind) => (
                            <button
                              key={ind.label}
                              onClick={() => setIndustry(ind.label)}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 ${
                                industry === ind.label
                                  ? 'bg-primary/10 border border-primary/30 text-foreground shadow-[0_0_0_3px_hsla(var(--blue-500)/0.06)]'
                                  : 'bg-card/50 border border-border text-muted-foreground hover:border-primary/20'
                              }`}
                            >
                              <span>{ind.icon}</span>
                              <span className="truncate">{ind.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block ml-1">Tỉnh/Thành phố *</label>
                        <select
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full bg-card/50 border border-border rounded-2xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary/60 transition-all appearance-none cursor-pointer"
                        >
                          <option value="">Chọn tỉnh/thành</option>
                          {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block ml-1">Thời gian hoạt động</label>
                        <PillSelector
                          options={[
                            { value: '<1', label: 'Dưới 1 năm' },
                            { value: '1-3', label: '1-3 năm' },
                            { value: '3-5', label: '3-5 năm' },
                            { value: '5+', label: 'Trên 5 năm' },
                          ]}
                          value={yearsOp}
                          onChange={setYearsOp}
                        />
                      </div>
                      <div>
                        <div className="flex items-baseline justify-between mb-3 ml-1">
                          <label className="text-sm text-muted-foreground">Doanh thu hàng tháng</label>
                          <span className="font-mono text-base font-bold text-foreground">{formatVND(revenue)}</span>
                        </div>
                        <input
                          type="range"
                          min={50_000_000} max={50_000_000_000} step={50_000_000}
                          value={revenue}
                          onChange={(e) => setRevenue(Number(e.target.value))}
                          className="w-full accent-primary h-1.5 rounded-full appearance-none bg-accent cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                          <span>₫50M</span><span>₫50 tỷ</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block ml-1">Số lượng nhân viên</label>
                        <PillSelector
                          options={['1-5', '6-20', '21-50', '51-200', '200+'].map(v => ({ value: v, label: v }))}
                          value={empCount}
                          onChange={setEmpCount}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Data connections */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Kết nối dữ liệu</h2>
                      <p className="text-muted-foreground">Kết nối càng nhiều, hạn mức càng cao</p>
                    </div>

                    {/* Connection status card */}
                    <div className="bg-gradient-to-r from-primary/5 to-kapiva-green/5 border border-primary/15 rounded-2xl p-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{connectedBanks.length}/3 kết nối</p>
                        <p className="font-mono text-lg font-bold text-foreground">{formatVND(estimatedLimit)}</p>
                        <p className="text-xs text-muted-foreground">Hạn mức ước tính</p>
                      </div>
                      <div className="flex -space-x-2">
                        {connectedBanks.slice(0, 4).map((b, i) => (
                          <div key={b} className="w-8 h-8 rounded-full bg-kapiva-green/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-kapiva-green">
                            {b[0]}
                          </div>
                        ))}
                        {connectedBanks.length === 0 && (
                          <div className="w-8 h-8 rounded-full bg-accent border-2 border-background flex items-center justify-center">
                            <span className="text-muted-foreground text-xs">?</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-card/50 rounded-2xl p-1 flex gap-1">
                      {['🏦 Ngân hàng', '📊 Kế toán', '🛒 Thương mại'].map((t, i) => (
                        <button
                          key={t}
                          onClick={() => setDataTab(i)}
                          className={`flex-1 text-sm py-2.5 rounded-xl font-medium transition-all duration-200 ${
                            dataTab === i ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {dataTab === 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {banks.map((b) => {
                          const connected = connectedBanks.includes(b);
                          const connecting = connectingBank === b;
                          return (
                            <motion.button
                              key={b}
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => connectBank(b)}
                              disabled={connected || connecting}
                              className={`relative rounded-2xl p-4 text-center transition-all duration-300 ${
                                connected ? 'bg-kapiva-green/5 border-2 border-kapiva-green/30' :
                                connecting ? 'bg-primary/5 border-2 border-primary/30' :
                                'bg-card/50 border border-border hover:border-primary/30 hover:shadow-[0_4px_16px_hsla(var(--blue-500)/0.08)]'
                              }`}
                            >
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 text-base font-bold transition-all ${
                                connected ? 'bg-kapiva-green/15 text-kapiva-green' :
                                'bg-accent text-foreground'
                              }`}>
                                {connecting ? <Loader2 size={18} className="animate-spin text-primary" /> : b[0] + b[1]}
                              </div>
                              <p className="text-xs text-foreground font-medium">{b}</p>
                              <p className={`text-[10px] mt-1 font-medium ${
                                connected ? 'text-kapiva-green' :
                                connecting ? 'text-primary' :
                                'text-muted-foreground'
                              }`}>
                                {connected ? '✓ Đã kết nối' : connecting ? 'Đang kết nối...' : 'Kết nối'}
                              </p>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {dataTab === 1 && (
                      <div className="space-y-3">
                        {['MISA SME', 'Fast Accounting', '1C Vietnam'].map((s) => (
                          <div key={s} className="bg-card/50 border border-border rounded-2xl p-4 flex items-center justify-between hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-bold text-foreground">{s[0]}</div>
                              <span className="text-sm text-foreground font-medium">{s}</span>
                            </div>
                            <button className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:brightness-110 transition-all">
                              Kết nối
                            </button>
                          </div>
                        ))}
                        <div className="border-2 border-dashed border-border/60 rounded-2xl p-10 text-center hover:border-primary/30 transition-colors cursor-pointer group">
                          <Upload size={28} className="text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
                          <p className="text-sm text-muted-foreground">Kéo thả file .xlsx hoặc .csv</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">Bank statements, sales reports</p>
                        </div>
                      </div>
                    )}

                    {dataTab === 2 && (
                      <div className="space-y-3">
                        {['Shopee', 'Lazada', 'TikTok Shop', 'Tiki'].map((s) => (
                          <div key={s} className="bg-card/50 border border-border rounded-2xl p-4 flex items-center justify-between hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-sm font-bold text-foreground">{s[0]}</div>
                              <span className="text-sm text-foreground font-medium">{s}</span>
                            </div>
                            <button className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium hover:brightness-110 transition-all">
                              Kết nối
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Capital needs */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Nhu cầu vốn</h2>
                      <p className="text-muted-foreground">Bạn cần vốn cho mục đích gì?</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {purposeOptions.map((p) => {
                        const selected = purposes.includes(p.label);
                        return (
                          <motion.button
                            key={p.label}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => togglePurpose(p.label)}
                            className={`relative rounded-2xl p-5 text-left transition-all duration-200 ${
                              selected
                                ? 'bg-primary/8 border-2 border-primary/30 shadow-[0_0_0_3px_hsla(var(--blue-500)/0.06)]'
                                : 'bg-card/50 border border-border hover:border-primary/20'
                            }`}
                          >
                            {selected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                              >
                                <Check size={10} className="text-primary-foreground" strokeWidth={3} />
                              </motion.div>
                            )}
                            <span className="text-2xl">{p.icon}</span>
                            <p className="text-sm text-foreground font-medium mt-2">{p.label}</p>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between ml-1">
                        <label className="text-sm text-muted-foreground">Hạn mức mong muốn</label>
                        <span className="font-mono text-xl font-bold text-foreground">{formatVND(desiredAmount)}</span>
                      </div>
                      <input
                        type="range"
                        min={100_000_000} max={10_000_000_000} step={100_000_000}
                        value={desiredAmount}
                        onChange={(e) => setDesiredAmount(Number(e.target.value))}
                        className="w-full accent-primary h-1.5 rounded-full appearance-none bg-accent cursor-pointer [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-[0_2px_8px_hsla(var(--blue-500)/0.3)] [&::-webkit-slider-thumb]:appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                        <span>₫100M</span><span>₫10 tỷ</span>
                      </div>
                      <motion.p
                        key={desiredAmount}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-kapiva-green ml-1"
                      >
                        Dựa trên hồ sơ, hạn mức ước tính: <span className="font-mono font-bold">{formatVND(Math.min(desiredAmount * 1.5, 10_000_000_000))}</span>
                      </motion.p>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground mb-3 block ml-1">Thời hạn ưa thích</label>
                      <PillSelector
                        options={[
                          { value: '30', label: '30 ngày' },
                          { value: '60', label: '60 ngày' },
                          { value: '90', label: '90 ngày' },
                          { value: '180', label: '180 ngày' },
                        ]}
                        value={desiredTerm}
                        onChange={setDesiredTerm}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: eKYC */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display font-extrabold text-3xl text-foreground mb-2">Xác minh danh tính</h2>
                      <p className="text-muted-foreground">Bước cuối cùng để hoàn tất hồ sơ</p>
                    </div>

                    {/* ID Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      {['front', 'back'].map((side) => {
                        const label = side === 'front' ? 'CCCD Mặt trước' : 'CCCD Mặt sau';
                        const uploaded = uploadedDocs.includes(side);
                        return (
                          <motion.div
                            key={side}
                            whileHover={{ y: -2 }}
                            onClick={() => simulateUpload(side)}
                            className={`relative rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                              uploaded
                                ? 'bg-kapiva-green/5 border-2 border-kapiva-green/30'
                                : 'border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/3'
                            }`}
                          >
                            {uploaded ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                                <div className="w-12 h-12 rounded-2xl bg-kapiva-green/15 flex items-center justify-center mx-auto mb-2">
                                  <Check size={20} className="text-kapiva-green" strokeWidth={3} />
                                </div>
                                <p className="text-sm text-kapiva-green font-medium">Đã tải lên</p>
                              </motion.div>
                            ) : (
                              <>
                                <Camera size={24} className="text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-foreground font-medium">{label}</p>
                                <p className="text-xs text-muted-foreground mt-1">Chụp hoặc tải lên</p>
                              </>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Selfie */}
                    <div
                      onClick={() => simulateUpload('selfie')}
                      className={`rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                        uploadedDocs.includes('selfie')
                          ? 'bg-kapiva-green/5 border-2 border-kapiva-green/30'
                          : 'border-2 border-dashed border-border/60 hover:border-primary/40'
                      }`}
                    >
                      {uploadedDocs.includes('selfie') ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                          <div className="w-16 h-16 rounded-full bg-kapiva-green/15 flex items-center justify-center mx-auto mb-3">
                            <Check size={24} className="text-kapiva-green" strokeWidth={3} />
                          </div>
                          <p className="text-sm text-kapiva-green font-medium">Ảnh selfie đã tải lên</p>
                        </motion.div>
                      ) : (
                        <>
                          <div className="w-20 h-20 rounded-full border-2 border-border mx-auto mb-3 flex items-center justify-center">
                            <Camera size={24} className="text-muted-foreground" />
                          </div>
                          <p className="text-sm text-foreground font-medium">Chụp ảnh selfie</p>
                        </>
                      )}
                    </div>

                    {/* Signature */}
                    <div>
                      <div className="flex items-center justify-between mb-2 ml-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Pen size={14} /> Chữ ký số
                        </p>
                        {hasSigned && (
                          <button onClick={clearCanvas} className="text-xs text-primary hover:underline">Xóa</button>
                        )}
                      </div>
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={150}
                        onMouseDown={startDraw}
                        onMouseMove={draw}
                        onMouseUp={stopDraw}
                        onMouseLeave={stopDraw}
                        className="w-full h-36 bg-card/50 border border-border rounded-2xl cursor-crosshair"
                      />
                      {!hasSigned && (
                        <p className="text-xs text-muted-foreground text-center mt-2">Vẽ chữ ký của bạn ở đây</p>
                      )}
                    </div>

                    {/* Confirmation */}
                    <label className="flex items-start gap-3 group cursor-pointer">
                      <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                        eKYCConfirm ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/40'
                      }`} onClick={() => setEKYCConfirm(!eKYCConfirm)}>
                        {eKYCConfirm && <Check size={12} className="text-primary-foreground" strokeWidth={3} />}
                      </div>
                      <span className="text-sm text-muted-foreground leading-relaxed" onClick={() => setEKYCConfirm(!eKYCConfirm)}>
                        Tôi xác nhận thông tin trên là chính xác và đồng ý cho KAPIVA xử lý dữ liệu theo <span className="text-primary">Chính sách bảo mật</span>
                      </span>
                    </label>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-border/30">
              {step > 0 ? (
                <button
                  onClick={prev}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  ← Quay lại
                </button>
              ) : (
                <div />
              )}
              {step === 2 && (
                <button onClick={next} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Bỏ qua bước này
                </button>
              )}
              {step < 4 ? (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={next}
                  className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl text-sm font-display font-bold hover:brightness-110 transition-all shadow-[0_4px_16px_hsla(var(--blue-500)/0.25)] flex items-center gap-2"
                >
                  Tiếp tục <ArrowRight size={14} />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleComplete}
                  className="bg-kapiva-green text-background px-8 py-3 rounded-2xl text-sm font-display font-bold hover:brightness-110 transition-all shadow-[0_4px_16px_hsla(var(--green-500)/0.25)] flex items-center gap-2"
                >
                  🚀 Hoàn tất đăng ký
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
