import { AlertTriangle, CheckCircle2, CircleDashed, Recycle } from 'lucide-react';
import type { DanAgent } from '@/lib/troLy';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';

/**
 * Báo cáo một lần chạy của đàn agent (`TraLoi.dan_agent`). Dùng chung cho Trợ lý MIMI, Tổng quan và pet.
 *
 * Chỉ vẽ đúng thứ máy chủ trả: agent nào THẬT SỰ chạy, agent nào lỗi, bao nhiêu lượt mô hình, giới hạn
 * gì. Không có agent nào "đang nghĩ" giả; không có số nào tự bịa ra khi máy chủ không gửi.
 */
/* Trạng thái lượt chạy — khoá `ui2.danAgent.tt.<trạng thái>`. */
const giay = (ms: number) => i18n.t('ui2.danAgent.giay', { so: (ms / 1000).toLocaleString(i18n.language, { maximumFractionDigits: 1 }) });

function NhanTacVu({ tt }: { tt: DanAgent['tac_vu'][number]['trang_thai'] }) {
  const { t } = useTranslation();
  if (tt === 'hoan_tat') return <span className="inline-flex items-center gap-1 text-xs text-mimi-green"><CheckCircle2 size={13} /> {t('ui2.danAgent.tt.hoan_tat')}</span>;
  if (tt === 'loi') return <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle size={13} /> {t('ui2.danAgent.loi')}</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-mimi-amber"><CircleDashed size={13} /> {t('ui2.danAgent.canBoSung')}</span>;
}

export function DanAgentBaoCao({ dan, gon = false }: { dan: DanAgent; gon?: boolean }) {
  const { t } = useTranslation();
  const tn = dan.tai_nguyen;
  return (
    <section aria-label={t('ui2.danAgent.daChay')} className="rounded-xl border border-border bg-card/60 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">{t('ui2.danAgent.daChay')}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${dan.trang_thai === 'hoan_tat' ? 'bg-mimi-green/10 text-mimi-green' : 'bg-mimi-amber/15 text-mimi-amber'}`}>
          {t(`ui2.danAgent.tt.${dan.trang_thai}`)}
        </span>
      </div>

      {!gon && (
        <ul className="mt-3 divide-y divide-border/60">
          {dan.tac_vu.map((tv, i) => (
            <li key={`${tv.agent_id}-${tv.nang_luc}-${i}`} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground">{tv.ten}</span>
                <span className="flex items-center gap-3">
                  {tv.tai_su_dung && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Recycle size={12} /> {t('ui2.danAgent.dungLai')}</span>}
                  <span className="text-xs tabular-nums text-muted-foreground">{giay(tv.thoi_gian_ms)}</span>
                  <NhanTacVu tt={tv.trang_thai} />
                </span>
              </div>
              {tv.cau && <p className="mt-0.5 text-xs text-muted-foreground">{tv.cau}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground" aria-label={t('ui2.danAgent.taiNguyen')}>
        {t('ui2.danAgent.thongKe', { agent: tn.so_agent, tacVu: tn.so_tac_vu, nguon: tn.so_nguon_doc })} ·{' '}
        {tn.so_luot_mo_hinh > 0 ? t('ui2.danAgent.luotMoHinh', { so: tn.so_luot_mo_hinh }) : t('ui2.danAgent.khongMoHinh')}
        {tn.so_luot_tai_su_dung > 0 && ` · ${t('ui2.danAgent.dungLaiSo', { so: tn.so_luot_tai_su_dung })}`} · {t('ui2.danAgent.toiDa', { so: tn.gioi_han_song_song })}
      </p>

      {dan.gioi_han.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground" aria-label={t('ui2.danAgent.gioiHan')}>
          {dan.gioi_han.map((g) => <li key={g}>{g}</li>)}
        </ul>
      )}

      <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        {t('ui2.danAgent.banNhap')}
      </p>
    </section>
  );
}
