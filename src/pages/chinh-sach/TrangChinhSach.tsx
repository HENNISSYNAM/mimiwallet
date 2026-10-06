import { COMPANY, CONTACT, hoacToken } from '@/config/company';
import { GIA_MOT_TO_KHAI, GOI_THANG, giaVND } from '../../../supabase/functions/_shared/billing/bang-gia.ts';
import NotFound from '@/pages/NotFound';
import KhungChinhSach, { CanXacNhan, Dam, LienKet, Muc } from './KhungChinhSach';
import { DANH_MUC_CHINH_SACH, TRANG_THONG_TIN, timChinhSach } from './danhMuc';

/**
 * Sáu trang chính sách (mục 2–7 hồ sơ thông báo TMĐT) và trang tổng hợp (mục 8).
 * Mục 1 — Chính sách bảo mật — là `src/pages/Privacy.tsx`.
 *
 * MỌI CON SỐ Ở ĐÂY ĐỌC TỪ MÃ ĐANG CHẠY, không gõ tay:
 *   - giá: `supabase/functions/_shared/billing/bang-gia.ts` (cùng bảng máy chủ thu tiền);
 *   - cách thu: `supabase/functions/subscription-billing/index.ts` + `_shared/billing/thu-tien.ts`
 *     (hoá đơn + mã tham chiếu duy nhất, đối soát tự động qua webhook và cron; sai số tiền thì
 *     không tự kích hoạt; gia hạn cộng dồn theo tháng lịch; không tự trừ tiền);
 *   - màn trả tiền: `src/components/settings/SubscriptionPayment.tsx`.
 *
 * Điều là QUYẾT ĐỊNH KINH DOANH chưa có trong mã (thời hạn hoàn tiền, thời hạn phản hồi, giờ hỗ
 * trợ…) được đặt mặc định hợp pháp và mang nhãn <CanXacNhan /> — chủ doanh nghiệp chốt rồi gỡ nhãn.
 * Thông tin còn thiếu hẳn hiện dạng token `{{…}}`. Danh sách: docs/bo-cong-thuong/HUONG_DAN_NOP.md.
 */

/** Khớp `TOI_DA_LUOT_MOT_LAN` trong `_shared/billing/thu-tien.ts` (file đó kéo theo mã chỉ chạy trên máy chủ). */
const TOI_DA_LUOT_MOT_LAN = 20;

const emailHoTro = () =>
  CONTACT.email ? (
    <a className="text-primary hover:underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
  ) : (
    '{{EMAIL_HO_TRO}}'
  );

