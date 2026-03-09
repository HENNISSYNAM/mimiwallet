import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Zap, Wallet, Activity, RefreshCw, X, Play, Pause, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatVND } from '@/lib/formatters';
import { useToast } from '@/hooks/use-toast';

type DeviceWallet = {
  id: string;
  device_did: string;
  device_name: string;
  device_type: string;
  balance: number;
  initial_balance: number;
  status: string;
};

type DeviceRule = {
  id: string;
  rule_name: string;
  trigger_condition: any;
  trigger_logic: string;
  action_type: string;
  action_params: any;
  limit_per_tx: number | null;
  limit_per_day: number | null;
  limit_per_month: number | null;
  is_active: boolean;
  execution_count: number;
  created_at: string;
};

type M2MTx = {
  id: string;
  tx_type: string;
  amount: number;
  recipient_name: string | null;
  status: string;
  created_at: string;
};

const TRIGGER_FIELDS = [
  { value: 'fuel_level', label: 'Mức nhiên liệu (%)' },
  { value: 'temperature', label: 'Nhiệt độ (°C)' },
  { value: 'revenue_amount', label: 'Doanh thu (VNĐ)' },
  { value: 'time_hour', label: 'Giờ trong ngày' },
  { value: 'distance_km', label: 'Khoảng cách (km)' },
  { value: 'inventory_level', label: 'Tồn kho (%)' },
];

const ACTION_TYPES = [
  { value: 'AUTO_PAY', label: 'Tự động thanh toán', color: 'text-kapiva-green' },
  { value: 'TRANSFER', label: 'Chuyển khoản', color: 'text-primary' },
  { value: 'ALERT', label: 'Cảnh báo', color: 'text-kapiva-amber' },
  { value: 'BLOCK', label: 'Chặn giao dịch', color: 'text-destructive' },
];

const TX_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-kapiva-green/15 text-kapiva-green',
  pending: 'bg-kapiva-amber/15 text-kapiva-amber',
  failed: 'bg-destructive/15 text-destructive',
};

