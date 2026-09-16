import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ExternalLink, FileCheck2, Loader2, ScrollText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { DUONG_DAN_NOP_TO_KHAI } from '@/lib/goiToKhai';
import logoDichVuCong from '@/assets/logos/dich-vu-cong-tai-chinh.png';
import { cacKyKeTiep, khoangNgayKyKeKhai, kyKeKhaiKeTiep, mucKhan, type MucKhan } from '@/lib/hanKeKhai';
import { dinhDang } from '@/lib/troLy';

/**
 * Nhắc thuế — như "Scheduled" của ChatGPT, nhưng là các mốc nghĩa vụ thuế (15/09/2026).
 *
 * Hai loại mốc, cả hai tính từ thứ đã có trong MIMI:
 *  - Hạn nộp tờ khai theo quý (`hanKeKhai.ts`, có test từng mốc chuyển quý).
 *  - Ngưỡng doanh thu năm 1 tỷ và 3 tỷ (edge function `tax-summary`, đọc hoá đơn điện tử hoặc
 *    tiền về ngân hàng, đã bỏ dữ liệu thử và chuyển khoản nội bộ).
 *
 * MIMI nhắc trong ứng dụng; chưa gửi nhắc qua email hay Zalo — nói rõ trên màn hình.
 */

interface MocDoanhThu {
  key: 'tax_exemption' | 'profit_method_required';
  threshold: number;
  remaining: number;
  ratio: number;
  crossed: boolean;
}

interface TomTatThue {
  year: number;
  basis: 'gdt' | 'bank';
  revenue: number;
  milestones: MocDoanhThu[];
  hasBankConnection: boolean;
  disclaimer: string;
}

const MO_TA_MOC: Record<MocDoanhThu['key'], { ten: string; y: string; nguon: string }> = {
  tax_exemption: {
    ten: 'Mốc 1 tỷ đồng/năm',
    y: 'Doanh thu đến 1 tỷ không phải nộp thuế GTGT và thuế TNCN. Vượt mốc thì phải nộp, và dùng hoá đơn điện tử có mã của cơ quan thuế.',
    nguon: 'Nghị định 68/2026/NĐ-CP, sửa đổi bởi Nghị định 141/2026/NĐ-CP',
  },
  profit_method_required: {
    ten: 'Mốc 3 tỷ đồng/năm',
    y: 'Vượt mốc chỉ còn cách tính thuế trên thu nhập (doanh thu trừ chi phí), thuế suất 17% — khoản chi thiếu chứng từ bắt đầu tốn tiền.',
    nguon: 'Luật Thuế thu nhập cá nhân số 109/2025/QH15',
  },
};

const MAU_KHAN: Record<MucKhan, string> = {
  gap: 'bg-mimi-amber/15 text-mimi-amber',
  sap_toi: 'bg-primary/10 text-primary',
  con_xa: 'bg-accent text-muted-foreground',
};

const ngay = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const conLaiChu = (n: number) => (n <= 0 ? 'Hôm nay là hạn' : `Còn ${n} ngày`);

