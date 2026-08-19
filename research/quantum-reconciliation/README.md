# Đối soát gộp hoá đơn như một bài toán tổ hợp

Thư mục nghiên cứu. **Không phải phụ thuộc của ứng dụng** — MIMI chạy
TypeScript/Deno, thư mục này là Python và không được import vào bất cứ đâu trong
`src/` hay `supabase/`.

## Câu hỏi

Trong `supabase/functions/_shared/ledger/receivables.ts` có nhánh "khách gộp nhiều
hoá đơn vào một lần chuyển":

> Tiền vào 47.300.000đ. Trong N hoá đơn đang mở, tổ hợp nào cộng đúng bằng số đó?

Đây là **subset-sum**, NP-hard. Mã hiện tại không giải nó — dùng heuristic (số hoá
đơn trong nội dung trước, rồi tên khách, phân bổ hoá đơn cũ nhất trước). Câu hỏi
của thư mục này: nếu phải giải đúng, lượng tử có giúp được không?

## Kết quả đo — 19/08/2026

Máy: Windows 11, Python 3.13.2. Dữ liệu sinh quanh 8 triệu đồng, lệch chuẩn 25%,
làm tròn 10.000đ — mô phỏng hoá đơn cùng mặt hàng cho cùng nhóm khách, là hình
dạng khó của subset-sum chứ không phải ngẫu nhiên đều.

| Hoá đơn | Gộp | Giải chính xác | Trạng thái | Tham lam | Lệch của tham lam |
|--------:|----:|---------------:|-----------:|---------:|------------------:|
| 10 | 2 | 0,03 ms | 11 | 0,011 ms | 2.470.000đ |
| 20 | 2 | 0,13 ms | 86 | 0,016 ms | 420.000đ |
| 50 | 5 | 0,52 ms | 744 | 0,017 ms | 250.000đ |
| 100 | 10 | 2,99 ms | 3.791 | 0,035 ms | 90.000đ |
| 200 | 20 | 14,67 ms | 14.415 | 0,064 ms | 40.000đ |
| 500 | 50 | 126,83 ms | 41.566 | 0,195 ms | 0đ |

QUBO cho n=100: 5.050 hệ số, 100 biến nhị phân, chia tỷ lệ 10.000.

## Hai kết luận, và cái thứ hai là kết luận âm

**1. Bài toán tổ hợp có thật.** Tham lam sai ở 5/6 kích thước, lệch tới 2,47
triệu đồng ở n=10. Không phải bài toán bịa ra để có cớ dùng lượng tử — heuristic
kiểu đang chạy trong sản phẩm thật sự gán sai hoá đơn.

**2. Nhưng lượng tử chưa có cửa.** Giải chính xác mất **127 ms ở 500 hoá đơn**.
Một lượt gọi D-Wave Leap tốn hàng trăm mili-giây chỉ riêng độ trễ mạng, chưa tính
hàng đợi. Ở mọi quy mô mà một doanh nghiệp nhỏ Việt Nam gặp phải, máy tính thường
thắng.

Ngưỡng đáng thử lại: khi giải chính xác vượt vài giây, tức khoảng **vài nghìn hoá
đơn mở cùng lúc**. Đó là quy mô của ngân hàng hoặc trung tâm thanh toán bù trừ,
không phải của SME — và nếu MIMI đến được quy mô đó thì bài toán đã đổi.

## Vì sao vẫn giữ thư mục này

Ba lý do, không lý do nào là "để khoe lượng tử":

1. **Nó chứng minh có đo thật.** Một hồ sơ dự thi nói "chúng tôi ứng dụng lượng
   tử" mà không có số thì không phân biệt được với hồ sơ không làm gì. Một hồ sơ
   nói "chúng tôi quy về QUBO, đo, và kết luận chưa cần lượng tử ở quy mô này"
   thì chứng minh năng lực kỹ thuật thật.

2. **Nó chỉ ra một lỗi sản phẩm có thật.** Cột "lệch của tham lam" nói rằng
   `receivables.ts` đang gán sai hoá đơn khi nội dung chuyển khoản không có số.
   Sửa bằng `classical.py` port sang TypeScript — **không cần lượng tử** — là cải
   tiến đáng làm, và nó tìm ra được nhờ nghiên cứu này.

3. **Nó vạch sẵn ngưỡng.** Khi nào đáng quay lại đã có con số, không phải cảm tính.

## Về qiskit-finance

Đã xem qiskit-finance 0.5.0. **Không dùng được.** Toàn bộ ứng dụng của nó là thị
trường vốn:

```
applications/optimization/  portfolio_optimization, portfolio_diversification
applications/estimation/    european_call_pricing, european_call_delta, fixed_income_pricing
data_providers/             yahoo, nasdaq, wikipedia, exchange
```

MIMI không có danh mục đầu tư, quyền chọn hay trái phiếu. Gắn gói này vào chỉ để
có chữ "quantum finance" là loại tuyên bố mà repo này đang gỡ dần, không phải
thêm vào.

## Không nhầm với PQC

Thư mục này là **máy tính lượng tử**. Thứ MIMI thật sự chạy trong sản phẩm là
**mật mã hậu lượng tử** — ML-KEM-768 trong `supabase/functions/_shared/pqcCrypto.ts`,
mã hoá mã truy cập ngân hàng theo từng bản ghi.

Hai nhánh khác hẳn nhau. PQC đang chạy thật và bảo vệ dữ liệu người dùng hôm nay;
thư mục này là nghiên cứu chưa cho ra sản phẩm. Gộp hai câu chuyện là cách nhanh
nhất để mất uy tín ở cả hai.

## Chạy

```bash
python research/quantum-reconciliation/benchmark.py
```

Không cần cài gì.

Phần D-Wave (`dwave_runner.py`) **chưa chạy lần nào**. Cần `pip install
dwave-system dimod` và token Leap. Đừng trích số nào từ file đó cho tới khi nó
chạy thật và bảng trên được cập nhật.
