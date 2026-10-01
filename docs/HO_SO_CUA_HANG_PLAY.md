# Nội dung trang cửa hàng Google Play — MIMI Wallet

> Soạn 01/10/2026. Chỉ viết những gì sản phẩm làm được hôm nay. Không có con số, khách hàng hay chứng nhận nào chưa kiểm chứng.
> Khai báo Data safety xem `docs/GO_LIVE_CH_PLAY.md` mục 3.3; các điều kiện chặn xem mục 0 cùng tài liệu.

## 1. Thông tin cơ bản

| Mục | Nội dung |
|---|---|
| Tên app (≤ 30 ký tự) | MIMI Wallet |
| Tóm tắt (≤ 80 ký tự) | Trợ lý AI giúp hộ kinh doanh chốt doanh thu và nhắc nghĩa vụ thuế |
| Danh mục | Tài chính (Finance) |
| Email hỗ trợ | hoc.qk2@gmail.com (nên đổi sang email theo tên miền công ty trước khi phát hành) |
| Website | https://www.mimiwallet.online |
| Chính sách bảo mật | https://www.mimiwallet.online/chinh-sach/bao-mat |
| Xoá tài khoản (web) | https://www.mimiwallet.online/xoa-tai-khoan |
| Độ tuổi | 18+ (doanh nghiệp), không nhắm trẻ em |

## 2. Mô tả đầy đủ (tiếng Việt, ≤ 4000 ký tự)

**MIMI là trợ lý giúp chủ hộ kinh doanh và kế toán dịch vụ biết chắc: tiền vào nào là doanh thu, và nghĩa vụ thuế nào đang đến.**

Từ 2026, hộ kinh doanh kê khai thuế theo doanh thu thực. Nhưng tiền vào tài khoản chưa chắc là doanh thu: chuyển giữa tài khoản của chính bạn, tiền vay, tiền hoàn lại đều là "tiền vào". MIMI đọc sao kê và chứng từ, tách những khoản đó ra, rồi nói rõ phần nào đã chắc, phần nào còn mờ.

**Khi MIMI chưa chắc, MIMI không tự kết luận.** MIMI chỉ hỏi bạn đúng một câu về khoản ảnh hưởng nhiều nhất, rồi cập nhật lại từ câu trả lời của bạn.

MIMI giúp bạn:
• Xem tình trạng hôm nay: tiền vào, doanh thu đã xác nhận, khoản chưa rõ, khoản chi thiếu chứng từ.
• Hỏi MIMI bằng lời thường: "Năm nay tôi có phải nộp thuế không?", "Khoản chi nào chưa có chứng từ?".
• Nhận nhắc hạn và ngưỡng thuế, kèm nút "Căn cứ" mở ra văn bản gốc.
• Chụp hoá đơn bằng camera và ghép với khoản chi.
• Kiểm một khoản trước khi chuyển tiền, ví dụ khi nhà cung cấp đổi số tài khoản nhận.
• Dùng bằng tiếng Việt, English, 한국어 hoặc 中文.

MIMI chỉ đọc dữ liệu. MIMI không giữ tiền, không chuyển tiền thay bạn, không cho vay và không tự nộp tờ khai thuế. Việc nào đổi dữ liệu, bạn xác nhận mới xong.

Lưu ý: kết quả của MIMI là thông tin hỗ trợ, không thay thế tư vấn của kế toán hoặc cơ quan thuế. Bạn có thể báo ngay trong ứng dụng khi một câu trả lời chưa đúng.

Mua và gia hạn gói tại www.mimiwallet.online. Gói đã mua dùng được ngay trong ứng dụng.

## 3. Mô tả ngắn / bản English

**Short:** AI assistant that helps small businesses confirm revenue and track tax duties
**Full:** MIMI reads your bank statements and receipts, separates real revenue from other incoming money (transfers between your own accounts, loans, refunds), and tells you what is certain and what is not. When MIMI is unsure it does not guess: it asks you one question about the item that matters most. MIMI only reads data. It does not hold or move your money, does not lend, and does not file tax returns for you. Available in Vietnamese, English, Korean and Chinese. Plans are purchased on www.mimiwallet.online and work in the app.

## 4. Đồ hoạ cần chuẩn bị

| Hạng mục | Quy cách | Nguồn |
|---|---|---|
| Biểu tượng | 512×512 PNG | `public/mimi-cat-512.png` |
| Ảnh tính năng | 1024×500 | Cần thiết kế: mèo MIMI + câu "Biết chắc doanh thu và nghĩa vụ thuế" |
| Ảnh chụp điện thoại | 2–8 ảnh, 16:9 hoặc 9:16, ≥ 320 px | Chụp từ app (bản demo, dữ liệu mẫu — ghi chú "minh hoạ" nếu có số) |
| Ảnh gợi ý (4 ảnh) | ① Màn "Tình trạng hôm nay" ② Hỏi MIMI và câu trả lời ③ Nhắc hạn thuế ④ Quét hoá đơn |  |
| Video (tuỳ chọn) | YouTube, ≤ 2 phút | Video mèo MIMI đã có làm nền trang chủ |

## 5. Việc điền trong Play Console (không cần code)

1. Khai báo **Financial features**: không cho vay, không chuyển tiền; có tính năng quản lý tài chính (bản đầu không thu phí trong app).
2. **Data safety**: theo bảng ở `GO_LIVE_CH_PLAY.md` mục 3.3. Dòng "âm thanh giọng nói": chưa chắc, nghiêng về Không; chủ sở hữu quyết.
3. **Content rating** (IARC): có nội dung do AI tạo; không bạo lực, cờ bạc hay nội dung người lớn.
4. **Target audience**: 18+.
5. **Nội dung do AI tạo**: ghi rõ có chatbot, và có nút báo câu trả lời có vấn đề trong app (đã làm: dưới mỗi câu trả lời của MIMI).
6. **Kiểm thử kín** (tài khoản cá nhân mới): ≥ 12 người, ≥ 14 ngày liên tục — kiểm lại điều kiện hiện hành trong Play Console.
7. Tải lên gói AAB đã ký (xem `GO_LIVE_CH_PLAY.md` mục 4 về Bubblewrap và `assetlinks.json`).
