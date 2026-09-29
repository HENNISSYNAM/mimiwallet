# Đóng vòng phản hồi khách hàng — học Filum (29/09/2026)

Cơ chế lấy từ cách Filum làm cho Hoàng Hà Mobile: **hỏi đúng lúc, gom một chỗ, đóng vòng có thời hạn**. MIMI
còn nhỏ nên không dựng lại Filum — chỉ giữ cơ chế. Nói chuyện trực tiếp với 3–5 kế toán dịch vụ vẫn là cách
nghe khách tốt nhất; bốn câu hỏi dưới đây giữ cho việc nghe tiếp tục khi số người tăng.

## Bốn câu hỏi, mỗi lần một câu, đúng lúc

| Mã | Khi nào hiện | Câu hỏi | Trả lời |
|---|---|---|---|
| `sao_ke_khop` | Nhập sao kê xong, có dòng mới | Số giao dịch MIMI vừa đọc có khớp sao kê của bạn không? | Khớp / Không khớp (+ vướng ở đâu) |
| `doanh_thu_dung` | Đồng hồ ngưỡng có doanh thu | Con số doanh thu này có đúng như bạn nghĩ không? | Đúng / Cao hơn thực tế / Thấp hơn thực tế (+ vướng ở đâu) |
| `doi_soat_de_kho` | Xử lý hết ngoại lệ chứng từ của quý | Đối soát chứng từ quý này với MIMI dễ hay khó? | 1–5 (1–3 hỏi thêm vướng ở đâu) |
| `sean_ellis` | Máy này đã thấy công ty ≥ 14 ngày | Nếu từ mai không dùng MIMI được nữa, bạn thấy thế nào? | Rất / Hơi / Không thất vọng |

Mỗi câu hỏi một lần cho mỗi công ty trên một máy; bấm ✕ là không hỏi lại. Mã: `src/lib/phanHoi.ts`,
`src/components/phan-hoi/CauHoiNhanh.tsx`. Bảng: `phan_hoi_khach` (người dùng chỉ ghi; không ai đọc qua API).

## Quy tắc đóng vòng

1. **Mỗi ngày** chạy truy vấn "chưa đọc" bên dưới (SQL editor của Supabase, hoặc `npx supabase db query --linked -f`).
2. Phản hồi xấu (`khong_khop`, `cao_hon_thuc_te`, `thap_hon_thuc_te`, điểm 1–3, `khong_that_vong`) phải **được đọc
   trong 24 giờ**: ghi `da_doc_luc`.
3. Sửa được → ghi `xu_ly` (đã làm gì, commit nào) và `dong_vong_luc`, rồi **báo lại đúng người đó** trong app.
4. Không sửa được ngay → vẫn ghi `xu_ly` (vì sao, khi nào), và vẫn báo lại người đó.

## Truy vấn

```sql
-- Chưa đọc, cũ nhất trước
select id, tao_luc, cau_hoi, tra_loi, diem, ghi_chu, trang, company_id
from phan_hoi_khach where da_doc_luc is null order by tao_luc;

-- Đánh dấu đã đọc / đã đóng vòng
update phan_hoi_khach set da_doc_luc = now() where id = '<id>';
update phan_hoi_khach set xu_ly = '<đã làm gì>', dong_vong_luc = now() where id = '<id>';

-- Chỉ số hằng tuần
select cau_hoi, tra_loi, count(*) from phan_hoi_khach group by 1, 2 order by 1, 3 desc;
select round(100.0 * count(*) filter (where tra_loi = 'rat_that_vong') / nullif(count(*), 0), 1) as sean_ellis_pct
from phan_hoi_khach where cau_hoi = 'sean_ellis';                      -- đạt khi ≥ 40
select round(100.0 * count(*) filter (where tra_loi = 'dung') / nullif(count(*), 0), 1) as doanh_thu_dung_pct
from phan_hoi_khach where cau_hoi = 'doanh_thu_dung';
select round(avg(diem), 2) as de_kho_tb from phan_hoi_khach where cau_hoi = 'doi_soat_de_kho';
select count(*) filter (where dong_vong_luc is not null) as da_dong, count(*) as tong from phan_hoi_khach;
```

Tỷ lệ trả lời: so số dòng mỗi câu với số lần điểm chạm xảy ra (ví dụ số lần nhập sao kê có dòng mới).
