import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Loader2, Printer, ShieldAlert } from 'lucide-react';
import { goiHoSoVay, type DongHoSoVay, type HoSoVay, type KetQuaDanhGia } from '@/lib/goiHoSoVay';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { inTaiLieu, LOP_VUNG_IN, ngayTep, tenTepAnToan } from '@/lib/inTaiLieu';
import { SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';

/**
 * VAY VỐN (10/11/2026) — chủ nhập số tiền, kỳ hạn, mục đích → xem đánh giá sẵn sàng vay có lý do → lập hồ sơ → tự in.
 *
 * Mọi con số và mọi câu lý do do máy chủ tính (`supabase/functions/ho-so-vay`, hàm thuần có test); trang này chỉ hiện.
 * MIMI không cho vay và không gửi hồ sơ cho ai: nút duy nhất đưa hồ sơ ra ngoài là hộp in của trình duyệt.
 */

const ngonHienTai = () => ((i18n.language ?? 'vi').slice(0, 2) === 'vi' ? 'vi' : 'en');
const locale = () => (ngonHienTai() === 'vi' ? 'vi-VN' : 'en-US');
const tien = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${new Intl.NumberFormat(locale()).format(Math.round(n))} ₫`);
const thangChu = (k: string) => `${k.slice(5, 7)}/${k.slice(0, 4)}`;
const ngayChu = (s: string | null | undefined) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');
/** tsconfig không bật strict nên nhánh `co_diem: false` không tự thu hẹp — dùng hàm canh kiểu. */
type KhongDiem = Extract<KetQuaDanhGia, { co_diem: false }>;
const khongDiem = (d: KetQuaDanhGia): d is KhongDiem => !d.co_diem;
const chiSo = (s: string) => s.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

const MAU_MUC: Record<string, string> = {
  vung: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
  kha: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900',
  can_cai_thien: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
  chua_nen: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900',
};

function DanhGia({ dg }: { dg: KetQuaDanhGia }) {
  const { t } = useTranslation();
  if (khongDiem(dg)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="font-medium">{t('vay.chuaDuDuLieu')}</p>
        <p className="mt-1">{dg.ly_do}</p>
        <ul className="mt-2 list-disc pl-5">{dg.goi_y.map((g) => <li key={g}>{g}</li>)}</ul>
      </div>
    );
  }
  const g = dg.gia_dinh;
  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 ${MAU_MUC[dg.muc] ?? ''}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-semibold tabular-nums">{dg.diem}<span className="text-base font-normal">{t('vay.tren100')}</span></span>
          <span className="text-lg font-medium">{dg.ten_muc}</span>
        </div>
        <p className="mt-1 text-sm">{dg.mo_ta_muc}</p>
        {dg.chan.map((c) => <p key={c.ma} className="mt-2 flex gap-2 text-sm font-medium"><ShieldAlert className="h-4 w-4 shrink-0" />{c.cau}</p>)}
      </div>

      <section>
        <h3 className="mb-2 font-medium">{t('vay.lyDoChinh')}</h3>
        {dg.ly_do_chinh.length === 0 ? <p className="text-sm text-muted-foreground">{t('vay.khongCoLyDo')}</p> : (
          <ol className="space-y-2">
            {dg.ly_do_chinh.map((l, i) => (
              <li key={l.ma_ly_do} className="rounded-lg border p-3 text-sm">
                <p><span className="font-medium">{i + 1}. </span>{l.cau}</p>
                {l.goi_y && <p className="mt-1 text-muted-foreground">→ {l.goi_y}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium">{t('vay.khaNangTra')}</h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">{t('vay.dongTienRong')}</dt><dd className="font-medium tabular-nums">{tien(dg.so_lieu.rong_tb)}</dd></div>
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">{t('vay.traGop')}</dt><dd className="font-medium tabular-nums">{tien(dg.so_lieu.tra_gop_thang.thap)} – {tien(dg.so_lieu.tra_gop_thang.cao)}</dd></div>
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">{t('vay.traToiDa')}</dt><dd className="font-medium tabular-nums">{tien(dg.so_lieu.tra_toi_da_thang)}</dd></div>
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">{t('vay.gocToiDa')}</dt><dd className="font-medium tabular-nums">{dg.so_lieu.rong_tb > 0 ? `${tien(dg.so_lieu.goc_toi_da.thap)} – ${tien(dg.so_lieu.goc_toi_da.cao)}` : '—'}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">{t('vay.giaDinh', { ty: Math.round(g.ty_le_tra_no_tren_dong_tien_rong * 100), thap: Math.round(g.lai_nam_thap * 100), cao: Math.round(g.lai_nam_cao * 100) })}</p>
      </section>

      <section>
        <h3 className="mb-2 font-medium">{t('vay.tungYeuTo')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3 font-normal">{t('vay.cotYeuTo')}</th><th className="py-2 pr-3 font-normal">{t('vay.cotDiem')}</th>
              <th className="py-2 pr-3 font-normal">{t('vay.cotDoDuoc')}</th><th className="py-2 font-normal">{t('vay.cotGoiY')}</th>
            </tr></thead>
            <tbody>
              {dg.yeu_to.map((y) => (
                <tr key={y.khoa} className="border-b align-top">
                  <td className="py-2 pr-3 font-medium">{y.ten}</td>
                  <td className="py-2 pr-3 tabular-nums">{y.diem}/{y.toi_da}</td>
                  <td className="py-2 pr-3">{y.ly_do}</td>
                  <td className="py-2 text-muted-foreground">{y.goi_y || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="text-xs text-muted-foreground">{dg.nhan}. {dg.ghi_chu}</p>
    </div>
  );
}

/** Bản in A4 của hồ sơ: chỉ phần này ra giấy (`LOP_VUNG_IN`). */
function BanIn({ hs }: { hs: HoSoVay }) {
  const { t } = useTranslation();
  const dg = hs.danh_gia;
  const th = 'border px-2 py-1 text-left font-medium';
  const td = 'border px-2 py-1';
  const so = `${td} text-right tabular-nums`;
  return (
    <article className={`${LOP_VUNG_IN} rounded-xl border bg-white p-6 text-[13px] leading-relaxed text-black`}>
      <header className="khong-ngat mb-4 text-center">
        <h2 className="text-lg font-bold">{t('vay.hs.tieuDe')}</h2>
        <p className="text-xs">{t('vay.hs.lapNgay', { ngay: ngayChu(hs.lap_ngay) })}</p>
        <p className="mt-1 text-xs italic">{hs.nhan}</p>
      </header>

      <h3 className="mt-4 font-bold">{t('vay.hs.deNghi')}</h3>
      <p>{t('vay.soTien')}: <b>{tien(hs.de_nghi.so_tien)}</b> · {t('vay.kyHan')}: <b>{hs.de_nghi.ky_han_thang}</b> · {t('vay.mucDich')}: <b>{hs.de_nghi.muc_dich}</b></p>

      <h3 className="mt-4 font-bold">{t('vay.hs.danhTinh')}</h3>
      <table className="w-full border-collapse"><tbody>
        <tr><td className={th}>{t('vay.hs.ten')}</td><td className={td}>{hs.danh_tinh.ten ?? '—'}</td></tr>
        <tr><td className={th}>{t('vay.hs.mst')}</td><td className={td}>{hs.danh_tinh.ma_so_thue ?? '—'}</td></tr>
        <tr><td className={th}>{t('vay.hs.tenMst')}</td><td className={td}>{hs.danh_tinh.ten_theo_mst ?? '—'}</td></tr>
        <tr><td className={th}>{t('vay.hs.diaChi')}</td><td className={td}>{hs.danh_tinh.dia_chi_theo_mst ?? '—'}</td></tr>
        <tr><td className={th}>{t('vay.hs.loaiHinh')}</td><td className={td}>{hs.danh_tinh.loai_theo_mst ?? '—'}</td></tr>
      </tbody></table>

      <h3 className="mt-4 font-bold">{t('vay.hs.dongTien')}</h3>
      <table className="w-full border-collapse">
        <thead><tr><th className={th}>{t('vay.hs.thang')}</th><th className={th}>{t('vay.hs.vao')}</th><th className={th}>{t('vay.hs.ra')}</th><th className={th}>{t('vay.hs.rong')}</th></tr></thead>
        <tbody>
          {hs.dong_tien.thang.map((r) => (
            <tr key={r.khoa}>
              <td className={td}>{thangChu(r.khoa)}</td>
              {r.vao === null ? <td className={`${td} italic`} colSpan={3}>{t('vay.hs.khongCo')}</td> : (
                <><td className={so}>{tien(r.vao)}</td><td className={so}>{tien(r.ra)}</td><td className={so}>{tien(r.rong)}</td></>
              )}
            </tr>
          ))}
          <tr className="font-bold"><td className={td}>{t('vay.hs.tong')}</td><td className={so}>{tien(hs.dong_tien.tong_vao)}</td><td className={so}>{tien(hs.dong_tien.tong_ra)}</td><td className={so}>{tien(hs.dong_tien.tong_rong)}</td></tr>
        </tbody>
      </table>
      {hs.dong_tien.tien_vao_bi_loai.so_khoan > 0 && <p className="text-xs">{t('vay.hs.daLoai', { so: hs.dong_tien.tien_vao_bi_loai.so_khoan, tien: tien(hs.dong_tien.tien_vao_bi_loai.so_tien) })}</p>}

      <h3 className="mt-4 font-bold">{t('vay.hs.doanhThu')}</h3>
      <table className="w-full border-collapse">
        <thead><tr><th className={th}>{t('vay.hs.nam')}</th><th className={th}>{t('vay.hs.uocTinh')}</th><th className={th}>{t('vay.hs.khoang')}</th><th className={th}>{t('vay.hs.daXacNhan')}</th><th className={th}>{t('vay.hs.chuaRo')}</th></tr></thead>
        <tbody>{hs.doanh_thu.map((d) => (
          <tr key={d.nam}><td className={td}>{d.nam}</td><td className={so}>{tien(d.gia_tri)}</td><td className={so}>{tien(d.can_duoi)} – {tien(d.can_tren)}</td><td className={so}>{tien(d.da_xac_nhan)}</td><td className={so}>{tien(d.chua_ro)}</td></tr>
        ))}</tbody>
      </table>

      <h3 className="mt-4 font-bold">{t('vay.hs.thue')}</h3>
      <p>{hs.thue.tom_tat}</p>

      <h3 className="mt-4 font-bold">{t('vay.hs.khaNang')}</h3>
      {hs.kha_nang_tra.tra_gop_thang ? (
        <ul className="list-disc pl-5">
          <li>{t('vay.traGop')}: {tien(hs.kha_nang_tra.tra_gop_thang.thap)} – {tien(hs.kha_nang_tra.tra_gop_thang.cao)}</li>
          <li>{t('vay.traToiDa')}: {tien(hs.kha_nang_tra.tra_toi_da_thang)}</li>
          {hs.kha_nang_tra.goc_toi_da && <li>{t('vay.gocToiDa')}: {tien(hs.kha_nang_tra.goc_toi_da.thap)} – {tien(hs.kha_nang_tra.goc_toi_da.cao)}</li>}
          <li className="text-xs">{hs.kha_nang_tra.gia_dinh}</li>
        </ul>
      ) : <p>—</p>}

      <h3 className="mt-4 font-bold">{t('vay.hs.duBao')}</h3>
      {hs.du_bao.du_du_lieu ? (
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>{t('vay.hs.thang')}</th>{hs.du_bao.kich_ban.map((k) => <th key={k.ten} className={th}>{t(`vay.hs.kichBan.${k.ten}`)}</th>)}</tr></thead>
          <tbody>{hs.du_bao.kich_ban[0].thang.map((m, i) => (
            <tr key={m.khoa}><td className={td}>{thangChu(m.khoa)}</td>{hs.du_bao.kich_ban.map((k) => <td key={k.ten} className={so}>{tien(k.thang[i].rong)}</td>)}</tr>
          ))}</tbody>
        </table>
      ) : <p>{t('vay.hs.chuaDuBao', { ly: hs.du_bao.ly_do_thieu ?? '' })}</p>}

      <h3 className="mt-4 font-bold">{t('vay.hs.danhGia')}</h3>
      {dg.co_diem ? (
        <div className="khong-ngat">
          <p><b>{dg.diem}/100 — {dg.ten_muc}.</b> {dg.mo_ta_muc}</p>
          {dg.chan.map((c) => <p key={c.ma}>• {c.cau}</p>)}
          <ol className="list-decimal pl-5">{dg.ly_do_chinh.map((l) => <li key={l.ma_ly_do}>{l.cau}</li>)}</ol>
        </div>
      ) : <p>{khongDiem(dg) ? dg.ly_do : ''}</p>}

      <h3 className="mt-4 font-bold">{t('vay.hs.kiemTra')}</h3>
      <table className="w-full border-collapse"><tbody>
        {hs.kiem_tra.map((m) => (
          <tr key={m.ma}><td className={th}>{m.ten}</td><td className={td}>{t(`vay.hs.trangThaiMuc.${m.trang_thai}`)}</td><td className={td}>{m.ghi_chu}</td></tr>
        ))}
      </tbody></table>

      <h3 className="mt-4 font-bold">{t('vay.hs.giayTo')}</h3>
      <ul className="list-disc pl-5">{hs.giay_to_tu_chuan_bi.map((g) => <li key={g}>{g}</li>)}</ul>

      <h3 className="mt-4 font-bold">{t('vay.hs.dongY')}</h3>
      <p>{hs.dong_y}</p>
      <p className="mt-2 text-xs font-medium">{t('vay.hs.tuyenBo')}</p>
      <ul className="list-disc pl-5 text-xs">{hs.tuyen_bo.map((x) => <li key={x}>{x}</li>)}</ul>
      <div className="khong-ngat mt-8 text-right"><p>{t('vay.hs.chuKy')}</p><div className="h-16" /></div>
    </article>
  );
}

export default function VayVonPage() {
  const { t } = useTranslation();
  const [soTien, setSoTien] = useState('');
  const [kyHan, setKyHan] = useState('12');
  const [mucDich, setMucDich] = useState('');
  const [dongY, setDongY] = useState(false);
  const [dangDanhGia, setDangDanhGia] = useState(false);
  const [dangLap, setDangLap] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dg, setDg] = useState<KetQuaDanhGia | null>(null);
  const [hoSo, setHoSo] = useState<{ id: string; file: HoSoVay; trang_thai: string } | null>(null);
  const [ds, setDs] = useState<DongHoSoVay[]>([]);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const baoLoi = (e: unknown) => setLoi(e instanceof LoiGoiHam && e.status === 403 ? (e.message || t('vay.loiQuyen')) : e instanceof Error ? e.message : String(e));

  const taiDs = useCallback(() => {
    goiHoSoVay('ds').then((r) => setDs((r.ho_so ?? []) as DongHoSoVay[])).catch(() => setDs([]));
  }, []);
  useEffect(() => {
    taiDs();
    const doi = () => { setDg(null); setHoSo(null); taiDs(); };
    window.addEventListener(SU_KIEN_DOI_CONG_TY, doi);
    return () => window.removeEventListener(SU_KIEN_DOI_CONG_TY, doi);
  }, [taiDs]);

  const deNghi = () => ({ so_tien: Number(chiSo(soTien) || 0), ky_han_thang: Number(kyHan), muc_dich: mucDich, ngon: ngonHienTai() });

  const danhGia = async () => {
    setLoi(null); setThongBao(null); setHoSo(null); setDangDanhGia(true);
    try { setDg((await goiHoSoVay('danh_gia', deNghi())).danh_gia as KetQuaDanhGia); } catch (e) { baoLoi(e); } finally { setDangDanhGia(false); }
  };

  const lapHoSo = async () => {
    setLoi(null); setThongBao(null); setDangLap(true);
    try {
      const r = await goiHoSoVay('tao_ho_so', { ...deNghi(), dong_y: dongY });
      setDg(r.danh_gia as KetQuaDanhGia);
      setHoSo({ id: r.ho_so.id, file: r.file as HoSoVay, trang_thai: r.ho_so.trang_thai });
      taiDs();
    } catch (e) { baoLoi(e); } finally { setDangLap(false); }
  };

  const moHoSo = async (id: string) => {
    setLoi(null); setThongBao(null);
    try {
      const r = await goiHoSoVay('xem', { id });
      setHoSo({ id, file: r.ho_so.file_json as HoSoVay, trang_thai: r.ho_so.trang_thai });
      setDg(r.ho_so.file_json.danh_gia as KetQuaDanhGia);
    } catch (e) { baoLoi(e); }
  };

  const inRa = async (daGui = false) => {
    if (!hoSo) return;
    try {
      const r = await goiHoSoVay('xuat', { id: hoSo.id, da_gui: daGui });
      setHoSo({ ...hoSo, trang_thai: r.ho_so.trang_thai });
      if (daGui) { setThongBao(t('vay.daDanhDau')); taiDs(); return; }
    } catch (e) { baoLoi(e); return; }
    inTaiLieu(`ho-so-vay-${tenTepAnToan(hoSo.file.danh_tinh.ten ?? 'mimi')}-${ngayTep()}`);
  };

  const hopLe = Number(chiSo(soTien)) >= 1_000_000 && Number(kyHan) >= 1 && Number(kyHan) <= 120;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="no-print">
        <h1 className="text-2xl font-semibold">{t('vay.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('vay.moTa')}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t('vay.khongChoVay')}</p>
        {/* 22/11/2026: hai công cụ cùng luồng vay gộp vào đây (bỏ khỏi danh mục Công cụ để không lặp ba nút). */}
        <nav aria-label="Cùng hồ sơ vay" className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href="/dashboard/doanh-thu-xac-minh" className="rounded-lg border px-3 py-1.5 hover:bg-muted">Doanh thu đã xác minh</a>
          <a href="/dashboard/co-hoi" className="rounded-lg border px-3 py-1.5 hover:bg-muted">Cơ hội phát triển</a>
        </nav>
      </header>

      <section className="no-print grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
        <label className="text-sm">{t('vay.soTien')}
          <input inputMode="numeric" className="mt-1 w-full rounded-md border bg-background px-3 py-2 tabular-nums" value={soTien ? new Intl.NumberFormat(locale()).format(Number(chiSo(soTien))) : ''}
            onChange={(e) => setSoTien(chiSo(e.target.value).slice(0, 12))} placeholder="200.000.000" />
        </label>
        <label className="text-sm">{t('vay.kyHan')}
          <input type="number" min={1} max={120} className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={kyHan} onChange={(e) => setKyHan(e.target.value)} />
        </label>
        <label className="text-sm sm:col-span-3">{t('vay.mucDich')}
          <input className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={mucDich} maxLength={500} onChange={(e) => setMucDich(e.target.value)} placeholder={t('vay.mucDichGoiY')} />
        </label>
        <div className="sm:col-span-3">
          <button type="button" disabled={!hopLe || dangDanhGia} onClick={danhGia}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {dangDanhGia && <Loader2 className="h-4 w-4 animate-spin" />}{dangDanhGia ? t('vay.dangTinh') : t('vay.xemDanhGia')}
          </button>
        </div>
      </section>

      {loi && <p role="alert" className="no-print rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{loi}</p>}
      {thongBao && <p className="no-print rounded-lg border p-3 text-sm">{thongBao}</p>}

      {dg && !hoSo && (
        <section className="no-print space-y-4">
          <DanhGia dg={dg} />
          <div className="rounded-xl border p-4">
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={dongY} onChange={(e) => setDongY(e.target.checked)} />
              <span>{t('vay.dongY')}</span>
            </label>
            <button type="button" disabled={!dongY || dangLap || mucDich.trim().length < 3} onClick={lapHoSo}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {dangLap && <Loader2 className="h-4 w-4 animate-spin" />}{dangLap ? t('vay.dangLap') : t('vay.lapHoSo')}
            </button>
          </div>
        </section>
      )}

      {hoSo && (
        <section className="space-y-3">
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={() => inRa(false)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <Printer className="h-4 w-4" />{t('vay.inHoSo')}
            </button>
            {hoSo.trang_thai !== 'shared' && (
              <button type="button" onClick={() => inRa(true)} className="rounded-md border px-4 py-2 text-sm">{t('vay.daGui')}</button>
            )}
            <span className="self-center text-sm text-muted-foreground">{t(`vay.trangThai.${hoSo.trang_thai}`)}</span>
          </div>
          <BanIn hs={hoSo.file} />
        </section>
      )}

      <section className="no-print">
        <h2 className="mb-2 font-medium">{t('vay.hoSoCu')}</h2>
        {ds.length === 0 ? <p className="text-sm text-muted-foreground">{t('vay.khongCoHoSo')}</p> : (
          <ul className="divide-y rounded-xl border">
            {ds.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span>{new Date(h.created_at).toLocaleDateString(locale())} ·{tien(h.so_tien)} · {h.ky_han_thang} · {h.muc_dich}</span>
                <span className="flex items-center gap-3">
                  <span className="text-muted-foreground">{t(`vay.trangThai.${h.trang_thai}`)}</span>
                  <button type="button" className="text-primary hover:underline" onClick={() => moHoSo(h.id)}>{t('vay.mo')}</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
