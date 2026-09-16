import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import meoDi from '@/assets/mimi/walk.png';
import meoBam from '@/assets/mimi/paw.png';
import { docSoTienBangChu } from '@/lib/soTienBangChu';

/**
 * "Xem MIMI làm việc" — bốn khung tự chạy, con trỏ mèo tự bấm.
 *
 * PHẢN CHIẾU APP, KHÔNG PHẢI APP. Mỗi khung dựng lại một màn hình có thật trong
 * MIMI (thẻ chờ duyệt, sổ chi phí, cảnh báo đổi số tài khoản) bằng dữ liệu ví dụ,
 * và ghi rõ "Minh hoạ". Khung chi phí AI là chức năng đang xây nên ghi "Đang xây".
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
  const { khung, buoc, coConTro } = useCanh(NHIP_DUYET, 3);
  const nutDuyet = useRef<HTMLSpanElement>(null);
  const chip = useRef<HTMLSpanElement>(null);
  const vt = useViTri(khung, buoc === 0 ? null : buoc === 1 ? nutDuyet : chip, buoc);

  return (
    <Khung khungRef={khung} nen="bg-secondary/60" nhan="Minh hoạ">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">agent-quang-cao</span>
          {buoc < 2 && <Chip loai="cho" chipRef={chip}>Chờ duyệt</Chip>}
          {buoc === 2 && <Chip loai="duyet" chipRef={chip}>Đã duyệt · chờ trả</Chip>}
          {buoc === 3 && <Chip loai="chi" chipRef={chip}>Đã chi · sao kê xác nhận</Chip>}
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">4.500.000đ</p>
        <p className="text-[11px] text-muted-foreground">Bằng chữ: <span className="text-foreground">{docSoTienBangChu(4_500_000)}</span></p>
        <p className="mt-2 text-[13px] text-foreground">CÔNG TY TNHH ABC <span className="text-muted-foreground">· MB Bank · ••••6789</span></p>
        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">• Khoản trên 2.000.000đ phải có người duyệt.</p>

        {buoc < 2 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span className="grid h-9 place-items-center rounded-lg border border-border text-[13px] text-foreground">Từ chối</span>
            <span ref={nutDuyet} className={`grid h-9 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-shadow ${buoc === 1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
              Duyệt
            </span>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
            <HoaTietQr />
            <div className="min-w-0 text-[11px]">
              <p className="text-muted-foreground">Nội dung chuyển khoản</p>
              <p className="font-mono font-semibold text-foreground">MIMI4KQ2P7</p>
              {buoc === 3 ? (
                <p className="mt-1 flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Check size={12} /> Sao kê khớp mã tham chiếu</p>
              ) : (
                <p className="mt-1 text-muted-foreground">Trả trong app ngân hàng của bạn</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
      {coConTro && <ConTro x={vt.x} y={vt.y} bam={buoc === 2} />}
    </Khung>
  );
}

/* ── 2. Phân loại sao kê ────────────────────────────────────────────── */
const DONG_SAO_KE = [
  ['OPENAI API', 'Hạ tầng AI', '520.000'],
  ['Quảng cáo Facebook', 'Quảng cáo', '3.200.000'],
  ['Viettel IDC · máy chủ', 'Hạ tầng AI', '1.150.000'],
  ['Grab · đi gặp khách', 'Đi lại', '96.000'],
  ['In ấn ABC', 'Nhà cung cấp', '2.400.000'],
] as const;
const NHIP_PHAN_LOAI = [900, 900, 900, 900, 900, 2600] as const;

function CanhPhanLoai() {
  const { khung, buoc, coConTro } = useCanh(NHIP_PHAN_LOAI, 5);
  const o = useRef<Array<HTMLSpanElement | null>>([]);
  const dich = useRef<HTMLSpanElement | null>(null);
  dich.current = o.current[Math.min(buoc, DONG_SAO_KE.length - 1)] ?? null;
  const vt = useViTri(khung, dich, buoc);

  return (
    <Khung khungRef={khung} nen="bg-primary/5" nhan="Đang xây · minh hoạ">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[1.4fr_1fr_auto] border-b border-border bg-muted/50 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span>Sao kê · tiền ra</span><span>Nhóm chi</span><span className="text-right">Số tiền</span>
        </div>
        {DONG_SAO_KE.map(([ten, nhom, tien], i) => (
          <div key={ten} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-2 border-b border-border/60 px-3 py-2.5 last:border-b-0">
            <span className="truncate text-[13px] text-foreground">{ten}</span>
            <span ref={(el) => { o.current[i] = el; }} className="min-w-0">
              {i < buoc ? (
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-foreground"><Check size={12} className="text-emerald-600" />{nhom}</span>
              ) : (
                <span className={`block h-2.5 rounded-full ${i === buoc ? 'animate-pulse bg-primary/40' : 'bg-muted'}`} style={{ width: `${60 + ((i * 17) % 30)}%` }} />
              )}
            </span>
            <span className="text-right font-mono text-[12px] tabular-nums text-muted-foreground">{tien}</span>
          </div>
        ))}
      </div>
      {coConTro && buoc < DONG_SAO_KE.length && <ConTro x={vt.x} y={vt.y} bam={false} />}
    </Khung>
  );
}

/* ── 3. Bắt đổi số tài khoản ────────────────────────────────────────── */
const NHIP_DOI_TK = [1400, 1300, 1000, 2800] as const;

