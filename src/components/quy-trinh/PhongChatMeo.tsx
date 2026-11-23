/**
 * PHÒNG TRÒ CHUYỆN kiểu Zalo / WeChat (23/11/2026): trái là danh bạ — 12 mèo agent (mỗi con một nghề) và các nhóm workflow,
 * có ô tìm, tab Tất cả | Đã ghim; giữa là cuộc trò chuyện riêng với từng mèo (trả lời trích dẫn, thả cảm xúc, giờ gửi);
 * phải là bảng "Thông tin" của mèo (nghề, năng lực thật, nút Giao việc). Có nút Gọi thoại — giống chat thoại của GPT.
 *
 * TRÒ CHUYỆN KHÔNG CẦN API NGOÀI: mèo trả lời bằng đúng mô hình AI của MIMI, chỉ dùng số liệu thật của công ty (máy chủ cấp)
 * và KHÔNG chuyển tiền / ghi sổ. Kết nối ngoài chỉ là nâng cấp tuỳ chọn để mèo làm thêm việc. Ghim và cảm xúc chỉ lưu
 * trên trình duyệt này (tiện cho riêng người xem). Điện thoại: một khung một lúc (danh bạ → trò chuyện → thông tin).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Info, Loader2, Phone, Pin, Reply, Search, Send, Users, X } from 'lucide-react';
import { Meo } from '@/components/agent/AvatarMeo';
import { tenMeo } from '@/components/quy-trinh/KhungVe';
import { meoDs, meoGui, meoTin, type LienHe, type TinMeo } from '@/lib/goiChatMeo';
import { taoTuMau, thuVien, type MauThuVien } from '@/lib/goiQuyTrinh';

import CuocGoiMeo from '@/components/quy-trinh/CuocGoiMeo';

const GOI_Y = ['Hôm nay mình cần làm gì?', 'Có gì bất thường không?', 'Mình nên dựng workflow nào cho việc này?'];
const CAM_XUC = ['👍', '❤️', '😂', '😮'];
const KHOA_GHIM = 'mimi.meo.ghim';
const KHOA_CAM_XUC = 'mimi.meo.camxuc';
const RE_TRICH = /^↩ "([^"\n]{1,120})"\n([\s\S]*)$/;

const docLs = <T,>(k: string, mac: T): T => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : mac; } catch { return mac; } };
const ghiLs = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* chế độ riêng tư: bỏ qua */ } };

const gio = (s: string) => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
};

