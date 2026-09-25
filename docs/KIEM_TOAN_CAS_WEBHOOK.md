# Kiểm toán: Cas webhook, trợ lý là màn chính, thư viện tài liệu

Ngày 24/09/2026. Trả lời bản chỉ đạo "CAS EVENT BACKBONE + ASSISTANT-FIRST + ARTIFACT LIBRARY".
**Chưa viết mã.** Mọi nhận định dưới đây dựa trên ba nguồn, ghi rõ từng chỗ:

- **[mã]** — nhánh `main` tại `4883845`.
- **[dữ liệu]** — bảng `webhook_events` trên production, đọc ngày 24/09/2026.
- **[tài liệu]** — tài liệu chính thức của Cas: `cas.so/general/api/webhook`, `/invoice-hub`, `/tvan-send`,
  `/tvan-tax-declaration-send`, `/tvan-tax-return-send`, `/esign-request-document`. Không có
  skill Cas nào cài được trong môi trường này, nên nguồn là trang tài liệu, mở bằng trình duyệt.

---

## Tiến độ (25/09/2026)

Đã lên production trong cùng ngày kiểm toán, theo `docs/THANG_DIEM_QUYET_DINH.md` (tự quyết khi
≥ 80 điểm, không chạm lằn ranh đỏ). 1393 test xanh, `tsc` và `deno check` sạch, migration đã thử
chạy có rollback trên chính CSDL production trước khi đẩy thật.

| Việc | Trạng thái | Điểm |
|---|---|---|
| Đọc phong bì 6 loại webhook theo tài liệu Cas; băm chống trùng; ẩn `identityKey`/CCCD trước khi ghi (`_shared/cas-webhook/phong-bi.ts`, 11 test dùng đúng payload mẫu của Cas) | Đã lên production | 92 |
| Bộ định tuyến trong `cas-webhook`: thân rỗng → `kiem_tra_console`; lệch môi trường → `sai_moi_truong`; INVOICE/TVAN/SIGN/AUTO_DEBIT → `chua_dung` (chỉ ghi, không đổi dữ liệu nghiệp vụ) | Đã lên production | 90 |
| `webhook_events`: `payload_hash` + chỉ mục duy nhất, `environment`, `handler`, `processed_at`, `duration_ms`, `lan_nhan`, `company_id`, `subject_type/id` | Đã lên production | 90 |
| Trạng thái liên kết tách ba (`paused`, `needs_reauth`, `needs_relink`) + giao diện nói đúng việc cần làm (`trang-thai-lien-ket.ts` 9 test, `lienKetNganHang.ts` 31 test) | Đã lên production | 88 |
| TRANSACTIONS: kéo giao dịch xong thì hỏi người dùng NGAY, không chờ lượt quét giờ sau (`_shared/thong-bao/quet-tien-vao.ts`, dùng chung với cron) | Đã lên production | 87 |
| Thay khoá webhook (mục 0) | **Chưa làm** — cần anh dán URL mới vào Cas Console, nên làm cả cụm một lần | — |
| Artifact + Thư viện + trí nhớ hội thoại (Sprint 2) | Chưa làm | — |

**Chưa kiểm được đầu-cuối:** tôi không đọc khoá webhook nên không tự gửi được một sự kiện thật vào
production. Phần định tuyến, chống trùng và ẩn dữ liệu định danh có test riêng; lần sự kiện Cas thật
kế tiếp sẽ là lần xác nhận cuối.

---

## P. Phản biện bản chỉ đạo (đọc trước)

Bản chỉ đạo đúng ở hai điều cốt lõi: **payload là gợi ý, không phải sự thật**, và **không được coi
"đã bật webhook" là "đã hỗ trợ"**. Nhưng đặt cạnh mã, dữ liệu và tài liệu Cas thì có bảy chỗ cần sửa:

