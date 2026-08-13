import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Landmark, FileText, AlertTriangle, Info, Check } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { track } from '@/lib/track';

/**
 * The two revenue milestones a Vietnamese household business meets, and where
 * this one stands against them.
 *
 * They come from different laws and mean different things, so they are drawn as
 * two separate bars rather than one. An earlier version collapsed them into a
 * single "1 tỷ exemption threshold" — which would have told someone at 800
 * triệu that they owed nothing, when they had owed VAT and PIT since 500 triệu.
 *
 * Rules this component keeps:
 *
 * Every figure names the law it comes from. A number about tax with no source
 * is an opinion.
 *
 * It shows nothing it cannot source. With no bank connection and no e-invoices
 * it says so and offers the way to connect, rather than drawing 0% of a bar —
 * which reads like a measurement.
 *
 * It is not a tax determination, and says that on screen rather than in a
 * footnote nobody opens.
 */

type MilestoneKey = 'tax_exemption' | 'cash_register_invoice';

interface Milestone {
  key: MilestoneKey;
  threshold: number;
  remaining: number;
  ratio: number;
  crossed: boolean;
}

interface Summary {
  year: number;
  basis: 'bank' | 'gdt';
  bankRevenue: number;
  gdtRevenue: number | null;
  gap: number | null;
  revenue: number;
  milestones: Milestone[];
  internalTransfersExcluded: number;
  needsReview: number;
  transactionsCounted: number;
  hasBankConnection: boolean;
  disclaimer: string;
}

/** What each milestone means, and the document that says so. */
const MILESTONE: Record<
  MilestoneKey,
  { label: string; below: string; above: string; law: string }
> = {
  tax_exemption: {
    label: 'Ngưỡng miễn thuế',
    below: 'Chưa phải nộp GTGT và TNCN',
    above: 'Đã phát sinh nghĩa vụ nộp GTGT và TNCN',
    law: 'Luật Thuế TNCN (sửa đổi), thông qua 10/12/2025 · áp dụng từ 01/01/2026',
  },
  cash_register_invoice: {
    label: 'Ngưỡng hoá đơn máy tính tiền',
    below: 'Chưa bắt buộc hoá đơn điện tử từ máy tính tiền',
    above: 'Phải xuất hoá đơn điện tử từ máy tính tiền, nối dữ liệu với cơ quan thuế',
    law: 'Nghị định 70/2025/NĐ-CP · hiệu lực từ 01/06/2025',
  },
};

const dong = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`;

/** ₫1.234.567.890 is unreadable at a glance; "1,23 tỷ" is not. */
function short(n: number): string {
  const v = Math.abs(n);
  if (v >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2).replace('.', ',')} tỷ`;
  if (v >= 1_000_000) return `${Math.round(n / 1_000_000)} triệu`;
  return dong(n);
}

function MilestoneBar({ m }: { m: Milestone }) {
  const meta = MILESTONE[m.key];
  const pct = Math.min(100, Math.max(0, m.ratio * 100));
  const near = pct >= 80 && !m.crossed;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-foreground">
          {meta.label} · {short(m.threshold)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums shrink-0">
          {m.crossed ? 'đã vượt' : `còn ${short(m.remaining)}`}
        </p>
      </div>

      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${
            m.crossed ? 'bg-amber-500' : near ? 'bg-amber-400' : 'bg-primary'
          }`}
        />
      </div>

      <p
        className={`mt-1 text-xs flex items-start gap-1.5 ${
          m.crossed ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'
        }`}
      >
        {m.crossed ? (
          <AlertTriangle size={11} className="mt-0.5 shrink-0" />
        ) : (
          <Check size={11} className="mt-0.5 shrink-0" />
        )}
        {m.crossed ? meta.above : meta.below}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground/70 pl-[18px]">{meta.law}</p>
    </div>
  );
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
        crossedTax: summary.milestones?.[0]?.crossed ?? false,
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
    return <div className="card-base p-5 h-52 animate-pulse bg-muted/30" aria-hidden />;
  }
  if (error || !data) {
    return (
      <div className="card-base p-5">
        <p className="text-sm text-muted-foreground">{error ?? 'Chưa có số liệu.'}</p>
      </div>
    );
  }

  const nothingToMeasure =
    !data.hasBankConnection && data.gdtRevenue === null && data.transactionsCounted === 0;

  if (nothingToMeasure) {
    return (
      <div className="card-base p-5">
        <h3 className="text-sm font-semibold text-foreground">Doanh thu và nghĩa vụ thuế</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Chưa có dữ liệu để tính. Kết nối ngân hàng hoặc Tổng Cục Thuế ở{' '}
          <span className="font-medium text-foreground">Fintech Hub</span>, doanh thu sẽ tự cộng
          từ đó.
        </p>
      </div>
    );
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Doanh thu năm {data.year}
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

      <div className="mt-5 space-y-4">
        {(data.milestones ?? []).map((m) => (
          <MilestoneBar key={m.key} m={m} />
        ))}
      </div>

      {/* A gap between money received and invoices issued is a fact worth
          seeing, not noise to average away. */}
      {data.gap !== null && Math.abs(data.gap) > 1_000_000 && (
        <p className="mt-4 text-xs text-muted-foreground flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          Hoá đơn điện tử {short(data.gdtRevenue ?? 0)}, tiền về tài khoản {short(data.bankRevenue)}.
          Chênh {short(Math.abs(data.gap))} — thường là bán thu tiền mặt chưa xuất hoá đơn, hoặc
          hoá đơn đã xuất mà chưa thu tiền.
        </p>
      )}

      {data.needsReview > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {data.needsReview} cặp giao dịch được đoán là chuyển khoản nội bộ và đã trừ khỏi doanh
          thu. Nên rà lại — đoán sai là lệch doanh thu.
        </p>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
        {data.disclaimer}
      </p>
    </div>
  );
}
