import { useRef, useState } from 'react';
import { AlertTriangle, Check, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { taiCsv } from '@/lib/csv';
import i18n from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { docVaPhanLoai, TEN_CHE_DO, TEN_LOAI_TAI_LIEU, type SheetDaPhanLoai } from '@/lib/docBaoCaoTep';

/**
 * Đọc báo cáo tài chính / tờ khai thuế tải lên (27/09/2026).
 *
 * Bộ máy (`_shared/bao-cao/`) đã có và có test: nhận dạng loại tài liệu và thông tư ghi trên tệp, xếp
 * từng chỉ tiêu vào nhóm chuẩn THEO TÊN, kiểm đẳng thức kế toán, cảnh báo mẫu hết hiệu lực bằng câu
 * trích nguyên văn. Trang này chỉ là cửa vào.
 *
 * Chạy hết trong trình duyệt — tệp không rời máy người dùng. Dòng không khớp nhóm nào để nguyên là
 * "chưa xếp", kèm lý do; MIMI không đoán.
 */

const LOCALE: Record<string, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };
const so = (n: number | null) => (n === null ? '—' : n.toLocaleString(LOCALE[(i18n.language ?? 'vi').slice(0, 2)] ?? 'vi-VN'));

function taiKetQua(s: SheetDaPhanLoai, tenTep: string) {
  const cotGiaTri = s.cot_gia_tri.length ? s.cot_gia_tri : s.dong[0]?.gia_tri.map((_, i) => i18n.t('ui1.dbc.cotN', { n: i + 1 })) ?? [];
  taiCsv(
    `phan-loai-${tenTep.replace(/\.[^.]+$/, '')}-${s.ten_sheet}.csv`,
    [i18n.t('ui1.dbc.csvHang'), i18n.t('ui1.dbc.csvMa'), i18n.t('ui1.dbc.chiTieu'), i18n.t('ui1.dbc.nhomXep'), i18n.t('ui1.dbc.csvChiTiet'), i18n.t('ui1.dbc.csvLyDo'), ...cotGiaTri],
    s.dong.map((d) => [d.hang, d.ma ?? '', d.nhan, d.nhom?.ten ?? '', d.la_chi_tiet ? i18n.t('ui1.dbc.co') : '', d.ly_do ?? '', ...d.gia_tri.map((v) => v ?? '')]),
  );
}

