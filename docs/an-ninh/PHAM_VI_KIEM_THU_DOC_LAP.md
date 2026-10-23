# Phạm vi kiểm thử bảo mật độc lập — MIMI Wallet

Ngày soạn: 23/10/2026. Người soạn: đội phát triển MIMI (có AI hỗ trợ).

## Vì sao cần bên ngoài

Tới hôm nay MIMI **chưa** có kiểm thử xâm nhập độc lập. Các lớp đã có:

- rà soát mã do chính đội làm;
- test tấn công tự động trong `supabase/functions/_shared/an-ninh/` (`cong-gac.test.ts`, `gioi-han.test.ts`, `tan-cong.test.ts`).

Người viết mã tự kiểm thì có điểm mù, nên tài liệu này giao phạm vi cho một bên độc lập. Trong mọi tài liệu gửi ra ngoài, **không** được ghi là đã "kiểm thử độc lập" khi chưa có báo cáo của bên đó.

## Hệ thống

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Web | React + Vite, Vercel (`www.mimiwallet.online`) | Có CSP |
| Edge function | Supabase Deno (`supabase/functions/*`) | Dùng service role, **đi vòng RLS**: mọi kiểm quyền nằm trong mã |
| CSDL | Postgres + RLS (Supabase) | Trình duyệt đọc thẳng một số bảng (giao dịch, hoá đơn) |
| Ngân hàng | Cas (đọc sao kê, qrpay), webhook `cas-webhook` | `verify_jwt = false`, xác thực bằng chữ ký |
| Mô hình | OpenRouter / Stali | Chỉ gửi dữ liệu đã thu gọn (xem mục 4) |

## Mục tiêu kiểm, xếp theo rủi ro

1. **Chéo công ty (IDOR / tenant isolation).**
   - Người của công ty A có đọc hoặc ghi được dữ liệu công ty B không? Thử đổi `company_id` trong body, đổi mã giao dịch, mã hoá đơn, mã chứng từ, mã hội thoại.
   - Thử trên mọi function: `tro-ly`, `cong-ty`, `to-khai`, `tac-tu`, `sao-ke`, `bank-link`, `chi-phi-ai`, `agent-dieu-phoi`, `subscription-billing`, `mcp`.
2. **Phân quyền theo vai trò** (5 vai trò × 16 hành động, `_shared/quyen/vai-tro.ts`).
   - Người xem hoặc kế toán có làm được việc của người duyệt, quản trị không?
   - Có đường nào tự nâng vai trò, hoặc gỡ chủ sở hữu cuối cùng không?
3. **Phạm vi cơ sở (mới, 23/10/2026).** Kế toán phụ trách một cơ sở chỉ được thấy số của cơ sở đó.
   - Lớp CSDL: policy RESTRICTIVE, migration `20261023090000_pham_vi_co_so.sql`.
   - Lớp edge function: `_shared/da-co-so/pham-vi.ts`.
   - Cần thử: đọc thẳng `transactions` / `invoices` bằng JWT của kế toán cơ sở; hỏi trợ lý; thao tác theo mã giao dịch của cơ sở khác; mở tờ khai.
   - **Đã biết là chưa phủ:** các bảng phụ có `transaction_id` (`revenue_classifications`, `transaction_labels`, `quyet_dinh_chung_tu`) vẫn chỉ lọc theo công ty ở lớp CSDL. Lộ ra là mã và nhãn, không phải số tiền.
4. **Mô hình ngôn ngữ.**
   - Chèn lệnh qua nội dung chuyển khoản, tên đối tác, câu hỏi.
   - Rò dữ liệu sang mô hình. Dãy từ 6 chữ số đã được che, nhưng **tên người trong nội dung chuyển khoản vẫn có thể đi qua**.
   - Mô hình có thể khiến MIMI tự thực hiện một việc chạm tiền hoặc nộp hồ sơ không? Thiết kế là không: mọi việc như vậy cần người xác nhận.
5. **Webhook ngân hàng và thanh toán:** giả chữ ký, phát lại (replay), trùng lặp, thứ tự sự kiện.
6. **Xác thực:** hết hạn JWT, đổi công ty bằng `company_id`, giới hạn tần suất (`_shared/an-ninh/gioi-han.ts`).
7. **Web:** XSS qua nội dung mô hình hoặc tên đối tác (có `ChuDam` hiển thị chữ đậm), CSP, lưu khoá trong trình duyệt.

## Ngoài phạm vi

- Hạ tầng của Supabase, Vercel, Cas, OpenRouter.
- Tấn công từ chối dịch vụ (DoS) quy mô lớn.
- Lừa đảo phi kỹ thuật nhắm vào nhân viên.

## Điều kiện

- Chỉ dùng **công ty demo và tài khoản thử** do MIMI cấp, không dùng dữ liệu khách thật.
- Không dùng tài khoản ngân hàng thật.
- Không nộp hồ sơ thật lên cơ quan thuế.

## Đầu ra mong muốn

- Danh sách lỗi theo CVSS, kèm cách tái hiện.
- Kiểm lại sau khi sửa.
- Thư xác nhận phạm vi đã kiểm, dùng được khi nộp hồ sơ cho đối tác hoặc ngân hàng.

## Đã tự rà và sửa ngày 23/10/2026 (để bên kiểm biết điểm xuất phát)

| Mức | Phát hiện | Đã làm |
|---|---|---|
| Cao | Kế toán một cơ sở thấy số của cả công ty | RLS RESTRICTIVE + lọc ở trợ lý + chặn thao tác theo mã + chặn tờ khai |
| Trung bình | Hai hàm SECURITY DEFINER mới còn mở cho `anon` | `REVOKE ... FROM public, anon` (test `cong-gac` bắt được) |
| Trung bình | Nội dung chuyển khoản gửi mô hình có thể chứa số tài khoản, số điện thoại | Che dãy ≥ 6 chữ số (`anSo`) |
| Thấp | Hai lần đọc `revenue_classifications` theo `transaction_id` thiếu lọc `company_id` (mã đã được kiểm trước đó) | Thêm `.eq("company_id")` để phòng thủ nhiều lớp |
| Thấp, **còn mở** | Nhãn nguồn `suggestion_source = 'model'` dựa trên `goi_y_ai` do trình duyệt gửi, nên có thể bị giả | Loại được ghi vẫn do người chọn; cần đối chiếu với đề xuất đã lưu trong `hoi_thoai_tro_ly` |
| Thấp, **còn mở** | Tên người trong nội dung chuyển khoản vẫn có thể tới mô hình | Chưa có cách che chắc chắn; cân nhắc tắt AI cho công ty không đồng ý |
