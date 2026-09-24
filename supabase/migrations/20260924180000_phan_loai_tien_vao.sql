-- Lớp phân loại tiền vào: khoản tiền này là gì — người quyết, máy chỉ gợi ý.
--
-- Bản chỉ đạo ra mắt (docs/KIEM_TOAN_RA_MAT.md, mục I và P): tách bạch tiền vào, doanh thu ước
-- tính, doanh thu đã xác nhận. Tiền vay, tiền người nhà, góp vốn, hoàn tiền, đặt cọc, thu hộ
-- trông y hệt tiền khách trả trên sao kê.
--
-- BA NGUYÊN TẮC:
--   1. Chỉ NGƯỜI ghi vào đây (qua edge function `to-khai`, có kiểm vai trò). Gợi ý của máy
--      (`phan-loai/tien-vao.ts`) tính khi đọc, chỉ lưu lại gợi ý "lúc đó" để biết người đồng ý hay
--      làm ngược.
--   2. Mỗi lần đổi là một dòng MỚI trong `revenue_classification_events` — không sửa, không xoá.
--      Hoàn tác là ghi thêm một dòng đưa trạng thái về như trước.
--   3. Xác nhận MIỄN PHÍ (mục P-4): đây là bước kích hoạt, không phải chỗ thu tiền.
--
-- Dữ liệu gốc `transactions` không bị sửa. Phân loại là diễn giải, không phải kết luận pháp lý.

CREATE TABLE IF NOT EXISTS public.revenue_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  suggested_type text,
  confirmed_type text NOT NULL,
  suggestion_source text NOT NULL DEFAULT 'human' CHECK (suggestion_source IN ('rule', 'pattern', 'model', 'human')),
  reason_code text,
  reason_text text,
  -- include: cộng vào doanh thu · exclude: không cộng · pending: "Tôi chưa chắc", vẫn đếm là chưa rõ.
  revenue_effect text NOT NULL CHECK (revenue_effect IN ('include', 'exclude', 'pending')),
  requires_review boolean NOT NULL DEFAULT false,
  ghi_chu text CHECK (ghi_chu IS NULL OR char_length(ghi_chu) <= 500),
  confirmed_by uuid NOT NULL,
  confirmed_role text NOT NULL,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_classifications_loai CHECK (
    confirmed_type IN ('business_revenue', 'personal', 'internal_transfer', 'loan', 'capital_contribution',
                       'family_transfer', 'refund', 'deposit', 'collection_on_behalf', 'other', 'unknown')
    AND (suggested_type IS NULL OR suggested_type IN ('business_revenue', 'personal', 'internal_transfer', 'loan',
         'capital_contribution', 'family_transfer', 'refund', 'deposit', 'collection_on_behalf', 'other', 'unknown'))
  ),
  -- "Khác" thì phải nói là gì.
  CONSTRAINT revenue_classifications_khac CHECK (confirmed_type <> 'other' OR ghi_chu IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS revenue_classifications_cty_idx ON public.revenue_classifications (company_id, revenue_effect);

CREATE TABLE IF NOT EXISTS public.revenue_classification_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  from_type text,
  to_type text,
  from_effect text,
  to_effect text,
  -- Nhiều khoản xác nhận cùng một lần ("Áp dụng 17 khoản") chung một mã: hoàn tác cả nhóm.
  bulk_group_id uuid,
  la_hoan_tac boolean NOT NULL DEFAULT false,
  actor uuid NOT NULL,
  actor_role text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS revenue_classification_events_gd_idx ON public.revenue_classification_events (transaction_id, at DESC);
CREATE INDEX IF NOT EXISTS revenue_classification_events_nhom_idx ON public.revenue_classification_events (bulk_group_id) WHERE bulk_group_id IS NOT NULL;

ALTER TABLE public.revenue_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_classification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thành viên công ty đọc revenue_classifications" ON public.revenue_classifications
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));
CREATE POLICY "Thành viên công ty đọc revenue_classification_events" ON public.revenue_classification_events
  FOR SELECT TO authenticated
  USING (public.la_thanh_vien(company_id) OR company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.revenue_classifications IS
  'Khoản tiền vào là gì, do người xác nhận. Chỉ máy chủ ghi. revenue_effect = exclude thì không cộng vào doanh thu tính từ sao kê.';
COMMENT ON TABLE public.revenue_classification_events IS
  'Lịch sử mọi lần đổi phân loại, chỉ thêm. Hoàn tác = một dòng mới đưa trạng thái về như trước.';
