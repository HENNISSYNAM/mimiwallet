# Sẵn sàng lên Google Play — bảng kiểm

> Cập nhật 24/09/2026. Mỗi dòng phải kiểm được, không dựa vào cảm tính.
> Điểm audit đo độ chín của sản phẩm; bảng này đo **có nộp được hay không**.
> Hai thứ khác nhau: sản phẩm có thể đạt 6.18 mà vẫn không nộp được.

## Chặn cứng — không có cái nào thì không nộp được

| # | Việc | Trạng thái | Ai làm |
|---|---|---|---|
| 1 | **Vỏ Android (TWA hoặc Capacitor)** | ❌ **chưa có gì** | phải dựng |
| 2 | Khoá ký ứng dụng (keystore / Play App Signing) | ❌ chưa có | chủ dự án |
| 3 | `/.well-known/assetlinks.json` trên tên miền | ❌ chưa có — **cần vân tay SHA-256 của khoá ký, chỉ có sau bước 2** | sau bước 2 |
| 4 | Email hỗ trợ công khai | ❌ `CONTACT.email` đang rỗng | chủ dự án |
| 5 | Ảnh chụp màn hình, ảnh bìa, mô tả cửa hàng | ❌ chưa có | chủ dự án |
| 6 | Khai báo Data safety trong Play Console | ❌ chưa làm | chủ dự án |

## Đã xong

| Việc | Bằng chứng |
|---|---|
| Tên miền riêng, HTTPS | `www.mimiwallet.online`, apex chuyển 308 giữ đường dẫn |
| Chính sách bảo mật công khai | `/privacy`, mở được không cần đăng nhập |
| Điều khoản sử dụng | `/terms` |
| **Đường xoá tài khoản trong app** | Cài đặt → Xoá tài khoản (làm từ App Store Guideline 5.1.1(v)) |
| **Đường xoá tài khoản công khai** | `/xoa-tai-khoan` — Play đòi đường mở được **không cần cài app**; thêm 24/09 |
| Service worker | `public/sw.js` — mất mạng hiện trang nói thật, không hiện số cũ |
| Biểu tượng maskable | `manifest.webmanifest` khai `purpose: "maskable"` |
| `start_url` hợp lý | đổi từ `/dashboard/tro-ly` (đòi đăng nhập) sang `/` |
| Thẻ `noindex` cho trang sau đăng nhập | thực sự tới được trình thu thập từ 23/09 |

## Vì sao `start_url` phải đổi

Cũ là `/dashboard/tro-ly`. Người cài app từ Play mở lần đầu là rơi thẳng vào một
trang đòi đăng nhập, chưa từng thấy app làm gì. Người duyệt Play cũng vậy. Nay là
`/` — trang giới thiệu, có nút vào thử.

## Vì sao service worker cố ý không cache dữ liệu

MIMI là app tài chính. Một số dư hay dòng sao kê cũ hiện lại sau khi đăng xuất,
hoặc số của phiên trước hiện cho người sau trên máy dùng chung, còn tệ hơn là
không hiện gì. Nên chỉ cache vỏ tĩnh; mọi lời gọi tới Supabase, `/rest/`,
`/auth/`, `/functions/` và mọi request không phải GET đều đi thẳng ra mạng.

## Rủi ro phát hành, không phải chính sách

| Rủi ro | Vì sao đúng ngày ra mắt mới đau |
|---|---|
| **Gói Supabase FREE đang vượt hạn mức** | Ngày ra mắt là ngày nhiều lượt truy cập nhất |
| **Tài khoản demo dùng chung một tài khoản Supabase** | Người duyệt Play và những người tải đầu tiên bấm nút demo **cùng lúc**; đăng nhập nhiều lượt song song có thể bị chặn tần suất |
| Đường dự phòng xoá tài khoản là địa chỉ trụ sở | Đúng hình thức nhưng yếu; có `CONTACT.email` là xong ngay |
| Chính sách bảo mật chỉ có tiếng Việt | Nếu phát hành ngoài Việt Nam |

## Thứ tự làm

1. **Email hỗ trợ** (`hotro@mimiwallet.online`) → điền `CONTACT.email`. Rẻ nhất,
   gỡ được hai dòng chặn cùng lúc: email hỗ trợ và đường dự phòng xoá tài khoản.
2. **Xử lý gói Supabase** trước khi mở cho người thật.
3. **Dựng vỏ TWA** bằng Bubblewrap, lấy vân tay khoá ký.
4. **Đặt `assetlinks.json`** với vân tay ở bước 3.
5. Ảnh chụp màn hình, mô tả, Data safety.

Bước 1 và 2 không cần lập trình. Bước 3 cần Android SDK và một quyết định về
khoá ký — khoá đó mất là mất luôn quyền cập nhật ứng dụng, nên phải cất kỹ ngay
từ đầu.
