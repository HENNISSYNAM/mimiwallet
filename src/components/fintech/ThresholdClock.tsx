import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, AlertTriangle, Info, Check, ChevronDown, Scale } from 'lucide-react';
import i18n from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/useAuthStore';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/lib/env';
import { track } from '@/lib/track';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import { Coin, Chest } from '@/components/illustrations/GamifyObjects';
import { SHOW_LAW_TAB_EVENT } from '@/components/NewsAndLawPanel';
import { ChonCachTinhThue } from '@/components/fintech/ChonCachTinhThue';
import { dinhDangTien } from '@/lib/tien';
import { goiToKhai } from '@/lib/goiToKhai';
import { CauHoiNhanh } from '@/components/phan-hoi/CauHoiNhanh';
import { nhanDinhNguong, type TienMat } from '@/lib/nhanDinhNguong';

/**
 * The two revenue milestones a Vietnamese household business meets, and where
 * this one stands against them.
 *
 *   01 tỷ  From here up: VAT, PIT and e-invoices with a tax-authority code.
 *   3 tỷ   From here up: no more choice of method — tax on income only, at 17%.
 *
 * Both have been wrong on this screen before. The exemption line was once 1 tỷ
 * when the law said 500 triệu, then stayed at 500 triệu for four months after
 * Nghị định 141/2026/NĐ-CP moved it to 01 tỷ. The keys come from `tax-summary`;
 * a key this file does not know draws nothing rather than crashing, so the
 * screen survives a server deployed ahead of or behind the web app.
 *
 * Rules this component keeps:
 *
 * Every figure names the law it comes from. A number about tax with no source
 * is an opinion. The citation stays one tap away rather than gone, though —
 * see `LegalUpdates.tsx` for why "answer first, citation on tap" beats a wall
 * of grey legal text under every number.
 *
 * It shows nothing it cannot source. With no bank connection and no e-invoices
 * it says so and offers the way to connect, rather than drawing 0% of a bar —
 * which reads like a measurement.
 *
 * It is not a tax determination, and says that on screen rather than in a
 * footnote nobody opens.
 *
 * Crossing a milestone is never drawn as a win. `tax_exemption` crossed means a
 * new obligation to pay, not a reward — so the coin/chest motifs below sit only
 * on the revenue figure itself (money the business genuinely made) and never on
 * a "crossed" state. Gamifying a tax bill would be dishonest, not friendly.
 */

type MilestoneKey = 'tax_exemption' | 'profit_method_required';

interface Milestone {
  key: MilestoneKey;
  threshold: number;
  remaining: number;
  ratio: number;
  crossed: boolean;
}

interface Summary {
  year: number;
  basis: 'bank' | 'gdt';
  bankRevenue: number;
  gdtRevenue: number | null;
  gap: number | null;
  revenue: number;
  milestones: Milestone[];
  internalTransfersExcluded: number;
  needsReview: number;
  transactionsCounted: number;
  hasBankConnection: boolean;
  disclaimer: string;
  /* Từ 24/09/2026 — cùng nguồn với tờ khai nháp (`_shared/doanh-thu/so-lieu.ts`). Tuỳ chọn để bản
     máy chủ cũ vẫn hiện được. */
  unclassifiedAmount?: number;
  /* Từ 29/09/2026 — để không kết luận ngưỡng quá sớm (`lib/nhanDinhNguong.ts`). */
  suggestedExclusion?: { so_tien: number; so_khoan: number } | null;
  marketplacePayout?: { so_tien: number; so_khoan: number } | null;
  cashShare?: TienMat | null;
  unclassifiedCount?: number;
  excludedByPerson?: number;
  coverage?: number | null;
  notCovered?: string;
}

/**
 * What each milestone means, and the document that says so. `law` là tên văn bản pháp luật — GIỮ NGUYÊN tiếng Việt
 * (trích dẫn nguyên văn, dịch ra mất giá trị đối chiếu); `label/below/above` dịch ở app.nguong.<khoá>.
 */
const MILESTONE: Partial<Record<
  string,
  { khoa: string; law: string }
