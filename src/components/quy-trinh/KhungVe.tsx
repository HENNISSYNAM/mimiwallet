/**
 * Khung vẽ workflow kiểu n8n (22/11/2026): nền tối lưới chấm, thẻ bước, đường cong, ĐỐM SÁNG chạy dọc đường nối để
 * người xem hiểu dữ liệu đi từ bước nào sang bước nào.
 *   - Bản nháp: đốm chạy trên mọi đường (xem trước luồng).
 *   - Đang chạy: đốm chỉ chạy trên đường đang hoạt động (bước trước đã xong, bước sau chưa); bước chờ người nhấp nháy.
 *   - Người dùng bật "giảm chuyển động": không có đốm chạy, không nhấp nháy.
 * Vẽ bằng SVG + HTML, không thêm thư viện.
 */
import { useMemo } from 'react';
import { Check, Hand, Play, ShieldCheck, Unplug, User, X } from 'lucide-react';
import { AvatarMeo } from '@/components/agent/AvatarMeo';
import type { DoThiHien, LanChay, NutHien } from '@/lib/goiQuyTrinh';

export const RONG = 220, CAO = 84, CACH_X = 290, CACH_Y = 118, LE = 40;

/** Vị trí từng bước: cột = đường dài nhất từ bước đầu; trong cột xếp dọc, căn giữa. Thuần. */
export function boCuc(d: Pick<DoThiHien, 'nut' | 'canh'>): { vi_tri: Record<string, { x: number; y: number }>; rong: number; cao: number } {
  const cot: Record<string, number> = {};
  for (const n of d.nut) cot[n.id] = 0;
  for (let i = 0; i < d.nut.length; i++) for (const c of d.canh) cot[c.den] = Math.max(cot[c.den] ?? 0, (cot[c.tu] ?? 0) + 1);
  const theoCot = new Map<number, string[]>();
  for (const n of d.nut) theoCot.set(cot[n.id], [...(theoCot.get(cot[n.id]) ?? []), n.id]);
  const soDong = Math.max(1, ...[...theoCot.values()].map((v) => v.length));
  const vi_tri: Record<string, { x: number; y: number }> = {};
  for (const [c, ids] of theoCot) {
    const lech = ((soDong - ids.length) * CACH_Y) / 2;
    ids.forEach((id, i) => { vi_tri[id] = { x: LE + c * CACH_X, y: LE + lech + i * CACH_Y }; });
  }
  const soCot = Math.max(1, ...Object.values(cot).map((c) => c + 1));
  return { vi_tri, rong: LE * 2 + (soCot - 1) * CACH_X + RONG, cao: LE * 2 + (soDong - 1) * CACH_Y + CAO };
}

const MAU_LOAI = (n: NutHien) => (n.loai === 'kich_hoat' ? '#34d399' : n.loai === 'duyet' ? '#a78bfa' : n.lam === 'agent' ? (n.nhan === 'can_ket_noi' ? '#94a3b8' : '#22d3ee') : '#f59e0b');
const NHAN_PHU = (n: NutHien) => (n.loai === 'kich_hoat' ? 'Kích hoạt' : n.loai === 'duyet' ? (n.them_boi_luat ? 'Người duyệt · bắt buộc' : 'Người duyệt')
  : n.lam === 'agent' ? (n.nhan === 'can_ket_noi' ? 'Agent · cần kết nối' : 'Agent · tự động') : 'Người làm');

const giamChuyenDong = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function IconBuoc({ n }: { n: NutHien }) {
  if (n.loai === 'kich_hoat') return <Play size={18} />;
  if (n.loai === 'duyet') return <ShieldCheck size={18} />;
  if (n.lam === 'agent') return n.nhan === 'can_ket_noi' ? <Unplug size={18} /> : <AvatarMeo mau="#f59e0b" net="lam" co={24} ten="Agent" />;
  return <User size={18} />;
}

