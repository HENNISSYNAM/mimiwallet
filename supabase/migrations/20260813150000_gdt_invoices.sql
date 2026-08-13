-- Hoá đơn điện tử lấy từ cổng Tổng Cục Thuế, qua Cas (scope `gdt`).
--
-- Vì sao đáng có riêng một bảng:
--
-- Doanh thu của MIMI tới nay được suy ra từ mô tả sao kê ngân hàng — "CK DEN TU
-- NGUYEN VAN A" — và suy luận thì có thể sai. Hoá đơn điện tử là con số chính
-- cơ quan thuế đang giữ. Với ngưỡng miễn thuế 1 tỷ/năm, khác biệt giữa "ước
-- lượng" và "bản ghi của cơ quan thuế" là khác biệt giữa một dự đoán và một
-- căn cứ.
--
-- Vì sao KHÔNG lưu payload thô:
--
-- Hoá đơn GDT mang theo `idCardNumber`, `passportNumber`, `nationality`, điện
-- thoại, email, số tài khoản ngân hàng của người mua, cùng chứng thư số của các
-- bên. Không thứ nào cần cho việc ghi sổ. Bảng này chỉ có các cột dưới đây, và
-- `gdt-invoice-map.ts` lọc theo danh sách cho phép — nên trường nhạy cảm mà
-- Tổng Cục Thuế thêm sau này cũng không lọt vào được.

CREATE TABLE IF NOT EXISTS public.gdt_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Mã hoá đơn phía Cas. Khoá chống trùng khi đồng bộ lại cùng một khoảng ngày.
  gdt_id text NOT NULL,
  -- 'issued' = ta phát hành (doanh thu); 'received' = ta nhận (chi phí).
  direction text NOT NULL CHECK (direction IN ('issued', 'received')),

  invoice_serial text,
  invoice_number text,
  invoice_form_code text,
  invoice_form_name text,

  -- Bên còn lại: chỉ mã số thuế và tên. Không giấy tờ tuỳ thân.
  counterparty_tax_code text,
  counterparty_name text,

  currency text NOT NULL DEFAULT 'VND',
  subtotal_amount bigint NOT NULL DEFAULT 0,
  tax_amount bigint NOT NULL DEFAULT 0,
  total_amount bigint NOT NULL DEFAULT 0,
  -- [{rate, taxable, tax}] — đủ để tách doanh thu theo thuế suất khi lập tờ khai.
  tax_rate_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,

  issued_at timestamptz,
  -- YYYYMM, dùng để gom theo kỳ mà không phải suy từ múi giờ.
  issuance_period integer,

  -- Tra cứu lại trên cổng thuế. Đây là thứ biến một dòng trong app thành một
  -- con số kiểm chứng được ở nguồn.
  invoice_lookup_code text,
  invoice_auth_code text,
  -- GDT invoiceStatus: 1 = còn hiệu lực. Khác 1 thì không tính vào doanh thu.
  invoice_status integer,

  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Total, không partial: đồng bộ lại dùng ON CONFLICT và PostgREST chỉ truyền
-- được tên cột, nên index partial sẽ khiến upsert raise chứ không bỏ qua.
CREATE UNIQUE INDEX IF NOT EXISTS gdt_invoices_company_gdt_id_idx
  ON public.gdt_invoices (company_id, gdt_id);

-- Đồng hồ ngưỡng 1 tỷ đọc đúng lát cắt này.
CREATE INDEX IF NOT EXISTS gdt_invoices_company_direction_period_idx
  ON public.gdt_invoices (company_id, direction, issuance_period);

ALTER TABLE public.gdt_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their GDT invoices"
  ON public.gdt_invoices FOR SELECT
  USING (company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()));

-- Không cấp INSERT/UPDATE/DELETE cho `authenticated`. Đây là bản ghi của cơ
-- quan thuế; giá trị của nó nằm ở chỗ không ai sửa được từ trình duyệt. Chỉ
-- edge function ghi, bằng service role.

COMMENT ON TABLE public.gdt_invoices IS
  'Hoá đơn điện tử từ cổng Tổng Cục Thuế qua Cas (scope gdt). Chỉ đọc với người dùng. Không lưu giấy tờ tuỳ thân của bên mua.';
