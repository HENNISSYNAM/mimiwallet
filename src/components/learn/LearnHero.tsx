import { Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { Coin, Gem, Chest, Sparkle } from '@/components/illustrations/GamifyObjects';

/**
 * Gamified header for the Learn page: a soft wave backdrop, a breathing glow,
 * and reward objects that bob on staggered clocks.
 *
 * The floating layer is decorative only — it sits behind the text at a lower
 * z-index and is aria-hidden, so it can never swallow a tap or be announced by
 * a screen reader. Objects that would collide with copy on a narrow phone are
 * gated behind `sm:`.
 */
interface Props {
  capLabel: string;
  doneCount: number;
  total: number;
}

/**
 * Float clocks in one place. Everything is anchored to the right because the
 * copy column is `max-w-md` on the left — on a 390px phone that column is the
 * full width, so only the top-right corner beside the short title is free.
 * Anything that would land on text is gated behind `sm:`.
 */
const FLOATERS: { cls: string; dur: string; delay: string; rise: string; rot?: string }[] = [
  { cls: 'right-[6%] bottom-[14%] hidden sm:block', dur: '4.4s', delay: '0s', rise: '-12px', rot: '-8deg' },
  { cls: 'right-[30%] bottom-[20%] hidden sm:block', dur: '5.2s', delay: '0.7s', rise: '-9px', rot: '6deg' },
  { cls: 'right-[7%] top-[13%]', dur: '4.8s', delay: '0.35s', rise: '-14px', rot: '10deg' },
  { cls: 'right-[27%] top-[26%] hidden sm:block', dur: '5.8s', delay: '1.1s', rise: '-8px', rot: '-5deg' },
];

export default function LearnHero({ capLabel, doneCount, total }: Props) {
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border hairline bg-card"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {/* ── decorative layer ── */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        {/* tinted wash */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-mimi-green/[0.07]" />

        {/* breathing glow behind the copy */}
        <div
          className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-primary/20 blur-3xl animate-glow-pulse"
          style={{ ['--float-dur' as string]: '7s' }}
        />

        {/* wave floor */}
        <svg
          className="absolute inset-x-0 bottom-0 w-full h-20"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64 C180,110 380,10 600,44 C820,78 1010,20 1200,54 L1200,120 L0,120 Z"
            className="fill-primary/[0.08]"
          />
          <path
            d="M0,88 C200,120 400,44 620,74 C840,104 1020,52 1200,80 L1200,120 L0,120 Z"
            className="fill-primary/[0.13]"
          />
        </svg>

        {/* floating rewards */}
        <div className={`absolute animate-float-bob ${FLOATERS[0].cls}`} style={floatVars(FLOATERS[0])}>
          <Chest size={54} />
        </div>
        <div className={`absolute animate-float-bob ${FLOATERS[1].cls}`} style={floatVars(FLOATERS[1])}>
          <Gem size={30} />
        </div>
        <div className={`absolute animate-float-bob ${FLOATERS[2].cls}`} style={floatVars(FLOATERS[2])}>
          <Coin size={52} />
        </div>
        <div className={`absolute animate-float-bob ${FLOATERS[3].cls}`} style={floatVars(FLOATERS[3])}>
          <Coin size={38} />
        </div>
        <div
          className="absolute right-[44%] top-[16%] animate-float-bob hidden sm:block"
          style={floatVars({ dur: '3.6s', delay: '0.5s', rise: '-7px' })}
        >
          <Sparkle size={16} />
        </div>
        <div
          className="absolute right-[19%] bottom-[44%] animate-float-bob hidden sm:block"
          style={floatVars({ dur: '4.2s', delay: '1.4s', rise: '-6px' })}
        >
          <Sparkle size={12} color="#FF9F0A" />
        </div>
      </div>

      {/* ── content ── */}
      <div className="relative px-5 py-6 sm:px-7 sm:py-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary animate-pop-in">
          <Award size={12} /> Cấp độ: {capLabel}
        </span>

        <h2 className="mt-3 text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
          Học Fintech
        </h2>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
          Lộ trình cá nhân hóa theo đúng điểm yếu tín dụng của bạn — học xong, điểm sẽ tăng.
        </p>

        <div className="mt-5 max-w-md">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs font-semibold text-foreground">Tiến độ học tập</span>
            <span className="font-mono text-sm font-bold text-primary">
              {doneCount}/{total} bài
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-accent">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-mimi-green"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function floatVars({ dur, delay, rise, rot }: { dur: string; delay: string; rise: string; rot?: string }) {
  return {
    ['--float-dur' as string]: dur,
    ['--float-delay' as string]: delay,
    ['--float-rise' as string]: rise,
    ...(rot ? { ['--float-rot' as string]: rot } : {}),
  } as React.CSSProperties;
}
