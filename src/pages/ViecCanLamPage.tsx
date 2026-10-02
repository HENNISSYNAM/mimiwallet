import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, FileText, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  cauTraThuTuc, danhDauBuoc, docChiTietViec, docViec, dsViecCanLam, ghiDaNopViec, ghiPhanHoiViec, huyViec, laDangMo, LOAI_HANH_TRINH,
  MAU_HANH_TRINH, moTaiLieu, moViec, soanBuoc, TEN_LOAI_BANG_CHUNG, TEN_LOAI_NGAY, TEN_MUC, TEN_TRANG_THAI_BUOC,
  TEN_TRANG_THAI_HO_SO, TEN_XAC_MINH, traLoiViec, type Buoc, type ChiTietViec, type HanhTrinhDay, type KetQuaViecCanLam, type ViecCanLam,
} from '@/lib/hanhTrinh';

/**
 * Việc cần làm — Prompt 4B (26/09/2026). MỘT danh sách (cùng nguồn với Trợ lý, pet, lịch): mỗi việc nói
 * CÁI GÌ, VÌ SAO, KHI NÀO, VIỆC TIẾP THEO. Chi tiết một việc: việc tiếp theo, ba loại ngày (hạn pháp lý /
 * MIMI khuyên / hẹn kiểm lại — không lẫn), bằng chứng kèm mức chắc chắn, dòng thời gian thật.
 *
 * Mọi thay đổi đi qua máy chủ; trình duyệt không ghi thẳng bảng nào. "Bạn xác nhận" không bao giờ hiện
 * như "đã xác minh".
 */
const loiCua = (e: unknown) => (e instanceof Error ? e.message : 'Có lỗi. Thử lại sau ít phút.');
const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');
const gioVN = (iso: string) => new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const MAU_NGAY: Record<string, string> = {
  han_luat: 'border-destructive/40 bg-destructive/5 text-destructive',
  nen_lam: 'border-primary/30 bg-primary/5 text-primary',
  hen_kiem_lai: 'border-border bg-accent text-muted-foreground',
};

function CauHoiCard({ ht, duocSua, onXong }: { ht: HanhTrinhDay; duocSua: boolean; onXong: () => void }) {
  const c = ht.cau_hoi;
  const [gt, setGt] = useState('');
  const [dang, setDang] = useState(false);
  if (!c) return null;
  const gui = async (v: string) => {
    setDang(true);
    try { await traLoiViec(ht.id, c.khoa, v); onXong(); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); }
  };
  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-foreground">{c.cau}</p>
      <p className="text-xs text-muted-foreground">{c.vi_sao}</p>
      {!duocSua ? (
        <p className="mt-2 text-sm text-muted-foreground">Vai trò của bạn chỉ xem được việc này.</p>
      ) : c.kieu === 'lua_chon' ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {(c.lua_chon ?? []).map((l) => (
            <button key={l.gia_tri} type="button" disabled={dang} onClick={() => void gui(l.gia_tri)}
              className="h-11 rounded-lg border border-border bg-card px-4 text-sm font-medium hover:border-primary disabled:opacity-50">{l.nhan}</button>
          ))}
        </div>
      ) : (
        <form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (gt.trim()) void gui(gt.trim()); }}>
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
    </div>
  );
}

/** "Tôi đã nộp" — mã hồ sơ tuỳ chọn; nói rõ đây là xác nhận của bạn, chưa phải của cơ quan. */
function GhiDaNop({ caseId, onXong }: { caseId: string; onXong: () => void }) {
  const [ma, setMa] = useState('');
  const [hoi, setHoi] = useState(false);
  const [dang, setDang] = useState(false);
  const gui = async () => {
    setDang(true);
    try { await ghiDaNopViec(caseId, ma.trim() || undefined); toast.success('Đã ghi nhận bạn nộp hồ sơ. MIMI sẽ nhắc bạn kiểm phản hồi.'); onXong(); }
    catch (e) { toast.error(loiCua(e)); } finally { setDang(false); setHoi(false); }
  };
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="ma-ho-so">Mã hồ sơ / số biên nhận (nếu có)</label>
      <input id="ma-ho-so" value={ma} onChange={(e) => setMa(e.target.value)} maxLength={60} placeholder="Ví dụ: 11220260001234"
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm sm:w-72" />
      {hoi ? (
        <div role="alertdialog" aria-label="Xác nhận đã nộp" className="flex flex-wrap items-center gap-2 text-sm">
          <span>MIMI sẽ ghi là <strong>bạn xác nhận</strong> đã nộp — chưa phải xác nhận của cơ quan.</span>
          <button type="button" disabled={dang} onClick={() => void gui()} className="h-9 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">Đúng, tôi đã nộp</button>
          <button type="button" onClick={() => setHoi(false)} className="h-9 rounded-lg border border-border px-3 text-xs">Chưa</button>
        </div>
      ) : (
        <button type="button" onClick={() => setHoi(true)} className="block h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Tôi đã nộp</button>
      )}
    </div>
  );
}

