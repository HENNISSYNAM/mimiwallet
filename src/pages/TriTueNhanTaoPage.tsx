import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, ChevronRight, X } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Chip, useCanh } from '@/components/landing/DemoTuChay';
import { Trans, useTranslation } from 'react-i18next';

/**
 * Trí tuệ nhân tạo (/tri-tue-nhan-tao) — các thẻ tính năng kiểu Ramp Intelligence,
 * bản MIMI.
 *
 * MỖI THẺ PHẢI TRỎ VỀ CODE ĐANG CHẠY. Từ 28/09/2026 không còn thẻ "Đang xây": thứ chưa chạy thì không
 * lên trang (các thẻ phân loại sao kê, hoá đơn cơ quan thuế, luật chặn nhiều nhất, gợi ý chính sách đã
 * gỡ). Hình trong thẻ là
 * minh hoạ bằng dữ liệu ví dụ; mã lý do (VUOT_HAN_MUC_NGAY, DOI_SO_TAI_KHOAN…) và
 * tên công cụ MCP (xem_chinh_sach) là tên thật trong `_shared/tac-tu/chinh-sach.ts`
 * và `_shared/mcp/may-chu.ts`.
 *
 * Đã kiểm trước khi viết:
 *   - Tự phân loại sao kê: CHƯA có code (`sepay-map.ts` ghi `category: null`) → Đang xây.
 *   - Khớp yêu cầu chi với hoá đơn: yêu cầu có trường `so_hoa_don` nhưng chưa có
 *     bước đối chiếu với hoá đơn cơ quan thuế → Đang xây.
 *   - Bảng luật chặn nhiều nhất, gợi ý chỉnh chính sách: chưa có → Đang xây, không số liệu.
 *
 * Những thẻ Ramp có mà MIMI không làm (so giá với dữ liệu doanh nghiệp khác, tự
 * trả tiền, đàm phán thay) nằm ở mục cuối, kèm lý do — không lặng lẽ bỏ đi.
 */

type TrangThaiThe = 'chay' | 'xay';

function NhanTrangThai({ tt }: { tt: TrangThaiThe }) {
  const { t } = useTranslation();
  return tt === 'chay' ? (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">{t('app.triTue.dangChay')}</span>
  ) : (
    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">{t('app.triTue.dangXay')}</span>
  );
}

/** Thẻ: vùng hình phía trên, chữ phía dưới. `khungRef` để hoạ tiết chỉ chạy khi thấy. */
function The({
  tt, tieuDe, mo, nen, cao = 'min-h-[300px]', khungRef, children,
}: {
  tt: TrangThaiThe;
  tieuDe: string;
  mo: string;
  nen: string;
  cao?: string;
  khungRef?: React.RefObject<HTMLDivElement>;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div ref={khungRef} className={`relative flex items-center justify-center p-5 sm:p-7 ${cao} ${nen}`}>
        <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {tt === 'xay' ? t('app.triTue.xayMinhHoa') : t('app.triTue.minhHoa')}
        </span>
        {children}
      </div>
      <div className="flex flex-1 flex-col border-t border-border p-6">
        <NhanTrangThai tt={tt} />
        <h3 className="mt-3 font-display text-xl font-semibold text-foreground text-balance">{tieuDe}</h3>
        <p className="mt-2 leading-relaxed text-muted-foreground">{mo}</p>
      </div>
    </article>
  );
}

const Hop = ({ children, rong = 'max-w-sm' }: { children: ReactNode; rong?: string }) => (
  <div className={`w-full ${rong} rounded-lg border border-border bg-card p-4 shadow-sm`}>{children}</div>
);

/* ── A1. Tự duyệt khi an toàn ─────────────────────────────────────── */
type DongKiem = { dat: boolean | 'hoi' };
// Chữ của từng ca (mục đích, dòng kiểm, kết quả) nằm ở bộ dịch: app.triTue.tuDuyet.ca.<i>.
const CA_DUYET: Array<{
  agent: string; tien: string; kiem: DongKiem[];
  ketQua: { loai: 'duyet' | 'cho' | 'chan' };
}> = [
  {
    agent: 'agent-ha-tang', tien: '850.000đ',
    kiem: [{ dat: true }, { dat: true }, { dat: true }],
    ketQua: { loai: 'duyet' },
  },
  {
    agent: 'agent-quang-cao', tien: '4.500.000đ',
    kiem: [{ dat: 'hoi' }, { dat: true }, { dat: true }],
    ketQua: { loai: 'cho' },
  },
  {
    agent: 'agent-mua-hang', tien: '9.000.000đ',
    kiem: [{ dat: false }, { dat: true }, { dat: true }],
    ketQua: { loai: 'chan' },
  },
];
const NHIP_CA = [3200, 3200, 3200] as const;

