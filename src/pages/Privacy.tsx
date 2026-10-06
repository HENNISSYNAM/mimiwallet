import { COMPANY, CONTACT, coKenhLienHeVanBan } from '@/config/company';
import KhungChinhSach, { CanXacNhan, Dam, LienKet, Muc } from './chinh-sach/KhungChinhSach';

/**
 * Chính sách bảo mật — mục 1 của hồ sơ thông báo TMĐT (online.gov.vn), mở ở cả `/privacy` (đường
 * App Store / Google Play đã khai) và `/chinh-sach/bao-mat`.
 *
 * NGUYÊN TẮC VIẾT TRANG NÀY: mỗi câu phải mô tả một hành vi có thật trong mã nguồn. Đây không phải
 * văn bản mẫu tải về rồi thay tên. Đối chiếu được với:
 *   - `supabase/functions/bank-link/*`, `cas-webhook`, `bank-webhook` — sao kê qua Cas / SePay
 *   - `supabase/functions/_shared/crypto/*`, `_shared/pqcCrypto.ts` — mã hoá token ngân hàng
 *   - `supabase/functions/tax-lookup/*` — tra mã số thuế qua XInvoice
 *   - `supabase/functions/_shared/ai/nha-cung-cap.ts` — cổng mô hình AI (OpenRouter / Lovable AI)
 *   - `src/hooks/useNgheGiong.ts` — micro: nhận dạng giọng nói của trình duyệt, hỏi trước khi bật
 *   - migration `20260918150000_hoi_thoai_quyet_dinh.sql` — hội thoại 180 ngày, nhật ký chỉ thêm
 *   - `supabase/functions/delete-account` — xoá tài khoản, thu hồi uỷ quyền ngân hàng trước
 *
 * KHÔNG viết vào đây: chứng nhận chưa được cấp, đối tác chưa ký, cam kết thời gian phản hồi chưa có
 * ai trực. Điểm nào còn là quyết định của chủ doanh nghiệp thì mang nhãn <CanXacNhan />.
 */
