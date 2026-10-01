import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import { COMPANY, LEGAL_UPDATED_ON } from '@/config/company';
import { DANH_MUC_CHINH_SACH, TRANG_THONG_TIN } from './danhMuc';

/**
 * Khung chung của các trang công bố (Chính sách bảo mật, Điều khoản, và bảy trang theo hồ sơ
 * thông báo TMĐT). Cùng kiểu với `Privacy.tsx` / `Terms.tsx` trước đây: nút về trang chủ, h1, dòng
 * "áp dụng cho… cập nhật ngày…", các mục đánh số, chân trang.
 *
 * Văn bản pháp lý giữ tiếng Việt, không đưa vào bộ i18n — cùng quy ước với Privacy/Terms.
 */

export function Muc({ so, tieuDe, children }: { so: number | string; tieuDe: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">
        {so}. {tieuDe}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

/** Chữ đậm màu chữ chính — dùng mở đầu một đoạn. */
export function Dam({ children }: { children: React.ReactNode }) {
  return <strong className="text-foreground">{children}</strong>;
}

/**
 * Điểm kinh doanh do chủ doanh nghiệp quyết (thời hạn hoàn tiền, thời gian phản hồi…). 01/10/2026: chủ doanh nghiệp
 * đã duyệt các mức mặc định, nên không còn nhãn "cần xác nhận" trên trang công bố. Giữ hàm để đánh dấu lại khi cần
 * rà soát (trả về nhãn thay vì null); danh sách các điểm này ở docs/bo-cong-thuong/HUONG_DAN_NOP.md.
 */
export function CanXacNhan() {
  return null;
}

export function LienKet({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-primary hover:underline">
      {children}
    </Link>
  );
}

export default function KhungChinhSach({
  tieuDe,
  duongHienTai,
  children,
}: {
  tieuDe: string;
  duongHienTai?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-12 safe-top safe-x">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">{tieuDe}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Áp dụng cho {COMPANY.product.name} (website và ứng dụng), do {COMPANY.legalName} vận hành.
          Cập nhật ngày {LEGAL_UPDATED_ON}.
        </p>

        {children}

        <nav aria-label="Các chính sách khác" className="mt-14 border-t border-border pt-6">
          <p className="text-sm font-semibold text-foreground">Các chính sách của {COMPANY.product.name}</p>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2 text-sm">
            {DANH_MUC_CHINH_SACH.map((m) => (
              <li key={m.duong}>
                {m.duong === duongHienTai ? (
                  <span className="text-foreground font-medium">{m.tieuDe}</span>
                ) : (
                  <Link to={m.duong} className="text-muted-foreground hover:text-primary">
                    {m.tieuDe}
                  </Link>
                )}
              </li>
            ))}
            <li>
              <Link to="/terms" className="text-muted-foreground hover:text-primary">Điều khoản sử dụng</Link>
            </li>
            <li>
              <Link to={TRANG_THONG_TIN.duong} className="text-muted-foreground hover:text-primary">{TRANG_THONG_TIN.tieuDe}</Link>
            </li>
          </ul>
        </nav>
      </main>
      <Footer />
    </div>
  );
}
