import { Check, Circle, ExternalLink, Hand, Loader2, ShieldAlert, X } from 'lucide-react';
import type { NhiemVuAgent } from '@/lib/goiDieuPhoi';
import { Trans, useTranslation } from 'react-i18next';

/**
 * Thẻ nhiệm vụ agent cloud trong luồng hội thoại (13/10/2026): agent nào, các bước, tóm tắt kết quả, nguồn URL.
 * `cho_duyet` → nút Duyệt / Huỷ (bước tác động bên ngoài chỉ chạy sau khi người dùng bấm). `ban_giao` → nói rõ người
 * dùng phải tự làm (OTP, đăng nhập, mã xác nhận) — agent không vượt.
 *
 * Tóm tắt là chữ thuần do máy chủ dựng từ nội dung trang (dữ liệu không đáng tin) — hiển thị như văn bản, không HTML.
 */

export function TheNhiemVuAgent({ cau, nv, dang, loi, onDuyet, onHuy, onChayTiep }: {
  cau: string;
  nv: NhiemVuAgent | null;
  dang: boolean;
  loi: string | null;
  onDuyet: (buoc: number) => void;
  onHuy: () => void;
  onChayTiep: () => void;
}) {
  const { t } = useTranslation();
  return (
    <section aria-label={t('ui1.agent.nhiemVu', { cau })} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">{nv ? nv.ten_agent : 'Agent'}</p>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {dang && <Loader2 size={13} className="animate-spin" />}
          {nv ? t(`ui1.agent.tt_${nv.trang_thai}`) : dang ? t('ui1.agent.lapKeHoach') : ''}
        </span>
      </header>

      {nv && (
        <ol className="flex flex-col gap-1">
          {nv.buoc.map((b) => (
            <li key={b.chi_so} className="flex items-start gap-2 text-muted-foreground">
              {b.xong ? <Check size={14} className="mt-0.5 shrink-0 text-mimi-green" />
                : nv.can_duyet?.buoc === b.chi_so ? <ShieldAlert size={14} className="mt-0.5 shrink-0 text-mimi-amber" />
                  : <Circle size={14} className="mt-0.5 shrink-0 opacity-40" />}
              <span className={b.xong ? 'text-foreground' : undefined}>{b.mo_ta}</span>
            </li>
          ))}
        </ol>
      )}

      {nv?.tom_tat && (
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t('ui1.agent.ketQua')}</p>
          <p className="whitespace-pre-line text-foreground">{nv.tom_tat}</p>
        </div>
      )}

      {nv && nv.nguon.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label={t('ui1.agent.nguon')}>
          {nv.nguon.map((n) => (
            <li key={n.url}>
              <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 break-all text-xs text-primary underline underline-offset-4">
                <ExternalLink size={12} /> {n.tieu_de || n.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {nv?.trang_thai === 'cho_duyet' && nv.can_duyet && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-mimi-amber/40 bg-mimi-amber/5 px-3 py-2">
          <span className="text-foreground"><Trans i18nKey="ui1.agent.canDuyet" values={{ buoc: nv.can_duyet.mo_ta }} components={{ b: <b /> }} /></span>
          <div className="flex gap-2">
            <button type="button" disabled={dang} data-mimi-khong-tu-bam="" onClick={() => onDuyet(nv.can_duyet!.buoc)}
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">{t('ui1.agent.duyet')}</button>
            <button type="button" disabled={dang} onClick={onHuy}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1 text-xs disabled:opacity-50"><X size={12} /> {t('ui1.agent.huy')}</button>
          </div>
        </div>
      )}

      {nv?.trang_thai === 'ban_giao' && (
        <p className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 text-foreground">
          <Hand size={14} className="mt-0.5 shrink-0" />
          <span>
            {t('ui1.agent.banGiao', { ly_do: nv.loi ?? t('ui1.agent.banGiaoMacDinh') })}
            {nv.url_hien_tai && <> <Trans i18nKey="ui1.agent.moTrangDo" components={{ a: <a href={nv.url_hien_tai} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4" /> }} /></>}
          </span>
        </p>
      )}

      {nv?.trang_thai === 'cho' && !dang && nv.buoc_tiep > 0 && (
        <button type="button" onClick={onChayTiep} className="self-start text-xs underline underline-offset-4">{t('ui1.agent.chayTiep')}</button>
      )}

      {(loi || (nv?.trang_thai !== 'ban_giao' && nv?.loi)) && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-foreground">{loi ?? nv?.loi}</p>
      )}

      {nv?.trang_thai === 'cho' && !dang && nv.buoc_tiep === 0 && nv.loi && (
        <button type="button" onClick={onChayTiep} className="self-start text-xs underline underline-offset-4">{t('ui1.agent.chayLai')}</button>
      )}
    </section>
  );
}
