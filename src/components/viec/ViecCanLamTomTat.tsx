import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Loader2 } from 'lucide-react';
import { dsViecCanLam, TEN_MUC, type ViecCanLam } from '@/lib/hanhTrinh';

/**
 * "Việc cần làm" trên Tổng quan (Prompt 4B mục 14) — 3 việc đầu của CÙNG danh sách với trang Việc cần
 * làm, Trợ lý và pet. Mỗi việc: cái gì, vì sao, khi nào, việc tiếp theo. Đọc lỗi thì nói lỗi — không hiện
 * như "không có việc".
 */
export function ViecCanLamTomTat() {
  const [ds, setDs] = useState<{ viec: ViecCanLam[]; loi: { cau: string }[] } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    let huy = false;
    dsViecCanLam().then((r) => { if (!huy) setDs(r); }).catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Chưa đọc được việc.'); });
    return () => { huy = true; };
  }, []);

  return (
    <section aria-labelledby="viec-can-lam-tq" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 id="viec-can-lam-tq" className="text-base font-semibold text-foreground">Việc cần làm</h2>
        <Link to="/dashboard/viec-can-lam" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Tất cả <ArrowRight size={12} /></Link>
      </div>
      {loi && <p role="alert" className="mt-2 text-sm text-destructive">Chưa đọc được việc: {loi}</p>}
      {!ds && !loi && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc việc…</p>}
      {ds?.loi.map((l) => <p key={l.cau} role="status" className="mt-2 text-xs text-mimi-amber">{l.cau}</p>)}
      {ds && ds.viec.length === 0 && !ds.loi.length && <p className="mt-2 text-sm text-muted-foreground">Không có việc nào cần bạn lúc này.</p>}
      {ds && ds.viec.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {ds.viec.slice(0, 3).map((v) => (
            <li key={v.id} className="py-2.5">
              <Link to={v.duong_dan} className="block hover:opacity-90">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{TEN_MUC[v.muc]}</p>
                <p className="text-sm font-semibold text-foreground">{v.tieu_de}</p>
                {v.hanh_dong && v.hanh_dong.tieu_de !== v.tieu_de && <p className="text-sm text-primary">Việc tiếp theo: {v.hanh_dong.tieu_de}</p>}
                <p className="text-xs text-muted-foreground">{v.vi_sao}</p>
                {v.khi && <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-foreground"><CalendarClock size={12} aria-hidden /> {v.khi.nhan}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {ds && ds.viec.length > 3 && <p className="mt-1 text-xs text-muted-foreground">Còn {ds.viec.length - 3} việc nữa.</p>}
    </section>
  );
}
