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

/** Bank colonnade. */
export function BankPillars(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M2.8 9.2L12 4.2l9.2 5" />
      <path d="M5.4 9.2v8.4M10 9.2v8.4M14 9.2v8.4M18.6 9.2v8.4" />
      <path d="M3.4 20.4h17.2" />
    </Svg>
  );
}

/** Coin stamped with ₫ — matches the reward coin in GamifyObjects. */
export function DongCoin(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 8.6h3a3.6 3.6 0 010 7.2h-3z" />
      <path d="M8.2 8.6h5.4" />
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

/** Stacked rows behind a lock — row-level security. */
export function RowLock(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M3 6.2h11M3 10.4h6.6M3 14.6h6.6M3 18.8h8" />
      <rect x="13.6" y="13" width="7.6" height="6.4" rx="1.4" />
      <path d="M15.4 13v-1.9a2 2 0 014 0V13" />
    </Svg>
  );
}

/** Stopwatch — the ~3 second scoring claim. */
export function SpeedGauge(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="13.4" r="7.8" />
      <path d="M12 9.4v4h2.8" />
      <path d="M9.6 2.8h4.8" />
      <path d="M12 2.8v2.8" />
    </Svg>
  );
}

/** Checklist — the automated test suite. */
export function TestCheck(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <rect x="3.6" y="3.4" width="16.8" height="17.2" rx="2.4" />
      <path d="M7.4 9l1.8 1.8 3.4-3.4" />
      <path d="M7.4 15.6l1.8 1.8 3.4-3.4" />
      <path d="M15.2 9.6h2.2M15.2 16.2h2.2" />
    </Svg>
  );
}

/** Handshake-free partnership mark: two arcs meeting. */
export function MentorLink(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M10 7.4L7.6 5A3.7 3.7 0 002.4 10.2l2.4 2.4" />
      <path d="M14 16.6l2.4 2.4a3.7 3.7 0 005.2-5.2l-2.4-2.4" />
      <path d="M8.8 15.2l6.4-6.4" />
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

/** Two bars with a divider — an expense-to-revenue ratio. */
export function CostRatio(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <rect x="3.4" y="9" width="6" height="11.4" rx="1.4" />
      <rect x="14.6" y="4.4" width="6" height="16" rx="1.4" />
      <path d="M3.4 20.4h17.2" />
      <path d="M12 5.6v9.2" strokeDasharray="2 2.4" />
    </Svg>
  );
}

/** Wave band — cash-flow volatility. Replaces the 🌊 emoji. */
export function FlowWave(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M2.6 8.6c2.4-3 4.8-3 7.2 0s4.8 3 7.2 0 4.8-3 4.4-.4" />
      <path d="M2.6 14c2.4-3 4.8-3 7.2 0s4.8 3 7.2 0 4.8-3 4.4-.4" />
      <path d="M2.6 19.4c2.4-3 4.8-3 7.2 0" opacity="0.45" />
    </Svg>
  );
}

/** Arrow climbing over bars — revenue trend. */
export function RevenueTrend(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M3.4 20.4h17.2" />
      <path d="M6.6 20.4v-4.8M11 20.4v-8.4M15.4 20.4v-5.6M19.8 20.4v-11" />
      <path d="M5.4 10.4l4.6-4.4 3.4 2.6 5.6-5" />
    </Svg>
  );
}

/** Wallet with a card lip — total balance. */
export function WalletMark(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M3 7.4a2.4 2.4 0 012.4-2.4h11.2a2 2 0 012 2v1.6" />
      <rect x="3" y="7.4" width="18" height="12.6" rx="2.6" />
      <path d="M21 12.4h-4a2 2 0 000 4h4" />
    </Svg>
  );
}

/** Building with a spark — an innovation centre. */
export function InnovationHub(p: BrandIconProps) {
  return (
    <Svg {...p}>
      <path d="M4.4 20.6V7.2l6.2-3.6v17" />
      <path d="M10.6 10.4l6.6 2.2v8h-6.6" />
      <path d="M7.2 9.6v1.8M7.2 14v1.8" />
      <path d="M19.8 4.4l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" />
    </Svg>
  );
}
