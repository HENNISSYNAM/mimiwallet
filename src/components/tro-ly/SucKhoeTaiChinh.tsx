import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { SucKhoeTaiChinh as SucKhoe } from '../../../supabase/functions/_shared/tro-ly/kieu.ts';

/**
 * Sức khoẻ tài chính — một nút nhỏ trên thanh công cụ của ô hỏi, kiểu chỉ báo hạn mức của Claude: không chiếm chỗ,
 * bấm mới mở. Số do máy chủ tính (`tai-chinh/diem-san-sang.ts`); giao diện chỉ viết câu theo ngôn ngữ.
 * KHÔNG gọi là điểm tín dụng ở bất cứ đâu: chỉ chủ doanh nghiệp xem, MIMI không gửi điểm cho ai.
 */

const MAU_MUC = { vung: '#1E7A4F', kha: '#B7791F', can_cai_thien: '#B4532A' } as const;

function Vong({ diem, mau, kich = 16 }: { diem: number; mau: string; kich?: number }) {
  const r = kich / 2 - 2;
  const chu = 2 * Math.PI * r;
  return (
    <svg width={kich} height={kich} viewBox={`0 0 ${kich} ${kich}`} aria-hidden className="-rotate-90">
      <circle cx={kich / 2} cy={kich / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={kich > 30 ? 5 : 2.5} />
      <circle cx={kich / 2} cy={kich / 2} r={r} fill="none" stroke={mau} strokeWidth={kich > 30 ? 5 : 2.5} strokeLinecap="round"
        strokeDasharray={`${(chu * Math.max(0, Math.min(100, diem))) / 100} ${chu}`} />
    </svg>
  );
}

export function SucKhoeTaiChinh({ sk, onHoi }: { sk: SucKhoe | undefined; onHoi: (cau: string) => void }) {
  const { t } = useTranslation();
  if (!sk) return null;
  const mau = sk.co_diem && sk.muc ? MAU_MUC[sk.muc] : '#8A94A6';
  const pt = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={sk.co_diem ? t('man.troLy.sk.nhanNut', { diem: sk.diem }) : t('man.troLy.sk.ten')}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 hover:bg-white/90 hover:text-foreground dark:hover:bg-white/10"
        >
          <Vong diem={sk.co_diem ? sk.diem ?? 0 : 0} mau={mau} />
          <span className="hidden sm:inline">{t('man.troLy.sk.tenNgan')}</span>
          {sk.co_diem && <span className="tabular-nums font-medium text-foreground">{sk.diem}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('man.troLy.sk.ten')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('man.troLy.sk.phu')}</p>
        {sk.co_diem && sk.yeu_to ? (
          <>
            <div className="mt-3 flex items-center gap-3">
              <span className="relative inline-flex">
                <Vong diem={sk.diem ?? 0} mau={mau} kich={52} />
                <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums text-foreground">{sk.diem}</span>
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: mau }}>{t(`man.troLy.sk.muc.${sk.muc}`)}</p>
                <p className="text-xs text-muted-foreground">{t('man.troLy.sk.tinhTren', { so: sk.so_thang })}</p>
              </div>
            </div>
            <ul className="mt-3 space-y-2.5" aria-label={t('man.troLy.sk.yeuTo')}>
              {sk.yeu_to.map((y) => (
                <li key={y.khoa}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{t(`man.troLy.sk.ten_${y.khoa}`)}</span>
                    <span className="tabular-nums text-muted-foreground">{y.diem}/{y.toi_da}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${(100 * y.diem) / y.toi_da}%`, background: mau }} />
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {y.khoa === 'lich_su' ? t('man.troLy.sk.do_lich_su', { so: y.so ?? 0 }) : t(`man.troLy.sk.do_${y.khoa}`, { x: pt(y.so) })}
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-3 text-sm text-foreground">{t('man.troLy.sk.chuaDu', { so: sk.so_thang })}</p>
        )}
        <button
          type="button"
          onClick={() => onHoi(t('man.troLy.sk.cauHoi'))}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-foreground hover:bg-accent"
        >
          {t('man.troLy.sk.hoiChiTiet')} <ChevronRight size={15} className="text-muted-foreground" aria-hidden />
        </button>
        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">{t('man.troLy.sk.luuY')}</p>
      </PopoverContent>
    </Popover>
  );
}