export default function Privacy() {
  return (
    <KhungChinhSach tieuDe="Chính sách bảo mật" duongHienTai="/chinh-sach/bao-mat">
      <Muc so={1} tieuDe="Ai xử lý dữ liệu của bạn">
        <p>
          Bên kiểm soát và xử lý dữ liệu là {COMPANY.legalName} ({COMPANY.internationalName}),
          mã số doanh nghiệp {COMPANY.taxCode}, trụ sở tại {COMPANY.address}.
          Người đại diện theo pháp luật: {COMPANY.legalRepresentative.name},{' '}
          {COMPANY.legalRepresentative.title}.
        </p>
        <p>
          Chính sách này áp dụng cho website {CONTACT.website || 'MIMI Wallet'} và ứng dụng{' '}
          {COMPANY.product.name} trên điện thoại, được xây dựng theo Luật Bảo vệ dữ liệu cá nhân
          số 91/2025/QH15, Nghị định 356/2025/NĐ-CP và pháp luật về thương mại điện tử.
        </p>
      </Muc>

      <Muc so={2} tieuDe="Dữ liệu chúng tôi thu thập">
        <p><Dam>Thông tin tài khoản.</Dam>{' '}
          Email và mật khẩu đã băm, hoặc danh tính (tên, email) từ đăng nhập Google. Tên doanh
          nghiệp và mã số thuế bạn nhập khi đăng ký.
        </p>
        <p><Dam>Dữ liệu ngân hàng.</Dam>{' '}
          Khi và chỉ khi bạn tự liên kết tài khoản, chúng tôi nhận lịch sử giao dịch (ngày, số
          tiền, nội dung chuyển khoản, số dư) qua nhà cung cấp dịch vụ dữ liệu ngân hàng (Cas). Bạn cấp quyền trực tiếp trên giao diện của ngân hàng hoặc của nhà cung cấp —{' '}
          {COMPANY.product.name} không bao giờ nhìn thấy mật khẩu ngân hàng của bạn. Bạn cũng có thể
          tự tải sao kê lên.
        </p>
        <p><Dam>Hoá đơn, chứng từ và đối tác.</Dam>{' '}
          Hoá đơn điện tử, ảnh chứng từ bạn chụp hoặc tải lên (để đọc chữ và số trên đó), và danh
          bạ đối tác bạn nhập — có thể gồm tên, mã số thuế, địa chỉ, điện thoại, email của doanh
          nghiệp hoặc cá nhân khác. Bạn là bên chịu trách nhiệm về cơ sở pháp lý khi đưa dữ liệu
          của bên thứ ba vào hệ thống.
        </p>
        <p><Dam>Câu hỏi gửi MIMI Trợ lý.</Dam>{' '}
          Câu hỏi, câu trả lời, nguồn dữ liệu đã đọc và đề xuất của trợ lý được lưu để bạn xem lại
          và để đối chiếu khi cần. Việc bạn xác nhận cho MIMI làm (ai xác nhận, lúc nào, nội dung
          gì) được ghi vào nhật ký quyết định.
        </p>
        <p><Dam>Giọng nói.</Dam>{' '}
          Khi bạn bấm nút micro để hỏi bằng giọng nói, MIMI hỏi bạn trước khi bật micro. Âm thanh
          được dịch vụ nhận dạng giọng nói có sẵn của trình duyệt (Chrome, Edge…) đổi thành chữ;
          MIMI chỉ nhận phần chữ, không nhận và không lưu bản ghi âm.
        </p>
        <p><Dam>Thanh toán phí dịch vụ.</Dam>{' '}
          Mã tham chiếu hoá đơn, số tiền và nội dung chuyển khoản vào tài khoản nhận của công ty,
          để đối soát và kích hoạt gói. Chúng tôi không nhận và không lưu số thẻ.
        </p>
        <p><Dam>Dữ liệu xác minh danh tính.</Dam>{' '}
          Nếu bạn thực hiện xác minh, ảnh giấy tờ và ảnh chân dung bạn cung cấp.
        </p>
        <p>
          Thông tin tài khoản ngân hàng và giao dịch là <Dam>dữ liệu cá nhân nhạy cảm</Dam> theo
          pháp luật; chúng tôi chỉ xử lý khi bạn đã đồng ý bằng thao tác liên kết hoặc tải lên.
        </p>
        <p><Dam>Chúng tôi KHÔNG thu thập</Dam> vị trí GPS, danh bạ điện thoại, ảnh trong máy ngoài
          ảnh bạn chủ động tải lên, hay dữ liệu duyệt web của bạn ở nơi khác. Website không gắn
          công cụ quảng cáo hay theo dõi của bên thứ ba. Chúng tôi không bán dữ liệu cho bất kỳ ai.
        </p>
      </Muc>

      <Muc so={3} tieuDe="Dùng dữ liệu để làm gì">
        <p>
          Phân loại dòng tiền vào–ra; dựng bộ chứng từ chi phí; đối soát tiền khách trả với hoá
          đơn; soạn bản nháp tờ khai và giấy tờ để bạn tự kiểm tra và tự nộp; tra trạng thái người
          nộp thuế của đối tác; trả lời câu hỏi của bạn qua MIMI Trợ lý; thu phí dịch vụ; và vận
          hành, bảo vệ tài khoản của bạn.
        </p>
        <p>
          Phân tích chạy trên dữ liệu của riêng doanh nghiệp bạn. Chúng tôi không gộp dữ liệu của
          bạn với dữ liệu khách hàng khác để bán ra ngoài, và không dùng dữ liệu của bạn để quảng cáo.
        </p>
      </Muc>

      <Muc so={4} tieuDe="Chia sẻ với bên thứ ba">
        <p>Dữ liệu chỉ rời hệ thống trong các trường hợp sau, mỗi trường hợp giới hạn ở phần tối thiểu:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <Dam>Nhà cung cấp dữ liệu ngân hàng (Cas)</Dam> — để lấy sao kê theo uỷ quyền của bạn.
            <Dam> SePay</Dam> — chỉ để nhận báo có khi bạn chuyển khoản trả phí vào tài khoản nhận của MIMI.
          </li>
          <li>
            <Dam>Dịch vụ tra cứu mã số thuế (XInvoice)</Dam> — chỉ gửi đi mã số thuế cần tra,
            không gửi kèm dữ liệu tài chính.
          </li>
          <li>
            <Dam>Cổng mô hình trí tuệ nhân tạo (OpenRouter hoặc Lovable AI; mô hình họ Google
            Gemini)</Dam> — khi bạn hỏi MIMI Trợ lý hoặc nhờ đọc ảnh chứng từ, câu hỏi, ảnh và phần
            số liệu cần để trả lời được gửi tới cổng này để xử lý. Không gửi mật khẩu hay mã truy
            cập ngân hàng.
          </li>
          <li>
            <Dam>Google</Dam> — chỉ khi bạn chọn đăng nhập bằng Google, và dịch vụ nhận dạng giọng
            nói của trình duyệt khi bạn dùng micro.
          </li>
          <li>
            <Dam>Hạ tầng lưu trữ và vận hành (Supabase)</Dam> — cơ sở dữ liệu, xác thực và máy chủ
            chạy ứng dụng.
          </li>
          <li>
            <Dam>Cơ quan nhà nước có thẩm quyền</Dam> — khi có yêu cầu hợp pháp bằng văn bản.
          </li>
        </ul>
      </Muc>

      <Muc so={5} tieuDe="Nơi lưu trữ và chuyển dữ liệu ra nước ngoài">
        <p>
          Cơ sở dữ liệu của {COMPANY.product.name} đặt trên hạ tầng Supabase tại Singapore.
          <CanXacNhan /> Cổng mô hình AI nêu ở mục 4 xử lý dữ liệu trên máy chủ ở nước ngoài. Vì
          vậy dữ liệu của bạn được chuyển ra ngoài lãnh thổ Việt Nam; chúng tôi thực hiện việc này
          theo quy định về chuyển dữ liệu cá nhân xuyên biên giới của pháp luật Việt Nam.
        </p>
      </Muc>

      <Muc so={6} tieuDe="Bảo vệ dữ liệu">
        <p>
          Mã truy cập ngân hàng được mã hoá trước khi ghi xuống cơ sở dữ liệu, bằng AES-256-GCM với
          khoá được bọc bởi ML-KEM-768 — thuật toán trao đổi khoá kháng máy tính lượng tử theo chuẩn
          NIST FIPS 203.
        </p>
        <p>
          Mọi bảng dữ liệu đều bật Row Level Security, khoá theo doanh nghiệp sở hữu, nên một người
          dùng không có đường truy vấn nào chạm tới dữ liệu của doanh nghiệp khác. Nhật ký quyết định
          chỉ được thêm, không sửa được — kể cả bởi quản trị viên hệ thống.
        </p>
        <p>
          Chúng tôi không tuyên bố bất kỳ chứng nhận an toàn thông tin nào, vì hiện chưa có tổ chức
          nào cấp cho chúng tôi. Nếu điều đó thay đổi, mục này sẽ ghi rõ tổ chức cấp và số hiệu.
        </p>
      </Muc>

      <Muc so={7} tieuDe="Quyền của bạn">
        <p>
          Bạn có quyền được biết, đồng ý hoặc rút lại sự đồng ý, xem, chỉnh sửa, trích xuất, xoá,
          yêu cầu hạn chế hoặc phản đối việc xử lý dữ liệu cá nhân của mình, và khiếu nại theo quy
          định. Bạn có thể ngắt liên kết ngân hàng bất cứ lúc nào trong mục Kết nối; khi ngắt, chúng
          tôi thu hồi uỷ quyền với nhà cung cấp và ngừng nhận giao dịch mới.
        </p>
        <p>
          <Dam>Xoá tài khoản:</Dam> bạn có thể tự xoá toàn bộ tài khoản và dữ liệu trong Cài đặt,
          không cần liên hệ ai; người đã gỡ ứng dụng xem hướng dẫn ở trang{' '}
          <LienKet to="/xoa-tai-khoan">Xoá tài khoản</LienKet>. Thao tác này không hoàn tác được.
        </p>
        <p>
          Yêu cầu khác về dữ liệu cá nhân gửi qua kênh ở mục 10; cách chúng tôi tiếp nhận và trả lời
          xem ở trang <LienKet to="/chinh-sach/khieu-nai">Tiếp nhận và giải quyết phản ánh, khiếu nại</LienKet>.
        </p>
      </Muc>

      <Muc so={8} tieuDe="Lưu trữ trong bao lâu">
        <p>
          Dữ liệu được giữ chừng nào tài khoản còn hoạt động và bị xoá khi bạn xoá tài khoản. Riêng
          nội dung hội thoại với MIMI Trợ lý được tự động xoá sau 180 ngày; dòng nhật ký quyết định
          vẫn giữ tóm tắt câu hỏi lúc đó cho tới khi tài khoản doanh nghiệp bị xoá.
        </p>
        <p>
          Những chứng từ mà pháp luật kế toán và thuế buộc bạn lưu trong thời hạn nhất định, bạn nên
          tự trích xuất và lưu bản của mình trước khi xoá tài khoản.
        </p>
      </Muc>

      <Muc so={9} tieuDe="Trẻ em và thay đổi chính sách">
        <p>
          {COMPANY.product.name} là công cụ dành cho doanh nghiệp và hộ kinh doanh, không dành cho
          người dưới 18 tuổi và không chủ động thu thập dữ liệu của trẻ em.
        </p>
        <p>
          Khi có thay đổi ảnh hưởng tới cách xử lý dữ liệu, chúng tôi cập nhật ngày ở đầu trang và
          thông báo trong ứng dụng trước khi thay đổi có hiệu lực.
        </p>
      </Muc>

      <Muc so={10} tieuDe="Liên hệ">
        {coKenhLienHeVanBan() ? (
          <p>
            Mọi câu hỏi hoặc yêu cầu liên quan tới dữ liệu cá nhân, xin gửi tới{' '}
            {CONTACT.email && <a className="text-primary hover:underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>}
            {CONTACT.email && CONTACT.website && ' hoặc '}
            {CONTACT.website && <a className="text-primary hover:underline" href={CONTACT.website} target="_blank" rel="noopener noreferrer">{CONTACT.website}</a>}
            , hoặc gửi thư tới trụ sở {COMPANY.legalName}, {COMPANY.address}.
          </p>
        ) : (
          <p>
            Mọi câu hỏi hoặc yêu cầu liên quan tới dữ liệu cá nhân, xin gửi tới trụ sở
            {' '}{COMPANY.legalName}, {COMPANY.address}.
          </p>
        )}
      </Muc>
    </KhungChinhSach>
  );
}
