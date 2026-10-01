import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Printer, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import {
  LOAI_GIAY_TO, LY_DO_HUY, soanCongVanGiaiTrinh, soanCongVanHuyToKhai, soanDonTraSoat, vanBanThanhChu,
  type GiaoDichTraSoat, type LoaiGiayTo, type LyDoHuy, type LyDoTraSoat, type ThongTinDonVi, type VanBan,
} from '@/lib/giayTo';

/**
 * Soạn giấy tờ — đơn tra soát (TCCN-12), công văn giải trình, công văn đề nghị huỷ tờ khai.
 *
 * Tên và mã số thuế lấy từ hồ sơ công ty; giao dịch (khi mở từ một cảnh báo) lấy đúng dòng sao
 * kê theo `?giao_dich=`. Phần còn lại người dùng nhập. MIMI soạn nháp — người dùng ký và gửi;
 * trang không lưu gì và không gửi gì đi.
 */

const O = 'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10';

// GIỮ TIẾNG VIỆT: bản nháp (GiayIn) và các ví dụ gợi ý trong ô nhập (chức vụ, địa danh, kỳ thuế…) là nội dung
// công văn gửi ngân hàng/cơ quan thuế Việt Nam — luôn bằng tiếng Việt dù người dùng chọn ngôn ngữ nào.
function Truong({ nhan, gia, doi, nhieuDong, goiY }: { nhan: string; gia: string; doi: (v: string) => void; nhieuDong?: boolean; goiY?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-foreground">{nhan}</span>
      {nhieuDong ? (
        <textarea value={gia} onChange={(e) => doi(e.target.value)} rows={3} placeholder={goiY} className={O} />
      ) : (
        <input value={gia} onChange={(e) => doi(e.target.value)} placeholder={goiY} className={O} />
      )}
    </label>
  );
}

const laLoai = (v: string | null): v is LoaiGiayTo => !!v && (LOAI_GIAY_TO as readonly string[]).includes(v);

