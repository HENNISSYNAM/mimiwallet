# Thử app bằng agent đóng vai khách hàng — 23/09/2026

15 agent đóng vai 15 chân dung trong [CHAN_DUNG_KHACH_HANG.md](CHAN_DUNG_KHACH_HANG.md),
dùng app thật ở `localhost:8080` bằng tài khoản demo, chỉ xem và điều hướng.

> **Đây là giả thuyết được kiểm bằng máy, không phải nghiên cứu người dùng.** Mỗi
> phát hiện dưới đây kèm câu chữ nguyên văn trên màn hình, nên kiểm lại được.
> Nhưng phản ứng của "khách hàng" là do agent suy ra từ mô tả vai, không phải do
> người thật nói. Đừng dùng nó thay cho phỏng vấn thật.

## Kết quả

| # | Chân dung | Kết quả | Chặn ở đâu |
|---|---|---|---|
| 1 | Chị Hạnh 52, hộ KD 🇻🇳 | ✅ Đạt | Trang chủ suýt đuổi đi |
| 2 | Ông Dũng 67, bị lừa 🇻🇳 | ❌ Không kịp dừng lại | Tính năng cứu ông bị giấu |
| 3 | Anh Tuấn 34, founder AI 🇻🇳 | ⚠️ Dùng tiếp, chưa trả tiền | Khoá quản trị Anthropic |
| 4 | Chị Linh 29, kế toán 🇻🇳 | ❌ Không dùng cho 15 khách | Đổi công ty phải vào Cài đặt |
| 5 | Minh 19, TikTok Shop 🇻🇳 | ❌ Bỏ ở giây 10–15 | Nút chính báo "chưa làm được" |
| 6 | Chị Thu 41, 3 quán 🇻🇳 | ❌ Không cầm được gì đi ngân hàng | Báo cáo tự nhận "chưa phải BCTC" |
| 7 | Bác Sáu 72, tiệm vàng 🇻🇳 | ⚠️ Yên tâm nhưng chữ quá nhỏ | Tin "công an bắt giam" trên màn tiền |
| 8 | Priya 38 🇸🇬 | ❌ Gỡ app | "only translated the headlines" |
| 10 | Aiko 58 🇯🇵 | ❌ Bỏ ở trang chủ | Ngõ cụt ngôn ngữ |
| 11 | Siti 27 🇮🇩 | ❌ Bỏ trong vài chục giây | Không có lối vào cho người không công ty |
| 12 | Rahul 44 🇮🇳 | ❌ Giữ Zoho | API tên hàm tiếng Việt |
| 15 | Joel 39 🇵🇭 | ❌ Bỏ ngay trang chủ | Không USD, không Wise/PayPal |
| 16 | Min-jun 45 🇰🇷 | ❌ Chưa dùng được | Nhắc thuế và Thư viện 0% tiếng Hàn |
| 19 | Emma 33 🇩🇪 | ❌ Không tạo tài khoản | Chính sách chỉ tiếng Việt, không nói dữ liệu ở đâu |
| 20 | David 61 🇦🇺 | ⚠️ Tin một phần | Hai con số lớn không truy được nguồn |

Số 9, 13, 14, 17, 18 (Wei Chen, Nong, Bopha, Ling, Lucas) chưa chạy — hết hạn mức.

## Sợi chỉ xuyên suốt

**Không ai chê phần lõi.** Bác Sáu khen trang Tuân thủ dám ghi cả mục "Chưa có".
Anh Tuấn khen khoá agent chỉ lưu SHA-256. Chị Thu khen hộp Ứng vốn ghi thẳng
"bấm cũng chưa có tiền về tài khoản". David khen neo mã băm lên Bitcoin qua
OpenTimestamps. Emma khen câu "Mimi chỉ đọc lịch sử giao dịch, không thể chuyển
tiền" đặt ngay trước nút liên kết.

Họ chê **đường đi tới** phần lõi đó.

## Đã sửa

| Vá | Người tìm ra | Commit |
|---|---|---|
| Ghim sẵn "Kiểm tra trước khi chuyển tiền" | Ông Dũng | `6602a79` |
| Danh sách giao dịch thôi mâu thuẫn với con số | Chị Thu | `6602a79` |
| Thẻ `<head>` hiện ở lần tải đầu, có `noindex` | đo trực tiếp | `5facf9a` |
| Số liệu trang chủ thôi hiện `0` trước khi cuộn | Tuấn + Rahul | `bb81ba2` |
| Câu liên hệ bảo vệ dữ liệu thôi cụt | Emma | `bb81ba2` |
| Bộ chọn ngôn ngữ đủ 4 thứ tiếng ở trang công khai | Aiko | (đang kiểm) |

## Còn lại, xếp theo mức thiệt hại

### Chặn người dùng

- **Nút "Chụp chứng từ" bật lên rồi báo chưa làm được.** `NutQuetChungTu.tsx:66`
  hiện `toast.info('MIMI chưa bật đọc ảnh chứng từ…')` khi máy chủ chưa bật mô
  hình. Minh bỏ app ngay đó. Nút chính không được phép là ngõ cụt — hoặc khoá nó
  và nói trước, hoặc bật mô hình.
- **Không có lối ghi chi tiền mặt.** Siti không có công ty, không có tài khoản
  ngân hàng, chỉ có tiền mặt. Mọi ô trống đều dẫn về nút "Liên kết ngân hàng".
