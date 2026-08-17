import { useEffect, useState } from 'react';
import { Newspaper, Scale } from 'lucide-react';
import IndustryNews from '@/components/IndustryNews';
import LegalUpdates from '@/components/LegalUpdates';
import { GlassTabs, AmbientMotifField } from '@/components/ui/glass-tabs';

/**
 * Tin vĩ mô and Luật & Thuế, one panel, two tabs.
 *
 * Put next to each other on request — they answer the same underlying
 * question ("what changed out there that affects my numbers") from two kinds
 * of source: live headlines and curated law. Tabs rather than one merged feed,
 * because mixing an RSS headline with a citation to a Nghị định would blur the
 * one distinction `LegalUpdates` exists to keep sharp — which of these did a
 * human verify against a primary source, and which is a wire headline.
 *
 * The switcher is Liquid Glass applied the way Apple's own sample does it —
 * see `glass-tabs.tsx` for the reasoning, shared with `FintechPage` now that
 * this is the second place it was needed.
 */

type Tab = 'news' | 'law';

/**
 * Name matches the dispatch in ThresholdClock's "Xem chi tiết ở mục Luật &
 * Thuế" link. A DOM event rather than lifted state or a store: the two
 * components are siblings mounted independently on DashboardOverview, and a
 * crossed-milestone deep link is the only thing that needs to reach across —
 * not worth a context provider for one interaction.
 */
export const SHOW_LAW_TAB_EVENT = 'mimi:show-law-tab';

export default function NewsAndLawPanel() {
  const [tab, setTab] = useState<Tab>('news');

  useEffect(() => {
    const onShowLaw = () => setTab('law');
    window.addEventListener(SHOW_LAW_TAB_EVENT, onShowLaw);
    return () => window.removeEventListener(SHOW_LAW_TAB_EVENT, onShowLaw);
  }, []);

  return (
    <div
      id="news-and-law-panel"
      // Scroll target for ThresholdClock's "Xem chi tiết ở mục Luật & Thuế" —
      // a crossed milestone should lead somewhere, not just warn.
      className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5 relative overflow-hidden"
    >
      <AmbientMotifField />

      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="font-display font-bold text-foreground text-lg">Tin & Pháp lý</h3>
        <GlassTabs
          ambient
          active={tab}
          onChange={(k) => setTab(k as Tab)}
          tabs={[
            { key: 'news', label: 'Tin vĩ mô', icon: Newspaper },
            { key: 'law', label: 'Luật & Thuế', icon: Scale },
          ]}
        />
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {tab === 'news'
          ? 'Tự động cập nhật từ nguồn công khai, đối chiếu với số liệu của bạn.'
          : 'Đối chiếu từng văn bản với nguồn chính thức trước khi đưa vào đây.'}
      </p>

      {tab === 'news' ? <IndustryNews embedded /> : <LegalUpdates />}
    </div>
  );
}
