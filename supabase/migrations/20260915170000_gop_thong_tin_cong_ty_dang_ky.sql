-- Sửa dữ liệu lệch: đăng ký bằng form sinh HAI công ty (phát hiện 15/09/2026).
--
-- Trigger `create_default_company_trg` (20260812120000) tạo một công ty ngay khi có
-- hồ sơ. Form đăng ký sau đó CHÈN THÊM công ty thứ hai mang tên, mã số thuế, ngành,
-- tỉnh người dùng khai. Mọi màn hình và edge function đọc công ty CŨ NHẤT (quy tắc
-- của `resolveCompany`), nên thông tin đã khai nằm ở công ty không ai đọc, và đồng
-- bộ thuế báo "chưa có mã số thuế". `Onboarding.tsx` đã sửa để cập nhật thay vì chèn;
-- migration này chữa những tài khoản đã bị tách.
--
-- CHỈ CHÉP THÔNG TIN, KHÔNG XOÁ CÔNG TY NÀO. Giao dịch, liên kết ngân hàng, hoá đơn
-- có thể đang trỏ vào một trong hai dòng; xoá hay gộp là quyết định riêng, cần xem
-- từng tài khoản. Chỉ chạm công ty đang dùng khi nó CHƯA có mã số thuế — người đã tự
-- sửa ở Cài đặt hoặc thẻ chào mừng thì giữ nguyên. `companies.tax_id` không có ràng
-- buộc duy nhất, nên hai dòng cùng mã số thuế không vi phạm gì.

WITH dang_dung AS (
  SELECT DISTINCT ON (user_id) user_id, id
  FROM public.companies
  ORDER BY user_id, created_at ASC
),
da_khai AS (
  SELECT DISTINCT ON (c.user_id)
    c.user_id, c.name, c.tax_id, c.industry, c.province, c.years_operating, c.monthly_revenue, c.employee_count
  FROM public.companies c
  JOIN dang_dung d ON d.user_id = c.user_id AND d.id <> c.id
  WHERE COALESCE(c.tax_id, '') <> ''
  ORDER BY c.user_id, c.created_at DESC
)
UPDATE public.companies AS c
SET name = COALESCE(NULLIF(trim(k.name), ''), c.name),
    tax_id = k.tax_id,
    industry = COALESCE(NULLIF(c.industry, ''), k.industry),
    province = COALESCE(NULLIF(c.province, ''), k.province),
    years_operating = COALESCE(c.years_operating, k.years_operating),
    monthly_revenue = COALESCE(c.monthly_revenue, k.monthly_revenue),
    employee_count = COALESCE(c.employee_count, k.employee_count)
FROM dang_dung d
JOIN da_khai k ON k.user_id = d.user_id
WHERE c.id = d.id
  AND COALESCE(c.tax_id, '') = '';
