import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import catLogo from '@/assets/mimi-cat.webp';
import frIdle from '@/assets/mimi/idle.webp';
import frBlink from '@/assets/mimi/blink.webp';
import frContent from '@/assets/mimi/content.webp';
import frHappy from '@/assets/mimi/happy.webp';
import frWink from '@/assets/mimi/wink.webp';
import frLove from '@/assets/mimi/love.webp';

/**
 * The brand mark, and MIMI as a character.
 *
 * `mark` is the flat logo used in the navbar, sidebar, footer and login — no
 * motion, because a mark that moves in chrome is noise.
 *
 * `hero` is the MetaMask-style treatment: the head tilts toward the pointer and
 * drifts when the pointer is elsewhere.
 *
 * `live` adds the thing a transform cannot fake — MIMI blinks, and reacts when
 * you touch her. Blinking is what separates a mascot from a sticker, and it has
 * to come from real drawn frames: eyelids cannot be simulated with CSS on a
 * flat image. The frames are the sprite sheet, cut on the alpha channel.
 */

type Props = {
  variant?: 'mark' | 'hero' | 'live';
  className?: string;
  /** hero/live only: how far the head turns, in degrees */
  tilt?: number;
  /** Colour of the halo behind the head. */
  glow?: 'jade' | 'none';
};

export default function MimiCat({
  variant = 'mark',
  className = '',
  tilt = 14,
  glow = 'jade',
}: Props) {
  if (variant === 'mark') {
    return (
      <img
        src={catLogo}
        alt="MIMI WALLET"
        className={`no-save ${className}`}
        draggable={false}
      />
    );
  }
  return <HeroCat className={className} tilt={tilt} live={variant === 'live'} glow={glow} />;
}

/** Frames used by the `live` variant, all from the same ~190px head set so the
 *  cut between them lands on the same drawing rather than jumping in style. */
const FACE = {
  idle: frIdle,
  blink: frBlink,
  content: frContent,
  happy: frHappy,
  wink: frWink,
  love: frLove,
};
type Face = keyof typeof FACE;

function HeroCat({
  className,
  tilt,
  live,
  glow,
}: {
  className: string;
  tilt: number;
  live: boolean;
  glow: 'jade' | 'none';
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  const [face, setFace] = useState<Face>('idle');
  // Held expressions (a click, a hover) must not be wiped by a blink that was
  // already scheduled, so the blink loop checks this before touching the face.
  const held = useRef(false);

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

  // Blinking. Irregular on purpose — a blink on a fixed interval reads as a
  // strobe rather than a living thing, because the eye picks up the rhythm.
  useEffect(() => {
    if (!live || reduced) return;
    let stop = false;
    let t: number;
    const loop = () => {
      t = window.setTimeout(() => {
        if (stop) return;
        if (!held.current) {
          setFace('blink');
          window.setTimeout(() => {
            if (!stop && !held.current) setFace('idle');
          }, 130);
        }
        loop();
      }, 2200 + Math.random() * 3800);
    };
    loop();
    return () => {
      stop = true;
      window.clearTimeout(t);
    };
  }, [live, reduced]);

  const hold = (f: Face, ms: number) => {
    held.current = true;
    setFace(f);
    window.setTimeout(() => {
      held.current = false;
      setFace('idle');
    }, ms);
  };

  const src = live ? FACE[face] : catLogo;

  return (
    <div
      ref={wrap}
      className={`relative ${className}`}
      style={{ perspective: 900 }}
      onPointerEnter={live && !reduced ? () => !held.current && setFace('content') : undefined}
      onPointerLeave={live && !reduced ? () => !held.current && setFace('idle') : undefined}
      onClick={live && !reduced ? () => hold('love', 1400) : undefined}
    >
      {/* Jade halo. The fur is orange, so an orange glow flattens the head into
          its own background; jade is the eye colour and the complement of the
          coat, which makes the silhouette read instead of dissolve. Its own
          layer so the blur never touches the artwork and soften the facets. */}
      {glow === 'jade' && (
        <div
          aria-hidden
          // Pushed harder than a halo normally needs. The landing hero sits on a
          // warm cream gradient, and at the gentler opacity the jade simply
          // dissolved into it — the glow has to out-saturate the background it
          // is competing with, not just exist.
          className="pointer-events-none absolute -inset-[12%] -z-10 blur-3xl opacity-95"
          style={{
            background:
              'radial-gradient(46% 46% at 50% 48%, rgba(5,180,140,.78), rgba(20,200,170,.42) 45%, transparent 72%)',
          }}
        />
      )}
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
            src={src}
            alt="MIMI WALLET"
            draggable={false}
            className={`w-full h-auto select-none no-save ${live ? 'cursor-pointer' : ''}`}
            style={{ filter: 'drop-shadow(0 24px 36px rgba(6,78,59,.30))' }}
          />
        </motion.div>
      </motion.div>

      {/* Every frame is decoded up front. Swapping to a not-yet-loaded blink
          shows a one-frame gap where the head disappears, which is far more
          noticeable than the blink itself. */}
      {live && (
        <div aria-hidden className="hidden">
          {Object.values(FACE).map((s) => (
            <img key={s} src={s} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}
