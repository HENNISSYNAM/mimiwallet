# Khách hàng giả lập dùng MIMI, và họ có chịu trả tiền không — 29/09/2026

> **ĐỌC TRƯỚC.** Tài liệu có hai phần khác hẳn nhau về độ tin:
>
> 1. **Phần A — số đo được.** Sao kê là dữ liệu giả lập, nhưng các con số MIMI trả ra là thật:
>    chạy đúng mã production (`doc-sao-ke`, `internal-transfer`, `phan-loai/tien-vao`, `doanh-thu/so-lieu`,
>    `thresholdStatus`) qua `scripts/gia-lap/khach-hang.ts`. Mỗi khoản có đáp án, nên chấm được MIMI đúng hay sai.
> 2. **Phần B — phản hồi và sẵn lòng trả tiền.** Do Claude đóng vai 5 chân dung trong
>    [CHAN_DUNG_KHACH_HANG.md](CHAN_DUNG_KHACH_HANG.md), dựa trên kết quả phần A. **Đây là giả thuyết, không phải
>    nghiên cứu người dùng.** Không được dùng làm bằng chứng willingness-to-pay hay product-market fit, không đưa vào
>    hồ sơ gọi vốn, không đưa vào khoá luận như dữ liệu khảo sát. Việc của nó là chọn câu hỏi đúng để hỏi người thật
>    (bảng hỏi ở cuối).
>
> Không có dòng nào được ghi vào cơ sở dữ liệu production. Chạy lại: `npx vite-node scripts/gia-lap/khach-hang.ts`
> (seed cố định). Sao kê và đáp án: `docs/gia-lap-khach-hang/du-lieu/`, kết quả máy: `docs/gia-lap-khach-hang/ket-qua.json`.

## Phần A — MIMI nói gì với từng người (đo được)

Năm 2026, từ tháng 1 tới tháng 9. "Chưa xác nhận" là con số MIMI hiện ngay sau khi nhập sao kê; "Đồng ý mọi gợi ý"
là khi người dùng bấm đồng ý hết các câu MIMI hỏi; "Xác nhận đúng hết" là khi họ trả lời đúng từng khoản.

| Chân dung | Dòng sao kê | MIMI hỏi | Gợi ý sai | Bỏ sót | Chưa xác nhận | Đồng ý mọi gợi ý | Xác nhận đúng hết | Doanh thu thật đầy đủ |
|---|---|---|---|---|---|---|---|---|
| Chị Hạnh · tạp hoá sỉ | 247 | 24 | **12** | 0 | **1,20 tỷ — "đã vượt 1 tỷ"** | **805 tr** | 961 tr | 961 tr |
| Chị Linh · spa (1/15 khách) | 411 | 7 | 1 | 0 | 488 tr | 412 tr | 434 tr | 434 tr |
| Minh · TikTok Shop | 75 | 3 | 0 | 9 (nhỏ) | 355 tr | 325 tr | 323 tr | **367 tr** |
| Chị Thu · 3 quán, 3 tài khoản | 479 | 2 | 0 | 0 | **2,78 tỷ** | 1,98 tỷ | 1,98 tỷ | 1,98 tỷ |
| Bác Sáu · tiệm vàng | 77 | 1 | 0 | 9 | 938 tr — "chưa vượt 1 tỷ" | 928 tr | 893 tr | **2,59 tỷ — đã vượt** |

Bộ đọc sao kê đọc đủ **1.289/1.289 dòng**, không lỗi, kể cả 3 tài khoản của chị Thu ở hai ngân hàng khác nhau.
Chuyển tiền giữa các tài khoản của chị Thu: MIMI bắt **18/18** khoản. 9 khoản trong đó (quán 3, ngân hàng không ghi
tài khoản đối ứng) được bắt bằng cách so số tiền và ngày, nên được đánh dấu "cần xem lại", đúng thiết kế.

Gộp 5 người, bộ gợi ý bằng quy tắc hỏi **37 câu, đúng 24 (65%), sai 13**, và bỏ sót 18 khoản không phải doanh thu.

### Năm phát hiện, xếp theo mức thiệt hại

1. **MIMI nói "chưa vượt 1 tỷ" với người đã vượt (Bác Sáu).** Khách mua vàng trả tiền mặt là chính. MIMI chỉ thấy
   khoảng 1/3 doanh thu và đồng hồ ngưỡng báo chưa phải nộp. Câu "chưa gồm tiền mặt" (`CHUA_GOM`) có hiện, nhưng nằm
   dưới một con số lớn nói ngược lại. **Đây là lỗi có thể khiến khách bị truy thu.** Với ngành dùng tiền mặt nhiều,
   MIMI phải hỏi tỷ lệ tiền mặt trước khi so ngưỡng, hoặc không kết luận.
