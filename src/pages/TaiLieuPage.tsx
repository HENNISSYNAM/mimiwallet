import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  chuanBiNop, daNopTaiLieu, dsNop, dsTaiLieu, duyetTaiLieu, moTaiLieu, TEN_DO_DAY, TEN_LOAI_TAI_LIEU, TEN_TRANG_THAI_TAI_LIEU,
  type TaiLieuTom, type YeuCauNop,
} from '@/lib/hanhTrinh';
import NopVaTheoDoi from '@/components/tai-lieu/NopVaTheoDoi';

/** Loại tài liệu nộp được cho cơ quan (báo cáo phân tích nội bộ thì không). */
const NOP_DUOC = new Set(['explanation_letter', 'audit_pack', 'tax_readiness_pack', 'administrative_letter', 'tax_form', 'registration_document']);

/**
 * Tài liệu & Chứng từ — Prompt 4 mục 18–20, 26–27.
 *
 * Mỗi tài liệu có phiên bản bất biến (mã băm in kèm) và nhãn in ngay trên trang. Duyệt và "đã nộp" đi
 * qua hộp xác nhận; tài liệu đã nộp thì cơ sở dữ liệu khoá, không sửa được.
 */
const loiCua = (e: unknown) => (e instanceof Error ? e.message : 'Có lỗi. Thử lại sau ít phút.');
const DUYET_DUOC = new Set(['chu_so_huu', 'quan_tri', 'ke_toan']);
const DA_KHOA = new Set(['signed', 'submitted', 'accepted']);

