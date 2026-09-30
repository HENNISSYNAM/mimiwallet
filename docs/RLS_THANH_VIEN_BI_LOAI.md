# RLS khi thành viên bị gỡ / rời công ty (30/09/2026)

Mục tiêu: người đã bị gỡ hoặc đã rời một công ty **không đọc, không ghi** được dữ liệu công ty đó, qua bất kỳ đường nào; nhưng vẫn xoá được nội dung cá nhân của chính mình.

Migration: `supabase/migrations/20260930090000_rls_thanh_vien_bi_loai.sql` (idempotent, không xoá/sửa dữ liệu). Test: `supabase/functions/_shared/quyen/rls-thanh-vien-bi-loai.test.ts`, `_shared/company.test.ts`.

## Luật đã chọn

1. **Nguồn sự thật duy nhất là `thanh_vien_cong_ty`.** Gỡ hoặc rời = xoá dòng; mất quyền ngay ở lượt truy vấn kế tiếp. `companies.user_id` chỉ còn nghĩa là "người tạo" (dùng để CASCADE khi xoá tài khoản), **không còn cấp quyền nào**.
2. **Đọc dữ liệu công ty:** mọi vai trò còn là thành viên (`la_thanh_vien`), như từ 18/09.
3. **Ghi trực tiếp từ trình duyệt, và các bảng chưa từng mở cho thành viên** (KYC, khoản vay, ví thiết bị, điểm tín dụng, p2p, học tập, carbon): chỉ vai trò `chu_so_huu` hiện tại (`la_chu_cong_ty`).
4. **Nội dung của riêng một người nhưng thuộc về công ty** (`hoi_thoai_tro_ly`, `thong_bao`): đọc = của chính mình **và** còn là thành viên. **Xoá** hội thoại của mình vẫn theo `user_id = auth.uid()` — quyền dữ liệu cá nhân; xoá không làm lộ nội dung.
5. **Storage:** thư mục đầu của đường dẫn là id công ty; cấp qua `la_thanh_vien_thu_muc(thư_mục, chỉ_chủ)` (so bằng text, không ép `::uuid` nên thư mục lạ không làm lỗi cả truy vấn).

Vì sao bỏ hẳn nhánh `companies.user_id` thay vì "chỉ khi công ty chưa có thành viên": chủ khác gỡ được người tạo (luật `kiemThaoTac` chỉ cấm gỡ chủ cuối cùng), người tạo bị gỡ vẫn giữ `companies.user_id` và cả ba tầng (RLS, `resolveCompanyVaiTro`, Storage) cho họ vào lại với vai chủ sở hữu, kể cả `DELETE companies` (CASCADE cả sổ sách). Migration 18/09 đã backfill mọi công ty và trigger `them_chu_so_huu_cong_ty` giữ cho công ty mới, nên nhánh đó không còn ai cần; migration 30/09 còn bổ sung dòng chủ cho công ty (nếu có) chưa có thành viên nào.

## Các đường đã đóng

