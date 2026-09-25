# Nộp tờ khai thay người dùng qua TVAN — dữ liệu đã cào

Ngày 25/09/2026. Chủ dự án cho phép nộp thay (xem bộ nhớ `mimi-nop-thay-qua-tvan`). Tài liệu này ghi
**những gì đã tìm được bằng nguồn thật**, và chỗ nào vẫn còn trống. Không có gì ở đây là suy đoán
không ghi nguồn.

## Tóm tắt

| Chỗ thiếu | Trước khi cào | Sau khi cào |
|---|---|---|
| 1. Mẫu XML tờ khai | Chưa có | **Nội dung đã có**, **mã hoá XML chưa có** — xem mục 1 |
| 2. Chữ ký số trên XML | Tưởng dùng eSign của Cas | **eSign của Cas KHÔNG dùng được** (chỉ ký PDF). Cần dịch vụ ký số từ xa ký XML — xem mục 2 |
| 3. Biết tờ khai được nhận hay bị từ chối | Tưởng Cas không có | **Có**: `GET /tvan/get?messageId=` — xem mục 3 |
| (thêm) Đối chiếu với số đã nộp | — | **Có**: `GET /gdt/financial-statements` lấy báo cáo KQHĐKD đã nộp từ eTax — xem mục 4 |

---

## 1. Mẫu tờ khai và định dạng XML

**Nội dung mẫu — đã có trong MIMI.** `supabase/functions/_shared/luat/to-khai.ts` soạn đúng hai mẫu
01/TKN-CNKD và 01/CNKD theo **Thông tư 50/2026/TT-BTC**, thông tư thay bốn mẫu của Thông tư 18/2026
(Điều 3). Tên và mã chỉ tiêu chép từ kho Công báo MIMI đã cào.

> Lưu ý: nhiều trang hướng dẫn trên mạng (MISA, Fast, Thư viện Pháp luật) vẫn nói Thông tư 18/2026.
> Chúng đi sau văn bản. Nguồn đúng là Công báo, và MIMI đã theo Thông tư 50.

**Mã hoá XML — chưa có.** Tờ khai nộp điện tử là tệp XML theo lược đồ XSD của Cục Thuế. Tìm kiếm
cho thấy:
- Lược đồ XSD **không được công bố thành tài liệu riêng**; nó nằm trong bộ cài phần mềm HTKK
  (bản mới nhất tìm thấy: 5.7.2). Lỗi "Tờ khai không đúng định dạng với XSD" là lỗi hay gặp nhất
  khi nộp — nghĩa là cổng thuế kiểm XSD chặt.
- Sau 01/07/2025 cổng thuế yêu cầu nhập trực tiếp hoặc dùng phần mềm kế toán được Cục Thuế chấp
  nhận (theo Thông tư 40/2025/TT-BTC, nguồn: congtyluatacc.vn). **Cần kiểm: MIMI có phải đăng ký là
  phần mềm được chấp nhận không, hay đi qua TVAN của Cas là đủ.**

Ba cách lấy lược đồ, xếp theo độ chắc:
1. **Hỏi Casso** một tệp XML mẫu hợp lệ cho `/tvan/tax-return/send` — họ dựng API nên phải có.
2. Một tệp XML thật xuất từ HTKK hoặc eTax cho mẫu 01/CNKD bản Thông tư 50 (không cần số thật —
   tờ khai trống cũng đủ để thấy cấu trúc thẻ).
3. Tải bộ cài HTKK từ gdt.gov.vn và lấy tệp XSD ra (không chạy bộ cài). Cần anh cho phép tải.

## 2. Chữ ký số

**Đính chính:** trước đây tôi đề xuất dùng eSign của Cas. Sai. Mọi API eSign của Cas đều nhận và trả
**PDF** (`/esign/request-document` nhận tệp PDF ≤10MB; `/esign/download-file` trả PDF). Tờ khai nộp qua
TVAN là **XML** (`/tvan/tax-return/send` nhận `{ xml }`). eSign của Cas không ký được tờ khai.

Tờ khai XML cần chữ ký số XML của **chứng thư số của người nộp**. Không có USB token của khách thì
đường khả thi là **ký số từ xa** (remote signing) có API ký XML — có ít nhất:
- **Viettel MySign** (Viettel-CA, đã được cấp phép dịch vụ ký số từ xa; có API ký đồng bộ và bất đồng bộ)
- **VNPT SmartCA**

Chọn nhà cung cấp là việc ký hợp đồng — **anh quyết**. Người dùng cũng phải tự có chứng thư số
(mua từ nhà cung cấp đó); MIMI không cấp và không giữ khoá ký.

