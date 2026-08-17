import { useEffect, useId, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, Scale } from 'lucide-react';
import IndustryNews from '@/components/IndustryNews';
import LegalUpdates from '@/components/LegalUpdates';
import { Coin, Gem, Sparkle } from '@/components/illustrations/GamifyObjects';

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
 * The switcher below is Liquid Glass applied the way Apple's own sample does
 * it, not a translucent box wallpapered onto a flat colour:
 *
 *   1. `lg-regular` sits on the control layer only — the pill switcher — never
 *      on the content list beneath it, matching the rule already written into
 *      index.css's Liquid Glass section.
 *   2. It has something behind it to refract. A flat #F4F4F6 gives a backdrop
 *      filter nothing to work with, which is the exact limitation that section
 *      calls out. The ambient coin/gem/sparkle field below solves it directly —
 *      MIMI's own reward motifs, not a stock gradient, doing the job Apple's
 *      `backgroundExtensionEffect()` does with photographic content.
 *   3. The active tab is one glass element that moves, not two static ones
 *      swapping visibility — `layoutId` shared across both pills is this
 *      codebase's equivalent of `glassEffectID`: one continuous piece of
 *      material with two positions, exactly what `GlassEffectContainer` groups
 *      in the Landmarks sample so glass elements morph as a set instead of
 *      cross-fading like flat UI.
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
  const layoutId = useId();

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
      className="bg-card/60 backdrop-blur-sm border border-border/60 rounded-2xl p-5 relative overflow-hidden">
      {/* Ambient field: three of MIMI's own reward motifs, held small, blurred
          and low-opacity so they read as depth rather than decoration
          competing with the numbers below. This is what the glass pills
          refract — remove it and the switcher goes back to a grey box. */}
      <div className="absolute inset-x-0 top-0 h-24 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-3 right-10 opacity-[0.16] blur-[1px] animate-float-bob" style={{ '--float-dur': '7s' } as React.CSSProperties}>
          <Coin size={40} />
        </div>
        <div className="absolute top-6 right-32 opacity-[0.14] blur-[1px] animate-float-bob" style={{ '--float-dur': '9s', animationDelay: '-2s' } as React.CSSProperties}>
          <Gem size={26} />
        </div>
        <div className="absolute top-1 left-16 opacity-[0.12] animate-float-bob" style={{ '--float-dur': '5.5s', animationDelay: '-1s' } as React.CSSProperties}>
          <Sparkle size={14} color="hsl(var(--primary))" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="font-display font-bold text-foreground text-lg">Tin & Pháp lý</h3>

        {/* The glass switcher itself. */}
        <div className="lg-surface lg-regular rounded-full p-1 flex items-center gap-0.5 relative">
          {(
            [
              ['news', 'Tin vĩ mô', Newspaper],
              ['law', 'Luật & Thuế', Scale],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="relative px-3 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              {tab === key && (
                <motion.span
                  layoutId={`${layoutId}-active-tab`}
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <span className={`relative flex items-center gap-1.5 ${tab === key ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                <Icon size={12} />
                {label}
              </span>
            </button>
          ))}
        </div>
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
