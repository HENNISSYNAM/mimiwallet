import { AlertTriangle, CheckCircle2, CircleDashed, Recycle } from 'lucide-react';
import type { DanAgent } from '@/lib/troLy';

/**
 * Báo cáo một lần chạy của đàn agent (`TraLoi.dan_agent`). Dùng chung cho Trợ lý MIMI, Tổng quan và pet.
 *
 * Chỉ vẽ đúng thứ máy chủ trả: agent nào THẬT SỰ chạy, agent nào lỗi, bao nhiêu lượt mô hình, giới hạn
 * gì. Không có agent nào "đang nghĩ" giả; không có số nào tự bịa ra khi máy chủ không gửi.
 */
const TEN_TRANG_THAI_CHAY: Record<DanAgent['trang_thai'], string> = {
  hoan_tat: 'Hoàn tất',
  mot_phan: 'Xong một phần',
  can_bo_sung: 'Cần bổ sung dữ liệu',
};

const giay = (ms: number) => `${(ms / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giây`;

function NhanTacVu({ tt }: { tt: DanAgent['tac_vu'][number]['trang_thai'] }) {
  if (tt === 'hoan_tat') return <span className="inline-flex items-center gap-1 text-xs text-mimi-green"><CheckCircle2 size={13} /> Hoàn tất</span>;
  if (tt === 'loi') return <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertTriangle size={13} /> Lỗi</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-mimi-amber"><CircleDashed size={13} /> Cần bổ sung</span>;
}

export function DanAgentBaoCao({ dan, gon = false }: { dan: DanAgent; gon?: boolean }) {
  const tn = dan.tai_nguyen;
  return (
    <section aria-label="Đàn agent đã chạy" className="rounded-xl border border-border bg-card/60 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">Đàn agent đã chạy</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${dan.trang_thai === 'hoan_tat' ? 'bg-mimi-green/10 text-mimi-green' : 'bg-mimi-amber/15 text-mimi-amber'}`}>
          {TEN_TRANG_THAI_CHAY[dan.trang_thai]}
        </span>
      </div>

      {!gon && (
        <ul className="mt-3 divide-y divide-border/60">
          {dan.tac_vu.map((tv, i) => (
            <li key={`${tv.agent_id}-${tv.nang_luc}-${i}`} className="py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-foreground">{tv.ten}</span>
                <span className="flex items-center gap-3">
                  {tv.tai_su_dung && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Recycle size={12} /> Dùng lại dữ liệu đã đọc</span>}
                  <span className="text-xs tabular-nums text-muted-foreground">{giay(tv.thoi_gian_ms)}</span>
                  <NhanTacVu tt={tv.trang_thai} />
                </span>
              </div>
              {tv.cau && <p className="mt-0.5 text-xs text-muted-foreground">{tv.cau}</p>}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground" aria-label="Tài nguyên đã dùng">
        {tn.so_agent} agent · {tn.so_tac_vu} tác vụ · {tn.so_nguon_doc} nguồn đã đọc ·{' '}
        {tn.so_luot_mo_hinh > 0 ? `${tn.so_luot_mo_hinh} lượt gọi mô hình` : 'không gọi mô hình'}
        {tn.so_luot_tai_su_dung > 0 && ` · ${tn.so_luot_tai_su_dung} tác vụ dùng lại dữ liệu đã đọc`} · tối đa {tn.gioi_han_song_song} việc song song
      </p>

      {dan.gioi_han.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground" aria-label="Giới hạn">
          {dan.gioi_han.map((g) => <li key={g}>{g}</li>)}
        </ul>
      )}

      <p className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
        Bản nháp trung gian — kế toán cần xác nhận tài khoản và chứng từ. Không phải báo cáo tài chính pháp định, không phải kiểm toán độc lập.
      </p>
    </section>
  );
}
