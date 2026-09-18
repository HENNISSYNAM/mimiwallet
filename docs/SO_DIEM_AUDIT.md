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

Còn mở: MIMI-P1-004 (eval harness), P1-005 (đối soát), P1-006 (chi phí AI theo
workflow), P2-001, P2-002.

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

## Đề nghị điểm

| Trục | Trọng số | Đang đóng băng | Đề nghị | Delta | Trần đang áp | Căn cứ |
|---|---:|---:|---:|---:|---:|---|
| data_truth_completeness | 0.13 | 6.1 | 6.6 | +0.5 | 7.0 (chưa có telemetry) | P0-002 cảnh báo độ đầy đủ đứng trước mọi con số; P0-004 tên gọi; phân trang thay cho truy vấn bị cắt |
| security_tenant_isolation | 0.13 | 6.5 | 6.6 | +0.1 | 6.9 (chưa có cross-tenant negative test) | P1-003 RBAC 5 vai trò + RLS theo thành viên; bị hãm bởi phát hiện #1 dưới đây |
| tax_legal_correctness | 0.10 | 4.9 | 5.4 | +0.5 | 5.9 (kho luật chưa version đầy đủ) | P0-003: loại văn bản hết hiệu lực khỏi kho trả lời, ghi `PHIEN_BAN_HE_LUAT`, không bao giờ nói "còn hiệu lực" |
| auditability_evidence_graph | 0.08 | 5.3 | 5.8 | +0.5 | 7.0 (chưa có telemetry) | P1-001 bằng chứng tới từng bản ghi kèm mã băm; P1-002 nhật ký quyết định chỉ-thêm, ghi trước khi chạy |
| functional_completeness | 0.08 | 5.8 | 5.9 | +0.1 | 7.0 | Khu "Mở tài khoản" không còn là đường cụt; báo cáo bỏ khối số bịa |
| financial_control_safety | 0.11 | 7.0 | 7.0 | 0 | 7.0 — đã ở trần | P1-002 có làm chắc thêm, nhưng trần chặn ở đây cho tới khi có telemetry |
| test_ai_evaluation | 0.08 | 5.9 | 5.9 | 0 | — | Thêm test đơn vị không thay thế eval harness; P1-004 chưa làm |
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
    proposed: 5.95
    delta: 0.18
  separate_scores:
    commercial_readiness: 4.2        # không đổi, chưa có khách trả tiền
    assistant_commercial_readiness: 5.6
  ceiling_checks:
    automated_tests_present: true
    integration_tests_present: true
    cross_tenant_negative_test_present: false
    production_telemetry_present: false
    paying_customer_evidence: false
  decision: pending_human_review
```

## Phát hiện khi duyệt — chưa sửa

1. **`bank_connections.access_token_enc` giờ đọc được bởi mọi thành viên công ty,
   kể cả vai trò `nguoi_xem`.** Migration `20260918140000` mở quyền đọc theo dòng cho
   cả bảng này; trước đó chỉ chủ công ty đọc được. Token đã mã hoá, nhưng vai trò chỉ
   xem không có lý do gì chạm tới nó. Đề nghị: thêm cột sinh
   `co_token boolean GENERATED ALWAYS AS (access_token_enc IS NOT NULL) STORED`, đổi
   `src/components/fintech/PaymentMethods.tsx:128` sang lọc theo cột đó, rồi
   `REVOKE SELECT (access_token_enc) ON bank_connections FROM authenticated`.
   Đây là thay đổi RLS/quyền → `require_human_review_if` của đặc tả, cần người đồng ý
   trước khi đẩy.
2. **Quyết định có thể mắc ở `cho_chay` vĩnh viễn.** Nếu trình duyệt tắt sau khi
   `xac_nhan` mà trước khi `ket_qua_quyet_dinh`, dòng nhật ký nằm lại không kết quả và
   không có gì đối soát lại. Thuộc phạm vi P1-005.
3. **`ket_qua`/`ket_qua_cau` do giao diện báo lại, máy chủ không tự kiểm.** Đã ghi rõ
   trong comment của bảng. Phần "ai xác nhận việc gì" là do máy chủ ghi và chỉ-thêm;
   phần "việc chạy ra sao" thì chưa được kiểm chứng độc lập.
4. **Chưa có cross-tenant negative test chạy trên CSDL thật** (người của công ty A đọc
   dữ liệu công ty B phải trả về rỗng). Đây là điều kiện để trục bảo mật vượt 6.9.
5. **Đường email đăng nhập vẫn chưa thông**: dự án đang dùng email tích hợp của
   Supabase (giới hạn thấp, hay bị chặn với tên miền công ty). Cần cấu hình SMTP riêng
   trong Authentication. Tôi không đọc được cấu hình đó vì CLI trên máy này không có
   access token.
