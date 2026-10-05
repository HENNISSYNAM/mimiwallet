import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Trans, useTranslation } from 'react-i18next';
import { ArrowDown, KeyRound, Lock, ShieldAlert } from 'lucide-react';
import { Chip, Khung, useCanh } from './DemoTuChay';

/**
 * "MIMI bảo vệ tiền của bạn thế nào" — hai khung tự chạy như một đoạn video ngắn.
 *
 * CHỈ DỰNG LẠI ĐIỀU ĐÃ CÓ TRONG MÃ, và nói đúng phạm vi của nó:
 *
 *   1. Dừng khoản đáng ngờ lúc bấm Duyệt — `tac-tu` trả 409 CAN_XAC_MINH khi khoản chi có dấu
 *      hiệu mức cao (`_shared/bat-thuong/phat-hien.ts`), giao diện mở hộp xác minh. Là bộ luật
 *      nói rõ từng lý do, không phải mô hình học máy, nên không gọi là "AI".
 *      MIMI KHÔNG chặn được lệnh chuyển trong app ngân hàng — câu dưới khung nói thẳng điều đó.
 *
 *   2. Mã hoá kháng lượng tử — `_shared/pqcCrypto.ts`: ML-KEM-768 (FIPS 203) đóng gói một khoá
 *      riêng cho từng bản ghi, HKDF-SHA256 dẫn ra khoá AES-256-GCM, AES-GCM mã hoá nội dung.
 *      Áp cho token ngân hàng và khoá quản trị AI — KHÔNG phải cho toàn bộ cơ sở dữ liệu, nên
 *      không được viết "mọi dữ liệu đều mã hoá lượng tử".
 *
 * Số tiền, tên công ty, số tài khoản, token đều là ví dụ; khung ghi "Minh hoạ".
 *
 * KHÔNG CÓ CON TRỎ MÈO. Người bấm Duyệt và "Chưa duyệt" ở đây là người dùng, và con trỏ mèo
 * MIMI không bao giờ bấm nút dính tới tiền — nên chỉ làm sáng nút đang được bấm.
 */

/** Thanh tiến độ như thanh thời gian của video: mỗi đoạn là một bước. */
function ThanhTienDo({ so, buoc }: { so: number; buoc: number }) {
  return (
    <div className="mt-3 flex gap-1" aria-hidden>
      {Array.from({ length: so }, (_, i) => (
        <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= buoc ? 'bg-primary' : 'bg-muted'}`} />
      ))}
    </div>
  );
}

/* ── 1. Dừng khoản đáng ngờ lúc bấm Duyệt ─────────────────────────────── */
const NHIP_DUNG = [2200, 1300, 3200, 3000] as const;

function CanhDungKhoan() {
  const { t } = useTranslation();
  const { khung, buoc } = useCanh(NHIP_DUNG, 3);

  return (
    <figure className="m-0">
      <Khung khungRef={khung} nen="bg-destructive/5" nhan={t('app.videoBaoMat.minhHoa')}>
        <div className="w-full max-w-sm">
          {buoc < 2 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{t('app.videoBaoMat.yc')}</span>
                <Chip loai="cho">{t('app.videoBaoMat.choDuyet')}</Chip>
              </div>
              <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">42.000.000đ</p>
              <p className="mt-1 text-[13px] text-foreground">{t('app.videoBaoMat.congTy')} <span className="text-muted-foreground">· ••••9999</span></p>
              <p className="mt-2 rounded-md bg-muted/60 px-2 py-1.5 text-[11px] italic text-muted-foreground">
                {t('app.videoBaoMat.loiNhan')}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="grid h-9 place-items-center rounded-lg border border-border text-[13px] text-foreground">{t('app.videoBaoMat.tuChoi')}</span>
                <span className={`grid h-9 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground ${buoc === 1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}>
                  {t('app.videoBaoMat.duyet')}
                </span>
              </div>
            </motion.div>
          )}

          {buoc === 2 && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border border-destructive/40 bg-card p-4 shadow-lg">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldAlert size={16} className="text-destructive" /> {t('app.videoBaoMat.dung')}
              </p>
              <div className="mt-2 rounded-md border border-border p-2.5 text-[12px] leading-relaxed text-foreground">
                <span className="mr-1.5 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">{t('app.videoBaoMat.mucCao')}</span>
                {t('app.videoBaoMat.doiTk')}
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <span className="mt-0.5 inline-block h-3 w-3 shrink-0 rounded-sm border border-border" />
                {t('app.videoBaoMat.daGoi')}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="grid h-9 place-items-center rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-card">{t('app.videoBaoMat.chuaDuyet')}</span>
                <span className="grid h-9 place-items-center rounded-lg bg-muted text-[12px] text-muted-foreground">{t('app.videoBaoMat.xacMinhVanDuyet')}</span>
              </div>
            </motion.div>
          )}

          {buoc === 3 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">Bao Bì Tân Phú · 42.000.000đ</span>
                <Chip loai="chan">{t('app.videoBaoMat.daTuChoi')}</Chip>
              </div>
              <p className="mt-2 text-[13px] text-foreground"><Trans i18nKey="app.videoBaoMat.goiSoCu" components={{ b: <b /> }} /></p>
              <p className="mt-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">{t('app.videoBaoMat.chuaDongNao')}</p>
            </motion.div>
          )}
          <ThanhTienDo so={NHIP_DUNG.length} buoc={buoc} />
        </div>
      </Khung>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{t('app.videoBaoMat.capBaoLa')}</span> {t('app.videoBaoMat.capBaoMo')}
      </figcaption>
    </figure>
  );
}

