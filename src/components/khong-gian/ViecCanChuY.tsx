import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { NhomNangLuc, ViecHomNay } from '@/lib/troLy';

/**
 * VIỆC CẦN CHÚ Ý HÔM NAY (29/09/2026) — lấy nguyên danh sách máy chủ tính (`boi_canh.viec`, dữ liệu thật). Không
 * có việc nào thì KHÔNG hiện khung (không bịa việc). Mỗi việc có một nút làm ngay (hỏi MIMI đúng câu máy chủ gợi
 * ý) và, nếu có, lối mở thẳng module.
 */

const CTA: Record<NhomNangLuc, { nut: string; duong: string | null }> = {
  tro_ly: { nut: 'Kiểm tra', duong: '/dashboard/tac-tu' },
  chi_phi: { nut: 'Xem nguyên nhân', duong: '/dashboard/cashflow' },
  chung_tu: { nut: 'Hoàn thiện chứng từ', duong: '/dashboard/chung-tu' },
  ngan_hang: { nut: 'Kiểm tra', duong: '/dashboard/cashflow' },
  ai_token: { nut: 'Xem nguyên nhân', duong: null },
  bao_cao: { nut: 'Mở báo cáo', duong: '/dashboard/reports' },
  ket_noi: { nut: 'Kiểm tra', duong: '/dashboard/ket-noi' },
};

export function ViecCanChuY({ viec, soChoDuyet, onHoi, dangHoi }: {
  viec: ViecHomNay[];
  /** Khoản agent đang chờ duyệt (đã có thẻ duyệt riêng) — chỉ nhắc một dòng. */
  soChoDuyet: number;
  onHoi: (v: ViecHomNay) => void;
  dangHoi: boolean;
}) {
  if (!viec.length && !soChoDuyet) return null;
  return (
    <section aria-labelledby="viec-can-chu-y" className="mt-6 rounded-2xl border border-border/70 bg-card/80 p-4 shadow-[0_2px_10px_hsla(220,30%,20%,0.04)]">
      <h2 id="viec-can-chu-y" className="text-base font-semibold text-foreground">Việc cần chú ý hôm nay</h2>
      <ul className="mt-2 divide-y divide-border/50">
        {soChoDuyet > 0 && (
          <li className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <span className="flex items-center gap-2 text-sm text-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full bg-mimi-amber" aria-hidden /> {soChoDuyet} khoản chi đang chờ bạn duyệt
            </span>
            <Link to="/dashboard/tac-tu?tab=yeu-cau" className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-accent">Kiểm tra</Link>
          </li>
        )}
        {viec.map((v) => {
          const c = CTA[v.nhom];
          return (
            <li key={v.khoa} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${v.muc_do === 'can_chu_y' ? 'bg-mimi-amber' : 'bg-muted-foreground/40'}`} aria-hidden />
                {v.cau}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                <button type="button" disabled={dangHoi} onClick={() => onHoi(v)}
                  className="rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50">{c.nut}</button>
                {c.duong && (
                  <Link to={c.duong} aria-label={`Mở trang cho: ${v.cau}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
                    <ChevronRight size={15} />
                  </Link>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
