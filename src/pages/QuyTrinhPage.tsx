/**
 * Workflow trong Agentic AI Space (/dashboard/space/:id, 22/11/2026).
 * Giữa: khung vẽ động. Phải: chat dọc để SỬA workflow bằng lời (chat chính thu lại thành cột này). Chốt rồi mới chạy.
 * Dưới khung: chi tiết bước đang chọn — tài nguyên (Gmail người phụ trách / API / MCP) và nút xử lý khi đang chạy;
 * hiệu suất đo từ lần chạy thật, so giữa ba phương án.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Play, RotateCw, Send } from 'lucide-react';
import { KhungVe } from '@/components/quy-trinh/KhungVe';
import {
  chayQuyTrinh, doiPhuongAn, ganEmail, suaQuyTrinh, xemQuyTrinh, xuLyBuoc,
  type ChiTietQuyTrinh, type HieuSuat, type PhuongAn,
} from '@/lib/goiQuyTrinh';

const TEN_PA: Record<PhuongAn, string> = { nguoi: 'Người làm', nguoi_ai: 'Người + AI', ai: 'AI tối đa' };
const TEN_LV: Record<string, string> = { tai_chinh: 'Tài chính & thuế', thanh_toan: 'Thanh toán qua agent', bao_mat: 'Bảo mật', ho_so: 'Hồ sơ', nhan_su: 'Nhân sự', cong_viec: 'Công việc' };
const TEN_TT: Record<string, string> = { dang: 'Đang chạy', can_ban: 'Chờ người', chan: 'Bị chặn — cần kết nối hoặc làm tay', xong: 'Xong', dung: 'Đã dừng (bị từ chối)' };

export const thoiGian = (ms: number | null) => {
  if (ms === null) return 'chưa xong';
  if (ms < 60_000) return `${Math.round(ms / 1000)} giây`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} phút`;
  return `${(Math.round(ms / 360_000) / 10).toLocaleString('vi-VN')} giờ`;
};

/** Trung bình theo phương án trên các lần chạy XONG. Chưa chạy → không có dòng (không bịa số). */
export function soSanhHieuSuat(ls: { phuong_an: PhuongAn; trang_thai: string; hieu_suat: HieuSuat }[]) {
  const ra: Partial<Record<PhuongAn, { lan: number; tong_ms: number; cho_nguoi_ms: number }>> = {};
  for (const l of ls) {
    if (l.trang_thai !== 'xong' || l.hieu_suat.tong_ms === null) continue;
    const r = (ra[l.phuong_an] ??= { lan: 0, tong_ms: 0, cho_nguoi_ms: 0 });
    r.lan++; r.tong_ms += l.hieu_suat.tong_ms; r.cho_nguoi_ms += l.hieu_suat.cho_nguoi_ms;
  }
  return Object.entries(ra).map(([pa, r]) => ({ pa: pa as PhuongAn, lan: r!.lan, tb_ms: r!.tong_ms / r!.lan, tb_nguoi_ms: r!.cho_nguoi_ms / r!.lan }));
}

