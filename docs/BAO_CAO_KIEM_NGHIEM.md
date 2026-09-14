# Báo cáo kiểm nghiệm lớp kiểm soát agent

> Tự sinh bởi `npm run kiem-nghiem` lúc 23:04:52 14/9/2026 (giờ Việt Nam). Không sửa tay — chạy lại lệnh.
> Phương pháp: eval như unit test, bộ case vàng soát theo chính sách đúng, lỗi thật thành case
> (học từ Ramp, builders.ramp.com). Tầng 3 chỉ đọc production, không ghi dữ liệu thử.

| Tầng | Kết quả |
|---|---|
| 1. Bộ case vàng — bộ luật chi | Đạt · 49/49 case |
| 2. Test tự động — luật, cổng agent, MCP | Đạt · 139/139 test |
| 3. Dò production chỉ-đọc | Đạt · 5/5 phép dò |

## 1. Bộ case vàng

**49/49 case đạt (100,0%)** · độ phủ mã lý do: 20/20

| Nhóm | Đạt | Tổng |
|---|---|---|
| Tự duyệt và ngưỡng duyệt | 5 | 5 |
| Hạn mức tiền | 6 | 6 |
| Người nhận | 7 | 7 |
| Chống lừa đảo chuyển khoản | 9 | 9 |
| Tần suất (agent chạy vòng lặp) | 6 | 6 |
| Dữ liệu yêu cầu sai | 11 | 11 |
| Trạng thái agent và chính sách | 5 | 5 |

<details><summary>Toàn bộ case</summary>

