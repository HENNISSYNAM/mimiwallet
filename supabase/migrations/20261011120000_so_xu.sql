-- XU — NĂNG LƯỢNG CỦA MIMI (11/10/2026). Sổ xu theo công ty: mỗi lần cộng, trừ để lại một dòng có lý do
-- và tham chiếu. Chép khuôn `luot_to_khai` / `tru_luot_to_khai` (migration 20260924140000).
--
-- Xu là SỐ NGUYÊN, chỉ dùng trong MIMI: không đổi ngược ra tiền, không chuyển cho công ty khác.
-- Hạn mức tháng và giá quy đổi là ĐỀ XUẤT chờ chủ sản phẩm chốt — nằm ở `_shared/billing/bang-gia.ts`,
-- KHÔNG nằm ở đây: hàm SQL nhận hạn mức do máy chủ tính, để đổi giá không cần migration.
--
-- Chỉ máy chủ (service role, qua edge function `tro-ly`) ghi. Thành viên công ty đọc được sổ của công ty mình.

CREATE TABLE IF NOT EXISTS public.so_xu (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Thứ tự ghi: nạp tháng và trừ của cùng một lượt có cùng `tao_luc`, cần một khoá thứ tự chắc chắn.
  thu_tu bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thay_doi integer NOT NULL,
  -- Số dư SAU dòng này. Màn hình đọc một dòng mới nhất thay vì cộng cả sổ (PostgREST chỉ trả 1.000 dòng
  -- một lần — cộng phía trình duyệt sẽ sai khi sổ dài). CHECK >= 0: sổ không bao giờ âm, kể cả ghi tay.
  so_du_sau integer NOT NULL CHECK (so_du_sau >= 0),
  -- tang_thang: nạp đầy tới hạn mức đầu tháng; dung_ai: một lượt hỏi có gọi mô hình;
  -- mua: mua thêm qua chuyển khoản (CHƯA BÁN — để sẵn khuôn, xem backlog); dieu_chinh: người vận hành sửa tay.
  ly_do text NOT NULL CHECK (ly_do IN ('tang_thang', 'dung_ai', 'mua', 'dieu_chinh')),
  -- "2026-10" (giờ Việt Nam) cho dòng tang_thang: mỗi tháng nạp đúng một lần.
  ky_thang text CHECK (ky_thang IS NULL OR ky_thang ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  -- Tham chiếu của dòng: id hội thoại (`dung_ai`)…
  tham_chieu text CHECK (tham_chieu IS NULL OR char_length(tham_chieu) <= 100),
  -- …hoặc hoá đơn đã trả (`mua`): mỗi hoá đơn cộng xu đúng một lần, kể cả khi đối soát chạy trùng.
  hoa_don_id uuid UNIQUE REFERENCES public.subscription_invoices(id) ON DELETE SET NULL,
  -- Mô hình, token, chi phí USD theo bảng giá — để trả lời "sao lượt này tốn 7 xu". Không chứa câu hỏi.
  chi_tiet jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (pg_column_size(chi_tiet) < 4096),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT so_xu_dung_chieu CHECK (
    -- Nạp tháng được phép 0: vẫn phải ghi dấu "tháng này đã nạp", kể cả khi số dư đang cao hơn hạn mức.
    (ly_do = 'tang_thang' AND thay_doi >= 0 AND ky_thang IS NOT NULL) OR
    (ly_do = 'dung_ai' AND thay_doi < 0) OR
    (ly_do = 'mua' AND thay_doi > 0 AND hoa_don_id IS NOT NULL) OR
    (ly_do = 'dieu_chinh' AND thay_doi <> 0)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS so_xu_nap_mot_lan_moi_thang
  ON public.so_xu (company_id, ky_thang) WHERE ly_do = 'tang_thang';
CREATE INDEX IF NOT EXISTS so_xu_company_idx ON public.so_xu (company_id, thu_tu DESC);

ALTER TABLE public.so_xu ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.so_xu FROM anon, authenticated;

DROP POLICY IF EXISTS "Thành viên công ty đọc so_xu" ON public.so_xu;
CREATE POLICY "Thành viên công ty đọc so_xu" ON public.so_xu
  FOR SELECT TO authenticated USING (public.la_thanh_vien(company_id));

COMMENT ON TABLE public.so_xu IS
  'Sổ xu (năng lượng MIMI) theo công ty. Số dư = so_du_sau của dòng mới nhất (= tổng thay_doi). Chỉ máy chủ ghi, qua hàm tru_xu. Xu không quy đổi ra tiền.';

/*
 * Nạp tháng (nếu chưa) rồi trừ xu — NGUYÊN TỬ.
 *
 * Khoá dòng công ty trước khi cộng sổ, để hai lượt hỏi cùng lúc không cùng thấy còn xu rồi cùng trừ.
 * Trừ tối đa bằng số dư: lượt đã trả lời xong (mô hình đã tốn tiền) mà số dư không đủ thì trừ hết phần
 * còn lại và báo `thieu`, KHÔNG để âm. `p_so_xu = 0` chỉ để đọc số dư (và nạp tháng nếu đã sang tháng).
 *
 * Nạp tháng = nạp ĐẦY TỚI hạn mức, không cộng dồn: dư tháng trước không làm thanh năng lượng vượt 100%.
 *
 * Trả về jsonb { da_tru, thieu, so_du }. Chỉ máy chủ gọi được.
 */
CREATE OR REPLACE FUNCTION public.tru_xu(
  p_company uuid, p_so_xu integer, p_han_muc_thang integer, p_ky_thang text, p_tham_chieu text, p_chi_tiet jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  con integer;
  nap integer;
  tru integer;
BEGIN
  IF p_so_xu IS NULL OR p_so_xu < 0 OR p_han_muc_thang IS NULL OR p_han_muc_thang < 0
     OR p_ky_thang IS NULL OR p_ky_thang !~ '^\d{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'tru_xu: tham số không hợp lệ';
  END IF;

  PERFORM 1 FROM public.companies WHERE id = p_company FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'tru_xu: không có công ty';
  END IF;

  -- Đọc từ dòng mới nhất (đã khoá công ty nên không ai chen vào giữa).
  SELECT so_du_sau INTO con FROM public.so_xu WHERE company_id = p_company ORDER BY thu_tu DESC LIMIT 1;
  con := COALESCE(con, 0);

  IF NOT EXISTS (
    SELECT 1 FROM public.so_xu WHERE company_id = p_company AND ly_do = 'tang_thang' AND ky_thang = p_ky_thang
  ) THEN
    nap := GREATEST(p_han_muc_thang - con, 0);
    con := con + nap;
    INSERT INTO public.so_xu (company_id, thay_doi, so_du_sau, ly_do, ky_thang, chi_tiet)
    VALUES (p_company, nap, con, 'tang_thang', p_ky_thang, jsonb_build_object('han_muc', p_han_muc_thang));
  END IF;

  tru := LEAST(p_so_xu, GREATEST(con, 0));
  IF tru > 0 THEN
    con := con - tru;
    INSERT INTO public.so_xu (company_id, thay_doi, so_du_sau, ly_do, tham_chieu, chi_tiet)
    VALUES (p_company, -tru, con, 'dung_ai', left(p_tham_chieu, 100),
            COALESCE(p_chi_tiet, '{}'::jsonb) || jsonb_build_object('can', p_so_xu));
  END IF;

  RETURN jsonb_build_object('da_tru', tru, 'thieu', p_so_xu - tru, 'so_du', con);
END;
$$;

REVOKE ALL ON FUNCTION public.tru_xu(uuid, integer, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tru_xu(uuid, integer, integer, text, text, jsonb) TO service_role;
