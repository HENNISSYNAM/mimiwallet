# Mô phỏng tin vĩ mô — kế hoạch và hiện trạng

Lập 20/08/2026.

Đường ống: `macro_news` (RSS thật) → lọc bằng quy tắc đã có → seed cho MiroFish →
dự đoán → **bảng `predictions` để chấm điểm sau**.

Bước cuối là bước quan trọng nhất. Không có nó, mô phỏng chỉ sinh ra văn bản
thuyết phục mà không ai kiểm được.

---

## Đã xong

### 1. Chấm điểm dự đoán — `src/lib/predictions.ts`, 20 test

Bảng `predictions` (migration `20260820160000`) và module tính điểm.

Hai con số, và **con số thứ hai mới đáng nhìn**:

- `diemBrier` — sai số trung bình. Đứng một mình thì vô nghĩa: 0,20 là tốt hay tệ?
- `soSanhVoiNenTang` — so với người dự đoán chỉ biết tỷ lệ nền. Thua nền nghĩa
  là mô hình đang làm hại, dù kịch bản nó viết hay tới đâu.

Một tính chất dễ hiểu nhầm, đã khoá bằng test: **ai luôn nói cùng một con số thì
không bao giờ hơn được nền.** Nói 0,9 cho mọi câu và đúng 90% nghe rất giỏi,
nhưng tỷ lệ nền khi đó cũng là 0,9. Năng lực nằm ở chỗ **phân biệt** — nói cao
cho thứ sẽ xảy ra, nói thấp cho thứ sẽ không.

`laPhatBieuKiemChungDuoc()` chặn phát biểu không chấm được. "Thị trường sẽ biến
động" đúng trong mọi trường hợp nên ghi lại cũng vô ích.

### 2. Xuất seed — `xuat_seed.ts`

```bash
# Đổ dữ liệu ra file bằng công cụ đã có quyền
npx supabase db query --linked --file dump.sql > mn_raw.json

# Rồi xuất seed
npx --yes deno run --allow-read --allow-write --allow-env \
  research/mirofish-seed/xuat_seed.ts --from-file mn.json --days 7
```

**Không viết bộ lọc mới.** Dùng đúng `tinDangDua()` mà thẻ tin hằng ngày dùng,
nên khi quy tắc đổi thì cả hai đổi theo — không có chuyện mô phỏng chạy trên một
tập tin khác với tập tin người dùng đọc.

`--from-file` tồn tại vì hai lý do: `macro_news` chỉ cho `authenticated` đọc nên
chạy trực tiếp cần service role key (không nên để khoá đó nằm trong lịch sử
shell), và vì một lần mô phỏng phải tái lập được — tin thì trôi đi.

---

## Hai lỗi chất lượng bắt được khi chạy trên dữ liệu thật

Không lỗi nào tìm ra được bằng đọc mã, và cả hai đều đang **hiển thị cho người
dùng** qua thẻ tin hằng ngày.

### Lỗi 1 — dấu câu bị xoá làm hai từ rời dính thành từ khoá

```
"OCB duy trì đóng góp ngân sách nghìn tỷ, gia tăng giá trị cho nền kinh tế"
   → bỏ dấu, xoá dấu phẩy →  "... nghin ty gia tang ..."
   → chứa cụm "ty gia"     →  gán nhãn TỶ GIÁ
```

Một bài PR ngân hàng thành tin tỷ giá vì chữ "tỷ" đứng cạnh chữ "gia". Sửa: dấu
câu ngắt mệnh đề đổi thành `#` thay vì bị xoá, nên cụm từ không ghép được qua
ranh giới.

### Lỗi 2 — phân loại quét cả tóm tắt nên không biết bài nói *về* cái gì

Một lần nhắc từ khoá ở bất kỳ đâu là đủ để gán nhãn:

| Nhãn cũ | Tiêu đề |
|---|---|
| `fx` | CEO hãng robot hình người hàng đầu Trung Quốc thành tỷ phú |
| `interest_rate` | Bitcoin trở lại mốc 70.000 USD |
| `credit` | Dồn nguồn lực cho mục tiêu 1,14 triệu căn nhà ở xã hội |
| `policy` | Cam kết bền vững của ngành thời trang có thực sự… bền vững? |

Sửa: `classify()` chỉ đọc **tiêu đề**. Tiêu đề là chỗ toà soạn tuyên bố bài viết
nói về cái gì; tóm tắt chỉ nhắc tới mọi thứ trong lúc kể.

**Đo trên 200 tin thật:** title+summary cho 23 tin qua cổng, chỉ-tiêu-đề cho 8.
33 nhãn khác nhau, và mọi trường hợp kiểm tay đều đổi theo hướng đúng — gồm
"Những vùng đệm hỗ trợ tỷ giá ổn định" từ `interest_rate` sang `fx`.

Ít mà đúng thì hơn nhiều mà sai: thẻ tin chỉ hiện **một** mục, nên một nhãn sai
đẩy thẳng bài không liên quan lên chỗ trang trọng nhất màn hình.

### Kết quả

Trước và sau, cùng 200 tin, cùng cửa sổ 7 ngày:

| | Số tin qua lọc | Chất lượng |
|---|---|---|
| Trước | 16 | phần lớn là rác |
| **Sau** | **4** | **cả bốn đúng chủ đề** |

```
[fx/positive]            Giá USD hôm nay 20.8.2026: Thế giới giảm mạnh
[interest_rate/positive] SHB giảm lãi suất cho vay với doanh nghiệp SME
[interest_rate/negative] Lãi suất tiết kiệm vẫn tăng nhưng lãi cho vay chững lại
[interest_rate/positive] Hơn 10 ngân hàng tuyên bố giảm lãi suất, tung gói tín dụng
```

