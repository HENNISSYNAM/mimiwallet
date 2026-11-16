# MIMI × UOB FinLab: tìm chủ doanh nghiệp đang giàu lên mà ngân hàng chưa thấy

Mô tả kỹ thuật, 16/11/2026. Module: `supabase/functions/_shared/gioi-thieu-ngan-hang/`, edge function `gioi-thieu-ngan-hang`, migration `20261116090000_gioi_thieu_ngan_hang.sql`, trang `/dashboard/co-hoi`.

**Nhóm khách MIMI nhắm tới.** Đó là chủ hộ kinh doanh và doanh nghiệp nhỏ đang lên. Ngân hàng không thấy họ giàu lên vì tiền bán hàng, tiền vay và tiền người nhà trộn chung trong tài khoản cá nhân. MIMI đã có dòng tiền ngân hàng của họ ở dạng làm sạch, với sự đồng ý của chủ: tách tiền bán hàng khỏi tiền vay, góp vốn và chuyển nội bộ. Từ đó MIMI có doanh thu năm dạng khoảng, dự báo dòng tiền và dữ liệu nhiều cơ sở. MIMI không dùng dữ liệu nội bộ của ngân hàng.

**Nguyên tắc pháp lý (đã viết thành mã).**

- Theo Luật Bảo vệ dữ liệu cá nhân 2025 và NĐ 356/2025:
  - MIMI không bán dữ liệu và không gửi danh sách người cho ngân hàng.
  - Màn đồng ý nói rõ rằng MIMI phân tích dữ liệu ngân hàng để tính dấu hiệu tăng trưởng (lập hồ sơ).
  - Không có ô nào được đánh dấu sẵn cho phần "đã đọc".
- Gói giới thiệu mặc định chỉ có **mức tăng trưởng và nhóm nhu cầu**. Số liệu thật, tên và liên hệ chỉ đi kèm khi chủ tự tích.
- Theo NĐ 91/2020: thông tin liên hệ chỉ được chọn khi chủ bấm "muốn ngân hàng liên hệ". Không bấm thì không ai gọi.
- Gói chỉ dành cho **pháp nhân của ngân hàng tại Việt Nam**. Cột `pham_vi_lanh_tho` bị ràng buộc CHECK = `viet_nam`, nên dữ liệu không được chuyển ra nước ngoài.
- Đây không phải thông tin tín dụng hay điểm tín dụng theo NĐ 58/2021. MIMI không đưa lời khuyên đầu tư: danh mục gói không có nhóm đầu tư hay bảo hiểm, và gói nào có tên giống sản phẩm đầu tư sẽ bị loại.
- Mô hình thương mại đề xuất: ngân hàng trả **phí SaaS cố định** cho công cụ. MIMI không thu phí theo từng khách được giới thiệu, vì tính hợp pháp của phí giới thiệu chưa được xác minh.

## Đối chiếu với 4 mảng của thử thách

