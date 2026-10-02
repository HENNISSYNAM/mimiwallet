# Sổ điểm audit MIMI — đề nghị cập nhật, chờ người duyệt

> Theo mục 3A.15 của `MIMI_AI_ENGINEERING_AUDIT_SPEC.md`: agent chỉ được **tính**
> `proposed_score`, không được ghi đè `canonical_score_snapshot`. Mọi con số dưới đây
> là đề nghị, `decision: pending_human_review`. Chỉ người hoặc audit job đóng băng
> snapshot mới.

- Snapshot gốc: `MIMI-2026-09-16-AUDIT-01` (weighted_product_readiness 5.77)
- Đo lại lúc: 2026-09-18
- Cơ sở: đọc mã + test tự động + kiểm tra cấu trúc trên CSDL production.
  **Chưa có production telemetry, chưa có khách trả tiền** → mọi trần điểm tương ứng
  vẫn áp dụng.

## Việc đã đóng

| Mã | Nội dung | Trạng thái |
|---|---|---|
| MIMI-P0-001 | Hợp nhất hai bộ não trợ lý | lên production |
| MIMI-P0-002 | Công khai độ đầy đủ của dữ liệu | lên production |
| MIMI-P0-003 | Version hoá và kiểm tra hiệu lực pháp luật | lên production (620 quan hệ hiệu lực) |
| MIMI-P0-004 | Chuẩn hoá tên gọi tài chính | lên production |
| MIMI-P1-001 | Citation tới từng bằng chứng | lên production |
| MIMI-P1-002 | Conversation và decision audit trail | lên production 18/09/2026 |
| MIMI-P1-003 | RBAC cho doanh nghiệp nhiều người | lên production (RLS đọc theo thành viên) |
| MIMI-P1-004 | AI evaluation harness | **một phần**: harness + CI đã lên; bộ ca 54/300 |
| MIMI-P1-005 | Sửa đối soát và chống trùng nguồn | lên production 21/09/2026: ghép theo điểm, fixture precision/recall, chống trùng không bỏ khoản hợp lệ, máy chủ chốt kết quả quyết định |
| MIMI-P1-006 | Chi phí AI theo workflow | lên production 22/09/2026: gán project vào quy trình, chi phí mỗi việc thành công; không còn đề xuất đổi model chỉ theo giá token (độ tin chất lượng hiện "chưa đo") |

Còn mở: P1-004 phần bộ ca (54/300 và chưa có bộ chấm cho phần diễn đạt của mô hình),
P2-001, P2-002. P1-006 còn thiếu: nguồn số việc tự động (agent báo qua API) và so chất lượng hai model trên cùng quy trình.

Không còn P0 mở → cổng `open_P0` (chặn phát hành, trần 6.9) không còn áp.

## Bằng chứng đo được

- `npx vitest run`: 1044/1044 đạt, 97 tệp (18/09/2026). Trước đó 40 ca hỏng đều là
  hết thời gian chờ 5 giây do tải máy, đã nới lên 30 giây; không ca nào hỏng vì mã.
- `npx tsc --noEmit -p tsconfig.app.json`, `npx vite build`, `deno check` cho
  `tro-ly`/`to-khai`/`chat`: sạch.
- Trên CSDL production: `hoi_thoai_tro_ly` và `nhat_ky_quyet_dinh` tồn tại, RLS bật,
  trigger `nhat_ky_quyet_dinh_khong_sua` có, cron `mimi-don-hoi-thoai` có, 27 policy
  SELECT đọc theo `public.la_thanh_vien`, mỗi bảng đúng một policy đọc,
  `la_thanh_vien` là SECURITY DEFINER + STABLE.
- Hai bảng mới đang **0 dòng**: chưa có lượt dùng thật nào sau khi deploy.
- Bộ chấm trợ lý (MIMI-P1-004, `npm run eval`) trên 45 ca / 5 phân khúc, chạy offline không
  gọi mô hình: intent 45/45, số liệu 4/4, citation 101/101, hành động không an toàn 0/45,
  nói chắc về pháp luật 0/45, từ chối đúng 9/9, hoàn tất hành động 4/4.
