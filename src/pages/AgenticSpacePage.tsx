/**
 * AGENTIC AI SPACE (/dashboard/space, 22/11/2026) — bảng việc kiểu ClickUp: NGƯỜI giao việc, AGENT nhận việc.
 *
 * Học từ ClickUp: ô giao việc lớn ở trên, thẻ agent, danh sách việc gọn theo trạng thái, lọc theo người nhận.
 * Bỏ cái dở của ClickUp: chỉ 3 cột cố định ("Cần bạn" luôn đầu), không phân tầng Space/Folder/List, không trường rỗng,
 * hạn có màu theo mức gấp, tiến độ hiện ngay trên thẻ, duyệt / tiếp tục ngay trên thẻ, luồng tin agent ↔ agent ↔ người.
 *
 * Mọi số và trạng thái do edge function `agentic-space` tính; trang chỉ hiện.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThanhTabHome } from '@/components/khong-gian/ThanhTabHome';
import { Link } from 'react-router-dom';
import { Orbit, ArrowRight, Check, X, Loader2, RotateCw } from 'lucide-react';
import { danhDauXong, docBang, docTin, giaoViec, huyViec, tiepTuc, type BangViec, type DongViec, type TinSpace } from '@/lib/goiSpace';

const TEN: Record<string, string> = { phan_loai: 'Agent Phân loại', thue: 'Agent Thuế', nguoi: 'Bạn' };
const MAU: Record<string, string> = { phan_loai: 'bg-sky-500', thue: 'bg-amber-500', nguoi: 'bg-slate-700' };
const GOI_Y = ['Chốt quý 4 cho khách này', 'Phân loại tiền vào tháng này', 'Kiểm tờ khai trước hạn'];

type Cot = 'can_ban' | 'dang_lam' | 'xong';
const COT: { khoa: Cot; ten: string; mo: string }[] = [
  { khoa: 'can_ban', ten: 'Cần bạn', mo: 'Agent dừng lại chờ bạn quyết' },
  { khoa: 'dang_lam', ten: 'Agent đang làm', mo: 'Đang chạy hoặc chờ agent khác' },
  { khoa: 'xong', ten: 'Xong', mo: '14 ngày gần nhất' },
];
export const cotCua = (t: DongViec['trang_thai']): Cot => (t === 'can_ban' ? 'can_ban' : t === 'xong' ? 'xong' : 'dang_lam');

const homNayVN = () => new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
/** Hạn: đỏ = quá hạn, cam = còn ≤ 7 ngày, xám = còn xa. */
export function mauHan(han: string | null, homNay = homNayVN()): { lop: string; chu: string } | null {
  if (!han) return null;
  const con = Math.round((Date.parse(han) - Date.parse(homNay)) / 86_400_000);
  if (con < 0) return { lop: 'text-red-600', chu: `Quá hạn ${-con} ngày` };
  if (con <= 7) return { lop: 'text-orange-600', chu: con === 0 ? 'Hạn hôm nay' : `Còn ${con} ngày` };
  return { lop: 'text-muted-foreground', chu: `Hạn ${han.split('-').reverse().join('/')}` };
}

