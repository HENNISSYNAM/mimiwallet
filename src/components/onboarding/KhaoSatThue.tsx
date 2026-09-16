import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { goiToKhai } from '@/lib/goiToKhai';
import { useCongCuGhim } from '@/hooks/useCongCuGhim';
import { congCuGoiY } from '@/lib/congCu';
import { KENH, NGANH_DAC_THU, NHOM_NGANH, type HoSoThue } from '@/lib/heLuat';

/**
 * Khảo sát đầu vào ở màn MIMI Assistant (16/09/2026).
 *
 * VÌ SAO HỎI NGAY LÚC VÀO. Ngành và cách bán quyết định mẫu tờ khai (cho thuê nhà khai 01/BĐS,
 * hộ bán trên sàn có thanh toán thì sàn khai thay, hộ dưới 01 tỷ chỉ thông báo doanh thu…). Không
 * biết những điều đó thì MIMI chỉ nói chung chung. Bốn câu, chạm là xong, rồi MIMI:
 *   - lưu vào `ho_so_thue` (qua edge function `to-khai`, có kiểm từng giá trị);
 *   - chọn sẵn công cụ theo ngành nếu người dùng chưa tự chọn (`congCuGoiY`);
 *   - màn đầu hiện đúng nghĩa vụ và mẫu tờ khai của người này.
 *
 * Doanh nghiệp chỉ hỏi hai câu: kênh bán và ngành đặc thù là quy định của hộ kinh doanh.
 * "Để sau" không ghi gì và không hỏi lại trong phiên này — trang Tờ khai thuế vẫn hỏi khi cần.
 */

type Buoc = 'loai' | 'nganh' | 'kenh' | 'dacThu';

const KHOA_BO_QUA = 'mimi:khao-sat-thue-de-sau';

export function daHoanKhaoSatTrongPhien(): boolean {
  try {
    return sessionStorage.getItem(KHOA_BO_QUA) === '1';
  } catch {
    return false;
  }
}

export function KhaoSatThue({ hoSo, onXong }: { hoSo: HoSoThue; onXong: () => void }) {
  const { t } = useTranslation();
  const congCu = useCongCuGhim();
  const [buoc, setBuoc] = useState<Buoc>('loai');
  const [v, setV] = useState<HoSoThue>(hoSo);
  const [dangLuu, setDangLuu] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [an, setAn] = useState(false);

  const cacBuoc: Buoc[] = v.loai_nguoi_nop === 'doanh_nghiep' ? ['loai', 'nganh'] : ['loai', 'nganh', 'kenh', 'dacThu'];
  const viTri = cacBuoc.indexOf(buoc);

  const luu = async (hoSoMoi: HoSoThue) => {
    setDangLuu(true);
    setLoi(null);
    try {
      await goiToKhai('luu_ho_so', { ho_so: hoSoMoi });
      // Chọn công cụ theo ngành chỉ khi người dùng chưa tự chọn — không ghi đè lựa chọn của họ.
      if (congCu.laMacDinh) await congCu.datLai(congCuGoiY(hoSoMoi));
      onXong();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : t('man.khaoSat.loiLuu'));
    } finally {
      setDangLuu(false);
    }
  };

  const chon = (p: Partial<HoSoThue>) => {
    const moi = { ...v, ...p };
    setV(moi);
    const ds: Buoc[] = moi.loai_nguoi_nop === 'doanh_nghiep' ? ['loai', 'nganh'] : ['loai', 'nganh', 'kenh', 'dacThu'];
    const i = ds.indexOf(buoc);
    if (i < ds.length - 1) setBuoc(ds[i + 1]);
    else void luu(moi);
  };

  const deSau = () => {
    try { sessionStorage.setItem(KHOA_BO_QUA, '1'); } catch { /* không lưu được thì chỉ ẩn */ }
    setAn(true);
  };

  if (an) return null;

  const nut = (khoa: string, nhan: string, dangChon: boolean, onClick: () => void) => (
    <button
      key={khoa}
      type="button"
      onClick={onClick}
      disabled={dangLuu}
      aria-pressed={dangChon}
      className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
        dangChon ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-foreground hover:bg-accent'
      }`}
    >
      <span>{nhan}</span>
      {dangChon && <Check size={15} className="shrink-0 text-primary" aria-hidden />}
    </button>
  );

  return (
    <section aria-labelledby="khao-sat-thue" className="relative rounded-2xl border border-border bg-card p-5 text-left">
      <button
        type="button"
        onClick={deSau}
        aria-label={t('man.khaoSat.deSau')}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X size={16} />
      </button>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t('man.khaoSat.buoc', { so: viTri + 1, tong: cacBuoc.length })}
      </p>
      <h3 id="khao-sat-thue" className="mt-1 pr-8 text-base font-semibold text-foreground">{t(`man.khaoSat.q.${buoc}.hoi`)}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t(`man.khaoSat.q.${buoc}.goiY`)}</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label={t(`man.khaoSat.q.${buoc}.hoi`)}>
        {buoc === 'loai' && (['ho_kinh_doanh', 'doanh_nghiep'] as const).map((k) =>
          nut(k, t(`man.khaoSat.loai.${k}`), v.loai_nguoi_nop === k, () => chon({ loai_nguoi_nop: k })))}
        {buoc === 'nganh' && NHOM_NGANH.map((k) =>
          nut(k, t(`man.khaoSat.nganh.${k}`), v.nhom_nganh.includes(k), () => chon({ nhom_nganh: [k] })))}
        {buoc === 'kenh' && KENH.map((k) =>
          nut(k, t(`man.khaoSat.kenh.${k}`), v.kenh === k, () => chon({ kenh: k })))}
        {buoc === 'dacThu' && NGANH_DAC_THU.map((k) =>
          nut(k, t(`man.khaoSat.dacThu.${k}`), v.nganh_dac_thu === k, () => chon({ nganh_dac_thu: k })))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {viTri > 0 && (
          <button type="button" onClick={() => setBuoc(cacBuoc[viTri - 1])} disabled={dangLuu} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> {t('man.khaoSat.quayLai')}
          </button>
        )}
        <button type="button" onClick={deSau} className="text-muted-foreground hover:text-foreground">{t('man.khaoSat.deSau')}</button>
        {dangLuu && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {t('man.khaoSat.dangLuu')}</span>}
      </div>
      {loi && <p className="mt-2 text-sm text-destructive">{loi}</p>}
      <p className="mt-3 text-xs text-muted-foreground">{t('man.khaoSat.viSao')}</p>
    </section>
  );
}