2. **Bấm "đồng ý" theo MIMI làm khai thiếu 157 triệu (Chị Hạnh).** Chồng chị giao hàng, thu tiền mặt rồi chuyển về
   với nội dung "CHONG CHUYEN TIEN HANG THU DUOC". Quy tắc "người nhà" bắt chữ "chong chuyen" và gợi ý loại ra, sai
   cả 9 lần. Nguyên tắc "máy không tự giảm doanh thu" giữ được con số khi *chưa* xác nhận, nhưng giao diện hiện đặt
   gợi ý của MIMI làm nút chính. Người mệt mỏi bấm đồng ý cả loạt là khai thiếu.
3. **Con số đầu tiên làm khách hoảng, rồi mới đúng.** Chị Hạnh thấy ngay "1,20 tỷ, đã vượt 1 tỷ" vì khoản vay
   200 triệu chưa được loại. Chị Thu thấy 2,78 tỷ thay vì 1,98 tỷ (vay 500 triệu, góp vốn 300 triệu). Con số đúng chỉ
   hiện sau khi trả lời câu hỏi. Chị Hạnh, người mục tiêu 5 phút đầu là "có phải khai không", nhận câu trả lời sai
   trước.
4. **Sàn thương mại điện tử trả tiền ròng (Minh).** Doanh thu tính thuế là giá bán; tiền về tài khoản đã trừ khoảng
   12% phí sàn. MIMI thấp hơn thật khoảng 44 triệu (12%). Chưa đổi kết luận ngưỡng của Minh, nhưng với người bán
   900 triệu thì đổi.
5. **Quy tắc thiếu mẫu câu.** "CON TRAI GUI BA" không khớp mẫu "con gui" nên bị tính là doanh thu (9 lần, 45 triệu).
   "CHI GUI TIEN LIEU TRINH CHO EM" (khách trả hộ em gái) bị gợi ý là người nhà.

## Phần B — Phản hồi đóng vai (GIẢ LẬP, không phải khách thật)

Khung hỏi giá: Van Westendorp (4 mức), "có trả 249.000đ/tháng như bảng giá hiện tại không", và câu Sean Ellis
("nếu không dùng MIMI được nữa thì bạn thấy thế nào"). Mỗi câu trả lời bám vào kết quả phần A và mô tả vai, không
bịa thêm dữ kiện thị trường.

| Chân dung | Việc họ cần | MIMI làm được tới đâu (theo phần A) | 249k/tháng? | Khung giá (đóng vai) | Sean Ellis |
|---|---|---|---|---|---|
| Chị Hạnh | "Có phải khai thuế không?" | Đúng sau 24 câu hỏi; con số đầu sai; đồng ý hết thì khai thiếu | Không | Trả theo mùa khai thuế, không trả tháng | Hơi thất vọng |
| Chị Linh (kế toán) | Làm nhanh 15 hộ, xuất file, có căn cứ | Phân loại tốt (6/7), nhưng đổi công ty phải vào Cài đặt (thử 23/09) | Không cho từng hộ | Gói cho kế toán tính theo số hộ | Rất thất vọng *nếu* có đa khách |
| Minh | "Có tốn tiền không? Mình lời bao nhiêu?" | Đúng kết luận dưới ngưỡng; không tính lãi | Không | Miễn phí; trả khi gần 1 tỷ | Không thất vọng |
| Chị Thu | Hồ sơ đưa ngân hàng; tách theo quán | Tính đúng cả 3 quán, bắt đủ chuyển nội bộ; nhưng báo cáo tự nhận "chưa phải BCTC" | Có điều kiện | Trả nếu ra được bộ hồ sơ vay | Hơi thất vọng |
| Bác Sáu | "Nó có lấy tiền tôi không?" | Báo sai ngưỡng vì tiền mặt | Không | Không trả | Không thất vọng |

Lời từng người (đóng vai, viết theo giọng trong bộ chân dung):

- **Chị Hạnh:** "Mới vô nó nói chị vượt 1 tỷ, chị hết hồn. Trả lời một hồi mới ra 961 triệu. Tiền anh Tư chuyển
  về là tiền hàng mà, sao nó nói tiền người nhà? Tháng nào cũng phải trả tiền thì chị không chịu. Tới mùa khai
  thuế chị trả một lần thì được."
