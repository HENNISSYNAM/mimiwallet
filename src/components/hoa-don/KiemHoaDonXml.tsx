import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, Copy, ExternalLink, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import { goiTroLy } from '@/lib/goiTroLy';
import { formatVND } from '@/lib/formatters';
import { docHoaDonXml, demMuc, duLieuLuuChungTu, KICH_THUOC_TOI_DA, type KetQuaDoc, type MucKiem } from '@/lib/hoaDon/docHoaDonXml';
import { CONG_TRA_CUU_HDDT, truongTraCuu } from '@/lib/hoaDon/traCuu';

/**
 * Kiểm tệp hoá đơn điện tử XML nhận từ người bán (12/10/2026).
 *
 * Tệp đọc NGAY TRONG TRÌNH DUYỆT (`lib/hoaDon/docHoaDonXml.ts`) — không gửi tệp đi đâu. Chỉ khi bấm "Lưu vào
 * chứng từ" thì các trường đã kiểm mới gửi lên, qua CÙNG hành động `luu_chung_tu` mà nút quét ảnh chứng từ
 * dùng (máy chủ kiểm lại từng trường). Tệp XML gốc chưa được lưu — xem backlog trong báo cáo.
 */

const KIEU: Record<MucKiem, { mau: string; Icon: typeof CheckCircle2 }> = {
  dat: { mau: 'text-mimi-green', Icon: CheckCircle2 },
  lech: { mau: 'text-mimi-red', Icon: XCircle },
  thieu: { mau: 'text-mimi-amber', Icon: AlertTriangle },
  luu_y: { mau: 'text-muted-foreground', Icon: Info },
};
const THU_TU: MucKiem[] = ['lech', 'thieu', 'luu_y', 'dat'];

