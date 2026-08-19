-- Danh bạ khách hàng / đối tác của công ty đang dùng MIMI.
--
-- Trước đây `invoices.client_name` là chữ tự do. Nghĩa là cùng một khách viết
-- ba kiểu ("CÔNG TY CP THỰC PHẨM TRUNG SƠN", "Trung Sơn", "TRUNGSON") sẽ thành
-- ba khách khác nhau, và công nợ của họ không cộng lại được. Đối soát công nợ
-- (`_shared/ledger/receivables.ts`) khớp tiền vào theo tên khách, nên tên phải
-- có một nơi duy nhất để tra.
--
-- Bảng này cũng là chỗ giữ **mã số thuế** của từng đối tác — thứ cho phép tra
-- cứu trạng thái hoạt động qua `tax-lookup`. Một khách đang ở trạng thái
-- "ngừng hoạt động và đã đóng MST" mà mình vẫn giao hàng chịu là rủi ro công nợ
-- có thật, và nó chỉ nhìn ra được khi mã số thuế được lưu chứ không phải nhớ.

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  name text NOT NULL,
  -- 10 số cho doanh nghiệp, 12 số cho hộ kinh doanh (số định danh cá nhân, áp
  -- dụng từ 01/07/2025), có thể kèm đuôi `-001` cho chi nhánh.
  tax_code text,
  address text,
  phone text,
  email text,
  -- Mặt hàng đang cung cấp, hoặc ghi chú quan hệ.
  note text,

  /*
   * Giai đoạn quan hệ. Mặc định `prospect` vì danh bạ thường được nhập từ một
   * danh sách có sẵn trước khi có giao dịch nào — nhập vào không có nghĩa là đã
   * bán được hàng, và đánh dấu sẵn `active` sẽ làm mọi báo cáo sau này đếm nhầm.
   */
  status text NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect', 'active', 'inactive')),

  /*
   * Kết quả tra cứu gần nhất từ hệ thống Thuế, và thời điểm tra.
   *
   * Lưu cả mốc thời gian chứ không chỉ kết quả: trạng thái người nộp thuế đổi
   * theo thời gian, nên một chữ "đang hoạt động" không kèm ngày tra thì không
   * biết là của hôm nay hay của năm ngoái.
   */
  tax_status text,
  tax_status_checked_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cùng một mã số thuế không được vào danh bạ hai lần trong một công ty. Dùng
-- chỉ mục một phần vì `tax_code` được phép để trống — khách lẻ chưa có mã.
CREATE UNIQUE INDEX IF NOT EXISTS clients_company_tax_code_idx
  ON public.clients (company_id, tax_code)
  WHERE tax_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS clients_company_idx ON public.clients (company_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

/*
 * Danh bạ này chứa tên, địa chỉ, điện thoại và email của người thật ở các doanh
 * nghiệp đối tác — dữ liệu cá nhân của bên thứ ba theo Luật Bảo vệ dữ liệu cá
 * nhân 2025. Nên bốn chính sách dưới đây đều buộc `company_id` phải thuộc về
 * người đang đăng nhập; không có đường nào đọc được danh bạ của công ty khác.
 */
CREATE POLICY "Chủ công ty đọc danh bạ của mình"
  ON public.clients FOR SELECT TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Chủ công ty thêm khách vào danh bạ của mình"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Chủ công ty sửa danh bạ của mình"
  ON public.clients FOR UPDATE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

CREATE POLICY "Chủ công ty xoá khách khỏi danh bạ của mình"
  ON public.clients FOR DELETE TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

COMMENT ON TABLE public.clients IS
  'Danh bạ khách hàng/đối tác. Chứa dữ liệu cá nhân bên thứ ba — mọi chính sách RLS đều khoá theo company_id của người đăng nhập.';