// ── 2. Khiếu nại ────────────────────────────────────────────────────────────────────────────────
function KhieuNai() {
  return (
    <>
      <Muc so={1} tieuDe="Phạm vi">
        <p>
          Trang này áp dụng cho mọi phản ánh, yêu cầu, khiếu nại của khách hàng về {COMPANY.product.name}:
          chất lượng dịch vụ, thanh toán và hoàn tiền, dữ liệu cá nhân, và hành vi của MIMI Trợ lý.
        </p>
      </Muc>

      <Muc so={2} tieuDe="Kênh tiếp nhận">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><Dam>Email:</Dam> {emailHoTro()} — kênh chính, có lưu vết.</li>
          <li><Dam>Trong ứng dụng:</Dam> menu tài khoản → “Hỗ trợ”, mở sẵn thư gửi tới địa chỉ trên.</li>
          <li><Dam>Điện thoại:</Dam> {hoacToken(CONTACT.phone, 'SO_DIEN_THOAI')}</li>
          <li>
            <Dam>Thư gửi trụ sở:</Dam> {COMPANY.legalName}, {COMPANY.address}.
          </li>
        </ul>
        <p>
          Để xử lý nhanh, xin ghi: tên doanh nghiệp và email đăng nhập; mô tả sự việc và thời điểm;
          mã tham chiếu hoá đơn (nếu liên quan thanh toán); ảnh chụp màn hình nếu có. Chúng tôi không
          bao giờ hỏi mật khẩu, mã OTP hay mật khẩu ngân hàng của bạn.
        </p>
      </Muc>

      <Muc so={3} tieuDe="Quy trình và thời hạn">
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <Dam>Xác nhận đã nhận</Dam> trong vòng 02 ngày làm việc, kèm mã hồ sơ.<CanXacNhan />
          </li>
          <li>
            <Dam>Xác minh:</Dam> đối chiếu dữ liệu hệ thống (hoá đơn, nhật ký thanh toán, nhật ký quyết
            định) và hỏi thêm bạn nếu thiếu thông tin.
          </li>
          <li>
            <Dam>Thương lượng và trả lời kết quả</Dam> không muộn hơn 07 ngày làm việc kể từ khi nhận
            yêu cầu, theo Điều 57 Luật Bảo vệ quyền lợi người tiêu dùng số 19/2023/QH15. Kết quả gửi
            bằng email.
          </li>
          <li>
            <Dam>Thực hiện</Dam> phương án đã thống nhất — ví dụ hoàn tiền theo{' '}
            <LienKet to="/chinh-sach/cung-cap-cham-dut-hoan-tien">chính sách hoàn tiền</LienKet>.
          </li>
        </ol>
        <p>
          Yêu cầu về dữ liệu cá nhân (xem, sửa, xoá, rút lại đồng ý…) được xử lý theo cùng quy trình
          và trong thời hạn pháp luật về bảo vệ dữ liệu cá nhân quy định.
        </p>
      </Muc>

      <Muc so={4} tieuDe="Khi chưa đồng ý với kết quả">
        <p>
          Hai bên ưu tiên thương lượng. Nếu không đạt, bạn có thể yêu cầu hoà giải, gửi yêu cầu tới cơ
          quan quản lý nhà nước về bảo vệ quyền lợi người tiêu dùng (Sở Công Thương Thành phố Hồ Chí
          Minh, Bộ Công Thương), hoặc khởi kiện tại toà án có thẩm quyền tại Việt Nam theo pháp luật.
        </p>
        <p>
          {COMPANY.legalName} tôn trọng và chấp hành pháp luật về bảo vệ quyền lợi người tiêu dùng,
          và không có bất kỳ điều khoản nào hạn chế quyền khiếu nại, khởi kiện của bạn.
        </p>
      </Muc>
    </>
  );
}

