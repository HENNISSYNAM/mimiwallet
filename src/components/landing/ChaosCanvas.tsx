import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, FileText, Mail, MessageSquare, Landmark, ReceiptText, Folder, AlertTriangle } from 'lucide-react';

/**
 * Bức tranh "các hệ thống không nói chuyện với nhau": các thẻ giao diện giả
 * nằm rải rác, nối bằng nét đứt, trôi nhẹ và nghiêng theo con trỏ.
 */

type Node = {
  id: string;
  x: number; // % theo chiều ngang
  y: number; // % theo chiều dọc
  depth: number; // 0.2 - 1, càng lớn càng chuyển động nhiều
  rotate: number;
  render: (label: string) => JSX.Element;
};

const card = (children: JSX.Element) => (
  <div className="rounded-xl border border-border/70 bg-card/95 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur-sm">
    {children}
  </div>
);

const NODES: Node[] = [
  {
    id: 'sheet', x: 16, y: 58, depth: 1, rotate: -3,
    render: (label) => card(
      <div className="w-[230px] overflow-hidden rounded-xl">
        <div className="flex items-center gap-2 bg-emerald-600 px-3 py-1.5 text-[11px] font-medium text-white">
          <FileSpreadsheet className="h-3.5 w-3.5" /> {label}
        </div>
        <div className="space-y-1 p-2">
          {Array.from({ length: 6 }).map((_, r) => (
            <div key={r} className="grid grid-cols-5 gap-1">
              {Array.from({ length: 5 }).map((__, c) => (
                <div key={c} className="h-2 rounded-[2px] bg-muted" style={{ opacity: 1 - (r * 0.08) - (c * 0.03) }} />
              ))}
            </div>
          ))}
        </div>
      </div>,
    ),
  },
  {
    id: 'chat', x: 30, y: 24, depth: 0.7, rotate: 2,
    render: (label) => card(
      <div className="flex w-[220px] items-center gap-2 px-3 py-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <MessageSquare className="h-3.5 w-3.5" />
        </div>
        <p className="text-[12px] leading-snug text-foreground">{label}</p>
      </div>,
    ),
  },
  {
    id: 'form', x: 50, y: 40, depth: 0.85, rotate: -1,
    render: (label) => card(
      <div className="w-[210px] p-3">
        <p className="text-[11px] font-semibold text-foreground">{label}</p>
        <div className="mt-2 space-y-2">
          <div className="h-6 rounded border border-destructive/50 bg-destructive/5" />
          <div className="h-6 rounded border border-destructive/50 bg-destructive/5" />
        </div>
        <p className="mt-2 flex items-center gap-1 text-[10px] text-destructive">
          <AlertTriangle className="h-3 w-3" /> 400 Bad Request
        </p>
      </div>,
    ),
  },
  {
    id: 'pdf', x: 41, y: 72, depth: 0.5, rotate: 4,
    render: (label) => (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-10 w-9 items-center justify-center rounded-md border border-border bg-card shadow-sm">
          <FileText className="h-4 w-4 text-destructive" />
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    ),
  },
  {
    id: 'folder', x: 60, y: 74, depth: 0.6, rotate: -5,
    render: (label) => (
      <div className="flex flex-col items-center gap-1">
        <Folder className="h-8 w-8 text-sky-500" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    ),
  },
  {
    id: 'mail', x: 70, y: 20, depth: 0.75, rotate: 3,
    render: (label) => (
      <div className="relative">
        {card(
          <div className="flex h-11 w-11 items-center justify-center">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>,
        )}
        <span className="absolute -right-3 -top-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
          {label}
        </span>
      </div>
    ),
  },
  {
    id: 'policy', x: 84, y: 46, depth: 1, rotate: -2,
    render: (label) => card(
      <div className="w-[190px] p-3">
        <p className="font-serif text-[12px] text-foreground">{label}</p>
        <div className="mt-2 space-y-1.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-1.5 rounded bg-muted" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
          ))}
        </div>
      </div>,
    ),
  },
  {
    id: 'bank', x: 76, y: 78, depth: 0.8, rotate: 2,
    render: (label) => card(
      <div className="w-[190px] p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <Landmark className="h-3.5 w-3.5 text-primary" /> {label}
        </p>
        {[62, 48, 80].map((w, i) => (
          <div key={i} className="mt-2 flex items-center justify-between">
            <div className="h-1.5 rounded bg-muted" style={{ width: `${w}%` }} />
            <span className="ml-2 font-mono text-[9px] text-muted-foreground">—</span>
          </div>
        ))}
      </div>,
    ),
  },
  {
    id: 'receipt', x: 22, y: 84, depth: 0.45, rotate: 6,
    render: (label) => (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-11 w-8 items-center justify-center rounded-sm border border-border bg-card shadow-sm">
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    ),
  },
];

const LINKS: [string, string][] = [
  ['sheet', 'chat'], ['chat', 'form'], ['form', 'policy'], ['pdf', 'sheet'],
  ['folder', 'form'], ['mail', 'policy'], ['bank', 'folder'], ['receipt', 'sheet'], ['policy', 'bank'],
];

const pos = (id: string) => {
  const n = NODES.find((x) => x.id === id)!;
  return { x: n.x, y: n.y };
};

export default function ChaosCanvas() {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const labels = t('landing.chaos.labels', { returnObjects: true }) as Record<string, string>;

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPointer({
      x: ((e.clientX - r.left) / r.width - 0.5) * 2,
      y: ((e.clientY - r.top) / r.height - 0.5) * 2,
    });
  };

  return (
    <section className="relative overflow-hidden bg-background py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-serif text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] tracking-[-0.02em] text-foreground">
            {t('landing.chaos.title')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t('landing.chaos.subtitle')}</p>
        </motion.div>
      </div>

      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={() => setPointer({ x: 0, y: 0 })}
        className="relative mx-auto mt-10 h-[420px] w-full max-w-6xl select-none sm:h-[520px]"
      >
        {/* nét đứt nối các hệ thống */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {LINKS.map(([a, b], i) => {
            const p1 = pos(a); const p2 = pos(b);
            const mx = (p1.x + p2.x) / 2 + (i % 2 ? 6 : -6);
            const my = (p1.y + p2.y) / 2 + (i % 3 ? -8 : 8);
            return (
              <motion.path
                key={`${a}-${b}`}
                d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeOpacity={0.35}
                strokeWidth={0.18}
                strokeDasharray="1.2 1.2"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.15 * i, ease: 'easeInOut' }}
              />
            );
          })}
        </svg>

        {NODES.map((n, i) => (
          <motion.div
            key={n.id}
            className="absolute"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`,
              y: drift,
              translateX: '-50%',
              translateY: '-50%',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: 0.06 * i }}
          >
            <motion.div
              animate={
                reduce
                  ? undefined
                  : {
                      x: pointer.x * 18 * n.depth,
                      y: [0, -6 * n.depth, 0],
                      rotate: n.rotate + pointer.y * 2 * n.depth,
                    }
              }
              transition={{
                x: { type: 'spring', stiffness: 60, damping: 18 },
                rotate: { type: 'spring', stiffness: 60, damping: 18 },
                y: { duration: 4 + i * 0.4, repeat: Infinity, ease: 'easeInOut' },
              }}
              whileHover={{ scale: 1.06, zIndex: 20 }}
              style={{ rotate: n.rotate }}
            >
              {n.render(labels?.[n.id] ?? '')}
            </motion.div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
