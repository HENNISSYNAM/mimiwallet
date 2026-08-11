import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Shield, Check, Loader2, RefreshCw, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import bankVcb from '@/assets/logos/bank-vcb.png';
import bankBidv from '@/assets/logos/bank-bidv.png';
import bankTcb from '@/assets/logos/bank-tcb.png';
import bankVpb from '@/assets/logos/bank-vpb.png';
import bankMbb from '@/assets/logos/bank-mbb.png';
import bankAcb from '@/assets/logos/bank-acb.png';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import CasLink from './CasLink';

interface BankAccount {
  type: string;
  balance: string | number;
  number: string;
}

interface BankConnection {
  name: string;
  code: string;
  status: 'connected' | 'pending' | 'disconnected';
  lastSync?: string;
  accounts?: BankAccount[];
}

/** Keyed by the bank code the API returns, so an unlisted bank degrades to its code. */
const BANK_LOGOS: Record<string, string> = {
  VCB: bankVcb,
  BIDV: bankBidv,
  TCB: bankTcb,
  VPB: bankVpb,
  MBB: bankMbb,
  ACB: bankAcb,
};

const DEFAULT_BANKS: BankConnection[] = [
  { name: 'Vietcombank', code: 'VCB', status: 'disconnected' },
  { name: 'BIDV', code: 'BIDV', status: 'disconnected' },
  { name: 'Techcombank', code: 'TCB', status: 'disconnected' },
  { name: 'VPBank', code: 'VPB', status: 'disconnected' },
  { name: 'MB Bank', code: 'MBB', status: 'disconnected' },
  { name: 'ACB', code: 'ACB', status: 'disconnected' },
];

function formatBalance(val: number | string): string {
  if (typeof val === 'string') return val;
  return `₫${val.toLocaleString('vi-VN')}`;
}

export default function OpenBanking() {
  const { session } = useAuthStore();
  const [banks, setBanks] = useState<BankConnection[]>(DEFAULT_BANKS);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [consentScreen, setConsentScreen] = useState(false);
  const [loading, setLoading] = useState(true);

  const callAPI = async (action: string, body: Record<string, unknown> = {}) => {
    if (!session) {
      toast.error('Vui lòng đăng nhập');
      return null;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/open-banking?action=${action}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(body),
        }
      );
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
        return null;
      }
      return result.data;
    } catch {
      toast.error('Lỗi kết nối server');
      return null;
    }
  };

  // Load existing connections from backend
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const connections = await callAPI('list');
      if (connections && Array.isArray(connections)) {
        setBanks(prev =>
          prev.map(bank => {
            const saved = connections.find((c: any) => c.bank_code === bank.code);
            if (saved) {
              return {
                ...bank,
                status: saved.status as BankConnection['status'],
                lastSync: saved.last_synced_at
                  ? new Date(saved.last_synced_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : undefined,
                accounts: (saved.accounts as BankAccount[]) || [],
              };
            }
            return bank;
          })
        );
      }
      setLoading(false);
    };
    load();
  }, [session]);

  const connectBank = (code: string) => {
    setConnecting(code);
    setConsentScreen(true);
  };

  const confirmConnect = async () => {
    if (!connecting) return;
    setConsentScreen(false);
    const bank = banks.find(b => b.code === connecting);
    
    const result = await callAPI('connect', {
      bank_code: connecting,
      bank_name: bank?.name || connecting,
    });

    if (result) {
      setBanks(prev =>
        prev.map(b =>
          b.code === connecting
            ? {
                ...b,
                status: 'connected',
                lastSync: 'Vừa xong',
                accounts: (result.accounts as BankAccount[]) || [],
              }
            : b
        )
      );
      toast.success(`Đã kết nối ${bank?.name}`);
    }
    setConnecting(null);
  };

  const syncBank = async (code: string) => {
    setSyncing(code);
    const result = await callAPI('sync', { bank_code: code });
    if (result) {
      setBanks(prev =>
        prev.map(b => (b.code === code ? { ...b, lastSync: 'Vừa xong' } : b))
      );
      toast.success(`Đồng bộ thành công (${result.new_transactions} giao dịch mới)`);
    }
    setSyncing(null);
  };

  const connectedCount = banks.filter(b => b.status === 'connected').length;
  const totalBalance = banks.reduce((sum, b) => {
    if (!b.accounts) return sum;
    return sum + b.accounts.reduce((s, a) => s + (typeof a.balance === 'number' ? a.balance : 0), 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* The real integration. Everything below it is the demo path. */}
      <CasLink />

      {/* What is actually true about how the connection is secured. The
          previous version of this badge claimed conformance to Thông tư
          09/2024 and an "Open Banking API v3.1", neither of which Mimi has
          been assessed against — and it sat above six banks whose data was
          generated locally. */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Cách dữ liệu ngân hàng được bảo vệ</p>
            <p className="text-xs text-muted-foreground">
              Kết nối qua Cas · Quyền chỉ đọc · Mã truy cập mã hoá ML-KEM-768 + AES-256-GCM
            </p>
          </div>
        </div>
        <Lock size={16} className="text-mimi-green shrink-0" />
      </div>

      {/* Demo grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">Tài khoản demo</p>
            <p className="text-xs text-muted-foreground">
              Giao dịch mô phỏng, dùng để thử sản phẩm khi chưa liên kết ngân hàng thật.
              {connectedCount > 0 && ` Đang bật ${connectedCount}/6.`}
              {totalBalance > 0 && ` Tổng số dư mô phỏng ₫${(totalBalance / 1e9).toFixed(2)} tỷ.`}
            </p>
          </div>
        </div>
        {banks.map(bank => (
          <motion.div
            key={bank.code}
            layout
            className={`bg-card/60 border rounded-2xl overflow-hidden transition-all ${
              bank.status === 'connected' ? 'border-mimi-green/20' :
              bank.code === connecting ? 'border-primary/30' : 'border-border/60'
            }`}
          >
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setSelectedBank(selectedBank === bank.code ? null : bank.code)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden text-sm font-bold ring-1 ${
                  bank.status === 'connected'
                    ? 'bg-white ring-mimi-green/25'
                    : 'bg-white ring-border/60'
                }`}>
                  {BANK_LOGOS[bank.code] ? (
                    <img
                      src={BANK_LOGOS[bank.code]}
                      alt={bank.name}
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    /* Codes are user-supplied via the API, so an unknown one
                       still needs to render something legible. */
                    <span className="text-foreground">{bank.code}</span>
                  )}
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
              {selectedBank === bank.code && bank.accounts && bank.accounts.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border/40"
                >
                  <div className="p-4 space-y-2">
                    {bank.accounts.map((acc, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-accent/50 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-sm text-foreground font-medium">{acc.type}</p>
                          <p className="text-xs text-muted-foreground font-mono">{acc.number}</p>
                        </div>
                        <p className="font-mono text-sm font-bold text-foreground">{formatBalance(acc.balance)}</p>
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
                <p className="text-sm text-foreground font-medium mb-3">MIMI WALLET yêu cầu quyền:</p>
                <div className="space-y-2">
                  {[
                    'Xem số dư tài khoản',
                    'Xem lịch sử giao dịch (12 tháng)',
                    'Xem thông tin chủ tài khoản',
                  ].map(perm => (
                    <div key={perm} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check size={14} className="text-mimi-green shrink-0" />
                      {perm}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 mb-6 text-xs text-muted-foreground">
                <Lock size={12} className="shrink-0 mt-0.5 text-mimi-green" />
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
