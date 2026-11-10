import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Copy, FileCheck2, Link2, Loader2, Share2, XCircle } from 'lucide-react';
import {
  duongDanChiaSe, goiXacMinh, type DongBaoCaoXacMinh, type DongChiaSeXacMinh,
} from '@/lib/goiXacMinh';
import { BaoCaoXacMinhView, ngay, tien, TrangThaiNeoDong } from '@/components/xac-minh/BaoCaoXacMinhView';

/**
 * Doanh thu đã xác minh (10/11/2026) — chủ hộ lập báo cáo doanh thu từ sổ MIMI, xem mã kiểm tra và dấu thời gian,
 * gửi đường dẫn cho một người nhận (ngân hàng, đối tác) có hạn, thu hồi được, và thấy ai đã mở.
 * Mọi con số do máy chủ tính (`doanh-thu-xac-minh`); trang này chỉ hiển thị.
 */

const TEN_TRANG_THAI: Record<DongChiaSeXacMinh['trang_thai'], string> = {
  con_han: 'Đang mở', het_han: 'Đã hết hạn', da_thu_hoi: 'Đã thu hồi',
};

const namHienTai = () => Number(new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 4));

function FormChiaSe({ reportId, onXong }: { reportId: string; onXong: (token: string, cs: DongChiaSeXacMinh) => void }) {
  const [nguoiNhan, setNguoiNhan] = useState('');
  const [mucDich, setMucDich] = useState('');
  const [soNgay, setSoNgay] = useState(14);
  const [dang, setDang] = useState(false);
  const gui = async () => {
    setDang(true);
    try {
      const r = await goiXacMinh('chia_se', { report_id: reportId, nguoi_nhan: nguoiNhan, muc_dich: mucDich, so_ngay: soNgay });
      onXong(r.token, r.chia_se);
      setNguoiNhan(''); setMucDich('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa tạo được đường dẫn.');
    } finally {
      setDang(false);
    }
  };
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
      <input value={nguoiNhan} onChange={(e) => setNguoiNhan(e.target.value)} maxLength={120} placeholder="Gửi cho ai (vd. Ngân hàng ABC)"
        aria-label="Gửi cho ai" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      <input value={mucDich} onChange={(e) => setMucDich(e.target.value)} maxLength={200} placeholder="Để làm gì (vd. Xin vay vốn lưu động)"
        aria-label="Để làm gì" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      <select value={soNgay} onChange={(e) => setSoNgay(Number(e.target.value))} aria-label="Dùng được trong"
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
        {[7, 14, 30].map((n) => <option key={n} value={n}>{n} ngày</option>)}
      </select>
      <button type="button" disabled={dang || !nguoiNhan.trim() || !mucDich.trim()} onClick={gui}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
        {dang ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Tạo đường dẫn
      </button>
    </div>
  );
}