| Case | Nhóm | Mô tả | Nguồn | Kỳ vọng | Thực tế | Mã lý do |
|---|---|---|---|---|---|---|
| V01 | tu_duyet | Trong hạn mức, người nhận quen, dưới ngưỡng → tự duyệt | thiet-ke | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| V02 | tu_duyet | Đúng bằng ngưỡng duyệt 2.000.000đ → vẫn tự duyệt ("trên" là trên) | bien | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| V03 | tu_duyet | Trên ngưỡng 1 đồng → chờ người duyệt | bien | cho_duyet | cho_duyet | TREN_NGUONG_DUYET |
| V04 | tu_duyet | Ngưỡng 0 = mọi khoản phải duyệt (mặc định chặt) | thiet-ke | cho_duyet | cho_duyet | TREN_NGUONG_DUYET |
| V05 | tu_duyet | Nhóm chi bị giới hạn nhưng yêu cầu đúng nhóm → tự duyệt | thiet-ke | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| H01 | han_muc | Vượt trần mỗi lần → từ chối | thiet-ke | tu_choi | tu_choi | VUOT_HAN_MUC_MOI_LAN |
| H02 | han_muc | Chạm đúng trần ngày tính cả khoản đang giữ chỗ → vẫn được | bien | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| H03 | han_muc | Vượt trần ngày 1 đồng → từ chối | bien | tu_choi | tu_choi | VUOT_HAN_MUC_NGAY |
| H04 | han_muc | Vượt trần tháng → từ chối | thiet-ke | tu_choi | tu_choi | VUOT_HAN_MUC_THANG |
| H05 | han_muc | Vượt trần mà cũng trên ngưỡng → TỪ CHỐI, không đẩy sang người duyệt | thiet-ke | tu_choi | tu_choi | VUOT_HAN_MUC_MOI_LAN |
| H06 | han_muc | Vượt cả ngày lẫn tháng → nói cả hai lý do một lần | thiet-ke | tu_choi | tu_choi | VUOT_HAN_MUC_NGAY, VUOT_HAN_MUC_THANG |
| N01 | nguoi_nhan | Người lạ, chính sách chỉ cho người trong danh sách → từ chối | thiet-ke | tu_choi | tu_choi | NGUOI_NHAN_CHUA_DUYET |
| N02 | nguoi_nhan | Người lạ, chính sách mở → chờ người xác nhận | thiet-ke | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| N03 | nguoi_nhan | Cùng số tài khoản nhưng khác ngân hàng là người khác | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| N04 | nguoi_nhan | Người nhận vừa thêm 2 giờ trước → chưa được tự duyệt | lua-dao | cho_duyet | cho_duyet | NGUOI_NHAN_MOI_THEM |
| N05 | nguoi_nhan | Thêm đúng 24 giờ trước → hết thời gian giữ, tự duyệt | bien | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| N06 | nguoi_nhan | Thêm 23 giờ 59 phút trước → vẫn giữ | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI_THEM |
| N07 | nguoi_nhan | Dữ liệu cũ không có mốc thêm → không giữ | thiet-ke | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| L01 | chong_lua_dao | "Nhà cung cấp đổi số tài khoản": cùng tên, tài khoản lạ → chờ duyệt + cảnh báo | lua-dao | cho_duyet | cho_duyet | NGUOI_NHAN_MOI, DOI_SO_TAI_KHOAN |
| L02 | chong_lua_dao | Tên viết không dấu, khác hoa thường vẫn bị bắt | lua-dao | cho_duyet | cho_duyet | NGUOI_NHAN_MOI, DOI_SO_TAI_KHOAN |
| L03 | chong_lua_dao | Tài khoản đã trong danh sách hơn 24 giờ → chủ đã kiểm, không cảnh báo | thiet-ke | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| L04 | chong_lua_dao | Tài khoản mới thêm 3 giờ, cùng tên có tài khoản cũ khác → giữ + cảnh báo | lua-dao | cho_duyet | cho_duyet | NGUOI_NHAN_MOI_THEM, DOI_SO_TAI_KHOAN |
| L05 | chong_lua_dao | Tên khác hẳn → không cảnh báo đổi tài khoản | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| L06 | chong_lua_dao | Không có tên người nhận → không so | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| L07 | chong_lua_dao | Chính sách chặt + đổi tài khoản → vẫn từ chối, cảnh báo không làm nhẹ đi | thiet-ke | tu_choi | tu_choi | NGUOI_NHAN_CHUA_DUYET |
| L08 | chong_lua_dao | Tên quá ngắn ("AB") → không so, tránh trùng nhầm | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| L09 | chong_lua_dao | Lịch sử chỉ có chính tài khoản đang xin → không phải đổi | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| T01 | tan_suat | 29 yêu cầu trong giờ qua, trần 30 → yêu cầu thứ 30 vẫn được | bien | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| T02 | tan_suat | 30 yêu cầu trong giờ qua → thứ 31 bị từ chối | bien | tu_choi | tu_choi | VUOT_TAN_SUAT |
| T03 | tan_suat | Không giới hạn (null) → 5.000 yêu cầu vẫn không chặn | thiet-ke | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| T04 | tan_suat | Trần 1 mỗi giờ, chưa gửi gì → được | bien | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| T05 | tan_suat | Trần 1 mỗi giờ, đã gửi 1 → từ chối | bien | tu_choi | tu_choi | VUOT_TAN_SUAT |
| T06 | tan_suat | Vòng lặp khoản lớn → từ chối, không thành chờ duyệt | thiet-ke | tu_choi | tu_choi | VUOT_TAN_SUAT |
| D01 | du_lieu | Số tiền 0 | thiet-ke | tu_choi | tu_choi | SO_TIEN_KHONG_HOP_LE |
| D02 | du_lieu | Số tiền lẻ thập phân | thiet-ke | tu_choi | tu_choi | SO_TIEN_KHONG_HOP_LE |
| D03 | du_lieu | Số tiền âm | thiet-ke | tu_choi | tu_choi | SO_TIEN_KHONG_HOP_LE |
| D04 | du_lieu | Mã ngân hàng không nhận ra | thiet-ke | tu_choi | tu_choi | NGAN_HANG_KHONG_RO |
| D05 | du_lieu | Số tài khoản có chữ | thiet-ke | tu_choi | tu_choi | SO_TAI_KHOAN_KHONG_HOP_LE |
| D06 | du_lieu | Số tài khoản 5 số (dưới 6) | bien | tu_choi | tu_choi | SO_TAI_KHOAN_KHONG_HOP_LE |
| D07 | du_lieu | Số tài khoản đúng 19 số là hợp lệ | bien | cho_duyet | cho_duyet | NGUOI_NHAN_MOI |
| D08 | du_lieu | Mục đích dưới 5 ký tự | thiet-ke | tu_choi | tu_choi | THIEU_MUC_DICH |
| D09 | du_lieu | Mục đích hỏng mã hoá (U+FFFD) — chuỗi thật từng lọt vào sổ | loi-that 10/09/2026 | tu_choi | tu_choi | MUC_DICH_LOI_MA_HOA |
| D10 | du_lieu | Nhóm chi không có trong danh mục | thiet-ke | tu_choi | tu_choi | NHOM_CHI_KHONG_RO |
| D11 | du_lieu | Nhóm chi có trong danh mục nhưng agent không được phép | thiet-ke | tu_choi | tu_choi | NHOM_CHI_KHONG_DUOC_PHEP |
| S01 | trang_thai | Agent tạm dừng | thiet-ke | tu_choi | tu_choi | TAC_TU_TAM_DUNG |
| S02 | trang_thai | Agent đã thu hồi | thiet-ke | tu_choi | tu_choi | TAC_TU_DA_THU_HOI |
| S03 | trang_thai | Chính sách hết hạn đúng thời điểm xét | bien | tu_choi | tu_choi | CHINH_SACH_HET_HAN |
| S04 | trang_thai | Chính sách hết hạn ngày mai → vẫn chạy | bien | tu_dong_duyet | tu_dong_duyet | TRONG_CHINH_SACH |
| S05 | trang_thai | Nhiều lỗi cùng lúc → nói hết trong một lần trả lời | thiet-ke | tu_choi | tu_choi | TAC_TU_TAM_DUNG, SO_TIEN_KHONG_HOP_LE, NHOM_CHI_KHONG_RO |

</details>

## 2. Test tự động

| Tệp | Đạt | Tổng |
|---|---|---|
| _shared/tac-tu/chinh-sach-an-toan.test.ts | 15 | 15 |
| _shared/tac-tu/chinh-sach.test.ts | 21 | 21 |
| _shared/tac-tu/khoa.test.ts | 6 | 6 |
| _shared/tac-tu/khop-chi.test.ts | 8 | 8 |
| _shared/mcp/may-chu.test.ts | 18 | 18 |
| _shared/tac-tu/eval/bo-case-vang.test.ts | 55 | 55 |
| _shared/tac-tu/eval/cong-tac-tu.test.ts | 16 | 16 |

## 3. Dò production chỉ-đọc

Đích: `https://xzymxgdavepvygdcmfup.supabase.co`

| Phép dò | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|
| MCP liệt kê công cụ khi chưa có khoá | 200, đủ 4 công cụ | 200, xem_chinh_sach, xin_chi, xem_yeu_cau, tra_ma_ngan_hang | Đạt |
| MCP gọi xin_chi khi chưa có khoá | bị chặn, không chạy | 200, isError=true | Đạt |
| MCP không mở luồng GET | 405 | 405 | Đạt |
| Cổng tac-tu với khoá agent sai khuôn | 401 | 401 KHOA_SAI | Đạt |
| Cổng tac-tu không có khoá, không đăng nhập | 401 | 401 | Đạt |
