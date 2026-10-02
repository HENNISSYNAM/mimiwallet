import { COMPANY, LEGAL_UPDATED_ON } from '@/config/company';
import Footer from '@/components/layout/Footer';
import { Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

/**
 * Điều khoản sử dụng.
 *
 * Mục 3 là mục quan trọng nhất và là lý do trang này được viết tay thay vì lấy
 * mẫu: nó nói rõ MIMI KHÔNG làm gì. Sản phẩm đọc dữ liệu ngân hàng và dựng
 * chứng từ — nó không cho vay, không chuyển tiền, không giữ tiền của ai, và
 * không phải đại lý thuế.
 *
 * Ghi thẳng những giới hạn đó có lợi cho cả hai phía. Với người dùng, nó chặn
 * hiểu nhầm ngay từ đầu. Với công ty, nó là ranh giới pháp lý: nhận tiền của
 * người khác hay hứa cấp tín dụng là hoạt động có điều kiện, cần giấy phép mà
 * CLI NUTRIX không có. Một điều khoản mập mờ ở chỗ này tạo ra rủi ro
 * lớn hơn nhiều so với việc nói thật rằng phạm vi đang hẹp.
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

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-12 safe-top safe-x">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Về trang chủ
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">Điều khoản sử dụng</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Giữa bạn và {COMPANY.legalName}. Cập nhật ngày {LEGAL_UPDATED_ON}.
        </p>

        <Muc so={1} tieuDe="Chấp nhận điều khoản">
          <p>
            Khi tạo tài khoản hoặc sử dụng {COMPANY.product.name}, bạn đồng ý với các điều
            khoản này và với Chính sách bảo mật. Nếu bạn dùng dịch vụ nhân danh một doanh
            nghiệp, bạn xác nhận mình có thẩm quyền ràng buộc doanh nghiệp đó.
          </p>
        </Muc>

        <Muc so={2} tieuDe="Dịch vụ cung cấp">
          <p>
            {COMPANY.product.name} đọc dữ liệu giao dịch từ tài khoản ngân hàng bạn tự liên
            kết, phân loại dòng tiền, dựng bộ chứng từ chi phí, đối soát tiền khách trả với
            hoá đơn bán hàng, và tra cứu trạng thái người nộp thuế của đối tác.
          </p>
        </Muc>

        <Muc so={3} tieuDe="Những gì MIMI KHÔNG làm">
          <div className="rounded-xl border border-mimi-amber/30 bg-mimi-amber/5 p-4 text-foreground">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-mimi-amber mt-0.5 shrink-0" />
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Không phải tổ chức tín dụng.</strong> {COMPANY.shortName} không cho
                  vay, không cấp hạn mức, không bảo lãnh và không cam kết bất kỳ khoản vốn nào.
                  Mọi thông tin về tín dụng trong ứng dụng chỉ mô tả hồ sơ của chính bạn dựa
                  trên dữ liệu của bạn, và không phải là lời hứa cho vay của ai.
                </p>
                <p>
                  <strong>Không phải trung gian thanh toán.</strong> Chúng tôi không giữ tiền,
                  không chuyển tiền và không thực hiện giao dịch thay bạn. Mã QR nhận tiền do
                  ngân hàng của bạn phát hành; tiền đi thẳng vào tài khoản của bạn.
                </p>
                <p>
                  <strong>Không phải đại lý thuế.</strong> Chúng tôi cung cấp công cụ tính toán
                  và sắp xếp chứng từ. Bạn vẫn là người chịu trách nhiệm về nội dung kê khai và
                  nghĩa vụ thuế của mình. Với các tình huống phức tạp, hãy hỏi đại lý thuế hoặc
                  cơ quan thuế.
                </p>
              </div>
            </div>
          </div>
        </Muc>

        <Muc so={4} tieuDe="Tài khoản và bảo mật">
          <p>
            Bạn chịu trách nhiệm giữ bí mật thông tin đăng nhập và mọi hoạt động phát sinh dưới
            tài khoản của mình. Nếu nghi ngờ bị truy cập trái phép, hãy đổi mật khẩu và ngắt liên
            kết ngân hàng ngay.
          </p>
        </Muc>

        <Muc so={5} tieuDe="Dữ liệu bạn đưa vào">
          <p>
            Bạn giữ toàn bộ quyền đối với dữ liệu của mình. Bạn cấp cho chúng tôi quyền xử lý dữ
            liệu đó chỉ nhằm mục đích vận hành dịch vụ cho bạn.
          </p>
          <p>
            Khi bạn nhập dữ liệu của bên thứ ba — chẳng hạn danh bạ khách hàng có tên, điện thoại,
            email của người khác — bạn cam kết mình có cơ sở hợp pháp để làm việc đó theo pháp luật
            về bảo vệ dữ liệu cá nhân.
          </p>
        </Muc>

        <Muc so={6} tieuDe="Phí dịch vụ">
          <p>
            Một số tính năng có thu phí theo gói thuê bao, mức phí hiển thị trong ứng dụng trước
            khi bạn xác nhận. Phí đã thanh toán cho kỳ đang dùng không hoàn lại, trừ khi pháp luật
            quy định khác. Bạn có thể ngừng gia hạn bất cứ lúc nào.
          </p>
        </Muc>

        <Muc so={7} tieuDe="Độ chính xác của dữ liệu">
          <p>
            Dữ liệu giao dịch đến từ ngân hàng của bạn qua nhà cung cấp dịch vụ tổng hợp. Chúng tôi
            không kiểm soát được việc ngân hàng có gián đoạn, chậm đồng bộ, hay trả về nội dung
            thiếu. Kết quả phân loại và đối soát là gợi ý dựa trên dữ liệu nhận được; bạn nên rà lại
            trước khi dùng cho mục đích kê khai hoặc quyết toán.
          </p>
        </Muc>

        <Muc so={8} tieuDe="Giới hạn trách nhiệm">
          <p>
            Trong phạm vi pháp luật cho phép, {COMPANY.legalName} không chịu trách nhiệm về thiệt
            hại gián tiếp hoặc hệ quả phát sinh từ việc sử dụng dịch vụ. Tổng trách nhiệm của chúng
            tôi trong mọi trường hợp không vượt quá số phí bạn đã thanh toán trong mười hai tháng
            liền trước sự kiện phát sinh.
          </p>
          <p>Điều khoản này không loại trừ trách nhiệm mà pháp luật không cho phép loại trừ.</p>
        </Muc>

        <Muc so={9} tieuDe="Chấm dứt">
          <p>
            Bạn có thể xoá tài khoản bất cứ lúc nào trong Cài đặt. Chúng tôi có thể tạm ngừng hoặc
            chấm dứt tài khoản nếu phát hiện hành vi vi phạm pháp luật hoặc gây tổn hại tới hệ thống
            và người dùng khác.
          </p>
        </Muc>

        <Muc so={10} tieuDe="Luật áp dụng">
          <p>
            Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Tranh chấp trước hết được
            giải quyết bằng thương lượng; nếu không đạt kết quả, sẽ do toà án có thẩm quyền tại
            Việt Nam giải quyết.
          </p>
        </Muc>
      </main>
      <Footer />
    </div>
  );
}
