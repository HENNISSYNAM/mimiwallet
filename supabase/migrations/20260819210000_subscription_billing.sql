-- Thu phí thuê bao qua chuyển khoản ngân hàng.
--
-- VÌ SAO CẦN BẢNG NÀY: cho tới trước migration này, đường thu tiền duy nhất của
-- MIMI chạy qua Stripe (`create-checkout`, `check-subscription`,
-- `useSubscriptionStore`). **Stripe không nhận merchant Việt Nam.** Nghĩa là sản
-- phẩm không thu được một đồng nào từ khách hàng Việt — không phải vì thiếu tính
-- năng nào đó ở tương lai, mà vì cổng thanh toán duy nhất được nối vào không
-- phục vụ quốc gia của toàn bộ tệp khách hàng.
--
-- Động cơ đối soát thu phí đã có sẵn và đã có 15 test xanh trong
-- `_shared/billing/subscription.ts`, nhưng không nối vào đâu cả: không bảng,
-- không endpoint, không màn hình. Migration này là mảnh đầu tiên nối nó lại.
--
-- CÁCH THU: khách chuyển khoản vào tài khoản ngân hàng của MIMI, ghi mã tham
-- chiếu dạng `MIMIxxxxxx` vào nội dung. Hệ thống đọc sao kê, khớp mã, kích hoạt
-- thuê bao. Không qua trung gian thanh toán nào — đúng với Điều khoản sử dụng
-- vừa công bố, rằng CLI NUTRIX không phải trung gian thanh toán và không giữ
-- tiền của ai.

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  /*
   * Mã khách gõ tay vào nội dung chuyển khoản. Sinh bởi `taoMaThamChieu()`,
   * bảng chữ cái đã loại O/I/1/0 vì bốn ký tự đó bị nhìn nhầm nhiều nhất.
   *
   * DUY NHẤT TOÀN HỆ THỐNG, không phải duy nhất theo công ty: đối soát chỉ có
   * nội dung chuyển khoản để tra ngược, không biết trước tiền của công ty nào.
   * Trùng mã giữa hai công ty là kích hoạt nhầm thuê bao cho người không trả.
   */
  reference_code text NOT NULL UNIQUE,

  plan text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),

  /*
   * `pending`   — đã phát hành, chưa thấy tiền
   * `paid`      — khớp đúng số tiền, thuê bao đã kích hoạt
   * `underpaid` — có tiền vào mang đúng mã nhưng thiếu
   * `overpaid`  — có tiền vào mang đúng mã nhưng thừa
   * `cancelled` — khách bỏ, hoặc hết hạn chưa trả
   *
   * `underpaid`/`overpaid` KHÔNG tự kích hoạt. Đây là quy tắc đã khoá bằng test
   * trong subscription.ts: trả sai số tiền gần như luôn là gõ nhầm, và tự quyết
   * hộ khách trong chuyện tiền bạc là việc không nên làm.
   */
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'underpaid', 'overpaid', 'cancelled')),

  /* Kỳ dịch vụ mà hoá đơn này trả cho. Chỉ điền khi đã `paid`. */
  period_start date,
  period_end date,

  /* Giao dịch ngân hàng đã khớp. Dấu vết để đối chiếu ngược khi có tranh chấp. */
  matched_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  /* Số tiền thực nhận — khác `amount` khi under/overpaid. */
  received_amount bigint,

  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subscription_invoices_company_idx
  ON public.subscription_invoices (company_id, created_at DESC);

-- Cron đối soát chỉ quét hoá đơn còn chờ; chỉ mục một phần giữ nó nhỏ mãi mãi
-- kể cả khi bảng đầy hoá đơn đã trả của nhiều năm.
CREATE INDEX IF NOT EXISTS subscription_invoices_pending_idx
  ON public.subscription_invoices (created_at)
  WHERE status = 'pending';

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

/*
 * Khách CHỈ ĐƯỢC ĐỌC. Không có chính sách INSERT/UPDATE/DELETE cho
 * `authenticated` — và đó là chủ ý, không phải bỏ sót.
 *
 * Hoá đơn do máy chủ phát hành và trạng thái do đối soát sao kê quyết định. Nếu
 * khách tự ghi được vào bảng này thì họ tự đặt `status='paid'` cho chính mình,
 * tức là tự kích hoạt thuê bao mà không trả tiền. Edge function dùng service
 * role nên không bị các chính sách này chặn.
 */
CREATE POLICY "Chủ công ty xem hoá đơn thuê bao của mình"
  ON public.subscription_invoices FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- ── Thuê bao đang hiệu lực ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  plan text NOT NULL,
  /*
   * Ngày hết hạn. Không lưu cờ `is_active` vì hai nguồn sự thật sẽ lệch nhau:
   * cờ đó phải có ai đó chạy đúng giờ để tắt, còn so ngày thì luôn đúng.
   */
  current_period_end date NOT NULL,
  last_invoice_id uuid REFERENCES public.subscription_invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chủ công ty xem thuê bao của mình"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.subscription_invoices IS
  'Hoá đơn thu phí MIMI, trả bằng chuyển khoản kèm mã tham chiếu. Chỉ đọc với người dùng — trạng thái do đối soát sao kê quyết định.';
COMMENT ON TABLE public.subscriptions IS
  'Thuê bao đang hiệu lực. Hiệu lực xác định bằng current_period_end >= hôm nay, không bằng cờ.';
