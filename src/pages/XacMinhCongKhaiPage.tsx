import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { xemBaoCaoCongKhai, type GoiCongKhai } from '@/lib/goiXacMinh';
import { BaoCaoXacMinhView, ngay, type NgonNgu } from '@/components/xac-minh/BaoCaoXacMinhView';
import { laBaoCao } from '../../supabase/functions/_shared/xac-minh/bao-cao.ts';

/**
 * Trang người nhận mở từ đường dẫn chủ hộ gửi (/xac-minh/:token). Không cần đăng nhập.
 * Chỉ hiện báo cáo tổng hợp, mã kiểm tra và dấu thời gian — không giao dịch, không người chuyển, không số tài khoản.
 */
const CHU = {
  vi: {
    tieuDe: 'Doanh thu đã xác minh', guiCho: 'Gửi cho', mucDich: 'Mục đích', hetHan: 'Đường dẫn dùng được tới',
    dangMo: 'Đang mở báo cáo…', khongMo: 'Không mở được báo cáo',
    luuY: 'Báo cáo do chủ hộ chia sẻ, không phải điểm tín dụng.', doi: 'English',
    gioiThieu: 'Báo cáo này do MIMI lập từ sao kê ngân hàng và những gì chủ hộ đã tự xác nhận. Bạn có thể tự kiểm tra mã kiểm tra và dấu thời gian mà không cần tin MIMI.',
  },
  en: {
    tieuDe: 'Verified revenue', guiCho: 'Shared with', mucDich: 'Purpose', hetHan: 'Link valid until',
    dangMo: 'Opening the report…', khongMo: 'The report could not be opened',
    luuY: 'Shared by the business owner. This is not a credit score.', doi: 'Tiếng Việt',
    gioiThieu: "MIMI prepared this report from bank statements and what the owner confirmed. You can check the check code and timestamp yourself without trusting MIMI.",
  },
} as const;

export default function XacMinhCongKhaiPage() {
  const { token = '' } = useParams();
  const [nn, setNn] = useState<NgonNgu>('vi');
  const [goi, setGoi] = useState<GoiCongKhai | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const c = CHU[nn];

  useEffect(() => {
    let huy = false;
    xemBaoCaoCongKhai(token)
      .then((g) => { if (!huy) { if (laBaoCao(g.bao_cao)) setGoi(g); else setLoi('Báo cáo không đọc được.'); } })
      .catch((e) => { if (!huy) setLoi(e instanceof Error ? e.message : 'Lỗi'); });
    return () => { huy = true; };
  }, [token]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">MIMI</p>
          <h1 className="text-xl font-semibold text-foreground">{c.tieuDe}</h1>
        </div>
        <button type="button" onClick={() => setNn(nn === 'vi' ? 'en' : 'vi')} className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-accent">
          {c.doi}
        </button>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{c.luuY}</p>
      <p className="mt-1 text-sm text-muted-foreground">{c.gioiThieu}</p>

      {!goi && !loi && <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> {c.dangMo}</p>}
      {loi && (
        <div className="mt-8 rounded-2xl border border-border p-4">
          <p className="font-medium text-foreground">{c.khongMo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{loi}</p>
        </div>
      )}
      {goi && (
        <>
          <dl className="mt-4 grid gap-1 rounded-2xl bg-accent px-4 py-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">{c.guiCho}</dt><dd className="text-foreground">{goi.chia_se.nguoi_nhan}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{c.mucDich}</dt><dd className="text-foreground">{goi.chia_se.muc_dich}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{c.hetHan}</dt><dd className="text-foreground">{ngay(goi.chia_se.het_han)}</dd></div>
          </dl>
          <div className="mt-5">
            <BaoCaoXacMinhView bc={goi.bao_cao} sha256={goi.sha256} nn={nn} neo={{ trang_thai: goi.neo.trang_thai, khoi_bitcoin: goi.neo.khoi_bitcoin, ots: goi.neo.ots }} />
          </div>
        </>
      )}
    </main>
  );
}
