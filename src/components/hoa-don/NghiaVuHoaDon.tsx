import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLichThue } from '@/lib/lichThue';
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

const NHAN: Record<TrangThaiHddt, { nhan: string; mau: string }> = {
  phai_lam: { nhan: 'Phải làm', mau: 'bg-primary/10 text-primary' },
  can_xac_minh: { nhan: 'Cần xác minh', mau: 'bg-mimi-amber/15 text-mimi-amber' },
  khong_ap_dung: { nhan: 'Không áp dụng', mau: 'bg-accent text-muted-foreground' },
};

const laLoai = (x: unknown): x is HoSoHddt['loai'] => x === 'ho_kinh_doanh' || x === 'doanh_nghiep';

export function NghiaVuHoaDon() {
  const { du, loi } = useLichThue();
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
      <h3 id="nghia-vu-hddt" className="font-display text-lg font-bold text-foreground">Bạn có phải dùng hoá đơn điện tử không?</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Theo loại hình, doanh thu MIMI tính được và cách bạn bán hàng. MIMI không xuất hoá đơn điện tử — đây là việc bạn làm với nhà cung cấp hoá đơn.
      </p>
      {loi && <p className="mt-2 text-xs text-mimi-amber">Chưa đọc được doanh thu, loại hình — các mục dưới đây đang ở mức "cần xác minh".</p>}

      <fieldset className="mt-3">
        <legend className="text-sm font-medium text-foreground">Bạn có bán thẳng cho người tiêu dùng (bán lẻ, ăn uống, khách sạn…)?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {([[true, 'Có'], [false, 'Không'], [null, 'Chưa chọn']] as const).map(([v, nhan]) => (
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
        <p className="mt-1 text-xs text-muted-foreground">Chỉ để xem kết quả trên màn hình này — MIMI chưa lưu câu trả lời này.</p>
      </fieldset>

      <ul className="mt-4 divide-y divide-border/50">
        {ds.map((m) => (
          <li key={m.khoa} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${NHAN[m.trang_thai].mau}`}>{NHAN[m.trang_thai].nhan}</span>
              <p className="text-sm font-medium text-foreground">{m.ten}</p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground"><span className="font-medium">Vì sao:</span> {m.vi_sao}</p>
            {m.cau_hoi && <p className="mt-1 text-xs font-medium text-mimi-amber">{m.cau_hoi}</p>}
            {m.can_cu.length > 0 && (
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Căn cứ</summary>
                <ul className="mt-1 space-y-1">
                  {m.can_cu.map((c) => (
                    <li key={c.nhan}>
                      <span className="font-medium">{c.nhan}</span>
                      {c.chua_doi_chieu && <span className="italic"> (chưa đối chiếu văn bản gốc)</span>}
                      {c.trich && <span>: “{c.trich}”</span>}
                      {c.nguon && <> — <a href={c.nguon} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">nguồn</a></>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        ))}
      </ul>
      {hs.loai === null && <Link to="/dashboard/settings" className="text-xs font-medium text-primary hover:underline">Chọn loại hình ở Cài đặt</Link>}

      <details className="mt-3 rounded-xl bg-accent/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium text-foreground">Các bước đăng ký và cách chọn nhà cung cấp</summary>
        <p className="mt-2 text-xs italic text-muted-foreground">Hướng dẫn thực hành tổng hợp từ nguồn thứ cấp — chưa đối chiếu văn bản gốc Thông tư 91/2026/TT-BTC.</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-foreground">
          {CAC_BUOC_DANG_KY.map((b) => <li key={b}>{b}</li>)}
        </ol>
        <p className="mt-3 text-xs font-medium text-foreground">Chọn nhà cung cấp (gợi ý của MIMI, không phải quy định):</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-foreground">
          {TIEU_CHI_NHA_CUNG_CAP.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <a href="https://hoadondientu.gdt.gov.vn/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
          Mở cổng hoá đơn điện tử của cơ quan thuế
        </a>
      </details>
    </section>
  );
}
