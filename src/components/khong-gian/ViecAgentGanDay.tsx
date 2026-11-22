/**
 * "Việc của agent" dưới ô hỏi ở Home (22/11/2026) — học cột Tasks của ClickUp Home: vài việc gần nhất, một dòng mỗi
 * việc, bấm là tới. Khác ClickUp: chỉ việc AGENT đang làm cho công ty đang dùng, việc chờ bạn đứng đầu, có tiến độ.
 * Không có việc nào thì không hiện gì (không khối rỗng).
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleDot, CircleCheck, Hand } from 'lucide-react';
import { docBang, type DongViec } from '@/lib/goiSpace';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

const THU_TU: Record<string, number> = { can_ban: 0, cho_agent: 1, dang_lam: 1, cho: 1, xong: 2 };

export function chonViecHome(ds: DongViec[], companyId: string | null, toiDa = 5): DongViec[] {
  return ds.filter((v) => v.company_id === companyId && v.trang_thai !== 'huy')
    .sort((a, b) => (THU_TU[a.trang_thai] ?? 3) - (THU_TU[b.trang_thai] ?? 3) || b.cap_nhat_luc.localeCompare(a.cap_nhat_luc))
    .slice(0, toiDa);
}

export function ViecAgentGanDay({ lan = 0 }: { lan?: number }) {
  const [ds, setDs] = useState<DongViec[] | null>(null);
  useEffect(() => {
    let huy = false;
    Promise.all([idCongTyDangDung(), docBang()])
      .then(([id, b]) => { if (!huy) setDs(chonViecHome(b.viec, id)); })
      .catch(() => { if (!huy) setDs([]); });
    return () => { huy = true; };
  }, [lan]);
  if (!ds?.length) return null;
  return (
    <section aria-label="Việc của agent" className="mb-6 rounded-2xl border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Việc của agent</h2>
        <Link to="/dashboard/space" className="inline-flex items-center gap-1 text-xs font-medium text-primary">Mở Agentic AI Space <ArrowRight size={12} /></Link>
      </div>
      <ul className="divide-y">
        {ds.map((v) => (
          <li key={v.id}>
            <Link to="/dashboard/space" className="flex items-center gap-3 py-2 text-sm hover:opacity-80">
              {v.trang_thai === 'can_ban' ? <Hand size={16} className="shrink-0 text-amber-600" aria-label="Chờ bạn" />
                : v.trang_thai === 'xong' ? <CircleCheck size={16} className="shrink-0 text-muted-foreground" aria-label="Xong" />
                  : <CircleDot size={16} className="shrink-0 text-primary" aria-label="Agent đang làm" />}
              <span className="flex-1 truncate text-foreground">{v.tieu_de}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{v.trang_thai === 'can_ban' ? 'Chờ bạn' : `${v.buoc_xong}/${v.buoc_tong} bước`}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