| Mảng | Đã làm trong mã |
|---|---|
| **01 Nhận diện khách tiềm năng** | `tin-hieu.ts` tính 11 dấu hiệu, mỗi dấu hiệu có giá trị, bằng chứng (tháng, số khoản, không có tên người), độ tin cậy, lời giải thích tiếng Việt và tiếng Anh. Mức tăng trưởng của **doanh nghiệp** gồm: Chưa đủ dữ liệu / Ổn định / Mới tăng trưởng / Đang lên / Sẵn sàng mở rộng. Luật xếp mức ghi trong `LUAT_MUC`, có phiên bản `mimi-dau-hieu-tang-truong-2026.11.16`, kết quả tất định. |
| **02 Nhu cầu và sự kiện** | Có các dấu hiệu sự kiện: vượt hoặc sắp vượt ngưỡng 01 tỷ / 03 tỷ (theo dự báo), mở cơ sở mới, tiền vào lớn không phải doanh thu, giải ngân và trả nợ, quỹ lương tăng, dòng tiền ngoại tệ hoặc liên quan Hàn Quốc, tiền dư đọng lại, khoảng trống vốn lưu động theo mùa. `khop-goi.ts` ánh xạ dấu hiệu sang 6 nhóm nhu cầu: vốn lưu động, tài khoản và quản lý dòng tiền, ngoại tệ, tiền gửi, ưu tiên cho chủ, bảo hiểm. Nhóm bảo hiểm chỉ được nêu, không ghép gói. |
| **03 Ghép gói (CVP)** | Danh mục gói lấy từ bảng cấu hình `goi_ngan_hang`, dùng được cho bất kỳ ngân hàng nào. Dữ liệu UOB Việt Nam có sẵn: Privilege Banking (≥ 1 tỷ số dư bình quân), thẻ PRVI Miles (thu nhập ≥ 35 triệu/tháng, chỉ cho người ở TP.HCM và Hà Nội), tài khoản doanh nghiệp và UOB Infinity, hạn mức ngắn hạn và tài trợ thương mại, ngoại hối, FDI Advisory (bàn Hàn Quốc). Các gói này đã đối chiếu với trang công khai và có URL nguồn. Gói tiền gửi doanh nghiệp còn ở dạng nháp, **chưa xác minh**. Gói chưa xác minh không bao giờ hiện ngưỡng (có CHECK trong CSDL và kiểm thêm trong mã). Điều kiện về số dư hay thu nhập cá nhân thì MIMI không thấy, nên ghi "ngân hàng tự kiểm". |
| **04 Bước tiếp theo** | `hanh-dong.ts` chọn kênh: văn phòng kế toán (chỉ khi công ty có kế toán), thẻ nhắc trong MIMI (sau hạn khai thuế quý hoặc một tháng trước tháng dự kiến vượt ngưỡng), hoặc gặp chuyên viên ngân hàng **khi chủ yêu cầu**. Giá trị kỳ vọng = độ tin cậy × độ mạnh nhu cầu × độ hợp kênh. Đây là quy tắc kinh nghiệm, chưa hiệu chỉnh. Văn phòng kế toán xem được mức tăng trưởng của từng khách (`tong_hop_van_phong`) nhưng không thấy số tiền. |

**Luồng đồng ý.**

1. Chủ bấm "Tôi quan tâm" trên một gói.
2. Chủ đọc công bố, chọn trường, chọn thời hạn (7–90 ngày) và tích "đã đọc".
3. Hệ thống ghi `dong_y_gioi_thieu` trước, rồi mới ghi `gioi_thieu_ngan_hang` ở trạng thái `draft`. Gói chứa đúng các trường đã chọn và có sha256. CSDL bắt buộc mỗi gói phải có một đồng ý của cùng công ty (khoá ngoại ghép).
4. Khi chủ bấm **Gửi**, trạng thái chuyển sang `sent_by_owner` và gói được xuất ra (văn bản + JSON). Mã không gọi HTTP tới ngân hàng.
5. Khi chủ **rút lại**, trạng thái chuyển sang `withdrawn` và nội dung gói bị xoá, chỉ giữ mã băm.

Chỉ chủ sở hữu hoặc quản trị được thao tác. Kế toán bị giới hạn vào một cơ sở thì bị từ chối, cả ở máy chủ lẫn ở RLS (`la_chu_quan_tri_ca_cong_ty`).

## Đã có và chưa có

| Phần | Hôm nay | Cần thí điểm |
|---|---|---|
| Dấu hiệu, mức tăng trưởng, nhu cầu, bước tiếp theo | Có mã và test trên dữ liệu tổng hợp (ngưỡng, cơ sở mới, lương, tiền dư, tất định) | Hiệu chỉnh ngưỡng `NGUONG_TH` và hệ số `HOP_KENH` trên dữ liệu thật; đo tỉ lệ chuyển đổi |
| Đồng ý, gói, gửi, rút lại, RLS | Có mã, có test (cần đồng ý trước, chỉ đúng trường, chéo công ty, thành viên cơ sở) | Ý kiến pháp lý về NĐ 356 (DPO, hồ sơ đánh giá tác động) và về hợp đồng với ngân hàng |
| Danh mục UOB | 6 gói đã đối chiếu trang công khai, 1 gói nháp | UOB xác nhận tên gói, điều kiện và kênh nhận gói |
| Chuyển gói tới ngân hàng | Chủ tự gửi gói đã xuất | Kênh nhận tại UOB Việt Nam (email hoặc API) do hai bên thống nhất |
| Quy mô thị trường | Chưa có số chính thức về số hộ vượt 01 tỷ hay 03 tỷ, nên tài liệu không nêu con số | Lấy số từ cơ quan thuế khi có |
| Chưa nhìn thấy | Tiền mặt, tài khoản chưa kết nối, số dư tài khoản | Không đoán: các dấu hiệu nói rõ phần nào MIMI không thấy |
