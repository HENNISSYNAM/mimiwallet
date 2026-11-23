/**
 * Khung vẽ workflow (22/11/2026, bản 2) — học trình sửa workflow của ClickUp: nền trắng lưới chấm, chạy TỪ TRÊN XUỐNG,
 * rẽ nhánh có nhãn ("Đạt" / "Cần sửa"), thẻ bước gọn có điểm nối. Bước agent mang hình con mèo đảm nhận nó.
 * Đốm nhỏ chạy dọc đường nối để thấy luồng; không phát sáng, không nhấp nháy (ưu tiên mượt). "Giảm chuyển động" → đứng yên.
 * Nút "+" dưới mỗi bước chèn bước mới ngay tại chỗ — không mở trang khác.
 */
import { useMemo } from 'react';
import { Check, Hand, Play, Plus, ShieldCheck, Unplug, User, X, MinusCircle } from 'lucide-react';
import { Meo } from '@/components/agent/AvatarMeo';
import type { DoThiHien, LanChay, NutHien } from '@/lib/goiQuyTrinh';

export const RONG = 248, CAO = 64, CACH_X = 280, CACH_Y = 118, LE = 32;
const TEN_NHANH: Record<string, string> = { dat: 'Đạt', can_sua: 'Cần sửa' };
const TEN_MEO: Record<string, string> = {
  phan_loai: 'Mèo Phân loại', thue: 'Mèo Thuế', dong_tien: 'Mèo Dòng tiền', ho_so: 'Mèo Hồ sơ', bao_ve: 'Mèo Bảo vệ', doi_soat: 'Mèo Đối soát',
  cong_no: 'Mèo Công nợ', mua_hang: 'Mèo Mua hàng', luong: 'Mèo Lương', tuan_thu: 'Mèo Tuân thủ', bao_cao: 'Mèo Báo cáo', thu_ky: 'Mèo Thư ký',
};
export const tenMeo = (k?: string) => (k ? TEN_MEO[k] ?? 'Mèo agent' : 'Mèo agent');

/** Vị trí: hàng = đường dài nhất từ bước đầu (trên xuống); các bước cùng hàng xếp ngang, căn giữa. Thuần. */
export function boCuc(d: Pick<DoThiHien, 'nut' | 'canh'>): { vi_tri: Record<string, { x: number; y: number }>; rong: number; cao: number } {
  const hang: Record<string, number> = {};
  for (const n of d.nut) hang[n.id] = 0;
  for (let i = 0; i < d.nut.length; i++) for (const c of d.canh) hang[c.den] = Math.max(hang[c.den] ?? 0, (hang[c.tu] ?? 0) + 1);
  const theoHang = new Map<number, string[]>();
  for (const n of d.nut) theoHang.set(hang[n.id], [...(theoHang.get(hang[n.id]) ?? []), n.id]);
  const soCot = Math.max(1, ...[...theoHang.values()].map((v) => v.length));
  const vi_tri: Record<string, { x: number; y: number }> = {};
  for (const [h, ids] of theoHang) {
    const lech = ((soCot - ids.length) * CACH_X) / 2;
    ids.forEach((id, i) => { vi_tri[id] = { x: LE + lech + i * CACH_X, y: LE + h * CACH_Y }; });
  }
  const soHang = Math.max(1, ...Object.values(hang).map((h) => h + 1));
  return { vi_tri, rong: LE * 2 + (soCot - 1) * CACH_X + RONG, cao: LE * 2 + (soHang - 1) * CACH_Y + CAO + 24 };
}

const giamChuyenDong = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function nhanPhu(n: NutHien): string {
  if (n.loai === 'kich_hoat') return 'Kích hoạt';
  if (n.loai === 'duyet') return n.them_boi_luat ? 'Người duyệt · bắt buộc' : `Người duyệt${n.vai_tro ? ` · ${n.vai_tro}` : ''}`;
  if (n.lam === 'agent') return n.nhan === 'can_ket_noi' ? `${tenMeo(n.meo)} · cần kết nối` : tenMeo(n.meo);
  return `Người làm${n.vai_tro ? ` · ${n.vai_tro}` : ''}`;
}

function Bieu({ n }: { n: NutHien }) {
  if (n.loai === 'kich_hoat') return <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><Play size={16} /></span>;
  if (n.loai === 'duyet') return <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck size={16} /></span>;
  if (n.lam === 'agent') return n.nhan === 'can_ket_noi'
    ? <span className="relative"><Meo khoa={n.meo ?? 'phan_loai'} co={32} ten={tenMeo(n.meo)} /><Unplug size={12} className="absolute -bottom-1 -right-1 rounded-full bg-white text-amber-600" /></span>
    : <Meo khoa={n.meo ?? 'phan_loai'} co={32} ten={tenMeo(n.meo)} />;
  return <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><User size={16} /></span>;
}