// ── 3. Giá ──────────────────────────────────────────────────────────────────────────────────────
function Gia() {
  return (
    <>
      <Muc so={1} tieuDe="Bảng giá">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Gói / dịch vụ</th>
                <th className="px-3 py-2 text-left font-semibold">Giá</th>
                <th className="px-3 py-2 text-left font-semibold">Gồm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">Miễn phí</td>
                <td className="px-3 py-2 font-mono">0₫</td>
                <td className="px-3 py-2">
                  Đồng bộ 1 tài khoản ngân hàng, phân loại chi phí, báo cáo dòng tiền tháng, theo dõi
                  ngưỡng doanh thu, MIMI Trợ lý, xem trước và lưu nháp tờ khai, hỗ trợ qua email.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">Lượt xuất tờ khai</td>
                <td className="px-3 py-2 font-mono">{giaVND(GIA_MOT_TO_KHAI)} / tờ</td>
                <td className="px-3 py-2">
                  Một bản tờ khai sạch (không dấu “BẢN XEM TRƯỚC”) cho một kỳ. Mua từ 1 đến{' '}
                  {TOI_DA_LUOT_MOT_LAN} lượt một lần. Không cần mua khi gói tháng còn hạn.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">Gói {GOI_THANG.starter.ten}</td>
                <td className="px-3 py-2 font-mono">{giaVND(GOI_THANG.starter.amount)} / tháng</td>
                <td className="px-3 py-2">
                  Xuất tờ khai không giới hạn trong kỳ; sửa số và xuất lại bao nhiêu lần cũng được.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">Gói {GOI_THANG.growth.ten}</td>
                <td className="px-3 py-2 font-mono">{giaVND(GOI_THANG.growth.amount)} / tháng</td>
                <td className="px-3 py-2">
                  Niêm yết, <Dam>chưa mở bán trong ứng dụng</Dam>. Khi mở bán, quyền lợi cụ thể sẽ được
                  công bố tại trang này trước khi nhận thanh toán.
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">Kế toán &amp; đại lý thuế</td>
                <td className="px-3 py-2">Liên hệ</td>
                <td className="px-3 py-2">
                  Quản lý nhiều hộ kinh doanh; báo giá bằng văn bản trước khi ký, không thu tiền trước
                  khi hai bên thống nhất.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Muc>

      <Muc so={2} tieuDe="Nguyên tắc giá">
        <p>
          Giá niêm yết bằng đồng Việt Nam và là số tiền cuối cùng bạn chuyển khoản, đã bao gồm thuế
          giá trị gia tăng (nếu có).<CanXacNhan /> Không có phí ẩn, phí kích hoạt hay phí huỷ.
        </p>
        <p>
          Số tiền của mỗi hoá đơn do máy chủ tính theo bảng giá này và hiển thị trên màn hình thanh
          toán trước khi bạn chuyển tiền — trình duyệt không tự đặt được giá.
        </p>
        <p>
          Gói tháng tính theo tháng lịch (trả ngày 31/01 thì hết hạn 28/02 hoặc 29/02). Hiện chưa có
          gói năm và chưa có chương trình dùng thử trả phí; phần Miễn phí dùng không giới hạn thời gian.
        </p>
      </Muc>

      <Muc so={3} tieuDe="Thay đổi giá">
        <p>
          Khi thay đổi giá, chúng tôi cập nhật trang này và thông báo trong ứng dụng ít nhất 30 ngày
          trước khi giá mới áp dụng.<CanXacNhan /> Kỳ bạn đã thanh toán giữ nguyên giá cũ đến hết kỳ;
          hoá đơn đã phát hành nhưng chưa thanh toán giữ nguyên số tiền ghi trên hoá đơn.
        </p>
      </Muc>

      <Muc so={4} tieuDe="Cách trả">
        <p>
          Xem <LienKet to="/chinh-sach/thanh-toan">Chính sách thanh toán</LienKet> và{' '}
          <LienKet to="/chinh-sach/cung-cap-cham-dut-hoan-tien">chính sách hoàn tiền</LienKet>.
        </p>
      </Muc>
    </>
  );
}

