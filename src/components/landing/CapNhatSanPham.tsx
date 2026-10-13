/**
 * Cập nhật sản phẩm — những gì đã chạy thật, mới nhất trước.
 *
 * CHỈ GHI ĐIỀU ĐÃ CHẠY. Mỗi dòng ứng với một commit đã lên production (xem git
 * log cùng ngày). Chức năng đang xây không vào đây — nó nằm ở nhãn "Đang xây"
 * trên các khung demo. Thêm dòng mới lên đầu mảng.
 */

import { useTranslation } from 'react-i18next';

/* `nhom`/`tieuDe`/`mo` là khoá i18n (`ui2.capNhat.*`). */
const CAP_NHAT = [
  { ngay: '14/09/2026', nhom: 'ui2.capNhat.nhomKiem', tieuDe: 'ui2.capNhat.c0.t', mo: 'ui2.capNhat.c0.m' },
  { ngay: '14/09/2026', nhom: 'ui2.capNhat.nhomAgent', tieuDe: 'ui2.capNhat.c1.t', mo: 'ui2.capNhat.c1.m' },
  { ngay: '14/09/2026', nhom: 'ui2.capNhat.nhomDuyet', tieuDe: 'ui2.capNhat.c2.t', mo: 'ui2.capNhat.c2.m' },
  { ngay: '14/09/2026', nhom: 'ui2.capNhat.nhomNganHang', tieuDe: 'ui2.capNhat.c3.t', mo: 'ui2.capNhat.c3.m' },
  { ngay: '10/09/2026', nhom: 'ui2.capNhat.nhomAgent', tieuDe: 'ui2.capNhat.c4.t', mo: 'ui2.capNhat.c4.m' },
  { ngay: '10/09/2026', nhom: 'ui2.capNhat.nhomAgent', tieuDe: 'ui2.capNhat.c5.t', mo: 'ui2.capNhat.c5.m' },
];

export default function CapNhatSanPham() {
  const { t } = useTranslation();
  return (
    <section id="cap-nhat" className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl">
          <h2 className="font-serif font-normal text-foreground text-balance leading-[1.05] tracking-[-0.015em] text-[clamp(2rem,4.2vw,3.25rem)]">
            {t('ui2.capNhat.tieuDe')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{t('ui2.capNhat.moTa')}</p>
        </div>
        <ol className="mt-10 divide-y divide-border border-y border-border">
          {CAP_NHAT.map((c) => (
            <li key={c.tieuDe} className="grid gap-2 py-5 sm:grid-cols-[150px_1fr] sm:gap-8">
              <div className="flex items-center gap-2 sm:block">
                <p className="font-mono text-sm tabular-nums text-muted-foreground">{c.ngay}</p>
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:mt-1.5">{t(c.nhom)}</span>
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">{t(c.tieuDe)}</h3>
                <p className="mt-1 max-w-2xl leading-relaxed text-muted-foreground">{t(c.mo)}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
