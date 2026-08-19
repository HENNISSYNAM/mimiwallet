import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowUpRight, TrendingDown, TrendingUp, Lightbulb, BookMarked } from 'lucide-react';
import mimiCat from '@/assets/mimi-cat.webp';
import {
  chonBanTin,
  TIPS,
  type DailyBrief,
  type NewsItem,
} from '@/lib/dailyBrief';

/**
 * Thẻ bản tin mỗi ngày trên Tổng quan.
 *
 * Thẻ này KHÔNG sinh ra tin. Nó chọn một mục từ `macro_news` — bảng do hàm
 * `macro-news` đổ về từ RSS công khai — hoặc rơi về một tip do MIMI viết. Vì
 * vậy mọi thẻ loại `news` đều có nút dẫn thẳng tới bài gốc: người đọc phải
 * kiểm chứng được, và một thẻ tin không có đường về nguồn thì không phân biệt
 * nổi với tin bịa.
 *
 * Hai loại thẻ trông khác nhau có chủ đích. Tin mang tên toà báo và ngày đăng;
 * tip mang mặt mèo và chữ "Mẹo từ MIMI". Nếu vẽ giống nhau thì tip sẽ bị đọc
 * như tin, và đó chính là kiểu nhập nhằng cần tránh.
 */

const nhanChuDe: Record<string, string> = {
  interest_rate: 'Lãi suất',
  credit: 'Tín dụng',
  fx: 'Tỷ giá',
  policy: 'Chính sách',
};

function ThePhanTin({ item }: { item: NewsItem }) {
  const xau = item.impact === 'negative';
  const Icon = xau ? TrendingDown : TrendingUp;
  const mau = xau ? 'text-mimi-red' : 'text-mimi-green';
  const ngay = new Date(item.published_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

  return (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-flex items-center gap-1.5 font-medium ${mau}`}>
          <Icon className="w-3.5 h-3.5" />
          {nhanChuDe[item.topic] ?? 'Kinh tế'}
        </span>
        <span>·</span>
        <span>{item.source}</span>
        <span>·</span>
        <span>{ngay}</span>
      </div>

      <h3 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight leading-snug">
        {item.title}
      </h3>

      {item.summary && (
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {item.summary}
        </p>
      )}

      <a
        href={item.url} target="_blank" rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        Đọc bài gốc trên {item.source}
        <ArrowUpRight className="w-4 h-4" />
      </a>
    </>
  );
}

export function DailyBriefCard() {
  const session = useAuthStore((s) => s.session);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let huy = false;
    (async () => {
      if (!session) { setLoading(false); return; }
      const { data: companies } = await supabase
        .from('companies').select('id').eq('user_id', session.user.id)
        .order('created_at', { ascending: true }).limit(1);
      const companyId = companies?.[0]?.id ?? session.user.id;

      /*
       * Lấy tin gần đây rồi để `chonBanTin` lọc, thay vì lọc sẵn bằng SQL: quy
       * tắc "tin nào đáng lên thẻ" nằm trong module thuần có test, và giữ nó ở
       * một chỗ duy nhất thì sửa một lần là cả hai phía đổi theo.
       */
      const { data: news } = await supabase
        .from('macro_news').select('*')
        .order('published_at', { ascending: false }).limit(40);

      if (huy) return;
      const ngay = new Date().toISOString().slice(0, 10);
      setBrief(chonBanTin((news as NewsItem[]) ?? [], TIPS, ngay, companyId));
      setLoading(false);
    })();
    return () => { huy = true; };
  }, [session]);

  // Không có gì để nói thì không dựng khung rỗng.
  if (loading || !brief) return null;

  const laTip = brief.kind === 'tip';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 md:p-6"
    >
      {laTip ? (
        <div className="flex flex-col sm:flex-row gap-5">
          <img
            src={mimiCat} alt="" aria-hidden
            className="w-20 h-20 shrink-0 object-contain self-start"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lightbulb className="w-3.5 h-3.5 text-mimi-amber" />
              <span className="font-medium text-mimi-amber">Mẹo từ MIMI</span>
              <span>·</span>
              <span>{brief.tip.eyebrow}</span>
            </div>
            <h3 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight leading-snug">
              {brief.tip.title}
            </h3>
            <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
              {brief.tip.body}
            </p>
            {brief.tip.nguon && (
              <div className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
                <BookMarked className="w-3.5 h-3.5 mt-px shrink-0" />
                <span>Căn cứ: {brief.tip.nguon}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <ThePhanTin item={brief.item} />
      )}
    </motion.div>
  );
}
