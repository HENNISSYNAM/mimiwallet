# Chuẩn giao diện MIMI Wallet

Tài liệu này trả lời hai câu: **theo chuẩn nào** và **khác ở đâu**.

Nó không thay `src/index.css` — chỗ đó là luật về vật liệu (màu, Liquid Glass,
hairline). Chỗ này là luật về **bố cục và thông tin**: cái gì được lên màn hình,
đặt ở đâu, và vì sao.

---

## Phần 1 — Chuẩn để theo

### Chọn Mercury, không chọn Ramp/Brex

Ba sản phẩm này thường được nhắc chung nhưng thiết kế ngược nhau, vì người dùng
của họ ngược nhau:

| | Người dùng | Hệ quả thiết kế |
|---|---|---|
| **Ramp / Brex** | Đội tài chính chuyên trách, ngồi trong sản phẩm cả ngày | **Dày** — nhiều số trên một màn hình, vì dày = nhanh với người đã thạo |
| **Mercury** | Founder, xem giữa hai cuộc họp | **Thưa** — một số chính, phần còn lại là phụ |

Khách của MIMI là **chủ hộ kinh doanh và SME Việt Nam** — người mở app 2 phút
giữa lúc bán hàng, không phải kế toán trưởng. Đó là người dùng của Mercury, không
phải của Ramp. Nên chuẩn để theo là Mercury.

Hệ quả cụ thể, không phải khẩu hiệu:

1. **Một số chính mỗi màn hình.** Mercury để "số dư hiện tại + xu hướng" to nhất,
   mọi thứ khác nhỏ hơn hẳn. Dashboard MIMI hiện có 4 thẻ KPI cùng cỡ chữ —
   không thẻ nào thắng. Đây là việc còn phải sửa (xem Phần 3).
2. **Điều hướng nông.** Việc quan trọng nhất luôn cách một lần chạm.
3. **Bỏ từ ngân hàng, dùng từ sản phẩm.** Mercury thay thuật ngữ nhà băng ở mọi
   điểm chạm để người dùng không thấy mình phải hiểu ngân hàng mới dùng được.
   MIMI đã làm đúng chỗ này ở `ThresholdClock` ("Bạn còn cách ngưỡng… bao nhiêu")
   nhưng vẫn còn "Grant", "Update Mode", "publicToken" rò ra thông báo lỗi.

### Ba luật chung của Stripe / Wise / Mercury / Ramp

Lấy từ tổng hợp thực hành 2026, cả bốn sản phẩm đều theo:

1. **Hành động chính phải hiển nhiên cho đúng một vai.** Không thiết kế cho "mọi
   người dùng" — chọn một vai và làm nó hiển nhiên.
2. **Hiện những con số đối thủ giấu** — phí, tỷ giá, hạn mức.
3. **Ma sát có chủ đích ở bước rủi ro cao là tính năng, không phải lỗi.** Xác nhận
   trước khi chuyển tiền là đúng, không phải "thừa một bước".

Luật 2 và luật 3 chính là thứ MIMI đã làm sẵn ở chỗ khác: quy tắc "không bịa số"
và "vắng mặt thì nói vắng mặt" trong `DashboardOverview.tsx` là **luật 2 ở dạng
gắt hơn** — không chỉ hiện số đối thủ giấu, mà từ chối hiện số mình không đo được.

### Bốn nguyên tắc trình bày dữ liệu

- **Khoảng trắng rộng** để giảm áp lực thị giác — tiền bạc vốn đã gây lo.
- **Phân cấp thị giác mạnh**: nhìn phát ra ngay số quan trọng nhất.
- **Màu là để dẫn quyết định, không phải trang trí.** Mỗi màu phải trả lời
  "màu này bảo tôi làm gì".
- **Thứ bậc do tầm quan trọng, không do trang trí.**

---

## Phần 2 — Dấu ấn riêng của MIMI

Theo chuẩn Mercury về *bố cục*, nhưng ba thứ dưới đây là của MIMI và không nên bỏ
để "cho giống chuẩn quốc tế". Đây là chỗ khác biệt hợp pháp.

### 1. Liquid Glass — nhưng chỉ ở tầng điều khiển nổi

Đã thành luật trong `src/index.css`: kính chỉ dùng cho thanh nav, tab bar, sheet,
toolbar. Không lồng kính trong kính. Nội dung luôn đục.

Lý do là kỹ thuật chứ không phải thẩm mỹ: `--bg-base` là màu phẳng, kính đặt trên
thẻ tĩnh không có gì để làm mờ và vẫn tốn một compositor layer. Vật liệu chỉ "ăn"
khi có nội dung thật sự chạy bên dưới.

Đây là dấu ấn thật vì **đa số fintech không dám dùng** — họ sợ kính làm khó đọc
số. MIMI giải quyết bằng cách tách tầng: số nằm trên nền đục, kính chỉ ở thứ trôi
qua.

### 2. `AmbientMotifField` — nền động thay ảnh

Apple để kính khúc xạ trên ảnh thật (`backgroundExtensionEffect`). MIMI không có
ảnh, nên dựng Coin/Gem/Sparkle trôi rất chậm phía sau tab bar. Đó là thứ cho kính
có cái để bẻ.

Dùng ở nơi người dùng **chuyển đổi ngữ cảnh** (`FintechPage`, `NewsAndLawPanel`),
không dùng ở trang dày như `InvoicesPage` — ở đó chỉ giữ pill trượt, bỏ kính.

### 3. Trung thực làm ngôn ngữ thị giác

Cái này mới là moat thật sự, và nó có hình dạng trên màn hình:

- **Thiếu dữ liệu hiện dấu `—`, không hiện `0`.** Số 0 là một phép đo; dấu gạch
  là lời thú nhận. Hai thứ khác nhau.
