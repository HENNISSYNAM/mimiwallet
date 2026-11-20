# Quầy Tin — Thiết kế

## Tổng thể

```
 Thu ngân (điện thoại / máy tính bảng ở quầy)
   │  ảnh bill            │ đơn POS (VietQR mã MIMIxxxx)
   ▼                      ▼
 [Agent Soát Bill]     [POS có sẵn: khopBanHangPos]
   │ AI thị giác (Bedrock) │
   ▼                      │
 [Agent Đối Chiếu] ◄──────┘  ◄── tiền vào thật (BankHub/Cas webhook → transactions)
   │  xanh / vàng / vàng-lệch / đỏ / không đọc được
   ▼
 [Loa]  đọc to + màu toàn màn hình
   │
   ▼ (đỏ, lệch)
 [Hàng chờ duyệt] ── chủ / kế toán quyết ──► nhat_ky_quyet_dinh

 [Agent Soát Chi] (tro-ly: kiem_truoc_khi_chuyen, mở lại) ── "Nên giữ lại" ──► Hàng chờ duyệt
```

Ba agent có danh tính riêng (`soat_bill`, `doi_chieu`, `soat_chi`), quyền chỉ ĐỌC, và không agent nào có công cụ chi tiền (N3).

## Thành phần mới

### 1. Luật thuần `supabase/functions/_shared/soat-bill/`
- `doc-bill.ts` — dựng prompt, kiểm và chuẩn hoá JSON mô hình trả về thành `BillDoc`:
  `{ la_bill, so_tien, tk_nhan_cuoi (4 số), ten_nhan, ngan_hang_gui, thoi_diem (ISO, giờ VN), noi_dung, ma_mimi, tin_cay (0–1) }`.
  Mọi trường sai kiểu → null. `la_bill=false` hoặc `tin_cay < 0.6` hoặc thiếu `so_tien` → `khong_doc_duoc`.
- `doi-chieu.ts` — hàm thuần `phanXu(bill, taiKhoanQuan, tienVao, daDung, bayGio, cuaSoChoMs)` → `KetQuaSoat`:
  `{ den: 'xanh'|'vang'|'lech'|'do'|'khong_doc_duoc', ly_do_ma, giao_dich_id?, ban_id?, cau_noi }`. Thứ tự luật:
  1. không đọc được → `khong_doc_duoc`
  2. `tk_nhan_cuoi` có mà không trùng tài khoản nào của quán → `do` (`sai_tai_khoan`)
  3. `ma_mimi` có → tìm tiền vào cùng mã: đúng số → `xanh`; sai số → `lech`
  4. tiền vào đúng số trong [t−5', t+30'], chưa nằm trong `daDung` → `xanh` (gần thời điểm nhất)
  5. `bayGio − t < cuaSoCho` → `vang` (`dang_cho`)
  6. còn lại → `do` (`chua_thay_tien`)
- `cau-noi.ts` — `docTien(150000) → "một trăm năm mươi nghìn"`; câu nói cho từng đèn (dùng chung server + client).

### 2. Edge function `soat-bill`
POST `{ hanh_dong }`:
- `soat` `{ anh_base64, mime, ban_id? }` → gọi mô hình → `phanXu` → ghi `soat_bill` → trả kết quả.
- `kiem_lai` `{ id }` → chạy lại `phanXu` (đèn vàng tự hỏi lại mỗi 5 giây).
- `hang_cho` → ca đỏ / lệch chưa quyết.
- `quyet` `{ id, quyet: 'cho_qua'|'tu_choi', ly_do }` → chỉ `duocXacNhanTay`; ghi `nhat_ky_quyet_dinh`.
Phạm vi công ty, cơ sở, giới hạn gọi: theo khuôn `pos/index.ts`.

### 3. Nhà cung cấp thị giác `_shared/ai/thi-giac.ts`
- `bedrockConverse({ region, apiKey, modelId, prompt, anh })` — `POST https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/converse`,
  header `Authorization: Bearer <BEDROCK_API_KEY>`, nội dung `[{ image: { format, source: { bytes } } }, { text }]`.
  Mô hình: Amazon Nova Lite qua inference profile APAC (id chính xác kiểm trên sandbox trước khi chốt).
- Dự phòng: OpenRouter (khuôn OpenAI, `image_url` data URI) với khoá đang có.
- Biến môi trường: `BEDROCK_API_KEY`, `BEDROCK_REGION=ap-southeast-1`, `BEDROCK_MODEL_ID`. Khoá do đội tự tạo, đặt bằng
  `supabase secrets set`, không nằm trong repo.

### 4. Bảng `soat_bill` (migration)
`id, company_id, co_so_id, created_by, ban_id null, anh_sha256, doc jsonb (BillDoc), den, ly_do_ma, giao_dich_id null unique-khi-xanh,
nha_cung_cap, do_tre_ms, quyet null, quyet_boi, quyet_luc, ly_do_quyet, created_at`.
RLS: thành viên công ty đọc; ghi chỉ qua function (service role). Chỉ mục duy nhất một phần
`(giao_dich_id) where den='xanh'` để một giao dịch không làm xanh hai ca (R2.6).

### 5. Giao diện `src/`
- `src/lib/loa.ts` — bọc `speechSynthesis`: chọn giọng `vi-VN`, hàng đợi câu, tắt/bật lưu `localStorage` (try/catch).
- `src/pages/QuayTinPage.tsx` — `/dashboard/quay-tin`: 3 thẻ lớn (Soát Bill · Đơn đang chờ · Soát Chi), hàng chờ duyệt, nhật ký hôm nay.
- `src/components/quay-tin/SoatBill.tsx` — nút chụp (`<input type=file accept=image/* capture=environment>`), nén ảnh
  ≤ 1600px JPEG trước khi gửi, màn kết quả màu toàn khung + đọc to.
- POS: khi đơn chuyển `paid` hoặc `lech` → gọi `loa.noi(...)`.
- Bỏ `kiem_truoc_khi_chuyen` khỏi `CONG_CU_DONG_BANG` và route `/dashboard/kiem-truoc-khi-chuyen` về `KiemChuyenTienPage`.

## Đo trước khi hứa
- Độ trễ webhook: từ giờ ngân hàng ghi (`transaction_date`) tới lúc MIMI nhận (`created_at`) — chỉ trên tài khoản của chính công ty đội.
- Độ chính xác đọc bill: bộ 20 ảnh bill (đội tự chuyển, che số tài khoản đầy đủ) → tỉ lệ đọc đúng số tiền / 4 số cuối.
- Ghi số đo vào README; slide chỉ dùng số đã đo.

## Ánh xạ AWS
| Câu hỏi về agent thanh toán | Trả lời trong Quầy Tin |
|---|---|
| Agent là ai? | 3 agent có tên, ghi trong mọi dòng nhật ký |
| Ai uỷ quyền? | Vai trò trong `thanh_vien_cong_ty`; quyết định chỉ chủ/quản trị |
| Được làm gì? | Chỉ đọc + đề xuất. Không có công cụ chi tiền |
Mở rộng nếu sandbox cho phép: chạy 3 agent trên Bedrock AgentCore Runtime, Policy chặn mọi công cụ ghi, Observability làm nhật ký. Không phải điều kiện để nộp bài.