export default function NhacThuePage() {
  const ky = useMemo(() => kyKeKhaiKeTiep(), []);
  const lich = useMemo(() => cacKyKeTiep(new Date(), 4), []);
  const khoang = khoangNgayKyKeKhai(ky);
  const [thue, setThue] = useState<TomTatThue | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    supabase.functions.invoke('tax-summary').then(({ data, error }) => {
      if (huy) return;
      if (error || !data || data.error) setLoi('Chưa đọc được doanh thu năm. Thử lại sau ít phút.');
      else setThue(data as TomTatThue);
    }).catch(() => { if (!huy) setLoi('Chưa đọc được doanh thu năm. Thử lại sau ít phút.'); });
    return () => { huy = true; };
  }, []);

  const khan = mucKhan(ky.conLai);

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Nhắc thuế</h1>
        <p className="mt-1 text-sm text-muted-foreground">Các mốc nghĩa vụ thuế sắp tới, tính theo lịch kê khai và doanh thu thật của công ty.</p>
      </header>

      <section aria-labelledby="sap-toi-han" className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <CalendarClock size={22} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <div>
              <h2 id="sap-toi-han" className="text-lg font-semibold text-foreground">Nộp tờ khai quý {ky.quy}/{ky.nam}</h2>
              <p className="text-sm text-muted-foreground">Hạn {ngay(ky.han)} · kỳ {dinhDang(khoang.tu, 'ngay')}–{dinhDang(khoang.den, 'ngay')}</p>
            </div>
          </div>
          <span className={`self-start rounded-full px-3 py-1 text-sm font-medium ${MAU_KHAN[khan]}`}>{conLaiChu(ky.conLai)}</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Hộ kinh doanh có doanh thu năm trên 01 tỷ đồng khai theo quý; hạn là ngày cuối của tháng liền sau quý. Doanh thu năm từ 01 tỷ
          đồng trở xuống thì không khai quý, chỉ thông báo doanh thu năm, hạn 31/01 năm sau.{' '}
          <span className="italic">Nguồn: Nghị định 68/2026/NĐ-CP Điều 8, sửa bởi Nghị định 141/2026/NĐ-CP.</span>{' '}
          Nếu hạn rơi vào ngày nghỉ, luật cho lùi — ngày trên đây là mốc sớm nhất.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link to="/dashboard/to-khai" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110">
            <ScrollText size={16} /> Soạn tờ khai quý {ky.quy}
          </Link>
          <a
            href={DUONG_DAN_NOP_TO_KHAI}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent"
          >
            <img src={logoDichVuCong} alt="" className="h-4 w-4 object-contain" /> Nộp trên Cổng dịch vụ công <ExternalLink size={14} />
          </a>
          <Link to="/dashboard/chung-tu" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent">
            <FileCheck2 size={16} /> Kiểm chứng từ quý {ky.quy}
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">MIMI soạn bản nháp và mở cổng nộp; bạn ký và nộp — MIMI không nộp thay.</p>
      </section>

      <section aria-labelledby="lich-ke-khai" className="rounded-2xl border border-border bg-card">
        <h2 id="lich-ke-khai" className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">Lịch kê khai</h2>
        <ol className="divide-y divide-border">
          {lich.map((k) => (
            <li key={`${k.quy}-${k.nam}`} className="flex items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">Tờ khai quý {k.quy}/{k.nam}</p>
                <p className="text-xs text-muted-foreground">Hạn {ngay(k.han)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${MAU_KHAN[mucKhan(k.conLai)]}`}>{conLaiChu(k.conLai)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="nguong-doanh-thu" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="nguong-doanh-thu" className="text-lg font-semibold text-foreground">Ngưỡng doanh thu năm {thue?.year ?? new Date().getFullYear()}</h2>
        {!thue && !loi && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang đọc doanh thu…</p>}
        {loi && <p className="mt-2 text-sm text-destructive">{loi}</p>}
        {thue && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              Doanh thu đến hôm nay: <span className="font-semibold tabular-nums text-foreground">{dinhDang(thue.revenue, 'vnd')}</span>{' '}
              ({thue.basis === 'gdt' ? 'theo hoá đơn điện tử đã phát hành' : 'ước tính theo tiền về ngân hàng'})
            </p>
            {thue.basis === 'bank' && !thue.hasBankConnection && (
              <p className="mt-1 text-sm text-mimi-amber">Chưa liên kết ngân hàng hay Tổng cục Thuế — con số này chưa đủ để dựa vào.</p>
            )}
            <ul className="mt-4 space-y-4">
              {thue.milestones.map((m) => {
                const mt = MO_TA_MOC[m.key];
                return (
                  <li key={m.key}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{mt.ten}</p>
                      <p className={`text-sm tabular-nums ${m.crossed ? 'font-medium text-mimi-amber' : 'text-muted-foreground'}`}>
                        {m.crossed ? `Đã vượt ${dinhDang(-m.remaining, 'vnd')}` : `Còn ${dinhDang(m.remaining, 'vnd')}`}
                      </p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent" role="progressbar" aria-label={mt.ten} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(1, m.ratio) * 100)}>
                      <div className={`h-full rounded-full ${m.crossed ? 'bg-mimi-amber' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, m.ratio * 100))}%` }} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{mt.y} <span className="italic">Nguồn: {mt.nguon}.</span></p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{thue.disclaimer}</p>
          </>
        )}
      </section>

      <p className="text-xs text-muted-foreground">MIMI nhắc trong ứng dụng. Chưa gửi nhắc qua email hay Zalo.</p>
    </div>
  );
}