**Ghi chú cho lúc dùng eSign (ký PDF, ví dụ hợp đồng):** `identityKey` trong webhook SIGN là thứ duy
nhất tải được PDF đã ký — hạn 1 ngày, tối đa 5 lần, **không cấp lại**. `cas-webhook` hiện ẩn nó khỏi
nhật ký (đúng). Khi bật eSign, handler phải tải PDF ngay hoặc lưu khoá đã mã hoá (`pqcCrypto`), không
lưu thô.

## 3. Trạng thái tờ khai sau khi nộp

`GET /tvan/get?messageId=<mã thông điệp>` (cần `Authorization` của grant) trả `tvanMessage`:
- `messageId`, `tvanMessageId`, `messageTypeCode`, `taxCode`, `requestXml`, `tvanReceivedAt`
- `taxAuthorityResponses[]`: mỗi phản hồi của cơ quan thuế có `messageTypeCode`, `message`,
  `xmlReceive`, `status` (số), `createdAt`, và `reasons[]` gồm `errorCode`, `errorMessage`,
  **`handlingInstructions`** (hướng xử lý), `note`.

Webhook TVAN chỉ báo "có cập nhật" kèm `messageId`; nhận webhook rồi gọi API này — đúng nguyên tắc
"payload là gợi ý, hỏi lại Cas". **Chưa biết:** các giá trị của `status` nghĩa là gì — phải hỏi Casso,
không được đoán. Không bao giờ nói "đã nộp thành công" trước khi có phản hồi chấp nhận của cơ quan thuế.

## 4. Thêm: báo cáo đã nộp từ eTax

`GET /gdt/financial-statements?fromYear=&toYear=` trả Kết quả hoạt động kinh doanh đã nộp, năm hiện
tại và năm trước: `grossRevenue`, `netRevenue`, `costOfGoodsSold`, `sellingExpenses`,
`totalProfitBeforeTax`, `taxableIncome`, `corporateIncomeTaxPayable`… Dùng để đối chiếu doanh thu
MIMI tính với số đã nộp cho cơ quan thuế. Áp dụng cho doanh nghiệp nộp báo cáo tài chính, không cho
hộ kinh doanh.

## Còn chặn

1. Tệp XML mẫu cho mẫu 01/CNKD bản Thông tư 50 (mục 1).
2. Chọn nhà cung cấp ký số từ xa và ký hợp đồng (mục 2).
3. Ý nghĩa các giá trị `status` trong `taxAuthorityResponses` (mục 3).
4. MIMI có cần đăng ký là phần mềm được Cục Thuế chấp nhận không (mục 1).

## Câu hỏi gửi Casso (soạn sẵn, anh gửi)

> Chào anh chị Casso, MIMI chuẩn bị tích hợp nộp tờ khai thuế hộ kinh doanh qua TVAN. Nhờ anh chị
> giúp bốn điểm:
> 1. `/tvan/tax-return/send` nhận XML theo lược đồ nào? Anh chị có tệp XML mẫu hợp lệ cho tờ khai
>    01/CNKD (Thông tư 50/2026/TT-BTC) không?
> 2. XML gửi lên phải được người nộp ký số sẵn, hay Cas/TVAN có bước ký? Nếu phải ký sẵn, Cas có
>    tích hợp ký số từ xa (MySign, SmartCA…) để ký XML không? `/esign` hiện chỉ ký PDF.
> 3. Trong `GET /tvan/get`, `taxAuthorityResponses[].status` có những giá trị nào, mỗi giá trị nghĩa
>    là gì (đã tiếp nhận / chấp nhận / không chấp nhận…)?
> 4. `tax-return/send` chỉ dùng x-client-id và x-secret-key, không có grant của người dùng. Vậy
>    Cas xác định người nộp và quyền nộp thay bằng cách nào?
> Cảm ơn anh chị.

## Nguồn

- Cas: `cas.so/product/tvan`, `/general/api/tvan-get-message`, `/general/api/tvan-tax-return-send`,
  `/general/api/esign-request-document`, `/general/api/esign-request-status`,
  `/general/api/esign-signing-round`, `/general/api/esign-download-file`, `/general/api/gdt-etax` (đọc 25/09/2026)
- Mẫu 01/CNKD và lịch nộp: fast.com.vn, misaeshop.vn, thuvienphapluat.vn (đi sau Thông tư 50 — chỉ dùng để tham khảo quy trình)
- Lỗi XSD: esign.misa.vn, helphkd.misa.vn; Thông tư 40/2025: congtyluatacc.vn
- Ký số từ xa: viettel-ca.vn
