import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { dsViecCanLam, TEN_LOAI_NGAY, type MucLich } from '@/lib/hanhTrinh';

/**
 * Lịch của các việc đang làm (Prompt 4B mục 10) — đọc THẲNG ngày của hồ sơ việc qua danh sách Việc cần
 * làm chuẩn; lịch không giữ ngày riêng nào. Ba loại ngày không bao giờ lẫn: hạn pháp lý, ngày MIMI khuyên
 * làm trước, ngày hẹn kiểm lại. Việc xong vẫn hiện nhưng gạch đi.
 */
const MAU: Record<MucLich['loai_ngay'], string> = {
  han_luat: 'border-destructive/40 bg-destructive/5 text-destructive',
  nen_lam: 'border-primary/30 bg-primary/5 text-primary',
  hen_kiem_lai: 'border-border bg-accent text-muted-foreground',
};
const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');

export function LichViec() {
  const [ds, setDs] = useState<MucLich[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    let huy = false;
    dsViecCanLam()
      .then((r) => { if (!huy) setDs([...r.lich].sort((a, b) => a.ngay.localeCompare(b.ngay))); })
      .catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Chưa đọc được việc.'); });
    return () => { huy = true; };
  }, []);
  if (loi) return <p role="alert" className="text-sm text-destructive">Chưa đọc được ngày của các việc đang làm: {loi}</p>;
  if (!ds) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc việc…</p>;
  if (!ds.length) return null;
  return (
    <section aria-labelledby="lich-viec" className="rounded-2xl border border-border bg-card">
      <h2 id="lich-viec" className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">Ngày của các việc bạn đang làm</h2>
      <ol className="divide-y divide-border">
        {ds.map((m) => (
          <li key={`${m.viec_id}:${m.loai_ngay}:${m.ngay}`} className="flex flex-wrap items-center gap-2 px-5 py-3 text-sm">
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${MAU[m.loai_ngay]}`}>{TEN_LOAI_NGAY[m.loai_ngay]}</span>
            <span className={m.da_xong ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}>{ngayVN(m.ngay)}</span>
            <Link to={`/dashboard/viec-can-lam?viec=${m.viec_id}`} className={`hover:underline ${m.da_xong ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{m.tieu_de}</Link>
            {m.ghi_chu && <span className="w-full text-xs text-muted-foreground">{m.ghi_chu}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