// ── 4. Thanh toán ───────────────────────────────────────────────────────────────────────────────
function ThanhToan() {
  return (
    <>
      <Muc so={1} tieuDe="Phương thức thanh toán">
        <p>
          {COMPANY.product.name} nhận thanh toán phí dịch vụ <Dam>duy nhất bằng chuyển khoản ngân hàng
          trong nước</Dam>, gồm quét mã VietQR bằng ứng dụng ngân hàng hoặc chuyển tay. Chúng tôi không
          nhận thẻ, ví điện tử hay tiền mặt, và không lưu thông tin thẻ.
        </p>
        <p>
          Tài khoản nhận là tài khoản MB Bank số 2431122002 đứng tên ĐINH VĂN NAM — người đại diện theo
          pháp luật, Tổng giám đốc {COMPANY.legalName}. Ngân hàng, số tài khoản và chủ tài khoản
          luôn hiện trên màn hình thanh toán trong ứng dụng, kèm mã tham chiếu riêng của từng hoá đơn.
          Chỉ chuyển tới tài khoản hiện trên màn hình đó.
        </p>
      </Muc>

      <Muc so={2} tieuDe="Các bước">
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            Đăng nhập, vào <Dam>Cài đặt → Gói dịch vụ</Dam> để chọn gói tháng, hoặc bấm “Xuất tờ khai”
            để mua lượt.
          </li>
          <li>
            Hệ thống phát hành một hoá đơn kèm <Dam>mã tham chiếu duy nhất</Dam>. Mở lại màn hình khi
            hoá đơn đang chờ thì vẫn là mã cũ, không sinh hoá đơn trùng.
          </li>
          <li>
            Quét mã VietQR (số tiền và nội dung đã điền sẵn), hoặc chuyển tay đúng số tiền và ghi đúng
            mã tham chiếu vào nội dung chuyển khoản.
          </li>
          <li>
            Khi tiền về, hệ thống tự đối soát theo mã tham chiếu và kích hoạt gói hoặc cộng lượt, thường
            trong vài phút; có vòng đối soát lại định kỳ phòng trường hợp báo có đến chậm. Bạn nhận
            thông báo trong ứng dụng.
          </li>
        </ol>
      </Muc>

      <Muc so={3} tieuDe="Chuyển sai, thiếu hoặc thừa">
        <p>
          Chuyển <Dam>sai số tiền</Dam> thì hệ thống ghi nhận khoản tiền nhưng <Dam>không tự kích
          hoạt</Dam>, để người thật kiểm tra. Ghi thiếu hoặc sai mã tham chiếu thì hệ thống không nhận
          ra khoản tiền của bạn. Trong cả hai trường hợp, gửi ảnh biên lai chuyển khoản qua kênh ở trang{' '}
          <LienKet to="/chinh-sach/khieu-nai">khiếu nại</LienKet>; chúng tôi kích hoạt thủ công hoặc hoàn
          tiền theo <LienKet to="/chinh-sach/cung-cap-cham-dut-hoan-tien">chính sách hoàn tiền</LienKet>.
        </p>
      </Muc>

      <Muc so={4} tieuDe="Gia hạn">
        <p>
          <Dam>Không có trừ tiền tự động.</Dam> Mỗi kỳ bạn tự chuyển khoản để gia hạn; không chuyển thì
          gói hết hạn và tài khoản về phần Miễn phí, dữ liệu giữ nguyên. Trả sớm khi gói còn hạn thì kỳ
          mới cộng nối từ ngày hết hạn cũ, không mất ngày nào.
        </p>
      </Muc>

      <Muc so={5} tieuDe="Chứng từ thanh toán">
        <p>
          Mỗi khoản thanh toán có hoá đơn trong ứng dụng ghi mã tham chiếu, số tiền, ngày thanh toán và
          kỳ dịch vụ. {COMPANY.legalName} xuất hoá đơn điện tử cho khoản phí theo quy định của pháp luật
          về hoá đơn.<CanXacNhan />
        </p>
      </Muc>

      <Muc so={6} tieuDe="An toàn khi thanh toán">
        <p>
          {COMPANY.product.name} không phải trung gian thanh toán, không giữ tiền và không chuyển tiền
          thay bạn; khoản phí đi thẳng từ tài khoản của bạn vào tài khoản nhận nêu ở mục 1. Nhân viên của
          chúng tôi không bao giờ yêu cầu chuyển tiền vào tài khoản cá nhân, và không bao giờ hỏi mã OTP
          hay mật khẩu ngân hàng.
        </p>
      </Muc>
    </>
  );
}

