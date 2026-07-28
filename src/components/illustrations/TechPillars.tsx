/**
 * Animated illustrations for the three technology pillars on the landing page.
 *
 * These replace three static .svg files that were loaded through `<img src>`.
 * That form cannot be animated from the outside at all — no hover, no
 * scroll trigger, and no access to the theme tokens — so each one is inlined
 * here as a component instead.
 *
 * Each illustration animates the mechanism it describes rather than decorating
 * it: the lattice key travels into the lock and seals it, the score dial sweeps
 * to the real production figure of 701, and the row-level query lights only the
 * lane it is entitled to read. Motion runs once on entry and replays on hover.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const BLUE = 'hsl(var(--blue-500))';
const GREEN = 'hsl(var(--green-500))';
const AMBER = 'hsl(var(--amber-500))';

type ArtProps = {
  /** Card hover state — replays the sequence. */
  hovered?: boolean;
  /** Entry trigger, driven by the card's own scroll-into-view. */
  play?: boolean;
};

/** Restart a sequence whenever it enters view or the card is hovered. */
function useRunKey({ hovered, play }: ArtProps) {
  const [key, setKey] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (play && !started.current) {
      started.current = true;
      setKey((k) => k + 1);
    }
  }, [play]);
  useEffect(() => {
    if (hovered && started.current) setKey((k) => k + 1);
  }, [hovered]);
  return key;
}

const panel = (id: string, from: string, to: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  </defs>
);

/* ══════════════════════════════════════════════════════════════════
   1 — Post-quantum encryption
   A shared secret is encapsulated across the lattice, travels into the
   lock, and the shackle closes behind it.
   ══════════════════════════════════════════════════════════════════ */
export function QuantumLockArt({ hovered, play }: ArtProps) {
  const reduced = useReducedMotion();
  const runKey = useRunKey({ hovered, play });

  const nodes = [
    [40, 42], [92, 70], [58, 122], [112, 152],
    [268, 52], [320, 92], [288, 142], [322, 186],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7],
  ];
  // the path the encapsulated secret takes into the lock
  const travel = 'M112 152 C 140 150, 150 150, 168 150';

  return (
    <svg viewBox="0 0 360 240" className="w-full h-auto" role="img"
         aria-label="Khóa dữ liệu định danh bằng mật mã hậu lượng tử trên nền lưới lattice">
      {panel('qlBg', '#EAF2FF', '#E7FBF1')}
      <rect width="360" height="240" rx="28" fill="url(#qlBg)" />

      {/* lattice — the MLWE motif */}
      <g key={`lat-${runKey}`} stroke="#B9D4FF" strokeWidth="1.5" fill="none">
        {edges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]}
            initial={reduced ? { pathLength: 1, opacity: 0.7 } : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.06 * i }}
          />
        ))}
      </g>
      <g key={`nod-${runKey}`} fill="#7FB0FF">
        {nodes.map(([x, y], i) => (
          <motion.circle
            key={i} cx={x} cy={y} r="4"
            initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={reduced ? {} : { scale: [0, 1.5, 1], opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.05 * i }}
            style={{ originX: `${x}px`, originY: `${y}px` }}
          />
        ))}
      </g>

      {/* the encapsulated shared secret entering the lock */}
      {!reduced && (
        <motion.circle key={`sec-${runKey}`} r="5" fill={AMBER}
          initial={{ opacity: 0, offsetDistance: '0%' }}
          animate={{ opacity: [0, 1, 1, 0], offsetDistance: '100%' }}
          transition={{ duration: 0.9, delay: 0.55, ease: 'easeInOut' }}
          style={{ offsetPath: `path("${travel}")`, offsetRotate: '0deg' }}
        />
      )}

      {/* shackle — closes after the secret is inside */}
      <motion.path
        key={`sh-${runKey}`}
        d="M150 112 v-16 a30 30 0 0 1 60 0 v16"
        stroke="#0A63D6" strokeWidth="14" fill="none" strokeLinecap="round"
        initial={reduced ? { y: 0 } : { y: -14 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: reduced ? 0 : 1.25 }}
      />

      {/* body */}
      <rect x="128" y="112" width="104" height="88" rx="20" fill={BLUE} />
      <circle cx="180" cy="150" r="13" fill="#fff" />
      <rect x="176" y="150" width="8" height="26" rx="4" fill="#fff" />

      {/* Seal confirmed. The placement lives on a plain outer <g>: animating
          scale makes framer-motion write its own `transform` into style, which
          overrides a transform attribute on the same element and drops the
          badge into the top-left corner. */}
      <g transform="translate(236 150)">
        <motion.g
          key={`ck-${runKey}`}
          initial={reduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 14, delay: reduced ? 0 : 1.5 }}
        >
          <path d="M0 -14 l18 7 v10 c0 12 -9 19 -18 22 c-9 -3 -18 -10 -18 -22 v-10 z" fill={GREEN} />
          <path d="M-7 1 l5 5 l10 -11" stroke="#fff" strokeWidth="3.4" fill="none"
                strokeLinecap="round" strokeLinejoin="round" />
        </motion.g>
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   2 — Explainable ML scoring
   Transaction rows fill, a pulse runs through the model, the dial
   sweeps to 701 — the figure the production system actually returns.
   ══════════════════════════════════════════════════════════════════ */