>> & Record<
  MilestoneKey,
  { khoa: string; law: string }
> = {
  tax_exemption: {
    khoa: 'mocMienThue',
    law: 'Nghị định 68/2026/NĐ-CP, sửa bởi Nghị định 141/2026/NĐ-CP · áp dụng từ 01/01/2026',
  },
  profit_method_required: {
    khoa: 'mocChonCach',
    law: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15',
  },
};

const dong = dinhDangTien;

/** ₫1.234.567.890 is unreadable at a glance; "1,23 tỷ" is not. */
function short(n: number): string {
  const v = Math.abs(n);
  const phanThapPhan = i18n.language?.startsWith('vi') ? ',' : '.';
  if (v >= 1_000_000_000) return i18n.t('app.nguong.ty', { n: (n / 1_000_000_000).toFixed(2).replace('.', phanThapPhan) });
  if (v >= 1_000_000) return i18n.t('app.nguong.trieu', { n: Math.round(n / 1_000_000) });
  return dong(n);
}

/** Scrolls to the Luật & Thuế tab so a crossed milestone leads somewhere, not
 *  just a warning with nowhere to go next. */
function goToLawPanel() {
  // Switch the tab first, then scroll — otherwise the panel can finish
  // scrolling into view a frame before the content underneath it changes.
  window.dispatchEvent(new Event(SHOW_LAW_TAB_EVENT));
  document.getElementById('news-and-law-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function MilestoneBar({ m }: { m: Milestone }) {
  const { t } = useTranslation();
  const [showLaw, setShowLaw] = useState(false);
  const meta = MILESTONE[m.key];
  // A key from a server newer or older than this file: draw nothing, not a crash.
  if (!meta) return null;
  const pct = Math.min(100, Math.max(0, m.ratio * 100));
  const near = pct >= 80 && !m.crossed;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-foreground">
          {t(`app.nguong.${meta.khoa}.label`)} · {short(m.threshold)}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums shrink-0">
          {m.crossed ? t('app.nguong.daVuot') : t('app.nguong.conLai', { x: short(m.remaining) })}
        </p>
      </div>

      <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${
            m.crossed ? 'bg-amber-500' : near ? 'bg-amber-400' : 'bg-primary'
          }`}
        />
      </div>

      <div className="mt-1 flex items-start justify-between gap-2">
        <p
          className={`text-xs flex items-start gap-1.5 ${
            m.crossed ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'
          }`}
        >
          {m.crossed ? (
            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
          ) : (
            <Check size={11} className="mt-0.5 shrink-0" />
          )}
          {m.crossed ? t(`app.nguong.${meta.khoa}.above`) : t(`app.nguong.${meta.khoa}.below`)}
        </p>

        {/* Citation is one tap away, not printed under every bar — the same
            "answer first" rule LegalUpdates.tsx uses. */}
        <button
          onClick={() => setShowLaw((v) => !v)}
          className="text-[10px] text-muted-foreground/70 hover:text-primary transition-colors flex items-center gap-0.5 shrink-0"
        >
          {t('app.nguong.canCu')} <ChevronDown size={9} className={`transition-transform ${showLaw ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showLaw && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pt-1 text-[10px] text-muted-foreground/70 pl-[18px]">{meta.law}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The crossed tax-exemption bar is the one moment that genuinely needs
          somewhere to go next, not just a warning icon. */}
      {m.crossed && m.key === 'tax_exemption' && (
        <button
          onClick={goToLawPanel}
          className="mt-1.5 text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
        >
          <Scale size={10} /> {t('app.nguong.xemLuat')}
        </button>
      )}
    </div>
  );
}

