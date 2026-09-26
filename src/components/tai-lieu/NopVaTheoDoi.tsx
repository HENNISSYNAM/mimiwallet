import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ghiDaNop, ghiKetQuaNop, huyNop, TEN_TRANG_THAI_NOP, THU_TU_NOP, XEM_TRUOC_NHAN, xacNhanNop, chuanBiNop, type YeuCauNop,
} from '@/lib/hanhTrinh';

/**
 * Trung tâm "Nộp & theo dõi" — Prompt 5 mục 4, 29–31.
 *
 * Mỗi yêu cầu hiện ĐÚNG bước tiếp theo: xác nhận (kèm bảy mục xem trước) → bạn tự nộp trên Cổng và ghi
 * biên nhận → ghi thông báo kết quả của cơ quan. Không bước nào tự chạy; "đã nộp" không phải "xong".
 */
const loiCua = (e: unknown) => (e instanceof Error ? e.message : 'Có lỗi. Thử lại sau ít phút.');
const nut = 'h-9 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50';
const o = 'h-9 rounded-lg border border-border bg-card px-3 text-xs';

function Dong({ y, duocXacNhan, onDoi }: { y: YeuCauNop; duocXacNhan: boolean; onDoi: (y: YeuCauNop) => void }) {
  const [dang, setDang] = useState(false);
  const [bienNhan, setBienNhan] = useState('');
  const [ngay, setNgay] = useState('');
  const [thongBao, setThongBao] = useState('');
  const chay = async (f: () => Promise<YeuCauNop>, cau: string) => {
    setDang(true);
    try { onDoi(await f()); toast.success(cau); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); }
  };
  const xt = y.xem_truoc as Record<string, string>;
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{xt.tai_lieu ?? 'Hồ sơ'}</p>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">{TEN_TRANG_THAI_NOP[y.trang_thai] ?? y.trang_thai}</span>
      </div>

      {y.trang_thai === 'needs_confirmation' && (
        <div className="space-y-2 rounded-lg bg-accent/40 p-3 text-xs">
          <dl className="grid gap-1.5 sm:grid-cols-[160px_1fr]">
            {XEM_TRUOC_NHAN.map(([k, nhan]) => xt[k] ? [<dt key={`${k}t`} className="font-medium text-foreground">{nhan}</dt>, <dd key={`${k}d`} className="text-muted-foreground">{xt[k]}</dd>] : null)}
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            {duocXacNhan
              ? <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => xacNhanNop(y.id), 'Đã xác nhận. Giờ bạn nộp trên Cổng dịch vụ công rồi ghi biên nhận.')}>{dang ? <Loader2 size={12} className="animate-spin" /> : 'Tôi đã đọc và xác nhận'}</button>
              : <span className="text-muted-foreground">Chủ doanh nghiệp hoặc quản trị xác nhận bước này.</span>}
            <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => huyNop(y.id), 'Đã huỷ yêu cầu.')}>Huỷ</button>
          </div>
        </div>
      )}

      {y.trang_thai === 'needs_validation' && (
        <div className="space-y-2 text-xs">
          {(y.loi_kiem ?? []).map((l) => <p key={l} className="text-mimi-amber">{l}</p>)}
          {y.tai_lieu_id && <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => chuanBiNop(y.tai_lieu_id!), 'Đã khoá bản mới — xác nhận lại.')}>Chuẩn bị lại với bản mới</button>}
        </div>
      )}

      {y.trang_thai === 'ready' && (
        <form className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-end" onSubmit={(e) => { e.preventDefault(); void chay(() => ghiDaNop(y.id, bienNhan, ngay), 'Đã ghi. MIMI giữ việc mở tới khi có thông báo của cơ quan thuế.'); }}>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Mã biên nhận trên Cổng</span>
            <input aria-label="Mã biên nhận" value={bienNhan} onChange={(e) => setBienNhan(e.target.value)} maxLength={100} className={o} /></label>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">Ngày nộp</span>
            <input aria-label="Ngày nộp" type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} className={o} /></label>
          <button type="submit" className={nut} disabled={dang || bienNhan.trim().length < 3 || !ngay}>Tôi đã nộp</button>
        </form>
      )}

      {(y.trang_thai === 'waiting_external' || y.trang_thai === 'submitted') && (
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground">Nộp ngày {y.ngay_nop ?? '—'}, biên nhận {y.tham_chieu_ngoai ?? '—'} (bạn ghi). Chưa có thông báo của cơ quan thuế thì chưa phải là xong.</p>
          <input aria-label="Thông báo của cơ quan thuế" value={thongBao} onChange={(e) => setThongBao(e.target.value)} maxLength={1000}
            placeholder="Số và ngày thông báo, ví dụ: TB 123/TB-CT ngày 20/10/2026" className={`${o} w-full`} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={nut} disabled={dang || thongBao.trim().length < 5} onClick={() => void chay(() => ghiKetQuaNop(y.id, 'accepted', thongBao), 'Đã ghi: được chấp nhận. Việc đã đóng.')}>Được chấp nhận</button>
            <button type="button" className={nut} disabled={dang || thongBao.trim().length < 5} onClick={() => void chay(() => ghiKetQuaNop(y.id, 'rejected', thongBao), 'Đã ghi: không được chấp nhận. MIMI giữ việc mở và đẩy lên gấp.')}>Không được chấp nhận</button>
          </div>
        </div>
      )}

      {y.ket_qua_co_quan && <p className="text-xs text-muted-foreground">Kết quả: {y.ket_qua_co_quan} (bạn ghi)</p>}
    </li>
  );
}

export default function NopVaTheoDoi({ ds, vaiTro, onDoi }: { ds: YeuCauNop[]; vaiTro: string; onDoi: (y: YeuCauNop) => void }) {
  if (!ds.length) return null;
  const xep = [...ds].sort((a, b) => THU_TU_NOP.indexOf(a.trang_thai) - THU_TU_NOP.indexOf(b.trang_thai));
  return (
    <section aria-labelledby="nop-theo-doi" className="rounded-2xl border border-border bg-card">
      <h2 id="nop-theo-doi" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Nộp & theo dõi</h2>
      <ul className="divide-y divide-border">
        {xep.map((y) => <Dong key={y.id} y={y} duocXacNhan={vaiTro === 'chu_so_huu' || vaiTro === 'quan_tri'} onDoi={onDoi} />)}
      </ul>
    </section>
  );
}
