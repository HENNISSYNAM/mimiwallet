import { Leaf } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ChiSoCarbon } from '../../../supabase/functions/_shared/carbon/uoc-tinh.ts';

/**
 * Dấu chân carbon — một chỉ báo nhỏ cạnh Sức khoẻ tài chính, kiểu chiếc lá "tuyến ít phát thải" của Google Maps:
 * không phải một tính năng phải mở, chỉ là con số chạy ngầm trên chính các khoản chi. Số do máy chủ ước tính
 * (`carbon/uoc-tinh.ts`); không có khoản chi nào thì không hiện gì.
 */

const MAU_LA = '#2F855A';

export function DauChanCarbon({ c }: { c: ChiSoCarbon | undefined }) {
  const { t, i18n } = useTranslation();
  if (!c?.co_so_lieu) return null;
  const so = (x: number, chu = 1) => x.toLocaleString(i18n.language, { maximumFractionDigits: chu });
  const nhan = (kg: number) => (kg >= 1000 ? `${so(kg / 1000)} t` : `${so(kg, 0)} kg`);
  const doi = c.kg_moi_trieu !== null && c.kg_moi_trieu_thang_truoc
    ? (c.kg_moi_trieu - c.kg_moi_trieu_thang_truoc) / c.kg_moi_trieu_thang_truoc : null;
  const toiDa = Math.max(1, ...c.nhom.map((n) => n.kg));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('man.troLy.co2.nhanNut', { so: `${nhan(c.kg_thang_nay)} CO₂e` })}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 hover:bg-white/90 hover:text-foreground dark:hover:bg-white/10"
        >
          <Leaf size={14} style={{ color: MAU_LA }} aria-hidden />
          {c.kg_thang_nay > 0 && <span className="tabular-nums">{nhan(c.kg_thang_nay)}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('man.troLy.co2.ten')}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t('man.troLy.co2.phu')}</p>
        {c.nhom.length ? (
          <>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums text-foreground">{nhan(c.kg_thang_nay)}</span>
              <span className="text-xs text-muted-foreground">CO₂e · {t('man.troLy.co2.thangNay')}</span>
            </div>
            {c.kg_moi_trieu !== null && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('man.troLy.co2.cuongDo', { so: so(c.kg_moi_trieu) })}
                {doi !== null && Math.abs(doi) >= 0.01 && (
                  <span className="ml-1 font-medium" style={{ color: doi < 0 ? MAU_LA : '#B4532A' }}>
                    · {t('man.troLy.co2.soVoiTruoc', { x: `${doi < 0 ? '↓' : '↑'} ${Math.round(Math.abs(doi) * 100)}%` })}
                  </span>
                )}
              </p>
            )}
            <ul className="mt-3 space-y-2" aria-label={t('man.troLy.co2.ten')}>
              {c.nhom.slice(0, 5).map((n) => (
                <li key={n.khoa}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{t(`man.troLy.co2.nhom.${n.khoa}`)}</span>
                    <span className="tabular-nums text-muted-foreground">{nhan(n.kg)}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${(100 * n.kg) / toiDa}%`, background: MAU_LA }} />
                  </div>
                </li>
              ))}
            </ul>
            {c.ty_le_phu !== null && (
              <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
                {t('man.troLy.co2.phu_lieu', { x: `${Math.round(c.ty_le_phu * 100)}%` })}
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-foreground">{t('man.troLy.co2.chuaCo')}</p>
        )}
        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-snug text-muted-foreground">{t('man.troLy.co2.luuY')}</p>
      </PopoverContent>
    </Popover>
  );
}
