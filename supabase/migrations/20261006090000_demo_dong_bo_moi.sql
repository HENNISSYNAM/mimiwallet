-- Demo được nạp lại mỗi đêm (nap_du_lieu_minh_hoa) nhưng "lần đồng bộ cuối" của các kết nối mẫu vẫn là 11/08/2026,
-- nên trợ lý cảnh báo "số liệu có thể đã cũ" trên chính bản demo (06/10/2026). Lịch đêm giờ cập nhật luôn mốc đó.
-- Chỉ chạm công ty demo (la_demo), không chạm khách thật.
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimi-lam-moi-demo';
END $$;

SELECT cron.schedule('mimi-lam-moi-demo', '15 19 * * *', $$
  SELECT public.nap_du_lieu_minh_hoa(id) FROM public.companies WHERE la_demo;
  UPDATE public.bank_connections SET last_synced_at = now()
   WHERE company_id IN (SELECT id FROM public.companies WHERE la_demo) AND status = 'connected';
$$);

UPDATE public.bank_connections SET last_synced_at = now()
 WHERE company_id IN (SELECT id FROM public.companies WHERE la_demo) AND status = 'connected';