// ── 5. Điều kiện & hạn chế ──────────────────────────────────────────────────────────────────────
function DieuKien() {
  return (
    <>
      <Muc so={1} tieuDe="Ai được sử dụng">
        <p>
          Doanh nghiệp, hộ kinh doanh và người làm kinh doanh tại Việt Nam, do người từ đủ 18 tuổi có
          năng lực hành vi dân sự đầy đủ đăng ký. Người đăng ký nhân danh doanh nghiệp xác nhận mình có
          thẩm quyền làm việc đó. Đăng ký bằng email hoặc tài khoản Google; một số tính năng cần mã số
          thuế của doanh nghiệp.
        </p>
      </Muc>

      <Muc so={2} tieuDe="Những gì MIMI không làm">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><Dam>Không phải tổ chức tín dụng:</Dam> không cho vay, không cấp hạn mức, không bảo lãnh.</li>
          <li><Dam>Không phải trung gian thanh toán:</Dam> không giữ tiền, không chuyển tiền, không thực hiện giao dịch thay bạn.</li>
          <li>
            <Dam>Không nộp tờ khai thay bạn:</Dam> MIMI soạn bản nháp tờ khai và giấy tờ; bạn kiểm tra,
            xác nhận và tự nộp trên cổng của cơ quan thuế.
          </li>
          <li><Dam>Không phải đại lý thuế hay tư vấn pháp lý:</Dam> bạn chịu trách nhiệm về nội dung kê khai và nghĩa vụ thuế của mình.</li>
        </ul>
      </Muc>

      <Muc so={3} tieuDe="Giới hạn của dữ liệu và trợ lý AI">
        <p>
          Số liệu đến từ ngân hàng qua nhà cung cấp dữ liệu; chúng tôi không kiểm soát việc ngân hàng
          gián đoạn, đồng bộ chậm hay trả về nội dung thiếu. Kết quả phân loại, đối soát, đọc ảnh chứng
          từ và câu trả lời của MIMI Trợ lý là gợi ý do phần mềm và mô hình AI tạo ra, có thể sai; bạn
          cần rà lại trước khi dùng để kê khai hay ra quyết định. MIMI chỉ thực hiện một việc thay đổi
          dữ liệu sau khi bạn bấm xác nhận.
        </p>
        <p>
          Hỏi bằng giọng nói cần trình duyệt có nhận dạng giọng nói (Chrome, Edge). Tính năng đang tạm
          dừng được ghi rõ “Tạm dừng” trong ứng dụng và không thu phí.
        </p>
      </Muc>

      <Muc so={4} tieuDe="Hành vi không được phép">
        <p>
          Dùng dịch vụ cho mục đích trái pháp luật (gồm rửa tiền, gian lận thuế, lừa đảo); đưa vào hệ
          thống dữ liệu của người khác khi không có cơ sở pháp lý; truy cập trái phép, dò quét, gửi yêu
          cầu tự động dồn dập (hệ thống có giới hạn tần suất) hoặc can thiệp vào hoạt động của hệ thống.
          Vi phạm có thể dẫn tới tạm ngừng hoặc chấm dứt tài khoản theo{' '}
          <LienKet to="/chinh-sach/cung-cap-cham-dut-hoan-tien">chính sách chấm dứt dịch vụ</LienKet>.
        </p>
      </Muc>

      <Muc so={5} tieuDe="Phạm vi">
        <p>
          Dịch vụ cung cấp trực tuyến cho khách hàng tại Việt Nam, bằng tiếng Việt là chính. Điều khoản
          đầy đủ xem ở <LienKet to="/terms">Điều khoản sử dụng</LienKet>.
        </p>
      </Muc>
    </>
  );
}