function Cham({ ai }: { ai: string }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${MAU[ai] ?? 'bg-slate-400'}`} />;
}

function TheViec({ v, dangLam, onMo, onTiep, onXong }: {
  v: DongViec; dangLam: boolean; onMo: () => void; onTiep: () => void; onXong: () => void;
}) {
  const han = mauHan(v.han);
  const phan = v.buoc_tong ? Math.round((v.buoc_xong / v.buoc_tong) * 100) : 0;
  return (
    <article className="space-y-2 rounded-xl border bg-background p-3 text-sm shadow-sm" data-testid={`viec-${v.id}`}>
      <button type="button" onClick={onMo} className="block w-full text-left">
        <p className="font-medium text-foreground">{v.tieu_de}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{v.ten_khach}</span>
          <span className="inline-flex items-center gap-1"><Cham ai={v.agent} />{TEN[v.agent]}</span>
          {han && <span className={han.lop}>{han.chu}</span>}
        </p>
      </button>
      <div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={phan} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${phan}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {v.buoc_xong}/{v.buoc_tong} bước{v.buoc_hien_tai && v.trang_thai !== 'xong' ? ` · ${v.buoc_hien_tai}` : ''}
          {v.trang_thai === 'cho_agent' ? ' · đang chờ Agent Phân loại' : ''}
        </p>
      </div>
      {v.hoi && (
        <div className="space-y-2 rounded-lg bg-amber-50 p-2 text-xs text-foreground dark:bg-amber-950/30">
          <p>{v.hoi.noi_dung}</p>
          <div className="flex flex-wrap gap-2">
            {v.hoi.lien_ket && (
              <Link to={v.hoi.lien_ket} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 font-medium hover:bg-muted">
                {v.hoi.lien_ket.includes('to-khai') ? 'Mở tờ khai' : 'Mở hàng duyệt'} <ArrowRight size={12} />
              </Link>
            )}
            <button type="button" disabled={dangLam} onClick={onTiep} className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 hover:bg-muted disabled:opacity-50">
              <RotateCw size={12} /> Tiếp tục
            </button>
            <button type="button" disabled={dangLam} onClick={onXong} className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground disabled:opacity-50">
              <Check size={12} /> Đánh dấu xong
            </button>
          </div>
        </div>
      )}
      {!v.hoi && v.tin_cuoi && <p className="line-clamp-2 text-xs text-muted-foreground">{TEN[v.tin_cuoi.tu] ?? v.tin_cuoi.tu}: {v.tin_cuoi.noi_dung}</p>}
    </article>
  );
}

function LuongTin({ id, onDong, onHuy }: { id: string; onDong: () => void; onHuy: (id: string) => void }) {
  const [du, setDu] = useState<{ tieu_de: string; ten_khach: string; trang_thai: string; tin: TinSpace[] } | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  useEffect(() => {
    let huy = false;
    docTin(id).then((r) => { if (!huy) setDu({ tieu_de: r.viec.tieu_de, ten_khach: r.viec.ten_khach, trang_thai: r.viec.trang_thai, tin: r.tin }); })
      .catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Chưa đọc được.'); });
    return () => { huy = true; };
  }, [id]);
  return (
    <aside aria-label="Luồng tin của việc" className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-card shadow-xl">
      <header className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <p className="font-semibold text-foreground">{du?.tieu_de ?? '…'}</p>
          <p className="text-xs text-muted-foreground">{du?.ten_khach}</p>
        </div>
        <button type="button" onClick={onDong} aria-label="Đóng" className="rounded-md p-1 hover:bg-muted"><X size={18} /></button>
      </header>
      <ol className="flex-1 space-y-3 overflow-y-auto p-4">
        {loi && <li role="alert" className="text-sm text-destructive">{loi}</li>}
        {du?.tin.map((t) => (
          <li key={t.id} className={`flex gap-2 ${t.tu === 'nguoi' ? 'flex-row-reverse text-right' : ''}`}>
            <Cham ai={t.tu} />
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${t.tu === 'nguoi' ? 'bg-primary text-primary-foreground' : t.loai === 'hoi' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted'}`}>
              <p className="text-[11px] font-medium opacity-80">
                {TEN[t.tu] ?? t.tu}{t.den ? ` → ${TEN[t.den] ?? t.den}` : ''}
              </p>
              <p>{t.noi_dung}</p>
            </div>
          </li>
        ))}
      </ol>
      {du && !['xong', 'huy'].includes(du.trang_thai) && (
        <footer className="border-t p-3">
          <button type="button" onClick={() => { if (window.confirm('Huỷ việc này? Việc con đang mở cũng huỷ theo.')) onHuy(id); }}
            className="rounded-lg border px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">Huỷ việc</button>
        </footer>
      )}
    </aside>
  );
}

