import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, FileWarning, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { parseTransactionsCsv } from '@/lib/parseTransactionsCsv';
import { toast } from 'sonner';

export default function TransactionUpload({ onComputed }: { onComputed?: () => void }) {
  const { session } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<'idle' | 'uploading' | 'computing'>('idle');
  const [lastResult, setLastResult] = useState<{ inserted: number; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    if (!session) {
      toast.error('Vui lòng đăng nhập');
      return;
    }

    setBusy('uploading');
    setLastResult(null);
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1);

      const companyId = companies?.[0]?.id;
      if (!companyId) {
        toast.error('Không tìm thấy doanh nghiệp của bạn');
        return;
      }

      const text = await file.text();
      const { rows, errors } = parseTransactionsCsv(text);

      if (rows.length > 0) {
        const { error: insertError } = await supabase.from('transactions').insert(
          rows.map((r) => ({
            company_id: companyId,
            transaction_date: r.transaction_date,
            merchant_name: r.merchant_name,
            amount: r.amount,
            type: r.type,
            category: 'Tải lên từ file',
            source_bank: 'manual_upload',
          }))
        );
        if (insertError) {
          toast.error(`Lưu giao dịch thất bại: ${insertError.message}`);
          return;
        }
      }

      setLastResult({ inserted: rows.length, errors });
      if (rows.length > 0) {
        toast.success(`Đã tải ${rows.length} giao dịch. Đang tính lại điểm tín dụng...`);
        setBusy('computing');
        const { error: computeError } = await supabase.functions.invoke('credit-scoring?action=compute', {
          body: {},
        });
        if (computeError) {
          toast.error(`Tính điểm thất bại: ${computeError.message}`);
        } else {
          toast.success('Đã cập nhật điểm tín dụng');
          onComputed?.();
        }
      } else {
        toast.error('Không có dòng dữ liệu hợp lệ trong file');
      }
    } finally {
      setBusy('idle');
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) handleFile(file);
  };

  const isBusy = busy !== 'idle';

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-foreground text-lg">Tải dữ liệu giao dịch</h3>
          <p className="text-xs text-muted-foreground mt-1">
            File CSV cột: date,description,amount,type (income|expense) — dùng để tính điểm tín dụng từ dữ liệu thật.
          </p>
        </div>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-display font-bold disabled:opacity-50"
        >
          {busy === 'uploading' && <Loader2 size={14} className="animate-spin" />}
          {busy === 'computing' && <Loader2 size={14} className="animate-spin" />}
          {!isBusy && <UploadCloud size={16} />}
          {busy === 'uploading' ? 'Đang tải...' : busy === 'computing' ? 'Đang tính điểm...' : 'Chọn file CSV'}
        </motion.button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileInputChange} />
      </div>

      {lastResult && (
        <div className="mt-4 space-y-2">
          {lastResult.inserted > 0 && (
            <p className="text-sm text-mimi-green flex items-center gap-2">
              <CheckCircle2 size={14} /> Đã thêm {lastResult.inserted} giao dịch
            </p>
          )}
          {lastResult.errors.length > 0 && (
            <div className="text-xs text-mimi-amber bg-mimi-amber/10 border border-mimi-amber/20 rounded-lg p-3 space-y-1">
              <p className="flex items-center gap-2 font-medium"><FileWarning size={14} /> {lastResult.errors.length} dòng bị bỏ qua:</p>
              <ul className="list-disc list-inside">
                {lastResult.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
