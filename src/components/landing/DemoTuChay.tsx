import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import meoDi from '@/assets/mimi/walk.png';
import meoBam from '@/assets/mimi/paw.png';
import { docSoTienBangChu } from '@/lib/soTienBangChu';

/**
 * "Xem MIMI làm việc" — bốn khung tự chạy, con trỏ mèo tự bấm.
 *
 * PHẢN CHIẾU APP, KHÔNG PHẢI APP. Mỗi khung dựng lại một màn hình có thật trong
 * MIMI (thẻ chờ duyệt, sổ chi phí, cảnh báo đổi số tài khoản) bằng dữ liệu ví dụ,
 * và ghi rõ "Minh hoạ". 28/09/2026: gỡ hai khung chức năng chưa chạy (phân loại sao kê, chi phí AI) —
 * chỉ minh hoạ thứ đang chạy thật.
 * Con trỏ dùng đúng hình mèo của "MIMI làm hộ" trong app.
 *
 * MÃ QR LÀ HOẠ TIẾT, KHÔNG QUÉT ĐƯỢC. Dựng VietQR thật từ số tài khoản ví dụ thì
 * người xem có thể quét và chuyển tiền cho một tài khoản có thật của người lạ.
 *
 * Chỉ chạy khi khung nằm trong màn hình, và đứng yên ở trạng thái cuối khi người
 * dùng bật giảm chuyển động.
 */

/** Chạy lần lượt các bước; `thoiGian[i]` là thời lượng bước i. Lặp lại. */
function useNhip(thoiGian: readonly number[], chay: boolean): number {
  const [buoc, setBuoc] = useState(0);
  useEffect(() => {
    if (!chay) return;
    let i = 0;
    let hen: ReturnType<typeof setTimeout>;
    const tiep = () => {
      setBuoc(i);
      const cho = thoiGian[i];
      i = (i + 1) % thoiGian.length;
      hen = setTimeout(tiep, cho);
    };
    tiep();
    return () => clearTimeout(hen);
  }, [chay, thoiGian]);
  return buoc;
}

/** Toạ độ tâm của `dich` tính trong `khung`; không có đích thì về góc dưới trái. */
function useViTri(khung: RefObject<HTMLElement>, dich: RefObject<HTMLElement> | null, phuThuoc: unknown) {
  const [vt, setVt] = useState({ x: 24, y: 300 });
  useEffect(() => {
    const k = khung.current;
    if (!k) return;
    const a = k.getBoundingClientRect();
    const d = dich?.current;
    if (!d) {
      setVt({ x: 28, y: a.height - 64 });
      return;
    }
    const b = d.getBoundingClientRect();
    setVt({ x: b.left - a.left + b.width / 2 - 10, y: b.top - a.top + b.height / 2 - 8 });
  }, [khung, dich, phuThuoc]);
  return vt;
}

function ConTro({ x, y, bam }: { x: number; y: number; bam: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 z-20"
      initial={false}
      animate={{ x, y, scale: bam ? 0.85 : 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.8 }}
    >
      <img src={bam ? meoBam : meoDi} alt="" draggable={false} className="h-9 w-9 select-none object-contain drop-shadow-md" />
    </motion.div>
  );
}

export function Khung({ khungRef, nen, nhan, children }: { khungRef: RefObject<HTMLDivElement>; nen: string; nhan: string; children: ReactNode }) {
  return (
    <div ref={khungRef} className={`relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl p-5 sm:p-8 ${nen}`}>
      <span className="absolute right-3 top-3 z-10 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {nhan}
      </span>
      {children}
    </div>
  );
}

