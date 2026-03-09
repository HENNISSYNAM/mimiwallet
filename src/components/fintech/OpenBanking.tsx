import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Shield, Check, Loader2, RefreshCw, Lock, ArrowRight, AlertTriangle, BarChart3 } from 'lucide-react';

interface BankConnection {
  name: string;
  code: string;
  status: 'connected' | 'pending' | 'disconnected';
  lastSync?: string;
  accounts?: { type: string; balance: string; number: string }[];
}

export default function OpenBanking() {
  const [banks, setBanks] = useState<BankConnection[]>([
    {
      name: 'Vietcombank', code: 'VCB', status: 'connected', lastSync: '5 phút trước',
      accounts: [
        { type: 'Thanh toán', balance: '₫1,245,000,000', number: '***4521' },
        { type: 'Tiết kiệm', balance: '₫850,000,000', number: '***7892' },
      ],
    },
    { name: 'BIDV', code: 'BIDV', status: 'connected', lastSync: '12 phút trước',
      accounts: [{ type: 'Thanh toán', balance: '₫752,500,000', number: '***3344' }],
    },
    { name: 'Techcombank', code: 'TCB', status: 'pending', lastSync: undefined },
    { name: 'VPBank', code: 'VPB', status: 'disconnected' },
    { name: 'MB Bank', code: 'MBB', status: 'disconnected' },
    { name: 'ACB', code: 'ACB', status: 'disconnected' },
  ]);

  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [consentScreen, setConsentScreen] = useState(false);

  const connectBank = (code: string) => {
    setConnecting(code);
    setConsentScreen(true);
  };

  const confirmConnect = () => {
    if (!connecting) return;
    setConsentScreen(false);
    setTimeout(() => {
      setBanks(prev => prev.map(b => b.code === connecting ? { ...b, status: 'connected', lastSync: 'Vừa xong',
        accounts: [{ type: 'Thanh toán', balance: '₫520,000,000', number: '***1234' }] } : b));
      setConnecting(null);
    }, 2000);
  };

  const syncBank = (code: string) => {
    setSyncing(code);
    setTimeout(() => {
      setBanks(prev => prev.map(b => b.code === code ? { ...b, lastSync: 'Vừa xong' } : b));
      setSyncing(null);
    }, 1500);
  };

  const connectedCount = banks.filter(b => b.status === 'connected').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ngân hàng kết nối', value: `${connectedCount}/6`, color: 'text-primary' },
          { label: 'Tổng số dư', value: '₫2.85 tỷ', color: 'text-kapiva-green' },
          { label: 'Giao dịch đồng bộ', value: '2,847', color: 'text-foreground' },
        ].map(stat => (
          <div key={stat.label} className="bg-card/60 border border-border/60 rounded-xl p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`font-mono text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* API Standard Badge */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">Open Banking API v3.1</p>
            <p className="text-xs text-muted-foreground">Tuân thủ Thông tư 09/2024 NHNN • Mã hóa AES-256 • OAuth 2.0</p>
          </div>
        </div>
        <Lock size={16} className="text-kapiva-green" />
      </div>

      {/* Bank List */}
      <div className="space-y-3">
        {banks.map(bank => (
          <motion.div
            key={bank.code}
            layout
            className={`bg-card/60 border rounded-2xl overflow-hidden transition-all ${
              bank.status === 'connected' ? 'border-kapiva-green/20' :
              bank.code === connecting ? 'border-primary/30' : 'border-border/60'
            }`}
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setSelectedBank(selectedBank === bank.code ? null : bank.code)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold ${
                  bank.status === 'connected' ? 'bg-kapiva-green/10 text-kapiva-green' :
                  'bg-accent text-foreground'
                }`}>
                  {bank.code}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{bank.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {bank.status === 'connected' && `✓ Kết nối • Đồng bộ ${bank.lastSync}`}
                    {bank.status === 'pending' && '⏳ Đang chờ xác nhận...'}
                    {bank.status === 'disconnected' && 'Chưa kết nối'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {bank.status === 'connected' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); syncBank(bank.code); }}
                    className="text-xs bg-accent px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <RefreshCw size={10} className={syncing === bank.code ? 'animate-spin' : ''} />
                    {syncing === bank.code ? 'Đang đồng bộ...' : 'Đồng bộ'}
                  </button>
                )}
                {bank.status === 'disconnected' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); connectBank(bank.code); }}
                    className="text-xs bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-medium flex items-center gap-1"
                  >
                    {connecting === bank.code ? <Loader2 size={10} className="animate-spin" /> : <Link2 size={10} />}
                    Kết nối
                  </button>
                )}
              </div>
            </div>

            {/* Expanded accounts */}
            <AnimatePresence>
              {selectedBank === bank.code && bank.accounts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border/40"
                >
                  <div className="p-4 space-y-2">
                    {bank.accounts.map(acc => (
                      <div key={acc.number} className="flex items-center justify-between bg-accent/50 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm text-foreground font-medium">{acc.type}</p>
                          <p className="text-xs text-muted-foreground font-mono">{acc.number}</p>
                        </div>
                        <p className="font-mono text-sm font-bold text-foreground">{acc.balance}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Consent Modal */}
      <AnimatePresence>
        {consentScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => { setConsentScreen(false); setConnecting(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <Shield size={24} className="text-primary" />
                <h3 className="font-display font-bold text-foreground text-lg">Ủy quyền truy cập</h3>
              </div>

              <div className="bg-accent/50 rounded-xl p-4 mb-6">
                <p className="text-sm text-foreground font-medium mb-3">KAPIVA yêu cầu quyền:</p>
                <div className="space-y-2">
                  {[
                    'Xem số dư tài khoản',
                    'Xem lịch sử giao dịch (12 tháng)',
                    'Xem thông tin chủ tài khoản',
                  ].map(perm => (
                    <div key={perm} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-kapiva-green shrink-0" />
                      {perm}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 mb-6 text-xs text-muted-foreground">
                <Lock size={12} className="shrink-0 mt-0.5 text-kapiva-green" />
                <span>Dữ liệu được mã hóa AES-256 và chỉ sử dụng cho mục đích đánh giá tín dụng. Bạn có thể hủy bất cứ lúc nào.</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setConsentScreen(false); setConnecting(null); }}
                  className="flex-1 bg-accent text-foreground py-2.5 rounded-xl text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={confirmConnect}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-display font-bold flex items-center justify-center gap-2"
                >
                  Đồng ý kết nối <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
