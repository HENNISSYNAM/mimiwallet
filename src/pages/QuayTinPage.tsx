import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Camera, CheckCircle2, Clock, HelpCircle, Loader2, ShieldAlert, ShieldCheck, Volume2, VolumeX, XCircle } from 'lucide-react';
import { goiSoatBill, nenAnh, type CaSoat, type HomNay } from '@/lib/quayTin';
import { coGiongViet, datLoa, khiCoGiong, loaDangTat, noi } from '@/lib/loa';
import { dinhDangTien } from '@/lib/tien';
import { CUA_SO_CHO_MAC_DINH_MS } from '../../supabase/functions/_shared/soat-bill/doi-chieu.ts';
import type { Den } from '../../supabase/functions/_shared/soat-bill/cau-noi.ts';

/**
 * QUẦY TIN (20/11/2026) — "Tiền thật mới giao hàng." Xem `.kiro/specs/quay-tin/`.
 *
 * Khách đưa bill → thu ngân bấm một nút chụp → Agent Soát Bill (AI đọc ảnh) → Agent Đối Chiếu (so với tiền vào thật
 * trên mọi tài khoản của quán) → màu toàn khung + loa đọc to. Đèn vàng tự hỏi lại tới khi xanh hoặc đỏ.
 * Ca đỏ / lệch / không đọc được vào hàng chờ cho chủ quyết. Không nút nào ở đây chuyển tiền.
 */

const HOI_LAI_MS = 5000;

const KIEU: Record<Den, { nen: string; chu: string; Icon: typeof ShieldCheck; nhan: string }> = {
  xanh: { nen: 'bg-[hsl(var(--green-500))]', chu: 'text-white', Icon: ShieldCheck, nhan: 'Tiền đã về' },
  vang: { nen: 'bg-[hsl(var(--amber-500))]', chu: 'text-white', Icon: Clock, nhan: 'Đang chờ ngân hàng' },
  lech: { nen: 'bg-[hsl(var(--amber-500))]', chu: 'text-white', Icon: ShieldAlert, nhan: 'Tiền về không khớp' },
  do: { nen: 'bg-[hsl(var(--red-500))]', chu: 'text-white', Icon: XCircle, nhan: 'Chưa giao hàng' },
  khong_doc_duoc: { nen: 'bg-muted', chu: 'text-foreground', Icon: HelpCircle, nhan: 'Không đọc được bill' },
};

const gioVN = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : '—';

