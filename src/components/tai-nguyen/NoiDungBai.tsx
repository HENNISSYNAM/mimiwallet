import { phanTichNoiDung, type DoanChu } from '@/lib/taiNguyen';

/** Hiện nội dung bài bằng phần tử React — không dangerouslySetInnerHTML, nên không chèn được HTML. */
function Doan({ doan }: { doan: DoanChu[] }) {
  return (
    <>
      {doan.map((d, i) => (d.loai === 'lien_ket'
        ? <a key={i} href={d.href} target="_blank" rel="noopener noreferrer nofollow" className="text-primary underline underline-offset-4">{d.chu}</a>
        : <span key={i}>{d.chu}</span>))}
    </>
  );
}

export default function NoiDungBai({ noiDung }: { noiDung: string }) {
  const khoi = phanTichNoiDung(noiDung);
  return (
    <div className="space-y-5 text-[17px] leading-relaxed text-foreground">
      {khoi.map((k, i) => {
        if (k.loai === 'h2') return <h2 key={i} className="pt-4 font-serif text-3xl font-normal tracking-[-0.015em]"><Doan doan={k.doan} /></h2>;
        if (k.loai === 'h3') return <h3 key={i} className="pt-2 text-xl font-semibold"><Doan doan={k.doan} /></h3>;
        if (k.loai === 'ul') {
          return (
            <ul key={i} className="list-disc space-y-2 pl-6">
              {k.muc.map((m, j) => <li key={j}><Doan doan={m} /></li>)}
            </ul>
          );
        }
        return <p key={i}><Doan doan={k.doan} /></p>;
      })}
    </div>
  );
}
