import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Printer, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { nguoiDungHienTai } from '@/lib/nguoiDung';
import { idCongTyDangDung } from '@/lib/congTyDangDung';
import {
  LOAI_GIAY_TO, LY_DO_HUY, MO_TA_GIAY_TO, soanCongVanGiaiTrinh, soanCongVanHuyToKhai, soanDonTraSoat, vanBanThanhChu,
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
      if (error || !data) { setLoiGd('Không đọc được giao dịch này. Bạn vẫn có thể tự điền thông tin giao dịch.'); return; }
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
    })().catch(() => { if (!huy) setLoiGd('Không đọc được giao dịch này. Bạn vẫn có thể tự điền thông tin giao dịch.'); });
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

  const mt = MO_TA_GIAY_TO[loai];
  const dv = (k: keyof ThongTinDonVi) => (v: string) => setDonVi((d) => ({ ...d, [k]: v }));
  const g = (k: keyof GiaoDichTraSoat) => (v: string) => setGd((x) => ({ ...x, [k]: k === 'so_tien' ? Number(v.replace(/\D/g, '')) || 0 : v }));

  const saoChep = async () => {
    try {
      await navigator.clipboard.writeText(vanBanThanhChu(vanBan));
      toast.success('Đã sao chép nội dung.');
    } catch {
      toast.error('Trình duyệt không cho sao chép. Chọn chữ trong bản nháp rồi sao chép tay.');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="no-print">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Soạn giấy tờ</h1>
        <p className="mt-1 text-sm text-muted-foreground">MIMI soạn bản nháp từ dữ liệu của bạn. Bạn đọc lại, ký và tự gửi — MIMI không gửi thay và không lưu bản nháp.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Loại giấy tờ">
          {LOAI_GIAY_TO.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={l === loai}
              onClick={() => setLoai(l)}
              className={`rounded-full border px-3 py-1.5 text-sm ${l === loai ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground'}`}
            >
              {MO_TA_GIAY_TO[l].ten}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-foreground">Gửi tới: {mt.gui_toi}</p>
          <p className="mt-1 text-muted-foreground">Dùng khi: {mt.khi_nao}</p>
          <p className="mt-1 text-foreground">{mt.luu_y}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form className="no-print space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Thông tin để soạn">
          <fieldset className="space-y-3 rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">Đơn vị</legend>
            <Truong nhan="Tên đơn vị" gia={donVi.ten} doi={dv('ten')} />
            <Truong nhan="Mã số thuế" gia={donVi.ma_so_thue} doi={dv('ma_so_thue')} />
            <Truong nhan="Địa chỉ trụ sở" gia={donVi.dia_chi} doi={dv('dia_chi')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Truong nhan="Người đại diện" gia={donVi.nguoi_dai_dien} doi={dv('nguoi_dai_dien')} />
              <Truong nhan="Chức vụ" gia={donVi.chuc_vu} doi={dv('chuc_vu')} goiY="Giám đốc, Chủ hộ…" />
              <Truong nhan="Số điện thoại" gia={donVi.dien_thoai} doi={dv('dien_thoai')} />
              <Truong nhan="Địa danh" gia={donVi.dia_danh} doi={dv('dia_danh')} goiY="TP. Hồ Chí Minh" />
            </div>
          </fieldset>

          {loai === 'don_tra_soat' && (
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-foreground">Giao dịch cần tra soát</legend>
              {loiGd && <p role="alert" className="text-sm text-destructive">{loiGd}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <Truong nhan="Ngân hàng và chi nhánh" gia={gd.ngan_hang} doi={g('ngan_hang')} />
                <Truong nhan="Tài khoản chuyển" gia={gd.tai_khoan_chuyen} doi={g('tai_khoan_chuyen')} />
                <Truong nhan="Ngày giao dịch" gia={gd.ngay} doi={g('ngay')} goiY="2026-09-14" />
                <Truong nhan="Số tiền (đồng)" gia={gd.so_tien ? String(gd.so_tien) : ''} doi={g('so_tien')} />
                <Truong nhan="Tài khoản nhận" gia={gd.tai_khoan_nhan} doi={g('tai_khoan_nhan')} />
                <Truong nhan="Tên người nhận" gia={gd.ten_nguoi_nhan} doi={g('ten_nguoi_nhan')} />
                <Truong nhan="Nội dung chuyển khoản" gia={gd.noi_dung} doi={g('noi_dung')} />
                <Truong nhan="Mã giao dịch" gia={gd.ma_tham_chieu} doi={g('ma_tham_chieu')} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm" role="radiogroup" aria-label="Lý do tra soát">
                {([['chuyen_nham', 'Chuyển nhầm'], ['nghi_lua_dao', 'Nghi bị lừa đảo']] as const).map(([k, t]) => (
                  <label key={k} className="flex items-center gap-2">
                    <input type="radio" name="ly-do-ts" checked={lyDoTs === k} onChange={() => setLyDoTs(k)} /> {t}
                  </label>
                ))}
              </div>
              <Truong nhan="Mô tả sự việc" gia={moTa} doi={setMoTa} nhieuDong goiY={lyDoTs === 'chuyen_nham' ? 'Gõ sai một chữ số tài khoản…' : 'Ai yêu cầu chuyển, qua kênh nào, lúc nào…'} />
            </fieldset>
          )}

          {loai !== 'don_tra_soat' && (
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold text-foreground">{loai === 'cong_van_giai_trinh' ? 'Nội dung giải trình' : 'Tờ khai cần huỷ'}</legend>
              <Truong nhan="Cơ quan thuế quản lý" gia={coQuanThue} doi={setCoQuanThue} goiY="Thuế cơ sở …" />
              {loai === 'cong_van_giai_trinh' ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Truong nhan="Số thông báo của cơ quan thuế" gia={soThongBao} doi={setSoThongBao} />
                    <Truong nhan="Ngày của thông báo" gia={ngayThongBao} doi={setNgayThongBao} goiY="2026-09-01" />
                  </div>
                  <Truong nhan="Cơ quan thuế yêu cầu giải trình về" gia={noiDungYeuCau} doi={setNoiDungYeuCau} goiY="doanh thu quý 2/2026" />
                  <Truong nhan="Nội dung giải trình" gia={giaiTrinh} doi={setGiaiTrinh} nhieuDong />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Số liệu kèm theo (nếu có)</p>
                    {soLieu.map((r, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <input aria-label={`Nội dung số liệu ${i + 1}`} value={r.noi_dung} onChange={(e) => setSoLieu((ds) => ds.map((x, j) => (j === i ? { ...x, noi_dung: e.target.value } : x)))} className={O} />
                        <input aria-label={`Giá trị số liệu ${i + 1}`} value={r.gia_tri} onChange={(e) => setSoLieu((ds) => ds.map((x, j) => (j === i ? { ...x, gia_tri: e.target.value } : x)))} className={O} />
                      </div>
                    ))}
                    <button type="button" onClick={() => setSoLieu((ds) => [...ds, { noi_dung: '', gia_tri: '' }])} className="text-xs font-medium text-primary hover:underline">
                      Thêm dòng số liệu
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Truong nhan="Mẫu tờ khai" gia={mauToKhai} doi={setMauToKhai} goiY="01/CNKD" />
                    <Truong nhan="Kỳ tính thuế" gia={kyTinhThue} doi={setKyTinhThue} goiY="Quý 2/2026" />
                    <Truong nhan="Ngày nộp" gia={ngayNop} doi={setNgayNop} goiY="2026-07-20" />
                    <Truong nhan="Mã giao dịch điện tử" gia={maGiaoDich} doi={setMaGiaoDich} />
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-foreground">Lý do</span>
                    <select value={lyDoHuy} onChange={(e) => setLyDoHuy(e.target.value as LyDoHuy)} className={O}>
                      {(Object.keys(LY_DO_HUY) as LyDoHuy[]).map((k) => <option key={k} value={k}>{LY_DO_HUY[k]}</option>)}
                    </select>
                  </label>
                  <Truong nhan="Giải thích thêm (nếu có)" gia={moTa} doi={setMoTa} nhieuDong />
                </>
              )}
            </fieldset>
          )}
        </form>

        <div className="space-y-3">
          <div className="no-print flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Printer size={14} /> In / lưu PDF
            </button>
            <button type="button" onClick={() => void saoChep()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground">
              <Copy size={14} /> Sao chép nội dung
            </button>
          </div>
          {vanBan.con_thieu.length > 0 && (
            <div role="status" className="no-print flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-foreground">
              <TriangleAlert size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
              <span>Còn {vanBan.con_thieu.length} chỗ trống trước khi in: {vanBan.con_thieu.join(', ')}.</span>
            </div>
          )}
          <GiayIn v={vanBan} />
        </div>
      </div>
    </div>
  );
}

function GiayIn({ v }: { v: VanBan }) {
  return (
    <article aria-label="Bản nháp" className="to-khai-giay rounded-lg border border-border bg-white p-8 font-serif text-[14px] leading-relaxed text-black shadow-sm">
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