function KetQua({ ca, soLanChup }: { ca: CaSoat; soLanChup: number }) {
  const k = KIEU[ca.den];
  const d = ca.doc;
  return (
    <section aria-live="assertive" className={`rounded-3xl p-6 sm:p-8 ${k.nen} ${k.chu}`}>
      <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide opacity-90">
        <k.Icon className="h-5 w-5" aria-hidden /> {k.nhan}
        {ca.den === 'vang' && <Loader2 className="h-4 w-4 animate-spin" aria-label="Đang kiểm lại" />}
      </div>
      <p className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">{ca.cau_noi}</p>
      {soLanChup > 1 && (
        <p className="mt-3 rounded-xl bg-black/15 px-3 py-2 text-sm">Ảnh này đã được chụp {soLanChup} lần hôm nay.</p>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm opacity-95 sm:grid-cols-4">
        <div><dt className="opacity-75">Bill ghi</dt><dd className="font-semibold">{d?.so_tien ? dinhDangTien(d.so_tien) : '—'}</dd></div>
        <div><dt className="opacity-75">Tài khoản nhận</dt><dd className="font-semibold">{d?.tk_nhan_cuoi ? `•••• ${d.tk_nhan_cuoi}` : '—'}</dd></div>
        <div><dt className="opacity-75">Giờ trên bill</dt><dd className="font-semibold">{gioVN(d?.thoi_diem)}</dd></div>
        <div><dt className="opacity-75">Tiền thật về</dt><dd className="font-semibold">{ca.thuc_te ? dinhDangTien(ca.thuc_te) : 'Chưa thấy'}</dd></div>
      </dl>
      <p className="mt-4 text-xs opacity-80">
        Đèn xanh chỉ bật khi có tiền thật về tài khoản của quán — ảnh bill không bao giờ tự làm đèn xanh.
        {ca.nha_cung_cap && ` AI đọc bill: ${ca.nha_cung_cap === 'bedrock' ? 'Amazon Bedrock' : 'OpenRouter'}${ca.do_tre_ms ? `, ${(ca.do_tre_ms / 1000).toFixed(1)} giây` : ''}.`}
      </p>
    </section>
  );
}

function HangCho({ ds, duocQuyet, onXong }: { ds: CaSoat[]; duocQuyet: boolean; onXong: () => void }) {
  const [lyDo, setLyDo] = useState<Record<string, string>>({});
  const [dang, setDang] = useState<string | null>(null);
  const quyet = async (id: string, q: 'cho_qua' | 'tu_choi') => {
    setDang(id);
    try {
      await goiSoatBill('quyet', { id, quyet: q, ly_do: lyDo[id] ?? '' });
      onXong();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa ghi được quyết định.');
    } finally {
      setDang(null);
    }
  };
  if (!ds.length) return <p className="text-sm text-muted-foreground">Không có ca nào chờ quyết.</p>;
  return (
    <ul className="space-y-3">
      {ds.map((c) => (
        <li key={c.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-foreground">{c.cau_noi}</p>
            <span className="shrink-0 text-xs text-muted-foreground">{gioVN(c.created_at)}</span>
          </div>
          {duocQuyet ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={lyDo[c.id] ?? ''}
                onChange={(e) => setLyDo((m) => ({ ...m, [c.id]: e.target.value }))}
                maxLength={300}
                placeholder="Lý do (vd. đã thấy tiền trong app ngân hàng)"
                className="min-h-[44px] flex-1 rounded-xl border border-border bg-background px-3 text-sm"
              />
              <button type="button" disabled={dang === c.id} onClick={() => quyet(c.id, 'cho_qua')}
                className="min-h-[44px] rounded-full border border-border px-4 text-sm font-semibold">Đã kiểm, cho qua</button>
              <button type="button" disabled={dang === c.id} onClick={() => quyet(c.id, 'tu_choi')}
                className="min-h-[44px] rounded-full bg-[hsl(var(--red-500))] px-4 text-sm font-semibold text-white">Từ chối</button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Chờ chủ quán hoặc quản trị quyết.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function QuayTinPage() {
  const [homNay, setHomNay] = useState<HomNay | null>(null);
  const [ca, setCa] = useState<CaSoat | null>(null);
  const [soLanChup, setSoLanChup] = useState(1);
  const [dangSoat, setDangSoat] = useState(false);
  const [loaTat, setLoaTat] = useState(loaDangTat);
  const [coGiong, setCoGiong] = useState(true);
  const [tienDemo, setTienDemo] = useState('150000');
  const tep = useRef<HTMLInputElement>(null);
  const daDoc = useRef<string>('');

  const tai = useCallback(async () => {
    try { setHomNay(await goiSoatBill<HomNay>('hom_nay')); } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  }, []);

  useEffect(() => { void tai(); }, [tai]);
  useEffect(() => {
    const kiem = () => setCoGiong(coGiongViet());
    kiem();
    return khiCoGiong(kiem);
  }, []);

  // Đọc to mỗi khi kết quả đổi (một lần cho mỗi đèn của mỗi ca).
  useEffect(() => {
    if (!ca) return;
    const khoa = `${ca.id}:${ca.den}`;
    if (daDoc.current === khoa) return;
    daDoc.current = khoa;
    noi(ca.cau_noi);
  }, [ca]);

  // Đèn vàng: hỏi lại tới khi xanh/đỏ hoặc quá cửa sổ chờ (+ một chút để máy chủ kịp đổi sang đỏ).
  useEffect(() => {
    if (!ca || ca.den !== 'vang') return;
    const batDau = Date.parse(ca.bat_dau);
    const hen = window.setInterval(async () => {
      if (Date.now() - batDau > CUA_SO_CHO_MAC_DINH_MS + 30_000) { window.clearInterval(hen); return; }
      try {
        const r = await goiSoatBill<{ ca: CaSoat }>('kiem_lai', { id: ca.id });
        if (r.ca && r.ca.den !== 'vang') { setCa(r.ca); void tai(); }
      } catch { /* mạng chập chờn: hỏi lại lần sau */ }
    }, HOI_LAI_MS);
    return () => window.clearInterval(hen);
  }, [ca, tai]);

  const chonAnh = async (f: File | undefined) => {
    if (!f) return;
    setDangSoat(true);
    setCa(null);
    try {
      const anh = await nenAnh(f);
      const r = await goiSoatBill<{ ca: CaSoat; so_lan_chup_anh_nay: number }>('soat', { anh_base64: anh.base64, mime: anh.mime });
      setCa(r.ca);
      setSoLanChup(r.so_lan_chup_anh_nay ?? 1);
      void tai();
    } catch (e) {
      const cau = e instanceof Error ? e.message : 'Chưa soát được. Mở app ngân hàng để kiểm.';
      toast.error(cau);
      noi(cau);
    } finally {
      setDangSoat(false);
      if (tep.current) tep.current.value = '';
    }
  };

  const giaLapTienVe = async () => {
    try {
      await goiSoatBill('demo_tien_ve', { so_tien: tienDemo });
      toast.success('Đã giả lập khách chuyển tiền vào cửa hàng mẫu.');
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
  };

  const dem = homNay?.dem ?? {};

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quầy Tin</h1>
          <p className="text-sm text-muted-foreground">Tiền thật mới giao hàng. Khách đưa bill, bạn chụp — MIMI đối chiếu với tiền về thật trên mọi tài khoản của quán.</p>
        </div>
        <button
          type="button"
          onClick={() => { datLoa(loaTat); setLoaTat(!loaTat); }}
          aria-pressed={!loaTat}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-border px-4 text-sm"
        >
          {loaTat ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
          {loaTat ? 'Loa tắt' : 'Loa bật'}
        </button>
      </header>

      {!coGiong && !loaTat && (
        <p className="rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
          Máy này chưa có giọng đọc tiếng Việt nên loa sẽ im — kết quả vẫn hiện chữ to bên dưới.
          Trên Android: Cài đặt → Chuyển văn bản thành giọng nói → thêm Tiếng Việt.
        </p>
      )}

      <input ref={tep} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => chonAnh(e.target.files?.[0])} />
      <button
        type="button"
        disabled={dangSoat}
        onClick={() => tep.current?.click()}
        className="flex min-h-[96px] w-full items-center justify-center gap-3 rounded-3xl bg-primary text-xl font-bold text-primary-foreground shadow-sm active:scale-[0.99] disabled:opacity-70"
      >
        {dangSoat ? <Loader2 className="h-7 w-7 animate-spin" aria-hidden /> : <Camera className="h-7 w-7" aria-hidden />}
        {dangSoat ? 'Đang đọc bill…' : 'Khách đưa bill — chụp để kiểm'}
      </button>

      {ca && <KetQua ca={ca} soLanChup={soLanChup} />}

      {homNay?.la_demo && (
        <section className="rounded-2xl border border-dashed border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Cửa hàng mẫu — giả lập khách chuyển tiền</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chỉ có ở cửa hàng mẫu, để bạn thử mà không cần chuyển tiền thật. Bấm sau khi chụp bill để thấy đèn vàng chuyển xanh.
          </p>
          <div className="mt-3 flex gap-2">
            <input inputMode="numeric" value={tienDemo} onChange={(e) => setTienDemo(e.target.value.replace(/\D/g, ''))}
              className="min-h-[44px] w-40 rounded-xl border border-border bg-background px-3 text-sm" aria-label="Số tiền giả lập" />
            <button type="button" onClick={giaLapTienVe} className="min-h-[44px] rounded-full border border-border px-4 text-sm font-semibold">
              Khách chuyển {tienDemo ? dinhDangTien(Number(tienDemo)) : ''}
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Chờ chủ quán quyết</h2>
        <HangCho ds={homNay?.hang_cho ?? []} duocQuyet={homNay?.duoc_quyet ?? false} onXong={tai} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link to="/pos" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
          <p className="font-semibold text-foreground">Bán tại quầy</p>
          <p className="mt-1 text-sm text-muted-foreground">Mã QR riêng cho từng đơn — tiền về đúng mã, đúng số thì loa báo.</p>
        </Link>
        <Link to="/dashboard/kiem-truoc-khi-chuyen" className="rounded-2xl border border-border bg-card p-4 hover:border-primary/50">
          <p className="font-semibold text-foreground">Soát trước khi chi</p>
          <p className="mt-1 text-sm text-muted-foreground">Nhà cung cấp báo đổi số tài khoản? Kiểm trước khi chuyển. MIMI không chuyển tiền thay bạn.</p>
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold text-foreground">Hôm nay</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          <CheckCircle2 className="mr-1 inline h-4 w-4 text-[hsl(var(--green-500))]" aria-hidden />{dem.xanh ?? 0} tiền đã về ·{' '}
          {(dem.do ?? 0) + (dem.lech ?? 0)} không khớp · {dem.vang ?? 0} đang chờ · {dem.khong_doc_duoc ?? 0} không đọc được
        </p>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {(homNay?.ca ?? []).slice(0, 30).map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className={`h-3 w-3 shrink-0 rounded-full ${KIEU[c.den].nen}`} aria-label={KIEU[c.den].nhan} />
              <span className="flex-1 text-foreground">{c.cau_noi}</span>
              <span className="text-xs text-muted-foreground">{gioVN(c.created_at)}{c.quyet ? ` · ${c.quyet === 'cho_qua' ? 'đã cho qua' : 'đã từ chối'}` : ''}</span>
            </li>
          ))}
          {!homNay?.ca?.length && <li className="px-4 py-6 text-center text-sm text-muted-foreground">Chưa soát bill nào hôm nay.</li>}
        </ul>
      </section>
    </div>
  );
}
