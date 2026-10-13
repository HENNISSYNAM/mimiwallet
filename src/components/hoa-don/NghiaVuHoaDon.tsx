import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLichThue } from '@/lib/lichThue';
import { useTranslation } from 'react-i18next';
import {
  CAC_BUOC_DANG_KY, nghiaVuHoaDon, TIEU_CHI_NHA_CUNG_CAP, type HoSoHddt, type TrangThaiHddt,
} from '../../../supabase/functions/_shared/hoa-don/nghia-vu-hddt.ts';

/**
 * "Bạn có phải dùng hoá đơn điện tử không?" — khối trên trang Hoá đơn (12/10/2026).
 *
 * Số liệu từ CÙNG `tax-summary` mà Nhắc thuế đọc (`useLichThue`): loại người nộp, doanh thu năm, doanh thu đã
 * chắc qua 01 tỷ chưa. Câu "có bán thẳng cho người tiêu dùng không" chưa có chỗ lưu ở máy chủ, nên lựa chọn ở
 * đây CHỈ đổi kết quả trên màn hình này và nói rõ như vậy — không giả vờ đã lưu.
 */

const NHAN: Record<TrangThaiHddt, { mau: string }> = {
  phai_lam: { mau: 'bg-primary/10 text-primary' },
  can_xac_minh: { mau: 'bg-mimi-amber/15 text-mimi-amber' },
  khong_ap_dung: { mau: 'bg-accent text-muted-foreground' },
};

const laLoai = (x: unknown): x is HoSoHddt['loai'] => x === 'ho_kinh_doanh' || x === 'doanh_nghiep';

export function NghiaVuHoaDon() {
  const { du, loi } = useLichThue();
  const { t } = useTranslation();
  const [banTrucTiep, setBanTrucTiep] = useState<boolean | null>(null);

  const tt = du?.tomTat ?? {};
  const hs: HoSoHddt = {
    loai: laLoai(du?.loaiNguoiNop) ? du.loaiNguoiNop as HoSoHddt['loai'] : null,
    doanhThuNam: typeof tt.revenue === 'number' ? tt.revenue : null,
    vuotNguongChac: typeof tt.crossedCertain === 'boolean' ? tt.crossedCertain : null,
    banTrucTiep,
  };
  const ds = nghiaVuHoaDon(hs);

  return (
    <section aria-labelledby="nghia-vu-hddt" className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <h3 id="nghia-vu-hddt" className="font-display text-lg font-bold text-foreground">{t('ui1.nvhd.tieuDe')}</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {t('ui1.nvhd.moTa')}
      </p>
      {loi && <p className="mt-2 text-xs text-mimi-amber">{t('ui1.nvhd.loi')}</p>}

      <fieldset className="mt-3">
        <legend className="text-sm font-medium text-foreground">{t('ui1.nvhd.banThang')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([[true, t('ui1.nvhd.co')], [false, t('ui1.nvhd.khong')], [null, t('ui1.nvhd.chuaChon')]] as const).map(([v, nhan]) => (
            <button
              key={nhan}
              type="button"
              aria-pressed={banTrucTiep === v}
              onClick={() => setBanTrucTiep(v)}
              className={`h-10 rounded-lg border px-3 text-sm ${banTrucTiep === v ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {nhan}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('ui1.nvhd.chiXem')}</p>
      </fieldset>

      <ul className="mt-4 divide-y divide-border/50">
        {ds.map((m) => (
          <li key={m.khoa} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${NHAN[m.trang_thai].mau}`}>{t(`ui1.nvhd.tt_${m.trang_thai}`)}</span>
              <p className="text-sm font-medium text-foreground">{m.ten}</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground"><span className="font-medium">{t('ui1.nvhd.viSao')}</span> {m.vi_sao}</p>
            {m.cau_hoi && <p className="mt-1 text-xs font-medium text-mimi-amber">{m.cau_hoi}</p>}
            {m.can_cu.length > 0 && (
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer">{t('ui1.nvhd.canCu')}</summary>
                <ul className="mt-1 space-y-1">
                  {m.can_cu.map((c) => (
                    <li key={c.nhan}>
                      <span className="font-medium">{c.nhan}</span>
                      {c.chua_doi_chieu && <span className="italic"> ({t('ui1.nvhd.chuaDoiChieu')})</span>}
                      {c.trich && <span>: “{c.trich}”</span>}
                      {c.nguon && <> — <a href={c.nguon} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{t('ui1.nvhd.nguon')}</a></>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
      {hs.loai === null && <Link to="/dashboard/settings" className="text-xs font-medium text-primary hover:underline">{t('ui1.nvhd.chonLoaiHinh')}</Link>}

      <details className="mt-3 rounded-xl bg-accent/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">{t('ui1.nvhd.cacBuoc')}</summary>
        <p className="mt-2 text-xs italic text-muted-foreground">{t('ui1.nvhd.thuCap')}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-foreground">
          {CAC_BUOC_DANG_KY.map((b) => <li key={b}>{b}</li>)}
        </ol>
        <p className="mt-3 text-xs font-medium text-foreground">{t('ui1.nvhd.chonNcc')}</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-foreground">
          {TIEU_CHI_NHA_CUNG_CAP.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <a href="https://hoadondientu.gdt.gov.vn/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
          {t('ui1.nvhd.moCong')}
        </a>
      </details>
    </section>
  );
}