// ── 6. Cung cấp, chấm dứt, hoàn tiền ────────────────────────────────────────────────────────────
function CungCapHoanTien() {
  return (
    <>
      <Muc so={1} tieuDe="Phương thức cung cấp dịch vụ">
        <p>
          {COMPANY.product.name} là dịch vụ phần mềm cung cấp hoàn toàn trực tuyến qua website{' '}
          {CONTACT.website || '{{WEBSITE}}'} và ứng dụng trên điện thoại. Không có giao hàng vật lý.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Phần Miễn phí dùng được ngay sau khi đăng ký.</li>
          <li>
            Gói tháng và lượt xuất tờ khai được kích hoạt tự động sau khi khoản chuyển khoản được đối
            soát (xem <LienKet to="/chinh-sach/thanh-toan">Chính sách thanh toán</LienKet>).
          </li>
          <li>
            Mỗi kỳ gói tháng kéo dài một tháng lịch. Hết kỳ mà không gia hạn thì tài khoản về phần Miễn
            phí; dữ liệu giữ nguyên.
          </li>
          <li>
            Khi cần bảo trì có kế hoạch làm gián đoạn dịch vụ, chúng tôi thông báo trong ứng dụng trước
            ít nhất 24 giờ.<CanXacNhan />
          </li>
        </ul>
      </Muc>

      <Muc so={2} tieuDe="Bạn chấm dứt dịch vụ">
        <p>
          <Dam>Ngừng trả phí:</Dam> không chuyển khoản kỳ tiếp theo — không có khoản trừ tự động nào
          phải huỷ. <Dam>Chấm dứt hẳn:</Dam> xoá tài khoản trong Cài đặt (hướng dẫn cho người đã gỡ ứng
          dụng ở trang <LienKet to="/xoa-tai-khoan">Xoá tài khoản</LienKet>). Khi xoá, chúng tôi thu hồi
          uỷ quyền đọc sao kê với nhà cung cấp ngân hàng trước, rồi xoá dữ liệu. Nên trích xuất chứng từ
          cần lưu trước khi xoá.
        </p>
      </Muc>

      <Muc so={3} tieuDe="Chúng tôi chấm dứt hoặc tạm ngừng dịch vụ">
        <p>
          Chúng tôi có thể tạm ngừng hoặc chấm dứt tài khoản vi phạm pháp luật hoặc vi phạm{' '}
          <LienKet to="/chinh-sach/dieu-kien-dich-vu">điều kiện sử dụng</LienKet>, và thông báo lý do qua
          email, trừ khi cơ quan có thẩm quyền yêu cầu khác.
        </p>
        <p>
          Nếu ngừng cung cấp toàn bộ dịch vụ hoặc một gói đang bán, chúng tôi báo trước ít nhất 30
          ngày, cho bạn trích xuất dữ liệu, và hoàn phần phí của những ngày chưa sử dụng.<CanXacNhan />
        </p>
      </Muc>

      <Muc so={4} tieuDe="Hoàn tiền">
        <p>Bạn được hoàn tiền trong các trường hợp sau:<CanXacNhan /></p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <Dam>Chuyển thừa, chuyển trùng, chuyển sai số tiền:</Dam> hoàn phần thừa, hoặc toàn bộ khoản
            không kích hoạt được — hoặc, nếu bạn muốn, bù phần thiếu để kích hoạt.
          </li>
          <li>
            <Dam>Gói tháng:</Dam> hoàn toàn bộ nếu bạn yêu cầu trong 07 ngày kể từ ngày kích hoạt và chưa
            xuất tờ khai nào bằng quyền lợi của gói. Sau thời hạn này, phí của kỳ đang dùng không hoàn
            lại, trừ trường hợp dưới đây hoặc pháp luật quy định khác.
          </li>
          <li>
            <Dam>Lượt xuất tờ khai chưa dùng:</Dam> hoàn theo số lượt chưa dùng nếu yêu cầu trong 30 ngày
            kể từ ngày mua.
          </li>
          <li>
            <Dam>Lỗi từ phía chúng tôi</Dam> khiến tính năng trả phí không dùng được liên tục quá 72 giờ:
            hoàn hoặc cộng thêm số ngày bị gián đoạn, theo lựa chọn của bạn.
          </li>
          <li><Dam>Chúng tôi ngừng dịch vụ:</Dam> hoàn phần phí của những ngày chưa sử dụng.</li>
        </ul>
        <p>
          <Dam>Cách hoàn:</Dam> gửi yêu cầu qua kênh ở trang{' '}
          <LienKet to="/chinh-sach/khieu-nai">khiếu nại</LienKet>, kèm mã tham chiếu hoá đơn. Tiền hoàn
          chuyển khoản về tài khoản đã thanh toán trong vòng 07 ngày làm việc kể từ khi chấp nhận yêu
          cầu; phí chuyển khoản do chúng tôi chịu.
        </p>
      </Muc>
    </>
  );
}

