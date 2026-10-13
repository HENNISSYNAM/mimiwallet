import { useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, X } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Seo from '@/components/Seo';
import { duongDanTrang, timTrang, type TrangThai } from '@/content/trangNoiDung';
import { useTranslation } from 'react-i18next';

/**
 * Trang Sản phẩm (/san-pham/:slug) và Giải pháp (/giai-phap/:slug).
 *
 * Một khuôn cho mọi trang, nội dung ở `content/trangNoiDung.ts`. Thứ tự các phần
 * đi theo câu hỏi của người mua: có đau không (Vấn đề) → làm thế nào → được gì →
 * KHÔNG làm gì (Ranh giới) → tìm ở đâu trong app → hỏi đáp.
 *
 * "Ranh giới" đứng trước hỏi đáp có chủ ý: với sản phẩm chạm tới tiền, biết rõ
 * điều sản phẩm không làm là phần tạo niềm tin, không phải chữ nhỏ cuối trang.
 */

const NHAN_TRANG_THAI: Record<TrangThai, { chu: string; lop: string }> = {
  'dang-chay': { chu: 'ui1.tnd.ttDangChay', lop: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' },
  'dang-xay': { chu: 'ui1.tnd.ttDangXay', lop: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  'lien-he': { chu: 'ui1.tnd.ttLienHe', lop: 'bg-primary/10 text-primary' },
};

const TEN_LOAI = { 'san-pham': 'ui1.tnd.sanPham', 'giai-phap': 'ui1.tnd.giaiPhap' } as const;

function TieuDeKhu({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif font-normal text-foreground text-balance leading-[1.08] tracking-[-0.015em] text-[clamp(1.6rem,3vw,2.3rem)]">
      {children}
    </h2>
  );
}

export default function TrangNoiDungPage() {
  const { pathname } = useLocation();
  const { t: dich } = useTranslation();
  const navigate = useNavigate();
  const trang = timTrang(pathname.replace(/\/+$/, ''));

  // Chuyển giữa các trang bằng router giữ nguyên vị trí cuộn; bấm menu từ cuối
  // trang chủ mà mở trang mới ở giữa chừng thì người đọc lỡ mất phần đầu.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (!trang) return <Navigate to="/404" replace />;

  const trangThai = NHAN_TRANG_THAI[trang.trangThai];
  const lienQuan = trang.lienQuan.map((d) => timTrang(d)).filter((t): t is NonNullable<typeof t> => Boolean(t));
  const soCot = Math.min(trang.cachHoatDong.length, 4);
  const lopCot = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }[soCot];

  return (
    <div className="min-h-screen landing-light bg-background">
      <Seo title={`${trang.ten} — MIMI WALLET`} description={trang.motCau} path={duongDanTrang(trang)} />
      <Navbar />

      {/* ═══ ĐẦU TRANG ═══ */}
      <section className="mimi-hero-warm border-b border-border/60">
        <div className="container mx-auto px-4 pt-32 pb-16 lg:pt-40 lg:pb-20">
          <nav aria-label={dich('ui1.tnd.duongDan')} className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">{dich('ui1.tnd.trangChu')}</Link>
            <ChevronRight size={14} />
            <span>{dich(TEN_LOAI[trang.loai])}</span>
            <ChevronRight size={14} />
            <span>{trang.nhom}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${trangThai.lop}`}>{dich(trangThai.chu)}</span>
            <span className="text-sm text-muted-foreground">{trang.nhom}</span>
          </div>
          <h1
            className="mt-4 max-w-3xl font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.02em]"
            style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)' }}
          >
            {trang.ten}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{trang.motCau}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            {trang.trangThai === 'dang-chay' ? (
              <button
                onClick={() => navigate('/register')}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-display text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {dich('ui1.tnd.batDau')} <ArrowRight size={16} />
              </button>
            ) : (
              <a
                href="/#dang-ky"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-display text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {trang.trangThai === 'dang-xay' ? dich('ui1.tnd.dungSom') : dich('ui1.tnd.lienHe')} <ArrowRight size={16} />
              </a>
            )}
            <a href="/kham-pha/demo" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-[15px] font-medium text-foreground hover:bg-muted/60">
              {dich('ui1.tnd.xemMimi')}
            </a>
          </div>
        </div>
      </section>

      {/* ═══ VẤN ĐỀ ═══ */}
      <section className="py-20">
        <div className={`container mx-auto grid gap-10 px-4 ${trang.vanDe.soLieu ? 'lg:grid-cols-[1.4fr_1fr] lg:items-start' : ''}`}>
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{dich('ui1.tnd.vanDe')}</p>
            <div className="mt-3"><TieuDeKhu>{trang.vanDe.tieuDe}</TieuDeKhu></div>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{trang.vanDe.doan}</p>
          </div>
          {trang.vanDe.soLieu && (
            <aside className="rounded-xl border border-border bg-card p-6">
              <p className="font-mono text-5xl font-semibold tracking-tight text-foreground tabular-nums">{trang.vanDe.soLieu.so}</p>
              <p className="mt-2 text-foreground">{trang.vanDe.soLieu.nhan}</p>
              <a href={trang.vanDe.soLieu.url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                {dich('ui1.tnd.nguon')} {trang.vanDe.soLieu.nguon}
              </a>
            </aside>
          )}
        </div>
      </section>

      {/* ═══ CÁCH HOẠT ĐỘNG ═══ */}
      <section className="border-y border-border/60 bg-secondary/30 py-20">
        <div className="container mx-auto px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{dich('ui1.tnd.cachHoatDong')}</p>
          <div className="mt-3"><TieuDeKhu>{trang.trangThai === 'dang-xay' ? dich('ui1.tnd.duKien') : dich('ui1.tnd.tungBuoc')}</TieuDeKhu></div>
          <ol className={`mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border ${lopCot}`}>
            {trang.cachHoatDong.map((b, i) => (
              <li key={b.tieuDe} className="grid content-start gap-3 bg-card p-6">
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="font-display text-base font-semibold text-foreground">{b.tieuDe}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground break-words">{b.mo}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ LÀM ĐƯỢC GÌ ═══ */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{dich('ui1.tnd.lamDuoc')}</p>
          <div className="mt-3"><TieuDeKhu>{dich('ui1.tnd.chiTiet')}</TieuDeKhu></div>
          <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {trang.lamDuoc.map((m) => (
              <div key={m.tieuDe} className="border-t border-border pt-5">
                <h3 className="font-display text-base font-semibold text-foreground">{m.tieuDe}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.mo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ RANH GIỚI + TRONG APP ═══ */}
      <section className="pb-20">
        <div className="container mx-auto grid gap-6 px-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{dich('ui1.tnd.ranhGioi')}</p>
            <ul className="mt-5 grid gap-3">
              {trang.ranhGioi.map((r) => (
                <li key={r} className="flex items-start gap-3 text-foreground">
                  <X size={16} className="mt-1 shrink-0 text-muted-foreground" />
                  <span className="leading-relaxed">{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trong app</p>
            {trang.trongApp ? (
              <>
                <p className="mt-4 font-display text-lg font-semibold text-foreground">{trang.trongApp.ten}</p>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{trang.trongApp.duong}</p>
                <Link to={trang.trongApp.duong} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-4">
                  {dich('ui1.tnd.moApp')} <ArrowRight size={14} />
                </Link>
                <p className="mt-2 text-xs text-muted-foreground">{dich('ui1.tnd.canDangNhap')}</p>
              </>
            ) : (
              <p className="mt-4 text-muted-foreground">
                {trang.trangThai === 'dang-xay' ? dich('ui1.tnd.chuaCo') : dich('ui1.tnd.trienKhai')}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ═══ HỎI ĐÁP ═══ */}
      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{dich('ui1.tnd.hoiDap')}</p>
            <div className="mt-3"><TieuDeKhu>{dich('ui1.tnd.faq')}</TieuDeKhu></div>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {trang.hoiDap.map((h) => (
              <details key={h.hoi} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground">
                  {h.hoi}
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-3 leading-relaxed text-muted-foreground">{h.dap}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ LIÊN QUAN ═══ */}
      {lienQuan.length > 0 && (
        <section className="bg-secondary/30 py-20">
          <div className="container mx-auto px-4">
            <TieuDeKhu>{dich('ui1.tnd.lienQuan')}</TieuDeKhu>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {lienQuan.map((t) => (
                <Link key={duongDanTrang(t)} to={duongDanTrang(t)} className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{dich(TEN_LOAI[t.loai])} · {t.nhom}</span>
                    {t.trangThai !== 'dang-chay' && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${NHAN_TRANG_THAI[t.trangThai].lop}`}>{dich(NHAN_TRANG_THAI[t.trangThai].chu)}</span>
                    )}
                  </span>
                  <span className="mt-2 block font-display text-lg font-semibold text-foreground">{t.ten}</span>
                  <span className="mt-2 line-clamp-2 block text-sm text-muted-foreground">{t.motCau}</span>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {dich('ui1.tnd.xem')} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
