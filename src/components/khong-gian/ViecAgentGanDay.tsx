/**
 * "Workflow gần đây" dưới ô hỏi ở Home (22/11/2026) — học cột Tasks của ClickUp Home: vài workflow gần nhất của công ty
 * đang dùng, đang chạy / bản nháp đứng trước, bấm là mở khung vẽ. Không có workflow nào thì không hiện gì.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleCheck, CircleDot, PencilLine } from 'lucide-react';
import { dsQuyTrinh, type DongQuyTrinh } from '@/lib/goiQuyTrinh';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

const THU_TU: Record<string, number> = { dang_chay: 0, nhap: 1, dung: 2, xong: 3 };
const TEN_TT: Record<string, string> = { nhap: 'Bản nháp', dang_chay: 'Đang chạy', xong: 'Xong', dung: 'Đã dừng' };

export function chonQuyTrinhHome(ds: DongQuyTrinh[], companyId: string | null, toiDa = 5): DongQuyTrinh[] {
  return ds.filter((q) => q.company_id === companyId)
    .sort((a, b) => (THU_TU[a.trang_thai] ?? 9) - (THU_TU[b.trang_thai] ?? 9) || b.cap_nhat_luc.localeCompare(a.cap_nhat_luc))
    .slice(0, toiDa);
}

export function ViecAgentGanDay({ lan = 0 }: { lan?: number }) {
  const [ds, setDs] = useState<DongQuyTrinh[] | null>(null);
  useEffect(() => {
    let huy = false;
    Promise.all([idCongTyDangDung(), dsQuyTrinh()])
      .then(([id, q]) => { if (!huy) setDs(chonQuyTrinhHome(q, id)); })
      .catch(() => { if (!huy) setDs([]); });
    return () => { huy = true; };
  }, [lan]);
  if (!ds?.length) return null;
  return (
    <section aria-label="Workflow gần đây" className="mb-6 rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Workflow gần đây</h2>
        <Link to="/dashboard/space" className="inline-flex items-center gap-1 text-xs font-medium text-primary">Mở Agentic AI Space <ArrowRight size={12} /></Link>
      </div>
      <ul className="divide-y">
        {ds.map((q) => (
          <li key={q.id}>
            <Link to={`/dashboard/space/${q.id}`} className="flex items-center gap-3 py-2 text-sm hover:opacity-80">
              {q.trang_thai === 'dang_chay' ? <CircleDot size={16} className="shrink-0 text-primary" aria-hidden />
                : q.trang_thai === 'nhap' ? <PencilLine size={16} className="shrink-0 text-amber-600" aria-hidden />
                  : <CircleCheck size={16} className="shrink-0 text-muted-foreground" aria-hidden />}
              <span className="flex-1 truncate text-foreground">{q.tieu_de}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{TEN_TT[q.trang_thai]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