export function KhungVe({ d, chay, chon, onChon }: { d: DoThiHien; chay: LanChay | null; chon: string | null; onChon: (id: string) => void }) {
  const { vi_tri, rong, cao } = useMemo(() => boCuc(d), [d]);
  const tinh = giamChuyenDong();
  const tt = (id: string) => chay?.buoc[id]?.tt ?? null;

  return (
    <div className="relative h-full w-full overflow-auto rounded-2xl" data-testid="khung-ve"
      style={{ background: '#0b1020', backgroundImage: 'radial-gradient(rgba(148,163,184,0.18) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
      <div className="relative" style={{ width: rong, height: cao, minWidth: '100%' }}>
        <svg className="pointer-events-none absolute inset-0" width={rong} height={cao} aria-hidden>
          <defs>
            <filter id="phat-sang" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>
          {d.canh.map((c, i) => {
            const a = vi_tri[c.tu], b = vi_tri[c.den];
            if (!a || !b) return null;
            const x1 = a.x + RONG, y1 = a.y + CAO / 2, x2 = b.x, y2 = b.y + CAO / 2, k = (x2 - x1) / 2;
            const duong = `M${x1},${y1} C${x1 + k},${y1} ${x2 - k},${y2} ${x2},${y2}`;
            const xongTu = tt(c.tu) === 'xong', xongDen = tt(c.den) === 'xong';
            const hoatDong = chay ? xongTu && !xongDen : true;
            const mau = chay ? (xongTu && xongDen ? '#34d399' : hoatDong ? '#22d3ee' : '#334155') : '#475569';
            return (
              <g key={`${c.tu}-${c.den}`} data-testid={`canh-${c.tu}-${c.den}`} data-hoat-dong={hoatDong && !tinh ? '1' : '0'}>
                <path d={duong} fill="none" stroke={mau} strokeWidth={2} strokeOpacity={0.8} />
                {hoatDong && !tinh && [0, 1, 2].map((j) => (
                  <circle key={j} r={3.5} fill={chay ? '#67e8f9' : '#a5b4fc'} filter="url(#phat-sang)">
                    <animateMotion dur="2.4s" repeatCount="indefinite" begin={`${(j * 0.8 + i * 0.13).toFixed(2)}s`} path={duong} />
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
        {d.nut.map((n) => {
          const p = vi_tri[n.id];
          const t = tt(n.id);
          const mau = MAU_LOAI(n);
          const sang = t === 'can_nguoi' || chon === n.id;
          return (
            <button key={n.id} type="button" onClick={() => onChon(n.id)} data-testid={`nut-${n.id}`} data-tt={t ?? 'nhap'}
              aria-label={`${n.ten} — ${NHAN_PHU(n)}${t ? ` — ${t}` : ''}`} aria-pressed={chon === n.id}
              className={`absolute flex items-center gap-3 rounded-xl border px-3 text-left text-slate-100 transition ${t === 'can_nguoi' && !tinh ? 'animate-pulse' : ''}`}
              style={{
                left: p.x, top: p.y, width: RONG, height: CAO, background: 'rgba(15,23,42,0.92)',
                borderColor: t === 'chan' || t === 'tu_choi' ? '#f87171' : mau,
                boxShadow: sang ? `0 0 0 1px ${mau}, 0 0 22px ${mau}66` : `0 0 0 1px ${mau}33`,
              }}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${mau}22`, color: mau }}><IconBuoc n={n} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{n.ten}</span>
                <span className="block truncate text-[11px]" style={{ color: mau }}>{NHAN_PHU(n)}</span>
              </span>
              {t === 'xong' && <Check size={16} className="shrink-0 text-emerald-400" aria-hidden />}
              {t === 'can_nguoi' && <Hand size={16} className="shrink-0 text-amber-400" aria-hidden />}
              {(t === 'chan' || t === 'tu_choi') && <X size={16} className="shrink-0 text-red-400" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
