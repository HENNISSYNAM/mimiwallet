import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import meoDi from '@/assets/mimi/walk.webp';
import meoBam from '@/assets/mimi/paw.webp';
import { kiemKichBan, type KichBan } from '@/lib/mimiLamHo';

/**
 * Con trỏ mèo MIMI — thực hiện một `KichBan` ngay trên giao diện, cho người dùng xem.
 *
 * Mèo đi tới đích bằng lò xo (không dịch chuyển tức thời — mắt người phải theo
 * kịp thì mới hiểu nó đang làm gì), khoanh sáng chỗ cần nhìn, và nói bằng bong
 * bóng. Người dùng giành lại quyền bất cứ lúc nào: phím Esc, nút "Dừng", hoặc
 * tự bấm vào đâu đó trên trang.
 *
 * HAI LỚP CHẶN NÚT NGUY HIỂM. `kiemKichBan` từ chối kịch bản có bước tự bấm nút
 * trong `DICH_KHONG_TU_BAM`; và lúc chạy, phần tử nào nằm trong
 * `[data-mimi-khong-tu-bam]` thì không bao giờ bị `click()` — kể cả khi kịch bản
 * đến từ một nguồn khác sau này.
 */

export interface KetQuaLamHo {
  xong: boolean;
  cau: string;
}

interface NguCanh {
  chay: (kb: KichBan) => Promise<KetQuaLamHo>;
  dung: () => void;
  dangChay: boolean;
}

const Ctx = createContext<NguCanh | null>(null);

export function useMimiLamHo(): NguCanh {
  const c = useContext(Ctx);
  if (!c) throw new Error('useMimiLamHo phải nằm trong MimiLamHoProvider');
  return c;
}