export default function GiayToPage() {
  const { t } = useTranslation();
  const [thamSo] = useSearchParams();
  const [loai, setLoai] = useState<LoaiGiayTo>(() => (laLoai(thamSo.get('loai')) ? (thamSo.get('loai') as LoaiGiayTo) : 'don_tra_soat'));
  const giaoDichId = thamSo.get('giao_dich');

  const [donVi, setDonVi] = useState<ThongTinDonVi>({ ten: '', ma_so_thue: '', dia_chi: '', nguoi_dai_dien: '', chuc_vu: '', dien_thoai: '', dia_danh: '' });
  const [gd, setGd] = useState<GiaoDichTraSoat>({ ngay: '', so_tien: 0, tai_khoan_chuyen: '', ngan_hang: '', tai_khoan_nhan: '', ten_nguoi_nhan: '', noi_dung: '', ma_tham_chieu: '' });
  const [lyDoTs, setLyDoTs] = useState<LyDoTraSoat>('chuyen_nham');
  const [moTa, setMoTa] = useState('');
  const [coQuanThue, setCoQuanThue] = useState('');
  const [soThongBao, setSoThongBao] = useState('');
  const [ngayThongBao, setNgayThongBao] = useState('');
  const [noiDungYeuCau, setNoiDungYeuCau] = useState('');
  const [giaiTrinh, setGiaiTrinh] = useState('');
  const [soLieu, setSoLieu] = useState([{ noi_dung: '', gia_tri: '' }]);
  const [mauToKhai, setMauToKhai] = useState('');
  const [kyTinhThue, setKyTinhThue] = useState('');
  const [ngayNop, setNgayNop] = useState('');
  const [maGiaoDich, setMaGiaoDich] = useState('');
  const [lyDoHuy, setLyDoHuy] = useState<LyDoHuy>('nham_mau');
  const [loiGd, setLoiGd] = useState<string | null>(null);

  // Hồ sơ công ty: tên, mã số thuế, tỉnh — cùng cách đọc với Cài đặt doanh nghiệp.
  // Giấy tờ gửi cơ quan nhà nước ghi tên đăng ký thuế khi đã tra được, không phải tên quen gọi.
  useEffect(() => {
    let huy = false;
    (async () => {
      const user = await nguoiDungHienTai();
      if (!user) return;
      const id = await idCongTyDangDung();
      if (!id) return;
      const { data } = await supabase.from('companies').select('name, tax_id, province, ten_theo_mst').eq('id', id).maybeSingle();
      if (huy || !data) return;
      setDonVi((d) => ({ ...d, ten: data.ten_theo_mst ?? data.name ?? '', ma_so_thue: data.tax_id ?? '', dia_danh: data.province ?? '' }));
    })().catch(() => {});
    return () => { huy = true; };
  }, []);

  // Mở từ một cảnh báo: đọc đúng dòng sao kê đó. RLS chỉ trả dòng của công ty mình.
  useEffect(() => {
    if (!giaoDichId) return;
    let huy = false;
    (async () => {
      const { data, error } = await supabase.from('transactions')
        .select('id, transaction_date, amount, counter_account_name, counter_account_number, payment_reference, reference_id, source_bank, account_number')
        // Không soạn đơn gửi ngân hàng cho giao dịch thử: dòng `is_synthetic` không phải tiền thật.
        .eq('id', giaoDichId).eq('is_synthetic', false).maybeSingle();
      if (huy) return;
      if (error || !data) { setLoiGd(t('app.giayTo.loiGd')); return; }
      setGd({
        ngay: String(data.transaction_date ?? '').slice(0, 10),
        so_tien: Math.abs(Number(data.amount) || 0),
        tai_khoan_chuyen: data.account_number ?? '',
        ngan_hang: data.source_bank ?? '',
        tai_khoan_nhan: data.counter_account_number ?? '',
        ten_nguoi_nhan: data.counter_account_name ?? '',
        noi_dung: data.payment_reference ?? '',
        ma_tham_chieu: data.reference_id ?? '',
      });
    })().catch(() => { if (!huy) setLoiGd(t('app.giayTo.loiGd')); });
    return () => { huy = true; };
  }, [giaoDichId]);

  const vanBan: VanBan = useMemo(() => {
    const homNay = new Date();
    if (loai === 'don_tra_soat') return soanDonTraSoat({ donVi, giaoDich: gd, lyDo: lyDoTs, moTa, homNay });
    if (loai === 'cong_van_giai_trinh') {
      return soanCongVanGiaiTrinh({ donVi, coQuanThue, soThongBao, ngayThongBao, noiDungYeuCau, giaiTrinh, soLieu, homNay });
    }
    return soanCongVanHuyToKhai({ donVi, coQuanThue, mauToKhai, kyTinhThue, ngayNop, maGiaoDich, lyDo: lyDoHuy, moTa, homNay });
  }, [loai, donVi, gd, lyDoTs, moTa, coQuanThue, soThongBao, ngayThongBao, noiDungYeuCau, giaiTrinh, soLieu, mauToKhai, kyTinhThue, ngayNop, maGiaoDich, lyDoHuy]);

  const lk = `app.giayTo.loai.${loai}`;
  const dv = (k: keyof ThongTinDonVi) => (v: string) => setDonVi((d) => ({ ...d, [k]: v }));
  const g = (k: keyof GiaoDichTraSoat) => (v: string) => setGd((x) => ({ ...x, [k]: k === 'so_tien' ? Number(v.replace(/\D/g, '')) || 0 : v }));

  const saoChep = async () => {
    try {
      await navigator.clipboard.writeText(vanBanThanhChu(vanBan));
      toast.success(t('app.giayTo.daChep'));
    } catch {
      toast.error(t('app.giayTo.khongChep'));
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="no-print">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('app.giayTo.tieuDe')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('app.giayTo.moTa')}</p>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={t('app.giayTo.loaiAria')}>
          {LOAI_GIAY_TO.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={l === loai}
              onClick={() => setLoai(l)}
              className={`rounded-full border px-3 py-1.5 text-sm ${l === loai ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
            >
              {t(`app.giayTo.loai.${l}.ten`)}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-foreground">{t('app.giayTo.guiToi', { x: t(`${lk}.guiToi`) })}</p>
          <p className="mt-1 text-muted-foreground">{t('app.giayTo.khiNao', { x: t(`${lk}.khiNao`) })}</p>
          <p className="mt-1 text-foreground">{t(`${lk}.luuY`)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form className="no-print space-y-4" onSubmit={(e) => e.preventDefault()} aria-label={t('app.giayTo.formAria')}>
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">{t('app.giayTo.donVi')}</legend>
            <Truong nhan={t('app.giayTo.f.tenDv')} gia={donVi.ten} doi={dv('ten')} />
            <Truong nhan={t('app.giayTo.f.mst')} gia={donVi.ma_so_thue} doi={dv('ma_so_thue')} />
            <Truong nhan={t('app.giayTo.f.diaChi')} gia={donVi.dia_chi} doi={dv('dia_chi')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Truong nhan={t('app.giayTo.f.daiDien')} gia={donVi.nguoi_dai_dien} doi={dv('nguoi_dai_dien')} />
              <Truong nhan={t('app.giayTo.f.chucVu')} gia={donVi.chuc_vu} doi={dv('chuc_vu')} goiY="Giám đốc, Chủ hộ…" />
              <Truong nhan={t('app.giayTo.f.dienThoai')} gia={donVi.dien_thoai} doi={dv('dien_thoai')} />
              <Truong nhan={t('app.giayTo.f.diaDanh')} gia={donVi.dia_danh} doi={dv('dia_danh')} goiY="TP. Hồ Chí Minh" />
            </div>
          </fieldset>

          {loai === 'don_tra_soat' && (
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-foreground">{t('app.giayTo.giaoDich')}</legend>
              {loiGd && <p role="alert" className="text-sm text-destructive">{loiGd}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Truong nhan={t('app.giayTo.g.nganHang')} gia={gd.ngan_hang} doi={g('ngan_hang')} />
                <Truong nhan={t('app.giayTo.g.tkChuyen')} gia={gd.tai_khoan_chuyen} doi={g('tai_khoan_chuyen')} />
                <Truong nhan={t('app.giayTo.g.ngay')} gia={gd.ngay} doi={g('ngay')} goiY="2026-09-14" />
                <Truong nhan={t('app.giayTo.g.soTien')} gia={gd.so_tien ? String(gd.so_tien) : ''} doi={g('so_tien')} />
                <Truong nhan={t('app.giayTo.g.tkNhan')} gia={gd.tai_khoan_nhan} doi={g('tai_khoan_nhan')} />
                <Truong nhan={t('app.giayTo.g.tenNhan')} gia={gd.ten_nguoi_nhan} doi={g('ten_nguoi_nhan')} />
                <Truong nhan={t('app.giayTo.g.noiDung')} gia={gd.noi_dung} doi={g('noi_dung')} />
                <Truong nhan={t('app.giayTo.g.ma')} gia={gd.ma_tham_chieu} doi={g('ma_tham_chieu')} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label={t('app.giayTo.lyDoAria')}>
                {([['chuyen_nham', t('app.giayTo.chuyenNham')], ['nghi_lua_dao', t('app.giayTo.luaDao')]] as const).map(([k, ten]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="radio" name="ly-do-ts" checked={lyDoTs === k} onChange={() => setLyDoTs(k)} /> {ten}
                  </label>
                ))}
              </div>
              <Truong nhan={t('app.giayTo.moTaSv')} gia={moTa} doi={setMoTa} nhieuDong goiY={lyDoTs === 'chuyen_nham' ? t('app.giayTo.ghiNham') : t('app.giayTo.ghiLua')} />
            </fieldset>
          )}

          {loai !== 'don_tra_soat' && (
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-foreground">{loai === 'cong_van_giai_trinh' ? t('app.giayTo.giaiTrinhTd') : t('app.giayTo.huyTd')}</legend>
              <Truong nhan={t('app.giayTo.coQuan')} gia={coQuanThue} doi={setCoQuanThue} goiY="Thuế cơ sở …" />
              {loai === 'cong_van_giai_trinh' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Truong nhan={t('app.giayTo.soTb')} gia={soThongBao} doi={setSoThongBao} />
                    <Truong nhan={t('app.giayTo.ngayTb')} gia={ngayThongBao} doi={setNgayThongBao} goiY="2026-09-01" />
                  </div>
                  <Truong nhan={t('app.giayTo.yeuCauVe')} gia={noiDungYeuCau} doi={setNoiDungYeuCau} goiY="doanh thu quý 2/2026" />
                  <Truong nhan={t('app.giayTo.noiDungGt')} gia={giaiTrinh} doi={setGiaiTrinh} nhieuDong />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">{t('app.giayTo.soLieu')}</p>
                    {soLieu.map((r, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <input aria-label={t('app.giayTo.soLieuNd', { n: i + 1 })} value={r.noi_dung} onChange={(e) => setSoLieu((ds) => ds.map((x, j) => (j === i ? { ...x, noi_dung: e.target.value } : x)))} className={O} />
                        <input aria-label={t('app.giayTo.soLieuGt', { n: i + 1 })} value={r.gia_tri} onChange={(e) => setSoLieu((ds) => ds.map((x, j) => (j === i ? { ...x, gia_tri: e.target.value } : x)))} className={O} />
                      </div>
                    ))}
                    <button type="button" onClick={() => setSoLieu((ds) => [...ds, { noi_dung: '', gia_tri: '' }])} className="text-xs font-medium text-primary hover:underline">
                      {t('app.giayTo.themDong')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Truong nhan={t('app.giayTo.mau')} gia={mauToKhai} doi={setMauToKhai} goiY="01/CNKD" />
                    <Truong nhan={t('app.giayTo.ky')} gia={kyTinhThue} doi={setKyTinhThue} goiY="Quý 2/2026" />
                    <Truong nhan={t('app.giayTo.ngayNop')} gia={ngayNop} doi={setNgayNop} goiY="2026-07-20" />
                    <Truong nhan={t('app.giayTo.maGd')} gia={maGiaoDich} doi={setMaGiaoDich} />
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">{t('app.giayTo.lyDo')}</span>
                    <select value={lyDoHuy} onChange={(e) => setLyDoHuy(e.target.value as LyDoHuy)} className={O}>
                      {(Object.keys(LY_DO_HUY) as LyDoHuy[]).map((k) => <option key={k} value={k}>{t(`app.giayTo.lyDoHuy.${k}`)}</option>)}
                    </select>
                  </label>
                  <Truong nhan={t('app.giayTo.giaiThich')} gia={moTa} doi={setMoTa} nhieuDong />
                </>
              )}
            </fieldset>
          )}
        </form>

        <div className="space-y-3">
          <div className="no-print flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Printer size={14} /> {t('app.giayTo.in')}
            </button>
            <button type="button" onClick={() => void saoChep()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground">
              <Copy size={14} /> {t('app.giayTo.saoChep')}
            </button>
          </div>
          {vanBan.con_thieu.length > 0 && (
            <div role="status" className="no-print flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-foreground">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
              <span>{t('app.giayTo.conThieu', { n: vanBan.con_thieu.length, ds: vanBan.con_thieu.join(', ') })}</span>
            </div>
          )}
          <GiayIn v={vanBan} />
        </div>
      </div>
    </div>
  );
}

function GiayIn({ v }: { v: VanBan }) {
  const { t } = useTranslation();
  return (
    <article aria-label={t('app.giayTo.banNhap')} className="to-khai-giay rounded-lg border border-border bg-white p-8 font-serif text-[14px] leading-relaxed text-black shadow-sm">
      <div className="flex justify-between gap-4 text-center">
        <div className="text-[13px]">
          {v.so_hieu && <p>{v.so_hieu}</p>}
          {v.trich_yeu && <p className="italic">{v.trich_yeu}</p>}
        </div>
        <div className="ml-auto">
          <p className="font-semibold">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p className="font-semibold underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
          <p className="mt-2 italic">{v.ngay_thang}</p>
        </div>
      </div>
      <h2 className="mt-6 text-center text-[16px] font-bold">{v.tieu_de}</h2>
      <p className="mt-4 text-center">Kính gửi: {v.kinh_gui}</p>
      <div className="mt-4 space-y-2">
        {v.doan.map((d, i) => <p key={i}>{d}</p>)}
      </div>
      {v.bang && (
        <table className="mt-4 w-full border-collapse text-[13px]">
          <thead>
            <tr>{v.bang.cot.map((c) => <th key={c} className="border border-black px-2 py-1 text-left">{c}</th>)}</tr>
          </thead>
          <tbody>
            {v.bang.dong.map((r, i) => <tr key={i}>{r.map((o, j) => <td key={j} className="border border-black px-2 py-1">{o}</td>)}</tr>)}
          </tbody>
        </table>
      )}
      <div className="mt-4">
        <p className="font-semibold">Tài liệu kèm theo:</p>
        <ul className="list-disc pl-6">{v.kem_theo.map((k) => <li key={k}>{k}</li>)}</ul>
      </div>
      <div className="mt-8 ml-auto w-1/2 text-center">
        <p className="font-semibold">{v.ky.chuc_danh}</p>
        <p className="italic text-[13px]">{v.ky.ghi_chu}</p>
        <p className="mt-16 font-semibold">{v.ky.ten}</p>
      </div>
    </article>
  );
}