| # | Đường | Trước | Sau |
|---|---|---|---|
| 1 | RLS 24 bảng dữ liệu công ty (`OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())`) | Người tạo bị gỡ đọc được | Chỉ `la_thanh_vien` |
| 2 | Policy INSERT/UPDATE/DELETE cũ theo người tạo (invoices, clients, bank_connections, transaction_labels, danh_muc_dau_tu, kyc, loan, device, p2p…) | Người tạo bị gỡ ghi được | Chỉ `la_chu_cong_ty` |
| 3 | `companies` SELECT/UPDATE/DELETE theo `auth.uid() = user_id` | Người tạo bị gỡ đọc, sửa, **xoá công ty** | Đọc: thành viên; sửa/xoá: chủ sở hữu hiện tại |
| 4 | `hoi_thoai_tro_ly` SELECT theo `user_id` | Kế toán nghỉ việc đọc chat 180 ngày (QA P2-9) | Cần còn là thành viên |
| 5 | `thong_bao` SELECT theo `user_id` | Cùng lỗi (nội dung công ty) | Cần còn là thành viên |
| 6 | Storage `chung-tu`, `secure-documents`, nhánh UNION của `tai-lieu` theo người tạo | Người tạo bị gỡ tải được ảnh/giấy tờ KYC | `la_thanh_vien_thu_muc` |
| 7 | `user_company_ids(uid)` SECURITY DEFINER nhận uid tuỳ ý | Ai đăng nhập cũng hỏi được công ty của người khác; theo người tạo | Chỉ trả cho chính người gọi, theo chủ sở hữu |
| 8 | Edge `resolveCompanyVaiTro` (dùng ở cong-ty, tro-ly, tac-tu, sao-ke, to-khai, bank-link, chi-phi-ai, subscription-billing, dau-thoi-gian…) dự phòng theo `companies.user_id` | `company_id` do client gửi + người tạo bị gỡ → vai `chu_so_huu` | Không có dòng thành viên = `null`; lỗi truy vấn = `null` (đóng) |
| 9 | `nguoiNhan` (thông báo) cộng `companies.user_id` | Người bị gỡ vẫn nhận thông báo có số liệu | Chỉ thành viên hiện tại |

Không có "cache thành viên" phía server: mỗi lần gọi đều đọc lại `thanh_vien_cong_ty`. Phía trình duyệt có `localStorage` `mimi:cong-ty-dang-dung` — chỉ là lựa chọn giao diện; máy chủ kiểm lại nên id cũ không mở được gì (đã có test `congTyDangDung.test.ts`).

## Ma trận: bảng × vai trò × sau khi bị gỡ

Ký hiệu: **Đ** đọc, **G** ghi trực tiếp từ trình duyệt (INSERT/UPDATE/DELETE), **–** không. Cột "Sau khi bị gỡ" áp dụng cho MỌI vai trò cũ, kể cả người tạo công ty.

| Bảng | chu_so_huu | quan_tri / nguoi_duyet / ke_toan / nguoi_xem | Sau khi bị gỡ |
|---|---|---|---|
| transactions, gdt_invoices, chi_phi_ai, token_ai, chung_tu_quet, ho_so_thue, to_khai_nhap, tac_tu, yeu_cau_chi, chinh_sach_chi, nguoi_nhan_duoc_phep, nhat_ky_tac_tu, so_cai_chung_tu, neo_thoi_gian, ngan_sach_chi_phi_ai, lo_nhap_chi_phi_ai, qr_payments, subscriptions, subscription_invoices | Đ | Đ | – |
| invoices, clients, bank_connections, transaction_labels, danh_muc_dau_tu | Đ G | Đ | – |
| bang_chung_viec, ket_qua_quy_trinh, luot_to_khai, nhat_ky_quyet_dinh, phan_loai_hoat_dong(+_su_kien), quy_trinh_ai, revenue_classifications(+_events), sao_ke_nhap, quyet_dinh_chung_tu, ho_so_viec, hanh_trinh, buoc_hanh_trinh, tai_lieu, phien_ban_tai_lieu, duyet_tai_lieu, nhat_ky_thay_doi, yeu_cau_thuc_thi, xung_dot_hoa_don | Đ | Đ | – |
| kyc_verifications, loan_applications, device_wallets, device_rules, m2m_transactions, credit_score_snapshots/factors, learning_progress, carbon_snapshots, p2p_listings, p2p_commitments (phía công ty cho vay) | Đ G | – | – |
| companies | Đ + sửa + xoá | Đ | – |
| hoi_thoai_tro_ly (chat của chính mình) | Đ (của mình) + Xoá | Đ (của mình) + Xoá | **Không đọc**; **vẫn xoá** dòng của mình |
| thong_bao (của mình) | Đ | Đ | – |
| thanh_vien_cong_ty | Đ | Đ | – (không ai ghi từ trình duyệt; ghi qua edge `cong-ty`) |
| Storage `chung-tu`, `tai-lieu` | Đ | Đ | – |
| Storage `secure-documents` (KYC) | Đ + ghi | – | – |
| Bảng công khai/tham chiếu (`van_ban_phap_luat`, `bang_gia_model`, `co_quan`, …) | Đ | Đ | Đ (không thuộc công ty) |
| Bảng theo người (profiles, consents, cong_cu_ghim, cai_dat_thong_bao, dang_ky_day) | của mình | của mình | của mình (không chứa dữ liệu công ty) |

