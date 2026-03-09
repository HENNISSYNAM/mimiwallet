import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NewsItem {
  title: string;
  summary: string;
  impact: 'positive' | 'negative' | 'neutral';
  source?: string;
}

export default function IndustryNews({ industry = 'SME' }: { industry?: string }) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('perplexity-news', {
        body: { industry },
      });
      if (error) throw error;
      
      // Try to parse the content as JSON
      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          if (Array.isArray(parsed)) {
            setNews(parsed.slice(0, 5));
          } else if (parsed.items) {
            setNews(parsed.items.slice(0, 5));
          }
        } catch {
          // If not JSON, show as single news
          setNews([{ title: 'Tin tức', summary: data.content, impact: 'neutral' }]);
        }
      }
      if (data?.citations) setCitations(data.citations);
    } catch (e: any) {
      setError(e.message || 'Không thể tải tin tức');
    }
    setLoading(false);
  };

  useEffect(() => { fetchNews(); }, [industry]);

  const getImpactIcon = (impact: string) => {
    if (impact === 'positive') return <TrendingUp size={14} className="text-kapiva-green" />;
    if (impact === 'negative') return <TrendingDown size={14} className="text-kapiva-red" />;
    return <Minus size={14} className="text-muted-foreground" />;
  };

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper size={16} className="text-primary" />
          <h3 className="font-display font-bold text-foreground">Tin tức ngành</h3>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <p className="text-sm text-kapiva-red">{error}</p>
      )}

      {loading && news.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-accent rounded w-3/4 mb-2" />
              <div className="h-3 bg-accent rounded w-full" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {news.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-3 bg-accent/50 rounded-xl"
          >
            <div className="flex items-start gap-2">
              {getImpactIcon(item.impact)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground line-clamp-2">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {citations.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Nguồn:</p>
          <div className="flex flex-wrap gap-1">
            {citations.slice(0, 3).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
              >
                {new URL(url).hostname.replace('www.', '')} <ExternalLink size={8} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
