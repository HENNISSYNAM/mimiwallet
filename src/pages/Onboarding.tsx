import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';
import { industries, provinces } from '@/lib/mockData';
import { formatVND } from '@/lib/formatters';
import { getPasswordStrength } from '@/lib/validators';
import { Check, ArrowRight, Upload } from 'lucide-react';

const steps = ['Tạo tài khoản', 'Doanh nghiệp', 'Kết nối dữ liệu', 'Nhu cầu vốn', 'Xác minh eKYC'];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
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
  const [dataTab, setDataTab] = useState(0);

  // Step 4
  const [purposes, setPurposes] = useState<string[]>([]);
  const [desiredAmount, setDesiredAmount] = useState(1_000_000_000);
  const [desiredTerm, setDesiredTerm] = useState(90);

  const pwStrength = getPasswordStrength(password);
  const strengthColors = ['bg-kapiva-red', 'bg-kapiva-red', 'bg-kapiva-amber', 'bg-kapiva-green', 'bg-kapiva-green'];

  const banks = ['Vietcombank', 'BIDV', 'Techcombank', 'MB Bank', 'VPBank', 'Agribank', 'ACB', 'Sacombank', 'TPBank'];

  const purposeOptions = [
    { icon: '📦', label: 'Nhập hàng tồn kho' },
    { icon: '🧾', label: 'Ứng tiền hóa đơn' },
    { icon: '📈', label: 'Mở rộng kinh doanh' },
    { icon: '👥', label: 'Trả lương nhân viên' },
    { icon: '🔧', label: 'Đầu tư thiết bị' },
    { icon: '🛡️', label: 'Dự phòng dòng tiền' },
  ];

  const toggleBank = (bank: string) => {
    setConnectedBanks(prev => prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]);
  };

  const togglePurpose = (p: string) => {
    setPurposes(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleComplete = () => {
    setCompleted(true);
    login();
  };

  const next = () => setStep(s => Math.min(s + 1, 4));
  const prev = () => setStep(s => Math.max(s - 1, 0));

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-kapiva-green/20 flex items-center justify-center mx-auto mb-6"
          >
            <Check size={40} className="text-kapiva-green" />
          </motion.div>
          <h2 className="font-display font-extrabold text-2xl text-foreground mb-4">Hồ sơ đã được gửi thành công!</h2>

          <div className="card-base p-4 mb-6 text-left space-y-3">
            {[
              { text: 'Đang phân tích dữ liệu ngân hàng...', delay: 0.8 },
              { text: 'Tính toán điểm tín dụng...', delay: 1.6 },
              { text: 'Xác định hạn mức phù hợp...', delay: 2.4 },
              { text: 'Gửi kết quả qua SMS/Email...', delay: 3.2 },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: item.delay }}
                className="flex items-center gap-2 text-sm"
              >
                <span>🔍</span>
                <span className="text-muted-foreground flex-1">{item.text}</span>
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: item.delay + 0.5 }} className="text-kapiva-green">✅</motion.span>
              </motion.div>
            ))}
          </div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4 }} className="font-mono text-2xl font-bold text-kapiva-green mb-2">
            Dự kiến hạn mức: ₫1,500,000,000
          </motion.p>
          <p className="text-sm text-muted-foreground mb-6">Chúng tôi sẽ liên hệ trong 24 giờ</p>

          <button onClick={() => navigate('/dashboard')} className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-display font-bold hover:brightness-110 transition-all">
            → Vào Dashboard ngay
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[380px] bg-secondary flex-col p-8 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="font-display font-extrabold text-primary-foreground text-sm">K</span>
          </div>
          <span className="font-display font-bold text-foreground">KAPIVA</span>
        </div>

        <div className="space-y-4 flex-1">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                i < step ? 'bg-kapiva-green text-background' :
                i === step ? 'bg-primary text-primary-foreground' :
                'border border-border text-muted-foreground'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`text-sm ${i <= step ? 'text-foreground' : 'text-muted-foreground'}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="card-base p-4 mt-auto">
          <p className="text-sm text-muted-foreground italic leading-relaxed">
            "97% doanh nghiệp nhận được vốn sau lần đăng ký đầu tiên"
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 p-6 lg:p-12 max-w-2xl">
        {/* Mobile step indicator */}
        <div className="lg:hidden flex items-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-accent'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-2xl text-foreground">Tạo tài khoản</h2>
                {[
                  { label: 'Họ và tên', value: fullName, set: setFullName, type: 'text' },
                  { label: 'Email doanh nghiệp', value: email, set: setEmail, type: 'email' },
                  { label: 'Số điện thoại', value: phone, set: setPhone, type: 'tel', placeholder: '0912 345 678' },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-sm text-muted-foreground mb-1 block">{f.label} *</label>
                    <input
                      type={f.type}
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.placeholder}
                      className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Mật khẩu *</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors" />
                  {password && (
                    <div className="flex gap-1 mt-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full ${i < pwStrength ? strengthColors[pwStrength] : 'bg-accent'}`} />
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Xác nhận mật khẩu *</label>
                  <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors" />
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="rounded accent-primary" />
                  Tôi đồng ý với Điều khoản dịch vụ và Chính sách bảo mật
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-2xl text-foreground">Thông tin doanh nghiệp</h2>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tên doanh nghiệp *</label>
                  <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Mã số thuế *</label>
                  <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="10 chữ số" className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Ngành nghề *</label>
                  <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors">
                    <option value="">Chọn ngành</option>
                    {industries.map((i) => <option key={i.label} value={i.label}>{i.icon} {i.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tỉnh/Thành phố *</label>
                  <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors">
                    <option value="">Chọn tỉnh/thành</option>
                    {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Thời gian hoạt động</label>
                  <div className="flex gap-2 flex-wrap">
                    {['Dưới 1 năm', '1-3 năm', '3-5 năm', 'Trên 5 năm'].map((y) => (
                      <button key={y} onClick={() => setYearsOp(y)} className={`text-xs px-3 py-2 rounded-lg transition-colors ${yearsOp === y ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{y}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-sm text-muted-foreground">Doanh thu hàng tháng</label>
                    <span className="font-mono text-sm text-foreground">{formatVND(revenue)}/tháng</span>
                  </div>
                  <input type="range" min={50_000_000} max={50_000_000_000} step={50_000_000} value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} className="w-full accent-primary" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Số lượng nhân viên</label>
                  <div className="flex gap-2">
                    {['1-5', '6-20', '21-50', '51-200', '200+'].map((e) => (
                      <button key={e} onClick={() => setEmpCount(e)} className={`text-xs flex-1 py-2 rounded-lg transition-colors ${empCount === e ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{e}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-2xl text-foreground">Kết nối dữ liệu</h2>
                <p className="text-sm text-muted-foreground">Kết nối càng nhiều, hạn mức càng cao</p>
                <div className="card-base p-3 text-center">
                  <span className="font-mono text-sm text-foreground">{connectedBanks.length}/3 kết nối — Hạn mức: </span>
                  <span className="font-mono text-sm text-kapiva-green font-bold">{formatVND(200_000_000 + connectedBanks.length * 300_000_000)}</span>
                </div>
                <div className="flex gap-2">
                  {['🏦 Ngân hàng', '📊 Kế toán', '🛒 Thương mại'].map((t, i) => (
                    <button key={t} onClick={() => setDataTab(i)} className={`text-xs px-3 py-2 rounded-lg transition-colors ${dataTab === i ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{t}</button>
                  ))}
                </div>
                {dataTab === 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {banks.map((b) => (
                      <button
                        key={b}
                        onClick={() => toggleBank(b)}
                        className={`card-base card-hover p-3 text-center text-xs transition-all ${connectedBanks.includes(b) ? 'border-kapiva-green bg-kapiva-green/5' : ''}`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mx-auto mb-2 text-lg font-bold text-foreground">{b[0]}</div>
                        <p className="text-foreground text-xs">{b}</p>
                        <p className={`text-xs mt-1 ${connectedBanks.includes(b) ? 'text-kapiva-green' : 'text-primary'}`}>
                          {connectedBanks.includes(b) ? '✅ Đã kết nối' : 'Kết nối'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
                {dataTab === 1 && (
                  <div className="space-y-3">
                    {['MISA SME', 'Fast Accounting', '1C Vietnam'].map((s) => (
                      <div key={s} className="card-base card-hover p-4 flex items-center justify-between">
                        <span className="text-sm text-foreground">{s}</span>
                        <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Kết nối</button>
                      </div>
                    ))}
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                      <Upload size={24} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Kéo thả file .xlsx hoặc .csv</p>
                    </div>
                  </div>
                )}
                {dataTab === 2 && (
                  <div className="space-y-3">
                    {['Shopee', 'Lazada', 'TikTok Shop', 'Tiki'].map((s) => (
                      <div key={s} className="card-base card-hover p-4 flex items-center justify-between">
                        <span className="text-sm text-foreground">{s}</span>
                        <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg">Kết nối</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-2xl text-foreground">Nhu cầu vốn</h2>
                <p className="text-sm text-muted-foreground">Bạn cần vốn cho mục đích gì?</p>
                <div className="grid grid-cols-2 gap-3">
                  {purposeOptions.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => togglePurpose(p.label)}
                      className={`card-base card-hover p-4 text-left transition-all ${purposes.includes(p.label) ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <span className="text-2xl">{p.icon}</span>
                      <p className="text-sm text-foreground mt-2">{p.label}</p>
                    </button>
                  ))}
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-muted-foreground">Hạn mức mong muốn</label>
                    <span className="font-mono text-lg font-bold text-foreground">{formatVND(desiredAmount)}</span>
                  </div>
                  <input type="range" min={100_000_000} max={10_000_000_000} step={100_000_000} value={desiredAmount} onChange={(e) => setDesiredAmount(Number(e.target.value))} className="w-full accent-primary" />
                  <p className="text-xs text-kapiva-green mt-1">Dựa trên hồ sơ, hạn mức ước tính: {formatVND(desiredAmount * 1.5)}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Thời hạn ưa thích</label>
                  <div className="flex gap-2">
                    {[30, 60, 90, 180].map((d) => (
                      <button key={d} onClick={() => setDesiredTerm(d)} className={`flex-1 text-sm py-2 rounded-lg transition-colors ${desiredTerm === d ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'}`}>{d} ngày</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="font-display font-bold text-2xl text-foreground">Xác minh danh tính (eKYC)</h2>
                <div className="grid grid-cols-2 gap-4">
                  {['CCCD Mặt trước', 'CCCD Mặt sau'].map((label) => (
                    <div key={label} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors">
                      <Upload size={24} className="text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">Chụp hoặc tải lên</p>
                    </div>
                  ))}
                </div>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <div className="w-24 h-24 rounded-full border-2 border-border mx-auto mb-3 flex items-center justify-center">
                    <Upload size={24} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Chụp ảnh selfie</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Chữ ký số</p>
                  <div className="bg-card border border-border rounded-xl h-32 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">Vẽ chữ ký của bạn</p>
                  </div>
                </div>
                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="rounded accent-primary mt-0.5" />
                  <span>Tôi xác nhận thông tin trên là chính xác và đồng ý cho KAPIVA xử lý dữ liệu theo Chính sách bảo mật</span>
                </label>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8">
          {step > 0 ? (
            <button onClick={prev} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Quay lại</button>
          ) : <div />}
          {step < 4 ? (
            <button onClick={next} className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-display font-bold hover:brightness-110 transition-all flex items-center gap-2">
              Tiếp tục <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handleComplete} className="bg-kapiva-green text-background px-6 py-2.5 rounded-lg text-sm font-display font-bold hover:brightness-110 transition-all">
              🚀 Hoàn tất đăng ký
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