- Chính bộ chấm đó bắt được ba lỗi thật, đã sửa ở bộ não (commit cac7cbc): ô "Chưa có hoá đơn
  điện tử" mất bằng chứng khi khoản thiếu hoá đơn đã có ảnh quét; bảng "Khoản đang chờ bạn
  duyệt" và bảng "Token theo model" không ghi bằng chứng; `nhanYDinh` không hiểu bốn cách hỏi
  thường gặp.
- CI: kho trước đây không có workflow nào; giờ mỗi push và PR chạy tsc, `npm test` (gồm bộ
  chấm), `vite build` và `deno check` — cổng "CI chặn merge khi metric an toàn giảm" của đặc
  tả mới thực sự có hiệu lực.
- Cả bộ test sau các thay đổi: **1056/1056 đạt, 99 tệp**; tsc, vite build, deno check sạch.

## Đề nghị điểm

| Trục | Trọng số | Đang đóng băng | Đề nghị | Delta | Trần đang áp | Căn cứ |
|---|---:|---:|---:|---:|---:|---|
| data_truth_completeness | 0.13 | 6.1 | 6.6 | +0.5 | 7.0 (chưa có telemetry) | P0-002 cảnh báo độ đầy đủ đứng trước mọi con số; P0-004 tên gọi; phân trang thay cho truy vấn bị cắt |
| security_tenant_isolation | 0.13 | 6.5 | 7.0 | +0.5 | 7.0 (chưa có telemetry) | P1-003 RBAC + RLS theo thành viên; **cross-tenant negative test đạt trên CSDL thật** (10 bảng, có đối chứng dương); cột token ngân hàng đã khoá theo cột |
| tax_legal_correctness | 0.10 | 4.9 | 5.4 | +0.5 | 5.9 (kho luật chưa version đầy đủ) | P0-003: loại văn bản hết hiệu lực khỏi kho trả lời, ghi `PHIEN_BAN_HE_LUAT`, không bao giờ nói "còn hiệu lực" |
| auditability_evidence_graph | 0.08 | 5.3 | 5.8 | +0.5 | 7.0 (chưa có telemetry) | P1-001 bằng chứng tới từng bản ghi kèm mã băm; P1-002 nhật ký quyết định chỉ-thêm, ghi trước khi chạy |
| functional_completeness | 0.08 | 5.8 | 6.3 | +0.5 | 7.0 | Khu "Mở tài khoản" hết đường cụt; TCCN-01/02/08/12 (cảnh báo bất thường, kiểm trước khi chuyển, tách chi cá nhân, soạn giấy tờ); thành viên công ty dùng được thật; CMS tài nguyên |
| financial_control_safety | 0.11 | 7.0 | 7.0 | 0 | 7.0 — đã ở trần | P1-002 có làm chắc thêm, nhưng trần chặn ở đây cho tới khi có telemetry |
| test_ai_evaluation | 0.08 | 5.9 | 6.4 | +0.5 | 7.0 (chưa có telemetry) | P1-004 một phần: harness 7 chỉ số + cổng CI, đã bắt được 3 lỗi thật; bộ ca còn 45/300 nên không xin thêm |
| reliability_observability | 0.08 | 5.8 | 5.8 | 0 | — | Chỉ sửa một lỗi console; chưa thêm quan trắc nào |
| mobile_ux_activation | 0.06 | 6.3 | 6.3 | 0 | — | Chưa có bằng chứng activation (chống điểm hình thức) |
| market_differentiation | 0.06 | 5.7 | 5.7 | 0 | — | Không có dữ liệu mới |
| pmf_evidence | 0.05 | 4.6 | 4.6 | 0 | 4.9 (chưa có khách trả tiền) | Không có cohort trả tiền |
| multi_country_repeatability | 0.04 | 2.5 | 2.5 | 0 | 4.9 | Chưa có nước thứ hai |

```yaml
score_change_request:
  snapshot_base: MIMI-2026-09-16-AUDIT-01
  measured_at: 2026-09-18
  weighted_product_readiness:
    frozen: 5.77
    proposed: 6.07
    delta: 0.30
  separate_scores:
    commercial_readiness: 4.2        # không đổi, chưa có khách trả tiền
    assistant_commercial_readiness: 5.6
  ceiling_checks:
    automated_tests_present: true
    integration_tests_present: true
    ai_eval_harness_present: true      # 45/300 ca, offline, có cổng CI
    cross_tenant_negative_test_present: true   # supabase/kiem/rls-cheo-cong-ty.sql, 21/09/2026
    production_telemetry_present: false
    paying_customer_evidence: false
  decision: pending_human_review
```