export default function DoanhThuXacMinhPage() {
  const [baoCao, setBaoCao] = useState<DongBaoCaoXacMinh[]>([]);
  const [chiaSe, setChiaSe] = useState<DongChiaSeXacMinh[]>([]);
  const [duocChiaSe, setDuocChiaSe] = useState(false);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [ky, setKy] = useState<string>('12_thang');
  const [dangLap, setDangLap] = useState(false);
  const [mo, setMo] = useState<string | null>(null);
  const [vuaTao, setVuaTao] = useState<{ reportId: string; link: string } | null>(null);

  const tai = useCallback(async () => {
    try {
      const r = await goiXacMinh('ds');
      setBaoCao(r.bao_cao ?? []);
      setChiaSe(r.chia_se ?? []);
      setDuocChiaSe(!!r.duoc_chia_se);
      setLoi(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : 'Chưa tải được.');
    } finally {
      setDangTai(false);
    }
  }, []);
  useEffect(() => { void tai(); }, [tai]);

  const lap = async () => {
    setDangLap(true);
    try {
      const r = await goiXacMinh('tao_bao_cao', ky === '12_thang' ? { ky: '12_thang' } : { ky: 'nam', nam: Number(ky) });
      toast.success(r.da_co ? 'Số liệu chưa đổi: đây là báo cáo đã lập hôm nay.' : 'Đã lập báo cáo.');
      setMo(r.bao_cao.id);
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa lập được báo cáo.');
    } finally {
      setDangLap(false);
    }
  };

  const thuHoi = async (id: string) => {
    try {
      await goiXacMinh('thu_hoi', { share_id: id });
      toast.success('Đã thu hồi. Người nhận không mở được nữa.');
      await tai();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chưa thu hồi được.');
    }
  };

  const nam = namHienTai();

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground"><FileCheck2 size={20} /> Doanh thu đã xác minh</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MIMI lập báo cáo doanh thu từ sao kê và những khoản bạn đã xác nhận, kèm một mã kiểm tra được ghi dấu thời gian công khai.
          Bạn quyết định gửi cho ai, trong bao lâu, và thu hồi lúc nào cũng được. Báo cáo do chủ hộ chia sẻ, không phải điểm tín dụng.
        </p>
      </header>

      {duocChiaSe && (
        <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-border p-4">
          <label className="text-sm text-foreground" htmlFor="ky-bao-cao">Kỳ báo cáo</label>
          <select id="ky-bao-cao" value={ky} onChange={(e) => setKy(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <option value="12_thang">12 tháng gần nhất</option>
            {[nam, nam - 1, nam - 2].map((n) => <option key={n} value={String(n)}>Năm {n}</option>)}
          </select>
          <button type="button" onClick={lap} disabled={dangLap}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {dangLap ? <Loader2 size={14} className="animate-spin" /> : <FileCheck2 size={14} />} Lập báo cáo
          </button>
        </section>
      )}

      {dangTai && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Đang tải…</p>}
      {loi && <p className="rounded-xl bg-accent px-3 py-2 text-sm text-foreground">{loi}</p>}
      {!dangTai && !loi && baoCao.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có báo cáo nào.{duocChiaSe ? ' Chọn kỳ rồi bấm "Lập báo cáo".' : ''}</p>
      )}

      <ul className="space-y-4">
        {baoCao.map((b) => {
          const cs = chiaSe.filter((s) => s.report_id === b.id);
          const dt = b.report_json.doanh_thu;
          const dangMo = mo === b.id;
          return (
            <li key={b.id} className="rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{ngay(b.tu_ngay)} – {ngay(b.den_ngay)} · lập ngày {ngay(b.created_at)}</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{tien(dt.uoc_tinh, 'vi')}</p>
                  <p className="text-xs text-muted-foreground">Khoảng {tien(dt.can_duoi, 'vi')} – {tien(dt.can_tren, 'vi')}</p>
                </div>
                <button type="button" onClick={() => setMo(dangMo ? null : b.id)} aria-expanded={dangMo}
                  className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent">
                  {dangMo ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {dangMo ? 'Thu gọn' : 'Xem báo cáo'}
                </button>
              </div>
              <div className="mt-2"><TrangThaiNeoDong trangThai={b.anchor_status} khoi={b.bitcoin_block} nn="vi" /></div>

              {dangMo && <div className="mt-4"><BaoCaoXacMinhView bc={b.report_json} sha256={b.sha256} nn="vi" neo={{ trang_thai: b.anchor_status, khoi_bitcoin: b.bitcoin_block }} /></div>}

              {duocChiaSe && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground"><Share2 size={14} /> Gửi cho người khác xem</h3>
                  <FormChiaSe reportId={b.id} onXong={(token) => { setVuaTao({ reportId: b.id, link: duongDanChiaSe(token) }); void tai(); }} />
                  {vuaTao?.reportId === b.id && (
                    <div className="rounded-xl bg-accent p-3 text-sm">
                      <p className="font-medium text-foreground">Đường dẫn chỉ hiện một lần — sao chép và gửi ngay:</p>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="min-w-0 flex-1 break-all text-xs text-foreground">{vuaTao.link}</code>
                        <button type="button" aria-label="Sao chép đường dẫn"
                          onClick={() => { void navigator.clipboard?.writeText(vuaTao.link).then(() => toast.success('Đã sao chép.')); }}
                          className="rounded-lg border border-border p-1.5 hover:bg-background"><Copy size={14} /></button>
                      </div>
                    </div>
                  )}
                  {cs.length > 0 && (
                    <ul className="divide-y divide-border rounded-xl border border-border">
                      {cs.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                          <div>
                            <p className="text-foreground">{s.recipient_name} <span className="text-muted-foreground">· {s.purpose}</span></p>
                            <p className="text-xs text-muted-foreground">
                              {TEN_TRANG_THAI[s.trang_thai]} · dùng được tới {ngay(s.expires_at)} · {s.so_lan_xem ? `đã mở ${s.so_lan_xem} lần, lần gần nhất ${ngay(s.xem_gan_nhat)}` : 'chưa ai mở'}
                            </p>
                          </div>
                          {s.trang_thai === 'con_han' && (
                            <button type="button" onClick={() => thuHoi(s.id)}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10">
                              <XCircle size={14} /> Thu hồi
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
