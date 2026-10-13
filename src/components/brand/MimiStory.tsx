import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import frSleep from '@/assets/mimi/sleep.png';
import frStretch from '@/assets/mimi/stretch.png';
import frWatch from '@/assets/mimi/watch.png';
import frLove from '@/assets/mimi/love.png';
import frSurprised from '@/assets/mimi/surprised.png';
import frWalk from '@/assets/mimi/walk.png';
import frSit from '@/assets/mimi/sit.png';
import frHappy from '@/assets/mimi/happy.png';
import frHero from '@/assets/mimi/hero.png';

/**
 * MIMI's story, told by scrolling.
 *
 * The mascot is pinned in a sticky column and changes pose as each paragraph
 * comes into view, so the reader is not looking at decoration next to text —
 * the cat is doing what the sentence says. That is the whole reason the pose
 * sheet exists rather than one static logo.
 *
 * Which pose belongs to which beat is the content, so the two live together in
 * BEATS below; splitting them would let a copy edit silently desynchronise the
 * artwork from the sentence it illustrates.
 */

type Beat = {
  frame: string;
  /** Rendered width. The poses were drawn at different scales — a curled-up
   *  sleeping cat is much wider than a sitting one — so a single width would
   *  make MIMI appear to change size between beats. */
  w: string;
  kicker?: string;
  lines: string[];
};

/*
 * Chữ của câu chuyện nằm ở khối i18n `ui2.story.*` (bốn ngôn ngữ). `kicker` và `lines` dưới đây là
 * khoá, dịch lúc vẽ. `hoi` đánh dấu nhịp "chỉ cần hỏi" — nơi hiện ba câu hỏi mẫu.
 */
const BEATS: (Beat & { hoi?: boolean })[] = [
  { frame: frSleep, w: 'w-[78%]', kicker: 'ui2.story.b0.k', lines: ['ui2.story.b0.l0'] },
  { frame: frStretch, w: 'w-[74%]', kicker: 'ui2.story.b1.k', lines: ['ui2.story.b1.l0'] },
  { frame: frWatch, w: 'w-[62%]', kicker: 'ui2.story.b2.k', lines: ['ui2.story.b2.l0', 'ui2.story.b2.l1'] },
  { frame: frLove, w: 'w-[62%]', kicker: 'ui2.story.b3.k', lines: ['ui2.story.b3.l0', 'ui2.story.b3.l1'] },
  { frame: frSurprised, w: 'w-[62%]', kicker: 'ui2.story.b4.k', lines: ['ui2.story.b4.l0', 'ui2.story.b4.l1'] },
  { frame: frWalk, w: 'w-[72%]', kicker: 'ui2.story.b5.k', lines: ['ui2.story.b5.l0', 'ui2.story.b5.l1'] },
  { frame: frSit, w: 'w-[48%]', kicker: 'ui2.story.b6.k', lines: ['ui2.story.b6.l0', 'ui2.story.b6.l1'], hoi: true },
  { frame: frHappy, w: 'w-[62%]', kicker: 'ui2.story.b7.k', lines: ['ui2.story.b7.l0', 'ui2.story.b7.l1'] },
  { frame: frHero, w: 'w-[86%]', kicker: 'ui2.story.b8.k', lines: ['ui2.story.b8.l0', 'ui2.story.b8.l1'] },
];

const ASKS = [
  { q: 'ui2.story.hoi0.q', a: 'ui2.story.hoi0.a' },
  { q: 'ui2.story.hoi1.q', a: 'ui2.story.hoi1.a' },
  { q: 'ui2.story.hoi2.q', a: 'ui2.story.hoi2.a' },
];