/** Dòng giải thích dưới con số ước tính từ ngân hàng. Xuất ra để kiểm riêng. */
export function GiaiThichUocTinh({ data }: { data: Pick<Summary, 'unclassifiedAmount' | 'unclassifiedCount' | 'excludedByPerson' | 'coverage'> }) {
  const { t } = useTranslation();
  const chuaRo = data.unclassifiedAmount ?? 0;
  const daTru = data.excludedByPerson ?? 0;
  const phanTram = typeof data.coverage === 'number' ? Math.floor(data.coverage * 100) : null;
  if (!chuaRo && !daTru && phanTram === null) return null;
  return (
    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
      {phanTram !== null && (
        <p className="flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>{t('app.nguong.daGiaiThich', { p: phanTram })}</span>
        </p>
      )}
      {chuaRo > 0 && (
        <p className="flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-500" />
          <span>
            {t('app.nguong.chuaXacNhan', { tien: short(chuaRo), n: data.unclassifiedCount ?? 0 })}{' '}
            <a href="#tien-vao" className="font-medium text-foreground underline underline-offset-2">
              {t('app.nguong.xacNhan')}
            </a>
          </span>
        </p>
      )}
      {daTru > 0 && (
        <p className="flex items-start gap-1.5">
          <Check size={12} className="mt-0.5 shrink-0" />
          <span>{t('app.nguong.daTru', { tien: short(daTru) })}</span>
        </p>
      )}
    </div>
  );
}

const TIEN_MAT: TienMat[] = ['gan_nhu_khong', 'mot_phan', 'phan_lon'];

/**
 * Câu kết luận về mốc 1 tỷ, đặt ngay dưới con số (29/09/2026). Thanh mốc bên dưới chỉ đo tiền vào tài
 * khoản; câu này nói con số đó đủ để kết luận chưa — tiền mặt, khoản chưa xác nhận, tiền sàn trả ròng.
 */
