/**
 * Original gamification artwork for the Learn hero — drawn for Mimi Wallet,
 * not lifted from anywhere. The coin carries ₫ rather than a generic star so
 * the reward reads as Vietnamese currency, and every colour comes from the
 * app's own token palette.
 *
 * Each piece is a plain SVG sized by a `size` prop, so callers control the
 * float animation through CSS custom properties on the wrapper.
 */

const GOLD_EDGE = '#D98A00';
const GOLD_FACE = '#FFB020';
const GOLD_LIGHT = '#FFD166';
const GEM_EDGE = '#0A84D8';
const GEM_FACE = '#32ADE6';
const GEM_LIGHT = '#7DD3F5';

/** Isometric gold coin stamped with ₫. */
export function Coin({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* thickness */}
      <ellipse cx="32" cy="38" rx="26" ry="15" fill={GOLD_EDGE} />
      {/* face */}
      <ellipse cx="32" cy="32" rx="26" ry="15" fill={GOLD_FACE} />
      <ellipse cx="32" cy="32" rx="19" ry="10.5" fill={GOLD_LIGHT} />
      {/* ₫ — squashed to sit flat on the isometric face */}
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fontSize="19"
        fontWeight="800"
        fill={GOLD_EDGE}
        fontFamily="Inter, system-ui, sans-serif"
        transform="matrix(1 0 0 0.62 0 12.2)"
      >
        ₫
      </text>
    </svg>
  );
}

/** Faceted blue gem — the "bonus" reward. */
export function Gem({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 4 L42 15 L42 33 L24 44 L6 33 L6 15 Z" fill={GEM_FACE} />
      <path d="M24 4 L42 15 L24 24 L6 15 Z" fill={GEM_LIGHT} />
      <path d="M24 24 L42 15 L42 33 L24 44 Z" fill={GEM_EDGE} opacity="0.85" />
    </svg>
  );
}

/** Open treasure chest — stands for unlocked capital. */
export function Chest({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true">
      {/* lid, tipped open */}
      <path d="M12 30 L36 18 L60 30 L60 22 Q36 8 12 22 Z" fill={GOLD_LIGHT} />
      <path d="M12 30 L36 18 L60 30 L60 34 L12 34 Z" fill={GOLD_FACE} />
      {/* body */}
      <rect x="12" y="34" width="48" height="26" rx="4" fill="#8B5A2B" />
      <rect x="12" y="34" width="48" height="8" rx="2" fill={GOLD_EDGE} />
      <rect x="31" y="40" width="10" height="12" rx="2" fill={GOLD_LIGHT} />
      <circle cx="36" cy="46" r="2" fill={GOLD_EDGE} />
    </svg>
  );
}

/** Four-point sparkle used to punctuate the scene. */
export function Sparkle({ size = 20, color = '#AF7BFF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 0 C12 7 17 12 24 12 C17 12 12 17 12 24 C12 17 7 12 0 12 C7 12 12 7 12 0 Z"
        fill={color}
      />
    </svg>
  );
}