export default function MimiStory() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Deliberately measured from scroll position rather than driven by an
    // IntersectionObserver. IO is the tidier API, but it is also suppressed by
    // browsers whenever a page is not being composited — a background tab, a
    // hidden preview pane — and when it is suppressed it does not fail loudly:
    // it simply never fires, leaving the mascot frozen on the first pose while
    // the reader scrolls through the whole story. Comparing each beat's centre
    // to the viewport's centre is a few lines more and always true.
    let last = 0;
    const measure = () => {
      last = Date.now();
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActive((prev) => (prev === best ? prev : best));
    };

    // Throttled on a timestamp rather than requestAnimationFrame. rAF is the
    // usual choice, but it is paused under exactly the same conditions as the
    // IntersectionObserver above — a page that is not being composited — so it
    // would reintroduce the freeze it was meant to avoid. Nine
    // getBoundingClientRect reads at most every 60ms is far below the cost that
    // would justify the risk.
    let timer = 0;
    const onScroll = () => {
      const since = Date.now() - last;
      if (since >= 60) {
        measure();
      } else if (!timer) {
        timer = window.setTimeout(() => {
          timer = 0;
          measure();
        }, 60 - since);
      }
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  const beat = BEATS[active];

  return (
    // No `overflow-hidden` here, however tempting it is for containing the wash
    // below. Any scrollport-creating ancestor — and overflow:hidden creates one
    // — silently kills `position: sticky` on a descendant: MIMI scrolled away
    // with the first paragraph and the column sat empty for the rest of the
    // story. The wash is inset-0 and cannot overflow anyway.
    <section className="relative py-20 sm:py-28">
      {/* Jade wash. The cat is orange; the room she sits in is jade, which is
          also her eye colour — that pairing is what keeps the silhouette from
          dissolving into a warm background. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(16,185,129,.13), transparent 70%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <header className="max-w-2xl mb-14 sm:mb-20">
          <p className="mimi-nhan-muc mb-3 text-mimi-green">
            {t('ui2.story.nhan')}
          </p>
          <h2 className="mimi-tieu-de-muc text-foreground">
            {t('ui2.story.tieuDe')}
          </h2>
          <p className="mimi-doan-dan mt-4 text-muted-foreground">
            {t('ui2.story.moTa')}
          </p>
        </header>

        <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-10 lg:gap-16">
          {/* Sticky stage. Hidden below lg: on a phone a sticky column would eat
              most of the screen and leave a sliver for the words. */}
          <div className="hidden lg:block">
            <motion.div
              className="sticky top-28 h-[360px] flex items-center justify-center"
              // A slow breath. Without it the cat is a still image that jumps
              // between poses; with it she reads as sitting there the whole
              // time, changing what she is doing rather than being reprinted.
              animate={{ y: [0, -9, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div
                aria-hidden
                className="absolute inset-0 blur-3xl opacity-70"
                style={{
                  background:
                    'radial-gradient(42% 42% at 50% 50%, rgba(16,185,129,.42), rgba(45,212,191,.20) 50%, transparent 72%)',
                }}
              />
              {BEATS.map((b, i) => (
                <motion.img
                  key={b.frame}
                  src={b.frame}
                  alt=""
                  aria-hidden
                  draggable={false}
                  // All beats stay mounted and cross-fade. Swapping `src` on one
                  // <img> flashes white on the first showing of each pose,
                  // because the new file has not decoded yet.
                  className={`absolute ${b.w} h-auto select-none no-save`}
                  style={{ filter: 'drop-shadow(0 24px 40px rgba(6,78,59,.28))' }}
                  initial={false}
                  animate={{
                    opacity: i === active ? 1 : 0,
                    scale: i === active ? 1 : 0.94,
                    y: i === active ? 0 : 10,
                  }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              ))}
            </motion.div>
          </div>

          <div>
            {BEATS.map((b, i) => (
              <div
                key={i}
                ref={(el) => (refs.current[i] = el)}
                // Tight enough that a beat fills roughly half the screen. At
                // 62–70vh each paragraph floated alone in a field of white and
                // the section ran past 5000px; the reader scrolled through more
                // emptiness than story.
                className="min-h-[40vh] lg:min-h-[46vh] flex flex-col justify-center py-6"
              >
                {/* On phones the pose rides with its own paragraph instead. */}
                <img
                  src={b.frame}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="lg:hidden w-40 h-auto mb-5 select-none no-save"
                />
                {b.kicker && (
                  <p className="mimi-nhan-muc mb-3 text-mimi-green">
                    {t(b.kicker)}
                  </p>
                )}
                {b.lines.map((l, j) => (
                  <p
                    key={j}
                    className="text-lg sm:text-2xl text-foreground/90 leading-relaxed mb-4 max-w-xl"
                  >
                    {t(l)}
                  </p>
                ))}

                {/* The three questions belong to the "chỉ cần hỏi" beat. */}
                {b.hoi && (
                  <div className="mt-4 space-y-3 max-w-lg">
                    {ASKS.map((a) => (
                      <div key={a.q}>
                        <div className="inline-block rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-sm sm:text-base">
                          {t(a.q)}
                        </div>
                        <div className="mt-1.5 inline-flex items-start gap-2 rounded-2xl rounded-bl-md bg-mimi-green/10 border border-mimi-green/20 px-4 py-2.5 text-sm sm:text-base text-foreground/85">
                          {t(a.a)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 lg:mt-16 max-w-2xl">
          <p className="font-serif text-2xl font-normal leading-snug tracking-[-0.015em] text-foreground sm:text-4xl">
            {t('ui2.story.ket0')}
            <br />
            <span className="text-mimi-green">{t('ui2.story.ket1')}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
