import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InsightSpark } from '@/components/illustrations/BrandIcons';

/**
 * Macro headlines, read against this company's own position.
 *
 * The previous version of this component called a Perplexity endpoint that
 * needed a paid key and was never mounted anywhere, so it had never actually
 * run. It now reads the `macro-news` function, which pulls public RSS and
 * refreshes itself once the stored feed goes stale.
 */

type Impact = 'positive' | 'negative' | 'neutral';

interface NewsItem {
  title: string;
  summary: string | null;
  url: string;
  source: string;
  published_at: string | null;
  topic: string;
  impact: Impact;
  /** Why this matters to this company, or null when it genuinely does not. */
  personal: string | null;
}

const TOPIC_LABEL: Record<string, string> = {
  interest_rate: 'Lãi suất',
  credit: 'Tín dụng',
  fx: 'Tỷ giá',
  policy: 'Chính sách',
  general: 'Kinh tế',
};

function ImpactIcon({ impact }: { impact: Impact }) {
  if (impact === 'positive') return <TrendingUp size={14} className="text-mimi-green shrink-0" />;
  if (impact === 'negative') return <TrendingDown size={14} className="text-mimi-red shrink-0" />;
  return <Minus size={14} className="text-muted-foreground shrink-0" />;
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

export default function IndustryNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('macro-news');
      if (error) throw error;
      setNews(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được tin tức');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return (
    <div className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-bold text-foreground text-lg">Tin vĩ mô</h3>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors pressable"
          aria-label="Tải lại tin tức"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {/* Says what the analysis actually is, so nobody reads "AI" into a lookup. */}
      <p className="text-xs text-muted-foreground mb-4">
        Tự động cập nhật từ nguồn công khai, đối chiếu với số liệu của bạn.
      </p>

      {error && <p className="text-sm text-mimi-red">{error}</p>}

      {loading && news.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-accent rounded w-3/4 mb-2" />
              <div className="h-3 bg-accent rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && news.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có tin mới.</p>
      )}

      <div className="space-y-3">
        {news.slice(0, 5).map((item, i) => (
          <motion.a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="block p-3 bg-accent/40 rounded-xl hover:bg-accent/70 transition-colors"
          >
            <div className="flex items-start gap-2">
              <ImpactIcon impact={item.impact} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                    {TOPIC_LABEL[item.topic] ?? 'Kinh tế'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {item.source}
                    {item.published_at && ` · ${timeAgo(item.published_at)}`}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>

                {/* The reason this component exists: the headline read against
                    the reader's own balance sheet, not a generic summary. */}
                {item.personal && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-foreground/80 bg-primary/5 rounded-lg p-2">
                    <InsightSpark size={13} className="text-primary shrink-0 mt-0.5" />
                    {item.personal}
                  </p>
                )}
              </div>
              <ExternalLink size={12} className="text-muted-foreground shrink-0 mt-0.5" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}
