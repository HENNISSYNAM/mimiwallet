import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronRight, FileText, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  cauTraThuTuc, danhDauBuoc, docViec, dsViec, LOAI_HANH_TRINH, MAU_HANH_TRINH, moTaiLieu, moViec, soanBuoc, TEN_DO_DAY,
  TEN_TRANG_THAI_BUOC, TEN_TRANG_THAI_VIEC, tienDo, traLoiViec, type Buoc, type HanhTrinhDay, type HoSoViec, type TaiLieuTom,
} from '@/lib/hanhTrinh';

/**
 * Việc cần làm — Prompt 4 mục 3–6, 31.
 *
 * Mỗi việc (tạm ngừng, hoá đơn sai, trả lời giải trình…) hỏi ĐÚNG MỘT câu một lúc, rồi mở dần các bước.
 * MIMI chuẩn bị (tra thủ tục, soạn tài liệu); người dùng tự nộp, tự ký. Bước "kiểm kết quả" chỉ đóng
 * việc khi có bằng chứng kết quả. Mọi thay đổi đi qua máy chủ và để lại dấu vết.
 */
const loiCua = (e: unknown) => (e instanceof Error ? e.message : 'Có lỗi. Thử lại sau ít phút.');

function CauHoiCard({ ht, duocSua, onXong }: { ht: HanhTrinhDay; duocSua: boolean; onXong: (h: HanhTrinhDay) => void }) {
  const c = ht.cau_hoi;
  const [gt, setGt] = useState('');
  const [dang, setDang] = useState(false);
  if (!c) return null;
  const gui = async (v: string) => {
    setDang(true);
    try { onXong(await traLoiViec(ht.id, c.khoa, v)); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); }
  };
  return (
    <section aria-labelledby="cau-hoi" className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-primary">Câu cần trả lời</p>
      <h2 id="cau-hoi" className="mt-1 text-lg font-semibold text-foreground">{c.cau}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{c.vi_sao}</p>
      {!duocSua ? (
        <p className="mt-3 text-sm text-muted-foreground">Vai trò của bạn chỉ xem được việc này.</p>
      ) : c.kieu === 'lua_chon' ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(c.lua_chon ?? []).map((l) => (
            <button key={l.gia_tri} type="button" disabled={dang} onClick={() => void gui(l.gia_tri)}
              className="h-11 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary disabled:opacity-50">{l.nhan}</button>
          ))}
        </div>
      ) : (
        <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (gt.trim()) void gui(gt.trim()); }}>
          {c.kieu === 'chu' ? (
            <textarea aria-label={c.cau} value={gt} onChange={(e) => setGt(e.target.value)} maxLength={500} rows={3}
              className="w-full rounded-lg border border-border bg-card p-3 text-sm" />
          ) : (
            <input aria-label={c.cau} type={c.kieu === 'ngay' ? 'date' : 'month'} value={gt} onChange={(e) => setGt(e.target.value)}
              className="h-11 rounded-lg border border-border bg-card px-3 text-sm" />
          )}
          <button type="submit" disabled={dang || !gt.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {dang && <Loader2 size={14} className="animate-spin" />} Trả lời
          </button>
        </form>
      )}
    </section>
  );
}

