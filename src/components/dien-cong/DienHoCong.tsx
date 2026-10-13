import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Pause, Play, RefreshCw, ShieldCheck, Square, TriangleAlert, Unplug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import i18n from 'i18next';
import { Trans, useTranslation } from 'react-i18next';
import { goiToKhai, type BanNhap } from '@/lib/goiToKhai';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import {
  banGiaoDien, batDauDien, docTienDo, dsTab, dungDien, ghepBoChay, huyGhepBoChay, kiemBoChay, moTrinhDuyet, tiepTucDien,
  type TabBoChay, type TienDoDien, type TrangThaiBoChay,
} from '@/lib/dienCong/ketNoiBoChay';

/**
 * ĐIỀN HỘ TRÊN CỔNG (thử nghiệm, sau cờ VITE_DIEN_CONG). MIMI lấy một bản nháp ĐÃ LƯU (máy chủ đã tính và băm), điền vào
 * tab người dùng chọn trong trình duyệt do bộ chạy tại máy mở, đọc lại, đối chiếu, rồi BÀN GIAO. Không ký, không nộp.
 *
 * Hai loại trạng thái không trộn: "đã điền và đối chiếu" là trạng thái vận hành của lần điền này; "đã nộp / có biên nhận /
 * cơ quan đã xác nhận" là trạng thái hồ sơ — chỉ đổi khi người dùng ghi nhận ở luồng nộp, không bao giờ do lần điền này.
 */