function NhanDinhMocMotTy({ data, daLuu }: { data: Summary; daLuu: () => void }) {
  const { t } = useTranslation();
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const nd = nhanDinhNguong({
    doanhThu: data.revenue, nguong: 1_000_000_000,
    goiYLoaiRa: data.suggestedExclusion, tienSan: data.marketplacePayout, tienMat: data.cashShare ?? null,
  });
  const mau = nd.muc === 'da_vuot' || nd.muc === 'co_the_vuot'
    ? 'border-mimi-amber/40 bg-mimi-amber/10'
    : nd.muc === 'chua_vuot' ? 'border-border/60 bg-card/40' : 'border-primary/30 bg-primary/5';
  const tra = async (tienMat: TienMat) => {
    setDangLuu(true); setLoi(null);
    try { await goiToKhai('luu_tien_mat', { tien_mat: tienMat }); daLuu(); }
    catch (e) { setLoi(e instanceof Error ? e.message : t('app.nguong.chuaLuu')); }
    finally { setDangLuu(false); }
  };
  return (
    <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs text-foreground ${mau}`} data-muc-nguong={nd.muc}>
      <p>{nd.cau}</p>
      {nd.hoiTienMat && (
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={t('app.nguong.khachTienMat')}>
          {TIEN_MAT.map((g) => (
            <button key={g} type="button" disabled={dangLuu} onClick={() => void tra(g)}
              className="rounded-full border border-border bg-card px-3 py-1 font-medium hover:bg-accent disabled:opacity-50">
              {t(`app.nguong.tienMat.${g}`)}
            </button>
          ))}
        </div>
      )}
      {nd.ghiChuSan && <p className="mt-1.5 text-muted-foreground">{nd.ghiChuSan}</p>}
      {loi && <p role="alert" className="mt-1.5 text-destructive">{loi}</p>}
    </div>
  );
}

export function ThresholdClock() {
  const { t } = useTranslation();
  const { session } = useAuthStore();
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    try {
      // Công ty đang chọn — không để máy chủ tự lấy công ty mặc định (xem tax-summary).
      const cId = await idCongTyDangDung().catch(() => null);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/tax-summary${cId ? `?company_id=${encodeURIComponent(cId)}` : ''}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const body = await res.json();
      if (!res.ok || body?.error) {
        setError(body?.error ?? i18n.t('app.nguong.loiHttp', { ma: res.status }));
        return;
      }
      const summary = body as Summary;
      setData(summary);
      // Whether people ever see a real figure here is the clearest read on
      // whether the product delivered its main promise. Only the shape is
      // recorded — never the amount.
      track('threshold_viewed', {
        basis: summary.basis,
        crossedTax: summary.milestones?.[0]?.crossed ?? false,
        hasBank: summary.hasBankConnection,
        hasGdt: summary.gdtRevenue !== null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : i18n.t('app.nguong.khongTai'));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="card-base p-5 h-52 animate-pulse bg-muted/30" aria-hidden />;
  }
  if (error || !data) {
    return (
      <div className="card-base p-5">
        <p className="text-sm text-muted-foreground">{error ?? t('app.nguong.chuaSoLieu')}</p>
      </div>
    );
  }

  const nothingToMeasure =
    !data.hasBankConnection && data.transactionsCounted === 0;

  if (nothingToMeasure) {
    return (
      <div className="card-base p-5 relative overflow-hidden">
        {/* A closed chest — revenue that exists but MIMI cannot see yet. The
            metaphor is literal, not decoration for its own sake: connect a
            source and the chest has something to show. */}
        <div className="absolute -right-2 -top-2 opacity-[0.14] rotate-6 pointer-events-none" aria-hidden="true">
          <Chest size={72} />
        </div>
        <h3 className="text-sm font-semibold text-foreground relative">{t('app.nguong.tieuDeTrong')}</h3>
        <p className="text-sm text-muted-foreground mt-2 relative max-w-[85%]">
          <Trans i18nKey="app.nguong.chuaCoDl" components={{ b: <span className="font-medium text-foreground" /> }} />
        </p>
      </div>
    );
  }

  return (
    <div className="card-base p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t('app.nguong.dtNam', { nam: data.year })}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {/* 29/09/2026: bỏ nhánh "theo hoá đơn điện tử" — MIMI không đọc được hoá đơn từ cơ quan thuế. */}
            <span className="inline-flex items-center gap-1">
              <Landmark size={11} /> {t('app.nguong.uocTinh')}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* A coin for the money itself, not for crossing a threshold — the
              distinction the file's header comment insists on. */}
          <Coin size={22} />
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {short(data.revenue)}
          </p>
        </div>
      </div>

      <NhanDinhMocMotTy data={data} daLuu={() => void load()} />
      {/* Đo đúng giả thuyết cốt lõi "tiền vào ≠ doanh thu": con số MIMI đưa ra có khớp điều chủ doanh nghiệp biết. */}
      {data.revenue > 0 && (
        <CauHoiNhanh
          cauHoi="doanh_thu_dung"
          className="mt-3"
          cau={t('app.nguong.cauHoi')}
          luaChon={[
            { gia: 'dung', nhan: t('app.nguong.dung') },
            { gia: 'cao_hon_thuc_te', nhan: t('app.nguong.cao'), hoiThem: true },
            { gia: 'thap_hon_thuc_te', nhan: t('app.nguong.thap'), hoiThem: true },
          ]}
        />
      )}

      <div className="mt-5 space-y-4">
        {(data.milestones ?? []).map((m) => (
          <MilestoneBar key={m.key} m={m} />
        ))}
      </div>


      {data.needsReview > 0 && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-500 flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          {t('app.nguong.canRa', { n: data.needsReview })}
        </p>
      )}

      {/* Con số ước tính phải nói nó ước tính tới đâu: phần nào đã có người xác nhận, phần nào máy
          đang tạm tính là doanh thu. Không tự trừ gì — chỉ mời người xác nhận. */}
      {data.basis === 'bank' && <GiaiThichUocTinh data={data} />}

      <p className="mt-4 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
        {data.disclaimer}
        {data.notCovered && <> {data.notCovered}</>}
      </p>

      {/*
        Đặt ngay dưới các mốc doanh thu, vì đó là câu hỏi kế tiếp của người vừa
        đọc xong "tôi đang ở đâu": *vậy tôi nên tính theo cách nào?*

        Dùng `data.revenue` sẵn có thay vì gọi lại `tax-summary` — một lần gọi,
        hai câu trả lời.
      */}
      {data.revenue > 0 && (
        <div className="mt-4">
          <ChonCachTinhThue doanhThu={data.revenue} />
        </div>
      )}
    </div>
  );
}