const SCORE = 701;
const ARC_MIN = 300;
const ARC_MAX = 850;
const ARC_LEN = 160.2;          // 270° of r=34
const ARC_FRACTION = (SCORE - ARC_MIN) / (ARC_MAX - ARC_MIN);

export function MLScoreArt({ hovered, play }: ArtProps) {
  const reduced = useReducedMotion();
  const runKey = useRunKey({ hovered, play });
  const [shown, setShown] = useState(reduced ? SCORE : ARC_MIN);

  // Count the dial up in step with the arc sweep. SVG text content cannot be
  // driven by a motion value, so it is ticked here.
  useEffect(() => {
    if (reduced) { setShown(SCORE); return; }
    if (!runKey) return;
    let raf = 0;
    const DELAY = 700, DUR = 1100;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0 - DELAY) / DUR;
      if (t < 0) { raf = requestAnimationFrame(tick); return; }
      const e = t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);      // easeOutCubic
      setShown(Math.round(ARC_MIN + (SCORE - ARC_MIN) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    setShown(ARC_MIN);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runKey, reduced]);

  const rows = [0, 1, 2, 3];

  return (
    <svg viewBox="0 0 360 240" className="w-full h-auto" role="img"
         aria-label="Dữ liệu giao dịch đi qua mô hình học máy và trả về điểm tín dụng 701">
      {panel('mlBg', '#E9FBF2', '#EAF3FF')}
      <rect width="360" height="240" rx="28" fill="url(#mlBg)" />

      {/* data rows */}
      <g key={`rows-${runKey}`}>
        <rect x="34" y="82" width="72" height="76" rx="12" fill="#fff" />
        {rows.map((i) => (
          <motion.rect
            key={i} x="46" y={96 + i * 16} height="7" rx="3.5"
            fill={i === 0 ? BLUE : '#C9DEF7'}
            initial={reduced ? { width: 48 } : { width: 0 }}
            animate={{ width: [0, 48] }}
            transition={{ duration: 0.34, delay: reduced ? 0 : 0.1 * i }}
          />
        ))}
      </g>

      {/* model */}
      <motion.g
        key={`box-${runKey}`}
        initial={reduced ? { scale: 1 } : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 18, delay: reduced ? 0 : 0.5 }}
      >
        <rect x="146" y="90" width="68" height="60" rx="16" fill={BLUE} />
        {/* two-layer net, not a triangle: 3 inputs on the left, 2 nodes right */}
        <g stroke="#fff" strokeWidth="1.5" opacity="0.85">
          <line x1="163" y1="106" x2="197" y2="112" /><line x1="163" y1="106" x2="197" y2="134" />
          <line x1="163" y1="120" x2="197" y2="112" /><line x1="163" y1="120" x2="197" y2="134" />
          <line x1="163" y1="134" x2="197" y2="112" /><line x1="163" y1="134" x2="197" y2="134" />
        </g>
        <g fill="#fff">
          <circle cx="163" cy="106" r="3.2" /><circle cx="163" cy="120" r="3.2" />
          <circle cx="163" cy="134" r="3.2" />
          <circle cx="197" cy="112" r="4" /><circle cx="197" cy="134" r="4" />
        </g>
      </motion.g>

      {/* pulses along the two connectors */}
      <g stroke="#9CC3F0" strokeWidth="2" strokeLinecap="round">
        <line x1="112" y1="120" x2="140" y2="120" />
        <line x1="220" y1="120" x2="248" y2="120" />
      </g>
      {!reduced && [0, 1].map((i) => (
        <motion.circle
          key={`p-${i}-${runKey}`} cy="120" r="3.6" fill={GREEN}
          initial={{ cx: i === 0 ? 112 : 220, opacity: 0 }}
          animate={{ cx: i === 0 ? 140 : 248, opacity: [0, 1, 0] }}
          transition={{ duration: 0.5, delay: 0.42 + i * 0.42 }}
        />
      ))}

      {/* score dial */}
      <g transform="translate(292 120)">
        <circle r="34" fill="#fff" />
        <circle r="34" fill="none" stroke="#DCE8F6" strokeWidth="9"
                strokeDasharray={`${ARC_LEN} 400`} transform="rotate(135)" strokeLinecap="round" />
        <motion.circle
          key={`arc-${runKey}`}
          r="34" fill="none" stroke={GREEN} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${ARC_LEN} 400`} transform="rotate(135)"
          initial={reduced ? { strokeDashoffset: ARC_LEN * (1 - ARC_FRACTION) } : { strokeDashoffset: ARC_LEN }}
          animate={{ strokeDashoffset: ARC_LEN * (1 - ARC_FRACTION) }}
          transition={{ duration: reduced ? 0 : 1.1, delay: reduced ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <text textAnchor="middle" y="7" fontSize="23" fontWeight="800"
              fill="hsl(var(--text-primary))" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {shown}
        </text>
      </g>

      {/* elapsed-time chip */}
      <motion.g
        key={`chip-${runKey}`}
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduced ? 0 : 1.7, duration: 0.35 }}
      >
        <rect x="252" y="46" width="80" height="26" rx="13" fill={GREEN} />
        <text x="292" y="63" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#fff">
          ~3 giây
        </text>
      </motion.g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3 — Row-Level Security
   A query enters and only the lane it owns unlocks; the other two stay
   shut. This shows what RLS does rather than drawing a padlock.
   ══════════════════════════════════════════════════════════════════ */
export function RLSArt({ hovered, play }: ArtProps) {
  const reduced = useReducedMotion();
  const runKey = useRunKey({ hovered, play });
  const lanes = [0, 1, 2];
  const OWN = 1;                                   // the lane the query owns

  return (
    <svg viewBox="0 0 360 240" className="w-full h-auto" role="img"
         aria-label="Phân quyền theo dòng: truy vấn chỉ mở đúng dữ liệu của doanh nghiệp mình">
      {panel('rlsBg', '#EFEBFF', '#EAF2FF')}
      <rect width="360" height="240" rx="28" fill="url(#rlsBg)" />

      {lanes.map((i) => {
        const x = 34 + i * 100;
        const mine = i === OWN;
        return (
          <g key={i}>
            {/* company record — outlined, because a plain white fill all but
                disappears against this panel */}
            <rect x={x} y="128" width="86" height="64" rx="14" fill="#fff"
                  stroke={mine ? BLUE : '#D3D8E2'} strokeWidth={mine ? 2 : 1} />
            <circle cx={x + 20} cy="150" r="8" fill={mine ? BLUE : '#C7CEDB'} />
            <rect x={x + 34} y="146" width="36" height="6" rx="3" fill={mine ? '#9CC3F0' : '#E1E5EC'} />
            <rect x={x + 12} y="170" width="62" height="6" rx="3" fill={mine ? '#9CC3F0' : '#E1E5EC'} />

            {/* the gate: slides open only on the lane the query owns.
                Width animates rather than scaleX — a scale transform on a rect
                that also needs an x position fights the transform-origin. */}
            <motion.rect
              key={`bar-${i}-${runKey}`}
              x={x} y="112" height="7" rx="3.5"
              fill={mine ? GREEN : '#9AA4B4'}
              initial={reduced ? { width: mine ? 0 : 86 } : { width: 86 }}
              animate={{ width: mine ? 0 : 86 }}
              transition={{ duration: 0.5, delay: reduced ? 0 : 1.05, ease: 'easeInOut' }}
            />
            {mine && (
              <motion.g
                key={`ok-${i}-${runKey}`}
                initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduced ? 0 : 1.45, duration: 0.3 }}
              >
                <circle cx={x + 43} cy="115" r="9" fill={GREEN} />
                <path d={`M${x + 38} 115 l3.6 3.6 l6.6 -7.4`} stroke="#fff" strokeWidth="2.4"
                      fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </motion.g>
            )}
            {!mine && (
              <motion.g
                key={`x-${i}-${runKey}`}
                initial={reduced ? { opacity: 0.95 } : { opacity: 0 }}
                animate={{ opacity: 0.95 }}
                transition={{ delay: reduced ? 0 : 1.3, duration: 0.3 }}
              >
                <rect x={x + 35} y="96" width="16" height="12" rx="3" fill="#7C8698" />
                <path d={`M${x + 39} 96 v-4 a4 4 0 0 1 8 0 v4`} stroke="#7C8698" strokeWidth="2.6" fill="none" />
              </motion.g>
            )}
          </g>
        );
      })}

      {/* The query token parks above the lane it owns and stays there — the
          finished frame has to still read as "this query, that row". */}
      <motion.g
        key={`q-${runKey}`}
        initial={reduced ? { opacity: 1, y: 22 } : { opacity: 0, y: 0 }}
        animate={reduced ? {} : { opacity: [0, 1, 1, 1], y: [0, 0, 22, 22] }}
        transition={{ duration: 1.5, times: [0, 0.2, 0.75, 1], ease: 'easeInOut' }}
      >
        <rect x="150" y="40" width="60" height="24" rx="12" fill={BLUE} />
        <text x="180" y="56" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#fff">
          SELECT
        </text>
      </motion.g>
    </svg>
  );
}
