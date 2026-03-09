import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Cpu, Truck, Bot, Radio, Plane, MoreHorizontal, Wallet, Zap, Activity, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatVND } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';
import M2MRuleEngine from '@/components/m2m/M2MRuleEngine';

const DEVICE_TYPES = [
  { value: 'vehicle', label: 'Xe / Phương tiện', icon: Truck },
  { value: 'robot', label: 'Robot', icon: Bot },
  { value: 'iot_sensor', label: 'IoT Sensor', icon: Radio },
  { value: 'pos_terminal', label: 'POS Terminal', icon: Cpu },
  { value: 'drone', label: 'Drone', icon: Plane },
  { value: 'other', label: 'Khác', icon: Cpu },
];

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-kapiva-green/15 text-kapiva-green border-kapiva-green/30',
  suspended: 'bg-kapiva-amber/15 text-kapiva-amber border-kapiva-amber/30',
  deleted: 'bg-destructive/15 text-destructive border-destructive/30',
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type DeviceWallet = {
  id: string;
  company_id: string;
  device_did: string;
  device_name: string;
  device_type: string;
  balance: number;
  initial_balance: number;
  status: string;
  loan_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function M2MDevicesPage() {
  const [devices, setDevices] = useState<DeviceWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceWallet | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('vehicle');
  const [formBalance, setFormBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanyAndDevices();
  }, []);

  const fetchCompanyAndDevices = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (companies && companies.length > 0) {
      setCompanyId(companies[0].id);
      const { data: devs } = await supabase
        .from('device_wallets')
        .select('*')
        .eq('company_id', companies[0].id)
        .order('created_at', { ascending: false });
      setDevices((devs as DeviceWallet[]) || []);
    }
    setLoading(false);
  };

  const registerDevice = async () => {
    if (!companyId || !formName.trim()) return;
    setSubmitting(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/m2m-operations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            action: 'register_device',
            company_id: companyId,
            device_name: formName.trim(),
            device_type: formType,
            initial_balance: parseInt(formBalance) || 0,
          }),
        }
      );
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Failed');

      toast({ title: '✅ Đã đăng ký thiết bị', description: `DID: ${result.device.device_did}` });
      setShowModal(false);
      setFormName('');
      setFormBalance('');
      fetchCompanyAndDevices();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const topUpDevice = async (deviceId: string, amount: number) => {
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/m2m-operations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ action: 'topup', device_id: deviceId, amount }),
        }
      );
      if (!res.ok) throw new Error('Top-up failed');

      toast({ title: '✅ Nạp tiền thành công', description: formatVND(amount) });
      fetchCompanyAndDevices();
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
    }
  };

  const DeviceIcon = ({ type }: { type: string }) => {
    const dt = DEVICE_TYPES.find(d => d.value === type);
    const Icon = dt?.icon || Cpu;
    return <Icon size={18} className="text-primary" />;
  };

  if (selectedDevice) {
    return (
      <M2MRuleEngine
        device={selectedDevice}
        onBack={() => { setSelectedDevice(null); fetchCompanyAndDevices(); }}
        onTopUp={(amount) => topUpDevice(selectedDevice.id, amount)}
      />
    );
  }

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }}>
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Thiết bị M2M</h2>
          <p className="text-sm text-muted-foreground mt-1">Quản lý ví & quy tắc thanh toán tự động</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> Thêm thiết bị
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Thiết bị hoạt động', value: devices.filter(d => d.status === 'active').length.toString(), icon: Activity, color: 'text-kapiva-green' },
          { label: 'Tổng số dư ví', value: formatVND(devices.reduce((s, d) => s + (d.balance || 0), 0)), icon: Wallet, color: 'text-primary' },
          { label: 'Tổng thiết bị', value: devices.length.toString(), icon: Cpu, color: 'text-kapiva-amber' },
          { label: 'Cần nạp thêm', value: devices.filter(d => d.initial_balance > 0 && d.balance < d.initial_balance * 0.2).length.toString(), icon: AlertTriangle, color: 'text-destructive' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card/60 border border-border/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon size={14} className={stat.color} />
            </div>
            <p className="font-mono text-xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </motion.div>

      {/* Device List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : devices.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 bg-card/40 border border-border/40 rounded-2xl">
          <Cpu size={40} className="mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Chưa có thiết bị M2M nào</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Thêm thiết bị để bắt đầu thanh toán tự động</p>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="grid gap-3">
          {devices.map((device) => {
            const budgetPct = device.initial_balance > 0 ? (device.balance / device.initial_balance) * 100 : 100;
            const isLow = budgetPct < 20;
            return (
              <motion.div
                key={device.id}
                whileHover={{ scale: 1.005 }}
                onClick={() => setSelectedDevice(device)}
                className="bg-card/60 border border-border/60 rounded-2xl p-4 cursor-pointer hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
                    <DeviceIcon type={device.device_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{device.device_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[device.status] || STATUS_COLORS.active}`}>
                        {device.status}
                      </span>
                      {isLow && <AlertTriangle size={12} className="text-destructive animate-pulse" />}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{device.device_did}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-foreground">{formatVND(device.balance || 0)}</p>
                    {device.initial_balance > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isLow ? 'bg-destructive' : 'bg-kapiva-green'}`}
                            style={{ width: `${Math.min(budgetPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{Math.round(budgetPct)}%</span>
                      </div>
                    )}
                  </div>
                  <MoreHorizontal size={16} className="text-muted-foreground" />
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Register Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-foreground">Đăng ký thiết bị mới</h3>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Tên thiết bị</label>
                  <input
                    value={formName} onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Xe TK-01, Robot Kho A..."
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Loại thiết bị</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DEVICE_TYPES.map((dt) => (
                      <button
                        key={dt.value}
                        onClick={() => setFormType(dt.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-all ${
                          formType === dt.value
                            ? 'border-primary/50 bg-primary/8 text-primary'
                            : 'border-border text-muted-foreground hover:border-border/80'
                        }`}
                      >
                        <dt.icon size={16} />
                        <span>{dt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Số dư ban đầu (VNĐ)</label>
                  <input
                    type="number" value={formBalance} onChange={(e) => setFormBalance(e.target.value)}
                    placeholder="VD: 5000000"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 font-mono"
                  />
                </div>

                <button
                  onClick={registerDevice} disabled={submitting || !formName.trim()}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Đang đăng ký...' : '🔗 Đăng ký & Cấp DID'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