1. **Bốn trong sáu loại webhook sẽ không bao giờ tới với MIMI hôm nay.** MIMI không gọi API nào của
   Invoice Hub, TVAN, eSign hay Auto Debit [mã: không có lời gọi nào trong `supabase/functions`,
   `src`]. Theo tài liệu Cas, webhook INVOICE báo mã cơ quan thuế của hoá đơn **do mình phát hành qua
   Invoice Hub**; TVAN báo thông điệp **do mình gửi qua TVAN**; SIGN báo yêu cầu ký **do mình tạo**.
   Không gửi gì thì không có gì để báo. Dựng bốn cỗ máy trạng thái cho sự kiện không thể xảy ra là
   làm tính năng trình diễn — trái với "product freeze" của chính bản chỉ đạo trước. → Sprint này chỉ
   **nhận, ghi, định tuyến, đánh dấu "chưa dùng"**; cỗ máy trạng thái làm khi có luồng gửi đi tương ứng.

2. **12 sự kiện hôm nay không phải sự kiện thật.** [dữ liệu] 12 dòng ngày 24/09 lúc 21:56–22:00 giờ
   VN, thân là `{}` rỗng, bị ghi `ignored`. Đó là các lần Cas Console gửi thử khi lưu cấu hình. Chưa có
   một sự kiện INVOICE/TVAN/SIGN/AUTO_DEBIT thật nào. Cả 12 đều mang khoá cũ — khoá đó đúng là đang
   được dùng và đúng là cần thay.

3. **TVAN đụng một nguyên tắc đã chốt.** Cas có API gửi **tờ khai thuế** qua TVAN
   (`/tvan/tax-return/send`, thân là XML). Nhưng MIMI đã chốt: *không nộp tờ khai thay người dùng*, và
   với chữ ký số anh đã chọn *"Xuất XML để ký trên cổng"*. Gửi TVAN là nộp thay. → Đây là quyết định
   sản phẩm và pháp lý của anh, không phải việc kỹ thuật. Tôi không làm TVAN gửi đi cho tới khi anh
   quyết (xem mục O).

4. **Webhook TVAN không mang trạng thái.** [tài liệu] Payload TVAN chỉ có `messageId`,
   `tvanMessageId`, `taxAuthorityMessageId`, `taxCode`, `senderTaxCode`, `receiverTaxCode` — không có
   "chấp nhận / từ chối". Chuỗi trạng thái `submitted → processing → accepted/rejected` trong bản chỉ
   đạo **không suy ra được từ webhook**; phải có API tra trạng thái, mà tài liệu tôi đọc chưa thấy.
   Không được bịa ánh xạ.

5. **eSign cần số CCCD của người ký** (để đẩy yêu cầu thẳng vào Cas ID) hoặc để người ký quét QR.
   Payload SIGN_COMPLETED còn trả `identityKey`. Đây là dữ liệu định danh nhạy cảm; không được vào
   `webhook_events.payload` nguyên văn, không được vào log.

6. **"Bỏ việc chọn nhóm" đã xong phần lớn.** [mã] Ô hỏi đã ghi đúng "Bạn muốn MIMI xử lý việc gì?",
   mặc định là "Tất cả việc", chọn nhóm là tuỳ chọn. Việc còn lại nhỏ: gợi ý mặc định đang đặt
   "chi phí AI" lên đầu (`TroLyPage.tsx:204`) — sai với người dùng chính.

7. **Thư viện "văn bản MIMI soạn" chỉ nên chứa thứ MIMI thật sự soạn được hôm nay**: tờ khai nháp,
   phụ lục giải trình, báo cáo. Ví dụ "đơn tạm ngừng kinh doanh", "công văn giải trình" trong bản chỉ
   đạo cần sổ đăng ký biểu mẫu chính thức có kiểm phiên bản (mục 20 của chính bản chỉ đạo) — chưa có.
   Làm lớp artifact trước, rồi mới thêm loại văn bản khi có mẫu đã kiểm.

---

## 0. Bảo mật: thay khoá webhook

