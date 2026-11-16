import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { BadgeCheck, CircleHelp, Loader2, Send, Undo2 } from 'lucide-react';
import { goiCoHoi, type DongDongY, type DongGioiThieu, type GoiHien, type KetQuaCoHoi, type TruongChiaSe } from '@/lib/goiGioiThieu';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';

/**
 * CƠ HỘI PHÁT TRIỂN (16/11/2026) — chủ doanh nghiệp xem dấu hiệu tăng trưởng của chính mình (có bằng chứng), nhu cầu có
 * thể có, gói ngân hàng phù hợp và bước tiếp theo. Chỉ khi chủ chọn một gói, đọc công bố phân tích, chọn đúng các trường
 * và bấm đồng ý mới có gói giới thiệu (bản nháp); gói chỉ "đi" khi chủ bấm Gửi. Mọi con số do máy chủ tính.
 */

const ngonHienTai = (): 'vi' | 'en' => ((i18n.language ?? 'vi').slice(0, 2) === 'vi' ? 'vi' : 'en');
const ngayChu = (s: string | null | undefined) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');
const thangChu = (k: string) => `${k.slice(5, 7)}/${k.slice(0, 4)}`;

const MAU_MUC: Record<string, string> = {
  san_sang_mo_rong: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900',
  dang_len: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900',
  moi_tang_truong: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900',
};

interface ChonGoi { goi: GoiHien }

