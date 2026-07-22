import type { ComponentType } from 'react';

type Tone = 'blue' | 'green' | 'amber' | 'violet';

/**
 * Structural rather than `LucideIcon`, so the badge accepts both lucide icons
 * and our own set in `@/components/illustrations/BrandIcons` — they share this
 * prop shape by design.
 */
type IconLike = ComponentType<{
  // lucide types `size` as `string | number`; matching it keeps LucideIcon assignable.
  size?: string | number;
  className?: string;
  strokeWidth?: string | number;
}>;

const TONES: Record<Tone, string> = {
  blue: 'bg-primary/10 text-primary',
  green: 'bg-mimi-green/10 text-mimi-green',
  amber: 'bg-mimi-amber/10 text-mimi-amber',
  violet: 'bg-[hsl(270_60%_55%/0.1)] text-[hsl(270_60%_50%)]',
};

/** Small pill used to surface a core-tech capability inline (e.g. "⚡ Tính trong 3 giây"). */
export default function TechBadge({
  icon: Icon,
  label,
  tone = 'blue',
  className = '',
}: {
  icon?: IconLike;
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONES[tone]} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {label}
    </span>
  );
}
