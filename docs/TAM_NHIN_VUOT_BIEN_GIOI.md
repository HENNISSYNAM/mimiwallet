# Bắt đầu ở Việt Nam, tầm nhìn vượt biên giới

> Chốt ngày 24/09/2026. Trả lời câu B4 trong [KE_HOACH_TRAI_NGHIEM.md](KE_HOACH_TRAI_NGHIEM.md):
> **thực thi ở Việt Nam trước, nhưng mô hình dữ liệu và tên gọi không được khoá
> cửa ra thế giới.** Bốn lĩnh vực nhắm tới: xuất khẩu, kiểm kê, chứng từ nghiệp
> vụ, chứng chỉ chuyên môn.

## Bốn lĩnh vực đó là một bài toán

Xuất khẩu, kiểm kê, chứng từ nghiệp vụ, chứng chỉ chuyên môn — nghe như bốn sản
phẩm. Thực ra là **một câu hỏi lặp lại bốn lần**:

> *Làm sao chứng minh với một bên không tin mình rằng tờ giấy này là thật, chưa
> bị sửa, và đã tồn tại từ ngày đó?*

| Lĩnh vực | Bên không tin mình | Hậu quả nếu không chứng minh được |
|---|---|---|
| Xuất khẩu | Ngân hàng mở L/C, hải quan nước nhập | Bộ chứng từ bị từ chối, tiền không về |
| Kiểm kê | Cơ quan thuế, kiểm toán, hải quan | Chênh lệch sổ sách không giải trình được |
| Chứng từ nghiệp vụ | Kiểm toán, đối tác, toà án | "Việc này có xảy ra không?" — không trả lời được |
| Chứng chỉ chuyên môn | Nhà tuyển dụng, chủ đầu tư, bên mua | Bằng giả lọt vào công trình, dây chuyền |

**MIMI đã xây xong phần lõi của câu hỏi này.** Mỗi đêm gom mã băm chứng từ và neo
lên Bitcoin qua OpenTimestamps, kiểm độc lập được ở opentimestamps.org. Agent
đóng vai một kỹ sư về hưu ở Melbourne — người khó tính nhất trong 15 chân dung về
chuyện truy nguồn — chỉ khen đúng một thứ trong toàn bộ app:

> *"That's the kind of verifiability I actually trust — like a notarized ledger."*

Thứ đó **không phải tính năng thuế**. Nó không phụ thuộc Việt Nam. Nó là thứ duy
nhất trong app mà một người ở Melbourne, Osaka hay Bangalore đều hiểu ngay giá
trị.

## Ranh giới phải nói thẳng, nếu không sẽ thành lừa dối

Neo mã băm chứng minh **tính toàn vẹn** và **thời điểm tồn tại**. Nó **không**
chứng minh **tính xác thực của việc phát hành**.

Nói cách khác: MIMI chứng minh được "tệp này không đổi kể từ 20/03/2026". MIMI
**không** chứng minh được "Trường X thật sự cấp bằng này cho người này".

Đây là chỗ cả ngành "chứng chỉ trên blockchain" nói dối, thường là vô tình. Một
người có thể neo một tấm bằng giả lên Bitcoin và có "bằng chứng blockchain" hoàn
hảo — cho một tấm bằng giả.

Chứng chỉ chỉ thật sự kiểm được khi **bên cấp tham gia**: bên cấp ký, hoặc bên
cấp công bố mã băm. MIMI làm được vai trò hạ tầng cho việc đó, nhưng không được
phép tự nhận đã làm được khi bên cấp chưa tham gia.

Đội này đã quen kiểu ranh giới đó — "MIMI không giữ tiền", "MIMI không nộp thay",
"MIMI chưa cấp vốn". Ranh giới này cùng loại, và quan trọng hơn cả ba.

## Bài toán thật của từng lĩnh vực

### Xuất khẩu — bộ chứng từ phải khớp nhau từng chữ

Một lô hàng cần cả bộ: hoá đơn thương mại, phiếu đóng gói, vận đơn, C/O, chứng
thư kiểm dịch, bảo hiểm. Dưới L/C, ngân hàng xét theo nguyên tắc **tuân thủ chặt
chẽ**: tên người nhận viết lệch một chữ so với L/C là đủ để từ chối bộ chứng từ.
Người bán thường biết chuyện đó sau khi hàng đã lên tàu.

Đây là bài toán **đối chiếu nhiều văn bản với nhau**, không phải bài toán dịch
thuật. MIMI đã có bộ máy đối chiếu — hiện đang chĩa vào "khoản chi này có hoá đơn
chưa". Cùng một cơ chế, đổi đối tượng: "sáu tờ này có khớp nhau về số lượng, trọng
lượng, trị giá, tên người nhận, mã HS không".

> Cần kiểm chứng trước khi đưa vào tài liệu bán hàng: tỷ lệ bộ chứng từ L/C bị từ
> chối ở lần xuất trình đầu. Con số này được trích dẫn rộng rãi trong tài liệu tài
> trợ thương mại nhưng đội chưa tự đối chiếu nguồn gốc.

### Kiểm kê — chênh lệch phải giải trình được, không phải "điều chỉnh"

Sổ sách và kiểm đếm thực tế không bao giờ khớp. Với doanh nghiệp nhỏ, cái đau
không phải con số chênh, mà là **không ai giải thích được nó từ đâu ra**, nên nó
bị "điều chỉnh" cho khớp. Đó đúng là chỗ gian lận và rủi ro thuế trú ngụ.