function IconKiem({ dat }: { dat: DongKiem['dat'] }) {
  if (dat === true) return <Check size={13} className="shrink-0 text-emerald-600" />;
  if (dat === 'hoi') return <AlertTriangle size={13} className="shrink-0 text-amber-600" />;
  return <X size={13} className="shrink-0 text-destructive" />;
}

function TheTuDuyet() {
  const { khung, buoc } = useCanh(NHIP_CA, 0);
  const { t } = useTranslation();
  const ca = CA_DUYET[buoc];
  const k = `app.triTue.tuDuyet.ca.${buoc}`;
  return (
    <The
      khungRef={khung}
      tt="chay"
      nen="bg-secondary/60"
      cao="min-h-[340px]"
      tieuDe={t('app.triTue.tuDuyet.tieuDe')}
      mo={t('app.triTue.tuDuyet.mo')}
    >
      <Hop>
        <motion.div key={buoc} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">{ca.agent}</span>
            <Chip loai={ca.ketQua.loai}>{t(`${k}.ketQua`)}</Chip>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">{ca.tien}</p>
          <p className="text-[13px] text-muted-foreground">{t(`${k}.mucDich`)}</p>
          <ul className="mt-3 grid gap-1.5 border-t border-border pt-3">
            {ca.kiem.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-[12px] text-foreground">
                <IconKiem dat={d.dat} /> {t(`${k}.kiem.${i}`)}
              </li>
            ))}
          </ul>
        </motion.div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {CA_DUYET.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i === buoc ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>
      </Hop>
    </The>
  );
}

/* ── A2. Agent hỏi trong chính sách ────────────────────────────────── */
const NHIP_HOI = [1300, 1300, 1500, 3200] as const;

function TheHoiChinhSach() {
  const { khung, buoc } = useCanh(NHIP_HOI, 3);
  const hien = (i: number) => buoc >= i;
  const { t } = useTranslation();
  return (
    <The
      khungRef={khung}
      tt="chay"
      nen="bg-primary/5"
      cao="min-h-[340px]"
      tieuDe={t('app.triTue.hoi.tieuDe')}
      mo={t('app.triTue.hoi.mo')}
    >
      <div className="grid w-full max-w-sm gap-2 text-[12px]">
        {hien(0) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-primary px-3 py-2 text-primary-foreground">
            {t('app.triTue.hoi.cauHoi')}
          </motion.p>
        )}
        {hien(1) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-fit rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
            <Trans i18nKey="app.triTue.hoi.goi" components={{ c: <span className="text-foreground" /> }} />
          </motion.p>
        )}
        {hien(2) && (
          <motion.pre initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="overflow-x-auto rounded-md bg-foreground p-3 font-mono text-[11px] leading-relaxed text-background">
{`han_muc_con_lai: {
  moi_lan: 5000000,
  ngay:    3500000,
  thang:  18200000
}`}
          </motion.pre>
        )}
        {hien(3) && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[90%] rounded-lg rounded-bl-sm border border-border bg-card px-3 py-2 text-foreground">
            {t('app.triTue.hoi.traLoi')}
          </motion.p>
        )}
      </div>
    </The>
  );
}

