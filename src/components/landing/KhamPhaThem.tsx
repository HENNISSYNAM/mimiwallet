import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { TRANG_KHAM_PHA } from '@/content/khamPha';

/** Ô dẫn sang các trang Khám phá — thay cho việc dồn mọi khối trình diễn lên trang chủ. */
export default function KhamPhaThem() {
  return (
    <section id="kham-pha" aria-labelledby="kham-pha-tieu-de" className="bg-background py-20">
      <div className="container mx-auto px-4">
        <h2 id="kham-pha-tieu-de" className="text-center font-serif text-[clamp(1.6rem,3.2vw,2.4rem)] font-normal leading-tight tracking-[-0.015em] text-foreground">
          Tìm hiểu thêm
        </h2>
        <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRANG_KHAM_PHA.map((t) => (
            <li key={t.slug}>
              <Link to={`/kham-pha/${t.slug}`} className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
                <span className="font-display text-base font-semibold text-foreground">{t.ten}</span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">{t.mo_ta}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Xem <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
