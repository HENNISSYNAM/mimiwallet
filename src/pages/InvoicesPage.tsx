import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { invoices, Invoice } from '@/lib/mockData';
import { formatVND, formatDateShort } from '@/lib/formatters';
import { Plus, Upload, Download, Search, X } from 'lucide-react';

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] },
});

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Chưa TT', classes: 'bg-kapiva-amber/10 text-kapiva-amber' },
  overdue: { label: 'Quá hạn', classes: 'bg-kapiva-red/10 text-kapiva-red' },
  paid: { label: 'Đã TT', classes: 'bg-kapiva-green/10 text-kapiva-green' },
  advanced: { label: 'Đã ứng vốn', classes: 'bg-primary/10 text-primary' },
};

const totalInvoices = 3_240_000_000;
const unpaid = 1_847_000_000;
const overdue = 420_000_000;
const advanced = 800_000_000;

export default function InvoicesPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filtered = invoices.filter((inv) => {
    if (filter !== 'all' && inv.status !== filter) return false;
    if (search && !inv.clientName.toLowerCase().includes(search.toLowerCase()) && !inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Hóa đơn</h2>
          <p className="text-sm text-muted-foreground">{invoices.length} hóa đơn đang hoạt động</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:brightness-110 transition-all">
            <Plus size={14} /> Tạo hóa đơn
          </button>
          <button className="bg-card border border-border px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Download size={14} />
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div {...fadeUp(0.05)} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tổng hóa đơn', value: totalInvoices, color: 'text-foreground' },
          { label: 'Chưa thanh toán', value: unpaid, color: 'text-kapiva-amber' },
          { label: 'Quá hạn', value: overdue, color: 'text-kapiva-red' },
          { label: 'Đã ứng vốn', value: advanced, color: 'text-primary' },
        ].map((s) => (
          <div key={s.label} className="card-base p-4">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`font-mono text-lg font-bold ${s.color}`}>{formatVND(s.value)}</p>
          </div>
        ))}
      </motion.div>

      {/* Filters */}
      <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo khách hàng, số HĐ..."
            className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground flex-1"
          />
        </div>
        <div className="flex gap-1">
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
              className={`text-xs px-3 py-2 rounded-lg transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground border border-border'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div {...fadeUp(0.15)} className="card-base overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Số HĐ', 'Khách hàng', 'Ngày phát', 'Đến hạn', 'Số tiền', 'Trạng thái', ''].map((h) => (
                  <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedInvoice(inv)}
                >
                  <td className="px-4 py-3 font-mono text-foreground">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-foreground">{inv.clientName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateShort(inv.issuedDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateShort(inv.dueDate)}</td>
                  <td className="px-4 py-3 font-mono text-foreground">{formatVND(inv.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-md ${statusConfig[inv.status].classes}`}>
                      {statusConfig[inv.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(inv.status === 'pending' || inv.status === 'overdue') && (
                      <button className="text-xs text-primary hover:underline">Ứng vốn</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invoice Detail Drawer */}
      <AnimatePresence>
        {selectedInvoice && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
              onClick={() => setSelectedInvoice(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-secondary border-l border-border z-50 overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg">{selectedInvoice.invoiceNumber}</h3>
                  <span className={`text-xs px-2 py-1 rounded-md ${statusConfig[selectedInvoice.status].classes}`}>
                    {statusConfig[selectedInvoice.status].label}
                  </span>
                </div>
                <button onClick={() => setSelectedInvoice(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="card-base p-4">
                  <p className="text-xs text-muted-foreground mb-1">Khách hàng</p>
                  <p className="text-sm text-foreground font-semibold">{selectedInvoice.clientName}</p>
                </div>
                <div className="card-base p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Số tiền trước thuế</span>
                    <span className="font-mono text-foreground">{formatVND(selectedInvoice.amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({selectedInvoice.vatRate}%)</span>
                    <span className="font-mono text-foreground">{formatVND(selectedInvoice.total - selectedInvoice.amount)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-foreground">Tổng cộng</span>
                    <span className="font-mono text-foreground">{formatVND(selectedInvoice.total)}</span>
                  </div>
                </div>
                <div className="card-base p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ngày phát hành</span>
                    <span className="text-foreground">{formatDateShort(selectedInvoice.issuedDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ngày đến hạn</span>
                    <span className="text-foreground">{formatDateShort(selectedInvoice.dueDate)}</span>
                  </div>
                </div>

                {(selectedInvoice.status === 'pending' || selectedInvoice.status === 'overdue') && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">💡 Bạn có thể ứng vốn hóa đơn này</p>
                    <div className="space-y-1 text-xs text-muted-foreground mb-3">
                      <p>Số tiền ứng: <span className="font-mono text-foreground">{formatVND(selectedInvoice.total * 0.8)}</span> (80%)</p>
                      <p>Phí: <span className="font-mono text-foreground">{formatVND(selectedInvoice.total * 0.015)}</span> (1.5% / 30 ngày)</p>
                      <p>Tiền về trong: <span className="text-kapiva-green font-semibold">4 giờ</span></p>
                    </div>
                    <button className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:brightness-110 transition-all">
                      → Ứng vốn ngay
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
