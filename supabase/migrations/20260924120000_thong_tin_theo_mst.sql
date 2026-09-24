-- Điều Tổng cục Thuế nói về mã số thuế của công ty, để MIMI không hỏi lại người dùng.
--
-- Người dùng gõ mã số thuế rồi vẫn bị hỏi "hộ kinh doanh hay doanh nghiệp", "tỉnh nào" —
-- những điều chính mã đó đã trả lời. Edge function tra mã (XInvoice, dữ liệu Tổng cục Thuế)
-- rồi ghi vào đây; xem `supabase/functions/_shared/mst/tra-cuu.ts`.
--
-- Tên đăng ký để riêng ở `ten_theo_mst`, không đè `name`: `name` là tên người dùng quen gọi,
-- còn tờ khai và giấy tờ cần đúng tên pháp lý.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS ten_theo_mst text,
  ADD COLUMN IF NOT EXISTS dia_chi_theo_mst text,
  ADD COLUMN IF NOT EXISTS co_quan_thue text,
  ADD COLUMN IF NOT EXISTS loai_theo_mst text,
  ADD COLUMN IF NOT EXISTS trang_thai_mst text,
  ADD COLUMN IF NOT EXISTS mst_tra_luc timestamptz;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_loai_theo_mst_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_loai_theo_mst_check
  CHECK (loai_theo_mst IS NULL OR loai_theo_mst IN ('ho_kinh_doanh', 'doanh_nghiep'));

COMMENT ON COLUMN public.companies.ten_theo_mst IS 'Tên đăng ký theo Tổng cục Thuế. Chỉ máy chủ ghi, sau khi tra mã số thuế.';
COMMENT ON COLUMN public.companies.mst_tra_luc IS 'Lần tra mã số thuế gần nhất. NULL = chưa tra; có giá trị mà ten_theo_mst NULL = đã tra, không thấy.';

-- Chỉ máy chủ được ghi "theo Tổng cục Thuế".
--
-- RLS cho chủ công ty UPDATE cả dòng `companies`, nên không có trigger này thì trình duyệt tự
-- viết được một cái tên, một trạng thái "đang hoạt động" rồi MIMI trình bày lại như lời cơ
-- quan thuế. Người dùng vẫn đổi được `tax_id`; đổi thì điều tra của mã cũ bị xoá, và lần đọc
-- sau máy chủ tra lại mã mới.
CREATE OR REPLACE FUNCTION public.giu_thong_tin_theo_mst()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.tax_id IS DISTINCT FROM OLD.tax_id THEN
    NEW.ten_theo_mst := NULL;
    NEW.dia_chi_theo_mst := NULL;
    NEW.co_quan_thue := NULL;
    NEW.loai_theo_mst := NULL;
    NEW.trang_thai_mst := NULL;
    NEW.mst_tra_luc := NULL;
  ELSE
    NEW.ten_theo_mst := OLD.ten_theo_mst;
    NEW.dia_chi_theo_mst := OLD.dia_chi_theo_mst;
    NEW.co_quan_thue := OLD.co_quan_thue;
    NEW.loai_theo_mst := OLD.loai_theo_mst;
    NEW.trang_thai_mst := OLD.trang_thai_mst;
    NEW.mst_tra_luc := OLD.mst_tra_luc;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS giu_thong_tin_theo_mst ON public.companies;
CREATE TRIGGER giu_thong_tin_theo_mst
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.giu_thong_tin_theo_mst();