Với doanh nghiệp gia công xuất khẩu còn nặng hơn: nguyên liệu nhập, định mức tiêu
hao, thành phẩm xuất — lệch nhau là hải quan phạt.

Hướng của MIMI: coi mỗi lần xuất nhập kho là **một mắt xích có chứng từ đứng
sau**, không phải một con số. Khi đó chênh lệch biến từ một bí ẩn thành một danh
sách các lần dịch chuyển chưa có chứng từ — đúng kiểu trang "Khoản chi thiếu
chứng từ" đang làm với tiền.

### Chứng từ nghiệp vụ — thứ nối ba lĩnh vực kia lại

Phiếu giao hàng, phiếu nhập kho, biên bản nghiệm thu, lệnh sản xuất, hợp đồng.
Chúng sống trong Zalo và email, được chụp ảnh, và khi ai đó hỏi "chứng minh việc
này xảy ra ngày đó đi" thì không ai chứng minh được.

MIMI đã có câu trả lời mạnh nhất cho việc này. Nó chỉ đang bị gọi tên là "chứng
từ thuế".

### Chứng chỉ chuyên môn — bài toán khó nhất, và cần bên thứ ba

Bằng giả, chứng chỉ an toàn lao động hết hạn đem trình như còn hạn, chứng chỉ hành
nghề photo. Bên tuyển dụng và bên kiểm tra không có cách kiểm rẻ.

MIMI **không tự giải được** bài này, vì nó cần bên cấp tham gia. Nhưng MIMI làm
được hai việc thật ngay bây giờ:

1. **Theo dõi hiệu lực** — chứng chỉ nào sắp hết hạn, ai đang giữ, còn bao nhiêu
   ngày. Đây thuần tuý là dữ liệu, không cần ai tin ai, và cùng cơ chế với trang
   Nhắc thuế đang chạy.
2. **Giữ bản gốc không sửa được** — khi có tranh chấp, chứng minh được bản đang
   giữ giống hệt bản đã nộp ngày đó.

Việc thứ nhất bán được ngay. Việc thứ hai là nền cho ngày bên cấp chịu tham gia.

## Điều phải quyết bây giờ vì sau này đắt

Vietnam-first **không** mâu thuẫn với tầm nhìn toàn cầu — miễn là bốn thứ dưới đây
không bị đóng cứng. Đây là những quyết định rẻ hôm nay, đắt sau này.

### 1. Cột tiền tệ — đã thiếu, và thiếu ở đúng hai bảng lõi

Kiểm ngày 24/09/2026:

| Bảng | Có cột `currency` |
|---|---|
| `gdt_invoices` | có |
| `invoices` | **không** |
| `transactions` | **không** |

Hoá đơn xuất khẩu ghi bằng USD hoặc EUR. Thêm `currency` mặc định `'VND'` vào hai
bảng này bây giờ là một migration. Thêm sau khi đã có vài nghìn dòng và vài chục
truy vấn cộng tiền là một cuộc dọn dẹp.

### 2. Số lượng và đơn vị — chưa tồn tại

Không bảng nào có `quantity` hay `don_vi`. Cả kiểm kê lẫn xuất khẩu đều đứng trên
"bao nhiêu cái, bao nhiêu kg, bao nhiêu khối". Hiện MIMI chỉ biết tiền.

### 3. Đối tác phải có quốc gia và loại mã số

Hiện chỉ có mã số thuế Việt Nam. Người mua ở Nhật có mã số thuế Nhật. Một cột
`country` và một cột nói mã số đó thuộc loại nào là đủ cho nhiều năm.

### 4. Tên hàm API — đổi ngay, trước khi có người tích hợp

`xem_chinh_sach`, `xin_chi`, `xem_yeu_cau`, `tra_ma_ngan_hang`.

Agent đóng vai một CFO ở Bangalore: *"An API with Vietnamese function names? I
can't read this, let alone integrate it."*

Với tầm nhìn vượt biên giới thì câu này tự trả lời. Hiện **chưa ai tích hợp**, nên
đổi còn miễn phí. Mỗi tháng chờ thêm là một tích hợp có thể phải phá.

Giao diện tiếng Việt thì giữ — người dùng Việt Nam đọc tiếng Việt. Nhưng **tên
hàm trong hợp đồng máy-với-máy là tiếng Anh**, giống như mã ISO quốc gia hay mã
tiền tệ không dịch.

## Thứ tự đề nghị

**Không đổi kế hoạch trước mắt.** Nhóm A trong kế hoạch trải nghiệm vẫn chạy
trước — đó là những chỗ đang mất khách Việt Nam ngay hôm nay.

Chen vào bốn việc rẻ ở trên, vì chúng chỉ rẻ khi làm sớm:

1. `currency` cho `invoices` và `transactions` (một migration, mặc định VND)
2. Đổi tên hàm API sang tiếng Anh
3. `country` và loại mã số cho đối tác
4. `quantity` + `unit` — khi bắt đầu chạm tới kiểm kê

**Chưa làm bây giờ:** đa tiền tệ đầy đủ trong giao diện, dịch 1.765 chỗ chữ, vỏ
Android. Ba việc đó chỉ đáng làm khi đã có khách hàng ngoài Việt Nam thật, và
quyết định "Việt Nam trước" nghĩa là chúng lùi lại.