// ── 7. Hỗ trợ trực tuyến ────────────────────────────────────────────────────────────────────────
function HoTro() {
  return (
    <>
      <Muc so={1} tieuDe="Kênh hỗ trợ">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><Dam>Email hỗ trợ:</Dam> {emailHoTro()}</li>
          <li>
            <Dam>Trong ứng dụng:</Dam> menu tài khoản → “Hỗ trợ” mở sẵn thư gửi đội hỗ trợ, có tiêu đề
            để chúng tôi nhận ra ngay.
          </li>
          <li>
            <Dam>MIMI Trợ lý:</Dam> hỏi bằng chữ hoặc giọng nói ngay trong ứng dụng về tiền, hoá đơn,
            thuế và chứng từ của doanh nghiệp bạn, 24/7. Trợ lý là phần mềm, không thay thế nhân viên hỗ
            trợ; khi cần người thật, dùng email.
          </li>
          {CONTACT.facebook && (
            <li>
              <Dam>Trang Facebook:</Dam>{' '}
              <a className="text-primary hover:underline" href={CONTACT.facebook} target="_blank" rel="noopener noreferrer">
                MIMI Wallet trên Facebook
              </a>
            </li>
          )}
          <li><Dam>Điện thoại:</Dam> {hoacToken(CONTACT.phone, 'SO_DIEN_THOAI')}</li>
        </ul>
      </Muc>

      <Muc so={2} tieuDe="Thời gian hỗ trợ">
        <p>
          Nhân viên trả lời từ Thứ Hai đến Thứ Sáu, 8:30–17:30 (trừ ngày lễ), và phản hồi email trong
          vòng 01 ngày làm việc.<CanXacNhan /> Khiếu nại theo quy trình và thời hạn riêng ở trang{' '}
          <LienKet to="/chinh-sach/khieu-nai">Tiếp nhận và giải quyết phản ánh, khiếu nại</LienKet>.
        </p>
      </Muc>

      <Muc so={3} tieuDe="Tự tra cứu">
        <ul className="list-disc pl-5 space-y-1.5">
          <li><LienKet to="/tri-tue-nhan-tao">MIMI dùng trí tuệ nhân tạo thế nào</LienKet></li>
          <li><LienKet to="/xoa-tai-khoan">Cách xoá tài khoản và dữ liệu</LienKet></li>
          <li><LienKet to="/chinh-sach/gia">Bảng giá</LienKet> và <LienKet to="/chinh-sach/thanh-toan">cách thanh toán</LienKet></li>
        </ul>
        <p>
          Để giữ an toàn, người hỗ trợ không bao giờ hỏi mật khẩu, mã OTP hay mật khẩu ngân hàng của
          bạn, và không yêu cầu cài phần mềm điều khiển máy từ xa.
        </p>
      </Muc>
    </>
  );
}