export default function AgenticSpacePage() {
  const [bang, setBang] = useState<BangViec | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [cau, setCau] = useState('');
  const [khach, setKhach] = useState('');
  const [han, setHan] = useState('');
  const [dangGiao, setDangGiao] = useState(false);
  const [dangLam, setDangLam] = useState<string | null>(null);
  const [mo, setMo] = useState<string | null>(null);
  const [locKhach, setLocKhach] = useState('');
  const [locAgent, setLocAgent] = useState('');

  const tai = useCallback(async () => {
    try { setBang(await docBang()); setLoi(null); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được bảng việc.'); }
  }, []);
  useEffect(() => { void tai(); }, [tai]);
  useEffect(() => { if (!khach && bang?.khach.length) setKhach(bang.khach[0].id); }, [bang, khach]);

  const lam = async (id: string, f: () => Promise<void>) => {
    setDangLam(id);
    try { await f(); await tai(); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa thực hiện được.'); } finally { setDangLam(null); }
  };

  const giao = async () => {
    if (!cau.trim() || !khach) return;
    setDangGiao(true); setLoi(null);
    try {
      const id = await giaoViec({ company_id: khach, cau: cau.trim(), han: han || null });
      setCau(''); setHan('');
      await tai();
      setMo(id);
    } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa giao được việc.'); } finally { setDangGiao(false); }
  };

  const viec = useMemo(() => (bang?.viec ?? []).filter((v) => (!locKhach || v.company_id === locKhach) && (!locAgent || v.agent === locAgent)), [bang, locKhach, locAgent]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <ThanhTabHome />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Orbit className="text-primary" /> Agentic AI Space</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Bạn giao việc bằng một câu. Agent lập kế hoạch, dùng công cụ, giao việc cho nhau — và dừng lại hỏi bạn ở chỗ cần người quyết. Agent không ghi sổ, không nộp tờ khai thay bạn.</p>
      </header>

      <form className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm" onSubmit={(e) => { e.preventDefault(); void giao(); }}>
        <textarea value={cau} onChange={(e) => setCau(e.target.value)} maxLength={200} rows={2}
          placeholder="Giao việc cho agent… ví dụ: Chốt quý 4 cho Tạp hoá Hồng"
          aria-label="Mô tả việc" className="w-full resize-none rounded-xl border-0 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
        <div className="flex flex-wrap gap-2">
          {GOI_Y.map((g) => (
            <button key={g} type="button" onClick={() => setCau(g)} className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted">{g}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Khách
            <select value={khach} onChange={(e) => setKhach(e.target.value)} className="min-w-[200px] rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground">
              {(bang?.khach ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">Hạn (không bắt buộc)
            <input type="date" value={han} onChange={(e) => setHan(e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm text-foreground" />
          </label>
          <button type="submit" disabled={dangGiao || !cau.trim() || !khach}
            className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {dangGiao ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Giao việc
          </button>
        </div>
        {bang && !bang.khach.length && <p className="text-xs text-muted-foreground">Bạn chưa làm sổ cho khách nào — thêm khách ở Văn phòng kế toán trước.</p>}
      </form>

      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      <section aria-label="Agent" className="grid gap-3 sm:grid-cols-2">
        {(bang?.agent ?? []).map((a) => {
          const trangThai = a.can_ban ? `${a.can_ban} việc chờ bạn` : a.dang_lam || a.cho_agent ? 'Đang làm' : 'Rảnh';
          return (
            <button type="button" key={a.agent} onClick={() => setLocAgent(locAgent === a.agent ? '' : a.agent)} aria-pressed={locAgent === a.agent}
              className={`flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:shadow ${locAgent === a.agent ? 'ring-2 ring-primary' : ''}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${MAU[a.agent]}`}>{a.ten.split(' ').at(-1)![0]}</span>
              <span className="flex-1">
                <span className="block font-medium text-foreground">{a.ten}</span>
                <span className="block text-xs text-muted-foreground">{trangThai} · đang làm {a.dang_lam + a.cho_agent} · xong {a.xong_7_ngay} việc trong 7 ngày</span>
              </span>
            </button>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={locKhach} onChange={(e) => setLocKhach(e.target.value)} aria-label="Lọc theo khách" className="rounded-lg border bg-background px-2 py-1.5">
          <option value="">Mọi khách</option>
          {(bang?.khach ?? []).map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
        </select>
        {(locKhach || locAgent) && <button type="button" onClick={() => { setLocKhach(''); setLocAgent(''); }} className="text-xs text-muted-foreground underline">Bỏ lọc</button>}
      </div>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Bảng việc">
        {COT.map((c) => {
          const ds = viec.filter((v) => cotCua(v.trang_thai) === c.khoa);
          return (
            <div key={c.khoa} className="space-y-3 rounded-2xl bg-muted/50 p-3" data-testid={`cot-${c.khoa}`}>
              <h2 className="flex items-baseline justify-between text-sm font-semibold text-foreground">
                <span>{c.ten} <span className="ml-1 rounded-full bg-background px-2 text-xs">{ds.length}</span></span>
                <span className="text-xs font-normal text-muted-foreground">{c.mo}</span>
              </h2>
              {ds.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">Trống</p>}
              {ds.map((v) => (
                <TheViec key={v.id} v={v} dangLam={dangLam === v.id} onMo={() => setMo(v.id)}
                  onTiep={() => void lam(v.id, () => tiepTuc(v.id))} onXong={() => void lam(v.id, () => danhDauXong(v.id))} />
              ))}
            </div>
          );
        })}
      </section>

      {mo && <LuongTin key={mo} id={mo} onDong={() => setMo(null)} onHuy={(id) => { setMo(null); void lam(id, () => huyViec(id)); }} />}
    </div>
  );
}
