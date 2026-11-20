-- QUẦY TIN (20/11/2026) — mỗi lần thu ngân chụp bill khách đưa là một dòng `soat_bill`.
--
-- KHÔNG LƯU ẢNH (N4): chỉ mã băm SHA-256 của ảnh (biết hai lần chụp cùng một ảnh) và thứ AI đọc được.
-- Ghi chỉ qua edge function `soat-bill` (service role); thành viên công ty chỉ đọc. Nhân viên được giao một cơ sở
-- chỉ thấy ca soát của cơ sở đó — cùng luật với `ban_hang_pos`.
--
-- R2.6: một giao dịch thật chỉ làm xanh MỘT ca soát — chỉ mục duy nhất một phần trên `giao_dich_id` khi đèn xanh.

CREATE TABLE IF NOT EXISTS public.soat_bill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  co_so_id uuid NULL REFERENCES public.co_so(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  ban_id uuid NULL REFERENCES public.ban_hang_pos(id) ON DELETE SET NULL,
  anh_sha256 text NOT NULL CHECK (anh_sha256 ~ '^[0-9a-f]{64}$'),
  doc jsonb NOT NULL DEFAULT '{}'::jsonb,
  den text NOT NULL CHECK (den IN ('xanh', 'vang', 'lech', 'do', 'khong_doc_duoc')),
  ly_do text NOT NULL,
  cau_noi text NOT NULL DEFAULT '',
  so_tien bigint NULL,
  thuc_te bigint NULL,
  giao_dich_id uuid NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  nha_cung_cap text NULL CHECK (nha_cung_cap IS NULL OR nha_cung_cap IN ('bedrock', 'openrouter')),
  mo_hinh text NULL,
  do_tre_ms integer NULL,
  bat_dau timestamptz NOT NULL DEFAULT now(),
  -- Quyết định của chủ / quản trị cho ca đỏ, lệch, không đọc được.
  quyet text NULL CHECK (quyet IS NULL OR quyet IN ('cho_qua', 'tu_choi')),
  quyet_boi uuid NULL,
  quyet_luc timestamptz NULL,
  ly_do_quyet text NULL CHECK (ly_do_quyet IS NULL OR char_length(ly_do_quyet) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS soat_bill_mot_giao_dich_mot_xanh
  ON public.soat_bill (giao_dich_id) WHERE den = 'xanh' AND giao_dich_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS soat_bill_cty_luc_idx ON public.soat_bill (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS soat_bill_hang_cho_idx ON public.soat_bill (company_id, created_at DESC)
  WHERE quyet IS NULL AND den IN ('do', 'lech', 'khong_doc_duoc');

ALTER TABLE public.soat_bill ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thành viên đọc ca soát bill" ON public.soat_bill
  FOR SELECT TO authenticated
  USING (
    public.la_thanh_vien(company_id)
    AND (public.co_so_gioi_han(company_id) IS NULL OR co_so_id = public.co_so_gioi_han(company_id))
  );

REVOKE INSERT, UPDATE, DELETE ON public.soat_bill FROM anon, authenticated;
REVOKE ALL ON public.soat_bill FROM anon;

COMMENT ON TABLE public.soat_bill IS
  'Quầy Tin: kết quả soát bill chuyển khoản khách đưa, đối chiếu với tiền vào thật. Không lưu ảnh, chỉ mã băm.';
