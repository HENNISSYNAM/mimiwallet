import { COMPANY, CONTACT, hasContact, LEGAL_UPDATED_ON } from '@/config/company';
import Footer from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Chính sách bảo mật.
 *
 * NGUYÊN TẮC VIẾT TRANG NÀY: mỗi câu phải mô tả một hành vi có thật trong mã
 * nguồn. Đây không phải văn bản mẫu tải về rồi thay tên.
 *
 * Cụ thể, những gì viết dưới đây đối chiếu được với:
 *   - `supabase/functions/bank-link/*`  — luồng cấp quyền đọc sao kê qua BankHub
 *   - `supabase/functions/_shared/crypto/*` — mã hoá token ngân hàng khi lưu
 *   - `supabase/functions/tax-lookup/*` — tra mã số thuế qua XInvoice
 *   - `supabase/functions/kyc-verify/*` — trạng thái xác minh, hiện chờ người duyệt
 *   - các migration đặt RLS theo `company_id`
 *
 * Ngược lại, KHÔNG viết vào đây: chứng nhận chưa được cấp, đối tác chưa ký, cam
 * kết thời gian phản hồi chưa có ai trực. Một chính sách bảo mật hứa nhiều hơn
 * hệ thống làm được là một tuyên bố sai, và nó bị đọc kỹ nhất đúng lúc có sự cố.
 */