Thay đổi hành vi có chủ đích cần biết:
- **Ảnh chứng từ (`chung-tu`)**: trước chỉ người tạo tải được ảnh; nay mọi thành viên (khớp với việc họ đã thấy bảng chứng từ) — người bị gỡ thì không.
- **Ghi trực tiếp** trước cấp cho người tạo; nay cấp cho mọi `chu_so_huu` (đồng chủ sở hữu ghi được như trước họ đã làm được qua edge function). Người tạo bị hạ vai trò xuống thấp hơn chủ thì mất quyền ghi.
- Công ty **không còn `chu_so_huu` nào** (người tạo đã rời/bị gỡ, chỉ còn quản trị…) thì không ai ghi trực tiếp được; trao lại vai chủ qua màn Thành viên trước.

## Phía backend (service role)

- `_shared/company.ts` `resolveCompanyVaiTro`: bỏ đường dự phòng `companies.user_id`; công ty do người này tạo mà đã bị gỡ trả `null` (test: `u-tao`).
- `_shared/thong-bao/gui.ts` `nguoiNhan`: chỉ thành viên hiện tại.
- Các edge function nhận `company_id` từ client đều đi qua `resolveCompanyVaiTro(db, user.id, cols, company_id)` (kiểm dòng thành viên): cong-ty, tro-ly, tac-tu, sao-ke, to-khai, chi-phi-ai, bank-link, subscription-billing.

## Việc lead làm / còn lại

1. Trước khi áp dụng, kiểm không công ty nào thiếu dòng thành viên (migration có INSERT lưới an toàn, nhưng nên biết): `select id from companies c where not exists (select 1 from thanh_vien_cong_ty t where t.company_id = c.id);` — mong đợi 0 dòng.
2. Áp dụng: `supabase db push` (lead chạy). Sau đó thử tay bằng hai tài khoản: chủ A gỡ B (B từng tạo công ty) → B gọi `select` trên `transactions`, `hoi_thoai_tro_ly`, `companies` và tải `chung-tu/{company_id}/…` đều phải rỗng/403; B vẫn `delete from hoi_thoai_tro_ly where user_id = B` được.
3. **Chưa sửa (ngoài phạm vi, chạm tích hợp ngân hàng):** `bank-link/index.ts` (~dòng 834 và ~1287) lấy danh sách công ty theo `companies.user_id = user.id` để tìm/thu hồi grant cũ. Người tạo bị gỡ nhưng còn thuộc công ty khác, gọi `thu-hoi-grant-cu` với công ty còn lại, có thể chạm `bank_connections` của công ty đã bị gỡ. Nên lọc theo `thanh_vien_cong_ty` (vai chủ sở hữu) — cần lead/owner duyệt vì đụng bank-provider.
4. Policy tạo ngoài migration (bảng điều khiển Supabase/Lovable) trên các bảng công ty sẽ bị vòng lặp `pg_policies` ở bước 3 của migration gỡ nếu tham chiếu `companies`/`user_company_ids`/`la_thanh_vien`, và không được tạo lại → bảng đó từ chối hết cho tới khi thêm policy tường minh. Đó là hướng an toàn (đóng, không mở).
5. Test chỉ kiểm văn bản SQL; chưa có test SQL chạy thật (cần Postgres + Supabase local).