Khoá trong URL `cas-webhook` đã lộ qua ảnh chụp → coi là đã mất. Nhưng **không thể thay một mình**:
đổi secret trên Supabase trước khi đổi URL trên Cas Console thì mọi webhook thật bị 401 cho tới khi
đổi xong; INVOICE và TVAN chỉ gửi lại 3 lần trong 3 phút [tài liệu].

Đề xuất thay không mất sự kiện (điểm 88, trừ bước Console là của anh):

1. Sửa `cas-webhook` nhận **hai khoá** trong thời gian chuyển: `CAS_WEBHOOK_KEY` và `CAS_WEBHOOK_KEY_MOI`,
   ghi vào `webhook_events` là khoá nào khớp (chỉ ghi "cu"/"moi", không ghi khoá).
2. Sinh khoá mới trên máy, đặt secret bằng `--env-file` rồi xoá tệp — như đã làm với VAPID; không in ra.
3. **Anh** dán URL mới vào 6 webhook trên Cas Console (tôi không nhập khoá vào hệ thống bên thứ ba).
4. Khi `webhook_events` thấy sự kiện thật khớp khoá mới, bỏ khoá cũ.

Để anh lấy được khoá mới mà không lộ trong chat: tôi ghi nó vào một tệp chỉ nằm trên máy anh, anh mở,
dán vào Console, rồi xoá.

---

## A. Hiện trạng từng loại webhook

| Loại | Mã theo tài liệu Cas | Hiện trạng thật | Bằng chứng |
|---|---|---|---|
| GRANT | `ERROR`, `DEFAULT_UPDATE`, `USER_PERMISSION_REVOKED`, `GRANT_DELETED`, `GRANT_PAUSED` | **Hỗ trợ tốt, còn thiếu 2 chỗ.** Hỏi lại Cas rồi mới đổi trạng thái; liên kết QR có đường kiểm riêng. Thiếu: không phân biệt `GRANT_PAUSED`; mọi lỗi đăng nhập gộp thành `needs_relink` | [dữ liệu] 65 sự kiện GRANT từ 12/08, có `USER_PERMISSION_REVOKED` thật |
| TRANSACTIONS | `TRANSACTION_UPDATE` (payload mang `transaction.reference`, `amount`, tài khoản đối ứng) | **Hỗ trợ.** Kéo lại 7 ngày qua `ingestConnection`, chống trùng, đối soát QR. Thiếu: sau khi ghi không chạy phân loại tiền vào / thông báo ngay (phải chờ cron giờ) | [dữ liệu] 15 sự kiện, 7 `verified` |
| INVOICE | `DEFAULT_UPDATE` với `invoice.id`, `codeOfTax`, `codeOfTaxStatus` | **Chỉ ghi nhật ký, xử lý sai đường.** Có `grantId` nên rơi vào nhánh GRANT, tìm `bank_connections` — không có → `ignored`. Không có sự kiện thật nào | [tài liệu] + [mã] |
| TVAN | `DEFAULT_UPDATE` với `tvan.messageId`… **không có `grantId`, không có trạng thái** | **Bị bỏ.** Không `grantId`, không mã tham chiếu QR → `ignored` "no grant id" | [tài liệu] + [mã] |
| SIGN | `DEFAULT_UPDATE`, `signRequest.state` = `COMPLETED`/`REJECTED`, `grantId: null` | **Bị bỏ** như TVAN. Payload chứa `identityKey` và được lưu nguyên văn — rủi ro | [tài liệu] + [mã] |
| AUTO_DEBIT | `DEFAULT_UPDATE` với `autoDebit.state`, `payments[]` | **Xử lý sai đường** như INVOICE. MIMI không dùng trích nợ | [tài liệu] + [mã] |

Ngoài ra: **không kiểm `environment`** (`dev`/production) — một sự kiện sandbox có thể chạy vào dữ
liệu production nếu trùng `grantId`.

## B. Đường đi trong mã

