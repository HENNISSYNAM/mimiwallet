import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { formatVND, formatDateShort } from '@/lib/formatters';
import { Plus, Download, Search, X, ArrowRight, FileText, Loader2 } from 'lucide-react';
import { InsightSpark } from '@/components/illustrations/BrandIcons';
import { toast } from 'sonner';

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  vat_rate: number | null;
  total: number;
  issued_date: string;
  due_date: string;
  status: string;
  advanced_amount: number | null;
}

const statusConfig: Record<string, { label: string; dot: string; bg: string }> = {
  pending: { label: 'Chưa TT', dot: 'bg-mimi-amber', bg: 'bg-mimi-amber/8 text-mimi-amber' },
  overdue: { label: 'Quá hạn', dot: 'bg-mimi-red', bg: 'bg-mimi-red/8 text-mimi-red' },
  paid: { label: 'Đã TT', dot: 'bg-mimi-green', bg: 'bg-mimi-green/8 text-mimi-green' },
  advanced: { label: 'Đã ứng vốn', dot: 'bg-primary', bg: 'bg-primary/8 text-primary' },
};

function exportInvoicesCsv(rows: Invoice[]) {
  const header = ['invoice_number', 'client_name', 'issued_date', 'due_date', 'amount', 'total', 'status'];
  const lines = [header.join(',')].concat(
    rows.map((r) => [r.invoice_number, r.client_name, r.issued_date, r.due_date, r.amount, r.total, r.status].join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hoa-don-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CreateInvoiceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const session = useAuthStore((s) => s.session);
  const [clientName, setClientName] = useState('');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('10');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setClientName(''); setAmount(''); setVatRate('10'); setDueDate(''); };

  const handleSubmit = async () => {
    if (!session) return;
    const amountNum = Number(amount);
    if (!clientName.trim() || !amountNum || amountNum <= 0 || !dueDate) {
      toast.error('Vui lòng nhập đầy đủ khách hàng, số tiền và ngày đến hạn');
      return;
    }
    setSaving(true);
    const { data: companies } = await supabase.from('companies').select('id').eq('user_id', session.user.id).limit(1);
    const companyId = companies?.[0]?.id;
    if (!companyId) {
      toast.error('Không tìm thấy doanh nghiệp của bạn');
      setSaving(false);
      return;
    }
    const vat = Number(vatRate) || 0;
    const total = Math.round(amountNum * (1 + vat / 100));
    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const { error } = await supabase.from('invoices').insert({
      company_id: companyId,
      invoice_number: invoiceNumber,
      client_name: clientName.trim(),
      amount: amountNum,
      vat_rate: vat,
      total,
      issued_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate,
      status: 'pending',
    });
    setSaving(false);
    if (error) {
      toast.error(`Tạo hóa đơn thất bại: ${error.message}`);
      return;
    }
    toast.success(`Đã tạo hóa đơn ${invoiceNumber}`);
    reset();
    onCreated();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-foreground">Tạo hóa đơn mới</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Khách hàng</label>
                <input
                  value={clientName} onChange={(e) => setClientName(e.target.value)}
                  placeholder="VD: Công ty ABC"
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Số tiền trước thuế</label>
                  <input
                    type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="VD: 50000000"
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">VAT (%)</label>
                  <input
                    type="number" value={vatRate} onChange={(e) => setVatRate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Ngày đến hạn</label>
                <input
                  type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>
              <button
                onClick={handleSubmit} disabled={saving}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Tạo hóa đơn
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function InvoicesPage() {
  const session = useAuthStore((s) => s.session);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadInvoices = async () => {
    if (!session) return;
    setLoading(true);
    const { data: companies } = await supabase.from('companies').select('id').eq('user_id', session.user.id).limit(1);
    const cId = companies?.[0]?.id ?? null;
    setCompanyId(cId);
    if (cId) {
      const { data } = await supabase.from('invoices').select('*').eq('company_id', cId).order('issued_date', { ascending: false });
      setInvoiceList((data as Invoice[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { loadInvoices(); }, [session]);

  const filtered = invoiceList.filter((inv) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (search && !inv.client_name.toLowerCase().includes(search.toLowerCase()) && !inv.invoice_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = [
    { label: 'Tổng hóa đơn', value: invoiceList.reduce((s, i) => s + i.total, 0), color: 'text-foreground' },
    { label: 'Chưa thanh toán', value: invoiceList.filter((i) => i.status === 'pending').reduce((s, i) => s + i.total, 0), color: 'text-mimi-amber' },
    { label: 'Quá hạn', value: invoiceList.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0), color: 'text-mimi-red' },
    { label: 'Đã ứng vốn', value: invoiceList.filter((i) => i.status === 'advanced').reduce((s, i) => s + (i.advanced_amount ?? 0), 0), color: 'text-primary' },
  ];

  const handleAdvance = async () => {
    if (!selectedInvoice) return;
    setAdvancing(true);
    const advancedAmount = Math.round(selectedInvoice.total * 0.8);
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'advanced', advanced_amount: advancedAmount, advanced_at: new Date().toISOString() })
      .eq('id', selectedInvoice.id);
    setAdvancing(false);
    if (error) {
      toast.error(`Ứng vốn thất bại: ${error.message}`);
      return;
    }
    toast.success(`Đã ứng vốn ${formatVND(advancedAmount)} cho hóa đơn ${selectedInvoice.invoice_number}`);
    setSelectedInvoice(null);
    loadInvoices();
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-foreground tracking-tight">Hóa đơn</h2>
          <p className="text-sm text-muted-foreground mt-1">{invoiceList.length} hóa đơn đang hoạt động</p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:brightness-110 transition-all shadow-[0_4px_16px_hsla(var(--blue-500)/0.2)]"
          >
            <Plus size={14} /> Tạo hóa đơn
          </motion.button>
          <button
            onClick={() => exportInvoicesCsv(filtered)}
            disabled={filtered.length === 0}
            className="bg-card/60 border border-border/60 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 transition-all disabled:opacity-40"
          >
            <Download size={14} />
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-4 hover:border-primary/10 transition-all">
            <p className="text-xs text-muted-foreground mb-1 font-medium">{s.label}</p>
            <p className={`font-mono text-lg font-bold ${s.color}`}>{formatVND(s.value)}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card/50 border border-border/60 rounded-xl px-4 py-2.5 flex-1 focus-within:border-primary/40 transition-all">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo khách hàng, số HĐ..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-accent/30 rounded-xl p-1">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: 'Chưa TT' },
            { key: 'overdue', label: 'Quá hạn' },
            { key: 'paid', label: 'Đã TT' },
            { key: 'advanced', label: 'Đã ứng' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                filter === f.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp} className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={20} className="animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <FileText size={28} className="text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">Chưa có hóa đơn nào</p>
            <p className="text-xs text-muted-foreground mt-1">Bấm "Tạo hóa đơn" để thêm hóa đơn đầu tiên.</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                {['Số HĐ', 'Khách hàng', 'Ngày phát', 'Đến hạn', 'Số tiền', 'Trạng thái', ''].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground/70 font-medium px-5 py-4 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <motion.tr
                  key={inv.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border/30 last:border-0 hover:bg-accent/30 transition-colors cursor-pointer group"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td className="px-5 py-4 font-mono text-foreground font-medium">{inv.invoice_number}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-xs font-bold text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        {inv.client_name[0]}
                      </div>
                      <span className="text-foreground">{inv.client_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDateShort(inv.issued_date)}</td>
                  <td className="px-5 py-4 text-muted-foreground">{formatDateShort(inv.due_date)}</td>
                  <td className="px-5 py-4 font-mono text-foreground font-medium">{formatVND(inv.total)}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium ${statusConfig[inv.status]?.bg ?? ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[inv.status]?.dot ?? ''}`} />
                      {statusConfig[inv.status]?.label ?? inv.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {(inv.status === 'pending' || inv.status === 'overdue') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }}
                        className="text-xs text-primary hover:underline font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        Ứng vốn <ArrowRight size={10} />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </motion.div>

      {/* Invoice Detail Drawer */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/70 backdrop-blur-md z-50"
              onClick={() => setSelectedInvoice(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-secondary/95 backdrop-blur-xl border-l border-border/50 z-50 overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-foreground text-xl">{selectedInvoice.invoice_number}</h3>
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-medium mt-2 ${statusConfig[selectedInvoice.status]?.bg ?? ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[selectedInvoice.status]?.dot ?? ''}`} />
                      {statusConfig[selectedInvoice.status]?.label ?? selectedInvoice.status}
                    </span>
                  </div>
                  <button onClick={() => setSelectedInvoice(null)} className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all">
                    <X size={16} />
                  </button>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{selectedInvoice.client_name}</p>
                      <p className="text-xs text-muted-foreground">Khách hàng</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Số tiền trước thuế</span>
                    <span className="font-mono text-foreground font-medium">{formatVND(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({selectedInvoice.vat_rate}%)</span>
                    <span className="font-mono text-foreground">{formatVND(selectedInvoice.total - selectedInvoice.amount)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex justify-between text-sm font-semibold">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="font-mono text-foreground text-lg">{formatVND(selectedInvoice.total)}</span>
                  </div>
                </div>

                <div className="bg-card/50 border border-border/50 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ngày phát hành</span>
                    <span className="text-foreground">{formatDateShort(selectedInvoice.issued_date)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ngày đến hạn</span>
                    <span className="text-foreground">{formatDateShort(selectedInvoice.due_date)}</span>
                  </div>
                </div>

                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'overdue') && (
                  <div className="bg-gradient-to-br from-primary/5 to-mimi-green/5 border border-primary/15 rounded-2xl p-5">
                    <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><InsightSpark size={16} className="text-primary" /> Ứng vốn hóa đơn</p>
                    <div className="space-y-2 text-sm text-muted-foreground mb-4">
                      <div className="flex justify-between">
                        <span>Số tiền ứng (80%)</span>
                        <span className="font-mono text-foreground font-semibold">{formatVND(selectedInvoice.total * 0.8)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Phí (1.5% / 30 ngày)</span>
                        <span className="font-mono text-foreground">{formatVND(selectedInvoice.total * 0.015)}</span>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAdvance}
                      disabled={advancing}
                      className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-semibold hover:brightness-110 transition-all shadow-[0_4px_16px_hsla(var(--blue-500)/0.25)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {advancing && <Loader2 size={14} className="animate-spin" />} Ứng vốn ngay →
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreateInvoiceModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={loadInvoices} />
    </motion.div>
  );
}
