-- Ngày giữ chỗ 01/01/1900 không phải một ngày.
--
-- Nguồn Công báo ghi ngày hiệu lực 1900-01-01 cho văn bản không có ngày (chủ yếu văn bản hợp nhất):
-- 301 / 5130 văn bản trong kho, đọc 25/09/2026. Trợ lý đã in "Có hiệu lực từ 01/01/1900" cho người
-- dùng. Ngày không biết thì là NULL ("Chưa xác định"), không phải một ngày bịa.
--
-- Không bịa ngày khác thay thế. Trigger giữ cho lần nạp kho sau (nap-kho-luat) không đưa giá trị
-- giữ chỗ trở lại.

UPDATE public.van_ban_phap_luat SET ngay_hieu_luc = NULL WHERE ngay_hieu_luc < DATE '1901-01-01';
UPDATE public.van_ban_phap_luat SET ngay_ban_hanh = NULL WHERE ngay_ban_hanh < DATE '1901-01-01';

CREATE OR REPLACE FUNCTION public.bo_ngay_gia_cho()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ngay_hieu_luc IS NOT NULL AND NEW.ngay_hieu_luc < DATE '1901-01-01' THEN NEW.ngay_hieu_luc := NULL; END IF;
  IF NEW.ngay_ban_hanh IS NOT NULL AND NEW.ngay_ban_hanh < DATE '1901-01-01' THEN NEW.ngay_ban_hanh := NULL; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bo_ngay_gia_cho ON public.van_ban_phap_luat;
CREATE TRIGGER bo_ngay_gia_cho BEFORE INSERT OR UPDATE ON public.van_ban_phap_luat
  FOR EACH ROW EXECUTE FUNCTION public.bo_ngay_gia_cho();
