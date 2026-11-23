/**
 * AGENTIC AI SPACE (/dashboard/space, bản 3 — 24/11/2026): MỘT phòng trò chuyện duy nhất, không còn tab Workflow | Trò chuyện.
 * Mỗi workflow là một NHÓM CHAT (?nhom=…) nơi các mèo làm việc và phản ứng như người; chat riêng từng mèo nằm cùng danh bạ.
 * "Nhóm mới" = mô tả việc → MIMI dựng (kho kiến thức nghề + thư viện chu trình chuẩn). "Mở khung" (?qt=…) xem sơ đồ đầy đủ.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Orbit } from 'lucide-react';
import { ThanhTabHome } from '@/components/khong-gian/ThanhTabHome';
import KhongGianQuyTrinh from '@/components/quy-trinh/KhongGianQuyTrinh';
import PhongChatMeo from '@/components/quy-trinh/PhongChatMeo';
import { docBang } from '@/lib/goiSpace';
import { dsQuyTrinh, taoQuyTrinh, taoTuMau, thuVien, type DongQuyTrinh, type MauThuVien } from '@/lib/goiQuyTrinh';
import { idCongTyDangDung } from '@/lib/congTyDangDung';

export const TEN_LV: Record<string, string> = {
  tai_chinh: 'Tài chính & thuế', thanh_toan: 'Thanh toán', bao_mat: 'Bảo mật', ho_so: 'Hồ sơ', nhan_su: 'Nhân sự', cong_viec: 'Công việc',
};
export const MEO_KHOA = ['phan_loai', 'thue', 'dong_tien', 'ho_so', 'bao_ve', 'doi_soat', 'cong_no', 'mua_hang', 'luong', 'tuan_thu', 'bao_cao', 'thu_ky'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const nhomMo = UUID_RE.test(thamSo.get('nhom') ?? '') ? thamSo.get('nhom') : null;

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

  const moKhung = (id: string) => datThamSo({ qt: id });
  const chonNhom = (id: string | null) => datThamSo(id ? { nhom: id } : {}, { replace: true });
  const tao = async (f: () => Promise<string>, ten: string) => {
    if (!khach) return;
    setDang(ten); setLoi(null);
    try { const id = await f(); await tai(); chonNhom(id); setCau(''); } catch (e) { setLoi(e instanceof Error ? e.message : 'Chưa dựng được workflow.'); } finally { setDang(null); }
  };
  const mauLoc = mau.filter((m) => !lv || m.linh_vuc === lv);

  if (qtMo && UUID_RE.test(qtMo)) return <KhongGianQuyTrinh id={qtMo} onDong={() => datThamSo(nhomMo ? { nhom: nhomMo } : {}, { replace: true })} />;

  const moi = (
    <div className="mx-auto w-full max-w-2xl space-y-4">
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
        <div className="grid gap-3 sm:grid-cols-2">
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
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <ThanhTabHome />
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Orbit className="text-primary" /> Agentic AI Space</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Mỗi workflow là một nhóm chat: các mèo làm việc, phản ứng với nhau và dừng lại hỏi bạn ở chỗ cần người quyết. Hoặc nhắn riêng từng mèo.</p>
      </header>
      {khach
        ? <PhongChatMeo companyId={khach} nhom={(ds ?? []).filter((q) => q.company_id === khach).map((q) => ({ id: q.id, tieu_de: q.tieu_de }))}
            nhomMo={nhomMo} onChonNhom={chonNhom} onMoKhung={moKhung} moi={moi} />
        : loi ? <p role="alert" className="text-sm text-destructive">{loi}</p> : <p className="text-sm text-muted-foreground">{ds === null ? 'Đang đọc…' : 'Chưa có công ty để trò chuyện.'}</p>}
    </div>
  );
}
