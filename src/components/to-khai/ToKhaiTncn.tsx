import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Calculator, ExternalLink, FileDown, FileUp, Loader2, Plus, Save, ScrollText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { DUONG_DAN_NOP_TO_KHAI, goiToKhai, type KetQuaTncn } from '@/lib/goiToKhai';
import { LoiGoiHam } from '@/lib/loiGoiHam';
import { docTep } from '@/lib/saoKe';
import { TEN_LOAI_NGUOI, type ToKhai05 } from '../../../supabase/functions/_shared/thue-tncn/to-khai-05.ts';
import type { LoaiNguoiLaoDong } from '../../../supabase/functions/_shared/thue-tncn/khau-tru.ts';
import { docBangTinh, dongTrong, guiLen, type DongNhap } from './bangLuong';
import { BoHoSoNop } from './BoHoSoNop';

/**
 * Tờ khai thuế TNCN của tổ chức trả lương — mẫu 05/KK-TNCN kèm Thông tư 89/2026/TT-BTC, khai theo quý.
 *
 * Người dùng nhập bảng lương 3 tháng của quý (gõ tay hoặc chọn tệp .xlsx/.csv), MIMI tính thuế khấu
 * trừ từng người, từng tháng ở MÁY CHỦ rồi dựng tờ khai. Bảng lương không được lưu; bản nháp chỉ giữ
 * số tổng + mã băm. Cùng luồng thu tiền với tờ khai hộ kinh doanh: xem trước, lưu nháp miễn phí;
 * "Xuất" mới cần gói, và chỉ bản đã xuất mới không mang dấu "BẢN XEM TRƯỚC".
 */