const TEN_O: Record<string, string> = {
  ky_loai: '[01] Kỳ tính thuế', ky_nam: 'Năm', dd_1: 'Đánh dấu: doanh thu ≤ 1 tỷ', dd_2: 'Đánh dấu: mới ra kinh doanh',
  dt_08a: '[08a] Phân phối hàng hoá', dt_08b: '[08b] Dịch vụ', dt_08c: '[08c] Cho thuê tài sản', dt_08d: '[08d] Sản xuất, vận tải', dt_08e: '[08e] Khác', dt_11: '[11] Tổng cộng',
};
const LOCALE: Record<string, string> = { vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' };
const loc = () => LOCALE[(i18n.language ?? 'vi').slice(0, 2)] ?? 'vi-VN';
const hienGiaTri = (khoa: string, v: string | null) => {
  if (v === null) return '—';
  if (khoa.startsWith('dt_')) { const so = v.replace(/\D/g, ''); return so ? `${Number(so).toLocaleString(loc())} ₫` : v || i18n.t('ui1.dhc.trong'); }
  if (v === 'co') return i18n.t('ui1.nvhd.co'); if (v === 'khong') return i18n.t('ui1.nvhd.khong');
  return v || i18n.t('ui1.dhc.trong');
};
const TRANG_THAI = new Set(['cho', 'dang_dien', 'tam_dung', 'da_doi_chieu', 'lech', 'ban_giao', 'dung', 'loi']);

async function jwtHienTai(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error(i18n.t('ui1.dhc.hetPhien'));
  return data.session.access_token;
}

export function DienHoCong() {
  const { t } = useTranslation();
  const [bc, setBc] = useState<TrangThaiBoChay | null>(null);
  const [ma, setMa] = useState('');
  const [nhap, setNhap] = useState<BanNhap[]>([]);
  const [chonNhap, setChonNhap] = useState('');
  const [tab, setTab] = useState<TabBoChay[] | null>(null);
  const [chonTab, setChonTab] = useState('');
  const [tienDo, setTienDo] = useState<TienDoDien | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const hen = useRef<number | null>(null);

  const lamMoiBoChay = useCallback(async () => setBc(await kiemBoChay()), []);
  useEffect(() => { void lamMoiBoChay(); }, [lamMoiBoChay]);
  useEffect(() => {
    goiToKhai('ds_nhap').then((r) => setNhap((r.ds as BanNhap[]).filter((d) => d.mau === '01/TKN-CNKD'))).catch(() => setNhap([]));
  }, []);

  const theoDoi = useCallback(() => {
    if (hen.current) window.clearInterval(hen.current);
    hen.current = window.setInterval(async () => {
      try {
        const td = await docTienDo();
        setTienDo(td);
        if (!['dang_dien', 'cho'].includes(td.trang_thai) && hen.current) { window.clearInterval(hen.current); hen.current = null; }
      } catch (e) { setLoi(e instanceof Error ? e.message : String(e)); if (hen.current) window.clearInterval(hen.current); hen.current = null; }
    }, 800);
  }, []);
  useEffect(() => () => { if (hen.current) window.clearInterval(hen.current); }, []);

  const lam = async (f: () => Promise<void>) => {
    setLoi(null); setDang(true);
    try { await f(); } catch (e) { setLoi(e instanceof Error ? e.message : String(e)); } finally { setDang(false); }
  };

  const ghep = () => lam(async () => { await ghepBoChay(ma.trim()); setMa(''); await lamMoiBoChay(); });
  const mo = (kenh: 'chrome' | 'msedge') => lam(async () => { await moTrinhDuyet(kenh); setTab((await dsTab()).tab); });
  const taiTab = () => lam(async () => { setTab((await dsTab()).tab); });
  const batDau = () => lam(async () => {
    if (!chonNhap || !chonTab) throw new Error(t('ui1.dhc.chonTruoc'));
    const congTyId = await idCongTyDangDung();
    if (!congTyId) throw new Error(t('ui1.dhc.chuaCty'));
    const r = await goiToKhai('dien_tao_phien', { nhap_id: chonNhap, bo_chuyen: 'tkn-cnkd-thu', khoa_chong_trung: `dien-${crypto.randomUUID()}` });
    if (!r.ok) throw new Error((r.loi ?? []).join(' ') || t('ui1.dhc.khongTaoPhien'));
    await batDauDien({ phien_id: r.nhiem_vu.id, cong_ty_id: congTyId, jwt: await jwtHienTai(), tab_ma: chonTab });
    setTienDo({ trang_thai: 'cho' });
    theoDoi();
  });
  const dung = () => lam(async () => { await dungDien(); theoDoi(); });
  const tiepTuc = () => lam(async () => { await tiepTucDien(await jwtHienTai()); theoDoi(); });
  const banGiao = () => lam(async () => { await banGiaoDien(); setTienDo(await docTienDo()); });

  const tt = tienDo?.trang_thai;
  return (
    <section data-mimi="to-khai.dien-ho" aria-labelledby="dien-ho-tieu-de" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="dien-ho-tieu-de" className="font-display text-lg font-bold text-foreground">{t('ui1.dhc.tieuDe')}</h2>
        <span className="rounded-full bg-mimi-amber/15 px-2 py-0.5 text-xs font-semibold text-mimi-amber">{t('ui1.dhc.thuNghiem')}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        <Trans i18nKey="ui1.dhc.moTa" components={{ b: <strong className="text-foreground" /> }} />
      </p>

      {/* Bước 1: bộ chạy */}
      <div className="mt-4 rounded-xl border border-border/70 p-4">
        <p className="text-sm font-semibold text-foreground">{t('ui1.dhc.b1')}</p>
        {!bc ? <p className="mt-2 text-sm text-muted-foreground"><Loader2 size={14} className="inline animate-spin" /> {t('ui1.dhc.dangTim')}</p>
          : !bc.co ? (
            <div className="mt-2 text-sm text-muted-foreground">
              <p><Trans i18nKey="ui1.dhc.chuaThay" components={{ b: <strong />, c: <code /> }} /></p>
              <button type="button" onClick={() => void lamMoiBoChay()} className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"><RefreshCw size={14} /> {t('ui1.chung.thuLai')}</button>
            </div>
          ) : !bc.da_ghep ? (
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-sm text-muted-foreground">{t('ui1.dhc.maGhep')}
                <input id="dien-ho-ma-ghep" value={ma} onChange={(e) => setMa(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric"
                  className="mt-1 block h-10 w-40 rounded-lg border border-border bg-background px-3 font-mono text-base tracking-widest" />
              </label>
              <button type="button" disabled={dang || ma.length !== 6} onClick={() => void ghep()} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{t('ui1.dhc.ghepNoi')}</button>
            </div>
          ) : (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-mimi-green">
              <ShieldCheck size={15} /> {t('ui1.dhc.daGhep')}
              <button type="button" onClick={() => void lam(async () => { await huyGhepBoChay(); await lamMoiBoChay(); })} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Unplug size={13} /> {t('ui1.dhc.huyGhep')}</button>
            </p>
          )}
      </div>

      {bc?.da_ghep && (
        <>
          {/* Bước 2: bản nháp */}
          <div className="mt-3 rounded-xl border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">{t('ui1.dhc.b2')}</p>
            {nhap.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{t('ui1.dhc.chuaNhap')}</p> : (
              <select id="dien-ho-nhap" value={chonNhap} onChange={(e) => setChonNhap(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">{t('ui1.dhc.chonNhap')}</option>
                {nhap.map((n) => <option key={n.id} value={n.id}>{n.mau} · {n.ky_loai === 'nam' ? t('ui1.dhc.nam', { nam: n.nam }) : t('ui1.dhc.sauThang', { nam: n.nam })} · {t('ui1.dhc.luu', { luc: new Date(n.created_at).toLocaleString(loc()) })} · {t('ui1.dhc.ma', { ma: n.ma_bam.slice(0, 8) })}</option>)}
              </select>
            )}
          </div>

          {/* Bước 3: tab */}
          <div className="mt-3 rounded-xl border border-border/70 p-4">
            <p className="text-sm font-semibold text-foreground">{t('ui1.dhc.b3')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('ui1.dhc.b3MoTa')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={dang} onClick={() => void mo('chrome')} className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-accent">{t('ui1.dhc.moChrome')}</button>
              <button type="button" disabled={dang} onClick={() => void mo('msedge')} className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-accent">{t('ui1.dhc.moEdge')}</button>
              <button type="button" disabled={dang} onClick={() => void taiTab()} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm hover:bg-accent"><RefreshCw size={14} /> {t('ui1.dhc.taiTab')}</button>
            </div>
            {tab && (
              <fieldset className="mt-3 space-y-1">
                <legend className="sr-only">{t('ui1.dhc.chonTab')}</legend>
                {tab.length === 0 && <p className="text-sm text-muted-foreground">{t('ui1.dhc.khongTab')}</p>}
                {tab.map((x) => (
                  <label key={x.ma} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="radio" name="dien-ho-tab" value={x.ma} checked={chonTab === x.ma} onChange={() => setChonTab(x.ma)} className="mt-1" />
                    <span className="min-w-0"><span className="block truncate text-foreground">{x.tieu_de || t('ui1.dhc.khongTieuDe')}</span><span className="block truncate font-mono text-xs text-muted-foreground">{x.dia_chi}</span></span>
                  </label>
                ))}
              </fieldset>
            )}
          </div>

          {/* Bước 4: chạy */}
          <div className="mt-3 rounded-xl border border-border/70 p-4">
            <div className="flex flex-wrap gap-2">
              <button type="button" data-mimi="to-khai.dien-ho.bat-dau" data-mimi-khong-tu-bam=""
                disabled={dang || !chonNhap || !chonTab || tt === 'dang_dien'} onClick={() => void batDau()}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                <Play size={15} /> {t('ui1.dhc.batDau')}
              </button>
              {tt === 'dang_dien' && <button type="button" onClick={() => void dung()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm"><Pause size={15} /> {t('ui1.dhc.dung')}</button>}
              {tt === 'tam_dung' && <button type="button" onClick={() => void tiepTuc()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm"><Play size={15} /> {t('ui1.dhc.tiepTuc')}</button>}
              {(tt === 'da_doi_chieu' || tt === 'lech') && <button type="button" onClick={() => void banGiao()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm"><Square size={15} /> {t('ui1.dhc.nhanBanGiao')}</button>}
            </div>

            {tienDo && tt !== 'khong_co' && (
              <div className="mt-3" role="status" aria-live="polite">
                <p className={`flex items-center gap-2 text-sm font-semibold ${tt === 'da_doi_chieu' || tt === 'ban_giao' ? 'text-mimi-green' : tt === 'lech' || tt === 'dung' || tt === 'loi' ? 'text-mimi-amber' : 'text-foreground'}`}>
                  {tt === 'dang_dien' || tt === 'cho' ? <Loader2 size={15} className="animate-spin" /> : tt === 'da_doi_chieu' || tt === 'ban_giao' ? <CheckCircle2 size={15} /> : <TriangleAlert size={15} />}
                  {TRANG_THAI.has(tt ?? '') ? t(`ui1.dhc.tt_${tt}`) : tt}
                </p>
                {tienDo.thong_diep && <p className="mt-1 text-sm text-muted-foreground">{tienDo.thong_diep}</p>}
                {!!tienDo.ket_qua?.length && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-1.5 pr-3">{t('ui1.dhc.cotO')}</th><th className="pr-3">{t('ui1.dhc.cotNhap')}</th><th className="pr-3">{t('ui1.dhc.cotDocLai')}</th><th>{t('ui1.agent.ketQua')}</th></tr></thead>
                      <tbody>
                        {tienDo.ket_qua.map((k) => (
                          <tr key={k.khoa} className="border-b border-border/50">
                            <td className="py-1.5 pr-3">{TEN_O[k.khoa] ?? k.khoa}</td>
                            <td className="pr-3 tabular-nums">{hienGiaTri(k.khoa, k.mong_doi)}</td>
                            <td className="pr-3 tabular-nums">{hienGiaTri(k.khoa, k.doc_lai)}</td>
                            <td className={k.khop ? 'text-mimi-green' : 'text-mimi-amber'}>{k.khop ? t('ui1.dhc.khop') : t('ui1.xml.muc_lech')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {(tt === 'ban_giao' || tt === 'da_doi_chieu' || tt === 'lech') && (
                  <p className="mt-3 rounded-lg bg-accent px-3 py-2 text-sm text-foreground">
                    <Trans i18nKey="ui1.dhc.trangThaiHoSo" components={{ b: <strong /> }} />
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
      {loi && <p role="alert" className="mt-3 text-sm text-destructive">{loi}</p>}
    </section>
  );
}
