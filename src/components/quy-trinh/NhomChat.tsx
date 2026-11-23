/**
 * NHÓM CHAT CỦA WORKFLOW (24/11/2026) — cùng một phòng trò chuyện với chat riêng từng mèo, không chuyển lớp:
 * một workflow = một nhóm. Các việc (task) xếp thành dòng hội thoại: mèo nào xong việc thì tự lên tiếng, mèo kế tiếp
 * thả 👍 và nhận việc, bước kẹt thì Mèo Thư ký lo lắng nhờ người, người duyệt thì được cảm ơn, xong cả quy trình thì cả nhà ăn mừng.
 * Phản ứng do máy chủ suy ra từ trạng thái thật của lần chạy (không bịa, không tốn xu). Việc cần người (duyệt / làm tay)
 * hiện thành thẻ ngay trên ô nhắn. Muốn xem sơ đồ đầy đủ thì bấm "Mở khung".
 */
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleDashed, LayoutGrid, Loader2, OctagonAlert, Play, RotateCw, Send } from 'lucide-react';
import { Meo } from '@/components/agent/AvatarMeo';
import { tenMeo } from '@/components/quy-trinh/KhungVe';
import { khoaNgay, nhanNgay } from '@/lib/ngayChat';
import { chayQuyTrinh, suaQuyTrinh, xemQuyTrinh, xuLyBuoc, type ChiTietQuyTrinh } from '@/lib/goiQuyTrinh';

const gio = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
};
const TT_BUOC: Record<string, string> = { cho: 'Chờ', can_nguoi: 'Chờ người', chan: 'Bị chặn', xong: 'Xong', tu_choi: 'Cần sửa', bo_qua: 'Bỏ qua' };
const NUT = 'rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50';
const NUT_CHINH = 'inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900';

