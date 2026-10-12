/**
 * Mimi Wallet's own icon set — drawn for this product, not imported from a
 * generic pack. Used at the moments a judge or customer actually looks at:
 * credentials, the three core-tech pillars, feature cards and value props.
 *
 * lucide-react still covers utility affordances (chevron, close, search) where
 * a bespoke glyph adds nothing and risks looking off-system.
 *
 * House rules so the set reads as one family:
 *   - 24x24 viewBox, geometry inset to a 20px optical square
 *   - stroke-based, 1.8 width, round caps/joins
 *   - `currentColor` so a parent's text colour drives them
 *   - identical `size` prop shape to lucide, so they are drop-in compatible
 */

export interface BrandIconProps {
  /** `string | number` mirrors lucide's own typing so both sets stay interchangeable. */
  size?: string | number;
  className?: string;
  /** Stroke width override; keep the default unless optically correcting. */
  strokeWidth?: string | number;
}

function Svg({
  size = 24,
  className = '',
  strokeWidth = 1.8,
  children,
}: BrandIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Rosette + ribbon — an official decision or accreditation. */
export function CredentialBadge(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M9.6 9.1l1.6 1.6 3.2-3.2" />
      <path d="M8.6 13.7L7 21l5-2.4L17 21l-1.6-7.3" />
    </Svg>
  );
}

/** Shield whose lattice hints at a post-quantum key exchange. */
export function QuantumShield(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.8l7 2.7v6c0 4.3-2.9 8-7 9.7-4.1-1.7-7-5.4-7-9.7v-6z" />
      <path d="M9.2 10.6l5.6 3.2M14.8 10.6l-5.6 3.2" />
      <circle cx="12" cy="12.2" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Bolt through a gauge — a score produced in seconds. */
export function ScoringBolt(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M3.6 16.4a9 9 0 1116.8 0" />
      <path d="M12.9 8.4l-3.1 4.3h3.3l-1.1 3.6 3.3-4.5h-3.4z" />
    </Svg>
  );
}

/** Rising cash-flow line inside a frame. */
export function CashflowChart(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 4.5v15h17" />
      <path d="M7 15.2l3.4-3.9 2.7 2.3 4.4-5.4" />
      <path d="M17.5 5.5v2.7h-2.7" />
    </Svg>
  );
}

/** Invoice with a currency line. */
export function InvoiceDoc(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M6 2.8h8.4L19 7.4V21l-2.2-1.4L14.6 21l-2.2-1.4L10.2 21 8 19.6 6 21z" />
      <path d="M14.2 3v4.6H19" />
      <path d="M8.9 11.4h6.2M8.9 14.8h4" />
    </Svg>
  );
}

/** Vault door — working capital held safely. */
export function CapitalVault(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <rect x="2.8" y="4.2" width="18.4" height="15.6" rx="2.4" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 8.4V6.6M12 17.4v-1.8M15.6 12h1.8M6.6 12h1.8" />
    </Svg>
  );
}

/** Graduation cap — the Fintech learning track. */
export function LearnCap(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4L2.8 8.4 12 12.8l9.2-4.4z" />
      <path d="M6.6 10.6v4.8c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.8" />
      <path d="M21.2 8.4v5" />
    </Svg>
  );
}

/** Spark cluster — a machine-generated insight. Replaces the 🧠 emoji. */
export function InsightSpark(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M11 3.2l1.5 3.7 3.7 1.5-3.7 1.5L11 13.6 9.5 9.9 5.8 8.4l3.7-1.5z" />
      <path d="M17.8 13.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
      <path d="M5.6 16.2l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
    </Svg>
  );
}