`cas-webhook/index.ts`: kiểm khoá (so sánh thời gian hằng) → ghi `webhook_events` → `extract()` →
- không `grantId`: thử khớp mã tham chiếu QR (`qr_payments.reference_number`) → đối soát; không thì `ignored`.
- có `grantId`: tìm `bank_connections` theo `grant_id` → giải mã token → liên kết `qrpay` thì
  `kiemGrantQr` (`_shared/bank/kiem-grant-qr.ts`) + `docThanhToanQrCas`; liên kết khác thì
  `ingestConnection` (`_shared/bank/ingest.ts`) → thu hồi / cần liên kết lại / giới hạn tần suất /
  sống → cuối cùng `reconcileCompanyQr` cho từng công ty.

**Mọi loại đi chung một đường "tìm grant rồi kéo giao dịch"** — đúng như bản chỉ đạo nghi.

## C. Giả định không đúng trong bản chỉ đạo

- "INVOICE hiện được lưu trong `webhook_events`" — đúng, nhưng chưa bao giờ có sự kiện thật.
- "Cas gửi lại webhook lỗi" — đúng, **nhưng INVOICE/TVAN chỉ 3 lần**, cách 1 phút. Xử lý đồng bộ mà lỗi
  là mất.
- "Chống trùng theo mã sự kiện của Cas" — **Cas không gửi mã sự kiện nào** trong cả 6 loại. Phải băm.
- "TVAN: submitted → processing → accepted/rejected" — webhook không mang trạng thái (P-4).
- "Dựng `handleInvoiceEvent` để quản lý hoá đơn" — hoá đơn MIMI đọc là hoá đơn từ **GDT Hub**
  (`gdt_invoices`, đồng bộ qua `bank-link`), không phải Invoice Hub. Hai thứ khác nhau.

## D. Nguồn tài liệu Cas cho từng handler

| Handler | Nguồn |
|---|---|
| GRANT | `/general/api/webhook` (5 mã), `/grant/*`; mã lỗi `cas.so/errors` (đã dùng trong `errors.ts`) |
| TRANSACTIONS | `/webhook` (`TRANSACTION_UPDATE`), `/get-transactions` |
| INVOICE | `/webhook` (`INVOICE_DEFAULT_UPDATE`), `/invoice-hub` |
| TVAN | `/webhook` (`TVAN_DEFAULT_UPDATE`), `/tvan-send`, `/tvan-tax-declaration-send`, `/tvan-tax-return-send` |
| SIGN | `/webhook` (`SIGN_COMPLETED`, `SIGN_REJECTED`), `/esign-request-document` |
| AUTO_DEBIT | `/webhook` (`AUTO_DEBIT_DEFAULT_UPDATE`), `/auto-debit` |

Chưa tìm thấy: API tra trạng thái thông điệp TVAN; danh sách giá trị `codeOfTaxStatus` ngoài `SUCCESS`.
Hai chỗ này phải hỏi Casso trước khi làm handler thật.

## E. Bộ định tuyến đề xuất

Giữ **một** hàm công khai `cas-webhook`. Bên trong:

```
kiểm khoá (hai khoá khi đang thay)
→ đọc thân; bỏ trường nhạy cảm (identityKey, số CCCD) TRƯỚC khi ghi
→ băm phong bì (webhookType, webhookCode, grantId, id chủ thể, environment, trạng thái) = khoá chống trùng
→ INSERT webhook_events … ON CONFLICT (provider, payload_hash) DO NOTHING
     trùng → trả 200 "duplicate", không xử lý lại
→ kiểm environment khớp môi trường đang chạy; lệch → "wrong_environment", dừng
→ định tuyến theo webhookType (thiếu thì theo hình dạng: có transaction / invoice / tvan / signRequest / autoDebit)
     GRANT        → xuLyGrant()         (mã hiện có, tách ra)
     TRANSACTIONS → xuLyGiaoDich()      (mã hiện có + chạy lọc tiền vào ngay)
     INVOICE      → ghiNhan('invoice')  chỉ ghi, outcome "chua_dung"
     TVAN         → ghiNhan('tvan')     chỉ ghi, outcome "chua_dung"
     SIGN         → ghiNhan('sign')     chỉ ghi, outcome "chua_dung"
     AUTO_DEBIT   → ghiNhan('auto_debit') chỉ ghi, KHÔNG hành động tiền
→ ghi outcome, handler, thời gian xử lý
```