function KetQuaSheet({ s, tenTep }: { s: SheetDaPhanLoai; tenTep: string }) {
  const { t } = useTranslation();
  const [chiChuaXep, setChiChuaXep] = useState(false);
  const nd = s.nhan_dang;
  const cot = s.cot_gia_tri.length ? s.cot_gia_tri : (s.dong[0]?.gia_tri.map((_, i) => t('ui1.dbc.cotN', { n: i + 1 })) ?? []);
  const coChuaXep = s.so_dong_da_xep < s.so_dong_co_so;
  const dong = chiChuaXep ? s.dong.filter((d) => !d.nhom && d.gia_tri.some((v) => v !== null)) : s.dong;
  const lech = s.kiem_tra.filter((k) => !k.dat);

  return (
    <section aria-label={t('ui1.dbc.sheet', { ten: s.ten_sheet })} className="rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{t('ui1.dbc.sheetNgoac', { ten: s.ten_sheet })}</p>
          <h2 className="text-lg font-semibold text-foreground">{TEN_LOAI_TAI_LIEU[nd.loai]}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[nd.che_do ? TEN_CHE_DO[nd.che_do] : t('ui1.dbc.khongTt'), nd.nam ? t('ui1.dbc.nam', { nam: nd.nam }) : t('ui1.dbc.khongNam'), s.don_vi ? t('ui1.dbc.donVi', { dv: s.don_vi.nhan }) : null]
              .filter(Boolean).join(' · ')}
          </p>
        </div>
        <button onClick={() => taiKetQua(s, tenTep)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent">
          <Download size={14} /> {t('ui1.dbc.taiKq')}
        </button>
      </header>

      <div className="space-y-3 p-4">
        {nd.canh_bao_mau && (
          <div role="note" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="flex items-start gap-2 text-foreground"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />{nd.canh_bao_mau.cau}</p>
            <blockquote className="mt-2 border-l-2 border-amber-500/40 pl-3 text-xs text-muted-foreground">
              “{nd.canh_bao_mau.can_cu.trich}”
              <footer className="mt-1 not-italic">— Thông tư {nd.canh_bao_mau.can_cu.van_ban}, {nd.canh_bao_mau.can_cu.dieu}</footer>
            </blockquote>
          </div>
        )}

        <p className="text-sm text-foreground">
          <Trans i18nKey="ui1.dbc.daXep" values={{ da: s.so_dong_da_xep, tong: s.so_dong_co_so }} components={{ b: <strong /> }} />
          {coChuaXep && <span className="text-muted-foreground"> {t('ui1.dbc.conLai')}</span>}
        </p>

        {s.kiem_tra.length > 0 ? (
          <div>
            <p className="text-sm font-medium text-foreground">
              {lech.length === 0 ? t('ui1.dbc.kiemKhop', { n: s.kiem_tra.length }) : t('ui1.dbc.kiemLech', { lech: lech.length, n: s.kiem_tra.length })}
            </p>
            <ul className="mt-2 space-y-1">
              {s.kiem_tra.map((k) => (
                <li key={`${k.ten}-${k.cot}`} className="flex items-start gap-2 text-sm">
                  {k.dat ? <Check size={14} className="mt-0.5 shrink-0 text-mimi-green" /> : <X size={14} className="mt-0.5 shrink-0 text-destructive" />}
                  <span className={k.dat ? 'text-muted-foreground' : 'text-foreground'}>
                    {k.cong_thuc} <span className="text-muted-foreground">({cot[k.cot] ?? t('ui1.dbc.cotN', { n: k.cot + 1 })})</span>
                    {!k.dat && <> — <Trans i18nKey="ui1.dbc.lech" values={{ lech: so(k.lech), trai: so(k.trai), phai: so(k.phai) }} components={{ b: <strong className="tabular-nums" /> }} /></>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('ui1.dbc.chuaKiem')}</p>
        )}

        {coChuaXep && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={chiChuaXep} onChange={(e) => setChiChuaXep(e.target.checked)} />
            {t('ui1.dbc.chiChuaXep')}
          </label>
        )}

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{t('ui1.dbc.ma')}</th>
                <th className="px-3 py-2 font-medium">{t('ui1.dbc.chiTieu')}</th>
                <th className="px-3 py-2 font-medium">{t('ui1.dbc.nhomXep')}</th>
                {cot.map((c, i) => <th key={i} className="px-3 py-2 text-right font-medium">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {dong.map((d) => (
                <tr key={d.hang} className="border-t border-border/60">
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{d.ma ?? ''}</td>
                  <td className={`px-3 py-1.5 ${d.la_chi_tiet ? 'pl-6 text-muted-foreground' : 'text-foreground'}`}>{d.nhan}</td>
                  <td className="px-3 py-1.5">
                    {d.nhom
                      ? <span className="text-foreground">{d.nhom.ten}</span>
                      : d.gia_tri.some((v) => v !== null)
                        ? <span className="text-amber-700 dark:text-amber-400" title={d.ly_do ?? undefined}>{t('ui1.dbc.chuaXep')}</span>
                        : <span className="text-muted-foreground">—</span>}
                  </td>
                  {cot.map((_, i) => <td key={i} className="px-3 py-1.5 text-right tabular-nums text-foreground">{so(d.gia_tri[i] ?? null)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function DocBaoCaoPage() {
  const { t } = useTranslation();
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [kq, setKq] = useState<{ tenTep: string; sheet: SheetDaPhanLoai[] } | null>(null);
  const chon = useRef<HTMLInputElement>(null);

  const doc = async (tep: File | undefined) => {
    if (!tep) return;
    setDang(true); setLoi(null);
    try {
      setKq({ tenTep: tep.name, sheet: await docVaPhanLoai(tep) });
    } catch (e) {
      setKq(null);
      setLoi(e instanceof Error ? e.message : t('ui1.xml.khongDoc'));
    } finally {
      setDang(false);
      if (chon.current) chon.current.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('ui1.dbc.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('ui1.dbc.moTa')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t('ui1.dbc.docDuoc')}
        </p>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); void doc(e.dataTransfer.files?.[0]); }}
        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/60 px-6 py-10 text-center"
      >
        <FileSpreadsheet size={28} className="text-muted-foreground" />
        <p className="text-sm text-foreground">{t('ui1.dbc.keoTha')}</p>
        <button
          onClick={() => chon.current?.click()}
          disabled={dang}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {dang ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} {t('ui1.dbc.chonTep')}
        </button>
        <input
          ref={chon}
          type="file"
          accept=".xlsx,.csv,.txt,.xls"
          aria-label={t('ui1.dbc.chonTepAria')}
          className="hidden"
          onChange={(e) => void doc(e.target.files?.[0])}
        />
      </div>

      {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}

      {kq && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('ui1.dbc.ketQuaTep', { ten: kq.tenTep, n: kq.sheet.length })}
          </p>
          {kq.sheet.map((s) => <KetQuaSheet key={s.ten_sheet} s={s} tenTep={kq.tenTep} />)}
        </div>
      )}
    </div>
  );
}
