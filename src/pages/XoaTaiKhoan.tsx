import { Link } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { COMPANY, CONTACT, coKenhLienHeVanBan } from '@/config/company';

/**
 * Trang công khai mô tả cách xoá tài khoản và dữ liệu.
 *
 * VÌ SAO PHẢI LÀ MỘT TRANG RIÊNG, CÔNG KHAI. Google Play yêu cầu ứng dụng cho
 * phép tạo tài khoản phải có hai đường xoá: một ở trong ứng dụng, và một **đường
 * dẫn web mở được mà không cần cài ứng dụng hay đăng nhập** — để người đã gỡ app
 * vẫn yêu cầu xoá được. MIMI đã có đường thứ nhất (Cài đặt → Xoá tài khoản, có
 * từ khi làm theo App Store Guideline 5.1.1(v)) nhưng chưa có đường thứ hai.
 *
 * Trang này cố ý KHÔNG có nút xoá.
 *
 * Xoá tài khoản là thao tác không hoàn tác được, và một nút xoá đặt trên trang
 * công khai thì bất kỳ ai cũng bấm được — kể cả người đang mở máy của người
 * khác. Việc xoá phải diễn ra sau khi đã chứng minh mình là chủ tài khoản, tức
 * sau khi đăng nhập. Trang này làm đúng việc Play đòi: nói rõ, công khai, ai
 * cũng đọc được, rằng quyền đó tồn tại và đi tới nó bằng cách nào.
 */
export default function XoaTaiKhoan() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 size={18} />
          </span>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Xoá tài khoản và dữ liệu
          </h1>
        </div>

        <div className="space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            Bạn có quyền xoá tài khoản MIMI Wallet và toàn bộ dữ liệu bất cứ lúc nào,
            không cần liên hệ ai và không cần nêu lý do.
          </p>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Cách tự xoá</h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Đăng nhập vào MIMI Wallet.</li>
              <li>Mở <strong className="text-foreground">Cài đặt</strong>.</li>
              <li>Cuộn tới mục <strong className="text-foreground">Xoá tài khoản</strong>.</li>
              <li>Gõ đúng câu xác nhận rồi bấm xoá.</li>
            </ol>
            <Link
              to="/dashboard/settings"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Tới trang Cài đặt <ArrowRight size={13} />
            </Link>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Những gì bị xoá</h2>
            <p>
              Giao dịch đã đồng bộ, hoá đơn, chứng từ đã tải lên, danh bạ khách hàng,
              liên kết ngân hàng và hồ sơ doanh nghiệp. Liên kết ngân hàng được thu hồi
              uỷ quyền với nhà cung cấp, nên MIMI ngừng nhận giao dịch mới.
            </p>
            <p className="mt-2">
              <strong className="text-foreground">Thao tác này không hoàn tác được.</strong>{' '}
              Nếu bạn cần giữ chứng từ cho kỳ quyết toán, hãy xuất dữ liệu ra file trước
              khi xoá.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">
              Nếu bạn đã gỡ ứng dụng hoặc không đăng nhập được
            </h2>
            <p>
              Gửi yêu cầu xoá tới{' '}
              {coKenhLienHeVanBan() ? (
                <>
                  {CONTACT.email && (
                    <a className="text-primary hover:underline" href={`mailto:${CONTACT.email}`}>
                      {CONTACT.email}
                    </a>
                  )}
                  {CONTACT.email && CONTACT.website && ' hoặc '}
                  {CONTACT.website && (
                    <a className="text-primary hover:underline" href={CONTACT.website} target="_blank" rel="noopener noreferrer">
                      {CONTACT.website}
                    </a>
                  )}
                </>
              ) : (
                <>
                  trụ sở {COMPANY.legalName}, {COMPANY.address}
                </>
              )}
              , từ chính địa chỉ email bạn dùng để đăng ký. Chúng tôi cần đối chiếu email
              để chắc chắn yêu cầu đến từ chủ tài khoản.
            </p>
          </section>

          <p className="border-t border-border/60 pt-4 text-xs">
            Chi tiết về dữ liệu MIMI thu thập và giữ trong bao lâu nằm ở{' '}
            <Link to="/privacy" className="text-primary hover:underline">
              Chính sách bảo mật
            </Link>
            .
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