Đã tính lại nhãn cho **131/654** dòng đang lưu, và giải mã entity cho **21** dòng
(`Gi&aacute; USD h&ocirc;m nay` → `Giá USD hôm nay` — lỗi này hiện thẳng cho
người dùng).

---

## Chưa làm

**Nối MiroFish.** Cần `ZEP_API_KEY` và một LLM theo chuẩn OpenAI — hai phụ thuộc
trả tiền. Chưa chạy lần nào.

**Ghi dự đoán từ MiroFish vào `predictions`.** Mỗi dự đoán phải qua
`laPhatBieuKiemChungDuoc()` và có `resolve_on` quyết định **trước** khi biết kết
quả.

**Vòng chấm điểm.** Quét `predictions` tới hạn mà `outcome='pending'`, đối chiếu,
ghi `resolved_note` kèm bằng chứng.

---

## Ranh giới giữ nguyên

**Không hiển thị đầu ra mô phỏng cho người dùng như một dự báo.** Vừa là ranh
giới pháp lý — tư vấn đầu tư cần giấy phép mà CLI NUTRIX không có — vừa vì nó
chưa có thành tích nào để đáng tin.

Bảng `predictions` không có chính sách RLS nào cho `authenticated`: sổ nội bộ,
chỉ service role đọc được.

**MiroFish mô phỏng mạng xã hội, không mô phỏng kinh tế.** Lõi là OASIS, và các
script chạy thật là `run_twitter_simulation.py` / `run_reddit_simulation.py`. Nó
trả lời được "tin này lan thế nào, đọng lại thành cảm nhận gì" — không trả lời
được "lãi suất sẽ về đâu".

**OSINT: không dùng để lọc.** Tầng lọc đã có và đã có test; chồng thêm một tầng
nữa là làm lại việc đã làm bằng thứ chưa kiểm. Nếu dùng, chỉ dùng để tìm **nguồn
xã hội** mà RSS báo chí không có — và khi đó chọn 3–5 nguồn cụ thể rồi kiểm sống
chết từng cái, không nhập cả danh sách 1000 link (README của bộ đó tự nói phần
lớn đã lỗi thời).

---

## Dựng môi trường MiroFish — 20/08/2026

MiroFish **không nằm trong repo này**. Nó ở `C:\Users\NAM DINH\Downloads\Miro-Fish-main`,
là dự án bên thứ ba, và `.env` của nó chứa khoá thật nên không đưa vào git.
Phần ghi lại ở đây là những thứ mất thời gian mới biết.

### Python: cần CŨ hơn, không phải mới hơn

```
camel-oasis  Requires-Python >=3.10.0, <3.12
```

Chỉ **3.10 hoặc 3.11**. Bản 3.12 đã không dùng được, 3.13 càng không — và pip
huỷ cả lô khi gặp, nên không gói nào được cài chứ không phải thiếu mỗi gói đó.
`Dockerfile` của họ ghi `FROM python:3.11`, xác nhận đúng bản.

Máy này có sẵn 3.13.2. Đã cài thêm 3.11.9 song song bằng
`winget install --id Python.Python.3.11`, và **3.13 vẫn là mặc định** — các
script khác trong repo này không bị ảnh hưởng. Gọi 3.11 bằng đường dẫn đầy đủ
hoặc `py -3.11`.

### LLM: Groq, và một cái bẫy im lặng

Dùng Groq (tương thích chuẩn OpenAI). Mô hình chọn từ danh sách thật của tài
khoản, không đoán tên:

| Vai trò | Mô hình | Lý do |
|---|---|---|
| Agent | `openai/gpt-oss-20b` | Hàng trăm lượt gọi mỗi lần chạy — chi phí dồn ở đây. ~850ms, ngữ cảnh 131k |
| Báo cáo | `openai/gpt-oss-120b` | Chỉ vài lượt, chất lượng câu chữ đáng tiền |

Đã **loại** `groq/compound-*`: là hệ agentic có sẵn công cụ tìm kiếm web và chạy
mã, tức thêm hành vi và chi phí ngoài tầm kiểm soát của mô phỏng.

**Bẫy:** `gpt-oss` là mô hình suy luận. Gọi với `max_tokens` thấp (thử ở 120)
thì phần suy luận nuốt hết ngân sách và `content` trả về **rỗng** — mô phỏng
chạy xong với toàn agent im lặng, trông y như thành công. MiroFish để 4096 hoặc
không đặt nên an toàn; nếu ai siết con số đó xuống, đây là chỗ hỏng đầu tiên.
Đặt `reasoning_effort: "low"` cũng khắc phục được, và khi đó phần suy luận nằm ở
trường `reasoning` riêng chứ không lẫn vào `content`.

### Quy mô một lần chạy

Đọc từ `simulation_config_generator.py`:

- `total_simulation_hours` = 72 (3 ngày)
- giờ hoạt động 8h–22h → 15 giờ/ngày
- `agents_per_hour` 5–20 (cấu hình được tới 50)

≈ **225–900 lượt agent mỗi lần chạy**, mỗi lượt ít nhất một lời gọi LLM. Chi phí
gần như hoàn toàn nằm ở đây — đó là lý do chọn mô hình rẻ cho vai trò agent.

### Đường chạy bằng Docker

`docker-compose.yml` dùng image dựng sẵn `ghcr.io/666ghj/mirofish:latest` và đọc
thẳng `env_file: .env`, nên không phải build. Cần daemon Docker chạy. Cổng 3000
(giao diện) và 5001 (backend).
