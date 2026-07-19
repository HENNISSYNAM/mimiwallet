import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, QrCode, Check, ArrowRight, Shield, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  type: 'domestic' | 'international';
  status: 'active' | 'inactive';
  description: string;
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([
    { id: 'vnpay', name: 'VNPay', icon: '🇻🇳', type: 'domestic', status: 'active', description: 'QR Pay, Internet Banking, thẻ ATM nội địa' },
    { id: 'momo', name: 'MoMo', icon: '📱', type: 'domestic', status: 'active', description: 'Ví MoMo, QR code, thanh toán 1 chạm' },
    { id: 'zalopay', name: 'ZaloPay', icon: '💙', type: 'domestic', status: 'inactive', description: 'Ví ZaloPay, QR code, chuyển khoản' },
    { id: 'stripe', name: 'Stripe', icon: '💳', type: 'international', status: 'active', description: 'Visa, Mastercard, Apple Pay, Google Pay' },
    { id: 'paypal', name: 'PayPal', icon: '🅿️', type: 'international', status: 'inactive', description: 'Thanh toán quốc tế qua PayPal' },
  ]);

  const [activeTab, setActiveTab] = useState<'domestic' | 'international'>('domestic');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const filteredMethods = methods.filter(m => m.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-foreground text-lg">Phương thức thanh toán</h3>
          <p className="text-sm text-muted-foreground mt-1">Quản lý thanh toán subscription và dịch vụ</p>
        </div>
        <div className="flex items-center gap-2 bg-kapiva-green/10 text-kapiva-green px-3 py-1.5 rounded-lg text-xs font-medium">
          <Shield size={12} /> PCI DSS Level 1
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-accent/30 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('domestic')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'domestic' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Smartphone size={14} /> Nội địa
        </button>
        <button
          onClick={() => setActiveTab('international')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'international' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Globe size={14} /> Quốc tế
        </button>
      </div>

      {/* Methods */}
      <div className="space-y-3">
        {filteredMethods.map(method => (
          <motion.div
            key={method.id}
            whileHover={{ y: -2 }}
            onClick={() => setSelectedMethod(selectedMethod === method.id ? null : method.id)}
            className={`bg-card/60 border rounded-2xl p-5 cursor-pointer transition-all ${
              method.status === 'active' ? 'border-kapiva-green/20' : 'border-border/60'
            } ${selectedMethod === method.id ? 'ring-1 ring-primary/20' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl">
                  {method.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{method.name}</p>
                    {method.status === 'active' && (
                      <span className="text-[10px] bg-kapiva-green/10 text-kapiva-green px-2 py-0.5 rounded-full font-medium">Hoạt động</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
                </div>
              </div>
              {method.status === 'active' ? (
                <Check size={18} className="text-kapiva-green" />
              ) : (
                <button
                  className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-medium flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMethods((prev) => prev.map((m) => (m.id === method.id ? { ...m, status: 'active' } : m)));
                    toast.success(`Đã kích hoạt ${method.name} (chế độ demo — cần liên kết tài khoản thật để nhận thanh toán)`);
                  }}
                >
                  Kích hoạt <ArrowRight size={10} />
                </button>
              )}
            </div>

            {/* Expanded details for VNPay */}
            {selectedMethod === method.id && method.id === 'vnpay' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-border/40 space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <QrCode size={20} />, label: 'QR Pay', desc: 'Quét mã QR' },
                    { icon: <CreditCard size={20} />, label: 'ATM Card', desc: 'Thẻ nội địa' },
                    { icon: <Smartphone size={20} />, label: 'Mobile Banking', desc: '40+ ngân hàng' },
                  ].map(opt => (
                    <div key={opt.label} className="bg-accent/50 rounded-xl p-3 text-center">
                      <div className="text-primary mx-auto mb-1 flex justify-center">{opt.icon}</div>
                      <p className="text-xs font-medium text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Shield size={10} className="text-kapiva-green" /> Phí: 1.1% + ₫1,650/GD • Giải ngân T+1
                </div>
              </motion.div>
            )}

            {/* MoMo details */}
            {selectedMethod === method.id && method.id === 'momo' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-4 border-t border-border/40">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Ví MoMo', value: '35M+ người dùng' },
                    { label: 'Phí giao dịch', value: '1.0% + ₫1,500' },
                    { label: 'Giải ngân', value: 'Tức thì' },
                    { label: 'Hạn mức', value: '₫50M/GD' },
                  ].map(item => (
                    <div key={item.label} className="bg-accent/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Transaction History Preview */}
      <div className="bg-card/60 border border-border/60 rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-3">Giao dịch thanh toán gần đây</h4>
        <div className="space-y-2">
          {[
            { method: 'VNPay', amount: '₫990,000', date: '09/03/2026', status: 'Thành công', plan: 'Growth Monthly' },
            { method: 'Stripe', amount: '₫990,000', date: '09/02/2026', status: 'Thành công', plan: 'Growth Monthly' },
            { method: 'MoMo', amount: '₫490,000', date: '09/01/2026', status: 'Thành công', plan: 'Starter Monthly' },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-foreground">
                  {tx.method[0]}
                </div>
                <div>
                  <p className="text-sm text-foreground">{tx.plan}</p>
                  <p className="text-xs text-muted-foreground">{tx.method} • {tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-medium text-foreground">{tx.amount}</p>
                <p className="text-xs text-kapiva-green">{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