Thân rỗng `{}` (lần thử của Console) → `outcome = 'kiem_tra_console'`, không lẫn với lỗi thật.

## F. Thay đổi CSDL

`webhook_events` — thêm cột (hiện có 9 cột: id, provider, event_type, event_code, grant_id, payload,
outcome, note, received_at):

- `payload_hash text` + chỉ mục duy nhất `(provider, payload_hash)` — chống trùng.
- `environment text`, `handler text`, `processed_at timestamptz`, `duration_ms int`, `lan_nhan int default 1`.
- `company_id uuid`, `subject_type text`, `subject_id text` — gắn sự kiện vào đúng công ty, đúng chủ thể.
- `khoa_khop text` (`cu`/`moi`) trong lúc thay khoá.
- RLS: giữ như hiện nay — chỉ máy chủ đọc/ghi.

`bank_connections.status` — thêm giá trị, không đổi giá trị cũ: `paused` (GRANT_PAUSED),
`needs_reauth` (GRANT_LOGIN_REQUIRED và họ lỗi đăng nhập), giữ `needs_relink` cho lỗi khác. Thêm
`last_error_code`, `last_synced_at` (kiểm xem đã có chưa trước khi thêm).

**Không** tạo bảng trạng thái hoá đơn / TVAN / ký số trong sprint này (P-1).

## G. Artifact và Thư viện

Bảng `artifacts` (một dòng một văn bản) + `artifact_versions` (bất biến, một dòng một phiên bản):

- `artifacts`: id, company_id, loai (`to_khai_nhap`, `phu_luc_giai_trinh`, `bao_cao`, `chung_tu`, `van_ban_mimi_soan`, `van_ban_da_ky`),
  tieu_de, mo_ta, trang_thai (`nhap`, `da_duyet`, `da_ky`, `da_nop`), phien_ban_hien_tai, ky_tu, ky_den,
  can_cu_phap_ly jsonb, nguon jsonb (id giao dịch / hoá đơn / phân loại làm bằng chứng), tags,
  `search_text tsvector` (tiếng Việt bỏ dấu), tao_boi, tao_luc, cap_nhat_luc.
- `artifact_versions`: id, artifact_id, so_phien_ban, phien_ban_cha, noi_dung (text/jsonb) hoặc
  duong_dan_luu_tru, mime, **content_hash sha256**, trang_thai, tao_boi, tao_luc.
  Trigger: phiên bản `da_ky`/`da_nop` **không UPDATE, không DELETE được** — sửa thì tạo phiên bản mới.
- RLS: thành viên công ty đọc; chỉ máy chủ ghi (cùng mô hình `revenue_classifications`).

Thư viện: giữ nguồn hiện có (`chung_tu_quet`, `gdt_invoices`), thêm `artifacts`; bộ lọc theo `loai`;
tìm theo `search_text`. Không dời dữ liệu cũ sang bảng mới — gộp khi hiển thị.

Nguồn đầu tiên đổ vào `artifacts`: **tờ khai nháp đã xuất** (`to_khai_nhap.da_xuat_luc`) và **phụ lục
giải trình** — hai thứ MIMI đã soạn thật, có bằng chứng thật.

## H. Ngữ cảnh và trí nhớ của trợ lý

Hiện trạng [mã]: `dungLichSu` gửi **3 lượt gần nhất** (`src/lib/troLy.ts:106`), không lưu gì phía máy chủ;
tải lại trang là mất cuộc trò chuyện.

Đề xuất:
- `hoi_thoai` (id, company_id, user_id, tieu_de, tom_tat jsonb, viec_dang_lam jsonb, tao_luc) và
  `tin_nhan` (hoi_thoai_id, vai, noi_dung, the_du_lieu jsonb, tao_luc). RLS: chỉ chủ cuộc trò chuyện.