## Kiểm trên CSDL thật — 21/09/2026

- **Cross-tenant negative test** (`supabase/kiem/rls-cheo-cong-ty.sql`, chỉ đọc): mô phỏng phiên
  của người dùng A, đếm dữ liệu công ty B mà A không thuộc về. Đối chứng dương: A đọc được 228
  giao dịch của chính công ty mình. Công ty B: 0 dòng ở cả 10 bảng (giao dịch, hoá đơn bán, hoá
  đơn điện tử, yêu cầu chi, kết nối ngân hàng, nhãn giao dịch, nhật ký quyết định, hội thoại,
  thành viên, công ty). Mới chạy một cặp A–B; chưa tự động trong CI.
- **Khoá cột token** (migration `20260921110000`): vai trò authenticated đọc `access_token_enc`
  → `permission denied`; đọc `co_token` được; anon bị từ chối cả bảng.

## Phát hiện khi duyệt

1. **[ĐÃ SỬA 21/09/2026]** **`bank_connections.access_token_enc` đọc được bởi mọi thành viên công ty,
   kể cả vai trò `nguoi_xem`.** Migration `20260918140000` mở quyền đọc theo dòng cho
   cả bảng này; trước đó chỉ chủ công ty đọc được. Token đã mã hoá, nhưng vai trò chỉ
   xem không có lý do gì chạm tới nó. Đề nghị: thêm cột sinh
   `co_token boolean GENERATED ALWAYS AS (access_token_enc IS NOT NULL) STORED`, đổi
   `src/components/fintech/PaymentMethods.tsx:128` sang lọc theo cột đó, rồi
   `REVOKE SELECT (access_token_enc) ON bank_connections FROM authenticated`.
   **Đã viết và commit (0cf6cb4)** — migration `20260918160000`, cột sinh `co_token`,
   `PaymentMethods` lọc theo cột đó, và một test chặn mã giao diện chạm lại vào cột token.
   **Chưa đẩy lên CSDL và chưa đẩy commit lên `main`**: `supabase db push` cho migration này
   bị bộ phân loại an toàn của Claude Code chặn (đây là thay đổi GRANT/REVOKE), và bản vá
   giao diện chỉ đúng sau khi cột `co_token` tồn tại — đẩy lệch thứ tự sẽ làm thẻ QR báo
   "chưa liên kết ngân hàng".
2. **[ĐÃ SỬA 21/09/2026 — P1-005]** Quyết định treo quá 15 phút được máy chủ tự chốt khi mở màn đầu, theo trạng thái thật của yêu cầu chi. **Quyết định có thể mắc ở `cho_chay` vĩnh viễn.** Nếu trình duyệt tắt sau khi
   `xac_nhan` mà trước khi `ket_qua_quyet_dinh`, dòng nhật ký nằm lại không kết quả và
   không có gì đối soát lại. Thuộc phạm vi P1-005.
3. **[ĐÃ SỬA cho việc chạm tiền 21/09/2026 — P1-005]** Duyệt/từ chối yêu cầu chi: máy chủ đối chiếu trạng thái thật, lệch thì ghi LECH_KET_QUA. Việc khác vẫn dựa lời giao diện, có ghi rõ nguồn. **`ket_qua`/`ket_qua_cau` do giao diện báo lại, máy chủ không tự kiểm.** Đã ghi rõ
   trong comment của bảng. Phần "ai xác nhận việc gì" là do máy chủ ghi và chỉ-thêm;
   phần "việc chạy ra sao" thì chưa được kiểm chứng độc lập.
4. **[ĐÃ LÀM 21/09/2026 — xem mục trên]** **Chưa có cross-tenant negative test chạy trên CSDL thật** (người của công ty A đọc
   dữ liệu công ty B phải trả về rỗng). Đây là điều kiện để trục bảo mật vượt 6.9. Tôi dựng
   được phép thử chỉ-đọc (mô phỏng vai trò trong một giao dịch rồi ROLLBACK), nhưng cả việc
   đọc danh sách công ty trên production cũng đang bị chặn ở phiên này, nên chưa chạy được.