export default function PhongChatMeo({ companyId, nhom, onMoNhom }: {
  companyId: string; nhom: { id: string; tieu_de: string }[]; onMoNhom: (id: string) => void;
}) {
  const [ds, setDs] = useState<LienHe[] | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [tin, setTin] = useState<TinMeo[]>([]);
  const [tim, setTim] = useState('');
  const [tab, setTab] = useState<'tat_ca' | 'ghim'>('tat_ca');
  const [ghim, setGhim] = useState<string[]>(() => docLs<string[]>(KHOA_GHIM, []));
  const [camXuc, setCamXuc] = useState<Record<string, string>>(() => docLs<Record<string, string>>(KHOA_CAM_XUC, {}));
  const [trich, setTrich] = useState<TinMeo | null>(null);
  const [thongTin, setThongTin] = useState(false);
  const [goi, setGoi] = useState(false);
  const [nhap, setNhap] = useState('');
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [mauDs, setMauDs] = useState<MauThuVien[]>([]);
  const [giao, setGiao] = useState<string | null>(null);
  const cuoi = useRef<HTMLDivElement>(null);

  const taiDs = useCallback(async () => {
    try { setDs(await meoDs(companyId)); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được danh bạ.'); }
  }, [companyId]);
  useEffect(() => { void taiDs(); }, [taiDs]);
  useEffect(() => { thuVien().then(setMauDs).catch(() => setMauDs([])); }, []);

  /** Mèo giao việc: dựng workflow thuộc nghề của nó từ thư viện rồi mở ngay (cùng trang). */
  const giaoViec = async (mau: string) => {
    setGiao(mau); setLoi(null);
    try { onMoNhom(await taoTuMau(companyId, mau)); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa giao được việc.'); } finally { setGiao(null); }
  };
  useEffect(() => {
    if (!chon) return;
    let huy = false;
    setTin([]); setTrich(null); setThongTin(false);
    meoTin(companyId, chon).then((t) => { if (!huy) setTin(t); }).catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Chưa đọc được tin nhắn.'); });
    return () => { huy = true; };
  }, [companyId, chon]);
  useEffect(() => { cuoi.current?.scrollIntoView?.({ block: 'end' }); }, [tin.length, dang]);

  const doiGhim = (m: string) => setGhim((g) => { const n = g.includes(m) ? g.filter((x) => x !== m) : [...g, m]; ghiLs(KHOA_GHIM, n); return n; });
  const thaCamXuc = (id: number, e: string) => setCamXuc((c) => { const n = { ...c }; if (n[String(id)] === e) delete n[String(id)]; else n[String(id)] = e; ghiLs(KHOA_CAM_XUC, n); return n; });

  /** Gửi một câu cho mèo đang chọn; trả về câu trả lời (dùng chung cho chat chữ và gọi thoại). Lỗi thì ném ra để nơi gọi xử lý. */
  const guiCho = async (meo: string, c: string, trichDan: TinMeo | null): Promise<string> => {
    const noiDung = trichDan ? `↩ "${trichDan.noi_dung.replace(/["\n]/g, ' ').slice(0, 80)}"\n${c}` : c;
    const tam: TinMeo = { id: -Date.now(), vai: 'nguoi', noi_dung: noiDung, luc: new Date().toISOString() };
    setTin((t) => [...t, tam]);
    try {
      const kq = await meoGui(companyId, meo, noiDung);
      setTin((t) => [...t.filter((x) => x.id !== tam.id), kq.nguoi, kq.tra_loi]);
      void taiDs();
      return kq.tra_loi.noi_dung;
    } catch (e) {
      setTin((t) => t.filter((x) => x.id !== tam.id));
      throw e;
    }
  };

  const gui = async (noi: string) => {
    const c = noi.trim();
    if (!c || !chon || dang) return;
    const t = trich;
    setDang(true); setLoi(null); setNhap(''); setTrich(null);
    try { await guiCho(chon, c, t); } catch (e) {
      setNhap(c); setTrich(t);
      setLoi(e instanceof Error ? e.message : 'Chưa gửi được.');
    } finally { setDang(false); }
  };

  const khop = (l: LienHe) => !tim.trim() || `${l.ten} ${l.viec}`.toLowerCase().includes(tim.trim().toLowerCase());
  const loc = (ds ?? []).filter(khop).filter((l) => tab === 'tat_ca' || ghim.includes(l.meo))
    .sort((a, b) => Number(ghim.includes(b.meo)) - Number(ghim.includes(a.meo)));
  const lh = (ds ?? []).find((l) => l.meo === chon) ?? null;
  const tenCuaMau = (k: string) => mauDs.find((m) => m.khoa === k)?.tieu_de ?? k;

  const nutGiao = (lhh: LienHe) => lhh.nang_luc.mau.map((k) => (
    <button key={k} type="button" disabled={!!giao} onClick={() => void giaoViec(k)} aria-label={`Giao việc: ${tenCuaMau(k)}`}
      className="rounded-full border px-2.5 py-1 text-left text-foreground transition-colors hover:bg-muted disabled:opacity-50">
      {giao === k ? 'Đang dựng…' : `Giao việc: ${tenCuaMau(k)}`}
    </button>
  ));

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[440px] overflow-hidden rounded-2xl border bg-card md:h-[calc(100vh-9rem)]" data-testid="phong-chat">
      <aside aria-label="Danh bạ" className={`${chon ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r md:w-72`}>
        <div className="space-y-2 border-b p-2.5">
          <label className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm">
            <Search size={14} className="text-muted-foreground" aria-hidden />
            <input value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm mèo…" aria-label="Tìm mèo" className="flex-1 bg-transparent outline-none" />
          </label>
          <div role="tablist" aria-label="Lọc danh bạ" className="flex gap-1 text-xs">
            {([['tat_ca', 'Tất cả'], ['ghim', `Đã ghim${ghim.length ? ` (${ghim.length})` : ''}`]] as const).map(([k, t]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${tab === k ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-muted-foreground hover:bg-muted'}`}>{t}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {nhom.length > 0 && !tim.trim() && tab === 'tat_ca' && (
            <section aria-label="Nhóm workflow">
              <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nhóm workflow</p>
              {nhom.slice(0, 6).map((g) => (
                <button key={g.id} type="button" onClick={() => onMoNhom(g.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted"><Users size={18} className="text-muted-foreground" /></span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{g.tieu_de}</span>
                </button>
              ))}
            </section>
          )}
          <section aria-label="Mèo agent">
            <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Mèo agent</p>
            {ds === null ? <p className="p-3 text-sm text-muted-foreground">Đang đọc…</p> : loc.length === 0 && tab === 'ghim' ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Chưa ghim mèo nào. Mở một mèo rồi bấm biểu tượng ghim ở đầu khung trò chuyện.</p>
            ) : loc.map((l) => (
              <button key={l.meo} type="button" onClick={() => setChon(l.meo)} aria-current={chon === l.meo ? 'true' : undefined}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60 ${chon === l.meo ? 'bg-muted' : ''}`}>
                <Meo khoa={l.meo} co={40} ten={l.ten} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-medium text-foreground">{l.ten}{ghim.includes(l.meo) && <Pin size={11} className="shrink-0 text-muted-foreground" aria-hidden />}</span>
                  <span className="block truncate text-xs text-muted-foreground">{l.tin_cuoi ? `${l.tin_cuoi.vai === 'nguoi' ? 'Bạn: ' : ''}${l.tin_cuoi.noi_dung.replace(RE_TRICH, '$2')}` : l.viec}</span>
                </span>
              </button>
            ))}
          </section>
        </div>
      </aside>

      <section aria-label="Cuộc trò chuyện" className={`${chon && !thongTin ? 'flex' : chon ? 'hidden lg:flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
        {!lh ? (
          <div className="m-auto max-w-xs px-6 text-center text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Chọn một mèo để nhắn tin</p>
            <p className="mt-1">Mỗi mèo lo một nghề. Trò chuyện không cần kết nối gì thêm; hỏi đúng nghề thì mèo trả lời bằng số liệu thật của công ty, việc nhiều bước thì mèo gợi ý dựng workflow.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b px-3 py-2.5">
              <button type="button" onClick={() => setChon(null)} aria-label="Về danh bạ" className="rounded-lg p-1.5 hover:bg-muted md:hidden"><ArrowLeft size={18} /></button>
              <Meo khoa={lh.meo} co={36} ten={lh.ten} />
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{lh.ten}</p><p className="truncate text-xs text-muted-foreground">{lh.viec}</p></div>
              <button type="button" onClick={() => doiGhim(lh.meo)} aria-label={ghim.includes(lh.meo) ? 'Bỏ ghim' : 'Ghim mèo'} aria-pressed={ghim.includes(lh.meo)}
                className={`rounded-lg p-1.5 transition-colors hover:bg-muted ${ghim.includes(lh.meo) ? 'text-foreground' : 'text-muted-foreground'}`}><Pin size={17} /></button>
              <button type="button" onClick={() => setGoi(true)} aria-label={`Gọi ${lh.ten}`} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Phone size={17} /></button>
              <button type="button" onClick={() => setThongTin((v) => !v)} aria-label="Thông tin" aria-pressed={thongTin} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"><Info size={17} /></button>
            </header>
            <div className="space-y-1 border-b bg-background px-3 py-2 text-xs" data-testid="nang-luc">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className={`rounded-full px-2 py-0.5 font-medium ${lh.nang_luc.loai === 'du_lieu' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-neutral-800 dark:text-slate-300'}`}>
                  {lh.nang_luc.loai === 'du_lieu' ? 'Có dữ liệu thật' : 'Tư vấn theo kiến thức nghề'}
                </span>
                <span className="text-muted-foreground">{lh.nang_luc.that}</span>
              </p>
              {lh.nang_luc.thieu && <p className="text-muted-foreground">Nâng cấp tuỳ chọn: {lh.nang_luc.thieu}</p>}
            </div>
            <ol className="flex-1 space-y-2.5 overflow-y-auto bg-muted/30 p-3 text-sm" aria-live="polite">
              {tin.length === 0 && !dang && (
                <li className="flex flex-wrap justify-center gap-2 pt-6">
                  {GOI_Y.map((g) => <button key={g} type="button" onClick={() => void gui(g)} className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">{g}</button>)}
                </li>
              )}
              {tin.map((t) => {
                const m = RE_TRICH.exec(t.noi_dung);
                const nd = m ? m[2] : t.noi_dung;
                const cx = camXuc[String(t.id)];
                const laToi = t.vai === 'nguoi';
                return (
                  <li key={t.id} className={`group ${laToi ? 'ml-auto max-w-[80%]' : 'flex max-w-[85%] gap-2'}`}>
                    {!laToi && <Meo khoa={lh.meo} co={30} ten={lh.ten} />}
                    <div className="min-w-0">
                      <div className={`rounded-2xl px-3 py-2 ${laToi ? 'rounded-br-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'rounded-bl-sm bg-background text-foreground shadow-sm'}`}>
                        {m && <blockquote className={`mb-1 border-l-2 pl-2 text-xs ${laToi ? 'border-white/50 text-white/80 dark:border-slate-900/40 dark:text-slate-700' : 'border-slate-300 text-muted-foreground'}`}>{m[1]}</blockquote>}
                        <p className="whitespace-pre-wrap">{nd}</p>
                      </div>
                      {cx && <span className="-mt-1 ml-2 inline-block rounded-full border bg-background px-1.5 text-xs" aria-label={`Cảm xúc ${cx}`}>{cx}</span>}
                      <div className={`mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground ${laToi ? 'justify-end' : ''}`}>
                        <span>{gio(t.luc)}</span>
                        {t.id > 0 && (
                          <span className="flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
                            <button type="button" onClick={() => setTrich(t)} aria-label="Trả lời tin này" className="rounded p-0.5 hover:bg-muted hover:text-foreground"><Reply size={12} /></button>
                            {CAM_XUC.map((e) => <button key={e} type="button" onClick={() => thaCamXuc(t.id, e)} aria-label={`Thả ${e}`} className="rounded px-0.5 hover:bg-muted">{e}</button>)}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              {dang && <li className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={13} className="animate-spin" /> {tenMeo(lh.meo)} đang soạn…</li>}
              <div ref={cuoi} />
            </ol>
            {loi && <p role="alert" className="px-3 py-1 text-xs text-destructive">{loi}</p>}
            <form className="border-t p-2.5" onSubmit={(e) => { e.preventDefault(); void gui(nhap); }}>
              {trich && (
                <div className="mb-1.5 flex items-center gap-2 rounded-lg border-l-2 border-slate-400 bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <Reply size={12} aria-hidden /><span className="min-w-0 flex-1 truncate">Đang trả lời: {trich.noi_dung.replace(RE_TRICH, '$2')}</span>
                  <button type="button" onClick={() => setTrich(null)} aria-label="Bỏ trích dẫn" className="rounded p-0.5 hover:bg-background"><X size={12} /></button>
                </div>
              )}
              <div className="flex items-end gap-2 rounded-xl border bg-background p-2">
                <textarea value={nhap} onChange={(e) => setNhap(e.target.value)} rows={1} maxLength={600} aria-label={`Nhắn ${lh.ten}`} placeholder={`Nhắn ${lh.ten}…`}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void gui(nhap); } }}
                  className="max-h-24 flex-1 resize-none bg-transparent text-sm outline-none" />
                <button type="submit" disabled={!nhap.trim() || dang} aria-label="Gửi" className="rounded-full bg-slate-900 p-1.5 text-white disabled:opacity-40 dark:bg-white dark:text-slate-900"><Send size={15} /></button>
              </div>
            </form>
          </>
        )}
      </section>

      {lh && (
        <aside aria-label="Thông tin mèo" className={`${thongTin ? 'flex' : 'hidden lg:flex'} w-full shrink-0 flex-col gap-4 overflow-y-auto border-l p-4 text-sm lg:w-64`}>
          <button type="button" onClick={() => setThongTin(false)} aria-label="Đóng thông tin" className="self-start rounded-lg p-1.5 hover:bg-muted lg:hidden"><ArrowLeft size={18} /></button>
          <div className="flex flex-col items-center gap-2 text-center">
            <Meo khoa={lh.meo} co={72} ten={lh.ten} />
            <p className="font-semibold text-foreground">{lh.ten}</p>
            <p className="text-xs text-muted-foreground">{lh.viec}</p>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Mèo làm được gì</p>
            <p className="text-xs text-foreground">{lh.nang_luc.that}</p>
            {lh.nang_luc.thieu && <p className="mt-1 text-xs text-muted-foreground">Muốn mèo làm thêm: {lh.nang_luc.thieu}</p>}
          </div>
          {lh.nang_luc.mau.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Việc có thể giao</p>
              <div className="flex flex-col items-start gap-1.5 text-xs">{nutGiao(lh)}</div>
            </div>
          )}
        </aside>
      )}

      {goi && lh && (
        <CuocGoiMeo meo={lh.meo} ten={lh.ten} onDong={() => setGoi(false)} guiTin={(c) => guiCho(lh.meo, c, null)} />
      )}
    </div>
  );
}
