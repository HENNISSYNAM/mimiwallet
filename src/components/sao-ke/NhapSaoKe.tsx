import { useMemo, useState } from 'react';
import { CauHoiNhanh } from '@/components/phan-hoi/CauHoiNhanh';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import {
  docDong, docTep, doanTaiKhoan, goiSaoKe, nhanCot, phatHienNgoaiTe, TEN_COT,
  type BanDoCot, type Cot, type O,
} from '@/lib/saoKe';
import { congTien, dinhDangTien } from '@/lib/tien';

/**
 * Tải sao kê lên — đường vào dữ liệu cho người chưa liên kết được ngân hàng.
 *
 * Việc số một của bản kiểm toán ra mắt (P-1): Cas đang tắc, SePay không có lịch sử, nên đây là
 * cách duy nhất đưa 12 tháng sao kê vào MIMI. Ngân hàng nào cũng cho tải sao kê Excel.
 *
 * Hỏi tối thiểu: MIMI tự nhận cột và tự đọc số tài khoản ở đầu sao kê; người dùng chỉ sửa khi
 * MIMI đoán sai. Xem trước rồi mới nhập. Nhập lại cùng tệp không sinh dòng trùng.
 */

const so = (n: number) => new Intl.NumberFormat(i18n.language).format(Math.round(n));
const ngay = (ymd: string) => ymd.split('-').reverse().join('/');
const LO = 3000;
const COT_SUA: Cot[] = ['ngay', 'co', 'no', 'so_tien', 'noi_dung', 'ten_doi_ung', 'so_tham_chieu', 'so_du'];