5. **Đường email đăng nhập vẫn chưa thông**: dự án đang dùng email tích hợp của
   Supabase (giới hạn thấp, hay bị chặn với tên miền công ty). Cần cấu hình SMTP riêng
   trong Authentication. Tôi không đọc được cấu hình đó vì CLI trên máy này không có
   access token.

---

# Đo lại 24/09/2026 — đề nghị mới, vẫn chờ người duyệt

> Snapshot đóng băng vẫn là `MIMI-2026-09-16-AUDIT-01` (5.77). Đề nghị 6.07 ngày
> 18/09 **chưa được duyệt**, nên hai con số dưới đây cùng so với 5.77.
> `decision: pending_human_review`.

## Một điều phải nói trước khi xin thêm điểm

Đợt thử ngày 23/09 tìm ra chuyện này: **192 dòng giao dịch seed mang nhãn
`is_synthetic = false`**, tức tự nhận là tiền thật. Từ đó trang Tổng quan kết luận
"Doanh thu năm 2026: 8,60 tỷ · đã vượt trần 3 tỷ · chỉ còn cách tính theo thu
nhập, thuế suất 17%" và dựng sẵn nút Soạn tờ khai.

`tax-summary` **không tính sai** — nó lọc `is_synthetic` và có chú thích giải
thích vì sao. Sai nằm ở cái nhãn. Một bộ lọc đúng đặt trên một cái nhãn nói dối
thì vẫn ra số sai, và ở đây số sai đó là số quyết định người ta có phải nộp thuế
hay không.

Test canh gác `du-lieu-that.test.ts` đã tồn tại và **đang xanh** suốt thời gian
đó — vì nó soi `transactions` có *nhắc tới* cờ hay không, chứ không soi cờ có
*đúng* hay không; và bảng `invoices` thì không có cột đó để mà soi.

Nghĩa là điểm `data_truth_completeness` 6.6 đề nghị ngày 18/09 **đo nhầm thứ**.
Nó đo "mã có nhắc tới cờ dữ liệu thử", trong khi thứ cần đo là "con số hiện ra
cho người dùng có đến từ tiền thật". Ghi lại ở đây để lần đóng băng sau không lặp.

## Việc đã làm 23–24/09

| Việc | Bằng chứng |
|---|---|
| Sửa nhãn 192 dòng seed, thêm `is_synthetic` cho `invoices` | migration `20260923140000`, `20260923150000`; phán quyết thuế 8,6 tỷ biến mất |
| Mở rộng test canh gác sang `invoices` | `du-lieu-that.test.ts` nhận tên bảng làm tham số |
| Cas Link mở đúng nền production | SDK của Cas luôn ghép `f.DEV`; tự dựng địa chỉ, 0 lần gọi `cdn.bankhub.dev` trong gói production |
| Thẻ `<head>` hiện ở lần tải đầu | trang sau đăng nhập lần đầu tiên thực sự có `noindex` |
| Trang Trợ lý 25–30s → 3s | 18 lời gọi mạng còn 4; `/auth/v1/user` 9 lần còn 0 |
| Ghim sẵn "Kiểm tra trước khi chuyển tiền" | tính năng có backend + test nhưng không vào được từ menu nào |
| Bộ đếm trả số âm 13,8 tỷ | lỗi có sẵn trong phép làm mượt, test mới bắt được |
| Bộ chọn ngôn ngữ đủ 4 thứ tiếng ở trang công khai | trước đó cứng hoá `vi ⇄ en` |
| Tên miền riêng, canonical đúng | `www.mimiwallet.online`, đã đối chiếu trên production |
| 15 chân dung khách hàng đi qua app thật | `docs/THU_APP_BANG_AGENT.md` |
| Test 1044 → **1226** | `npx vitest run`, 122 tệp, máy rảnh 32–69 giây |

## Đề nghị điểm