const so = (n: number | null | undefined) => (n === null || n === undefined ? '' : new Intl.NumberFormat('vi-VN').format(n));
/** Số trên màn hình (không phải mẫu in): theo ngôn ngữ đang chọn. */
const soMan = (n: number | null | undefined) => (n === null || n === undefined ? '' : new Intl.NumberFormat(({ vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' } as Record<string, string>)[(i18n.language ?? 'vi').slice(0, 2)] ?? 'vi-VN').format(n));
const ngay = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');

/** Các quý soạn được: từ quý 3/2026 (mẫu TT 89) tới quý hiện tại. */
function cacKy(homNay: Date): { nam: number; quy: number }[] {
  const ds: { nam: number; quy: number }[] = [];
  const namNay = homNay.getFullYear();
  const quyNay = Math.floor(homNay.getMonth() / 3) + 1;
  for (let nam = 2026; nam <= namNay; nam++) {
    for (let quy = nam === 2026 ? 3 : 1; quy <= 4; quy++) {
      if (nam === namNay && quy > quyNay) break;
      ds.push({ nam, quy });
    }
  }
  return ds.length ? ds : [{ nam: 2026, quy: 3 }];
}

/**
 * GIỮ TIẾNG VIỆT, KHÔNG DỊCH: mẫu 05/KK-TNCN in nộp cơ quan thuế — nguyên văn văn bản. Chỉ chữ phụ trợ
 * trên màn hình (dấu "bản xem trước", chữ cho trình đọc màn hình) đi theo ngôn ngữ đã chọn.
 */
export function GiayToKhai05({ tk, xemTruoc }: { tk: ToKhai05; xemTruoc: boolean }) {
  const { t } = useTranslation();
  const dau = (ma: string) => tk.chi_tieu_dau.find((c) => c.ma === ma)?.gia_tri ?? null;
  const o = (ma: string) => <span className="font-medium">{dau(ma) ?? '……'}</span>;
  return (
    <div className="to-khai-giay relative overflow-hidden rounded-2xl border border-border bg-white p-5 text-[13px] text-slate-900 shadow-sm sm:p-8">
      {xemTruoc && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-[24deg] select-none whitespace-nowrap text-4xl font-bold tracking-widest text-slate-900/[0.07] sm:text-6xl">
            {t('app.toKhai.giay.xemTruoc')}
          </span>
        </div>
      )}
      <div className="mb-4 ml-auto max-w-[16rem] border border-slate-400 p-2 text-center text-[11px] leading-snug text-slate-600">
        <p className="font-semibold text-slate-900">Mẫu số: {tk.mau}</p>
        <p className="italic">({tk.kem_theo})</p>
      </div>
      <div className="text-center">
        <p className="font-semibold uppercase">Cộng hoà xã hội chủ nghĩa Việt Nam</p>
        <p className="font-semibold">Độc lập - Tự do - Hạnh phúc</p>
        <h2 className="mt-4 text-base font-bold uppercase">{tk.tieu_de}</h2>
        <p className="mx-auto mt-1 max-w-2xl text-[11px] italic text-slate-600">{tk.ap_dung}</p>
        <p className="mt-3">[01] Kỳ tính thuế: Quý {tk.ky.quy} năm {tk.ky.nam}</p>
        <p className="mt-1">[02] Lần đầu: {dau('[02]') ? '☑' : '☐'} <span className="ml-8">[03] Bổ sung lần thứ: {dau('[03]') ?? '…'}</span></p>
      </div>

      <div className="mt-4 space-y-1">
        <p><strong>[04] Tên người nộp thuế:</strong> {o('[04]')}</p>
        <p>[05] Mã số thuế: {o('[05]')}</p>
        <p>[06] Địa chỉ: {o('[06]')}</p>
        <p>[07] Xã/Phường/Đặc khu: {o('[07]')} <span className="ml-4">[08] Tỉnh/thành phố: {o('[08]')}</span></p>
        <p>[09] Điện thoại: {o('[09]')} <span className="ml-4">[10] Email: {o('[10]')}</span></p>
        <p>[11] Mã số thuế: {o('[11]')}</p>
        <p><strong>[12] Tên tổ chức, cá nhân cung cấp dịch vụ làm thủ tục về thuế</strong> (nếu có): {o('[12]')}</p>
        <p>[13] Hợp đồng dịch vụ làm thủ tục về thuế: Số: {o('[13]')} Ngày: ……</p>
        <p>[14] Phân bổ thuế do có đơn vị hạch toán phụ thuộc tại địa bàn cấp tỉnh khác nơi có trụ sở chính: {tk.phan_bo ? '☑' : '☐'}</p>
      </div>

      <p className="mt-4 text-right text-[11px] italic text-slate-600">{tk.don_vi_tien}</p>
      <div className="mt-1 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[12px]">
          <caption className="sr-only">{tk.tieu_de} — {tk.ky_chu}</caption>
          <thead>
            <tr className="bg-slate-50">
              {['STT', 'Chỉ tiêu', 'Mã chỉ tiêu', 'Đơn vị tính', 'Số người/ Số tiền'].map((c) => (
                <th key={c} scope="col" className="border border-slate-300 px-2 py-1 text-center">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tk.dong.map((d) => (
              <tr key={d.ma} className={d.dam ? 'font-semibold' : ''}>
                <td className="border border-slate-300 px-2 py-1 text-center align-top">{d.stt}</td>
                <td className="border border-slate-300 px-2 py-1 align-top">{d.nhan}</td>
                <td className="border border-slate-300 px-2 py-1 text-center align-top">{d.ma}</td>
                <td className="border border-slate-300 px-2 py-1 text-center align-top">{d.don_vi}</td>
                <td className="border border-slate-300 px-2 py-1 text-right tabular-nums">{so(d.gia_tri)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-[12px]">{tk.cam_doan}</p>
      <div className="mt-6 grid gap-6 text-[12px] sm:grid-cols-2">
        <div>
          <p className="font-semibold uppercase">Người trực tiếp thực hiện dịch vụ làm thủ tục về thuế</p>
          <p>Họ và tên: ……</p>
          <p>Chứng chỉ nghiệp vụ chuyên môn về thuế số: ……</p>
        </div>
        <div className="text-center">
          <p className="italic">…, ngày … tháng … năm …</p>
          <p className="font-semibold uppercase">Người nộp thuế hoặc</p>
          <p className="font-semibold uppercase">Đại diện hợp pháp của người nộp thuế</p>
          <p className="italic">(Chữ ký, ghi rõ họ tên; chức vụ và đóng dấu (nếu có)/Xác nhận điện tử/Ký điện tử)</p>
        </div>
      </div>

      <div className="mt-6 text-[11px] leading-relaxed text-slate-600">
        <p className="font-semibold italic">Ghi chú:</p>
        {tk.ghi_chu_mau.map((g) => <p key={g} className="italic">- {g}</p>)}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-3 text-[11px] text-slate-600">
        <p className="font-semibold text-slate-900">Căn cứ MIMI dùng cho tờ khai này</p>
        <ul className="mt-1 space-y-0.5">
          {tk.can_cu_tncn.map((c) => (
            <li key={c.id}>
              {c.van_ban} · {c.vi_tri} — {c.y}
              {c.nguon === 'thu_cap' ? ' (nguồn thứ cấp, chưa đối chiếu Công báo)' : ' (đã đọc trên bản ký số của văn bản)'}
            </li>
          ))}
        </ul>
        <p className="mt-2">Bản nháp do MIMI soạn, không thay trách nhiệm khai thuế của người nộp thuế.</p>
      </div>
    </div>
  );
}

const LOAI: LoaiNguoiLaoDong[] = ['cu_tru_hdld', 'cu_tru_khac', 'khong_cu_tru'];
const oNhap = 'h-9 w-full rounded-lg border border-border bg-card px-2 text-sm tabular-nums';

export function ToKhaiTncn() {
  const { t } = useTranslation();
  const ky = useMemo(() => cacKy(new Date()), []);
  // Mặc định quý vừa kết thúc (quý cần nộp), không phải quý đang chạy.
  const [chonKy, setChonKy] = useState(ky[Math.max(0, ky.length - 2)]);
  const [ds, setDs] = useState<DongNhap[]>([dongTrong()]);
  const [kq, setKq] = useState<KetQuaTncn | null>(null);
  const [dang, setDang] = useState<'tinh' | 'luu' | 'xuat' | 'tep' | null>(null);
  const [daXuat, setDaXuat] = useState(false);
  const [canMua, setCanMua] = useState(false);
  const tep = useRef<HTMLInputElement>(null);

  // Sửa bảng lương là kết quả cũ không còn đúng: bỏ, bắt tính lại.
  const doi = (f: (x: DongNhap[]) => DongNhap[]) => { setDs(f); setKq(null); setDaXuat(false); setCanMua(false); };
  const sua = (khoa: string, p: Partial<DongNhap>) => doi((x) => x.map((d) => (d.khoa === khoa ? { ...d, ...p } : d)));
  const suaThang = (khoa: string, j: number, p: Partial<{ tn: string; bh: string }>) =>
    doi((x) => x.map((d) => (d.khoa === khoa ? { ...d, thang: d.thang.map((m, i) => (i === j ? { ...m, ...p } : m)) } : d)));

  const thamSo = () => ({ nam: chonKy.nam, quy: chonKy.quy, bang_luong: guiLen(ds) });

  const tinh = async () => {
    setDang('tinh');
    try {
      setKq(await goiToKhai('tncn_soan', thamSo()) as unknown as KetQuaTncn);
      setDaXuat(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.toKhai.tncn.loiTinh'));
    } finally {
      setDang(null);
    }
  };

  const luu = async () => {
    setDang('luu');
    try {
      const r = await goiToKhai('tncn_luu_nhap', thamSo());
      toast.success(t('app.toKhai.toast.daLuuNhap', { ma: String(r.ma_bam).slice(0, 8) }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.toKhai.toast.loiLuuNhap'));
    } finally {
      setDang(null);
    }
  };

  const xuat = async () => {
    setDang('xuat');
    try {
      const r = await goiToKhai('tncn_xuat', thamSo());
      setDaXuat(true);
      setCanMua(false);
      toast.success(r.cach_tra === 'goi' ? t('app.toKhai.toast.xuatGoi') : r.cach_tra === 'da_tra_ky_nay' ? t('app.toKhai.toast.xuatLai') : t('app.toKhai.toast.xuatLuot', { n: r.con_luot }));
      setTimeout(() => window.print(), 300);
    } catch (e) {
      if (e instanceof LoiGoiHam && e.status === 402) setCanMua(true);
      else toast.error(e instanceof Error ? e.message : t('app.toKhai.toast.loiXuat'));
    } finally {
      setDang(null);
    }
  };

  const chonTep = async (f: File | undefined) => {
    if (!f) return;
    setDang('tep');
    try {
      const r = docBangTinh(await docTep(f));
      if (r.ok === false) toast.error(r.cau);
      else {
        doi(() => r.ds);
        toast.success(t('app.toKhai.tncn.daDocTep', { n: r.ds.length }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('app.toKhai.tncn.loiTep'));
    } finally {
      setDang(null);
      if (tep.current) tep.current.value = '';
    }
  };

  const tk = kq?.to_khai ?? null;
  const biChan = tk?.san_sang.trang_thai === 'bi_chan';

  return (
    <div className="space-y-4">
      <section aria-labelledby="tncn-bang" className="no-print rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="tncn-bang" className="text-lg font-semibold text-foreground">{t('app.toKhai.tncn.tieuDe')}</h2>
          <label className="text-sm text-muted-foreground">
            {t('app.toKhai.tncn.ky')}{' '}
            <select
              value={`${chonKy.nam}-${chonKy.quy}`}
              onChange={(e) => { const [n, q] = e.target.value.split('-').map(Number); setChonKy({ nam: n, quy: q }); setKq(null); setDaXuat(false); }}
              className="ml-1 h-9 rounded-lg border border-border bg-card px-2 text-sm text-foreground"
            >
              {ky.map((k) => <option key={`${k.nam}-${k.quy}`} value={`${k.nam}-${k.quy}`}>{t('app.toKhai.ky.quy', { quy: k.quy, nam: k.nam })}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('app.toKhai.tncn.moTa')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('app.toKhai.tncn.cotTep')}</p>

        <div className="mt-3 space-y-3">
          {ds.map((d, i) => (
            <fieldset key={d.khoa} className="rounded-xl border border-border p-3">
              <legend className="px-1 text-xs text-muted-foreground">{t('app.toKhai.tncn.nguoi', { n: i + 1 })}</legend>
              <div className="grid gap-2 sm:grid-cols-4">
                <label className="text-xs text-muted-foreground sm:col-span-2">{t('app.toKhai.tncn.hoTen')}
                  <input value={d.ho_ten} onChange={(e) => sua(d.khoa, { ho_ten: e.target.value })} className={oNhap} />
                </label>
                <label className="text-xs text-muted-foreground">{t('app.toKhai.tncn.maDinhDanh')}
                  <input value={d.ma_dinh_danh} onChange={(e) => sua(d.khoa, { ma_dinh_danh: e.target.value })} className={oNhap} autoComplete="off" />
                </label>
                <label className="text-xs text-muted-foreground">{t('app.toKhai.tncn.npt')}
                  <input type="number" min={0} max={20} step={1} value={d.so_nguoi_phu_thuoc} disabled={d.loai !== 'cu_tru_hdld'} onChange={(e) => sua(d.khoa, { so_nguoi_phu_thuoc: e.target.value })} className={oNhap} />
                </label>
                <label className="text-xs text-muted-foreground sm:col-span-4">{t('app.toKhai.tncn.loai')}
                  <select value={d.loai} onChange={(e) => sua(d.khoa, { loai: e.target.value as LoaiNguoiLaoDong })} className={oNhap}>
                    {LOAI.map((l) => <option key={l} value={l}>{TEN_LOAI_NGUOI[l]}</option>)}
                  </select>
                </label>
                {d.thang.map((m, j) => (
                  <div key={j} className="grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-4">
                    <label className="col-span-1 text-xs text-muted-foreground sm:col-span-2">{t('app.toKhai.tncn.tn', { t: j + 1 })}
                      <input inputMode="numeric" value={m.tn} onChange={(e) => suaThang(d.khoa, j, { tn: e.target.value })} className={oNhap} />
                    </label>
                    <label className="col-span-1 text-xs text-muted-foreground sm:col-span-2">{t('app.toKhai.tncn.bh', { t: j + 1 })}
                      <input inputMode="numeric" value={m.bh} onChange={(e) => suaThang(d.khoa, j, { bh: e.target.value })} className={oNhap} />
                    </label>
                  </div>
                ))}
                {d.loai !== 'cu_tru_hdld' && (
                  <label className="text-xs text-muted-foreground sm:col-span-4">{t('app.toKhai.tncn.thueNhap')}
                    <input inputMode="numeric" value={d.thue_da_khau_tru_quy} onChange={(e) => sua(d.khoa, { thue_da_khau_tru_quy: e.target.value })} className={oNhap} />
                  </label>
                )}
              </div>
              {ds.length > 1 && (
                <button type="button" onClick={() => doi((x) => x.filter((y) => y.khoa !== d.khoa))} className="mt-2 inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                  <Trash2 size={13} aria-hidden /> {t('app.toKhai.tncn.xoa')}
                </button>
              )}
            </fieldset>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => doi((x) => [...x, dongTrong()])} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm text-foreground hover:bg-accent">
            <Plus size={15} aria-hidden /> {t('app.toKhai.tncn.them')}
          </button>
          <button type="button" onClick={() => tep.current?.click()} disabled={dang === 'tep'} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm text-foreground hover:bg-accent disabled:opacity-50">
            {dang === 'tep' ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} aria-hidden />} {t('app.toKhai.tncn.nhapTep')}
          </button>
          <input ref={tep} type="file" accept=".xlsx,.xls,.csv" className="hidden" aria-label={t('app.toKhai.tncn.nhapTep')} onChange={(e) => void chonTep(e.target.files?.[0])} />
          <button type="button" onClick={() => void tinh()} disabled={dang === 'tinh'} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50">
            {dang === 'tinh' ? <Loader2 size={15} className="animate-spin" /> : <Calculator size={15} aria-hidden />} {t('app.toKhai.tncn.tinh')}
          </button>
        </div>
      </section>

      {kq && !tk && (
        <p className="no-print rounded-2xl border border-border bg-card p-5 text-sm text-foreground">{kq.ly_do_khong_soan}</p>
      )}

      {kq && tk && (
        <>
          <GiayToKhai05 tk={tk} xemTruoc={!daXuat} />

          {tk.san_sang.trang_thai !== 'san_sang' && (
            <div role={biChan ? 'alert' : 'status'} className={`no-print rounded-2xl border p-5 ${biChan ? 'border-mimi-amber/40 bg-mimi-amber/5' : 'border-border bg-card'}`}>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <AlertTriangle size={15} className="text-mimi-amber" aria-hidden />
                {biChan ? t('app.toKhai.nhap.biChan') : t('app.toKhai.nhap.nenXem')}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {tk.san_sang.vuong.map((v) => <li key={v.ma} className="text-sm leading-relaxed text-foreground">{v.cau}</li>)}
              </ul>
            </div>
          )}

          <div className="no-print rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">{t('app.toKhai.tncn.tungNguoi')}</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th scope="col" className="py-1 font-medium">{t('app.toKhai.tncn.hoTen')}</th>
                    <th scope="col" className="py-1 text-right font-medium">{t('app.toKhai.tncn.cotTnct')}</th>
                    <th scope="col" className="py-1 text-right font-medium">{t('app.toKhai.tncn.cotTntt')}</th>
                    <th scope="col" className="py-1 text-right font-medium">{t('app.toKhai.tncn.cotThue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {kq.nguoi.map((n) => (
                    <tr key={n.thu_tu}>
                      <td className="py-1.5">{n.ho_ten}{!n.mimi_tinh && <span className="ml-1 text-xs text-muted-foreground">({t('app.toKhai.tncn.banNhap')})</span>}</td>
                      <td className="py-1.5 text-right tabular-nums">{soMan(n.thu_nhap_chiu_thue_quy)}</td>
                      <td className="py-1.5 text-right tabular-nums">{n.thu_nhap_tinh_thue_quy === null ? '—' : soMan(n.thu_nhap_tinh_thue_quy)}</td>
                      <td className="py-1.5 text-right tabular-nums">{soMan(n.thue_quy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-foreground">{t('app.toKhai.nhap.cachTinh')}</h3>
            <ul className="mt-2 space-y-1.5">
              {tk.cach_tinh.map((c) => <li key={c} className="flex gap-2 text-sm leading-relaxed text-muted-foreground"><ScrollText size={14} className="mt-1 shrink-0" aria-hidden /> {c}</li>)}
            </ul>
            <ul className="mt-3 space-y-1.5">
              {tk.canh_bao.map((c) => <li key={c} className="flex gap-2 text-sm leading-relaxed text-mimi-amber"><AlertTriangle size={14} className="mt-1 shrink-0" aria-hidden /> {c}</li>)}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void xuat()} disabled={dang === 'xuat' || biChan} title={biChan ? t('app.toKhai.nhap.goVuong') : undefined} className="inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50">
                {dang === 'xuat' ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} aria-hidden />} {t('app.toKhai.tncn.xuat')}
              </button>
              <button type="button" onClick={() => void luu()} disabled={dang === 'luu'} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50">
                {dang === 'luu' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} aria-hidden />} {t('app.toKhai.nhap.luuNhap')}
              </button>
              <a href={DUONG_DAN_NOP_TO_KHAI} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
                {t('app.toKhai.nhap.nop')} <ExternalLink size={14} aria-hidden />
              </a>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t('app.toKhai.nhap.hanNop', { ngay: ngay(tk.han_nop) })}</p>
            {canMua && <p className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground">{t('app.toKhai.nhap.canGoi')}</p>}
          </div>

          {/* 12/10/2026: sau khi xuất — bộ hồ sơ nộp: bảng số liệu đối chiếu + hướng dẫn nộp đúng cổng. */}
          {daXuat && (
            <BoHoSoNop
              mau={tk.mau}
              kyChu={tk.ky_chu}
              hanNop={tk.han_nop}
              loai={kq.cong_ty.loai_theo_mst ?? 'doanh_nghiep'}
              congTy={{ ten: kq.cong_ty.ten, mst: kq.cong_ty.mst }}
              chiTieu={[...tk.chi_tieu_dau.map((c) => ({ ma: c.ma, nhan: c.nhan, gia_tri: c.gia_tri })), ...tk.dong.map((d) => ({ ma: d.ma, nhan: d.nhan, gia_tri: d.gia_tri, don_vi: d.don_vi }))]}
              canCu={tk.can_cu_tncn.map((c) => `${c.van_ban} · ${c.vi_tri}${c.nguon === 'thu_cap' ? ' (nguồn thứ cấp, chưa đối chiếu Công báo)' : ''}`)}
            />
          )}
        </>
      )}
    </div>
  );
}