- Mỗi lượt gửi: 6 lượt gần nhất + `tom_tat` (máy chủ cập nhật khi quá 6 lượt) + `viec_dang_lam`
  (ví dụ `{loai: 'giai_trinh', transaction_id}`) + trạng thái công ty (đã có trong `tro-ly`).
- Không gửi lịch sử vô hạn. Không đưa số tài khoản, CCCD vào `tom_tat`.

## I. Tệp sẽ sửa

`supabase/functions/cas-webhook/index.ts` · `_shared/bank/ingest.ts` (phân biệt `needs_reauth`/`paused`) ·
`_shared/bank/errors.ts` (nhóm mã lỗi đăng nhập) · `src/components/…/CasLink.tsx` (hiện trạng thái mới) ·
`tro-ly/index.ts` + `_shared/tro-ly/*` (câu "ngân hàng còn kết nối không", "có gì mới hôm nay", đọc
hội thoại) · `src/lib/troLy.ts`, `src/pages/TroLyPage.tsx` (gợi ý mặc định, lưu hội thoại) ·
`src/pages/ThuVienChungTuPage.tsx`, `src/lib/thuVienChungTu.ts` (thêm nguồn `artifacts`) ·
`to-khai/index.ts` (xuất xong thì tạo artifact).

## J. Tệp sẽ tạo

`_shared/cas-webhook/phong-bi.ts` (đọc + băm + bỏ trường nhạy cảm, có test) ·
`_shared/cas-webhook/dinh-tuyen.ts` (có test cho cả 6 payload mẫu của Cas + thân rỗng) ·
`_shared/tai-lieu/artifact.ts` (tạo phiên bản, băm, khoá phiên bản đã ký) ·
migration `webhook_events` · migration `artifacts` · migration `hoi_thoai` · test tương ứng.

## K. Rủi ro migration

- Thêm chỉ mục duy nhất `payload_hash` trên bảng đã có ~95 dòng: cột mới để NULL cho dòng cũ,
  chỉ mục duy nhất bỏ qua NULL → không vỡ.
- Thêm giá trị `status` mới: nếu có CHECK constraint phải sửa cùng lúc; mọi chỗ đang so `=== 'needs_relink'`
  phải xét thêm `needs_reauth`/`paused` (grep trước khi đổi).
- `artifacts` tách khỏi `to_khai_nhap`: không xoá, không dời — chỉ thêm liên kết.

## L. Rủi ro bảo mật

1. Khoá webhook đã lộ (mục 0).
2. `identityKey` (SIGN) và CCCD (eSign) sẽ nằm nguyên văn trong `webhook_events.payload` nếu không
   lọc trước khi ghi.
3. Không kiểm `environment` → sự kiện sandbox có thể tác động production.
4. Webhook Cas không có chữ ký → giữ nguyên nguyên tắc "hỏi lại Cas rồi mới đổi"; với INVOICE/TVAN/SIGN
   chưa có đường hỏi lại → **chỉ ghi, không đổi trạng thái nghiệp vụ nào** cho tới khi có.
5. Artifact đã ký bị sửa lặng lẽ → khoá bằng trigger ở CSDL, không chỉ ở giao diện.
6. Hội thoại lưu lâu dài chứa dữ liệu tài chính → RLS theo người dùng, có nút xoá cuộc trò chuyện
   (xoá thật do người dùng yêu cầu, không phải xoá tự động).

## M. Kế hoạch 2 sprint

**Sprint 1 — xương sống sự kiện + tiền thật (điểm tự quyết ≥ 85, trừ bước Console)**
1. Hai khoá webhook, thay khoá (anh làm bước Console).
2. Phong bì + băm + chống trùng + kiểm `environment` + lọc trường nhạy cảm; bộ định tuyến 6 loại.
3. GRANT: `paused`, `needs_reauth` tách khỏi `needs_relink`; giao diện nói đúng việc cần làm.
4. TRANSACTIONS: ghi xong thì chạy lọc tiền vào + thông báo ngay cho công ty đó (dùng lại `thong-bao`).
5. Trợ lý: "Ngân hàng của tôi còn kết nối không?" và "Có gì mới hôm nay?" đọc dữ liệu thật; gợi ý mặc
   định bỏ "chi phí AI".

