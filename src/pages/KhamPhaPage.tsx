import { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import Landing from '@/pages/Landing';
import { KHAM_PHA_THEO_SLUG, TRANG_KHAM_PHA } from '@/content/khamPha';

/** /kham-pha/:trang — các khối trình diễn dời khỏi trang chủ (xem `content/khamPha.ts`). */
export default function KhamPhaPage() {
  const { trang = '' } = useParams();
  const { hash } = useLocation();
  const t = KHAM_PHA_THEO_SLUG[trang];

  // Liên kết kiểu /kham-pha/agent-ai#nhat-ky: cuộn tới khối sau khi hiện.
  useEffect(() => {
    if (!hash) { window.scrollTo(0, 0); return; }
    const id = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView(), 50);
    return () => clearTimeout(id);
  }, [trang, hash]);

  if (!t) return <Navigate to="/" replace />;
  return (
    <Landing
      khoi={t.khoi}
      dauTrang={
        <header className="border-b border-border bg-background pt-28 pb-10">
          <div className="container mx-auto px-4">
            <nav aria-label="Khám phá" className="flex flex-wrap gap-2 text-sm">
              <Link to="/" className="text-muted-foreground hover:text-foreground">Trang chủ</Link>
              <span className="text-muted-foreground">/</span>
              <span className="text-foreground">{t.ten}</span>
            </nav>
            <h1 className="mt-4 font-serif text-[clamp(2rem,4.5vw,3.25rem)] font-normal leading-tight tracking-[-0.015em] text-foreground">{t.ten}</h1>
            <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t.mo_ta}</p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {TRANG_KHAM_PHA.filter((x) => x.slug !== t.slug).map((x) => (
                <li key={x.slug}>
                  <Link to={`/kham-pha/${x.slug}`} className="inline-flex h-9 items-center rounded-full border border-border px-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">{x.ten}</Link>
                </li>
              ))}
            </ul>
          </div>
        </header>
      }
    />
  );
}
