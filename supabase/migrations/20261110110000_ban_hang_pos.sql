-- BÁN TẠI QUẦY (POS, 10/11/2026): hộ kinh doanh thu tiền ở quầy trên máy POS Android (Sunmi, PAX...) hoặc
-- điện thoại, và mỗi lần bán đi thẳng vào sổ của MIMI.
--
--   - Tiền mặt: ghi ngay "đã thu" + một dòng transactions (source 'pos') + phân loại "tiền bán hàng".
--   - Chuyển khoản: "đang chờ" + VietQR mang mã MIMIxxxxxx trong nội dung. Sao kê về có khoản TIỀN VÀO mang
--     đúng mã, đúng số tiền → "đã thu" (supabase/functions/_shared/pos/ban-hang.ts, khopBanHangPos), khoản đó
--     được phân loại "tiền bán hàng" (lý do pos_chuyen_khoan), không bao giờ là "không phải doanh thu".
--
-- Ghi chỉ qua edge function `pos` (service role, kiểm vai trò). Trình duyệt chỉ đọc, theo thành viên; nhân viên
-- được giao một cơ sở (thanh_vien_cong_ty.co_so_id, vai không phải chủ/quản trị) chỉ thấy lần bán của cơ sở đó.

CREATE TABLE IF NOT EXISTS public.ban_hang_pos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  co_so_id uuid NULL REFERENCES public.co_so(id) ON DELETE SET NULL,
  -- Mã máy POS sinh cho lần bán: bán lúc mất mạng rồi đồng bộ lại nhiều lần vẫn chỉ một dòng.
  client_id uuid NOT NULL,
  -- Đồng, số nguyên.
  amount bigint NOT NULL CHECK (amount > 0 AND amount <= 10000000000),
  method text NOT NULL CHECK (method IN ('cash', 'transfer')),
  -- Cùng định dạng mã tham chiếu của MIMI (_shared/bank/ma-tham-chieu.ts) để mọi bộ đọc sao kê đọc được.
  reference text NOT NULL CHECK (reference ~ '^MIMI[23456789ABCDEFGHJKMNPQRSTVWXYZ]{6}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  -- Vì sao "đã thu": cash · bank_match (sao kê khớp) · manual (chủ bấm tay) · manual_then_bank (bấm tay, sau đó tiền về).
  paid_basis text NULL CHECK (paid_basis IS NULL OR paid_basis IN ('cash', 'bank_match', 'manual', 'manual_then_bank')),
  -- Giao dịch ngân hàng đã khớp (chuyển khoản).
  matched_transaction_id uuid NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  -- Dòng sổ POS tự tạo (tiền mặt, hoặc chuyển khoản chủ xác nhận tay).
  book_transaction_id uuid NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  note text NULL CHECK (note IS NULL OR char_length(note) <= 200),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Tài khoản nhận in trên VietQR (chỉ chuyển khoản), để biên lai và lần hỏi lại hiện đúng.
  account_number text NULL,
  bank_bin text NULL CHECK (bank_bin IS NULL OR bank_bin ~ '^[0-9]{6}$'),
  auto_match boolean NOT NULL DEFAULT false,
  sold_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz NULL,
  cancelled_at timestamptz NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ban_hang_pos_ref_uniq UNIQUE (company_id, reference),
  CONSTRAINT ban_hang_pos_client_uniq UNIQUE (company_id, client_id),
  CONSTRAINT ban_hang_pos_paid_co_ly_do CHECK (status <> 'paid' OR paid_basis IS NOT NULL),
  CONSTRAINT ban_hang_pos_tien_mat_da_thu CHECK (method <> 'cash' OR status <> 'pending')
);

-- Một khoản tiền về chỉ trả cho một lần bán.
CREATE UNIQUE INDEX IF NOT EXISTS ban_hang_pos_gd_uniq ON public.ban_hang_pos (matched_transaction_id) WHERE matched_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ban_hang_pos_ngay_idx ON public.ban_hang_pos (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ban_hang_pos_cho_idx ON public.ban_hang_pos (company_id, status) WHERE status = 'pending';

-- Món bán nhanh chủ tự sửa (tối đa 24, kiểm ở edge function).
CREATE TABLE IF NOT EXISTS public.pos_san_pham (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ten text NOT NULL CHECK (char_length(btrim(ten)) BETWEEN 1 AND 60),
  gia bigint NOT NULL CHECK (gia > 0 AND gia <= 10000000000),
  thu_tu integer NOT NULL DEFAULT 0,
  tao_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, ten)
);
CREATE INDEX IF NOT EXISTS pos_san_pham_cty_idx ON public.pos_san_pham (company_id, thu_tu);

ALTER TABLE public.ban_hang_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_san_pham ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thành viên đọc lần bán tại quầy" ON public.ban_hang_pos
  FOR SELECT TO authenticated
  USING (
    public.la_thanh_vien(company_id)
    AND (public.co_so_gioi_han(company_id) IS NULL OR co_so_id = public.co_so_gioi_han(company_id))
  );

CREATE POLICY "Thành viên đọc món bán nhanh" ON public.pos_san_pham
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

-- Không có policy ghi: mọi ghi đi qua edge function `pos` bằng service role.
REVOKE INSERT, UPDATE, DELETE ON public.ban_hang_pos, public.pos_san_pham FROM anon, authenticated;
REVOKE ALL ON public.ban_hang_pos, public.pos_san_pham FROM anon;

-- transactions.source thêm 'pos'. CỘNG THÊM vào ràng buộc đang có (đọc định nghĩa hiện hành rồi chèn 'pos'),
-- không viết lại danh sách: migration khác có thể đã thêm nguồn của nó.
DO $$
DECLARE
  dinh_nghia text;
BEGIN
  SELECT pg_get_constraintdef(c.oid) INTO dinh_nghia
  FROM pg_constraint c
  WHERE c.conrelid = 'public.transactions'::regclass AND c.conname = 'transactions_source_check';

  IF dinh_nghia IS NULL THEN
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check
      CHECK (source IS NULL OR source IN ('cas', 'sepay', 'import', 'manual', 'demo', 'pos'));
  ELSIF position('''pos''' IN dinh_nghia) = 0 THEN
    ALTER TABLE public.transactions DROP CONSTRAINT transactions_source_check;
    EXECUTE 'ALTER TABLE public.transactions ADD CONSTRAINT transactions_source_check '
      || regexp_replace(dinh_nghia, 'ARRAY\[', 'ARRAY[''pos''::text, ');
  END IF;
END $$;

COMMENT ON TABLE public.ban_hang_pos IS
  'Lần bán tại quầy (POS). Tiền mặt: đã thu ngay, có dòng transactions source=pos. Chuyển khoản: chờ sao kê có tiền vào mang đúng mã + đúng số tiền. Chỉ edge function pos ghi.';
COMMENT ON TABLE public.pos_san_pham IS 'Món bán nhanh trên màn POS, chủ/quản trị sửa qua edge function pos.';