**Sprint 2 — tài liệu + trí nhớ**
6. `artifacts` + `artifact_versions` + khoá phiên bản đã ký; tờ khai đã xuất và phụ lục giải trình tự vào.
7. Thư viện "Tài liệu & Chứng từ": thêm nguồn, bộ lọc, tìm theo nội dung.
8. `hoi_thoai` + `tin_nhan` + tóm tắt + việc đang làm.
9. Trợ lý: "đã lưu vào Tài liệu & Chứng từ" chỉ khi thật sự đã lưu; không bao giờ nói "sẵn sàng nộp".

Không có trong 2 sprint: handler INVOICE/TVAN/SIGN có trạng thái; gửi TVAN; tạo yêu cầu ký; văn bản
hành chính mới (đơn tạm ngừng…).

## N. Kiểm thử nghiệm thu

- Cùng một payload gửi hai lần → một dòng xử lý, lần hai `duplicate`.
- Thân `{}` → `kiem_tra_console`, không lỗi.
- Payload `environment: dev` trên production → `wrong_environment`, không đụng dữ liệu.
- Payload mẫu SIGN_COMPLETED → `webhook_events.payload` **không** chứa `identityKey`.
- GRANT_PAUSED → liên kết `paused`, không `needs_relink`; ERROR/GRANT_LOGIN_REQUIRED → `needs_reauth` và
  giao diện nói "đăng nhập lại ngân hàng".
- USER_PERMISSION_REVOKED giả mạo trong khi Cas nói grant còn sống → liên kết vẫn `connected`.
- TRANSACTION_UPDATE → giao dịch ghi đúng một lần; khoản tiền vào mơ hồ tạo đúng một thông báo.
- Sự kiện của công ty A không chạm dữ liệu công ty B.
- AUTO_DEBIT mẫu → ghi nhận, không có lời gọi chuyển tiền nào, không đổi `subscriptions`.
- INVOICE/TVAN mẫu → ghi nhận `chua_dung`, không tạo trạng thái giả.
- Artifact: phiên bản `da_ky` → UPDATE bị CSDL từ chối; tìm theo tiêu đề, nội dung, tag ra đúng.
- Trợ lý: sau 10 lượt về một khoản giải trình, câu "soạn văn bản đi" vẫn đúng khoản đó.

## O. Bật ở kỹ thuật, TẮT ở sản phẩm

| Loại | Ở sản phẩm | Lý do |
|---|---|---|
| AUTO_DEBIT | Tắt | MIMI không giữ, không chuyển tiền; không có ca dùng đã kiểm |
| TVAN (gửi đi) | Tắt, **chờ anh quyết** | Là nộp tờ khai thay người dùng — trái nguyên tắc đã chốt; webhook không mang trạng thái |
| SIGN (tạo yêu cầu ký) | Tắt | Cần CCCD người ký và artifact bất biến — làm sau Sprint 2 |
| INVOICE (Invoice Hub) | Tắt | MIMI không phát hành hoá đơn; hoá đơn MIMI đọc đến từ GDT Hub |
| GRANT, TRANSACTIONS | Bật | Đã có luồng thật, đã có sự kiện thật |

---

## Cần anh quyết trước khi làm

1. **Thay khoá webhook**: đồng ý cách "hai khoá, anh dán URL mới vào Console" không?
2. **TVAN**: MIMI có chuyển từ "xuất XML để anh tự ký và nộp trên cổng" sang "nộp thay qua TVAN" không?
   Đây là thay đổi trách nhiệm pháp lý, không phải tính năng.
3. **Phạm vi**: đồng ý chỉ ghi nhận INVOICE/TVAN/SIGN/AUTO_DEBIT (P-1) thay vì dựng cỗ máy trạng thái ngay?