/* ── 2. Mã hoá kháng lượng tử cho token ngân hàng ──────────────────────── */
const NHIP_MA_HOA = [1800, 1700, 1700, 3200] as const;

function Buoc({ hien, children }: { hien: boolean; children: ReactNode }) {
  return (
    <motion.div initial={false} animate={{ opacity: hien ? 1 : 0.25 }} transition={{ duration: 0.4 }}>
      {children}
    </motion.div>
  );
}

function CanhMaHoa() {
  const { t } = useTranslation();
  const { khung, buoc } = useCanh(NHIP_MA_HOA, 3);
  return (
    <figure className="m-0">
      <Khung khungRef={khung} nen="bg-primary/5" nhan={t('app.videoBaoMat.minhHoa')}>
        <div className="w-full max-w-sm space-y-1.5 font-mono text-[11px]">
          <Buoc hien={buoc >= 0}>
            <div className="rounded-md border border-border bg-card p-2.5">
              <p className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground"><KeyRound size={12} /> {t('app.videoBaoMat.khoaVuaNhan')}</p>
              <p className="mt-1 truncate text-foreground">access_token: eyJhbGciOiJIUzI1NiJ9.vi-du…</p>
            </div>
          </Buoc>
          <ArrowDown size={14} className="mx-auto text-muted-foreground" aria-hidden />
          <Buoc hien={buoc >= 1}>
            <div className="rounded-md border border-primary/30 bg-card p-2.5 font-sans">
              <p className="text-[12px] font-semibold text-foreground">ML-KEM-768 <span className="font-normal text-muted-foreground">· FIPS 203</span></p>
              <p className="text-[11px] text-muted-foreground">{t('app.videoBaoMat.kem')}</p>
            </div>
          </Buoc>
          <ArrowDown size={14} className="mx-auto text-muted-foreground" aria-hidden />
          <Buoc hien={buoc >= 2}>
            <div className="rounded-md border border-primary/30 bg-card p-2.5 font-sans">
              <p className="text-[12px] font-semibold text-foreground">HKDF-SHA256 → AES-256-GCM</p>
              <p className="text-[11px] text-muted-foreground">{t('app.videoBaoMat.maHoaNd')}</p>
            </div>
          </Buoc>
          <ArrowDown size={14} className="mx-auto text-muted-foreground" aria-hidden />
          <Buoc hien={buoc >= 3}>
            <div className="rounded-md border border-border bg-card p-2.5">
              <p className="flex items-center gap-1.5 font-sans text-[11px] text-muted-foreground"><Lock size={12} /> {t('app.videoBaoMat.thatSu')}</p>
              <p className="mt-1 break-all text-foreground">{'{ v: 1, kemCipherText: "q8Zf…", iv: "3kPa…", aesCipherText: "Hn0x…" }'}</p>
            </div>
          </Buoc>
          <ThanhTienDo so={NHIP_MA_HOA.length} buoc={buoc} />
        </div>
      </Khung>
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{t('app.videoBaoMat.maHoaTd')}</span> {t('app.videoBaoMat.maHoaMo')}
      </figcaption>
    </figure>
  );
}

export default function VideoBaoMat() {
  const { t } = useTranslation();
  return (
    <section id="bao-mat" aria-labelledby="bao-mat-tieu-de" className="bg-background py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{t('app.videoBaoMat.baoMat')}</span>
          <h2 id="bao-mat-tieu-de" className="mt-4 font-display font-extrabold tracking-tight text-foreground" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)' }}>
            {t('app.videoBaoMat.tieuDe')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('app.videoBaoMat.moTa')}
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <CanhDungKhoan />
          <CanhMaHoa />
        </div>
      </div>
    </section>
  );
}