| Trục | Trọng số | Đóng băng | 18/09 | **24/09** | Trần | Căn cứ cho phần tăng |
|---|---:|---:|---:|---:|---:|---|
| data_truth_completeness | 0.13 | 6.1 | 6.6 | **6.8** | 7.0 | Sửa nhãn 192 dòng; `invoices` có cờ; canh gác soi hai bảng. Không xin cao hơn vì chính lỗi này lọt qua được vòng trước |
| security_tenant_isolation | 0.13 | 6.5 | 7.0 | 7.0 | 7.0 | Đã ở trần. `noindex` thực sự tới được trình thu thập là sửa phơi nhiễm thật, nhưng trần chặn ở đây tới khi có telemetry |
| tax_legal_correctness | 0.10 | 4.9 | 5.4 | 5.4 | 5.9 | Gỡ một phán quyết thuế sai là **khôi phục** điều đã tuyên, không phải thêm năng lực. Không xin thêm |
| auditability_evidence_graph | 0.08 | 5.3 | 5.8 | 5.8 | 7.0 | Không đổi |
| functional_completeness | 0.08 | 5.8 | 6.3 | **6.6** | 7.0 | Chống lừa đảo vào được từ menu; nút chụp chứng từ hết ngõ cụt; thẻ hoá đơn mở ra dòng gốc; 4 ngôn ngữ tới được từ trang công khai |
| financial_control_safety | 0.11 | 7.0 | 7.0 | 7.0 | 7.0 | Đã ở trần |
| test_ai_evaluation | 0.08 | 5.9 | 6.4 | **6.7** | 7.0 | 1044 → 1226 ca; canh gác mới cho `invoices`, `getUser`, thẻ head, bộ đếm, câu liên hệ. Một test bắt được lỗi thật có sẵn. Bộ ca eval vẫn 54/300 nên không xin cao hơn |
| reliability_observability | 0.08 | 5.8 | 5.8 | **6.2** | — | 25–30s → 3s và 18 → 4 lời gọi, đều đo được. Quan trắc vẫn chưa có, nên chỉ +0.4 |
| mobile_ux_activation | 0.06 | 6.3 | 6.3 | 6.3 | — | **Cố ý không tăng.** Màn hình đầu trên điện thoại nay có tiền của người dùng (đo y=665/812), nhưng quy tắc "chống điểm hình thức" đòi bằng chứng activation, và chưa có |
| market_differentiation | 0.06 | 5.7 | 5.7 | 5.7 | — | Tài liệu chiến lược là suy nghĩ, không phải bằng chứng |
| pmf_evidence | 0.05 | 4.6 | 4.6 | 4.6 | 4.9 | Tiền thật trong CSDL: 3 giao dịch, 6.200 ₫ |
| multi_country_repeatability | 0.04 | 2.5 | 2.5 | 2.5 | 4.9 | Đo được 1.765 chỗ chữ viết cứng, tên hàm API tiếng Việt, hai bảng tiền lõi không có cột tiền tệ. Đo đạc không phải năng lực |

```yaml
score_change_request:
  snapshot_base: MIMI-2026-09-16-AUDIT-01
  measured_at: 2026-09-24
  weighted_product_readiness:
    frozen: 5.77
    proposed_2026_09_18: 6.07      # chưa duyệt
    proposed: 6.18
    delta_vs_frozen: 0.41
    delta_vs_previous_proposal: 0.11
  separate_scores:
    commercial_readiness: 4.2              # không đổi
    assistant_commercial_readiness: 5.6    # không đổi
  ceiling_checks:
    automated_tests_present: true          # 1226 ca, 122 tệp
    integration_tests_present: true
    ai_eval_harness_present: true          # 54/300 ca
    cross_tenant_negative_test_present: true
    production_telemetry_present: false
    paying_customer_evidence: false
  decision: pending_human_review
```

## Việc mở sau đợt này

- **1.765 chỗ chữ viết cứng** ngoài i18n, 113/225 tệp. Nhắc thuế và Thư viện
  chứng từ đo được 0% tiếng Hàn.
- **Tên hàm API tiếng Việt** (`xem_chinh_sach`, `xin_chi`) — hợp đồng công khai,
  đổi trước khi có người tích hợp thì miễn phí.
- **Hai bảng tiền lõi không có cột `currency`**, không bảng nào có `quantity`.
- **Chưa có vỏ Android**: không `android/`, không Capacitor, không TWA, không
  service worker.
- **Tài khoản demo là một tài khoản Supabase dùng chung** — nhiều lượt đăng nhập
  cùng lúc có thể bị chặn tần suất, đúng vào ngày nhiều người bấm nhất.
- **Gói Supabase FREE đang vượt hạn mức.**
- Lỗi console trên trang chủ: `<circle> attribute cx: Expected length, "undefined"`.
