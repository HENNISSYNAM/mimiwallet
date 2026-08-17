import { useId } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Coin, Gem, Sparkle } from '@/components/illustrations/GamifyObjects';

/**
 * A pill tab switcher where the active state is one piece of material that
 * moves, not two static pills swapping colour — this codebase's equivalent of
 * Apple's `glassEffectID`/`GlassEffectContainer`: a shared `layoutId` lets
 * framer-motion animate the highlight *between* button positions instead of
 * cross-fading two independent backgrounds. First built for
 * `NewsAndLawPanel`; pulled out here once `FintechPage` needed the same thing,
 * rather than a third hand-copied version arriving later.
 *
 * `ambient` controls whether this instance wears actual Liquid Glass
 * (`lg-regular`, translucent, blurred) or stays opaque. That is not a style
 * toggle — it is the design rule already written into `index.css`'s Liquid
 * Glass section applied honestly: glass belongs over something that moves.
 * Pass `ambient` only where a decorative motion field sits behind the
 * switcher (see `AmbientMotifField` below); everywhere else — a dense,
 * in-flow filter row like `InvoicesPage`'s — the pill still morphs, but stays
 * opaque, because there is nothing real for a blur to work with there.
 */

export interface GlassTab {
  key: string;
  label: string;
  icon?: LucideIcon;
}

interface GlassTabsProps {
  tabs: GlassTab[];
  active: string;
  onChange: (key: string) => void;
  /** Wear actual glass. Only pass this over a genuine ambient motion field. */
  ambient?: boolean;
  className?: string;
}

export function GlassTabs({ tabs, active, onChange, ambient = false, className = '' }: GlassTabsProps) {
  const layoutId = useId();

  return (
    <div
      className={`${ambient ? 'lg-surface lg-regular' : 'bg-accent/30'} rounded-full p-1 flex items-center gap-0.5 relative ${className}`}
    >
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="relative px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          {active === key && (
            <motion.span
              layoutId={`${layoutId}-active`}
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          )}
          <span
            className={`relative flex items-center gap-1.5 ${
              active === key ? 'text-primary-foreground' : 'text-muted-foreground'
            }`}
          >
            {Icon && <Icon size={12} />}
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * MIMI's own reward motifs, held small and low-opacity, purely so a glass
 * surface placed over this field has something real to refract. Without it,
 * `lg-regular` sits on a flat token colour and produces nothing a backdrop
 * filter can show — the exact failure mode `index.css`'s Liquid Glass comment
 * already documents. Not meant to be looked at directly; if it draws the eye
 * on its own, it is too strong.
 */
export function AmbientMotifField() {
  return (
    <div className="absolute inset-x-0 top-0 h-24 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-3 right-10 opacity-[0.16] blur-[1px] animate-float-bob"
        style={{ '--float-dur': '7s' } as React.CSSProperties}
      >
        <GlassCoin />
      </div>
      <div
        className="absolute top-6 right-32 opacity-[0.14] blur-[1px] animate-float-bob"
        style={{ '--float-dur': '9s', animationDelay: '-2s' } as React.CSSProperties}
      >
        <GlassGem />
      </div>
      <div
        className="absolute top-1 left-16 opacity-[0.12] animate-float-bob"
        style={{ '--float-dur': '5.5s', animationDelay: '-1s' } as React.CSSProperties}
      >
        <GlassSparkle />
      </div>
    </div>
  );
}

// Fixed sizes rather than sizing GamifyObjects directly at each call site —
// keeps the ambient field's proportions consistent wherever it is dropped in,
// and gives one place to retune if the motif set changes.
function GlassCoin() { return <Coin size={40} />; }
function GlassGem() { return <Gem size={26} />; }
function GlassSparkle() { return <Sparkle size={14} color="hsl(var(--primary))" />; }