export function NhapSaoKe() {
  const { t } = useTranslation();
  const [tenTep, setTenTep] = useState<string | null>(null);
  const [bang, setBang] = useState<O[][] | null>(null);
  const [banDo, setBanDo] = useState<BanDoCot | null>(null);
  const [taiKhoan, setTaiKhoan] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [suaCot, setSuaCot] = useState(false);
  const [ketQua, setKetQua] = useState<{ moi: number; trung: number; hong: number } | null>(null);

  const xem = useMemo(() => (bang && banDo ? docDong(bang, banDo) : null), [bang, banDo]);

  const chonTep = async (tep: File | undefined) => {
    if (!tep) return;
    setLoi(null); setKetQua(null); setTenTep(tep.name);
    try {
      const b = await docTep(tep);
      const bd = nhanCot(b);
      // Chỉ xét phần đầu tệp (thông tin tài khoản, tiêu đề cột) — nội dung giao dịch có chữ "USD" không phải tiền tệ của sổ.
      const ngoaiTe = phatHienNgoaiTe(b.slice(0, (bd?.dong_tieu_de ?? 9) + 1));
      if (ngoaiTe) {
        setBang(null); setBanDo(null);
        setLoi(t('ui2.saoKe.ngoaiTe', { tien: ngoaiTe }));
        return;
      }
      setBang(b);
      setBanDo(bd);
      setSuaCot(!bd);
      setTaiKhoan((tk) => tk || doanTaiKhoan(b) || '');
      if (!bd) setLoi(t('ui2.saoKe.chuaNhanCot'));
    } catch (e) {
      setBang(null); setBanDo(null);
      setLoi(e instanceof Error ? e.message : t('ui2.saoKe.khongDocTep'));
    }
  };

  const doiCot = (cot: Cot, chiSo: string) => {
    const goc: BanDoCot = banDo ?? { dong_tieu_de: 0, cot: {}, tieu_de: (bang?.[0] ?? []).map((o) => String(o ?? '')) };
    const moi = { ...goc.cot };
    if (chiSo === '') delete moi[cot]; else moi[cot] = Number(chiSo);
    setBanDo({ ...goc, cot: moi });
  };

  const doiDongTieuDe = (i: number) => {
    const tieuDe = (bang?.[i] ?? []).map((o) => String(o ?? ''));
    setBanDo({ dong_tieu_de: i, cot: banDo?.cot ?? {}, tieu_de: tieuDe });
  };

  const nhap = async () => {
    if (!xem?.dong.length) return;
    setDang(true); setLoi(null);
    try {
      let importId: string | null = null;
      let moi = 0; let trung = 0; let hong = 0;
      for (let i = 0; i < xem.dong.length; i += LO) {
        const r = await goiSaoKe('nhap', { tai_khoan: taiKhoan, ten_tep: tenTep, dong: xem.dong.slice(i, i + LO), import_id: importId });
        importId = String(r.import_id);
        moi += Number(r.moi ?? 0); trung += Number(r.trung ?? 0); hong += Number(r.so_hong ?? 0);
      }
      setKetQua({ moi, trung, hong });
      setBang(null); setBanDo(null);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : t('ui2.saoKe.chuaNhap'));
    } finally {
      setDang(false);
    }
  };

  const vao = xem?.dong.filter((d) => d.type === 'income') ?? [];
  const ra = xem?.dong.filter((d) => d.type === 'expense') ?? [];
  const ngays = xem?.dong.map((d) => d.transaction_date).sort() ?? [];
  const tieuDe = banDo?.tieu_de ?? (bang?.[0] ?? []).map((o) => String(o ?? ''));

  return (
    <section aria-labelledby="nhap-sao-ke" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="nhap-sao-ke" className="flex items-center gap-2 text-base font-semibold text-foreground"><FileSpreadsheet size={18} className="text-primary" /> {t('ui2.saoKe.tieuDe')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('ui2.saoKe.moTa')}
      </p>

      <label className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
        <Upload size={15} /> {t('ui2.saoKe.chonTep')}
        <input type="file" accept=".xlsx,.csv,.txt,.xls" className="sr-only" onChange={(e) => void chonTep(e.target.files?.[0])} aria-label={t('ui2.saoKe.chonTep')} />
      </label>
      {tenTep && <span className="ml-3 text-xs text-muted-foreground">{tenTep}</span>}

      {loi && <p role="alert" className="mt-3 rounded-xl border border-mimi-amber/30 bg-mimi-amber/5 p-3 text-sm text-foreground">{loi}</p>}

      {ketQua && (
        <div className="mt-3 rounded-xl border border-mimi-green/30 bg-mimi-green/5 p-3 text-sm text-foreground">
          {t('ui2.saoKe.daThem', { so: so(ketQua.moi) })}{ketQua.trung ? `, ${t('ui2.saoKe.boQua', { so: so(ketQua.trung) })}` : ''}{ketQua.hong ? `, ${t('ui2.saoKe.hong', { so: so(ketQua.hong) })}` : ''}.{' '}
          <Link to="/dashboard/cashflow" className="font-medium text-primary hover:underline">{t('ui2.saoKe.xemTienVao')}</Link>
        </div>
      )}
      {ketQua && ketQua.moi > 0 && (
        <CauHoiNhanh
          cauHoi="sao_ke_khop"
          className="mt-3"
          cau={t('ui2.saoKe.hoiKhop')}
          luaChon={[{ gia: 'khop', nhan: t('ui2.saoKe.khop') }, { gia: 'khong_khop', nhan: t('ui2.saoKe.khongKhop'), hoiThem: true }]}
        />
      )}

      {bang && (
        <div className="mt-4 space-y-3">
          {xem && xem.dong.length > 0 && (
            <p className="text-sm text-foreground">
              {t('ui2.saoKe.docDuoc')} <span className="font-medium">{t('ui2.saoKe.soGd', { so: so(xem.dong.length) })}</span> {t('ui2.saoKe.tuDen', { tu: ngay(ngays[0]), den: ngay(ngays[ngays.length - 1]) })}
              {' '}{t('ui2.saoKe.vaoRa', { soVao: so(vao.length), tienVao: dinhDangTien(congTien(vao.map((d) => d.amount))), soRa: so(ra.length), tienRa: dinhDangTien(congTien(ra.map((d) => d.amount))) })}
              {xem.loi.length > 0 && <span className="text-mimi-amber"> {t('ui2.saoKe.dongLoi', { so: xem.loi.length, ds: xem.loi.slice(0, 3).map((l) => l.dong).join(', ') })}</span>}
            </p>
          )}

          <button type="button" onClick={() => setSuaCot(!suaCot)} className="text-xs font-medium text-primary hover:underline">
            {suaCot ? t('ui2.saoKe.anCachDoc') : t('ui2.saoKe.suaCachDoc')}
          </button>
          {suaCot && (
            <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground sm:col-span-2">
                {t('ui2.saoKe.dongTieuDe')}
                <select value={banDo?.dong_tieu_de ?? 0} onChange={(e) => doiDongTieuDe(Number(e.target.value))} className="ml-2 h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                  {bang.slice(0, 15).map((h, i) => <option key={i} value={i}>{t('ui2.saoKe.dong', { so: i + 1 })}: {h.filter((o) => o !== null && o !== '').slice(0, 3).join(' | ').slice(0, 60)}</option>)}
                </select>
              </label>
              {COT_SUA.map((c) => (
                <label key={c} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {TEN_COT[c]}
                  <select value={banDo?.cot[c] ?? ''} onChange={(e) => doiCot(c, e.target.value)} className="h-8 max-w-[55%] rounded-lg border border-border bg-background px-2 text-xs text-foreground">
                    <option value="">— {t('ui2.saoKe.khongCo')} —</option>
                    {tieuDe.map((td, i) => <option key={i} value={i}>{td || t('ui2.saoKe.cot', { so: i + 1 })}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}

          {xem && xem.dong.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-xs">
                <caption className="sr-only">{t('ui2.saoKe.namDong')}</caption>
                <thead><tr className="text-left text-muted-foreground">{[t('ui2.saoKe.ngay'), t('ui2.saoKe.vaoRaCot'), t('ui2.ptThanhToan.soTien'), t('ui2.ptThanhToan.noiDung')].map((h) => <th key={h} scope="col" className="px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {xem.dong.slice(0, 5).map((d, i) => (
                    <tr key={i}><td className="px-2 py-1.5">{ngay(d.transaction_date)}</td><td className="px-2 py-1.5">{d.type === 'income' ? t('ui2.saoKe.vao') : t('ui2.saoKe.ra')}</td><td className="px-2 py-1.5 text-right tabular-nums">{so(d.amount)}</td><td className="px-2 py-1.5 font-mono">{d.merchant_name ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="block text-sm text-foreground">
            {t('ui2.saoKe.taiKhoanNao')}
            <input value={taiKhoan} onChange={(e) => setTaiKhoan(e.target.value)} placeholder={t('ui2.saoKe.soTkPh')}
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm sm:w-72" aria-label={t('ui2.saoKe.soTkAria')} />
            <span className="mt-1 block text-xs text-muted-foreground">{t('ui2.saoKe.deNhanRa')}</span>
          </label>

          <button type="button" onClick={() => void nhap()} disabled={dang || !xem?.dong.length || !taiKhoan.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-40">
            {dang && <Loader2 size={15} className="animate-spin" />} {t('ui2.saoKe.nhapGd', { so: xem?.dong.length ? so(xem.dong.length) : '' })}
          </button>
        </div>
      )}
    </section>
  );
}
