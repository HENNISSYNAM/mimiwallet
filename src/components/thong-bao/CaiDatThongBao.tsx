import { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import {
  batDay, docLoaiTat, docThongBao, guiThu, LOAI_THONG_BAO, luuLoaiTat, SU_KIEN_THONG_BAO, tatDay, TEN_LOAI_THONG_BAO,
  trangThaiDay, type LoaiThongBao, type ThongBao, type TrangThaiDay,
} from '@/lib/thongBao';
import { DanhSachThongBao } from './DanhSachThongBao';
import { LoiTaiLai } from '@/components/chung/LoiTaiLai';

/**
 * Bật thông báo — đặt ở trang Nhắc thuế, nơi người dùng đã đến để không lỡ hạn.
 *
 * Một nút bật cho thiết bị đang dùng (điện thoại hay máy tính), rồi từng loại bật/tắt riêng. Không
 * bật đẩy thì thông báo vẫn hiện ở chuông trong app.
 */

/** Câu trạng thái đẩy theo thiết bị — khoá i18n `ui2.tb.tt.<trạng thái>`. */
export function CaiDatThongBao() {
  const { t } = useTranslation();
  const tenLoai = (l: LoaiThongBao) => t(`ui2.loaiTb.${l}`, { defaultValue: TEN_LOAI_THONG_BAO[l] });
  const [tt, setTt] = useState<TrangThaiDay | null>(null);
  const [dang, setDang] = useState(false);
  const [tat, setTat] = useState<LoaiThongBao[]>([]);
  const [ds, setDs] = useState<ThongBao[]>([]);
  const [loiDs, setLoiDs] = useState(false);
  // null = đang đọc, false = đọc lỗi. Chưa đọc được thì KHOÁ công tắc: bật/tắt lúc đó sẽ lưu đè và xoá mất
  // những loại người dùng đã tắt trước đây.
  const [daDocTat, setDaDocTat] = useState<boolean | null>(null);

  const taiDs = useCallback(() => { void docThongBao(30).then((d) => { setDs(d); setLoiDs(false); }).catch(() => setLoiDs(true)); }, []);
  const taiTat = useCallback(() => {
    setDaDocTat(null);
    void docLoaiTat().then((t) => { setTat(t); setDaDocTat(true); }).catch(() => setDaDocTat(false));
  }, []);

  useEffect(() => {
    void trangThaiDay().then(setTt).catch(() => setTt('khong_ho_tro'));
    taiTat();
    taiDs();
    window.addEventListener(SU_KIEN_THONG_BAO, taiDs);
    return () => window.removeEventListener(SU_KIEN_THONG_BAO, taiDs);
  }, [taiDs, taiTat]);

  const doiDay = async (bat: boolean) => {
    setDang(true);
    try {
      if (bat) {
        const kq = await batDay();
        setTt(kq);
        if (kq === 'da_bat') toast.success(t('ui2.tb.daBat'));
      } else {
        await tatDay();
        setTt('chua_bat');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('ui2.tb.chuaBat'));
    } finally {
      setDang(false);
    }
  };

  const doiLoai = async (loai: LoaiThongBao, bat: boolean) => {
    if (daDocTat !== true) return;
    const moi = bat ? tat.filter((x) => x !== loai) : [...tat, loai];
    setTat(moi);
    try { await luuLoaiTat(moi); } catch { setTat(tat); toast.error(t('ui2.tb.chuaLuu')); }
  };

  const thu = async () => {
    try {
      const r = await guiThu();
      toast.success(r.da_gui ? t('ui2.tb.daGuiThu') : t('ui2.tb.chuaCoThietBi'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('ui2.tb.chuaGui'));
    }
  };

  return (
    <section aria-labelledby="thong-bao" className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <h2 id="thong-bao" className="flex items-center gap-2 text-lg font-semibold text-foreground"><BellRing size={18} className="text-primary" /> {t('ui2.tb.tieuDe')}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t('ui2.tb.moTa')}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><Smartphone size={14} className="mt-0.5 shrink-0" /> {tt ? t(`ui2.tb.tt.${tt}`) : t('ui2.tb.dangKiem')}</p>
        </div>
        <div className="flex items-center gap-2">
          {dang && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          <Switch
            checked={tt === 'da_bat'}
            disabled={dang || tt === null || tt === 'khong_ho_tro' || tt === 'can_cai_app'}
            onCheckedChange={(v) => void doiDay(v)}
            aria-label={t('ui2.tb.nhanTrenThietBi')}
          />
        </div>
      </div>

      {daDocTat === false && (
        <div className="border-t border-border px-5 pt-4">
          <LoiTaiLai cau={t('ui2.tb.loiTaiLuaChon')} thuLai={taiTat} />
        </div>
      )}
      <div className="grid gap-2 border-t border-border px-5 py-4 sm:grid-cols-2">
        {LOAI_THONG_BAO.filter((l) => l !== 'khac').map((l) => (
          <label key={l} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
            {tenLoai(l)}
            <Switch checked={!tat.includes(l)} disabled={daDocTat !== true} onCheckedChange={(v) => void doiLoai(l, v)} aria-label={t('ui2.tb.dayLoai', { loai: tenLoai(l) })} />
          </label>
        ))}
        {tt === 'da_bat' && (
          <button type="button" onClick={() => void thu()} className="text-left text-xs font-medium text-primary hover:underline sm:col-span-2">
            {t('ui2.tb.guiThu')}
          </button>
        )}
      </div>

      <div className="border-t border-border">
        <DanhSachThongBao ds={ds} onDoi={taiDs} loi={loiDs} />
      </div>
    </section>
  );
}