/* ── B1. Biết đang trả cho gì ──────────────────────────────────────── */
function TheTraChoGi() {
  const { t } = useTranslation();
  return (
    <The
      tt="chay"
      nen="bg-secondary/60"
      tieuDe={t('app.triTue.traChoGi.tieuDe')}
      mo={t('app.triTue.traChoGi.mo')}
    >
      <Hop>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">{t('app.triTue.traChoGi.canXem')}</span>
          <span className="font-mono text-[11px] text-muted-foreground">agent-nha-cung-cap</span>
        </div>
        <p className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">12.800.000đ</p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
          <dt className="text-muted-foreground">{t('app.triTue.traChoGi.mucDich')}</dt><dd className="text-foreground">{t('app.triTue.traChoGi.mucDichGt')}</dd>
          <dt className="text-muted-foreground">{t('app.triTue.traChoGi.nhomChi')}</dt><dd className="text-foreground">{t('app.triTue.traChoGi.nhomChiGt')}</dd>
          <dt className="text-muted-foreground">{t('app.triTue.traChoGi.hoaDon')}</dt><dd className="font-mono text-foreground">00001234</dd>
        </dl>
        <p className="mt-3 rounded-md bg-destructive/5 px-2.5 py-1.5 font-mono text-[11px] text-destructive">DOI_SO_TAI_KHOAN</p>
      </Hop>
    </The>
  );
}

/* ── C1. Chặn lừa đảo ──────────────────────────────────────────────── */
const NHIP_LUA = [1400, 3400] as const;