/** Ghi phản hồi của cơ quan — đóng việc ở mức "theo xác nhận của bạn" khi đủ điều kiện. */
function GhiPhanHoi({ caseId, onXong }: { caseId: string; onXong: () => void }) {
  const [nd, setNd] = useState('');
  const [dang, setDang] = useState(false);
  return (
    <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
      e.preventDefault();
      setDang(true);
      try { await ghiPhanHoiViec(caseId, nd.trim()); toast.success('Đã ghi phản hồi.'); onXong(); } catch (er) { toast.error(loiCua(er)); } finally { setDang(false); }
    }}>
      <input aria-label="Phản hồi của cơ quan" value={nd} onChange={(e) => setNd(e.target.value)} maxLength={500}
        placeholder="Ví dụ: Thông báo chấp nhận số 123/TB-CCT ngày 05/10/2026" className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm" />
      <button type="submit" disabled={dang || nd.trim().length < 5} className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50">Ghi phản hồi</button>
    </form>
  );
}

function HanhDongBuoc({ ht, b, duocSua, onXong, onTaiLieu }: {
  ht: HanhTrinhDay; b: Buoc; duocSua: boolean; onXong: () => void; onTaiLieu: () => void;
}) {
  const [dang, setDang] = useState(false);
  if (!duocSua || b.trang_thai === 'completed' || b.trang_thai === 'skipped' || b.trang_thai === 'blocked' || b.loai_hanh_dong === 'hoi') return null;
  // Nộp và kiểm kết quả làm ở thẻ "Việc tiếp theo" (có mã hồ sơ, nói rõ mức xác nhận).
  if (b.khoa === 'nguoi_dung_nop' || b.loai_hanh_dong === 'kiem_ket_qua') return null;
  const chay = async (f: () => Promise<unknown>) => {
    setDang(true);
    try { await f(); onXong(); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); }
  };
  const nut = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50';
  if (b.loai_hanh_dong === 'soan_tai_lieu') {
    return (
      <button type="button" className={nut} disabled={dang} onClick={() => void chay(async () => {
        const r = await soanBuoc(ht.id, b.khoa);
        toast.success(`Đã soạn "${r.tai_lieu.tieu_de}" và lưu vào Tài liệu & Chứng từ.`);
        onTaiLieu();
      })}>
        {dang ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Soạn tài liệu
      </button>
    );
  }
  const laTraThuTuc = b.dich_hanh_dong === '/dashboard/tro-ly';
  const dich = laTraThuTuc ? `/dashboard/tro-ly?hoi=${encodeURIComponent(cauTraThuTuc(b.tieu_de))}` : b.dich_hanh_dong ?? '/dashboard';
  return (
    <div className="flex flex-wrap gap-2">
      {b.loai_hanh_dong === 'mo_trang' && <Link to={dich} className={nut}>{laTraThuTuc ? 'Tra thủ tục' : 'Mở'} <ChevronRight size={12} /></Link>}
      <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => danhDauBuoc(ht.id, b.khoa, 'completed'))}>Đánh dấu xong</button>
    </div>
  );
}