export function Chip({ loai, children, chipRef }: { loai: 'cho' | 'duyet' | 'chi' | 'chan'; children: ReactNode; chipRef?: RefObject<HTMLSpanElement> }) {
  const lop = {
    cho: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    duyet: 'bg-primary/10 text-primary',
    chi: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    chan: 'bg-destructive/10 text-destructive',
  }[loai];
  return <span ref={chipRef} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${lop}`}>{children}</span>;
}

/** Hoạ tiết giống mã QR, cố ý không phải mã hợp lệ. */
function HoaTietQr() {
  const o = Array.from({ length: 81 }, (_, i) => ((i * 37 + 11) % 7) < 3);
  return (
    <svg viewBox="0 0 9 9" className="h-20 w-20 rounded bg-white p-1" aria-hidden shapeRendering="crispEdges">
      {o.map((den, i) => den && <rect key={i} x={i % 9} y={Math.floor(i / 9)} width="1" height="1" fill="#111" />)}
      {[[0, 0], [6, 0], [0, 6]].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <rect x={x} y={y} width="3" height="3" fill="#111" />
          <rect x={x + 0.5} y={y + 0.5} width="2" height="2" fill="#fff" />
          <rect x={x + 1} y={y + 1} width="1" height="1" fill="#111" />
        </g>
      ))}
    </svg>
  );
}

export function useCanh(thoiGian: readonly number[], buocTinh: number) {
  const khung = useRef<HTMLDivElement>(null);
  const trongKhung = useInView(khung, { amount: 0.35 });
  const giam = useReducedMotion();
  const chay = useNhip(thoiGian, trongKhung && !giam);
  return { khung, buoc: giam ? buocTinh : chay, coConTro: !giam };
}

/* ── 1. Duyệt khoản chi ─────────────────────────────────────────────── */
const NHIP_DUYET = [1500, 900, 1800, 2800] as const;

function CanhDuyet() {
  const { t } = useTranslation();
  const { khung, buoc, coConTro } = useCanh(NHIP_DUYET, 3);
  const nutDuyet = useRef<HTMLSpanElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const vt = useViTri(khung, buoc === 0 ? null : buoc === 1 ? nutDuyet : chip, buoc);

  return (
    <Khung khungRef={khung} nen="bg-secondary/60" nhan={t('app.demoTuChay.minhHoa')}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">agent-quang-cao</span>
          {buoc < 2 && <Chip loai="cho" chipRef={chip}>{t('app.demoTuChay.choDuyet')}</Chip>}
          {buoc === 2 && <Chip loai="duyet" chipRef={chip}>{t('app.demoTuChay.daDuyet')}</Chip>}
          {buoc === 3 && <Chip loai="chi" chipRef={chip}>{t('app.demoTuChay.daChi')}</Chip>}
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">4.500.000đ</p>
        <p className="text-[11px] text-muted-foreground">{t('app.demoTuChay.bangChu')} <span className="text-foreground">{docSoTienBangChu(4_500_000)}</span></p>
        <p className="mt-2 text-[13px] text-foreground">{t('app.demoTuChay.congTy')} <span className="text-muted-foreground">{t('app.demoTuChay.mb')}</span></p>
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">{t('app.demoTuChay.tren2tr')}</p>

        {buoc < 2 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="grid h-9 place-items-center rounded-lg border border-border text-[13px] text-foreground">{t('app.demoTuChay.tuChoi')}</span>
            <span ref={nutDuyet} className={`grid h-9 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-shadow ${buoc === 1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
              {t('app.demoTuChay.duyet')}
            </span>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
            <HoaTietQr />
            <div className="min-w-0 text-[11px]">
              <p className="text-muted-foreground">{t('app.demoTuChay.noiDungCk')}</p>
              <p className="font-mono font-semibold text-foreground">MIMI4KQ2P7</p>
              {buoc === 3 ? (
                <p className="mt-1 flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Check size={12} /> {t('app.demoTuChay.khop')}</p>
              ) : (
                <p className="mt-1 text-muted-foreground">{t('app.demoTuChay.traApp')}</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
      {coConTro && <ConTro x={vt.x} y={vt.y} bam={buoc === 2} />}
    </Khung>
  );
}

/* ── 3. Bắt đổi số tài khoản ────────────────────────────────────────── */
const NHIP_DOI_TK = [1400, 1300, 1000, 2800] as const;

function CanhDoiTaiKhoan() {
  const { t } = useTranslation();
  const { khung, buoc, coConTro } = useCanh(NHIP_DOI_TK, 3);
  const nutTuChoi = useRef<HTMLSpanElement>(null);
  const vt = useViTri(khung, buoc >= 2 ? nutTuChoi : null, buoc);

  return (
    <Khung khungRef={khung} nen="bg-destructive/5" nhan={t('app.demoTuChay.minhHoa')}>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">agent-nha-cung-cap</span>
          {buoc < 3 ? <Chip loai="cho">{t('app.demoTuChay.choDuyet')}</Chip> : <Chip loai="chan">{t('app.demoTuChay.daTuChoi')}</Chip>}
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">12.800.000đ</p>
        <p className="mt-2 text-[13px] text-foreground">{t('app.demoTuChay.congTy')} <span className="text-muted-foreground">{t('app.demoTuChay.vcb')}</span></p>

        {buoc >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[11px]">
            <p className="font-semibold text-destructive">{t('app.demoTuChay.doiTk')}</p>
            <p className="mt-0.5 text-muted-foreground">{t('app.demoTuChay.lanTruoc')}</p>
          </motion.div>
        )}

        {buoc < 3 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span ref={nutTuChoi} className={`grid h-9 place-items-center rounded-lg border border-border text-[13px] font-medium text-foreground ${buoc === 2 ? 'ring-2 ring-destructive ring-offset-2 ring-offset-card' : ''}`}>
              {t('app.demoTuChay.tuChoi')}
            </span>
            <span className="grid h-9 place-items-center rounded-lg bg-primary/50 text-[13px] font-semibold text-primary-foreground">{t('app.demoTuChay.duyet')}</span>
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-muted/60 p-2.5 font-mono text-[11px] text-muted-foreground">
            <Trans i18nKey="app.demoTuChay.aiBao" components={{ s: <span className="text-foreground" /> }} />
          </p>
        )}
      </div>
      {coConTro && <ConTro x={vt.x} y={vt.y} bam={buoc === 3} />}
    </Khung>
  );
}

// Tiêu đề và mô tả mỗi khung: app.demoTuChay.c1 / c2.
const CANH = [
  { Canh: CanhDuyet, k: 'c1' },
  { Canh: CanhDoiTaiKhoan, k: 'c2' },
];

export default function DemoTuChay() {
  const { t } = useTranslation();
  return (
    <section id="demo" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            {t('app.demoTuChay.tieuDe')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('app.demoTuChay.moTa')}
          </p>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-14 md:grid-cols-2">
          {CANH.map(({ Canh, k }) => (
            <article key={k}>
              <Canh />
              <h3 className="mt-6 font-display text-xl font-semibold text-foreground text-balance">{t(`app.demoTuChay.${k}.tieuDe`)}</h3>
              <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">{t(`app.demoTuChay.${k}.mo`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