- **Chị Linh:** "Phân loại ổn, sai có một khoản. Nhưng tôi có 15 hộ, không thể mỗi hộ 249 nghìn. Cho tôi một tài
  khoản thấy hết các hộ, xuất Excel theo mẫu tờ khai, tính tiền theo số hộ, là tôi mua cho cả văn phòng."
- **Minh:** "Doanh thu có hơn 300 triệu, chưa phải nộp, vậy thì dùng làm gì nữa? Miễn phí thì mình để đó. À mà sàn
  trừ phí rồi, số này có đúng không?"
- **Chị Thu:** "Ba quán nó cộng đúng, tiền chuyển qua lại cũng không bị tính hai lần, cái này tôi thích. Nhưng
  ngân hàng đòi báo cáo, mà màn hình ghi 'chưa phải báo cáo tài chính'. Ra được bộ giấy nộp ngân hàng thì 249
  nghìn tôi trả liền."
- **Bác Sáu:** "Tôi bán vàng khách trả tiền mặt, cái máy này thấy có chút xíu mà nói tôi chưa tới 1 tỷ. Vậy tôi
  tin ai? Tôi ghi sổ tay quen rồi."

**Tổng hợp giả lập:** 0/5 trả 249.000đ/tháng cho sản phẩm hiện tại; 2/5 (kế toán dịch vụ, chủ chuỗi quán) trả **có
điều kiện**, mỗi người một tính năng cụ thể. Tín hiệu chung: **khách hộ kinh doanh không muốn trả theo tháng cho một
việc làm theo mùa; người sẵn lòng trả là người làm việc này hộ người khác (kế toán) hoặc cần giấy tờ cho một việc
khác (vay vốn).** Đây là giả thuyết cần kiểm bằng người thật, không phải kết luận.

## Việc nên làm (từ phần A, không phụ thuộc phần B)

1. **Ngưỡng thuế với ngành tiền mặt:** hỏi "khách trả tiền mặt khoảng bao nhiêu phần trăm?" trước khi so ngưỡng,
   hoặc ghi "chưa kết luận được" thay cho "chưa vượt". (Chặn thiệt hại, nên làm trước.)
2. **Hàng đợi tiền vào:** không để gợi ý "không phải doanh thu" là nút chính khi nội dung có dấu hiệu bán hàng
   ("tien hang", "don hang", "thu duoc"); không có nút đồng ý hàng loạt cho loại "người nhà".
3. **Con số đầu tiên:** khi còn khoản lớn chưa xác nhận có gợi ý "vay/góp vốn", hiện ngưỡng dạng "có thể vượt — trả
   lời 2 câu để chắc", không hiện "đã vượt".
4. **Sàn TMĐT:** nhận ra tiền đối soát của sàn và nhắc doanh thu tính thuế là giá bán trước phí.
5. **Quy tắc:** thêm mẫu "con trai/con gai gui"; "gui ... cho em" kèm từ khoá dịch vụ thì không gợi ý người nhà.
   *Lưu ý khoá luận:* đổi quy tắc sau khi nhìn bộ dữ liệu này là chỉnh theo dữ liệu thử — phải ghi vào nhật ký thay
   đổi của đề cương và không dùng bộ này làm tập kiểm tra.

## Bảng hỏi cho người thật (dùng trong đợt dùng thử kín)

Hỏi sau 2 tuần dùng, khi người đó đã nhập sao kê và trả lời hàng đợi tiền vào.

1. Nếu từ mai không dùng MIMI được nữa, anh/chị thấy thế nào? *Rất thất vọng / Hơi thất vọng / Không thất vọng / Không
   còn dùng.* (Sean Ellis — đạt khi ≥40% "rất thất vọng".)
2. Hôm nay, trước khi có MIMI, anh/chị biết mình có phải khai thuế không bằng cách nào? Mất bao nhiêu thời gian / tiền?
3. Ở mức giá nào (mỗi tháng) anh/chị thấy MIMI **rẻ tới mức nghi ngờ chất lượng**?
4. Ở mức giá nào thấy **rẻ, đáng mua**?
5. Ở mức giá nào thấy **bắt đầu đắt, phải nghĩ**?
6. Ở mức giá nào thấy **đắt quá, không mua**?
7. Anh/chị muốn trả theo tháng, theo quý (mùa khai thuế) hay theo năm?
8. Với 249.000đ/tháng như hiện tại: *Mua ngay / Mua nếu có … (ghi rõ) / Không mua.*
9. Con số doanh thu MIMI đưa ra lần đầu có đúng với anh/chị nghĩ không? Nếu sai, sai vì khoản nào?
10. Anh/chị có giới thiệu MIMI cho ai không? Ai?