function HanhDongBuoc({ ht, b, duocSua, onXong, onTaiLieu }: {
  ht: HanhTrinhDay; b: Buoc; duocSua: boolean; onXong: (h: HanhTrinhDay) => void; onTaiLieu: () => void;
}) {
  const [dang, setDang] = useState(false);
  const [ketQua, setKetQua] = useState('');
  const [hoiXacNhan, setHoiXacNhan] = useState<null | 'waiting_external' | 'completed'>(null);
  if (!duocSua || b.trang_thai === 'completed' || b.trang_thai === 'skipped' || b.trang_thai === 'blocked' || b.loai_hanh_dong === 'hoi') return null;
  const chay = async (f: () => Promise<HanhTrinhDay>) => {
    setDang(true);
    try { onXong(await f()); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); setHoiXacNhan(null); }
  };
  const nut = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50';

  if (b.loai_hanh_dong === 'soan_tai_lieu') {
    return (
      <button type="button" className={nut} disabled={dang} onClick={() => void chay(async () => {
        const r = await soanBuoc(ht.id, b.khoa);
        toast.success(`Đã soạn "${r.tai_lieu.tieu_de}" và lưu vào Tài liệu & Chứng từ.`);
        onTaiLieu();
        return r.hanh_trinh;
      })}>
        {dang ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Soạn tài liệu
      </button>
    );
  }
  if (b.loai_hanh_dong === 'kiem_ket_qua') {
    return (
      <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void chay(() => danhDauBuoc(ht.id, b.khoa, 'completed', ketQua)); }}>
        <input aria-label="Kết quả" value={ketQua} onChange={(e) => setKetQua(e.target.value)} maxLength={500}
          placeholder="Ví dụ: số thông báo chấp nhận, ngày nhận biên nhận" className="h-9 flex-1 rounded-lg border border-border bg-card px-3 text-xs" />
        <button type="submit" className={nut} disabled={dang || ketQua.trim().length < 5}>Đóng việc</button>
      </form>
    );
  }
  if (b.loai_hanh_dong === 'nguoi_dung_lam') {
    if (hoiXacNhan) {
      return (
        <div role="alertdialog" aria-label="Xác nhận" className="flex flex-wrap items-center gap-2 text-xs">
          <span>{hoiXacNhan === 'waiting_external' ? 'Bạn đã tự nộp xong? MIMI sẽ chờ kết quả cùng bạn.' : 'Bạn đã làm xong bước này?'}</span>
          <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => danhDauBuoc(ht.id, b.khoa, hoiXacNhan))}>Đúng</button>
          <button type="button" className={nut} onClick={() => setHoiXacNhan(null)}>Chưa</button>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {b.khoa === 'nguoi_dung_nop' && b.trang_thai !== 'waiting_external' && <button type="button" className={nut} onClick={() => setHoiXacNhan('waiting_external')}>Tôi đã nộp</button>}
        <button type="button" className={nut} onClick={() => setHoiXacNhan('completed')}>Xong</button>
      </div>
    );
  }
  // Mở trang: đi làm ở trang đó, rồi đánh dấu xong.
  const laTraThuTuc = b.dich_hanh_dong === '/dashboard/tro-ly';
  const dich = laTraThuTuc ? `/dashboard/tro-ly?hoi=${encodeURIComponent(cauTraThuTuc(b.tieu_de))}` : b.dich_hanh_dong ?? '/dashboard';
  return (
    <div className="flex flex-wrap gap-2">
      <Link to={dich} className={nut}>{laTraThuTuc ? 'Tra thủ tục' : 'Mở'} <ChevronRight size={12} /></Link>
      <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => danhDauBuoc(ht.id, b.khoa, 'completed'))}>Đánh dấu xong</button>
    </div>
  );
}