const ngu = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function timDich(dich: string): HTMLElement | null {
  const ds = document.querySelectorAll<HTMLElement>(`[data-mimi="${CSS.escape(dich)}"]`);
  for (const el of ds) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/** Gõ vào ô do React điều khiển: đặt giá trị qua setter gốc rồi bắn sự kiện input. */
function datGiaTri(el: HTMLElement, gia: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, gia);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const CO_MEO = 48;

export function MimiLamHoProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [hien, setHien] = useState(false);
  const [vi, setVi] = useState({ x: 0, y: 0 });
  const [quayTrai, setQuayTrai] = useState(false);
  const [noi, setNoi] = useState('');
  const [vong, setVong] = useState<DOMRect | null>(null);
  const [dangBam, setDangBam] = useState(false);
  const [dangChay, setDangChay] = useState(false);

  const biDung = useRef(false);
  const dangChayRef = useRef(false);
  const choNguoiBam = useRef(false);
  const viRef = useRef({ x: 0, y: 0 });
  const giamChuyenDong = useRef(false);

  useEffect(() => {
    giamChuyenDong.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const dung = useCallback(() => {
    biDung.current = true;
  }, []);

  // Esc dừng; người dùng tự bấm vào trang cũng là giành lại quyền — trừ lúc mèo
  // đang chờ chính người dùng bấm vào nút nó chỉ.
  useEffect(() => {
    if (!dangChay) return;
    const phim = (e: KeyboardEvent) => e.key === 'Escape' && dung();
    const cham = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest('[data-mimi-lop-phu]')) return;
      if (!choNguoiBam.current) dung();
    };
    window.addEventListener('keydown', phim);
    window.addEventListener('pointerdown', cham, true);
    return () => {
      window.removeEventListener('keydown', phim);
      window.removeEventListener('pointerdown', cham, true);
    };
  }, [dangChay, dung]);

  const diToi = useCallback(async (el: HTMLElement) => {
    const nhanh = giamChuyenDong.current;
    el.scrollIntoView({ block: 'center', behavior: nhanh ? 'auto' : 'smooth' });
    await ngu(nhanh ? 50 : 420);
    const r = el.getBoundingClientRect();
    setVong(r);
    const dich = {
      x: Math.min(window.innerWidth - CO_MEO, Math.max(0, r.left + Math.min(r.width / 2, 60))),
      y: Math.min(window.innerHeight - CO_MEO, Math.max(0, r.top + r.height / 2)),
    };
    setQuayTrai(dich.x < viRef.current.x);
    viRef.current = dich;
    setVi(dich);
    await ngu(nhanh ? 50 : 800);
  }, []);

  const choDich = useCallback(async (dich: string, ms: number) => {
    const het = Date.now() + ms;
    while (Date.now() < het) {
      if (biDung.current) return null;
      const el = timDich(dich);
      if (el) return el;
      await ngu(120);
    }
    return null;
  }, []);

  const chay = useCallback(
    async (kb: KichBan): Promise<KetQuaLamHo> => {
      const loi = kiemKichBan(kb);
      if (loi.length) return { xong: false, cau: `Mình không làm việc này: ${loi.join(' ')}` };
      if (dangChayRef.current) return { xong: false, cau: 'Mình đang làm dở một việc khác.' };

      dangChayRef.current = true;
      biDung.current = false;
      setDangChay(true);
      const batDau = { x: window.innerWidth - 96, y: window.innerHeight - 120 };
      viRef.current = batDau;
      setVi(batDau);
      setHien(true);

      try {
        for (const b of kb.buoc) {
          if (biDung.current) return { xong: false, cau: 'Đã dừng. Phần còn lại bạn làm tiếp nhé.' };

          if (b.loai === 'di_toi') {
            setNoi(b.noi);
            navigate(b.duongDan);
            await ngu(450);
            continue;
          }

          const el = await choDich(b.dich, 4000);
          if (!el) {
            if (biDung.current) return { xong: false, cau: 'Đã dừng. Phần còn lại bạn làm tiếp nhé.' };
            if (b.loai === 'chi' && b.neuKhongThay !== undefined) {
              if (b.neuKhongThay === '') continue;
              setVong(null);
              setNoi(b.neuKhongThay);
              await ngu(2200);
              return { xong: true, cau: b.neuKhongThay };
            }
            return { xong: false, cau: 'Mình không thấy chỗ cần tới trên trang này, nên dừng ở đây.' };
          }

          setNoi(b.noi);
          await diToi(el);

          if (b.loai === 'chi') {
            await ngu(1800);
          } else if (b.loai === 'go') {
            el.focus();
            for (let i = 1; i <= b.chu.length; i++) {
              if (biDung.current) break;
              datGiaTri(el, b.chu.slice(0, i));
              await ngu(giamChuyenDong.current ? 0 : 38);
            }
            await ngu(350);
          } else if (b.loai === 'bam') {
            if (el.closest('[data-mimi-khong-tu-bam]')) {
              return { xong: false, cau: 'Nút này phải do bạn tự bấm — mình đã dừng trước nó.' };
            }
            setDangBam(true);
            await ngu(260);
            el.click();
            await ngu(360);
            setDangBam(false);
          } else if (b.loai === 'nhuong') {
            choNguoiBam.current = true;
            const daBam = await new Promise<boolean>((xong) => {
              const khiBam = () => xong(true);
              el.addEventListener('click', khiBam, { once: true });
              const hen = window.setInterval(() => {
                if (biDung.current) {
                  window.clearInterval(hen);
                  el.removeEventListener('click', khiBam);
                  xong(false);
                }
              }, 150);
              window.setTimeout(() => {
                window.clearInterval(hen);
                el.removeEventListener('click', khiBam);
                xong(false);
              }, 30_000);
            });
            choNguoiBam.current = false;
            return daBam
              ? { xong: true, cau: 'Bạn đã bấm. Xong việc này rồi.' }
              : { xong: true, cau: `Mình đã chỉ đúng chỗ. ${b.noi}` };
          }
        }
        return { xong: true, cau: 'Xong rồi.' };
      } finally {
        await ngu(biDung.current ? 0 : 600);
        setVong(null);
        setNoi('');
        setHien(false);
        setDangBam(false);
        choNguoiBam.current = false;
        dangChayRef.current = false;
        setDangChay(false);
      }
    },
    [choDich, diToi, navigate],
  );

  const giaTri = useMemo(() => ({ chay, dung, dangChay }), [chay, dung, dangChay]);
  const bongBongBenTrai = vi.x > window.innerWidth - 320;

  return (
    <Ctx.Provider value={giaTri}>
      {children}
      <AnimatePresence>
        {hien && vong && (
          <motion.div
            key="vong"
            aria-hidden
            className="pointer-events-none fixed z-[70] rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, left: vong.left - 4, top: vong.top - 4, width: vong.width + 8, height: vong.height + 8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'fixed' }}
          />
        )}
        {hien && (
          <motion.div
            key="meo"
            data-mimi-lop-phu
            className="pointer-events-none fixed left-0 top-0 z-[71]"
            initial={{ opacity: 0, x: vi.x, y: vi.y, scale: 0.6 }}
            animate={{ opacity: 1, x: vi.x, y: vi.y, scale: dangBam ? 0.85 : 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={
              giamChuyenDong.current ? { duration: 0 } : { type: 'spring', stiffness: 110, damping: 19, mass: 0.8 }
            }
          >
            <img
              src={dangBam ? meoBam : meoDi}
              alt=""
              draggable={false}
              className="select-none no-save drop-shadow-lg"
              style={{ width: CO_MEO, height: CO_MEO, objectFit: 'contain', transform: `scaleX(${quayTrai ? -1 : 1})` }}
            />
            {noi && (
              <div
                role="status"
                aria-live="polite"
                className={`pointer-events-auto absolute top-1 w-64 rounded-2xl border border-border bg-card p-3 text-[13px] leading-snug text-foreground shadow-lg ${
                  bongBongBenTrai ? 'right-14' : 'left-14'
                }`}
              >
                <p>{noi}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>MIMI đang làm hộ · Esc để dừng</span>
                  <button
                    type="button"
                    onClick={dung}
                    className="rounded-full border border-border px-2.5 py-0.5 font-medium text-foreground hover:bg-accent"
                  >
                    Dừng
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Ctx.Provider>
  );
}