function Muc({ so, tieuDe, children }: { so: number; tieuDe: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold tracking-tight">
        {so}. {tieuDe}
      </h2>
      <div className="mt-3 space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-12 safe-top safe-x">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Chính sách bảo mật</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Áp dụng cho {COMPANY.product.name}, do {COMPANY.legalName} vận hành.
          Cập nhật ngày {LEGAL_UPDATED_ON}.
        </p>

        <Muc so={1} tieuDe="Ai xử lý dữ liệu của bạn">
          <p>
            Bên kiểm soát dữ liệu là {COMPANY.legalName} ({COMPANY.internationalName}),
            mã số doanh nghiệp {COMPANY.taxCode}, trụ sở tại {COMPANY.address}.
            Người đại diện theo pháp luật: {COMPANY.legalRepresentative.name},{' '}
            {COMPANY.legalRepresentative.title}.
          </p>
        </Muc>

        <Muc so={2} tieuDe="Dữ liệu chúng tôi thu thập">
          <p><strong className="text-foreground">Thông tin tài khoản.</strong>{' '}
            Email và mật khẩu đã băm, hoặc danh tính từ đăng nhập Google. Tên doanh
            nghiệp và mã số thuế bạn nhập khi đăng ký.
          </p>
          <p><strong className="text-foreground">Dữ liệu ngân hàng.</strong>{' '}
            Khi và chỉ khi bạn tự liên kết tài khoản, chúng tôi nhận lịch sử giao dịch
            (ngày, số tiền, nội dung, số dư) qua nhà cung cấp dịch vụ tổng hợp dữ liệu
            ngân hàng. Bạn cấp quyền trực tiếp trên giao diện của ngân hàng hoặc của
            nhà cung cấp — {COMPANY.product.name} không bao giờ nhìn thấy mật khẩu
            ngân hàng của bạn.
          </p>
          <p><strong className="text-foreground">Dữ liệu hoá đơn và đối tác.</strong>{' '}
            Hoá đơn bạn tạo, và danh bạ khách hàng bạn nhập vào — bao gồm tên, mã số
            thuế, địa chỉ, điện thoại, email của các doanh nghiệp đối tác. Bạn là bên
            chịu trách nhiệm về cơ sở pháp lý khi đưa dữ liệu của bên thứ ba vào hệ thống.
          </p>
          <p><strong className="text-foreground">Dữ liệu xác minh danh tính.</strong>{' '}
            Nếu bạn thực hiện xác minh, ảnh giấy tờ và ảnh chân dung bạn cung cấp.
          </p>
          <p><strong className="text-foreground">Chúng tôi KHÔNG thu thập</strong> vị trí
            GPS, danh bạ điện thoại, ảnh trong máy ngoài ảnh bạn chủ động tải lên, hay
            dữ liệu duyệt web của bạn ở nơi khác. Chúng tôi không bán dữ liệu cho bất kỳ ai.
          </p>
        </Muc>

        <Muc so={3} tieuDe="Dùng dữ liệu để làm gì">
          <p>
            Phân loại dòng tiền vào–ra; dựng bộ chứng từ chi phí phục vụ kê khai thuế;
            đối soát tiền khách trả với hoá đơn bán hàng; tra trạng thái người nộp thuế
            của đối tác; và vận hành tài khoản của bạn.
          </p>
          <p>
            Phân tích chạy trên dữ liệu của riêng doanh nghiệp bạn. Chúng tôi không gộp
            dữ liệu của bạn với dữ liệu khách hàng khác để bán ra ngoài.
          </p>
        </Muc>

        <Muc so={4} tieuDe="Chia sẻ với bên thứ ba">
          <p>Dữ liệu chỉ rời hệ thống trong bốn trường hợp, và mỗi trường hợp giới hạn ở phần tối thiểu:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-foreground">Nhà cung cấp dữ liệu ngân hàng</strong> —
              để lấy sao kê theo uỷ quyền của bạn.
            </li>
            <li>
              <strong className="text-foreground">Dịch vụ tra cứu mã số thuế</strong> — chỉ
              gửi đi mã số thuế cần tra, không gửi kèm dữ liệu tài chính.
            </li>
            <li>
              <strong className="text-foreground">Hạ tầng lưu trữ và vận hành</strong> —
              nền tảng cơ sở dữ liệu và máy chủ chạy ứng dụng.
            </li>
            <li>
              <strong className="text-foreground">Cơ quan nhà nước có thẩm quyền</strong> —
              khi có yêu cầu hợp pháp bằng văn bản.
            </li>
          </ul>
        </Muc>

        <Muc so={5} tieuDe="Bảo vệ dữ liệu">
          <p>
            Mã truy cập ngân hàng được mã hoá trước khi ghi xuống cơ sở dữ liệu, bằng
            AES-256-GCM với khoá được bọc bởi ML-KEM-768 — một thuật toán trao đổi khoá
            kháng máy tính lượng tử theo chuẩn NIST FIPS 203. Lý do dùng nó không phải để
            nghe cho kêu: dữ liệu tài chính có vòng đời rất dài, và mô hình đe doạ ở đây
            là bên tấn công thu thập bản mã hôm nay để giải mã sau này.
          </p>
          <p>
            Mọi bảng dữ liệu đều bật Row Level Security, khoá theo tài khoản sở hữu, nên
            một người dùng không có đường truy vấn nào chạm tới dữ liệu của doanh nghiệp khác.
          </p>
          <p>
            Chúng tôi không tuyên bố bất kỳ chứng nhận an toàn thông tin nào, vì hiện chưa
            có tổ chức nào cấp cho chúng tôi. Nếu điều đó thay đổi, mục này sẽ ghi rõ tổ
            chức cấp và số hiệu.
          </p>
        </Muc>

        <Muc so={6} tieuDe="Quyền của bạn">
          <p>
            Bạn có quyền xem, sửa, trích xuất và xoá dữ liệu của mình. Bạn có thể ngắt liên
            kết ngân hàng bất cứ lúc nào trong mục Fintech Hub; khi ngắt, chúng tôi thu hồi
            uỷ quyền với nhà cung cấp và ngừng nhận giao dịch mới.
          </p>
          <p>
            <strong className="text-foreground">Xoá tài khoản:</strong> bạn có thể tự yêu cầu
            xoá toàn bộ tài khoản và dữ liệu trong Cài đặt, không cần liên hệ ai. Sau khi xác
            nhận, dữ liệu sẽ bị xoá và thao tác này không hoàn tác được.
          </p>
        </Muc>

        <Muc so={7} tieuDe="Lưu trữ trong bao lâu">
          <p>
            Dữ liệu được giữ chừng nào tài khoản còn hoạt động. Khi bạn xoá tài khoản, dữ
            liệu bị xoá theo. Riêng những chứng từ mà pháp luật kế toán và thuế buộc lưu
            trong thời hạn nhất định, bạn nên tự trích xuất và lưu bản của mình trước khi xoá.
          </p>
        </Muc>

        <Muc so={8} tieuDe="Trẻ em">
          <p>{COMPANY.product.name} là công cụ dành cho doanh nghiệp và hộ kinh doanh,
            không dành cho người dưới 18 tuổi và không chủ động thu thập dữ liệu của trẻ em.</p>
        </Muc>

        <Muc so={9} tieuDe="Thay đổi chính sách">
          <p>
            Khi có thay đổi ảnh hưởng tới cách xử lý dữ liệu, chúng tôi cập nhật ngày ở đầu
            trang và thông báo trong ứng dụng trước khi thay đổi có hiệu lực.
          </p>
        </Muc>

        <Muc so={10} tieuDe="Liên hệ">
          {hasContact() ? (
            <p>
              Mọi câu hỏi hoặc yêu cầu liên quan tới dữ liệu cá nhân, xin gửi tới{' '}
              {CONTACT.email && <a className="text-primary hover:underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>}
              {CONTACT.email && CONTACT.website && ' hoặc '}
              {CONTACT.website && <a className="text-primary hover:underline" href={CONTACT.website} target="_blank" rel="noopener noreferrer">{CONTACT.website}</a>}.
            </p>
          ) : (
            <p>
              Mọi câu hỏi hoặc yêu cầu liên quan tới dữ liệu cá nhân, xin gửi tới trụ sở
              {' '}{COMPANY.legalName}, {COMPANY.address}.
            </p>
          )}
        </Muc>
      </main>
      <Footer />
    </div>
  );
}
