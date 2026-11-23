/**
 * AGENTIC AI SPACE (/dashboard/space, 22/11/2026, bản 2) — một nơi duy nhất cho workflow người + mèo agent.
 * Mô tả việc → MIMI dựng (theo kho kiến thức nghề + thư viện chu trình chuẩn). Hoặc chọn mẫu trong THƯ VIỆN. Workflow mở
 * NGAY TRONG TRANG (?qt=…), không chuyển lớp. Đội 12 mèo hiện con nào đang có mặt ở bao nhiêu workflow — không còn
 * danh sách agent riêng rời rạc.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Orbit } from 'lucide-react';
import { ThanhTabHome } from '@/components/khong-gian/ThanhTabHome';
import { Meo } from '@/components/agent/AvatarMeo';
import KhongGianQuyTrinh, { TEN_PA } from '@/components/quy-trinh/KhongGianQuyTrinh';
import PhongChatMeo from '@/components/quy-trinh/PhongChatMeo';
import { tenMeo } from '@/components/quy-trinh/KhungVe';
import { docBang } from '@/lib/goiSpace';
import { dsQuyTrinh, taoQuyTrinh, taoTuMau, thuVien, type DongQuyTrinh, type MauThuVien } from '@/lib/goiQuyTrinh';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

export const TEN_LV: Record<string, string> = {
  tai_chinh: 'Tài chính & thuế', thanh_toan: 'Thanh toán', bao_mat: 'Bảo mật', ho_so: 'Hồ sơ', nhan_su: 'Nhân sự', cong_viec: 'Công việc',
};
export const MEO_KHOA = ['phan_loai', 'thue', 'dong_tien', 'ho_so', 'bao_ve', 'doi_soat', 'cong_no', 'mua_hang', 'luong', 'tuan_thu', 'bao_cao', 'thu_ky'];
const TEN_TT: Record<string, string> = { nhap: 'Bản nháp', dang_chay: 'Đang chạy', xong: 'Xong', dung: 'Đã dừng' };

export default function AgenticSpacePage() {
  const [thamSo, datThamSo] = useSearchParams();
  const [ds, setDs] = useState<DongQuyTrinh[] | null>(null);
  const [mau, setMau] = useState<MauThuVien[]>([]);
  const [khachDs, setKhachDs] = useState<{ id: string; ten: string }[]>([]);
  const [cau, setCau] = useState('');
  const [khach, setKhach] = useState('');
  const [lv, setLv] = useState<string>('');
  const [dang, setDang] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const qtMo = thamSo.get('qt');
  // Điện thoại: mở Space ra là danh bạ trò chuyện (như Zalo); máy tính: workflow. Người dùng chọn tab thì theo lựa chọn.
  const laDienThoai = typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 767px)').matches;
  const tabChat = (thamSo.get('tab') ?? (laDienThoai ? 'chat' : 'wf')) === 'chat';

  const tai = useCallback(async () => {
    try {
      const [q, m, b, id] = await Promise.all([dsQuyTrinh(), thuVien().catch(() => []), docBang().catch(() => null), idCongTyDangDung().catch(() => null)]);
      setDs(q); setMau(m);
      const kd = b?.khach ?? [];
      setKhachDs(kd);
      setKhach((k) => k || (kd.some((x) => x.id === id) ? id! : kd[0]?.id ?? ''));
    } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa đọc được Agentic AI Space.'); }
  }, []);
  useEffect(() => { if (!qtMo) void tai(); }, [tai, qtMo]);

  const mo = (id: string) => datThamSo({ qt: id });
  const tao = async (f: () => Promise<string>, ten: string) => {
    if (!khach) return;
    setDang(ten); setLoi(null);
    try { mo(await f()); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa dựng được workflow.'); } finally { setDang(null); }
  };
  const soMeo = useMemo(() => {
    const m = new Map<string, number>();
    for (const q of ds ?? []) for (const k of q.meo ?? []) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  }, [ds]);
  const mauLoc = mau.filter((m) => !lv || m.linh_vuc === lv);

  if (qtMo && /^[0-9a-f-]{36}$/i.test(qtMo)) return <KhongGianQuyTrinh id={qtMo} onDong={() => datThamSo({}, { replace: true })} />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <ThanhTabHome />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Orbit className="text-primary" /> Agentic AI Space</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Mô tả việc — MIMI dựng workflow người + mèo agent theo chuẩn nghề. Sửa ngay trên khung, chốt rồi chạy. Hoặc nhắn tin trực tiếp cho từng mèo.</p>
        <div role="tablist" aria-label="Chế độ" className="mt-2 inline-flex gap-0.5 rounded-lg bg-muted p-0.5">
          {([['wf', 'Workflow'], ['chat', 'Trò chuyện']] as const).map(([k, t]) => (
            <button key={k} type="button" role="tab" aria-selected={(k === 'chat') === tabChat} onClick={() => datThamSo({ tab: k }, { replace: true })}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${(k === 'chat') === tabChat ? 'bg-background font-medium text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
          ))}
        </div>
      </header>

      {tabChat && khach && <PhongChatMeo companyId={khach} nhom={(ds ?? []).filter((q) => q.company_id === khach).map((q) => ({ id: q.id, tieu_de: q.tieu_de }))} onMoNhom={mo} />}
      {tabChat && !khach && <p className="text-sm text-muted-foreground">Chưa có công ty để trò chuyện.</p>}
      {!tabChat && (<>

      <form className="space-y-3 rounded-2xl border bg-card p-4" onSubmit={(e) => { e.preventDefault(); const c = cau.trim(); if (c) void tao(() => taoQuyTrinh(khach, c), 'dung'); }}>
        <textarea value={cau} onChange={(e) => setCau(e.target.value)} rows={2} maxLength={1000} aria-label="Mô tả việc"
          placeholder="Ví dụ: hoàn ứng công tác phí cho nhân viên, quản lý duyệt, kế toán chi"
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-muted-foreground" />
        <div className="flex flex-wrap items-center gap-2">
          <select value={khach} onChange={(e) => setKhach(e.target.value)} aria-label="Công ty" className="min-w-[200px] rounded-lg border bg-background px-2 py-1.5 text-sm">
            {khachDs.map((k) => <option key={k.id} value={k.id}>{k.ten}</option>)}
          </select>
          <button type="submit" disabled={!!dang || !cau.trim() || !khach}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900">
            {dang === 'dung' ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} {dang === 'dung' ? 'Đang dựng…' : 'Dựng workflow'}
          </button>
        </div>
      </form>
      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      <section aria-label="Thư viện workflow" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-sm font-semibold text-foreground">Thư viện workflow</h2>
          {['', ...Object.keys(TEN_LV)].map((k) => (
            <button key={k || 'tat_ca'} type="button" aria-pressed={lv === k} onClick={() => setLv(k)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${lv === k ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'text-muted-foreground hover:bg-muted'}`}>
              {k ? TEN_LV[k] : 'Tất cả'}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {mauLoc.map((m) => (
            <article key={m.khoa} className="flex flex-col rounded-2xl border bg-card p-4">
              <p className="text-[11px] text-muted-foreground">{TEN_LV[m.linh_vuc]} · {m.khung}</p>
              <p className="mt-1 font-medium text-foreground">{m.tieu_de}</p>
              <p className="mt-0.5 flex-1 text-xs text-muted-foreground">{m.mo_ta} · {m.so_buoc} bước</p>
              <button type="button" disabled={!!dang || !khach} onClick={() => void tao(() => taoTuMau(khach, m.khoa), m.khoa)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50">
                {dang === m.khoa ? <Loader2 size={14} className="animate-spin" /> : '+'} Dùng mẫu
              </button>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Đội mèo agent" className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Đội mèo agent</h2>
        <div className="flex flex-wrap gap-2">
          {MEO_KHOA.map((k) => {
            const n = soMeo.get(k) ?? 0;
            return (
              <span key={k} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 text-xs text-muted-foreground">
                <Meo khoa={k} net={n ? 'lam' : 'ngu'} co={26} ten={tenMeo(k)} />{tenMeo(k)}{n ? ` · ${n} workflow` : ''}
              </span>
            );
          })}
        </div>
      </section>

      <section aria-label="Workflow" className="rounded-2xl border bg-card">
        <h2 className="border-b px-4 py-3 text-sm font-semibold text-foreground">Workflow của bạn</h2>
        {ds === null ? <p className="p-4 text-sm text-muted-foreground">Đang đọc…</p> : ds.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Chưa có workflow nào. Mô tả một việc ở trên, hoặc dùng một mẫu.</p>
        ) : (
          <ul className="divide-y">
            {ds.map((q) => (
              <li key={q.id}>
                <button type="button" onClick={() => mo(q.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50">
                  <span className="flex -space-x-1.5">{(q.meo ?? []).slice(0, 3).map((k) => <Meo key={k} khoa={k} co={22} ten={tenMeo(k)} />)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{q.tieu_de}</span>
                    <span className="block truncate text-xs text-muted-foreground">{q.ten_khach} · {TEN_LV[q.linh_vuc] ?? q.linh_vuc} · {TEN_PA[q.phuong_an]}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{TEN_TT[q.trang_thai]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      </>)}
    </div>
  );
}
