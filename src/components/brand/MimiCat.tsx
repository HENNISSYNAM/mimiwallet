import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import catLogo from '@/assets/mimi-cat.png';

/**
 * The brand mark. Two variants share one image so the head never renders twice
 * from different sources.
 *
 * `mark` is the flat logo used in the navbar, sidebar, footer and login — no
 * motion, because a mark that moves in chrome is noise.
 *
 * `hero` is the MetaMask-style treatment: the head tilts toward the pointer and
 * drifts slowly when the pointer is elsewhere, so the page feels alive without
 * anything sliding around under the reader.
 */

type Props = {
  variant?: 'mark' | 'hero';
  className?: string;
  /** hero only: how far the head turns, in degrees */
  tilt?: number;
};

export default function MimiCat({ variant = 'mark', className = '', tilt = 14 }: Props) {
  if (variant === 'mark') {
    return (
      <img
        src={catLogo}
        alt="MIMI WALLET"
        className={className}
        // Decorative in chrome where the wordmark sits next to it; the alt text
        // above covers the case where it stands alone.
        draggable={false}
      />
    );
  }
  return <HeroCat className={className} tilt={tilt} />;
}

function HeroCat({ className, tilt }: { className: string; tilt: number }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  // Raw pointer position as a fraction of the viewport, -0.5 … 0.5.
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Springs, not raw values: following the pointer exactly reads as a sticker
  // glued to the cursor. The lag is what makes it feel like a head turning.
  const sx = useSpring(px, { stiffness: 110, damping: 18, mass: 0.6 });
  const sy = useSpring(py, { stiffness: 110, damping: 18, mass: 0.6 });

  const rotateY = useTransform(sx, [-0.5, 0.5], [-tilt, tilt]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [tilt * 0.7, -tilt * 0.7]);
  const shiftX = useTransform(sx, [-0.5, 0.5], [-12, 12]);
  const shiftY = useTransform(sy, [-0.5, 0.5], [-8, 8]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);

    // Pointer tracking is skipped entirely on touch devices: there is no hover
    // there, and the listener would only fire on taps, making the head jump.
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine || mq.matches) return () => mq.removeEventListener('change', onChange);

    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth - 0.5);
      py.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      mq.removeEventListener('change', onChange);
    };
  }, [px, py]);

  return (
    <div ref={wrap} className={`relative ${className}`} style={{ perspective: 900 }}>
      {/* Warm halo behind the head. Sits in its own layer so the blur never
          touches the artwork itself, which would soften the facets. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-70"
        style={{
          background:
            'radial-gradient(45% 45% at 50% 45%, rgba(249,115,22,.55), transparent 70%)',
        }}
      />
      {/* Two nested layers, deliberately. Putting the pointer tilt and the idle
          bob on one element froze the tilt: `animate` makes framer-motion write
          the whole `transform` itself, which overwrites the motion values bound
          through `style`. The head then stayed at whatever angle it held when
          the loop started. Outer element owns the tilt, inner owns the bob. */}
      <motion.div
        style={
          reduced
            ? undefined
            : { rotateX, rotateY, x: shiftX, y: shiftY, transformStyle: 'preserve-3d' }
        }
      >
        <motion.div
          animate={reduced ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src={catLogo}
            alt="MIMI WALLET"
            draggable={false}
            className="w-full h-auto select-none"
            style={{ filter: 'drop-shadow(0 28px 40px rgba(120,53,15,.28))' }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
