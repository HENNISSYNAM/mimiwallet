# Báo cáo Go-Live MIMI — 27/09/2026

> Theo bản chỉ đạo Master Go-Live. Người quyết: chủ sản phẩm. Mọi con số dưới đây đo trên hệ thống
> thật (DB `xzym…`, web `www.mimiwallet.online`) hoặc từ bộ test; không có số ước đoán.
> AI hội thoại **để ngoài phạm vi đợt này** theo quyết định 27/09/2026 ("tập trung những gì mình
> kiểm soát tốt nhất") — xem mục Giới hạn đã biết.

## Kết luận: **GO CÓ ĐIỀU KIỆN**

Hai điều kiện chặn **đã xong** (27/09/2026, 11:38 và 12:00). Mở được cho người dùng thật. Thu phí gói
tháng được — bảng giá nay khớp với phần thu tiền; chỉ còn P2 (CSP) trước khi coi là xong hẳn.

### Điều kiện chặn (phải xong trước khi mời người dùng)

| # | Việc | Ai | Vì sao chặn |
|---|---|---|---|
| C1 | Deploy lại `tro-ly` | **XONG** — chủ sản phẩm deploy, v48 lúc 04:38 UTC 27/09; gọi không đăng nhập → 401 | Bản cũ (v46) trước commit trung gian 22:58 |
| C2 | Bảng giá: "14 ngày dùng thử" và "Hàng năm −20%" | **XONG** — chủ sản phẩm giao agent quyết: **gỡ hai lời hứa, giữ nguyên giá tháng** 249.000đ (từ `GOI_THANG`, cùng bảng giá máy chủ thu) | `subscription-billing` chỉ thu theo tháng, không có dùng thử. Làm thêm hai cơ chế thanh toán ngay trước ra mắt rủi ro hơn nói đúng cái đang có; muốn bán gói năm / cho dùng thử thì làm máy chủ trước rồi mới đưa lên trang |

### Điều kiện trước khi thu phí

| # | Việc |
|---|---|
| P2 | Đăng nhập web thật, bấm qua Tổng quan / Trợ lý / Liên kết ngân hàng, kiểm console không có vi phạm CSP → chuyển CSP từ Report-Only sang chặn thật (`vercel.json`) |

## Bảng điểm

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Phân quyền dữ liệu (RLS) | ĐẠT | Mọi bảng public bật RLS; mọi policy ghi của người dùng kiểm `auth.uid()` |
| Người chưa đăng nhập | ĐẠT | Chỉ ghi được `waitlist` (migration `20260926160000`, test `anon_chi_ghi_waitlist.sql`) |
| Khoá bí mật | ĐẠT | Quét mã đang theo dõi + toàn bộ lịch sử git: chỉ khoá giả của test và chỗ giữ chỗ |
| Đo lường không bị giả mạo chéo công ty | ĐẠT (mới) | Ghi `product_events` kèm `company_id` phải là thành viên (test 11/11) |
| Header bảo mật | MỘT PHẦN | `frame-ancestors 'none'`, `object-src 'none'` đang chặn thật; phần còn lại Report-Only (P2) |
| Function máy chủ | ĐẠT | 13 function deploy 26/09 16:50 UTC; gọi không đăng nhập → 401 gọn, không 500 |
| Migration | ĐẠT | Local = production (kiểm `migration list`), gồm `20260927090000` |
| Chữ trên trang không quá lời | ĐẠT (mới) | Gỡ "điểm tín dụng 701", "xác suất vỡ nợ", "học máy 3 giây", lời chứng thực bịa, NPS, ISO 27001 |
| Lỗi im lặng | ĐẠT phần nặng (mới) | Xem mục Rà lỗi im lặng |
| Giới hạn 1.000 dòng | ĐẠT (mới) | Tính thuế/doanh thu máy chủ đã dùng `docHet`; Tổng quan, Chứng từ chi phí, nhãn chi cá nhân nay cũng vậy |
| Múi giờ | ĐẠT (mới) | Ngày hoá đơn và "quá hạn" theo giờ VN; hạn luật đã theo `homNayVN` từ trước |
| Nút hứa mà không làm | ĐẠT (mới) | Gỡ "xác thực 2 lớp", "quản lý thiết bị" (chỉ hiện "sẽ ra mắt"); thay bằng Đăng xuất mọi thiết bị (thật) |
| Chỉ số kích hoạt | ĐẠT (mới) | View `hanh_trinh_kich_hoat`, `pheu_kich_hoat` |
| Bộ test | ĐẠT | Xem mục Kiểm tra |
| AI hội thoại | NGOÀI PHẠM VI | Trả lời theo mẫu khi mô hình không gọi được (OpenRouter miễn phí 429) |

## Chỉ số kích hoạt — định nghĩa và số thật

Tính **từ bảng nghiệp vụ**, không từ sự kiện trình duyệt (sự kiện mất được; 7/11 sự kiện "lần đầu"
khai báo từ trước chưa từng được ghi). Chỉ quản trị đọc.

- **Kích hoạt** = đã nối nguồn tài chính **và** có sự thật doanh thu **và** người dùng **tự tay** bắt đầu
  một việc (tự xác nhận/sửa phân loại, hoặc tự ghi bằng chứng). MIMI tự phân loại không tính — nó chỉ
  chứng minh hệ thống chạy.
- **Kích hoạt trong 7 ngày**: bước tự tay xảy ra trong 7 ngày đầu.
- **Quay lại sau 7 ngày**: có hoạt động của thành viên từ ngày thứ 7 (sự kiện `app_opened`, mỗi ngày
  một lần mỗi công ty, bắt đầu ghi từ bản này).

Đọc: `SELECT * FROM pheu_kich_hoat ORDER BY tuan_dang_ky;` (SQL editor).

Số lúc áp (27/09/2026): **16 công ty** (không demo) · **3** nối nguồn · **1** có sự thật doanh thu ·
**0** tự tay bắt đầu · **0** kích hoạt · 1 quay lại sau 7 ngày.
→ Nút thắt là bước **nối nguồn** (3/16), rồi bước **tự tay làm việc đầu tiên** (0/3).

## Bản đồ nguồn sự thật

| Con số / trạng thái | Nguồn duy nhất | Ghi chú |
|---|---|---|
| Giao dịch ngân hàng | `transactions` (Cas/SePay/nhập sao kê) | `is_synthetic` = minh hoạ, không vào số thật |
| Doanh thu | `transactions` × `revenue_classifications` | Đọc qua `doanh-thu/so-lieu.ts` (`docHet`) |
| Chi phí có chứng từ | `gdt_invoices` (đầu vào) + `chung_tu_quet` | |
| Việc cần làm | `ho_so_viec` (8 trạng thái) + `bang_chung_viec` (chỉ thêm) | "Đã kiểm" chỉ máy chủ ghi được |
| Hạn thuế | lịch thuế máy chủ (`doc-lich-thue`) | Theo giờ VN |
| Căn cứ luật | `doan_phap_luat` | Trích nguyên văn, không diễn giải |
| Đo lường | `product_events` + view kích hoạt | Không tiền, không số tài khoản, không MST |
| Kiểu TypeScript | sinh từ DB `xzym…` | Bot Lovable từng ghi đè bằng kiểu của DB khác — đã khôi phục (xem Rủi ro) |

## Rà lỗi im lặng (mục 27)

Đã sửa — đọc lỗi từng hiện thành một câu **sai**:

| Chỗ | Trước | Nay |
|---|---|---|
| Liên kết ngân hàng | "Chưa có tài khoản nào được liên kết" → có thể liên kết lần hai | Báo chưa tải được + Thử lại |
| Hoá đơn | "Chưa có hoá đơn" | như trên |
| Thông tin doanh nghiệp | "Đăng xuất rồi đăng nhập lại để tạo hồ sơ" | như trên |
| Chuông / danh sách thông báo | "Chưa có thông báo nào" (có thể là hạn thuế) | như trên |
| Cài đặt thông báo | Công tắc hiện bật hết; gạt một cái **xoá mất** các loại đã tắt | Khoá công tắc tới khi đọc được |
| Tổng quan | Toàn số 0 | Báo lỗi + Thử lại |
| Đọc thành tiếng | Lỗi chưa bắt khi bộ đọc mất giữa chừng, nút kẹt "đang đọc" | Trả "không hỗ trợ" |

Còn lại, hại thấp (P2): thẻ tóm tắt `PaymentMethods`, `LegalUpdates`, `DailyBriefCard`, `WelcomeCards`,
`GiayToPage` (tên công ty), ảnh ký tên tạm ở Thư viện chứng từ, và ghi kết quả quyết định chạy nền
trong Trợ lý (lỗi thì nhật ký thiếu dòng kết quả; bước ghi TRƯỚC khi chạy đã chặn cứng từ P1-002).

## Kiểm tra

- `npx tsc --noEmit -p tsconfig.app.json`: sạch.
- `npx vite build`: đạt.
- `npx vitest run`: 1808/1808 đạt, 189 tệp, không lỗi chưa xử lý (27/09/2026).
- DB (chạy trên production, tự huỷ): `vong_giai_quyet_viec.sql` 24/24, `hanh_trinh_kich_hoat.sql` 11/11,
  `anon_chi_ghi_waitlist.sql` đạt.
- Web thật: trang chủ, Khám phá, Sản phẩm — console không lỗi, không vi phạm CSP khi dùng thường.

## Giới hạn đã biết (không chặn, nói rõ với người dùng)

- **Hoá đơn điện tử (GDT) — ĐÃ GỠ 29/09/2026.** Casso chưa bật sản phẩm này cho app production, nên
  MIMI không đọc được hoá đơn nào từ cơ quan thuế (`gdt_invoices` 0 dòng). Giao diện bỏ mọi chỗ đọc/hứa;
  máy chủ: `docSoLieuDoanhThu` thôi đọc bảng (doanh thu luôn là ước tính từ ngân hàng), `bank-link`
  trả 410 `GDT_DA_GO` cho `feature=gdt` và `gdt-sync`, lịch tự tải trong `thong-bao` tắt, trợ lý đối
  chiếu "thiếu chứng từ" với chứng từ chụp. Lõi `_shared/tax/dong-bo-gdt.ts` ĐÓNG BĂNG để bật lại khi
  Casso mở. Bảng giữ nguyên (sổ cái chống sửa và tệp sao lưu cũ còn dùng). 3 liên kết `scopes='gdt'`
  đều đã `disconnected` từ trước. Deploy 6 function lúc 29/09/2026, gọi không đăng nhập → 401.
- **Đọc ảnh chứng từ chưa bật** (thiếu khoá mô hình): nút chụp bị khoá, chưa ai thêm được chứng từ;
  màn Chứng từ chi phí và Thư viện nói thẳng điều đó thay vì hứa "MIMI đọc".

- **AI hội thoại**: khi mô hình không gọi được, Trợ lý trả lời theo mẫu soạn sẵn cho các câu thường gặp.
  Mọi việc có nút (việc cần làm, phân loại, tờ khai, nhắc hạn) chạy bằng mã, không phụ thuộc mô hình.
- **Bộ đọc báo cáo tài chính / tờ khai tải lên**: phần đọc và phân loại đã có và có test, **chưa có
  màn hình tải lên**.
- **Không nộp thuế thật, không ký, không chuyển tiền** (giới hạn Prompt 5).
- Đăng xuất mọi thiết bị: máy khác bị đăng xuất khi mã truy cập hết hạn (~1 giờ), không tức thì.

## Rủi ro vận hành

- **Bot Lovable đẩy vào `main`** (sáng 27/09 ghi đè `types.ts` bằng kiểu của dự án Supabase khác, 13 bảng).
  Không làm hỏng web (build không kiểm kiểu) nhưng làm typecheck đỏ. Luôn `git fetch` và nhìn commit của
  `gpt-engineer-app[bot]` trước khi đẩy; `types.ts` chỉ sinh từ `xzym…`.
- Deploy function lúc được lúc bị chặn với agent → chủ sản phẩm giữ lệnh deploy.