export default function M2MRuleEngine({
  device,
  onBack,
  onTopUp,
}: {
  device: DeviceWallet;
  onBack: () => void;
  onTopUp: (amount: number) => void;
}) {
  const [tab, setTab] = useState<'rules' | 'transactions'>('rules');
  const [rules, setRules] = useState<DeviceRule[]>([]);
  const [transactions, setTransactions] = useState<M2MTx[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const { toast } = useToast();

  // New rule form
  const [ruleName, setRuleName] = useState('');
  const [triggerField, setTriggerField] = useState('fuel_level');
  const [triggerOp, setTriggerOp] = useState('<');
  const [triggerValue, setTriggerValue] = useState('');
  const [actionType, setActionType] = useState('AUTO_PAY');
  const [recipientName, setRecipientName] = useState('');
  const [limitPerTx, setLimitPerTx] = useState('');
  const [limitPerDay, setLimitPerDay] = useState('');

  useEffect(() => {
    fetchRules();
    fetchTransactions();

    // Realtime subscription for transactions
    const channel = supabase
      .channel(`m2m-tx-${device.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'm2m_transactions',
        filter: `device_id=eq.${device.id}`,
      }, (payload) => {
        setTransactions(prev => [payload.new as M2MTx, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [device.id]);

  const fetchRules = async () => {
    const { data } = await supabase
      .from('device_rules')
      .select('*')
      .eq('device_id', device.id)
      .order('created_at', { ascending: false });
    setRules((data as DeviceRule[]) || []);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('m2m_transactions')
      .select('*')
      .eq('device_id', device.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions((data as M2MTx[]) || []);
  };

  const addRule = async () => {
    if (!ruleName.trim()) return;

    const { error } = await supabase.from('device_rules').insert({
      device_id: device.id,
      rule_name: ruleName.trim(),
      trigger_condition: [{ field: triggerField, operator: triggerOp, value: parseFloat(triggerValue) || 0 }],
      action_type: actionType,
      action_params: { recipient_name: recipientName },
      limit_per_tx: parseInt(limitPerTx) || null,
      limit_per_day: parseInt(limitPerDay) || null,
    });

    if (error) {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '✅ Đã tạo quy tắc' });
      setShowAddRule(false);
      setRuleName('');
      setTriggerValue('');
      setRecipientName('');
      setLimitPerTx('');
      setLimitPerDay('');
      fetchRules();
    }
  };

  const toggleRule = async (ruleId: string, active: boolean) => {
    await supabase.from('device_rules').update({ is_active: !active }).eq('id', ruleId);
    fetchRules();
  };

  const deleteRule = async (ruleId: string) => {
    await supabase.from('device_rules').delete().eq('id', ruleId);
    fetchRules();
  };

  const budgetPct = device.initial_balance > 0 ? (device.balance / device.initial_balance) * 100 : 100;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {/* Back + Device Header */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft size={16} /> Quay lại danh sách
      </button>

      <div className="bg-card/60 border border-border/60 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">{device.device_name}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-1">{device.device_did}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-foreground">{formatVND(device.balance || 0)}</p>
            <div className="flex items-center gap-2 mt-1 justify-end">
              <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${budgetPct < 20 ? 'bg-destructive' : 'bg-kapiva-green'}`}
                  style={{ width: `${Math.min(budgetPct, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{Math.round(budgetPct)}%</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowTopUp(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/15 transition-colors"
          >
            <Wallet size={13} /> Nạp tiền
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-kapiva-green/10 text-kapiva-green rounded-lg text-xs font-medium">
            <Activity size={13} /> {device.status}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-secondary/50 p-1 rounded-xl w-fit">
        {(['rules', 'transactions'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'rules' ? '⚡ Quy tắc tự động' : '📊 Giao dịch'}
          </button>
        ))}
      </div>

      {tab === 'rules' ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{rules.length} quy tắc</p>
            <button
              onClick={() => setShowAddRule(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
            >
              <Plus size={14} /> Thêm quy tắc
            </button>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 bg-card/40 border border-border/40 rounded-2xl">
              <Zap size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Chưa có quy tắc nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const cond = Array.isArray(rule.trigger_condition) ? rule.trigger_condition[0] : null;
                const actionInfo = ACTION_TYPES.find(a => a.value === rule.action_type);
                return (
                  <motion.div
                    key={rule.id}
                    layout
                    className={`bg-card/60 border rounded-xl p-4 transition-all ${
                      rule.is_active ? 'border-primary/20' : 'border-border/40 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap size={14} className={rule.is_active ? 'text-kapiva-amber' : 'text-muted-foreground'} />
                        <span className="font-semibold text-sm text-foreground">{rule.rule_name}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {rule.execution_count}x thực thi
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleRule(rule.id, rule.is_active)}
                          className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                          title={rule.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        >
                          {rule.is_active ? <Pause size={13} className="text-kapiva-amber" /> : <Play size={13} className="text-kapiva-green" />}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 size={13} className="text-destructive" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-secondary px-2 py-1 rounded text-muted-foreground">
                        IF {cond ? `${cond.field} ${cond.operator} ${cond.value}` : '...'}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className={`px-2 py-1 rounded bg-secondary ${actionInfo?.color}`}>
                        {actionInfo?.label}
                      </span>
                      {rule.limit_per_tx && (
                        <span className="text-muted-foreground/60">Max: {formatVND(rule.limit_per_tx)}/tx</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Add Rule Modal */}
          <AnimatePresence>
            {showAddRule && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowAddRule(false)}
              >
                <motion.div
                  initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg"
                >
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-display font-bold text-foreground">Tạo quy tắc mới</h3>
                    <button onClick={() => setShowAddRule(false)}><X size={18} className="text-muted-foreground" /></button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1.5 block">Tên quy tắc</label>
                      <input
                        value={ruleName} onChange={(e) => setRuleName(e.target.value)}
                        placeholder="VD: Tự động đổ nhiên liệu"
                        className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
                      />
                    </div>

                    {/* IF condition */}
                    <div className="bg-secondary/50 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-kapiva-amber mb-3">⚡ IF (Điều kiện)</p>
                      <div className="grid grid-cols-3 gap-2">
                        <select value={triggerField} onChange={(e) => setTriggerField(e.target.value)}
                          className="bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground outline-none">
                          {TRIGGER_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                        <select value={triggerOp} onChange={(e) => setTriggerOp(e.target.value)}
                          className="bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground outline-none">
                          <option value="<">{'<'} Nhỏ hơn</option>
                          <option value=">">{'>'} Lớn hơn</option>
                          <option value="==">{'=='} Bằng</option>
                        </select>
                        <input
                          type="number" value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)}
                          placeholder="Giá trị"
                          className="bg-background border border-border rounded-lg px-2 py-2 text-xs text-foreground outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* THEN action */}
                    <div className="bg-secondary/50 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-kapiva-green mb-3">→ THEN (Hành động)</p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        {ACTION_TYPES.map(a => (
                          <button key={a.value} onClick={() => setActionType(a.value)}
                            className={`px-3 py-2 rounded-lg text-xs border transition-all ${
                              actionType === a.value
                                ? 'border-primary/50 bg-primary/8 text-primary'
                                : 'border-border text-muted-foreground'
                            }`}
                          >{a.label}</button>
                        ))}
                      </div>
                      <input
                        value={recipientName} onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Tên người nhận (VD: Trạm xăng ABC)"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none"
                      />
                    </div>

                    {/* LIMIT */}
                    <div className="bg-secondary/50 p-4 rounded-xl">
                      <p className="text-xs font-semibold text-primary mb-3">🔒 LIMIT (Giới hạn)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground">Max/giao dịch (VNĐ)</label>
                          <input
                            type="number" value={limitPerTx} onChange={(e) => setLimitPerTx(e.target.value)}
                            placeholder="500000"
                            className="w-full px-2 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-mono mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground">Max/ngày (VNĐ)</label>
                          <input
                            type="number" value={limitPerDay} onChange={(e) => setLimitPerDay(e.target.value)}
                            placeholder="5000000"
                            className="w-full px-2 py-2 bg-background border border-border rounded-lg text-xs text-foreground outline-none font-mono mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={addRule} disabled={!ruleName.trim()}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      ⚡ Tạo quy tắc
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Transactions Tab */
        <div>
          {transactions.length === 0 ? (
            <div className="text-center py-12 bg-card/40 border border-border/40 rounded-2xl">
              <Activity size={32} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Chưa có giao dịch M2M nào</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-card/60 border border-border/60 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${
                      tx.tx_type === 'top_up' ? 'bg-kapiva-green/15 text-kapiva-green' : 'bg-primary/10 text-primary'
                    }`}>
                      {tx.tx_type === 'top_up' ? '↓' : '↑'}
                    </div>
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        {tx.tx_type === 'top_up' ? 'Nạp tiền' : tx.tx_type === 'auto_pay' ? 'Thanh toán tự động' : tx.tx_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.recipient_name || '—'} · {new Date(tx.created_at).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-sm font-bold ${tx.tx_type === 'top_up' ? 'text-kapiva-green' : 'text-foreground'}`}>
                      {tx.tx_type === 'top_up' ? '+' : '-'}{formatVND(tx.amount)}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${TX_STATUS_COLORS[tx.status] || ''}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TopUp Modal */}
      <AnimatePresence>
        {showTopUp && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTopUp(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm"
            >
              <h3 className="font-display font-bold text-foreground mb-4">Nạp tiền vào ví</h3>
              <div className="space-y-3 mb-4">
                {[1000000, 5000000, 10000000, 20000000].map((amt) => (
                  <button key={amt} onClick={() => setTopUpAmount(amt.toString())}
                    className={`w-full py-2.5 rounded-xl border text-sm font-mono transition-all ${
                      topUpAmount === amt.toString()
                        ? 'border-primary/50 bg-primary/8 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    }`}
                  >{formatVND(amt)}</button>
                ))}
                <input
                  type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Hoặc nhập số tiền..."
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm font-mono text-foreground outline-none"
                />
              </div>
              <button
                onClick={() => { onTopUp(parseInt(topUpAmount) || 0); setShowTopUp(false); setTopUpAmount(''); }}
                disabled={!topUpAmount}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Nạp tiền
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
