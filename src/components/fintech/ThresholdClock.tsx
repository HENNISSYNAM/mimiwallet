import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Landmark, FileText, AlertTriangle, Info } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { track } from '@/lib/track';

/**
 * How far this business is from the 1 tỷ/năm exemption threshold.
 *
 * From 01/01/2026 lump-sum tax is gone and households declare on actual
 * revenue — but one under 1 tỷ/năm is exempt from VAT and PIT and declares
 * once, on 31/01/2027. That is roughly 90% of 2.5 million registered
 * households, and for them the useful thing is not a filing tool: it is
 * knowing where they stand before they cross.
 *
 * Two rules this component follows and should keep following:
 *
 * It never shows a number it cannot source. With no bank connection and no
 * e-invoices there is nothing to say, so it says that and offers the way to
 * connect — rather than rendering ₫0 of 1 tỷ, which reads like a measurement.
 *
 * It never claims to be a tax determination. The figure is an estimate from
 * whatever has been connected, and the disclaimer is on screen, not buried.
 */

interface Summary {
  year: number;
  basis: 'bank' | 'gdt';
  bankRevenue: number;
  gdtRevenue: number | null;
  gap: number | null;
  revenue: number;
  threshold: number;
  remaining: number;
  ratio: number;
  crossed: boolean;
  internalTransfersExcluded: number;
  needsReview: number;
  transactionsCounted: number;
  hasBankConnection: boolean;
  disclaimer: string;
}

const dong = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`;

/** ₫1.234.567.890 is unreadable at a glance; "1,23 tỷ" is not. */
function short(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(0)} triệu`;
  return dong(n);
}

export function ThresholdClock() {
  const { session } = useAuthStore();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tax-summary`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        setError(body?.error ?? `Lỗi ${res.status}`);
        return;
      }
      const summary = body as Summary;
      setData(summary);
      // Whether people ever see a real figure here is the clearest read on
      // whether the product delivered its main promise. Only the shape is
      // recorded — never the amount.
      track('threshold_viewed', {
        basis: summary.basis,
        crossed: summary.crossed,
        hasBank: summary.hasBankConnection,
        hasGdt: summary.gdtRevenue !== null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được số liệu');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="card-base p-5 h-40 animate-pulse bg-muted/30" aria-hidden />;
  }
  if (error || !data) {
    return (
      <div className="card-base p-5">
        <p className="text-sm text-muted-foreground">{error ?? 'Chưa có số liệu.'}</p>
      </div>
    );
  }

  // Nothing connected means nothing measured. Showing 0% of 1 tỷ here would be
  // a number pretending to be a measurement.
  const nothingToMeasure =
    !data.hasBankConnection && data.gdtRevenue === null && data.transactionsCounted === 0;

  if (nothingToMeasure) {
    return (
      <div className="card-base p-5">
        <h3 className="text-sm font-semibold text-foreground">Ngưỡng miễn thuế 1 tỷ</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Chưa có dữ liệu để tính. Kết nối ngân hàng hoặc Tổng Cục Thuế ở{' '}
          <span className="font-medium text-foreground">Fintech Hub</span>, doanh thu sẽ tự
          cộng từ đó.
        </p>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, data.ratio * 100));
  const near = pct >= 80 && !data.crossed;

  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Ngưỡng miễn thuế 1 tỷ · năm {data.year}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {data.basis === 'gdt' ? (
              <span className="inline-flex items-center gap-1">
                <FileText size={11} /> Theo hoá đơn điện tử (Tổng Cục Thuế)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Landmark size={11} /> Ước tính từ tiền vào tài khoản
              </span>
            )}
          </p>
        </div>
        <p className="text-2xl font-bold text-foreground tabular-nums shrink-0">
          {short(data.revenue)}
        </p>
      </div>

      <div className="mt-4 h-2.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full ${
            data.crossed ? 'bg-destructive' : near ? 'bg-amber-500' : 'bg-primary'
          }`}
        />
      </div>

      <p className="mt-2 text-sm">
        {data.crossed ? (
          <span className="text-destructive font-medium">
            Đã vượt ngưỡng {short(data.threshold)} — nghĩa vụ thuế thay đổi, nên hỏi kế toán.
          </span>
        ) : (
          <>
            Còn <span className="font-semibold text-foreground">{short(data.remaining)}</span> nữa
            là tới ngưỡng {short(data.threshold)}
          </>
        )}
      </p>

      {/* A gap between money received and invoices issued is a fact worth
          seeing, not noise to average away. */}
      {data.gap !== null && Math.abs(data.gap) > 1_000_000 && (
        <p className="mt-3 text-xs text-muted-foreground flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          Hoá đơn điện tử {short(data.gdtRevenue ?? 0)}, tiền về tài khoản{' '}
          {short(data.bankRevenue)}. Chênh {short(Math.abs(data.gap))} — thường là bán thu tiền
          mặt chưa xuất hoá đơn, hoặc hoá đơn đã xuất mà chưa thu tiền.
        </p>
      )}

      {data.needsReview > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {data.needsReview} cặp giao dịch được đoán là chuyển khoản nội bộ và đã trừ khỏi doanh
          thu. Nên rà lại — đoán sai là lệch doanh thu.
        </p>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
        {data.disclaimer}
      </p>
    </div>
  );
}