export default function QuyTrinhPage() {
  const { id = '' } = useParams();
  const [qt, setQt] = useState<ChiTietQuyTrinh | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [nhan, setNhan] = useState('');
  const [dang, setDang] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const cuoi = useRef<HTMLDivElement>(null);

  const tai = useCallback(async () => {
    try { setQt(await xemQuyTrinh(id)); setLoi(null); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được workflow.'); }
  }, [id]);
  useEffect(() => { void tai(); }, [tai]);
  useEffect(() => { cuoi.current?.scrollIntoView?.({ block: 'end' }); }, [qt?.tin.length]);

  const lam = async (ten: string, f: () => Promise<void>) => {
    setDang(ten); setLoi(null);
    try { await f(); await tai(); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa thực hiện được.'); } finally { setDang(null); }
  };

  const nut = qt?.do_thi.nut.find((n) => n.id === chon) ?? null;
  const tn = qt?.tai_nguyen.find((t) => t.nut_id === chon) ?? null;
  const buoc = chon ? qt?.lan_chay?.buoc[chon] : undefined;
  useEffect(() => { setEmail(tn?.kieu === 'gmail' && tn.co_san ? tn.can : ''); }, [tn?.nut_id, tn?.can, tn?.co_san, tn?.kieu]);

  if (!qt) return <div className="p-6 text-sm text-muted-foreground">{loi ? <span role="alert" className="text-destructive">{loi}</span> : 'Đang mở workflow…'}</div>;
  const nhap = qt.trang_thai === 'nhap';
  const ss = soSanhHieuSuat(qt.lich_su);

  return (
    <div className="-m-4 flex h-[calc(100vh-4rem)] min-h-[560px] lg:-m-6">
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <header className="flex flex-wrap items-center gap-3">
          <Link to="/dashboard/space" aria-label="Về Agentic AI Space" className="rounded-lg p-1.5 hover:bg-muted"><ArrowLeft size={18} /></Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-foreground">{qt.tieu_de}</h1>
            <p className="truncate text-xs text-muted-foreground">{qt.ten_khach} · {TEN_LV[qt.linh_vuc]} · {qt.nguon === 'ai' ? 'AI dựng' : 'Dựng từ mẫu'}</p>
          </div>
          <div role="radiogroup" aria-label="Phương án" className="flex gap-1 rounded-xl bg-muted p-1">
            {(['nguoi', 'nguoi_ai', 'ai'] as PhuongAn[]).map((pa) => {
              const s = qt.so_sanh[pa];
              return (
                <button key={pa} type="button" role="radio" aria-checked={qt.phuong_an === pa} disabled={!nhap || !!dang}
                  onClick={() => void lam('pa', () => doiPhuongAn(qt.id, pa))}
                  className={`rounded-lg px-3 py-1 text-left text-xs transition disabled:cursor-not-allowed ${qt.phuong_an === pa ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  <span className="block">{TEN_PA[pa]}</span>
                  <span className="block text-[10px] text-muted-foreground">agent {s.agent} · người {s.nguoi} · duyệt {s.duyet}</span>
                </button>
              );
            })}
          </div>
          {nhap || qt.trang_thai === 'xong' || qt.trang_thai === 'dung' ? (
            <button type="button" disabled={!!dang} onClick={() => void lam('chay', () => chayQuyTrinh(qt.id))}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {dang === 'chay' ? <Loader2 size={16} className="animate-spin" /> : nhap ? <Play size={16} /> : <RotateCw size={16} />}
              {nhap ? 'Chốt & chạy' : 'Chạy lại'}
            </button>
          ) : <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{TEN_TT[qt.trang_thai_chay ?? 'dang']}</span>}
        </header>

        {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

        <div className="min-h-[300px] flex-1">
          <KhungVe d={qt.do_thi} chay={qt.trang_thai === 'nhap' ? null : qt.lan_chay} chon={chon} onChon={setChon} />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <section aria-label="Chi tiết bước" className="rounded-2xl border bg-card p-4 text-sm">
            {!nut ? <p className="text-muted-foreground">Bấm một bước trên khung để xem chi tiết, gán người phụ trách hoặc xử lý khi đang chạy.</p> : (
              <div className="space-y-2">
                <p className="font-semibold text-foreground">{nut.ten}</p>
                {nut.mo_ta && <p className="text-muted-foreground">{nut.mo_ta}</p>}
                <p className="text-xs text-muted-foreground">
                  {nut.loai === 'duyet' ? 'Người duyệt' : nut.lam === 'agent' ? 'Agent làm' : 'Người làm'}
                  {nut.cong_cu ? ` · công cụ ${nut.cong_cu}` : ''}{nut.them_boi_luat ? ' · luật an toàn tự thêm' : ''}
                </p>
                {tn?.kieu === 'gmail' && (
                  <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); void lam('gan', () => ganEmail(qt.id, nut.id, email)); }}>
                    <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-muted-foreground">Gmail người phụ trách
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="để trống: bạn phụ trách"
                        className="rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground" />
                    </label>
                    <button type="submit" disabled={!!dang} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted">Lưu</button>
                  </form>
                )}
                {tn && tn.kieu !== 'gmail' && (
                  <p className="text-xs">
                    {tn.kieu === 'mcp' ? 'MCP' : 'API'} <code>{tn.can}</code>: {tn.co_san ? <span className="text-emerald-600">có sẵn trong MIMI</span>
                      : <><span className="text-amber-600">cần kết nối</span> — <Link to="/dashboard/ket-noi" className="underline">mở Kết nối</Link></>}
                  </p>
                )}
                {buoc?.ket_qua && <p className="whitespace-pre-line rounded-lg bg-muted p-2 text-xs text-foreground">{buoc.ket_qua}</p>}
                {(buoc?.tt === 'can_nguoi' || buoc?.tt === 'chan') && (
                  <div className="flex flex-wrap gap-2">
                    {nut.loai === 'duyet' ? (<>
                      <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(qt.id, nut.id, 'duyet'))} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">Duyệt</button>
                      <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(qt.id, nut.id, 'tu_choi'))} className="rounded-lg border px-3 py-1.5 text-sm text-destructive">Từ chối</button>
                    </>) : (
                      <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(qt.id, nut.id, 'xong'))} className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                        {buoc.tt === 'chan' ? 'Làm tay bước này' : 'Đánh dấu xong'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-label="Hiệu suất" className="rounded-2xl border bg-card p-4 text-sm">
            <p className="mb-2 font-semibold text-foreground">Hiệu suất</p>
            {qt.hieu_suat ? (
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <li>Tổng thời gian: <b>{thoiGian(qt.hieu_suat.tong_ms)}</b></li>
                <li>Thời gian chờ người: <b>{thoiGian(qt.hieu_suat.cho_nguoi_ms)}</b></li>
                <li>Bước agent làm: <b>{qt.hieu_suat.buoc_agent}</b></li>
                <li>Bước người làm: <b>{qt.hieu_suat.buoc_nguoi}</b>{qt.hieu_suat.lam_tay ? ` (làm tay thay agent ${qt.hieu_suat.lam_tay})` : ''}</li>
              </ul>
            ) : <p className="text-xs text-muted-foreground">Chưa chạy lần nào — số đo hiện sau lần chạy đầu, không ước đoán.</p>}
            {ss.length > 0 && (
              <table className="mt-3 w-full text-xs">
                <caption className="sr-only">So sánh phương án</caption>
                <thead><tr className="text-left text-muted-foreground"><th className="font-medium">Phương án</th><th className="font-medium">Lần xong</th><th className="font-medium">TB tổng</th><th className="font-medium">TB chờ người</th></tr></thead>
                <tbody>{ss.map((r) => <tr key={r.pa}><td>{TEN_PA[r.pa]}</td><td>{r.lan}</td><td>{thoiGian(r.tb_ms)}</td><td>{thoiGian(r.tb_nguoi_ms)}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        </div>
      </div>

      <aside aria-label="Chat sửa workflow" className="flex w-full max-w-[360px] shrink-0 flex-col border-l bg-card">
        <p className="border-b px-4 py-3 text-sm font-semibold text-foreground">Chat với MIMI</p>
        <ol className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {qt.tin.map((t) => (
            <li key={t.id} className={`max-w-[90%] rounded-xl px-3 py-2 ${t.vai === 'nguoi' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>{t.noi_dung}</li>
          ))}
          {dang === 'sua' && <li className="flex items-center gap-2 text-muted-foreground"><Loader2 size={14} className="animate-spin" /> MIMI đang sửa…</li>}
          <div ref={cuoi} />
        </ol>
        <form className="border-t p-3" onSubmit={(e) => { e.preventDefault(); const c = nhan.trim(); if (c) { setNhan(''); void lam('sua', () => suaQuyTrinh(qt.id, c)); } }}>
          <div className="flex items-end gap-2 rounded-xl border bg-background p-2">
            <textarea value={nhan} onChange={(e) => setNhan(e.target.value)} rows={2} maxLength={1000} aria-label="Nhắn MIMI để sửa workflow"
              placeholder={nhap ? 'Ví dụ: thêm bước CFO duyệt nếu khoản trên 200 triệu' : 'Workflow đã chạy — chỉ xem'}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
              className="flex-1 resize-none bg-transparent text-sm outline-none" />
            <button type="submit" disabled={!nhan.trim() || !!dang} aria-label="Gửi" className="rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"><Send size={16} /></button>
          </div>
        </form>
      </aside>
    </div>
  );
}