function BangDongY({ chon, du, onXong, onHuy }: { chon: ChonGoi; du: KetQuaCoHoi; onXong: () => void; onHuy: () => void }) {
  const { t } = useTranslation();
  const macDinh = du.truong_chia_se.filter((x) => x.mac_dinh).map((x) => x.ma);
  const [phamVi, setPhamVi] = useState<TruongChiaSe[]>(macDinh);
  const [lienHe, setLienHe] = useState(false);
  const [dienThoai, setDienThoai] = useState('');
  const [soNgay, setSoNgay] = useState(30);
  const [daDoc, setDaDoc] = useState(false);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const laLienHe = (m: TruongChiaSe) => m === 'lien_he_email' || m === 'lien_he_dien_thoai';

  const bat = (m: TruongChiaSe, co: boolean) => setPhamVi((ds) => (co ? [...new Set([...ds, m])] : ds.filter((x) => x !== m)));
  const doiLienHe = (co: boolean) => { setLienHe(co); if (!co) setPhamVi((ds) => ds.filter((x) => !laLienHe(x))); };

  const dongY = async () => {
    setLoi(null); setDang(true);
    try {
      await goiCoHoi('dong_y', { goi_id: chon.goi.id, pham_vi: phamVi, yeu_cau_lien_he: lienHe, dien_thoai: dienThoai || undefined, so_ngay: soNgay, hieu_phan_tich: daDoc, ngon: ngonHienTai() });
      onXong();
    } catch (e) { setLoi(e instanceof Error ? e.message : String(e)); } finally { setDang(false); }
  };

  return (
    <section aria-label={t('coHoi.dongY.tieuDe', { ngan_hang: chon.goi.ngan_hang })} className="space-y-3 rounded-xl border-2 border-primary/40 p-4">
      <h3 className="font-medium">{t('coHoi.dongY.tieuDe', { ngan_hang: chon.goi.ngan_hang })} · {chon.goi.ten_goi}</h3>
      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <p className="font-medium">{t('coHoi.dongY.congBo')}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">{du.cong_bo.map((c) => <li key={c}>{c}</li>)}</ul>
        <p className="mt-2">{t('coHoi.dongY.nhanDuLieu', { phap_nhan: chon.goi.phap_nhan_nhan })}</p>
      </div>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">{t('coHoi.dongY.chonTruong')}</legend>
        <p className="text-xs text-muted-foreground">{t('coHoi.dongY.goiYToiThieu')}</p>
        {du.truong_chia_se.filter((x) => !laLienHe(x.ma)).map((x) => (
          <label key={x.ma} className="flex items-center gap-2">
            <input type="checkbox" checked={phamVi.includes(x.ma)} onChange={(e) => bat(x.ma, e.target.checked)} />{x.ten}
          </label>
        ))}
      </fieldset>
      <div className="space-y-1 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={lienHe} onChange={(e) => doiLienHe(e.target.checked)} />{t('coHoi.dongY.muonLienHe')}</label>
        {lienHe && (
          <div className="space-y-1 pl-6">
            {du.truong_chia_se.filter((x) => laLienHe(x.ma)).map((x) => (
              <label key={x.ma} className="flex items-center gap-2">
                <input type="checkbox" checked={phamVi.includes(x.ma)} onChange={(e) => bat(x.ma, e.target.checked)} />{x.ten}
              </label>
            ))}
            {phamVi.includes('lien_he_dien_thoai') && (
              <input aria-label={t('coHoi.dongY.dienThoai')} inputMode="tel" className="w-56 rounded-md border bg-background px-3 py-1.5" value={dienThoai}
                onChange={(e) => setDienThoai(e.target.value.slice(0, 15))} placeholder="09xx xxx xxx" />
            )}
          </div>
        )}
      </div>
      <label className="block text-sm">{t('coHoi.dongY.thoiHan')}{' '}
        <select className="rounded-md border bg-background px-2 py-1" value={soNgay} onChange={(e) => setSoNgay(Number(e.target.value))}>
          {[7, 30, 90].map((n) => <option key={n} value={n}>{t('coHoi.dongY.ngay', { so: n })}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={daDoc} onChange={(e) => setDaDoc(e.target.checked)} /><span>{t('coHoi.dongY.daDoc')}</span></label>
      {loi && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{loi}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!daDoc || phamVi.length === 0 || dang} onClick={dongY}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {dang && <Loader2 className="h-4 w-4 animate-spin" />}{t('coHoi.dongY.lapGoi')}
        </button>
        <button type="button" onClick={onHuy} className="rounded-md border px-4 py-2 text-sm">{t('coHoi.dongY.huy')}</button>
      </div>
    </section>
  );
}

function taiJson(ten: string, du: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(du, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = ten; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CoHoiPage() {
  const { t } = useTranslation();
  const ngon = ngonHienTai();
  const [du, setDu] = useState<KetQuaCoHoi | null>(null);
  const [dang, setDang] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [chon, setChon] = useState<ChonGoi | null>(null);
  const [dongY, setDongY] = useState<DongDongY[]>([]);
  const [gioiThieu, setGioiThieu] = useState<DongGioiThieu[]>([]);
  const [xuat, setXuat] = useState<{ id: string; van_ban: string; goi: unknown } | null>(null);
  const [thongBao, setThongBao] = useState<string | null>(null);

  const baoLoi = useCallback((e: unknown) => setLoi(e instanceof LoiGoiHam && e.status === 403 ? (e.message || t('coHoi.loiQuyen')) : e instanceof Error ? e.message : String(e)), [t]);

  const taiDs = useCallback(() => {
    goiCoHoi('ds').then((r) => { setDongY((r.dong_y ?? []) as DongDongY[]); setGioiThieu((r.gioi_thieu ?? []) as DongGioiThieu[]); }).catch(() => { setDongY([]); setGioiThieu([]); });
  }, []);
  const tai = useCallback(() => {
    setDang(true); setLoi(null);
    goiCoHoi('tin_hieu', { ngon: ngonHienTai() }).then((r) => setDu(r as KetQuaCoHoi)).catch(baoLoi).finally(() => setDang(false));
    taiDs();
  }, [baoLoi, taiDs]);

  useEffect(() => {
    tai();
    const doi = () => { setChon(null); setXuat(null); tai(); };
    window.addEventListener(SU_KIEN_DOI_CONG_TY, doi);
    return () => window.removeEventListener(SU_KIEN_DOI_CONG_TY, doi);
  }, [tai]);

  const theoGoi = useMemo(() => {
    const m = new Map<string, GoiHien>();
    for (const n of du?.nhu_cau ?? []) for (const g of n.goi) m.set(g.id, g);
    return m;
  }, [du]);

  const gui = async (g: DongGioiThieu) => {
    const ten = theoGoi.get(g.offer_id)?.ngan_hang ?? '';
    if (!window.confirm(t('coHoi.goi.xacNhanGui', { ngan_hang: ten }))) return;
    try {
      const r = await goiCoHoi('gui', { id: g.id, ngon });
      setXuat({ id: g.id, van_ban: r.van_ban, goi: r.goi });
      taiDs();
    } catch (e) { baoLoi(e); }
  };
  const rut = async (consentId: string) => {
    try { await goiCoHoi('thu_hoi', { id: consentId, ngon }); setThongBao(t('coHoi.goi.daRut')); setXuat(null); taiDs(); } catch (e) { baoLoi(e); }
  };

  const th = du?.tin_hieu;
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">{t('coHoi.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('coHoi.moTa')}</p>
        {th && <p className="mt-2 text-xs text-muted-foreground">{th.nhan[ngon]}</p>}
      </header>

      {dang && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{t('coHoi.dangTai')}</p>}
      {loi && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{loi}</p>}
      {thongBao && <p className="rounded-lg border p-3 text-sm">{thongBao}</p>}

      {th && du && (
        <>
          <section className={`rounded-xl border p-4 ${MAU_MUC[th.muc] ?? ''}`}>
            <p className="text-sm">{t('coHoi.mucTangTruong')}</p>
            <p className="text-2xl font-semibold">{th.ten_muc[ngon]}</p>
            <p className="mt-1 text-sm"><span className="font-medium">{t('coHoi.luatMuc')}: </span>{th.ly_do_muc[ngon]}</p>
          </section>

          <section>
            <h2 className="mb-2 font-medium">{t('coHoi.dauHieu')}</h2>
            {th.tin_hieu.length === 0 ? <p className="text-sm text-muted-foreground">{t('coHoi.khongDauHieu')}</p> : (
              <ul className="space-y-2">
                {th.tin_hieu.map((s) => (
                  <li key={s.ma} className="rounded-lg border p-3 text-sm">
                    <p>{s.giai_thich[ngon]}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`coHoi.tinCay.${s.do_tin_cay}`)}
                      {s.bang_chung.thang.length > 0 && <> · {t('coHoi.thangBangChung', { ds: s.bang_chung.thang.map(thangChu).join(', ') })}</>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 font-medium">{t('coHoi.nhuCau')}</h2>
            {du.nhu_cau.length === 0 ? <p className="text-sm text-muted-foreground">{t('coHoi.khongNhuCau')}</p> : (
              <div className="space-y-3">
                {du.nhu_cau.map((n) => {
                  const hd = du.hanh_dong.find((h) => h.nhu_cau === n.nhu_cau);
                  return (
                    <article key={n.nhu_cau} className="rounded-xl border p-4">
                      <h3 className="font-medium">{n.ten}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{n.ly_do}</p>
                      {hd && (
                        <p className="mt-2 text-sm"><span className="font-medium">{t('coHoi.buocTiep')}: </span>{hd.cau}
                          {hd.ngay_goi_y && <span className="text-muted-foreground"> ({t('coHoi.ngayGoiY', { ngay: ngayChu(hd.ngay_goi_y) })})</span>}
                        </p>
                      )}
                      {n.goi.length === 0 ? <p className="mt-2 text-xs text-muted-foreground">{t('coHoi.khongGoi')}</p> : (
                        <ul className="mt-3 space-y-2">
                          {n.goi.map((g) => (
                            <li key={g.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">{g.ten_goi}</span>
                                <span className="text-muted-foreground">· {g.ngan_hang}</span>
                                {g.da_xac_minh
                                  ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />{t('coHoi.daXacMinh')}</span>
                                  : <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><CircleHelp className="h-3.5 w-3.5" />{t('coHoi.chuaXacMinh')}</span>}
                              </div>
                              <p className="mt-1">{g.mo_ta}</p>
                              {g.da_xac_minh && typeof g.tieu_chi?.mo_ta_dieu_kien === 'string' && (
                                <p className="mt-1 text-xs"><span className="font-medium">{t('coHoi.dieuKien')}: </span>{g.tieu_chi.mo_ta_dieu_kien as string}</p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">{t(`coHoi.phuHop.${g.phu_hop}`)} · {g.nhan_xac_minh}
                                {g.nguon && <> · <a className="underline" href={g.nguon} target="_blank" rel="noreferrer">{t('coHoi.nguon')}</a></>}
                              </p>
                              <button type="button" onClick={() => { setChon({ goi: g }); setThongBao(null); }} className="mt-2 rounded-md border px-3 py-1.5 text-xs font-medium">{t('coHoi.quanTam')}</button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">{du.ghi_chu_thu_tu}</p>
          </section>

          {chon && <BangDongY chon={chon} du={du} onHuy={() => setChon(null)} onXong={() => { setChon(null); taiDs(); }} />}
        </>
      )}

      <section>
        <h2 className="mb-2 font-medium">{t('coHoi.goi.tieuDe')}</h2>
        {gioiThieu.length === 0 ? <p className="text-sm text-muted-foreground">{t('coHoi.goi.trong')}</p> : (
          <ul className="divide-y rounded-xl border">
            {gioiThieu.map((g) => {
              const dy = dongY.find((d) => d.id === g.consent_id);
              const ten = (g.payload as { goi?: { ten_goi?: string } } | null)?.goi?.ten_goi ?? theoGoi.get(g.offer_id)?.ten_goi ?? '';
              const conHieuLuc = dy?.trang_thai === 'con_hieu_luc';
              return (
                <li key={g.id} className="space-y-1 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>{ten} · {t(`coHoi.goi.trangThai.${g.status}`)}{dy && <> · {t('coHoi.goi.hetHan', { ngay: ngayChu(dy.expires_at) })}</>}</span>
                    <span className="flex gap-2">
                      {g.status !== 'withdrawn' && conHieuLuc && (
                        <button type="button" onClick={() => gui(g)} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"><Send className="h-3.5 w-3.5" />{t('coHoi.goi.gui')}</button>
                      )}
                      {dy && !dy.revoked_at && (
                        <button type="button" onClick={() => rut(dy.id)} className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs"><Undo2 className="h-3.5 w-3.5" />{t('coHoi.goi.rut')}</button>
                      )}
                    </span>
                  </div>
                  {g.payload && (
                    <details className="text-xs text-muted-foreground">
                      <summary>{t('coHoi.goi.truong')}</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all">{JSON.stringify((g.payload as { du_lieu?: unknown }).du_lieu ?? {}, null, 2)}</pre>
                    </details>
                  )}
                  {xuat?.id === g.id && (
                    <div className="rounded-lg bg-muted/40 p-3">
                      <pre className="whitespace-pre-wrap text-xs">{xuat.van_ban}</pre>
                      <button type="button" className="mt-2 rounded-md border px-3 py-1.5 text-xs" onClick={() => taiJson(`goi-gioi-thieu-${g.id.slice(0, 8)}.json`, xuat.goi)}>{t('coHoi.goi.taiGoi')}</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