function Dong({ t, vaiTro, onDoi, onChuanBi }: { t: TaiLieuTom; vaiTro: string; onDoi: (t: TaiLieuTom) => void; onChuanBi: (y: YeuCauNop) => void }) {
  const [dang, setDang] = useState(false);
  const [xacNhan, setXacNhan] = useState<null | 'approved' | 'submitted' | 'rejected'>(null);
  const [nhanXet, setNhanXet] = useState('');
  const chay = async (f: () => Promise<TaiLieuTom>, cau: string) => {
    setDang(true);
    try { onDoi(await f()); toast.success(cau); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); setXacNhan(null); setNhanXet(''); }
  };
  const nut = 'h-9 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50';
  const khoa = DA_KHOA.has(t.trang_thai);
  return (
    <li className="space-y-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{t.tieu_de}</p>
          <p className="text-xs text-muted-foreground">
            {TEN_LOAI_TAI_LIEU[t.loai] ?? t.loai} · {TEN_TRANG_THAI_TAI_LIEU[t.trang_thai] ?? t.trang_thai}
            {t.do_day ? ` · ${TEN_DO_DAY[t.do_day] ?? t.do_day}` : ''} · phiên bản {t.phien_ban_hien_tai ?? 1} · {new Date(t.tao_luc).toLocaleDateString('vi-VN')}
          </p>
        </div>
        <button type="button" className={`${nut} inline-flex items-center gap-1`} onClick={() => void moTaiLieu(t.id).then((r) => window.open(r.url, '_blank', 'noopener,noreferrer')).catch((e) => toast.error(loiCua(e)))}>
          Mở <ExternalLink size={12} />
        </button>
      </div>
      {!khoa && !xacNhan && (
        <div className="flex flex-wrap gap-2">
          {DUYET_DUOC.has(vaiTro) && <>
            <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => duyetTaiLieu(t.id, 'needs_review'), 'Đã đánh dấu cần xem lại.')}>Cần xem lại</button>
            <button type="button" className={nut} disabled={dang} onClick={() => setXacNhan('approved')}>Duyệt</button>
            <button type="button" className={nut} disabled={dang} onClick={() => setXacNhan('rejected')}>Không duyệt</button>
          </>}
          {DUYET_DUOC.has(vaiTro) && NOP_DUOC.has(t.loai) && (
            <button type="button" className={nut} disabled={dang} onClick={async () => {
              setDang(true);
              try { onChuanBi(await chuanBiNop(t.id)); toast.success('Đã khoá bản này để nộp — xem mục "Nộp & theo dõi".'); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); }
            }}>Chuẩn bị nộp</button>
          )}
          {DUYET_DUOC.has(vaiTro) && !NOP_DUOC.has(t.loai) && <button type="button" className={nut} disabled={dang} onClick={() => setXacNhan('submitted')}>Tôi đã tự nộp</button>}
        </div>
      )}
      {xacNhan && (
        <div role="alertdialog" aria-label="Xác nhận" className="space-y-2 rounded-lg bg-accent/50 p-3 text-xs">
          <p>
            {xacNhan === 'approved' && 'Duyệt tài liệu này? Việc duyệt được ghi lại kèm tên bạn và phiên bản đang xem.'}
            {xacNhan === 'rejected' && 'Ghi lý do không duyệt:'}
            {xacNhan === 'submitted' && 'Bạn đã tự nộp tài liệu này (ngoài MIMI)? Sau khi ghi nhận, tài liệu bị khoá, không sửa được.'}
          </p>
          {xacNhan === 'rejected' && <textarea aria-label="Lý do" value={nhanXet} onChange={(e) => setNhanXet(e.target.value)} maxLength={2000} rows={2} className="w-full rounded-lg border border-border bg-card p-2" />}
          <div className="flex gap-2">
            <button type="button" className={nut} disabled={dang || (xacNhan === 'rejected' && !nhanXet.trim())} onClick={() => {
              if (xacNhan === 'approved') void chay(() => duyetTaiLieu(t.id, 'approved', undefined, true), 'Đã duyệt.');
              else if (xacNhan === 'rejected') void chay(() => duyetTaiLieu(t.id, 'rejected', nhanXet), 'Đã ghi không duyệt.');
              else void chay(() => daNopTaiLieu(t.id), 'Đã ghi nhận bạn đã nộp.');
            }}>{dang ? <Loader2 size={12} className="animate-spin" /> : 'Xác nhận'}</button>
            <button type="button" className={nut} onClick={() => setXacNhan(null)}>Huỷ</button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function TaiLieuPage() {
  const [ds, setDs] = useState<TaiLieuTom[] | null>(null);
  const [nop, setNop] = useState<YeuCauNop[]>([]);
  const doiNop = (y: YeuCauNop) => {
    setNop((cu) => [y, ...cu.filter((x) => x.id !== y.id)]);
    void dsTaiLieu().then((r) => setDs(r.tai_lieu)).catch(() => undefined);
  };
  const [vaiTro, setVaiTro] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const nap = useCallback(async () => {
    try { const r = await dsTaiLieu(); setDs(r.tai_lieu); setVaiTro(r.vai_tro); setLoi(null); } catch (e) { setLoi(loiCua(e)); }
    // Danh sách nộp đọc riêng: lỗi ở đây không được làm mất thư viện.
    try { setNop((await dsNop()).yeu_cau); } catch { /* máy chủ cũ chưa có hành động này */ }
  }, []);
  useEffect(() => { void nap(); }, [nap]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tài liệu & Chứng từ</h1>
        <p className="mt-1 text-sm text-muted-foreground">Báo cáo, gói bằng chứng, công văn MIMI soạn — mỗi bản có nhãn, nguồn và mã băm để đối chiếu bản in.</p>
      </div>
      {loi && (
        <div role="alert" className="flex items-center gap-3 text-sm text-destructive">
          {loi} <button type="button" onClick={() => void nap()} className="h-9 rounded-lg border border-border px-3 text-xs text-foreground">Thử lại</button>
        </div>
      )}
      {!ds && !loi && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc thư viện…</p>}
      <NopVaTheoDoi ds={nop} vaiTro={vaiTro} onDoi={doiNop} />
      {ds && ds.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có tài liệu nào. Hỏi MIMI "Soạn báo cáo tháng này" hoặc làm một việc trong Việc cần làm — tài liệu MIMI soạn sẽ nằm ở đây.</p>
      )}
      {ds && ds.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {ds.map((t) => <Dong key={t.id} t={t} vaiTro={vaiTro} onChuanBi={doiNop} onDoi={(moi) => setDs((cu) => (cu ?? []).map((x) => (x.id === moi.id ? { ...x, ...moi } : x)))} />)}
        </ul>
      )}
    </div>
  );
}
