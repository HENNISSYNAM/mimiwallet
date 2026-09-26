# Prompt 5 — Lớp thực thi có kiểm soát (26/09/2026)

Chuỗi: chuẩn bị → kiểm → người xác nhận → thực thi → nhận trạng thái ngoài → kiểm chứng → đối soát → xong.

## Kiểm toán trước khi làm

| Kênh | Tình trạng | Căn cứ |
|---|---|---|
| Nộp tờ khai qua TVAN (Cas) | **Chưa hỗ trợ** | Chưa có XSD tờ khai (cần bộ HTKK), chưa có dịch vụ ký số XML từ xa, chưa rõ yêu cầu đăng ký phần mềm với Cục Thuế — `NOP_THAY_TVAN.md` |
| Ký tờ khai XML | **Chưa hỗ trợ** | eSign của Cas chỉ ký PDF |
| Ký văn bản PDF (Cas eSign) | Chỉ sandbox, cờ tắt | API có tài liệu, chưa thử sandbox; không ký văn bản thật |
| Trạng thái hoá đơn (Invoice Hub) | **Chưa hỗ trợ** | MIMI chưa phát hành hoá đơn qua Invoice Hub |
| Người dùng tự nộp, MIMI theo dõi | **Chạy** | Không gọi mạng nào; MIMI khoá phiên bản, ghi biên nhận và kết quả do người dùng khai |

## Đã làm

| Mục | Ở đâu |
|---|---|
| A, B. Mô hình + máy trạng thái (12 trạng thái, không đi tắt) | `_shared/thuc-thi/may-trang-thai.ts`; trigger CSDL `thuc_thi_bao_ve` (đã thử trên DB thật) |
| C. Cổng xác nhận gắn phiên bản + mã băm; tài liệu đổi → xác nhận mất hiệu lực | `xacNhanConHieuLuc`, `xacNhanNop` |
| D. Gói nộp bất biến | trigger chặn sửa sau khi gửi; tài liệu chuyển `submitted` (trigger tài liệu khoá) |
| E. Bộ chuyển nhà cung cấp; bộ giả lập không dùng được ngoài test | `nha-cung-cap.ts` |
| F. Sổ năng lực + cờ tính năng | `nang-luc.ts` |
| G. Xung đột hoá đơn (hàm), sự kiện ngoài chuẩn hoá, webhook là gợi ý | `su-kien-ngoai.ts`; bảng `xung_dot_hoa_don` |
| J. Hồ sơ việc ↔ tài liệu ↔ nộp | nộp xong → bước hành trình chờ bên ngoài; chấp nhận → đóng hồ sơ việc; không chấp nhận → hồ sơ việc lên "gấp" |
| K. Trung tâm "Nộp & theo dõi" | `components/tai-lieu/NopVaTheoDoi.tsx` trong Tài liệu & Chứng từ |
| L. Trợ lý: "Nộp hồ sơ này giúp tôi", "Hồ sơ tới đâu rồi", "Ký văn bản này" | `tinh-toan.ts`, `y-dinh.ts` |
| Chống trùng, thử lại an toàn, quá hạn khi đã nộp đúng hạn | `khoaChongTrung` + chỉ mục duy nhất; `thuLaiDuoc`; `quaHan` |
| O. RLS: thành viên đọc, chỉ máy chủ ghi; xác nhận chỉ chủ / quản trị | migration `20260926100000_thuc_thi.sql`; `tro-ly` |

## Chưa làm — cần quyết định hoặc dữ liệu

- **H. Nộp qua TVAN, tra `GET /tvan/get`**: chờ XSD (HTKK 5.7.7), hợp đồng ký số XML (MySign / SmartCA), và mẫu XML thông báo của cơ quan thuế để viết bộ đọc.
- **I. Ký PDF qua eSign**: chờ thử ở sandbox; khi bật phải tải PDF đã ký ngay (identityKey hết hạn 1 ngày, 5 lần).
- **M. Thông báo đẩy khi có kết quả**: kết quả hiện do người dùng tự ghi nên chưa có sự kiện bên ngoài để báo.
- **Biên nhận dạng tệp (mục 23)**: kênh tự nộp mới lưu mã biên nhận dạng chữ; chưa có chỗ tải ảnh / PDF biên nhận.