function TheViec({ v, chon, onChon }: { v: ViecCanLam; chon: boolean; onChon: () => void }) {
  const noiDung = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{TEN_MUC[v.muc]}{v.trang_thai ? ` · ${TEN_TRANG_THAI_HO_SO[v.trang_thai as keyof typeof TEN_TRANG_THAI_HO_SO] ?? v.trang_thai}` : ''}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{v.tieu_de}</p>
      {v.hanh_dong && v.hanh_dong.tieu_de !== v.tieu_de && <p className="mt-1 text-sm text-primary">Việc tiếp theo: {v.hanh_dong.tieu_de}</p>}
      <p className="mt-1 text-xs text-muted-foreground">{v.vi_sao}</p>
      {v.khi && <p className="mt-1 inline-flex items-center gap-1 text-xs text-foreground"><CalendarClock size={12} aria-hidden /> {v.khi.nhan}</p>}
    </>
  );
  const lop = `block w-full rounded-xl border p-3 text-left ${chon ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent'}`;
  return v.nguon === 'ho_so_viec'
    ? <button type="button" onClick={onChon} className={lop}>{noiDung}</button>
    : <Link to={v.duong_dan} className={lop}>{noiDung}</Link>;
}

function ChiTiet({ ct, duocSua, onDoi }: { ct: ChiTietViec; duocSua: boolean; onDoi: () => void }) {
  const v = ct.viec;
  const ht = ct.hanh_trinh;
  const a = ct.hanh_dong;
  const [huy, setHuy] = useState(false);
  const moTl = async (id: string) => {
    try { const r = await moTaiLieu(id); window.open(r.url, '_blank', 'noopener,noreferrer'); } catch (e) { toast.error(loiCua(e)); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{v.tieu_de}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v.trang_thai === 'resolved_system_verified' ? 'bg-mimi-green/15 text-mimi-green' : v.trang_thai === 'resolved_user_confirmed' ? 'bg-accent text-foreground' : 'bg-primary/10 text-primary'}`}>
          {v.ten_trang_thai}
        </span>
      </div>

      {a && (
        <section aria-labelledby="viec-tiep" className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Việc tiếp theo</p>
          <h3 id="viec-tiep" className="mt-1 text-lg font-semibold text-foreground">{a.tieu_de}</h3>
          {a.mo_ta && a.mo_ta !== a.tieu_de && <p className="mt-1 text-sm text-foreground">{a.mo_ta}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Vì sao: {a.vi_sao}</p>
          <p className="text-xs text-muted-foreground">Xong khi: {a.dieu_kien_xong}</p>
          {a.loai === 'tra_loi' && ht && <CauHoiCard key={ht.cau_hoi?.khoa ?? 'het'} ht={ht} duocSua={duocSua} onXong={onDoi} />}
          {duocSua && a.loai === 'ghi_da_nop' && <GhiDaNop caseId={v.id} onXong={onDoi} />}
          {duocSua && (a.loai === 'kiem_phan_hoi' || a.loai === 'ghi_phan_hoi' || a.loai === 'bo_sung_bang_chung') && <GhiPhanHoi caseId={v.id} onXong={onDoi} />}
          {a.loai === 'phan_loai_doanh_thu' && (
            <Link to="/dashboard/to-khai" className="mt-3 inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Phân loại ở Tờ khai thuế <ChevronRight size={14} /></Link>
          )}
        </section>
      )}

      {ct.lich.length > 0 && (
        <section aria-labelledby="ngay-viec" className="rounded-2xl border border-border bg-card p-4">
          <h3 id="ngay-viec" className="text-sm font-semibold text-foreground">Ngày của việc này</h3>
          <ul className="mt-2 space-y-2">
            {ct.lich.map((m) => (
              <li key={`${m.loai_ngay}:${m.ngay}`} className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${MAU_NGAY[m.loai_ngay]}`}>{TEN_LOAI_NGAY[m.loai_ngay]}</span>
                <span className={m.da_xong ? 'line-through text-muted-foreground' : 'text-foreground'}>{ngayVN(m.ngay)}</span>
                {m.ghi_chu && <span className="text-xs text-muted-foreground">— {m.ghi_chu}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ht && (
        <ol className="divide-y divide-border rounded-2xl border border-border bg-card" aria-label="Các bước">
          {ht.buoc.map((b) => (
            <li key={b.khoa} className={`space-y-2 p-4 ${b.trang_thai === 'skipped' ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.thu_tu}. {b.tieu_de}</p>
                  {b.mo_ta && <p className="text-xs text-muted-foreground">{b.mo_ta}</p>}
                  {b.ly_do_chan && <p className="text-xs text-mimi-amber">{b.ly_do_chan}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">{TEN_TRANG_THAI_BUOC[b.trang_thai] ?? b.trang_thai}</span>
              </div>
              <HanhDongBuoc ht={ht} b={b} duocSua={duocSua && laDangMo(v.trang_thai)} onXong={onDoi} onTaiLieu={onDoi} />
            </li>
          ))}
        </ol>
      )}

      {ct.dieu_kien && !ct.dieu_kien.dat && laDangMo(v.trang_thai) && (
        <section aria-label="Vì sao chưa đóng" className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-medium text-foreground">Việc chưa đóng được vì:</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">{ct.dieu_kien.thieu.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}

      <section aria-labelledby="bang-chung" className="rounded-2xl border border-border bg-card p-4">
        <h3 id="bang-chung" className="text-sm font-semibold text-foreground">Bằng chứng</h3>
        {ct.bang_chung.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">Chưa có bằng chứng nào.</p> : (
          <ul className="mt-2 space-y-2">
            {ct.bang_chung.map((b) => (
              <li key={b.khoa_trung} className="text-sm">
                <span className="font-medium text-foreground">{TEN_LOAI_BANG_CHUNG[b.loai]}</span>
                {b.gia_tri && <span className="text-foreground">: {b.gia_tri}</span>}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${b.trang_thai_xac_minh === 'system_verified' ? 'bg-mimi-green/15 text-mimi-green' : 'bg-accent text-muted-foreground'}`}>{TEN_XAC_MINH[b.trang_thai_xac_minh]}</span>
                {b.tai_lieu_id && <button type="button" className="ml-2 text-xs text-primary hover:underline" onClick={() => void moTl(b.tai_lieu_id as string)}>Mở</button>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="dong-thoi-gian" className="rounded-2xl border border-border bg-card p-4">
        <h3 id="dong-thoi-gian" className="text-sm font-semibold text-foreground">Dòng thời gian</h3>
        <ol className="mt-2 space-y-1.5">
          {ct.dong_thoi_gian.map((d, i) => (
            <li key={`${d.luc}:${i}`} className="flex gap-3 text-sm">
              <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">{gioVN(d.luc)}</span>
              <span className="text-foreground">{d.cau}</span>
            </li>
          ))}
        </ol>
      </section>

      {duocSua && laDangMo(v.trang_thai) && v.loai !== 'phan_loai_hoat_dong' && (
        huy ? (
          <div role="alertdialog" aria-label="Huỷ việc" className="flex flex-wrap items-center gap-2 text-sm">
            <span>Huỷ việc này? Dấu vết và bằng chứng vẫn được giữ.</span>
            <button type="button" className="h-9 rounded-lg bg-destructive px-3 text-xs font-medium text-destructive-foreground"
              onClick={() => void huyViec(v.id).then(() => { toast.success('Đã huỷ việc.'); onDoi(); }).catch((e) => toast.error(loiCua(e))).finally(() => setHuy(false))}>Huỷ việc</button>
            <button type="button" className="h-9 rounded-lg border border-border px-3 text-xs" onClick={() => setHuy(false)}>Không</button>
          </div>
        ) : <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setHuy(true)}>Huỷ việc này</button>
      )}
    </div>
  );
}

export default function ViecCanLamPage() {
  const [thamSo, datThamSo] = useSearchParams();
  const idViec = thamSo.get('viec');
  const idHtCu = thamSo.get('ht');
  const [ds, setDs] = useState<(KetQuaViecCanLam & { duoc_sua: boolean }) | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [ct, setCt] = useState<ChiTietViec | null>(null);
  const [loiCt, setLoiCt] = useState<string | null>(null);
  const [loaiMoi, setLoaiMoi] = useState('');

  const napDs = useCallback(async () => {
    try { setDs(await dsViecCanLam()); setLoi(null); } catch (e) { setLoi(loiCua(e)); }
  }, []);
  const napCt = useCallback(async (id: string) => {
    try { setCt(await docChiTietViec(id)); setLoiCt(null); } catch (e) { setCt(null); setLoiCt(loiCua(e)); }
  }, []);

  useEffect(() => { void napDs(); }, [napDs]);
  useEffect(() => { if (idViec) void napCt(idViec); else setCt(null); }, [idViec, napCt]);
  // Đường dẫn cũ (?ht=…): tìm hồ sơ việc của hành trình rồi chuyển sang ?viec=….
  useEffect(() => {
    if (!idHtCu || idViec) return;
    void docViec(idHtCu).then((r) => { if (r.hanh_trinh.ho_so_viec_id) datThamSo({ viec: r.hanh_trinh.ho_so_viec_id }, { replace: true }); }).catch(() => {});
  }, [idHtCu, idViec, datThamSo]);

  const doi = () => { void napDs(); if (idViec) void napCt(idViec); };
  const batDau = async () => {
    if (!loaiMoi) return;
    try {
      const h = await moViec(loaiMoi);
      await napDs();
      if (h.ho_so_viec_id) datThamSo({ viec: h.ho_so_viec_id });
    } catch (e) { toast.error(loiCua(e)); }
  };
  const duocSua = ds?.duoc_sua ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Việc cần làm</h1>
        <p className="mt-1 text-sm text-muted-foreground">Xếp theo mức: quá hạn pháp lý, sắp tới hạn, đang chặn tờ khai, đang chặn thủ tục, soát doanh thu, theo dõi phản hồi. MIMI chuẩn bị; bạn tự nộp, tự ký.</p>
      </div>

      {loi && <p role="alert" className="text-sm text-destructive">Chưa đọc được việc: {loi}</p>}
      {ds?.loi.map((l) => (
        <p key={l.nguon} role="status" className="flex items-center gap-2 rounded-lg border border-mimi-amber/40 bg-mimi-amber/5 px-3 py-2 text-sm text-foreground">
          <AlertTriangle size={14} className="text-mimi-amber" aria-hidden /> {l.cau}
        </p>
      ))}
      {!ds && !loi && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc việc của bạn…</p>}

      {ds && (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="space-y-3">
            {ds.viec.length === 0 && !ds.loi.length && <p className="text-sm text-muted-foreground">Không có việc nào cần bạn lúc này. Hỏi MIMI, ví dụ "Tôi muốn tạm ngừng kinh doanh", hoặc bắt đầu ở dưới.</p>}
            <ul className="space-y-2" aria-label="Danh sách việc cần làm">
              {ds.viec.map((v) => (
                <li key={v.id}><TheViec v={v} chon={idViec === v.id} onChon={() => datThamSo({ viec: v.id })} /></li>
              ))}
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
            {ds.da_xong.length > 0 && (
              <details className="rounded-xl border border-border bg-card p-3 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Việc đã giải quyết / đã huỷ</summary>
                <ul className="mt-2 space-y-1">
                  {ds.da_xong.map((h) => (
                    <li key={h.id} className="text-xs">
                      <button type="button" className="text-left hover:underline" onClick={() => datThamSo({ viec: h.id })}>
                        <CheckCircle2 size={12} className="mr-1 inline text-mimi-green" aria-hidden />{h.tieu_de} — {TEN_TRANG_THAI_HO_SO[h.trang_thai as keyof typeof TEN_TRANG_THAI_HO_SO] ?? h.trang_thai}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </aside>

          <main>
            {loiCt && <p role="alert" className="text-sm text-destructive">Chưa mở được việc này: {loiCt}</p>}
            {!ct && !loiCt && ds.viec.length > 0 && <p className="text-sm text-muted-foreground">Chọn một việc để xem việc tiếp theo.</p>}
            {ct && <ChiTiet key={ct.viec.id} ct={ct} duocSua={duocSua} onDoi={doi} />}
            {ct?.hanh_trinh && (
              <p className="mt-3 text-xs text-muted-foreground">
                Giấy tờ MIMI soạn cho việc này nằm ở <Link to="/dashboard/tai-lieu" className="underline">Tài liệu & Chứng từ</Link>.
              </p>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
