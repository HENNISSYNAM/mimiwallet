-- Xương sống sự kiện Cas: chống trùng, đúng môi trường, gắn được vào chủ thể; và trạng thái liên kết
-- nói đúng việc người dùng cần làm.
--
-- Vì sao cần chống trùng: Cas gửi lại webhook lỗi tới 17 lần trong 24 giờ (INVOICE/TVAN 3 lần, cách
-- 1 phút) và KHÔNG gửi mã sự kiện nào — không có gì để so ngoài chính nội dung. Không có khoá này
-- thì một lần xử lý chậm sinh ra nhiều lần xử lý lặp.
-- Nguồn: cas.so/general/api/webhook, đọc 24/09/2026.

alter table public.webhook_events
  -- SHA-256 của payload đã chuẩn hoá thứ tự khoá (`_shared/cas-webhook/phong-bi.ts`).
  add column if not exists payload_hash text,
  -- 'dev' ở sandbox. Sự kiện lệch môi trường không được chạm dữ liệu thật.
  add column if not exists environment text,
  add column if not exists handler text,
  add column if not exists processed_at timestamptz,
  add column if not exists duration_ms integer,
  -- Cas gửi lại cùng một sự kiện: đếm ở đây thay vì tạo dòng mới.
  add column if not exists lan_nhan integer not null default 1,
  add column if not exists company_id uuid references public.companies(id) on delete set null,
  -- 'giao_dich' | 'hoa_don_invoice_hub' | 'thong_diep_tvan' | 'yeu_cau_ky' | 'trich_no' | 'grant'
  add column if not exists subject_type text,
  add column if not exists subject_id text,
  -- 'cu' | 'moi' trong lúc thay khoá webhook; không bao giờ chứa chính khoá.
  add column if not exists khoa_khop text;

-- Dòng cũ (96 dòng, từ 12/08/2026) để NULL: chỉ mục duy nhất bỏ qua NULL nên không vỡ.
create unique index if not exists webhook_events_chong_trung
  on public.webhook_events (provider, payload_hash) where payload_hash is not null;

create index if not exists webhook_events_chu_the
  on public.webhook_events (subject_type, subject_id) where subject_id is not null;
create index if not exists webhook_events_cong_ty
  on public.webhook_events (company_id, received_at desc) where company_id is not null;

comment on column public.webhook_events.payload_hash is
  'SHA-256 payload đã chuẩn hoá. Cas không gửi mã sự kiện nào, nên đây là khoá chống trùng duy nhất.';
comment on column public.webhook_events.lan_nhan is
  'Số lần Cas gửi cùng nội dung này. >1 nghĩa là họ gửi lại, không phải có thêm sự kiện.';

-- ── Trạng thái liên kết ngân hàng ───────────────────────────────────────────────────────────────
--
-- Trước hôm nay mọi hỏng hóc đều gộp thành `needs_relink` ("liên kết lại"). Nhưng theo tài liệu Cas
-- có ít nhất ba tình huống KHÁC HẲN nhau về việc người dùng phải làm:
--   GRANT_PAUSED                  → họ tự tạm dừng; chỉ cần bật lại, không phải liên kết lại.
--   GRANT_LOGIN_REQUIRED, PREVENTED, FI_SERVICE_ACCOUNT_PAUSED
--                                 → phải mở app ngân hàng của chính họ; liên kết lại không giải quyết.
--   USER_PERMISSION_REVOKED, GRANT_DELETED, GRANT_NOT_FOUND
--                                 → quyền đã mất thật; phải liên kết lại.
-- Bảo người dùng "liên kết lại" khi việc cần làm nằm trong app ngân hàng là chỉ sai đường — đúng lỗi
-- đã mất một tuần với case 12.
comment on column public.bank_connections.status is
  'connected | paused (người dùng tạm dừng trên Cas ID) | needs_reauth (phải thao tác trong app ngân hàng) | needs_relink (quyền đã mất, phải liên kết lại) | disconnected';

alter table public.bank_connections
  add column if not exists last_error_code text,
  add column if not exists last_error_at timestamptz;

comment on column public.bank_connections.last_error_code is
  'Mã lỗi Cas gần nhất (GRANT_LOGIN_REQUIRED, PREVENTED…). Giao diện dịch mã này thành việc cần làm.';

-- Cas gửi lại cùng một sự kiện: đếm ở dòng cũ thay vì tạo dòng mới. Chỉ máy chủ gọi được (hàm chạy
-- quyền người gọi, mà client không có quyền UPDATE trên bảng này).
create or replace function public.dem_lan_nhan_webhook(p_provider text, p_hash text)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.webhook_events
     set lan_nhan = lan_nhan + 1
   where provider = p_provider and payload_hash = p_hash;
$$;

revoke all on function public.dem_lan_nhan_webhook(text, text) from public, anon, authenticated;