- **Đổi công ty chỉ có trong Cài đặt** và phải tải lại trang. Chị Linh đổi 15 lần
  một ngày.
- **Không tách được theo chi nhánh.** Chị Thu có 3 quán; app bắt dựng 3 công ty
  riêng và không xem gộp được.

### Làm mất niềm tin

- **"Điểm tín dụng MIMI 703/850"** hiện ở Tổng quan không kèm cảnh báo, trong khi
  Fintech Hub ghi rõ "Điểm tín dụng bên dưới đang tính trên dữ liệu demo".
  Cảnh báo ở sai chỗ. Bấm vào thẻ cũng không mở ra 5 yếu tố nào.
- **"Hóa đơn chờ thanh toán ₫165.0 tỷ"** không bấm được, không dẫn tới hoá đơn
  nào. Đây là một hoá đơn thật gõ nhầm, không phải dữ liệu demo.
- **Tin "Công an điều tra hàng nghìn giao dịch chuyển khoản: Bắt tạm giam 2 anh
  em"** hiển thị ngay trên màn hình tiền của người dùng.
- **"SMS khi giải ngân thành công"** trong Cài đặt, cho một tính năng chưa tồn tại.
- **Trạng thái kết nối tự mâu thuẫn:** trang Kết nối ghi "Ngân hàng — Đang chạy ·
  2 tài khoản đọc sao kê" còn Tổng quan ghi "Chưa có giao dịch thật nào".

### Chặn tham vọng toàn cầu

- **1.765 chỗ chữ tiếng Việt viết cứng** ở 113/225 tệp, không đi qua i18n. Khoá
  dịch đủ 100% cả 4 thứ tiếng và có test giữ chúng đồng bộ — vấn đề là ba phần tư
  chữ trên màn hình không đi qua chúng. Min-jun đo được Nhắc thuế và Thư viện
  chứng từ ở **0% tiếng Hàn**.
- **API công khai đặt tên hàm bằng tiếng Việt**: `xem_chinh_sach`, `xin_chi`,
  `xem_yeu_cau`, `tra_ma_ngan_hang`. Đổi sau khi có người tích hợp là phá hợp
  đồng công khai — phải quyết trước khi mở.
- **Không có đa tiền tệ.** Form tạo hoá đơn không có trường tiền tệ, chỉ có
  `VAT (%)` mặc định 10. Giá chỉ niêm yết `249.000₫`. Chỗ duy nhất có USD là
  trang Chi phí AI, vì đó là số nhà cung cấp tính.
- **Chính sách bảo mật và Điều khoản chỉ có tiếng Việt**, không nêu **quốc gia
  lưu trữ dữ liệu**, không nêu tên nhà cung cấp hạ tầng, không có cơ sở pháp lý
  kiểu GDPR, không có banner cookie.
- **Chưa có vỏ Android.** Không `android/`, không Capacitor, không TWA, không
  service worker. `manifest.webmanifest` có `"lang": "vi"` cố định và
  `"start_url": "/dashboard/tro-ly"` — người mới cài mở app là rơi vào trang cần
  đăng nhập.

### Tiếp cận

- Nhãn thanh điều hướng dưới **11px**, nội dung 12–14px, nút "Tải lại" **48×16px**
  (khuyến nghị 44×44). Bác Sáu 72 tuổi, mắt kém, tay run.
- Ngày hiển thị `Wednesday, 09/23/2026` — tên thứ tiếng Anh, định dạng tháng/ngày
  kiểu Mỹ, trong giao diện tiếng Hàn.

## Hai phát hiện đã bị bác bỏ

Ghi lại để không ai đi sửa thứ không hỏng.

1. **"Nút Xem demo 2 phút chỉ cuộn trang, không đăng nhập"** — bác Sáu và Siti
   đều báo. Không tái hiện được: chỉ có đúng một nút mang nhãn đó và nó gọi
   `signInAsDemo()`; Minh, chị Linh, Aiko và người điều phối đều vào được.
   Giả thuyết còn lại: **tài khoản demo là một tài khoản Supabase duy nhất dùng
   chung**, nhiều agent đăng nhập cùng lúc thì bị chặn tần suất, và lỗi hiện bằng
   toast mà agent đọc chữ trang không bắt được. Đáng lưu ý cho ngày lên Google
   Play, khi người duyệt và những người tải đầu tiên bấm nút đó cùng lúc.

2. **"Vào thẳng URL bị đá về trang chủ"** — bốn agent báo. Nội dung trang vẫn
   load đúng; thứ thật sự sai là `document.title` và thẻ head không được chèn ở
   lần tải đầu, nên tab hiện tiêu đề cũ và agent kết luận là bị chuyển trang.
   Đã sửa ở `5facf9a`.

## Hai bài học về cách chạy agent

1. **Không cho agent đổi ngôn ngữ.** Các agent dùng chung một trình duyệt và
   `localStorage.i18nextLng` là chung. Lần đầu, một agent bật English làm agent
   khác tưởng đó là mặc định và báo sai. Ngôn ngữ phải do người điều phối đặt
   trước mỗi đợt.
2. **Chạy theo đợt, dùng model rẻ.** Sáu agent Opus song song làm cháy hạn mức
   tháng. Sonnet, 3–5 agent một đợt, chia đợt theo ngôn ngữ giao diện.