export function KiemHoaDonXml() {
  const { t } = useTranslation();
  const [mstCongTy, setMstCongTy] = useState<string | null>(null);
  const [tenTep, setTenTep] = useState<string | null>(null);
  const [kq, setKq] = useState<KetQuaDoc | null>(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [daLuu, setDaLuu] = useState(false);
  const oTep = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let huy = false;
    (async () => {
      try {
        const id = await idCongTyDangDung();
        if (!id) return;
        const { data } = await supabase.from('companies').select('tax_id').eq('id', id).maybeSingle();
        if (!huy) setMstCongTy((data as { tax_id?: string | null } | null)?.tax_id ?? null);
      } catch {
        // Không đọc được MST công ty: phần so MST người mua sẽ nói "chưa so được", không đoán.
      }
    })();
    return () => { huy = true; };
  }, []);

  const chonTep = async (f: File | undefined) => {
    setDaLuu(false);
    if (!f) return;
    setTenTep(f.name);
    if (f.size > KICH_THUOC_TOI_DA) {
      setKq({ ok: false, loi: t('ui1.xml.quaLon') });
      return;
    }
    // FileReader thay `File.text()`: chạy cả trên trình duyệt cũ lẫn môi trường test.
    const chuoi = await new Promise<string>((ok, hong) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result ?? ''));
      r.onerror = () => hong(r.error);
      r.readAsText(f);
    }).catch(() => null);
    setKq(chuoi === null ? { ok: false, loi: t('ui1.xml.khongDoc') } : docHoaDonXml(chuoi, { mstCongTy }));
  };

  const luu = async () => {
    if (!kq?.ok) return;
    const { du, canh_bao } = duLieuLuuChungTu(kq.hoa_don);
    setDangLuu(true);
    try {
      const r = await goiTroLy('luu_chung_tu', du);
      setDaLuu(true);
      toast.success(t('ui1.xml.daLuuThuVien'));
      for (const c of [canh_bao, typeof r.canh_bao === 'string' ? r.canh_bao : null]) if (c) toast.warning(c);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('ui1.xml.chuaLuu'));
    } finally {
      setDangLuu(false);
    }
  };

  const chep = async (nhan: string, v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(t('ui1.xml.daChep', { nhan: nhan.toLowerCase() }));
    } catch {
      toast.error(t('ui1.xml.chanChep'));
    }
  };

  const hd = kq?.ok ? kq.hoa_don : null;
  const dem = kq?.ok ? demMuc(kq.kiem) : null;

  return (
    <section aria-labelledby="kiem-xml" className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <h3 id="kiem-xml" className="font-display text-lg font-bold text-foreground">{t('ui1.xml.tieuDe')}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {t('ui1.xml.moTa')}
      </p>
      <input
        ref={oTep}
        type="file"
        accept=".xml,application/xml,text/xml"
        aria-label={t('ui1.xml.chonTepAria')}
        className="sr-only"
        onChange={(e) => { void chonTep(e.target.files?.[0]); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => oTep.current?.click()}
        className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110"
      >
        <FileUp size={16} aria-hidden /> {t('ui1.xml.chonTep')}
      </button>
      {tenTep && <span className="ml-3 text-xs text-muted-foreground">{tenTep}</span>}

      {kq && !kq.ok && <p role="alert" className="mt-4 rounded-xl bg-mimi-red/8 p-3 text-sm text-mimi-red">{kq.loi}</p>}

      {hd && kq?.ok && dem && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-accent/50 p-4 text-sm">
            <p className="font-medium text-foreground">
              {hd.ten_hoa_don ?? t('ui1.xml.hoaDon')} · {hd.ky_hieu_mau ?? '?'}{hd.ky_hieu ?? ''} · {t('ui1.xml.so', { so: hd.so ?? '?' })} · {t('ui1.xml.ngay', { ngay: hd.ngay_lap ? hd.ngay_lap.slice(0, 10).split('-').reverse().join('/') : '?' })}
            </p>
            <p className="mt-1 text-muted-foreground">{t('ui1.xml.nguoiBan')} {hd.ben_ban.ten ?? '—'} ({hd.ben_ban.mst ?? t('ui1.xml.khongMst')})</p>
            {hd.tong_thanh_toan !== null && <p className="mt-1 text-muted-foreground">{t('ui1.xml.tongTt')} <span className="font-mono text-foreground">{formatVND(hd.tong_thanh_toan)}</span></p>}
            <p className="mt-2 text-xs" aria-live="polite">
              {t('ui1.xml.demDat', { n: dem.dat })} · <span className="text-mimi-red">{t('ui1.xml.demLech', { n: dem.lech })}</span> · <span className="text-mimi-amber">{t('ui1.xml.demThieu', { n: dem.thieu })}</span> · {t('ui1.xml.demLuuY', { n: dem.luu_y })}
            </p>
          </div>

          <ul className="divide-y divide-border/50" aria-label={t('ui1.xml.ketQua')}>
            {[...kq.kiem].sort((a, b) => THU_TU.indexOf(a.muc) - THU_TU.indexOf(b.muc)).map((k) => {
              const { mau, Icon } = KIEU[k.muc];
              const nhan = t(`ui1.xml.muc_${k.muc}`);
              return (
                <li key={k.khoa} className="flex gap-3 py-2">
                  <Icon size={16} className={`mt-0.5 shrink-0 ${mau}`} aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-foreground">{k.nhan} <span className={`text-xs ${mau}`}>· {nhan}</span></p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{k.cau}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void luu()}
              disabled={dangLuu || daLuu || hd.tong_thanh_toan === null || hd.tong_thanh_toan <= 0}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {dangLuu && <Loader2 size={14} className="animate-spin" aria-hidden />} {daLuu ? t('ui1.xml.daLuu') : t('ui1.xml.luu')}
            </button>
          </div>
          {(dem.lech > 0 || dem.thieu > 0) && !daLuu && (
            <p className="text-xs text-mimi-amber">{t('ui1.xml.coLech')}</p>
          )}

          <div className="rounded-xl border border-border/60 p-4">
            <p className="text-sm font-medium text-foreground">{t('ui1.xml.traCong')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('ui1.xml.traMoTa')}
            </p>
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {truongTraCuu(hd).map((tr) => (
                <div key={tr.khoa} className="flex items-center justify-between gap-2 rounded-lg bg-accent/40 px-3 py-2">
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{tr.nhan}</dt>
                    <dd className="truncate font-mono text-sm text-foreground">{tr.gia_tri}</dd>
                  </div>
                  <button type="button" onClick={() => void chep(tr.nhan, tr.gia_tri)} aria-label={t('ui1.xml.chepAria', { nhan: tr.nhan })} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Copy size={14} aria-hidden />
                  </button>
                </div>
              ))}
            </dl>
            <a
              href={CONG_TRA_CUU_HDDT}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:border-primary/40"
            >
              <ExternalLink size={14} aria-hidden /> {t('ui1.xml.moCong')}
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