// ── 8. Trang tổng hợp ───────────────────────────────────────────────────────────────────────────
function DongTT({ nhan, children }: { nhan: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 py-2 border-b border-border last:border-0">
      <dt className="text-muted-foreground">{nhan}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

export function ThongTinDoanhNghiep() {
  return (
    <KhungChinhSach tieuDe={TRANG_THONG_TIN.tieuDe} duongHienTai={TRANG_THONG_TIN.duong}>
      <Muc so={1} tieuDe="Đơn vị vận hành">
        <dl className="rounded-xl border border-border px-4 text-sm">
          <DongTT nhan="Tên doanh nghiệp">{COMPANY.legalName}</DongTT>
          <DongTT nhan="Tên quốc tế">{COMPANY.internationalName}</DongTT>
          <DongTT nhan="Mã số doanh nghiệp"><span className="font-mono">{COMPANY.taxCode}</span></DongTT>
          <DongTT nhan="Ngày cấp, nơi cấp">
            {COMPANY.incorporatedOn}, {hoacToken(COMPANY.registrationPlace, 'NOI_CAP_DKDN')}
          </DongTT>
          <DongTT nhan="Trụ sở">{COMPANY.address}</DongTT>
          <DongTT nhan="Người đại diện">{COMPANY.legalRepresentative.name} — {COMPANY.legalRepresentative.title}</DongTT>
          <DongTT nhan="Email">{emailHoTro()}</DongTT>
          <DongTT nhan="Điện thoại">{hoacToken(CONTACT.phone, 'SO_DIEN_THOAI')}</DongTT>
          <DongTT nhan="Website">{CONTACT.website || '{{WEBSITE}}'}</DongTT>
        </dl>
      </Muc>

      <Muc so={2} tieuDe={`Dịch vụ ${COMPANY.product.name}`}>
        <p>
          {COMPANY.product.name} là phần mềm trợ lý tài chính – kế toán chạy bằng trí tuệ nhân tạo cho
          hộ kinh doanh và doanh nghiệp nhỏ tại Việt Nam, cung cấp trên website và ứng dụng điện thoại
          (ứng dụng Android sắp phát hành trên Google Play). Dịch vụ:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>đọc sao kê từ tài khoản ngân hàng do bạn tự liên kết và phân loại dòng tiền vào – ra;</li>
          <li>đối chiếu hoá đơn điện tử, chụp và lưu chứng từ chi phí;</li>
          <li>soạn bản nháp tờ khai thuế và giấy tờ để bạn kiểm tra và tự nộp;</li>
          <li>kiểm tra khoản sắp chuyển để phát hiện dấu hiệu lừa đảo, đổi số tài khoản;</li>
          <li>MIMI Trợ lý trả lời câu hỏi dựa trên dữ liệu thật của doanh nghiệp, chỉ làm khi bạn xác nhận.</li>
        </ul>
        <p>
          Hàng hoá/dịch vụ bán trên nền tảng: gói thuê bao phần mềm và lượt xuất tờ khai của chính{' '}
          {COMPANY.legalName}. Nền tảng không cho bên thứ ba mở gian hàng hay bán hàng.
        </p>
        <p>
          {COMPANY.shortName} không phải tổ chức tín dụng và không phải trung gian thanh toán.{' '}
          {COMPANY.product.name} không cho vay, không giữ tiền, không chuyển tiền thay người dùng và
          không nộp hồ sơ thuế thay người dùng.
        </p>
      </Muc>

      <Muc so={3} tieuDe="Các chính sách công bố">
        <ol className="list-decimal pl-5 space-y-1.5">
          {DANH_MUC_CHINH_SACH.map((m) => (
            <li key={m.duong}>
              <LienKet to={m.duong}>{m.tieuDe}</LienKet>
              <span className="text-xs"> — {(CONTACT.website || '') + m.duong}</span>
            </li>
          ))}
          <li>
            <LienKet to="/terms">Điều khoản sử dụng</LienKet>
            <span className="text-xs"> — {(CONTACT.website || '') + '/terms'}</span>
          </li>
          <li>
            <LienKet to="/xoa-tai-khoan">Xoá tài khoản và dữ liệu</LienKet>
            <span className="text-xs"> — {(CONTACT.website || '') + '/xoa-tai-khoan'}</span>
          </li>
        </ol>
      </Muc>
    </KhungChinhSach>
  );
}

const NOI_DUNG: Record<string, () => JSX.Element> = {
  'khieu-nai': KhieuNai,
  gia: Gia,
  'thanh-toan': ThanhToan,
  'dieu-kien-dich-vu': DieuKien,
  'cung-cap-cham-dut-hoan-tien': CungCapHoanTien,
  'ho-tro-truc-tuyen': HoTro,
};

/** Trang cho mục 2–7. Mục 1 (bảo mật) render `Privacy` ở App.tsx. */
export default function TrangChinhSach({ slug }: { slug: string }) {
  const muc = timChinhSach(slug);
  const NoiDung = NOI_DUNG[slug];
  if (!muc || !NoiDung) return <NotFound />;
  return (
    <KhungChinhSach tieuDe={muc.tieuDe} duongHienTai={muc.duong}>
      <NoiDung />
    </KhungChinhSach>
  );
}
