import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Zap, Activity, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatVND, formatVNDShort } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function M2MDashboardWidget() {
  const [stats, setStats] = useState({ deviceCount: 0, txCount: 0, totalVolume: 0, lowBudget: 0 });
  const [recentTxs, setRecentTxs] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: companies } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (!companies || companies.length === 0) return;
    const companyId = companies[0].id;

    const { data: devices } = await supabase
      .from('device_wallets')
      .select('id, balance, initial_balance, status')
      .eq('company_id', companyId);

    if (!devices) return;

    const deviceIds = devices.map(d => d.id);
    
    if (deviceIds.length === 0) {
      setStats({ deviceCount: 0, txCount: 0, totalVolume: 0, lowBudget: 0 });
      return;
    }

    const { data: txs } = await supabase
      .from('m2m_transactions')
      .select('amount, status, created_at, recipient_name, tx_type')
      .in('device_id', deviceIds)
      .order('created_at', { ascending: false })
      .limit(5);

    const completedTxs = txs?.filter(t => t.status === 'completed') || [];
    const totalVol = completedTxs.reduce((s, t) => s + (t.amount || 0), 0);
    const lowBudget = devices.filter(d => d.initial_balance > 0 && d.balance < d.initial_balance * 0.2).length;

    setStats({
      deviceCount: devices.filter(d => d.status === 'active').length,
      txCount: txs?.length || 0,
      totalVolume: totalVol,
      lowBudget,
    });
    setRecentTxs(txs || []);
  };

  if (stats.deviceCount === 0 && recentTxs.length === 0) return null;

  return (
    <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center">
            <Cpu size={14} className="text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Hoạt động M2M</span>
        </div>
        <button
          onClick={() => navigate('/dashboard/m2m')}
          className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          Xem tất cả <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Thiết bị</p>
          <p className="font-mono text-lg font-bold text-foreground">{stats.deviceCount}</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Giao dịch</p>
          <p className="font-mono text-lg font-bold text-foreground">{stats.txCount}</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Volume</p>
          <p className="font-mono text-lg font-bold text-foreground">{formatVNDShort(stats.totalVolume)}</p>
        </div>
      </div>

      {stats.lowBudget > 0 && (
        <div className="bg-destructive/8 border border-destructive/20 rounded-xl p-3 mb-3 text-xs text-destructive flex items-center gap-2">
          <Zap size={13} /> {stats.lowBudget} thiết bị sắp hết ngân sách
        </div>
      )}

      {recentTxs.length > 0 && (
        <div className="space-y-2">
          {recentTxs.slice(0, 3).map((tx, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity size={11} className="text-muted-foreground" />
                <span className="text-muted-foreground">
                  {tx.tx_type === 'top_up' ? 'Nạp tiền' : tx.tx_type === 'auto_pay' ? 'Auto-pay' : tx.tx_type}
                </span>
              </div>
              <span className={`font-mono ${tx.tx_type === 'top_up' ? 'text-mimi-green' : 'text-foreground'}`}>
                {tx.tx_type === 'top_up' ? '+' : '-'}{formatVNDShort(tx.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
