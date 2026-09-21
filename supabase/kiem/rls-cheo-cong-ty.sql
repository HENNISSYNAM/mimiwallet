-- MIMI — test chéo công ty trên CSDL thật (chỉ đọc).
--
-- Chọn một người dùng A và một công ty B mà A KHÔNG thuộc về (hai bên đều có giao dịch), mô
-- phỏng phiên đăng nhập của A (role authenticated + JWT claims), rồi đếm những gì A đọc được của
-- B. Mọi số của B phải bằng 0. Kèm đối chứng: A phải đọc được giao dịch của chính công ty mình —
-- nếu không, phép mô phỏng hỏng và các số 0 kia không chứng minh được gì.
--
-- Không ghi gì. Không in id nào. set_config(..., true) và SET LOCAL chỉ sống trong giao dịch.
--
-- Chạy: supabase db query --linked "$(grep -v '^\s*--' supabase/kiem/rls-cheo-cong-ty.sql)"
-- (bỏ dòng chú thích vì CLI hiểu dòng bắt đầu bằng "--" là một tham số).
select
  set_config('request.jwt.claims', json_build_object('sub', p.u, 'role', 'authenticated')::text, true),
  set_config('mimi.cb', p.cb::text, true),
  set_config('mimi.ca', p.ca::text, true)
from (
  select a.user_id as u, a.company_id as ca, b.id as cb
  from public.thanh_vien_cong_ty a
  join public.companies b on b.id <> a.company_id
  where exists (select 1 from public.transactions t where t.company_id = a.company_id)
    and exists (select 1 from public.transactions t where t.company_id = b.id)
    and not exists (select 1 from public.thanh_vien_cong_ty x where x.user_id = a.user_id and x.company_id = b.id)
    and b.user_id is distinct from a.user_id
  limit 1
) p;

set local role authenticated;

-- Cất kết quả vào biến phiên khi còn là A, trả vai trò gốc rồi mới đọc ra: CLI đọc kiểu cột của
-- kết quả bằng chính phiên này, và vai trò authenticated không đọc được danh mục đó.
select set_config('mimi.kq', json_build_object(
  'doi_chung_gd_cong_ty_minh', (select count(*) from public.transactions where company_id = current_setting('mimi.ca')::uuid),
  'gd_cong_ty_khac', (select count(*) from public.transactions where company_id = current_setting('mimi.cb')::uuid),
  'hoa_don_ban_khac', (select count(*) from public.invoices where company_id = current_setting('mimi.cb')::uuid),
  'hoa_don_dien_tu_khac', (select count(*) from public.gdt_invoices where company_id = current_setting('mimi.cb')::uuid),
  'yeu_cau_chi_khac', (select count(*) from public.yeu_cau_chi where company_id = current_setting('mimi.cb')::uuid),
  'ket_noi_ngan_hang_khac', (select count(*) from public.bank_connections where company_id = current_setting('mimi.cb')::uuid),
  'nhan_giao_dich_khac', (select count(*) from public.transaction_labels where company_id = current_setting('mimi.cb')::uuid),
  'nhat_ky_quyet_dinh_khac', (select count(*) from public.nhat_ky_quyet_dinh where company_id = current_setting('mimi.cb')::uuid),
  'hoi_thoai_khac', (select count(*) from public.hoi_thoai_tro_ly where company_id = current_setting('mimi.cb')::uuid),
  'thanh_vien_khac', (select count(*) from public.thanh_vien_cong_ty where company_id = current_setting('mimi.cb')::uuid),
  'cong_ty_khac', (select count(*) from public.companies where id = current_setting('mimi.cb')::uuid)
)::text, true);

reset role;
select current_setting('mimi.kq')::json as ket_qua;
