import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Clock, FileSearch, Landmark, QrCode, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react';
import { Chip, Khung, useCanh } from './DemoTuChay';

/**
 * "Mỗi bước của agent đều để lại dấu vết" — hai khung.
 *
 * TRÁI — NHẬT KÝ (CÓ THẬT). Từng dòng hiện dần theo đúng vòng mà
 * `_shared/tac-tu/cong-tac-tu.ts` chạy: xin chi → đối chiếu hạn mức → người nhận
 * → ngưỡng duyệt → người duyệt → lệnh trả → sao kê. Mã `TREN_NGUONG_DUYET` là mã
 * thật của bộ luật; số liệu là ví dụ.
 *
 * PHẢI — SOẠN LUẬT TỪ VĂN BẢN (ĐANG XÂY, S4). Ghi nhãn "Đang xây" trên khung và
 * trong câu mô tả, vì chức năng này chưa có trong app.
 */

interface DongNhatKy {
  icon: LucideIcon;
  chu: string;
  chip?: { loai: 'cho' | 'duyet' | 'chi'; chu: string };
}

const DONG: DongNhatKy[] = [
  { icon: FileSearch, chu: 'ui2.nhatKy.d0' },
  { icon: ShieldCheck, chu: 'ui2.nhatKy.d1' },
  { icon: Check, chu: 'ui2.nhatKy.d2' },
  { icon: Clock, chu: 'ui2.nhatKy.d3', chip: { loai: 'cho', chu: 'ui2.nhatKy.choDuyet' } },
  { icon: UserCheck, chu: 'ui2.nhatKy.d4', chip: { loai: 'duyet', chu: 'ui2.nhatKy.daDuyet' } },
  { icon: QrCode, chu: 'ui2.nhatKy.d5', chip: { loai: 'duyet', chu: 'ui2.nhatKy.maTraTien' } },
  { icon: Landmark, chu: 'ui2.nhatKy.d6', chip: { loai: 'chi', chu: 'ui2.nhatKy.daChi' } },
];
const NHIP_NHAT_KY = [700, 1000, 1000, 1000, 1300, 1100, 1000, 3200] as const;

function KhungNhatKy() {
  const { t } = useTranslation();
  const { khung, buoc } = useCanh(NHIP_NHAT_KY, DONG.length);

  return (
    <Khung khungRef={khung} nen="bg-secondary/60" nhan={t('ui2.nhatKy.minhHoa')}>
      {/* Hai thẻ mờ phía sau: bối cảnh mà nhật ký đang đọc tới. */}
      <div aria-hidden className="pointer-events-none absolute left-4 top-12 hidden w-44 rounded-lg border border-border bg-card p-3 opacity-40 xl:block">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('ui2.nhatKy.chinhSach')}</p>
        {[t('ui2.nhatKy.moiLan'), t('ui2.nhatKy.moiNgay'), t('ui2.nhatKy.canDuyetTu')].map((d) => (
          <p key={d} className="mt-1.5 font-mono text-[10px] text-foreground">{d}</p>
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute bottom-10 right-4 hidden w-44 rounded-lg border border-border bg-card p-3 opacity-40 xl:block">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{t('ui2.nhatKy.saoKeMb')}</p>
        {['− 4.500.000 · MIMI4KQ2P7', '− 520.000 · API AI', `+ 12.000.000 · ${t('ui2.nhatKy.khachTra')}`].map((d) => (
          <p key={d} className="mt-1.5 font-mono text-[10px] text-foreground">{d}</p>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md rounded-lg border border-primary/30 bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <p className="text-[13px] font-semibold text-foreground">{t('ui2.nhatKy.nhatKyAgent')}</p>
          <span className="text-[10px] text-muted-foreground">{t('ui2.nhatKy.khongSua')}</span>
        </div>
        <ol className="mt-3 grid min-h-[280px] content-start gap-2.5">
          {DONG.slice(0, buoc).map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.li key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 text-[12.5px] leading-snug text-foreground">
                <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  {t(d.chu)}
                  {d.chip && (
                    <span className="mt-1 block">
                      <Chip loai={d.chip.loai}>{t(d.chip.chu)}</Chip>
                    </span>
                  )}
                </span>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Khung>
  );
}

export default function NhatKyAgent() {
  const { t } = useTranslation();
  return (
    <section id="nhat-ky" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            {t('ui2.nhatKy.tieuDe')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {t('ui2.nhatKy.moTa')}
          </p>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-14 lg:grid-cols-2">
          <article>
            <KhungNhatKy />
            <h3 className="mt-6 font-display text-xl font-semibold text-foreground text-balance">{t('ui2.nhatKy.lyDo')}</h3>
            <p className="mt-2 max-w-lg leading-relaxed text-muted-foreground">
              {t('ui2.nhatKy.lyDoMo')}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