export default function NhomChat({ id, onVe, onMoKhung }: { id: string; onVe: () => void; onMoKhung: (id: string) => void }) {
  const [qt, setQt] = useState<ChiTietQuyTrinh | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [nhap, setNhap] = useState('');
  const [dang, setDang] = useState<string | null>(null);
  const cuoi = useRef<HTMLDivElement>(null);

  const tai = useCallback(async () => {
    try { setQt(await xemQuyTrinh(id)); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được nhóm.'); }
  }, [id]);
  useEffect(() => { setQt(null); setLoi(null); void tai(); }, [tai]);
  // Đang chạy thì làm mới đều để thấy các mèo lên tiếng.
  useEffect(() => {
    if (qt?.trang_thai !== 'dang_chay') return;
    const h = setInterval(() => void tai(), 3500);
    return () => clearInterval(h);
  }, [qt?.trang_thai, tai]);
  useEffect(() => { cuoi.current?.scrollIntoView?.({ block: 'end' }); }, [qt?.tin.length]);

  const lam = async (ten: string, f: () => Promise<void>) => {
    setDang(ten); setLoi(null);
    try { await f(); await tai(); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa thực hiện được.'); } finally { setDang(null); }
  };

  if (!qt) return <div className="m-auto p-6 text-sm text-muted-foreground">{loi ? <span role="alert" className="text-destructive">{loi}</span> : 'Đang mở nhóm…'}</div>;

  const dangChay = qt.trang_thai === 'dang_chay';
  const meoNhom = [...new Set(qt.do_thi.nut.map((n) => n.meo).filter((m): m is NonNullable<typeof m> => !!m))];
  const buoc = qt.trang_thai === 'nhap' ? {} : qt.lan_chay?.buoc ?? {};
  const viec = qt.do_thi.nut.filter((n) => n.loai !== 'kich_hoat');
  const canNguoi = viec.filter((n) => buoc[n.id]?.tt === 'can_nguoi');
  const trangThai = dangChay ? 'Đang chạy' : qt.trang_thai === 'xong' ? 'Đã xong' : qt.trang_thai === 'dung' ? 'Đã dừng' : 'Bản nháp';

  return (
    <>
      <header className="flex items-center gap-2 border-b px-3 py-2.5">
        <button type="button" onClick={onVe} aria-label="Về danh bạ" className="rounded-lg p-1.5 hover:bg-muted md:hidden"><ArrowLeft size={18} /></button>
        <span className="flex shrink-0 -space-x-2">{meoNhom.slice(0, 3).map((k) => <Meo key={k} khoa={k} co={32} ten={tenMeo(k)} />)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{qt.tieu_de}</p>
          <p className="truncate text-xs text-muted-foreground">{meoNhom.length} mèo · {trangThai}</p>
        </div>
        {!dangChay && (
          <button type="button" disabled={!!dang} onClick={() => void lam('chay', () => chayQuyTrinh(id))} className={NUT_CHINH}>
            {dang === 'chay' ? <Loader2 size={13} className="animate-spin" /> : qt.trang_thai === 'nhap' ? <Play size={13} /> : <RotateCw size={13} />}
            {qt.trang_thai === 'nhap' ? 'Chốt & chạy' : 'Chạy lại'}
          </button>
        )}
        <button type="button" onClick={() => onMoKhung(id)} aria-label="Mở khung workflow" className={`${NUT} inline-flex items-center gap-1.5`}><LayoutGrid size={13} /> Mở khung</button>
      </header>

      <ul aria-label="Việc trong nhóm" className="flex gap-1.5 overflow-x-auto border-b bg-background px-3 py-2 text-xs">
        {viec.map((n) => {
          const t = buoc[n.id]?.tt ?? 'cho';
          return (
            <li key={n.id} className="flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1" title={TT_BUOC[t]}>
              {t === 'xong' ? <Check size={12} className="text-emerald-600" aria-hidden /> : t === 'chan' || t === 'tu_choi' ? <OctagonAlert size={12} className="text-amber-600" aria-hidden /> : <CircleDashed size={12} className="text-muted-foreground" aria-hidden />}
              <span className="max-w-[10rem] truncate text-foreground">{n.ten}</span>
              <span className="text-muted-foreground">{TT_BUOC[t]}</span>
            </li>
          );
        })}
      </ul>

      <ol className="flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-3 text-sm" aria-live="polite">
        {qt.tin.length === 0 && <li className="pt-6 text-center text-xs text-muted-foreground">Nhóm mới lập. Bấm "Chốt & chạy" để các mèo bắt đầu làm; hoặc nhắn bên dưới để sửa quy trình.</li>}
        {qt.tin.map((t, i) => {
          const sang = i === 0 || khoaNgay(qt.tin[i - 1].luc) !== khoaNgay(t.luc);
          const ngay = sang ? <li className="flex justify-center"><span className="rounded-full bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">{nhanNgay(t.luc)}</span></li> : null;
          const cx = t.phan_ung ?? [];
          const chip = cx.length > 0 && (
            <div className="-mt-1 ml-2 flex flex-wrap gap-1">
              {cx.map((p) => <span key={`${p.meo}${p.emoji}`} className="inline-flex items-center gap-0.5 rounded-full border bg-background px-1.5 text-xs" aria-label={`${tenMeo(p.meo)} thả ${p.emoji}`} title={tenMeo(p.meo)}>{p.emoji}<Meo khoa={p.meo} co={14} ten={tenMeo(p.meo)} /></span>)}
            </div>
          );
          if (t.vai === 'nguoi') return (
            <Fragment key={t.id}>{ngay}<li className="ml-auto max-w-[80%]">
              <p className="rounded-2xl rounded-br-sm bg-slate-900 px-3 py-2 text-white dark:bg-white dark:text-slate-900">{t.noi_dung}</p>
              {chip}<p className="mt-0.5 text-right text-[10px] text-muted-foreground">{gio(t.luc)}</p>
            </li></Fragment>
          );
          if (!t.meo) return <Fragment key={t.id}>{ngay}<li className="mx-auto max-w-[85%] rounded-xl bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">{t.noi_dung}</li></Fragment>;
          return (
            <Fragment key={t.id}>{ngay}<li className="flex max-w-[88%] gap-2">
              <Meo khoa={t.meo} co={30} ten={tenMeo(t.meo)} />
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-muted-foreground">{tenMeo(t.meo)}</p>
                <p className="rounded-2xl rounded-tl-sm bg-background px-3 py-2 text-foreground shadow-sm">{t.noi_dung}</p>
                {chip}<p className="mt-0.5 text-[10px] text-muted-foreground">{gio(t.luc)}</p>
              </div>
            </li></Fragment>
          );
        })}
        {dangChay && canNguoi.length === 0 && <li className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" /> Các mèo đang làm…</li>}
        <div ref={cuoi} />
      </ol>

      {canNguoi.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center gap-2 border-t bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/30" data-testid="viec-can-ban">
          <span className="min-w-0 flex-1 text-foreground"><b>Đến lượt bạn:</b> {n.ten}{n.vai_tro ? ` (${n.vai_tro})` : ''}</span>
          {n.loai === 'duyet' ? (<>
            <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(id, n.id, 'duyet'))} className={NUT_CHINH}><Check size={13} /> Duyệt</button>
            <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(id, n.id, 'tu_choi'))} className={NUT}>Cần sửa</button>
          </>) : (
            <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(id, n.id, 'xong'))} className={NUT_CHINH}>Đánh dấu xong</button>
          )}
        </div>
      ))}
      {loi && <p role="alert" className="px-3 py-1 text-xs text-destructive">{loi}</p>}
      <form className="border-t p-2.5" onSubmit={(e) => { e.preventDefault(); const c = nhap.trim(); if (c && !dang) { setNhap(''); void lam('chat', () => suaQuyTrinh(id, c)); } }}>
        <div className="flex items-end gap-2 rounded-xl border bg-background p-2">
          <textarea value={nhap} onChange={(e) => setNhap(e.target.value)} rows={1} maxLength={1000} aria-label="Nhắn vào nhóm để sửa quy trình" disabled={dang === 'chat'}
            placeholder={dang === 'chat' ? 'Đang làm…' : 'Nhắn vào nhóm, ví dụ: thêm bước CFO duyệt nếu trên 200 triệu'}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
            className="max-h-24 flex-1 resize-none bg-transparent text-sm outline-none" />
          <button type="submit" disabled={!nhap.trim() || !!dang} aria-label="Gửi" className="rounded-full bg-slate-900 p-1.5 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"><Send size={15} /></button>
        </div>
      </form>
    </>
  );
}