export default function ViecCanLamPage() {
  const [thamSo, datThamSo] = useSearchParams();
  const idChon = thamSo.get('ht');
  const [ds, setDs] = useState<HanhTrinhDay[] | null>(null);
  const [hoSo, setHoSo] = useState<HoSoViec[]>([]);
  const [duocSua, setDuocSua] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [chiTiet, setChiTiet] = useState<{ ht: HanhTrinhDay; tai_lieu: TaiLieuTom[] } | null>(null);
  const [loaiMoi, setLoaiMoi] = useState('');

  const napDs = useCallback(async () => {
    try {
      const r = await dsViec();
      setDs(r.hanh_trinh); setHoSo(r.ho_so_viec); setDuocSua(r.duoc_sua); setLoi(null);
    } catch (e) { setLoi(loiCua(e)); }
  }, []);
  const napChiTiet = useCallback(async (id: string) => {
    try { const r = await docViec(id); setChiTiet({ ht: r.hanh_trinh, tai_lieu: r.tai_lieu }); setDuocSua(r.duoc_sua); } catch (e) { toast.error(loiCua(e)); }
  }, []);

  useEffect(() => { void napDs(); }, [napDs]);
  useEffect(() => { if (idChon) void napChiTiet(idChon); else setChiTiet(null); }, [idChon, napChiTiet]);

  const capNhat = (h: HanhTrinhDay) => {
    setChiTiet((c) => (c ? { ...c, ht: h } : c));
    if (h.trang_thai === 'hoan_tat') toast.success('Việc đã xong và được đóng lại.');
    void napDs();
  };

  const batDau = async () => {
    if (!loaiMoi) return;
    try { const h = await moViec(loaiMoi); datThamSo({ ht: h.id }); void napDs(); } catch (e) { toast.error(loiCua(e)); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Việc cần làm</h1>
        <p className="mt-1 text-sm text-muted-foreground">MIMI hỏi từng câu một, chuẩn bị giấy tờ và tra thủ tục. Bạn tự nộp, tự ký — MIMI không làm thay.</p>
      </div>

      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}
      {!ds && !loi && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc việc của bạn…</p>}

      {ds && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            {ds.length === 0 && <p className="text-sm text-muted-foreground">Chưa có việc nào đang mở. Hỏi MIMI, ví dụ "Tôi muốn tạm ngừng kinh doanh", hoặc bắt đầu ở dưới.</p>}
            <ul className="space-y-2">
              {ds.map((h) => {
                const td = tienDo(h);
                return (
                  <li key={h.id}>
                    <button type="button" onClick={() => datThamSo({ ht: h.id })}
                      className={`w-full rounded-xl border p-3 text-left ${idChon === h.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'}`}>
                      <p className="text-sm font-medium text-foreground">{h.tieu_de}</p>
                      <p className="text-xs text-muted-foreground">{TEN_TRANG_THAI_VIEC[h.trang_thai] ?? h.trang_thai} · {td.xong}/{td.tong} bước</p>
                      {h.cau_hoi && <p className="mt-1 text-xs text-primary">Cần trả lời: {h.cau_hoi.cau}</p>}
                    </button>
                  </li>
                );
              })}
            </ul>
            {duocSua && (
              <div className="rounded-xl border border-border bg-card p-3">
                <label htmlFor="loai-moi" className="text-xs font-medium text-muted-foreground">Bắt đầu việc mới</label>
                <div className="mt-2 flex gap-2">
                  <select id="loai-moi" value={loaiMoi} onChange={(e) => setLoaiMoi(e.target.value)} className="h-10 flex-1 rounded-lg border border-border bg-background px-2 text-sm">
                    <option value="">Chọn việc…</option>
                    {LOAI_HANH_TRINH.map((l) => <option key={l} value={l}>{MAU_HANH_TRINH[l].tieu_de}</option>)}
                  </select>
                  <button type="button" onClick={() => void batDau()} disabled={!loaiMoi} aria-label="Bắt đầu" className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-50"><Plus size={16} /></button>
                </div>
              </div>
            )}
            {hoSo.some((h) => h.trang_thai === 'da_giai_quyet') && (
              <details className="rounded-xl border border-border bg-card p-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Việc đã giải quyết</summary>
                <ul className="mt-2 space-y-1">
                  {hoSo.filter((h) => h.trang_thai === 'da_giai_quyet').map((h) => (
                    <li key={h.id} className="text-xs"><CheckCircle2 size={12} className="mr-1 inline text-mimi-green" />{h.tieu_de}{h.ket_qua ? ` — ${h.ket_qua}` : ''}</li>
                  ))}
                </ul>
              </details>
            )}
          </aside>

          <main className="space-y-4">
            {!chiTiet && ds.length > 0 && <p className="text-sm text-muted-foreground">Chọn một việc để làm tiếp.</p>}
            {chiTiet && (
              <>
                <h2 className="text-lg font-semibold text-foreground">{chiTiet.ht.tieu_de}</h2>
                {/* key theo câu hỏi: câu mới là ô mới. Trước đây một hiệu ứng xoá ô chạy cả sau lần hiện đầu,
                    nên chữ gõ nhanh (hoặc máy chậm) bị xoá mất. */}
                <CauHoiCard key={chiTiet.ht.cau_hoi?.khoa ?? 'het'} ht={chiTiet.ht} duocSua={duocSua} onXong={capNhat} />
                <ol className="divide-y divide-border rounded-2xl border border-border bg-card">
                  {chiTiet.ht.buoc.map((b) => (
                    <li key={b.khoa} className={`space-y-2 p-4 ${b.trang_thai === 'skipped' ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{b.thu_tu}. {b.tieu_de}</p>
                          {b.mo_ta && <p className="text-xs text-muted-foreground">{b.mo_ta}</p>}
                          {b.ly_do_chan && <p className="text-xs text-mimi-amber">{b.ly_do_chan}</p>}
                        </div>
                        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">{TEN_TRANG_THAI_BUOC[b.trang_thai] ?? b.trang_thai}</span>
                      </div>
                      <HanhDongBuoc ht={chiTiet.ht} b={b} duocSua={duocSua} onXong={capNhat} onTaiLieu={() => void napChiTiet(chiTiet.ht.id)} />
                    </li>
                  ))}
                </ol>
                {chiTiet.tai_lieu.length > 0 && (
                  <section aria-labelledby="tl-viec" className="rounded-2xl border border-border bg-card p-4">
                    <h3 id="tl-viec" className="text-sm font-semibold text-foreground">Tài liệu của việc này</h3>
                    <ul className="mt-2 space-y-2">
                      {chiTiet.tai_lieu.map((t) => (
                        <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                          <span>{t.tieu_de}{t.do_day ? ` · ${TEN_DO_DAY[t.do_day] ?? t.do_day}` : ''}</span>
                          <button type="button" className="text-xs font-medium text-primary hover:underline"
                            onClick={() => void moTaiLieu(t.id).then((r) => window.open(r.url, '_blank', 'noopener,noreferrer')).catch((e) => toast.error(loiCua(e)))}>Mở</button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