function CanhDoiTaiKhoan() {
  const { khung, buoc, coConTro } = useCanh(NHIP_DOI_TK, 3);
  const nutTuChoi = useRef<HTMLSpanElement>(null);
  const vt = useViTri(khung, buoc >= 2 ? nutTuChoi : null, buoc);

  return (
    <Khung khungRef={khung} nen="bg-destructive/5" nhan="Minh hoạ">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">agent-nha-cung-cap</span>
          {buoc < 3 ? <Chip loai="cho">Chờ duyệt</Chip> : <Chip loai="chan">Đã từ chối</Chip>}
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">12.800.000đ</p>
        <p className="mt-2 text-[13px] text-foreground">CÔNG TY TNHH ABC <span className="text-muted-foreground">· Vietcombank · ••••1188</span></p>

        {buoc >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-2.5 text-[11px]">
            <p className="font-semibold text-destructive">Số tài khoản khác lần trả trước cho cùng người nhận</p>
            <p className="mt-0.5 text-muted-foreground">Lần trước: MB Bank ••••6789. Gọi xác nhận qua số đã lưu trước khi duyệt.</p>
          </motion.div>
        )}

        {buoc < 3 ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <span ref={nutTuChoi} className={`grid h-9 place-items-center rounded-lg border border-border text-[13px] font-medium text-foreground ${buoc === 2 ? 'ring-2 ring-destructive ring-offset-2 ring-offset-card' : ''}`}>
              Từ chối
            </span>
            <span className="grid h-9 place-items-center rounded-lg bg-primary/50 text-[13px] font-semibold text-primary-foreground">Duyệt</span>
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-muted/60 p-2.5 font-mono text-[11px] text-muted-foreground">
            Agent nhận lý do: <span className="text-foreground">DOI_SO_TAI_KHOAN</span>
          </p>
        )}
      </div>
      {coConTro && <ConTro x={vt.x} y={vt.y} bam={buoc === 3} />}
    </Khung>
  );
}

/* ── 4. Chi phí AI (đang xây) ───────────────────────────────────────── */
const DU_AN_AI = [
  ['Chatbot chăm sóc khách', 58, '4.180.000đ'],
  ['Tóm tắt hợp đồng', 27, '1.940.000đ'],
  ['Viết nội dung quảng cáo', 15, '1.080.000đ'],
] as const;
const NHIP_AI = [700, 1400, 3200] as const;

function CanhChiPhiAi() {
  const { khung, buoc, coConTro } = useCanh(NHIP_AI, 2);
  const cotDau = useRef<HTMLSpanElement>(null);
  const vt = useViTri(khung, buoc === 2 ? cotDau : null, buoc);

  return (
    <Khung khungRef={khung} nen="bg-secondary/60" nhan="Đang xây · minh hoạ">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] text-muted-foreground">Chi phí AI tháng 9</p>
        <p className="font-mono text-2xl font-bold tabular-nums text-foreground">7.200.000đ</p>
        <div className="mt-4 grid gap-3">
          {DU_AN_AI.map(([ten, phanTram, tien], i) => (
            <div key={ten}>
              <div className="flex justify-between text-[12px]">
                <span className="text-foreground">{ten}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{tien}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <motion.span
                  ref={i === 0 ? cotDau : undefined}
                  className="block h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: buoc >= 1 ? `${phanTram}%` : '0%' }}
                  transition={{ duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className={`mt-4 rounded-lg p-2 text-[11px] ${buoc === 2 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-muted/60 text-muted-foreground'}`}>
          Ngân sách AI tháng: 8.000.000đ · đã dùng 90%
        </p>
      </div>
      {coConTro && <ConTro x={vt.x} y={vt.y} bam={false} />}
    </Khung>
  );
}

const CANH = [
  {
    Canh: CanhDuyet,
    tieuDe: 'Duyệt trong một chạm, tiền đi khi bạn trả.',
    mo: 'Agent gửi yêu cầu; bạn đọc số tiền bằng chữ và lý do rồi bấm Duyệt. Lệnh trả VietQR hiện ra, sao kê về thì tự thành "Đã chi".',
  },
  {
    Canh: CanhPhanLoai,
    tieuDe: 'Sao kê tự vào đúng nhóm chi.',
    // Chưa có code tự phân loại sao kê (sepay-map ghi category: null) — nên khung ghi "Đang xây".
    mo: 'Mỗi dòng tiền ra được xếp vào nhóm chi phí, để cuối kỳ có sẵn sổ chi phí kèm nguồn từng dòng. Chức năng đang xây.',
  },
  {
    Canh: CanhDoiTaiKhoan,
    tieuDe: 'Bắt được lúc "nhà cung cấp đổi số tài khoản".',
    mo: 'Cùng tên người nhận nhưng khác tài khoản lần trước, MIMI dừng lại và cảnh báo đỏ — kiểu lừa đảo chuyển khoản hay gặp nhất.',
  },
  {
    Canh: CanhChiPhiAi,
    tieuDe: 'Biết mỗi đồng chi cho AI đi vào đâu.',
    mo: 'Chi phí AI theo dự án, kèm ngân sách tháng và cảnh báo khi gần chạm. Chức năng đang xây.',
  },
];

export default function DemoTuChay() {
  return (
    <section id="demo" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            Xem MIMI làm việc
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Các khung dưới đây tự chạy lại những việc bạn làm trong app — bằng dữ liệu ví dụ.
          </p>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-14 md:grid-cols-2">
          {CANH.map(({ Canh, tieuDe, mo }) => (
            <article key={tieuDe}>
              <Canh />
              <h3 className="mt-6 font-display text-xl font-semibold text-foreground text-balance">{tieuDe}</h3>
              <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">{mo}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