- **Hàng demo đeo nhãn `demo`** ngay tại chỗ đọc, không chỉ bị loại khỏi phép
  tính. Một hàng vô hình trong tổng nhưng giống hệt trong danh sách vẫn là đánh lừa.
- **Số liệu pháp lý đi kèm nút "Căn cứ"** mở ra số hiệu văn bản + link nguồn.
- **Mốc vượt ngưỡng không được ăn mừng.** `ThresholdClock` cố tình không gắn icon
  Coin vào trạng thái đã vượt — vượt ngưỡng là **phát sinh nghĩa vụ**, không phải
  thành tích.

Không sản phẩm nào trong Ramp/Brex/Mercury phải làm điều này, vì họ ở thị trường
mà dữ liệu ngân hàng là mặc định. Ở Việt Nam, nơi khách còn ghi sổ tay, **việc
phân biệt rạch ròi "số này tôi đo được" với "số này tôi đoán" chính là sản phẩm.**

---

## Phần 3 — Áp dụng: luật bố cục cho MIMI

### Luật 1 — Mỗi màn hình có đúng một số chính

Số chính to gấp rưỡi trở lên so với số phụ.

Dashboard từng có 4 KPI cùng cỡ `text-xl sm:text-2xl` — bốn số bằng nhau thì mắt
chọn theo **vị trí**, không theo tầm quan trọng, tức là không thẻ nào thắng. Đã
tách **Dòng tiền ròng** ra hàng riêng chiếm hết chiều rộng, cỡ
`text-3xl sm:text-[40px]`, sparkline cao gấp rưỡi; ba thẻ còn lại xuống
`text-lg sm:text-xl` trong lưới 3 cột bên dưới.

Prop `primary` trên `KPICard` là chỗ luật này sống trong mã — mỗi màn hình chỉ
được truyền nó cho đúng một thẻ.

### Luật 2 — Điều hướng nhóm theo việc, không theo module

Sidebar đã đổi từ 12 mục phẳng thành 4 nhóm (`Hằng ngày`, `Vốn & Tín dụng`,
`Kết nối & Dữ liệu`, `Khác`). Danh sách 12 mục đọc thành 12; bốn danh sách ngắn
đọc thành bốn.

Tên nhóm đặt theo việc người dùng muốn làm, không theo tên module bên trong.

### Luật 3 — Không có hai cửa vào một phòng

`/dashboard/cashflow` render đúng component với `/dashboard`. Hai mục sidebar,
một màn hình. Đã bỏ mục trùng.

Kiểm tra khi thêm route mới: **bấm vào có làm màn hình đổi không?** Không đổi thì
không phải một mục điều hướng.

### Luật 4 — Không có nút giả

Ô tìm kiếm ở header từng không có `value`, không `onChange`, không submit — gõ
vào rồi mất. Nút kính lúp trên mobile thì bắn `toast('Chưa có thông báo mới')`,
tức thông báo của cái chuông, dán nhầm sang nút tìm kiếm.

Một control trông sống mà chết còn tệ hơn không có control. Đã nối vào
`InvoicesPage` qua `?q=`.

Cùng luật này: **không hiện danh tính bịa.** Avatar từng in cứng `"AM"` (Anh
Minh, từ mockData đã xoá) cho mọi tài khoản — đúng loại lỗi mà sidebar từng mắc
với "Đức Phát Foods". Giờ lấy chữ cái đầu từ tên công ty thật, không có thì hiện
dấu gạch.

### Luật 5 — Trang marketing không nằm trong nav làm việc

`/dashboard/tech` là trang giới thiệu: hero, ba trụ cột, sơ đồ pipeline, không có
một dòng dữ liệu nào của công ty đang đăng nhập. Đó là trang cho người **chưa**
đăng ký xem. Đã rút khỏi sidebar, route vẫn sống.

### Luật 6 — Mọi item trong grid phải khai báo span của nó

`NewsAndLawPanel` và `M2MDashboardWidget` từng là con trực tiếp của
`grid lg:grid-cols-5` **sau** hai item đã chiếm trọn 5 cột. Không khai báo span
→ grid tự đặt thành item 1 cột → panel tin tức có tab bị ép còn 1/5 chiều rộng.

---

## Việc còn lại

- [ ] Thuật ngữ Cas (`grant`, `publicToken`, `Update Mode`) còn rò ra thông báo
      lỗi người dùng đọc. Vi phạm luật "bỏ từ ngân hàng, dùng từ sản phẩm".
- [ ] `Landing.tsx` 1198 dòng, `Onboarding.tsx` 872 dòng — chưa soát.
- [ ] Chuông thông báo luôn bắn `toast('Chưa có thông báo mới')` — chưa có hệ
      thống thông báo thật phía sau. Đang trung thực, nhưng là một nút gần-giả.
- [ ] Tìm kiếm mới chỉ tới hoá đơn. Placeholder cũ hứa "hoá đơn, giao dịch" nên
      đã sửa lại còn đúng phạm vi làm được; mở rộng sang giao dịch là việc sau.

---

## Nguồn

- [Mercury Design Breakdown: Banking UX Built for Startups](https://www.925studios.co/blog/mercury-design-breakdown)
- [Fintech Dashboard Design: 9 Real Products, Analyzed (2026)](https://adminlte.io/blog/fintech-dashboard-design-examples/)
- [Fintech Design Trends 2026: Why Apps Look the Same (And What Works)](https://www.themasterly.com/blog/fintech-design-guide)
- [Fintech design guide with patterns that build trust (2026)](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Top 10 Fintech UX Design Practices Every Team Needs in 2026](https://www.onething.design/post/top-10-fintech-ux-design-practices-2026)
