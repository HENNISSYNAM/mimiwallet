# Phòng thủ trước hacker và bot — 26/09/2026

Kiểm toán bề mặt tấn công rồi vá theo mức nghiêm trọng. Mỗi mục: lỗ, cách khai thác, đã vá thế nào, kiểm ra sao.

## Đã vá

| # | Lỗ | Khai thác được gì | Vá | Kiểm |
|---|---|---|---|---|
| 1 | Hàm cron `chay_quet_thong_bao`, `chay_doi_soat_thue_bao`, `don_hoi_thoai_cu` gọi được bằng khoá anon | Người chưa đăng nhập kích cron liên tục (đốt tài nguyên), xoá hội thoại cũ hơn 30 ngày của mọi công ty | Gỡ EXECUTE khỏi `anon`/`authenticated`; mặc định hàm mới không mở cho anon. Gốc: `REVOKE FROM PUBLIC` không gỡ quyền Supabase cấp riêng | Đóng vai `anon` trên DB thật → `permission denied`; test tĩnh bắt mọi hàm SECURITY DEFINER thiếu REVOKE anon |
| 2 | `waitlist` cho mọi người đăng nhập đọc; ai cũng ghi, không ràng buộc | Tự đăng ký một tài khoản là đọc được toàn bộ email; bot đổ rác | Gỡ policy đọc; ràng buộc email/độ dài; email duy nhất; chặn lũ toàn cục 30/10 phút; ô bẫy + ngưỡng thời gian ở form | Đóng vai người đăng nhập → 0 dòng; email sai → vi phạm ràng buộc |
| 3 | Kho `secure-documents` nhận tệp bất kỳ, không giới hạn | Cài HTML có script để lừa đảo, phát tán mã độc, đổ đầy kho | 5 MB, chỉ PDF/JPG/PNG/WEBP; gỡ quyền tải lên/sửa từ trình duyệt (không mã nào dùng) | Kho đang trống |
| 4 | `elevenlabs-tts` chỉ dựa `verify_jwt` — khoá anon công khai cũng là JWT | Ai có khoá anon (mọi khách xem trang) gọi API trả tiền, văn bản dài tuỳ ý | Bắt buộc phiên thật, tối đa 1000 ký tự, 20/10 phút + 100/ngày mỗi người, 60/10 phút mỗi IP, bộ đếm lỗi thì từ chối | Test cổng gác đỏ với bản cũ, xanh với bản vá |
| 5 | Không giới hạn số lần sai khoá ở webhook, API agent, MCP, bộ nạp kho | Dò khoá không giới hạn | Sai quá 20 lần/10 phút mỗi IP (IP đã băm) → từ chối kể cả khi lần sau đúng | Test cổng gác |
| 6 | Không giới hạn tần suất ở function gọi API ngoài / đọc nặng | Script dội yêu cầu | `bank-link`, `subscription-billing`, `tax-summary`, `chi-phi-ai`, `delete-account` có giới hạn mỗi người | deno check |
| 7 | Web không có header bảo mật | Nhúng app vào iframe để lừa bấm duyệt chi (clickjacking); hạ HTTPS | HSTS, X-Frame-Options DENY, `frame-ancestors 'none'`, nosniff, Referrer-Policy, Permissions-Policy (giữ camera để quét chứng từ) | Bản build không còn script nội tuyến |
| 8 | 10 lỗ mức cao trong thư viện (có `react-router`) | Lỗ đã công bố của thư viện | `npm audit fix` (không `--force`): còn 2 mức vừa | 1654 test, build xanh |

## Chưa làm — cần chủ sản phẩm

- **CSP đầy đủ đang ở chế độ Report-Only.** Sau khi deploy, mở web thật, xem console có vi phạm CSP không; không có thì đổi `Content-Security-Policy-Report-Only` thành `Content-Security-Policy` trong `vercel.json`.
- **CAPTCHA cho đăng ký/đăng nhập** (Cloudflare Turnstile hoặc hCaptcha) bật ở Supabase Dashboard → Authentication → Bot protection, kèm khoá site. Đây là cài đặt bảo mật của tài khoản — người dùng tự bật; sau đó thêm widget vào trang đăng ký.
- **2 lỗ mức vừa trong thư viện** chỉ vá bằng nâng phiên bản lớn (`npm audit fix --force`) — cần thử kỹ riêng.
- **CORS `*`** ở edge function: không khai thác trực tiếp được vì xác thực bằng Bearer (không cookie), nhưng có thể thu hẹp về tên miền của MIMI.
- **Webhook Cas không có chữ ký** (khoá trong URL) — giới hạn của Cas, đã ghi ở `KIEM_TOAN_CAS_WEBHOOK.md`.
