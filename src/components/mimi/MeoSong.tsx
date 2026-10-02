import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import idle from '@/assets/mimi/idle.png';
import sleep from '@/assets/mimi/sleep.png';
import happy from '@/assets/mimi/happy.png';
import stretch from '@/assets/mimi/stretch.png';

/** Rảnh bao lâu thì mèo ngủ. */
export const NGU_SAU_MS = 45_000;
/** Rê qua lại trên đầu mèo bao nhiêu lần (đổi hướng) trong khung thời gian này thì tính là xoa đầu. */
export const SO_LAN_XOA = 2;
const KHUNG_XOA_MS = 1200;
const VUI_MS = 1800;

type Dang = 'thuc' | 'ngu' | 'vuon_vai' | 'vui';
const ANH: Record<Dang, string> = { thuc: idle, ngu: sleep, vuon_vai: stretch, vui: happy };

/**
 * Mèo MIMI sống trong một biểu tượng nhỏ (29/09/2026) — cùng bộ ảnh với pet: thở nhẹ khi thức, ngủ khi cả trang rảnh
 * lâu (có "z"), rê chuột tới là tỉnh và vươn vai, rê qua lại trên đầu (hoặc vuốt trên màn cảm ứng) là được xoa đầu:
 * mèo vui và thả một trái tim. Chỉ là trang trí — nút bọc ngoài quyết định bấm vào làm gì.
 */
export function MeoSong({ size = 32, className }: { size?: number; className?: string }) {
  const [dang, setDang] = useState<Dang>('thuc');
  const [tim, setTim] = useState(0);
  const giam = useRef(false);
  const henNgu = useRef<number>();
  const henVe = useRef<number>();
  const xoa = useRef<{ huong: number; x: number; lan: number; tu: number } | null>(null);

  useEffect(() => {
    try { giam.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* mặc định có chuyển động */ }
    const hoatDong = () => {
      window.clearTimeout(henNgu.current);
      henNgu.current = window.setTimeout(() => setDang('ngu'), NGU_SAU_MS);
    };
    hoatDong();
    const su = ['pointermove', 'keydown', 'scroll'] as const;
    su.forEach((e) => window.addEventListener(e, hoatDong, { passive: true }));
    return () => {
      su.forEach((e) => window.removeEventListener(e, hoatDong));
      window.clearTimeout(henNgu.current);
      window.clearTimeout(henVe.current);
    };
  }, []);

  const tamThoi = (d: Dang, ms: number) => {
    setDang(d);
    window.clearTimeout(henVe.current);
    henVe.current = window.setTimeout(() => setDang('thuc'), ms);
  };

  const vao = () => { if (dang === 'ngu') tamThoi('vuon_vai', 1400); };

  const re = (e: React.PointerEvent) => {
    const bayGio = performance.now();
    const k = xoa.current;
    if (!k || bayGio - k.tu > KHUNG_XOA_MS) { xoa.current = { huong: 0, x: e.clientX, lan: 0, tu: bayGio }; return; }
    const dx = e.clientX - k.x;
    if (Math.abs(dx) < 3) return;
    const huong = Math.sign(dx);
    if (k.huong && huong !== k.huong) k.lan += 1;
    k.huong = huong;
    k.x = e.clientX;
    if (k.lan >= SO_LAN_XOA) {
      xoa.current = null;
      tamThoi('vui', VUI_MS);
      setTim((n) => n + 1);
    }
  };

  const dong = giam.current ? undefined
    : dang === 'thuc' ? { scaleY: [1, 1.04, 1], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const } }
      : dang === 'ngu' ? { scaleY: [1, 1.03, 1], transition: { duration: 3.4, repeat: Infinity, ease: 'easeInOut' as const } }
        : dang === 'vui' ? { rotate: [0, -8, 8, -5, 0], y: [0, -3, 0], transition: { duration: 0.7 } }
          : { scaleX: [1, 1.14, 1], transition: { duration: 1.2 } };

  return (
    <span
      data-dang={dang}
      className={`relative inline-flex items-center justify-center ${className ?? ''}`}
      style={{ width: size, height: size }}
      onPointerEnter={vao}
      onPointerMove={re}
    >
      <motion.img
        src={ANH[dang]}
        alt=""
        aria-hidden
        draggable={false}
        animate={dong}
        style={{ transformOrigin: '50% 90%' }}
        className="no-save pointer-events-none h-full w-full select-none object-contain"
      />
      {dang === 'ngu' && !giam.current && (
        <motion.span aria-hidden className="pointer-events-none absolute -right-1 -top-1 font-display text-[9px] font-bold text-primary/70"
          animate={{ opacity: [0, 1, 0], y: [2, -6] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}>z</motion.span>
      )}
      <AnimatePresence>
        {tim > 0 && dang === 'vui' && (
          <motion.span key={tim} aria-hidden className="pointer-events-none absolute -top-2 left-1/2 text-[11px] leading-none text-rose-500"
            initial={{ opacity: 0, y: 0, x: '-50%', scale: 0.6 }} animate={{ opacity: [0, 1, 0], y: -14, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}>♥</motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