export function KhungVe({ d, chay, chon, onChon, onThem, choSua = true }: {
  d: DoThiHien; chay: LanChay | null; chon: string | null; onChon: (id: string) => void; onThem?: (sauId: string) => void; choSua?: boolean;
}) {
  const { vi_tri, rong, cao } = useMemo(() => boCuc(d), [d]);
  const tinh = giamChuyenDong();
  const tt = (id: string) => chay?.buoc[id]?.tt ?? null;

  return (
    <div className="relative h-full w-full overflow-auto rounded-2xl border bg-[#fafafa] dark:bg-neutral-950" data-testid="khung-ve"
      style={{ backgroundImage: 'radial-gradient(rgba(100,116,139,0.22) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      <div className="relative mx-auto" style={{ width: rong, height: cao }}>
        <svg className="pointer-events-none absolute inset-0" width={rong} height={cao} aria-hidden>
          {d.canh.map((c, i) => {
            const a = vi_tri[c.tu], b = vi_tri[c.den];
            if (!a || !b) return null;
            const x1 = a.x + RONG / 2, y1 = a.y + CAO, x2 = b.x + RONG / 2, y2 = b.y, giua = (y1 + y2) / 2;
            const duong = x1 === x2 ? `M${x1},${y1} L${x2},${y2}` : `M${x1},${y1} L${x1},${giua} L${x2},${giua} L${x2},${y2}`;
            const xongTu = tt(c.tu) === 'xong', boQua = tt(c.den) === 'bo_qua';
            const hoatDong = chay ? xongTu && !['xong', 'bo_qua'].includes(tt(c.den) ?? '') : true;
            const mau = boQua ? '#cbd5e1' : chay && xongTu && tt(c.den) === 'xong' ? '#10b981' : '#94a3b8';
            return (
              <g key={`${c.tu}-${c.den}`} data-testid={`canh-${c.tu}-${c.den}`} data-hoat-dong={hoatDong && !tinh && !boQua ? '1' : '0'}>
                <path d={duong} fill="none" stroke={mau} strokeWidth={1.5} strokeDasharray={boQua ? '4 4' : undefined} />
                <circle cx={x1} cy={y1} r={3} fill="white" stroke="#3b82f6" strokeWidth={1.5} />
                <circle cx={x2} cy={y2} r={3} fill="white" stroke="#3b82f6" strokeWidth={1.5} />
                {hoatDong && !tinh && !boQua && [0, 1].map((j) => (
                  <circle key={j} r={2.5} fill="#3b82f6">
                    <animateMotion dur="2s" repeatCount="indefinite" begin={`${(j + i * 0.15).toFixed(2)}s`} path={duong} />
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
        {d.canh.filter((c) => c.nhanh).map((c) => {
          const b = vi_tri[c.den];
          return b && <span key={`n-${c.tu}-${c.den}`} className="absolute rounded-md border bg-white px-2 py-0.5 text-[11px] text-slate-600 dark:bg-neutral-900"
            style={{ left: b.x + RONG / 2 - 30, top: b.y - 26 }}>{TEN_NHANH[c.nhanh!]}</span>;
        })}
        {d.nut.map((n) => {
          const p = vi_tri[n.id];
          const t = tt(n.id);
          return (
            <div key={n.id} className="group absolute" style={{ left: p.x, top: p.y, width: RONG }}>
              <button type="button" onClick={() => onChon(n.id)} data-testid={`nut-${n.id}`} data-tt={t ?? 'nhap'}
                aria-label={`${n.ten} — ${nhanPhu(n)}${t ? ` — ${t}` : ''}`} aria-pressed={chon === n.id}
                className={`flex w-full items-center gap-3 rounded-xl border bg-white px-3 text-left transition-colors duration-150 hover:border-slate-300 dark:bg-neutral-900 ${chon === n.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-neutral-800'} ${t === 'bo_qua' ? 'opacity-50' : ''}`}
                style={{ height: CAO }}>
                <Bieu n={n} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-slate-100">{n.ten}</span>
                  <span className={`block truncate text-[11px] ${n.nhan === 'can_ket_noi' ? 'text-amber-600' : 'text-slate-500'}`}>{nhanPhu(n)}</span>
                </span>
                {t === 'xong' && <Check size={16} className="shrink-0 text-emerald-500" aria-hidden />}
                {t === 'can_nguoi' && <Hand size={16} className="shrink-0 text-amber-500" aria-hidden />}
                {(t === 'chan' || t === 'tu_choi') && <X size={16} className="shrink-0 text-red-500" aria-hidden />}
                {t === 'bo_qua' && <MinusCircle size={16} className="shrink-0 text-slate-400" aria-hidden />}
              </button>
              {choSua && onThem && !n.them_boi_luat && (
                <button type="button" onClick={() => onThem(n.id)} aria-label={`Thêm bước sau "${n.ten}"`}
                  className="absolute left-1/2 top-full mt-5 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border bg-white text-slate-500 opacity-70 transition-opacity hover:text-blue-600 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100 dark:bg-neutral-900">
                  <Plus size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
