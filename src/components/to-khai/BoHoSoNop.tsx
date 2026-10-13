import { ExternalLink, FileSpreadsheet, Printer } from 'lucide-react';
import { huongDanCoQuan, KIEM_LUC, type LoaiNguoiNop } from '../../../supabase/functions/_shared/co-quan/danh-ba.ts';
import { inTaiLieu, LOP_VUNG_IN, ngayTep, tenTepAnToan } from '@/lib/inTaiLieu';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

/**
 * BỘ HỒ SƠ NỘP (12/10/2026) — sản phẩm cuối người dùng cần sau khi xuất tờ khai: tờ khai (đã có nút in riêng),
 * BẢNG SỐ LIỆU để đối chiếu từng chỉ tiêu trên cổng, và HƯỚNG DẪN NỘP đúng cổng của đúng cơ quan: chuẩn bị gì,
 * nộp thế nào, sau khi nộp phải lưu gì. MIMI không ký, không nộp thay — hướng dẫn nói rõ điều đó.
 */
export interface ChiTieuNop { ma: string; nhan: string; gia_tri: number | string | null; don_vi?: string }

export interface BoHoSoNopProps {
  mau: string;
  kyChu: string;
  hanNop: string; // YYYY-MM-DD
  loai: LoaiNguoiNop;
  congTy: { ten: string | null; mst: string | null };
  chiTieu: ChiTieuNop[];
  canCu: string[];
}

const ngayVN = (ymd: string) => ymd.slice(0, 10).split('-').reverse().join('/');

/** Hàng của bảng số liệu — hàm thuần để test, và để tệp .xlsx / bản in dùng cùng một nguồn. */
export function hangSoLieu(p: BoHoSoNopProps): (string | number)[][] {
  return [
    ['Mẫu', p.mau],
    ['Kỳ', p.kyChu],
    ['Người nộp thuế', p.congTy.ten ?? ''],
    ['Mã số thuế', p.congTy.mst ?? ''],
    ['Hạn nộp', ngayVN(p.hanNop)],
    [],
    ['Mã chỉ tiêu', 'Chỉ tiêu', 'Giá trị', 'Đơn vị'],
    ...p.chiTieu.map((c) => [c.ma, c.nhan, c.gia_tri ?? '', c.don_vi ?? '']),
    [],
    ['Căn cứ'],
    ...p.canCu.map((c) => [c]),
  ];
}

async function taiXlsx(p: BoHoSoNopProps) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(hangSoLieu(p));
  ws['!cols'] = [{ wch: 12 }, { wch: 70 }, { wch: 18 }, { wch: 8 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'So lieu');
  XLSX.writeFile(wb, `${tenTepAnToan(`so-lieu-${p.mau}-${p.kyChu}`)}-${ngayTep()}.xlsx`);
}

export function BoHoSoNop(p: BoHoSoNopProps) {
  const { t } = useTranslation();
  const hd = huongDanCoQuan('nop_to_khai', p.loai);
  const tien = huongDanCoQuan('nop_tien_thue', p.loai);
  return (
    <section aria-labelledby="bo-ho-so-tieu-de" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 no-print">
        <h3 id="bo-ho-so-tieu-de" className="text-sm font-semibold text-foreground">{t('ui1.boHoSo.tieuDe', { mau: p.mau, ky: p.kyChu })}</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void taiXlsx(p)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent">
            <FileSpreadsheet size={14} aria-hidden /> {t('ui1.boHoSo.taiXlsx')}
          </button>
          <button type="button" onClick={() => inTaiLieu(`huong-dan-nop-${p.mau}-${p.kyChu}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium hover:bg-accent">
            <Printer size={14} aria-hidden /> {t('ui1.boHoSo.inHuongDan')}
          </button>
        </div>
      </div>

      <div className={`${LOP_VUNG_IN} mt-3 space-y-3 text-sm text-foreground`}>
        <p className="font-semibold print:text-base">{t('ui1.boHoSo.huongDan', { mau: p.mau, ky: p.kyChu })}{p.congTy.ten ? ` — ${p.congTy.ten}` : ''}{p.congTy.mst ? ` (${t('ui1.boHoSo.mst')} ${p.congTy.mst})` : ''}</p>
        <p>{t('ui1.boHoSo.hanNop')} <strong>{ngayVN(p.hanNop)}</strong>. {t('ui1.boHoSo.hanNghi')}</p>

        <div>
          <p className="font-medium">{t('ui1.boHoSo.nopODau')}</p>
          <ul className="mt-1 space-y-1">
            {hd.cong.map((c) => (
              <li key={c.id}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{c.ten} <ExternalLink size={12} aria-hidden /></a>
                <span className="text-muted-foreground"> — {c.url.replace(/^https:\/\//, '')}. {t('ui1.boHoSo.can')} {c.can.join('; ')}.</span>
              </li>
            ))}
          </ul>
        </div>
        <Muc tieuDe={t('ui1.boHoSo.truoc')} ds={hd.truoc} />
        <Muc tieuDe={t('ui1.boHoSo.nop')} ds={hd.buoc} />
        <Muc tieuDe={t('ui1.boHoSo.sau')} ds={hd.sau} />
        <Muc tieuDe={t('ui1.boHoSo.nopTien')} ds={[...tien.buoc, ...tien.sau]} />

        <div className="hidden print:block">
          <p className="font-medium">{t('ui1.boHoSo.bangDoiChieu')}</p>
          <table className="mt-1 w-full border-collapse text-xs">
            <tbody>
              {p.chiTieu.map((c) => (
                <tr key={c.ma} className="border-b border-border/60">
                  <td className="py-0.5 pr-2 align-top">{c.ma}</td>
                  <td className="py-0.5 pr-2">{c.nhan}</td>
                  <td className="py-0.5 text-right tabular-nums">{typeof c.gia_tri === 'number' ? new Intl.NumberFormat(({ vi: 'vi-VN', en: 'en-US', ko: 'ko-KR', zh: 'zh-CN' } as Record<string, string>)[(i18n.language ?? 'vi').slice(0, 2)] ?? 'vi-VN').format(c.gia_tri) : c.gia_tri ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{t('ui1.boHoSo.kiemLuc', { ngay: ngayVN(KIEM_LUC) })}</p>
      </div>
    </section>
  );
}

function Muc({ tieuDe, ds }: { tieuDe: string; ds: string[] }) {
  if (!ds.length) return null;
  return (
    <div>
      <p className="font-medium">{tieuDe}</p>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">{ds.map((d) => <li key={d}>{d}</li>)}</ol>
    </div>
  );
}
