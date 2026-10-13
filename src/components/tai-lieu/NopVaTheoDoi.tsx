import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  ghiDaNop, ghiKetQuaNop, huyNop, TEN_TRANG_THAI_NOP, THU_TU_NOP, XEM_TRUOC_NHAN, xacNhanNop, chuanBiNop, type YeuCauNop,
} from '@/lib/hanhTrinh';

/**
 * Trung tâm "Nộp & theo dõi" — Prompt 5 mục 4, 29–31.
 *
 * Mỗi yêu cầu hiện ĐÚNG bước tiếp theo: xác nhận (kèm bảy mục xem trước) → bạn tự nộp trên Cổng và ghi
 * biên nhận → ghi thông báo kết quả của cơ quan. Không bước nào tự chạy; "đã nộp" không phải "xong".
 */
const loiCua = (e: unknown) => (e instanceof Error ? e.message : i18n.t('ui2.nop.coLoi'));
const nut = 'h-9 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent disabled:opacity-50';
const o = 'h-9 rounded-lg border border-border bg-card px-3 text-xs';

function Dong({ y, duocXacNhan, onDoi }: { y: YeuCauNop; duocXacNhan: boolean; onDoi: (y: YeuCauNop) => void }) {
  const { t } = useTranslation();
  const [dang, setDang] = useState(false);
  const [bienNhan, setBienNhan] = useState('');
  const [ngay, setNgay] = useState('');
  const [thongBao, setThongBao] = useState('');
  const chay = async (f: () => Promise<YeuCauNop>, cau: string) => {
    setDang(true);
    try { onDoi(await f()); toast.success(cau); } catch (e) { toast.error(loiCua(e)); } finally { setDang(false); }
  };
  const xt = y.xem_truoc as Record<string, string>;
  return (
    <li className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{xt.tai_lieu ?? t('ui2.nop.hoSo')}</p>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-muted-foreground">{TEN_TRANG_THAI_NOP[y.trang_thai] ?? y.trang_thai}</span>
      </div>

      {y.trang_thai === 'needs_confirmation' && (
        <div className="space-y-2 rounded-lg bg-accent/40 p-3 text-xs">
          <dl className="grid gap-1.5 sm:grid-cols-[160px_1fr]">
            {XEM_TRUOC_NHAN.map(([k, nhan]) => xt[k] ? [<dt key={`${k}t`} className="font-medium text-foreground">{nhan}</dt>, <dd key={`${k}d`} className="text-muted-foreground">{xt[k]}</dd>] : null)}
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            {duocXacNhan
              ? <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => xacNhanNop(y.id), t('ui2.nop.daXacNhan'))}>{dang ? <Loader2 size={12} className="animate-spin" /> : t('ui2.nop.toiDaDoc')}</button>
              : <span className="text-muted-foreground">{t('ui2.nop.chuXacNhan')}</span>}
            <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => huyNop(y.id), t('ui2.nop.daHuy'))}>{t('ui2.chung.huy')}</button>
          </div>
        </div>
      )}

      {y.trang_thai === 'needs_validation' && (
        <div className="space-y-2 text-xs">
          {(y.loi_kiem ?? []).map((l) => <p key={l} className="text-mimi-amber">{l}</p>)}
          {y.tai_lieu_id && <button type="button" className={nut} disabled={dang} onClick={() => void chay(() => chuanBiNop(y.tai_lieu_id!), t('ui2.nop.daKhoa'))}>{t('ui2.nop.chuanBiLai')}</button>}
        </div>
      )}

      {y.trang_thai === 'ready' && (
        <form className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-end" onSubmit={(e) => { e.preventDefault(); void chay(() => ghiDaNop(y.id, bienNhan, ngay), t('ui2.nop.daGhi')); }}>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">{t('ui2.nop.maBienNhanCong')}</span>
            <input aria-label={t('ui2.nop.maBienNhan')} value={bienNhan} onChange={(e) => setBienNhan(e.target.value)} maxLength={100} className={o} /></label>
          <label className="flex flex-col gap-1"><span className="text-muted-foreground">{t('ui2.nop.ngayNop')}</span>
            <input aria-label={t('ui2.nop.ngayNop')} type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} className={o} /></label>
          <button type="submit" className={nut} disabled={dang || bienNhan.trim().length < 3 || !ngay}>{t('ui2.nop.toiDaNop')}</button>
        </form>
      )}

      {(y.trang_thai === 'waiting_external' || y.trang_thai === 'submitted') && (
        <div className="space-y-2 text-xs">
          <p className="text-muted-foreground">{t('ui2.nop.daNopNgay', { ngay: y.ngay_nop ?? '—', bienNhan: y.tham_chieu_ngoai ?? '—' })}</p>
          <input aria-label={t('ui2.nop.thongBaoCqt')} value={thongBao} onChange={(e) => setThongBao(e.target.value)} maxLength={1000}
            placeholder={t('ui2.nop.thongBaoPh')} className={`${o} w-full`} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={nut} disabled={dang || thongBao.trim().length < 5} onClick={() => void chay(() => ghiKetQuaNop(y.id, 'accepted', thongBao), t('ui2.nop.daGhiChapNhan'))}>{t('ui2.nop.chapNhan')}</button>
            <button type="button" className={nut} disabled={dang || thongBao.trim().length < 5} onClick={() => void chay(() => ghiKetQuaNop(y.id, 'rejected', thongBao), t('ui2.nop.daGhiTuChoi'))}>{t('ui2.nop.tuChoi')}</button>
          </div>
        </div>
      )}

      {y.ket_qua_co_quan && <p className="text-xs text-muted-foreground">{t('ui2.nop.ketQua', { kq: y.ket_qua_co_quan })}</p>}
    </li>
  );
}

export default function NopVaTheoDoi({ ds, vaiTro, onDoi }: { ds: YeuCauNop[]; vaiTro: string; onDoi: (y: YeuCauNop) => void }) {
  const { t } = useTranslation();
  if (!ds.length) return null;
  const xep = [...ds].sort((a, b) => THU_TU_NOP.indexOf(a.trang_thai) - THU_TU_NOP.indexOf(b.trang_thai));
  return (
    <section aria-labelledby="nop-theo-doi" className="rounded-2xl border border-border bg-card">
      <h2 id="nop-theo-doi" className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{t('ui2.nop.tieuDe')}</h2>
      <ul className="divide-y divide-border">
        {xep.map((y) => <Dong key={y.id} y={y} duocXacNhan={vaiTro === 'chu_so_huu' || vaiTro === 'quan_tri'} onDoi={onDoi} />)}
      </ul>
    </section>
  );
}
