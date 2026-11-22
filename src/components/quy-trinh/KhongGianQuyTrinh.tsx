/**
 * KHÔNG GIAN WORKFLOW trên MỘT trang (22/11/2026) — mở ngay trong chat chính / Space, không chuyển lớp.
 * Trái: "Bước" (thêm bước · sửa bước đang chọn · chọn mèo · dán API key / MCP · xử lý khi chạy) · "Kiểm chuẩn" (chuẩn nghề,
 * cảnh báo, MIMI đề xuất chỉnh — áp một cú bấm) · "Hiệu suất" (số đo thật). Giữa: khung vẽ. Phải: chat sửa bằng lời.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot, Check, GitBranch, Loader2, Play, Plug, RotateCw, Send, ShieldCheck, Trash2, User, X } from 'lucide-react';
import { KhungVe, nhanPhu, tenMeo } from '@/components/quy-trinh/KhungVe';
import { Meo } from '@/components/agent/AvatarMeo';
import {
  chayQuyTrinh, doiPhuongAn, ganEmail, ketNoi, suaQuyTrinh, suaTay, xemQuyTrinh, xuLyBuoc,
  type ChiTietQuyTrinh, type GoiY, type HieuSuat, type PhuongAn,
} from '@/lib/goiQuyTrinh';

export const TEN_PA: Record<PhuongAn, string> = { nguoi: 'Người làm', nguoi_ai: 'Người + AI', ai: 'AI tối đa' };
const TEN_TT: Record<string, string> = { dang: 'Đang chạy', can_ban: 'Chờ người', chan: 'Bị chặn', xong: 'Xong', dung: 'Đã dừng' };
const MEO_DS: [string, string][] = [
  ['phan_loai', 'Phân loại'], ['thue', 'Thuế'], ['dong_tien', 'Dòng tiền'], ['ho_so', 'Hồ sơ'], ['bao_ve', 'Bảo vệ'], ['doi_soat', 'Đối soát'],
  ['cong_no', 'Công nợ'], ['mua_hang', 'Mua hàng'], ['luong', 'Lương'], ['tuan_thu', 'Tuân thủ'], ['bao_cao', 'Báo cáo'], ['thu_ky', 'Thư ký'],
];
const TAC_DONG: [string, string][] = [['doc', 'Đọc'], ['de_xuat', 'Đề xuất'], ['ghi', 'Ghi dữ liệu'], ['chuyen_tien', 'Chuyển tiền'], ['nop', 'Nộp cơ quan'], ['gui_ra_ngoai', 'Gửi ra ngoài'], ['xoa', 'Xoá']];
const THEM: { lam: 'agent' | 'nguoi' | 'duyet'; ten: string; mo: string; icon: typeof Bot }[] = [
  { lam: 'agent', ten: 'Mèo agent', mo: 'AI làm bằng công cụ', icon: Bot },
  { lam: 'nguoi', ten: 'Người làm', mo: 'Giao cho một người', icon: User },
  { lam: 'duyet', ten: 'Người duyệt', mo: 'Có người ký duyệt', icon: ShieldCheck },
];

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

const O = 'w-full rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-blue-500';
const NUT = 'inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50';
const NUT_CHINH = 'inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900';

function DangLam() {
  return <span aria-label="Đang làm" className="inline-block h-7 w-7 shrink-0 animate-spin rounded-full" style={{ background: 'conic-gradient(#f43f5e, #a855f7, #3b82f6, #f43f5e)', animationDuration: '1.4s' }}>
    <span className="m-[5px] block h-[18px] w-[18px] rounded-full bg-background" /></span>;
}

export default function KhongGianQuyTrinh({ id, onDong }: { id: string; onDong: () => void }) {
  const [qt, setQt] = useState<ChiTietQuyTrinh | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [tab, setTab] = useState<'buoc' | 'chuan' | 'hieu_suat'>('buoc');
  const [nhan, setNhan] = useState('');
  const [dang, setDang] = useState<string | null>(null);
  const [moChat, setMoChat] = useState(true);
  const cuoi = useRef<HTMLDivElement>(null);

  const tai = useCallback(async () => {
    try { setQt(await xemQuyTrinh(id)); setLoi(null); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được workflow.'); }
  }, [id]);
  useEffect(() => { void tai(); }, [tai]);
  useEffect(() => { cuoi.current?.scrollIntoView?.({ block: 'end' }); }, [qt?.tin.length, dang]);

  const lam = async (ten: string, f: () => Promise<void>) => {
    setDang(ten); setLoi(null);
    try { await f(); await tai(); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa thực hiện được.'); } finally { setDang(null); }
  };
  const thaoTac = (t: Record<string, unknown>) => lam('sua', () => suaTay(id, t));

  if (!qt) return <div className="p-6 text-sm text-muted-foreground">{loi ? <span role="alert" className="text-destructive">{loi}</span> : 'Đang mở workflow…'}</div>;

  const dangChay = qt.trang_thai === 'dang_chay';
  const nut = qt.do_thi.nut.find((n) => n.id === chon) ?? null;
  const canCauHinh = qt.tai_nguyen.filter((t) => !t.co_san && t.kieu !== 'gmail').length;
  const loiChuan = qt.chuan.filter((c) => c.muc === 'loi').length;
  const themSau = (sauId: string, lamGi: 'agent' | 'nguoi' | 'duyet' = 'agent') =>
    thaoTac({ thao_tac: 'them_sau', nut_id: sauId, ten: lamGi === 'duyet' ? 'Người duyệt' : lamGi === 'nguoi' ? 'Việc của người' : 'Việc của mèo agent', lam: lamGi });
  const apGoiY = (g: GoiY) => {
    const h = g.hanh_dong;
    if (h.thao_tac === 'doi_phuong_an') return lam('pa', () => doiPhuongAn(id, h.phuong_an as PhuongAn));
    if (h.thao_tac === 'ket_noi') { setChon(String(h.nut_id)); setTab('buoc'); return Promise.resolve(); }
    return thaoTac(h);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-3" data-testid="khong-gian-qt">
      <header className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onDong} aria-label="Đóng workflow" className="rounded-lg p-1.5 hover:bg-muted"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-foreground">{qt.tieu_de}</h1>
          <p className="truncate text-xs text-muted-foreground">{qt.ten_khach} · {qt.nguon === 'ai' ? 'AI dựng' : 'Từ thư viện'}</p>
        </div>
        {(canCauHinh > 0 || loiChuan > 0) && (
          <button type="button" onClick={() => { setTab(canCauHinh ? 'buoc' : 'chuan'); const t = qt.tai_nguyen.find((x) => !x.co_san && x.kieu !== 'gmail'); if (t) setChon(t.nut_id); }}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">!</span>
            {canCauHinh ? `${canCauHinh} bước cần cấu hình` : `${loiChuan} lỗi chuẩn nghề`}
          </button>
        )}
        <div role="radiogroup" aria-label="Phương án" className="flex gap-0.5 rounded-lg bg-muted p-0.5">
          {(['nguoi', 'nguoi_ai', 'ai'] as PhuongAn[]).map((pa) => (
            <button key={pa} type="button" role="radio" aria-checked={qt.phuong_an === pa} disabled={dangChay || !!dang}
              onClick={() => void lam('pa', () => doiPhuongAn(id, pa))} title={`mèo ${qt.so_sanh[pa].agent} · người ${qt.so_sanh[pa].nguoi} · duyệt ${qt.so_sanh[pa].duyet}`}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${qt.phuong_an === pa ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {TEN_PA[pa]}
            </button>
          ))}
        </div>
        {dangChay ? <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">{TEN_TT[qt.trang_thai_chay ?? 'dang']}</span> : (
          <button type="button" disabled={!!dang} onClick={() => void lam('chay', () => chayQuyTrinh(id))} className={NUT_CHINH}>
            {dang === 'chay' ? <Loader2 size={15} className="animate-spin" /> : qt.trang_thai === 'nhap' ? <Play size={15} /> : <RotateCw size={15} />}
            {qt.trang_thai === 'nhap' ? 'Chốt & chạy' : 'Chạy lại'}
          </button>
        )}
        <button type="button" onClick={() => setMoChat((x) => !x)} className={NUT} aria-pressed={moChat}>{moChat ? 'Ẩn chat' : 'Chat'}</button>
      </header>
      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      <div className="flex min-h-0 flex-1 gap-3">
        <aside aria-label="Bảng bước" className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card">
          <div role="tablist" className="flex gap-0.5 border-b p-1.5">
            {([['buoc', 'Bước'], ['chuan', `Kiểm chuẩn${qt.chuan.length ? ` (${qt.chuan.length})` : ''}`], ['hieu_suat', 'Hiệu suất']] as const).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${tab === k ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
            ))}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
            {tab === 'buoc' && (nut ? (
              <BuocDangChon key={nut.id} qt={qt} nutId={nut.id} dang={dang} lam={lam} thaoTac={thaoTac} onBo={() => setChon(null)} />
            ) : (
              <>
                <p className="text-xs font-medium text-muted-foreground">Thêm bước {chon ? '' : 'vào cuối'}</p>
                {THEM.map(({ lam: l, ten, mo, icon: Icon }) => (
                  <button key={l} type="button" disabled={dangChay || !!dang} onClick={() => void themSau(qt.do_thi.nut.filter((n) => !n.them_boi_luat).at(-1)!.id, l)}
                    className="flex w-full items-center gap-3 rounded-xl border bg-background p-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted"><Icon size={16} /></span>
                    <span><span className="block font-medium">{ten}</span><span className="block text-xs text-muted-foreground">{mo}</span></span>
                  </button>
                ))}
                <p className="pt-2 text-xs text-muted-foreground">Bấm một bước trên khung để sửa: tên, ai làm, chọn mèo, vai trò, kết nối API / MCP. Rê chuột vào bước rồi bấm "+" để chèn bước ngay bên dưới.</p>
              </>
            ))}
            {tab === 'chuan' && (
              <>
                {qt.kien_thuc.length > 0 && <div><p className="mb-1 text-xs font-medium text-muted-foreground">Theo chuẩn</p><ul className="list-disc space-y-0.5 pl-4 text-xs">{qt.kien_thuc.map((k) => <li key={k}>{k}</li>)}</ul></div>}
                {qt.chuan.length === 0 ? <p className="text-xs text-emerald-700">Không thấy lỗi chuẩn nghề.</p> : (
                  <ul className="space-y-1.5">{qt.chuan.map((c, i) => (
                    <li key={i}><button type="button" onClick={() => { if (c.nut_id) { setChon(c.nut_id); setTab('buoc'); } }}
                      className={`w-full rounded-lg border-l-2 bg-muted/50 px-2.5 py-1.5 text-left text-xs ${c.muc === 'loi' ? 'border-red-500' : 'border-amber-400'}`}>{c.cau}</button></li>
                  ))}</ul>
                )}
                {qt.goi_y.length > 0 && <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">MIMI đề xuất chỉnh</p>
                  {qt.goi_y.map((g) => (
                    <div key={g.khoa} className="rounded-lg border p-2 text-xs">
                      <p>{g.cau}</p>
                      <button type="button" disabled={dangChay || !!dang} onClick={() => void apGoiY(g)} className="mt-1.5 rounded-md bg-muted px-2 py-0.5 font-medium hover:bg-muted/70">Áp dụng</button>
                    </div>
                  ))}
                </div>}
              </>
            )}
            {tab === 'hieu_suat' && <HieuSuatBang qt={qt} />}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <KhungVe d={qt.do_thi} chay={qt.trang_thai === 'nhap' ? null : qt.lan_chay} chon={chon}
            onChon={(x) => { setChon(x); setTab('buoc'); }} onThem={dangChay ? undefined : (x) => void themSau(x)} choSua={!dangChay} />
        </div>

        {moChat && (
          <aside aria-label="Chat sửa workflow" className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border bg-card">
            <ol className="flex-1 space-y-2.5 overflow-y-auto p-3 text-sm">
              {qt.tin.map((t) => (
                <li key={t.id} className={`max-w-[92%] rounded-xl px-3 py-2 ${t.vai === 'nguoi' ? 'ml-auto bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-muted text-foreground'}`}>{t.noi_dung}</li>
              ))}
              <div ref={cuoi} />
            </ol>
            <form className="border-t p-2.5" onSubmit={(e) => { e.preventDefault(); const c = nhan.trim(); if (c && !dang) { setNhan(''); void lam('chat', () => suaQuyTrinh(id, c)); } }}>
              <div className="flex items-end gap-2 rounded-xl border bg-background p-2">
                <textarea value={nhan} onChange={(e) => setNhan(e.target.value)} rows={2} maxLength={1000} aria-label="Nhắn MIMI để sửa workflow" disabled={dang === 'chat'}
                  placeholder={dang === 'chat' ? 'Đang làm…' : 'Ví dụ: thêm bước CFO duyệt nếu khoản trên 200 triệu'}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
                  className="flex-1 resize-none bg-transparent text-sm outline-none" />
                {dang === 'chat' ? <DangLam /> : (
                  <button type="submit" disabled={!nhan.trim() || !!dang} aria-label="Gửi" className="rounded-full bg-slate-900 p-1.5 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"><Send size={15} /></button>
                )}
              </div>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}

function BuocDangChon({ qt, nutId, dang, lam, thaoTac, onBo }: {
  qt: ChiTietQuyTrinh; nutId: string; dang: string | null; lam: (t: string, f: () => Promise<void>) => Promise<void>;
  thaoTac: (t: Record<string, unknown>) => Promise<void>; onBo: () => void;
}) {
  const n = qt.do_thi.nut.find((x) => x.id === nutId)!;
  const tn = qt.tai_nguyen.find((t) => t.nut_id === nutId);
  const kn = n.cong_cu ? qt.ket_noi.find((k) => k.cong_cu === n.cong_cu) : undefined;
  const buoc = qt.lan_chay?.buoc[nutId];
  const dangChay = qt.trang_thai === 'dang_chay';
  const khoaSua = dangChay || !!n.them_boi_luat || n.loai === 'kich_hoat';
  const [ten, setTen] = useState(n.ten);
  const [vaiTro, setVaiTro] = useState(n.vai_tro ?? '');
  const [email, setEmail] = useState(tn?.kieu === 'gmail' && tn.co_san ? tn.can : '');
  const [url, setUrl] = useState(kn?.url ?? '');
  const [khoa, setKhoa] = useState('');
  const [mcpTool, setMcpTool] = useState(kn?.cong_cu_mcp ?? '');
  const canhBao = qt.chuan.filter((c) => c.nut_id === nutId);
  const id = qt.id;

  return (
    <div className="space-y-3" data-testid="buoc-dang-chon">
      <div className="flex items-center gap-2">
        {n.lam === 'agent' && n.loai !== 'kich_hoat' ? <Meo khoa={n.meo ?? 'phan_loai'} co={32} ten={tenMeo(n.meo)} /> : null}
        <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{nhanPhu(n)}</p>
        <button type="button" onClick={onBo} aria-label="Bỏ chọn" className="rounded p-1 hover:bg-muted"><X size={14} /></button>
      </div>
      {n.them_boi_luat && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">Cổng duyệt do luật an toàn tự thêm trước bước chuyển tiền / nộp / gửi ra ngoài / xoá — không sửa, không xoá được.</p>}

      <label className="block space-y-1 text-xs text-muted-foreground">Tên bước
        <input value={ten} disabled={khoaSua} onChange={(e) => setTen(e.target.value)} onBlur={() => ten.trim() && ten !== n.ten && void thaoTac({ thao_tac: 'doi_ten', nut_id: n.id, ten })} className={O} />
      </label>
      {n.mo_ta && <p className="text-xs text-muted-foreground">{n.mo_ta}</p>}

      {!khoaSua && n.loai !== 'duyet' && n.tac_dong !== 'chuyen_tien' && (
        <div className="space-y-1 text-xs text-muted-foreground">Ai làm
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            {([['agent', 'Mèo agent'], ['nguoi', 'Người']] as const).map(([k, t]) => (
              <button key={k} type="button" disabled={!!dang} aria-pressed={(n.ai_duoc ? 'agent' : 'nguoi') === k}
                onClick={() => void thaoTac({ thao_tac: 'doi_nguoi_lam', nut_id: n.id, lam: k })}
                className={`flex-1 rounded-md py-1 text-xs ${(n.ai_duoc ? 'agent' : 'nguoi') === k ? 'bg-background font-medium text-foreground shadow-sm' : ''}`}>{t}</button>
            ))}
          </div>
        </div>
      )}

      {n.ai_duoc && !khoaSua && (
        <div className="space-y-1 text-xs text-muted-foreground">Mèo đảm nhận
          <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-label="Chọn mèo">
            {MEO_DS.map(([k, t]) => (
              <button key={k} type="button" role="radio" aria-checked={n.meo === k} disabled={!!dang} title={`Mèo ${t}`}
                onClick={() => void thaoTac({ thao_tac: 'doi_meo', nut_id: n.id, meo: k })}
                className={`flex flex-col items-center gap-0.5 rounded-lg border p-1 text-[10px] transition-colors ${n.meo === k ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-transparent hover:bg-muted'}`}>
                <Meo khoa={k} co={26} ten={`Mèo ${t}`} />{t}
              </button>
            ))}
          </div>
        </div>
      )}

      {(n.loai === 'nguoi' || n.loai === 'duyet' || n.lam === 'nguoi') && !n.them_boi_luat && n.loai !== 'kich_hoat' && (
        <label className="block space-y-1 text-xs text-muted-foreground">Vai trò phụ trách
          <input value={vaiTro} disabled={khoaSua} onChange={(e) => setVaiTro(e.target.value)} placeholder="Ví dụ: Kế toán trưởng"
            onBlur={() => vaiTro !== (n.vai_tro ?? '') && void thaoTac({ thao_tac: 'doi_chi_tiet', nut_id: n.id, chi_tiet: { vai_tro: vaiTro } })} className={O} />
        </label>
      )}

      {!khoaSua && (
        <label className="block space-y-1 text-xs text-muted-foreground">Tác động
          <select value={n.tac_dong} disabled={!!dang} onChange={(e) => void thaoTac({ thao_tac: 'doi_tac_dong', nut_id: n.id, tac_dong: e.target.value })} className={O}>
            {TAC_DONG.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </label>
      )}

      {tn?.kieu === 'gmail' && (
        <form className="space-y-1" onSubmit={(e) => { e.preventDefault(); void lam('gan', () => ganEmail(id, n.id, email)); }}>
          <label className="block space-y-1 text-xs text-muted-foreground">Gmail người phụ trách
            <div className="flex gap-1.5"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Để trống: bạn phụ trách" className={O} />
              <button type="submit" disabled={!!dang} className={NUT}>Lưu</button></div>
          </label>
        </form>
      )}

      {tn && tn.kieu !== 'gmail' && (
        <form className="space-y-1.5 rounded-xl border p-2.5" onSubmit={(e) => { e.preventDefault(); void lam('kn', () => ketNoi(id, { cong_cu: n.cong_cu!, kieu: tn.kieu as 'api' | 'mcp', url, khoa: khoa || undefined, cong_cu_mcp: mcpTool || undefined })); setKhoa(''); }}>
          <p className="flex items-center gap-1.5 text-xs font-medium"><Plug size={13} /> {tn.kieu === 'mcp' ? 'Kết nối MCP' : 'Kết nối API'} · <code className="text-muted-foreground">{n.cong_cu}</code>
            <span className={`ml-auto ${tn.co_san ? 'text-emerald-600' : 'text-amber-600'}`}>{tn.co_san ? (kn ? `đã kết nối ${kn.khoa_hien ?? ''}` : 'có sẵn trong MIMI') : 'chưa kết nối'}</span></p>
          {!(tn.co_san && !kn) && (<>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Endpoint https://…" aria-label="Endpoint" className={O} />
            <input value={khoa} onChange={(e) => setKhoa(e.target.value)} type="password" autoComplete="off" placeholder={kn?.khoa_hien ? `Khoá đã lưu ${kn.khoa_hien} — dán để thay` : 'Dán API key'} aria-label="API key" className={O} />
            {tn.kieu === 'mcp' && <input value={mcpTool} onChange={(e) => setMcpTool(e.target.value)} placeholder="Tên công cụ MCP (để trống: liệt kê)" aria-label="Công cụ MCP" className={O} />}
            <button type="submit" disabled={!!dang || !url.trim()} className={NUT_CHINH}>{kn ? 'Cập nhật kết nối' : 'Kết nối'}</button>
            <p className="text-[11px] text-muted-foreground">Khoá được mã hoá ở máy chủ, không hiện lại.</p>
          </>)}
        </form>
      )}

      {canhBao.length > 0 && <ul className="space-y-1">{canhBao.map((c, i) => <li key={i} className={`rounded-lg border-l-2 bg-muted/50 px-2 py-1 text-xs ${c.muc === 'loi' ? 'border-red-500' : 'border-amber-400'}`}>{c.cau}</li>)}</ul>}

      {buoc?.ket_qua && <p className="whitespace-pre-line rounded-lg bg-muted p-2 text-xs">{buoc.ket_qua}</p>}
      {(buoc?.tt === 'can_nguoi' || buoc?.tt === 'chan') && (
        <div className="flex flex-wrap gap-1.5">
          {n.loai === 'duyet' ? (<>
            <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(id, n.id, 'duyet'))} className={NUT_CHINH}><Check size={14} /> Duyệt</button>
            <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(id, n.id, 'tu_choi'))} className={NUT}>Cần sửa</button>
          </>) : (
            <button type="button" disabled={!!dang} onClick={() => void lam('b', () => xuLyBuoc(id, n.id, 'xong'))} className={NUT_CHINH}>{buoc.tt === 'chan' ? 'Làm tay bước này' : 'Đánh dấu xong'}</button>
          )}
        </div>
      )}

      {!khoaSua && (
        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          {n.loai === 'duyet' && !qt.do_thi.canh.some((c) => c.tu === n.id && c.nhanh === 'can_sua') && (
            <button type="button" disabled={!!dang} onClick={() => void thaoTac({ thao_tac: 'them_nhanh_sua', nut_id: n.id, ten: 'Trả lại để bổ sung' })} className={NUT}><GitBranch size={14} /> Thêm nhánh "Cần sửa"</button>
          )}
          <button type="button" disabled={!!dang} onClick={() => void thaoTac({ thao_tac: 'xoa', nut_id: n.id }).then(onBo)} className={`${NUT} text-red-600`}><Trash2 size={14} /> Xoá bước</button>
        </div>
      )}
    </div>
  );
}

function HieuSuatBang({ qt }: { qt: ChiTietQuyTrinh }) {
  const ss = soSanhHieuSuat(qt.lich_su);
  return (
    <div className="space-y-3 text-xs">
      {qt.hieu_suat ? (
        <ul className="space-y-1">
          <li>Tổng thời gian: <b>{thoiGian(qt.hieu_suat.tong_ms)}</b></li>
          <li>Chờ người: <b>{thoiGian(qt.hieu_suat.cho_nguoi_ms)}</b></li>
          <li>Bước mèo agent làm: <b>{qt.hieu_suat.buoc_agent}</b></li>
          <li>Bước người làm: <b>{qt.hieu_suat.buoc_nguoi}</b>{qt.hieu_suat.lam_tay ? ` (làm tay thay mèo: ${qt.hieu_suat.lam_tay})` : ''}</li>
        </ul>
      ) : <p className="text-muted-foreground">Chưa chạy lần nào — số đo hiện sau lần chạy đầu, không ước đoán.</p>}
      {ss.length > 0 && (
        <table className="w-full">
          <caption className="mb-1 text-left font-medium text-muted-foreground">So sánh phương án (lần chạy xong)</caption>
          <thead><tr className="text-left text-muted-foreground"><th className="font-medium">Phương án</th><th className="font-medium">Lần</th><th className="font-medium">TB</th><th className="font-medium">Chờ người</th></tr></thead>
          <tbody>{ss.map((r) => <tr key={r.pa}><td>{TEN_PA[r.pa]}</td><td>{r.lan}</td><td>{thoiGian(r.tb_ms)}</td><td>{thoiGian(r.tb_nguoi_ms)}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