function TheLuaDao() {
  const { khung, buoc } = useCanh(NHIP_LUA, 1);
  const { t } = useTranslation();
  return (
    <The
      khungRef={khung}
      tt="chay"
      nen="bg-destructive/5"
      cao="min-h-[320px]"
      tieuDe={t('app.triTue.luaDao.tieuDe')}
      mo={t('app.triTue.luaDao.mo')}
    >
      <Hop>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">CÔNG TY TNHH ABC</span>
          {buoc >= 1 ? <Chip loai="chan">{t('app.triTue.luaDao.nghiDoi')}</Chip> : <Chip loai="cho">{t('app.triTue.luaDao.dangXet')}</Chip>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border p-2">
            <p className="text-muted-foreground">{t('app.triTue.luaDao.lanTruoc')}</p>
            <p className="font-mono text-foreground">MB · ••••6789</p>
          </div>
          <div className={`rounded-md border p-2 transition-colors ${buoc >= 1 ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
            <p className="text-muted-foreground">{t('app.triTue.luaDao.lanNay')}</p>
            <p className="font-mono text-foreground">VCB · ••••1188</p>
          </div>
        </div>
        {buoc >= 1 && (
          <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-[11px] text-muted-foreground">
            {t('app.triTue.luaDao.goiXacNhan')}
          </motion.p>
        )}
      </Hop>
    </The>
  );
}

/* ── C2. Khớp ba chiều ─────────────────────────────────────────────── */
// Chữ lấy từ bộ dịch (app.triTue.baChieu.<khoá>).
const BA_CHIEU: Array<{ tu: string; toi: string; tt: TrangThaiThe; cach: string }> = [
  { tu: 'yeuCau', toi: 'saoKe', tt: 'chay', cach: 'cach' },
];

function TheBaChieu() {
  const { t } = useTranslation();
  return (
    <The
      tt="chay"
      nen="bg-secondary/60"
      cao="min-h-[320px]"
      tieuDe={t('app.triTue.baChieu.tieuDe')}
      mo={t('app.triTue.baChieu.mo')}
    >
      <div className="grid w-full max-w-sm gap-2">
        {BA_CHIEU.map((c) => (
          <div key={c.tu + c.toi} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                {t(`app.triTue.baChieu.${c.tu}`)} <ArrowRight size={12} className="text-muted-foreground" /> {t(`app.triTue.baChieu.${c.toi}`)}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{t(`app.triTue.baChieu.${c.cach}`)}</p>
            </div>
            {c.tt === 'chay'
              ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15"><Check size={13} className="text-emerald-700 dark:text-emerald-400" /></span>
              : <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">{t('app.triTue.dangXay')}</span>}
          </div>
        ))}
      </div>
    </The>
  );
}

/* ── D. Bớt việc tay — 28/09/2026 gỡ thẻ phân loại sao kê (chưa chạy) và thẻ hoá đơn cơ quan thuế
   (Casso chưa bật hoá đơn điện tử cho app production). ─────────────────── */
function TheMaLyDo() {
  const { t } = useTranslation();
  return (
    <The
      tt="chay"
      nen="bg-primary/5"
      cao="min-h-[260px]"
      tieuDe={t('app.triTue.maLyDo.tieuDe')}
      mo={t('app.triTue.maLyDo.mo')}
    >
      {/* Mẫu JSON giữ nguyên tiếng Việt: máy chủ thật trả câu lý do bằng tiếng Việt. */}
      <div className="w-full max-w-sm rounded-lg bg-foreground p-4 font-mono text-[11px] leading-relaxed text-background">
        <p className="opacity-60">{'{'} "ket_qua": "cho_duyet",</p>
        <p className="opacity-60">&nbsp;&nbsp;"ly_do": [</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;{'{'} "ma": <span className="text-amber-300">"NGUOI_NHAN_MOI"</span>,</p>
        <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"cau": "Lần đầu chi cho người nhận này…" {'}'}</p>
        <p className="opacity-60">&nbsp;&nbsp;] {'}'}</p>
      </div>
    </The>
  );
}

/* ── Chưa làm ──────────────────────────────────────────────────────── */
// Ba việc chủ ý không làm — chữ ở bộ dịch app.triTue.chuaLam.<i>.{ten,vi}.
const CHUA_LAM = [0, 1, 2] as const;

function TieuDeKhu({ nhan, children, mo }: { nhan: string; children: ReactNode; mo?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{nhan}</p>
      <h2 className="mt-3 font-serif font-normal text-foreground text-balance leading-[1.08] tracking-[-0.015em] text-[clamp(1.6rem,3vw,2.3rem)]">
        {children}
      </h2>
      {mo && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{mo}</p>}
    </div>
  );
}

export default function TriTueNhanTaoPage() {
  const { t } = useTranslation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen landing-light bg-background">
      <Navbar />

      <section className="mimi-hero-warm border-b border-border/60">
        <div className="container mx-auto px-4 pt-32 pb-16 lg:pt-40 lg:pb-20">
          <nav aria-label={t('app.chung.duongDan')} className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{t('app.triTue.trangChu')}</Link>
            <ChevronRight size={14} />
            <span>{t('app.triTue.sanPham')}</span>
            <ChevronRight size={14} />
            <span>{t('app.triTue.triTue')}</span>
          </nav>
          <h1
            className="mt-6 max-w-3xl font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
          >
            {t('app.triTue.hero')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('app.triTue.heroMo')}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-display text-[15px] font-semibold text-primary-foreground hover:bg-primary/90">
              {t('app.triTue.batDau')} <ArrowRight size={16} />
            </Link>
            <Link to="/san-pham/kiem-soat-agent" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-[15px] font-medium text-foreground hover:bg-muted/60">
              {t('app.triTue.kiemSoat')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan={t('app.triTue.khu.duyet')} mo={t('app.triTue.khu.duyetMo')}>
            {t('app.triTue.khu.duyetTieuDe')}
          </TieuDeKhu>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <TheTuDuyet />
            <TheHoiChinhSach />
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan={t('app.triTue.khu.hieu')}>{t('app.triTue.khu.hieuTieuDe')}</TieuDeKhu>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TheTraChoGi />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan={t('app.triTue.khu.anToan')} mo={t('app.triTue.khu.anToanMo')}>
            {t('app.triTue.khu.anToanTieuDe')}
          </TieuDeKhu>
          <a href="https://www.gasa.org/knowledge-base/blog/new-study-reveals-63-of-southeast-asians-experienced-scams-in-past-year" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
            {t('app.triTue.khu.nguon')}
          </a>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <TheLuaDao />
            <TheBaChieu />
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <TieuDeKhu nhan={t('app.triTue.khu.botViec')}>{t('app.triTue.khu.botViecTieuDe')}</TieuDeKhu>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <TheMaLyDo />
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_1.6fr]">
          <TieuDeKhu nhan={t('app.triTue.khu.ranhGioi')} mo={t('app.triTue.khu.ranhGioiMo')}>
            {t('app.triTue.khu.ranhGioiTieuDe')}
          </TieuDeKhu>
          <ul className="divide-y divide-border border-y border-border">
            {CHUA_LAM.map((i) => (
              <li key={i} className="flex gap-4 py-5">
                <X size={18} className="mt-1 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{t(`app.triTue.chuaLam.${i}.ten`)}</p>
                  <p className="mt-1 leading-relaxed text-muted-foreground">{t(`app.triTue.chuaLam.${i}.vi`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer />
    </div>
  );
}
