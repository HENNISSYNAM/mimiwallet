-- Bản demo dùng chung (06/10/2026): lịch sử hỏi MIMI phải sạch mỗi phiên. Máy khách đã chỉ hiện lượt của phiên mình
-- và xoá lượt cũ hơn 2 giờ khi vào demo (src/lib/demoPhien.ts); lịch đêm dọn nốt phần còn lại.
-- Chỉ chạm công ty demo (la_demo).
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimi-lam-moi-demo';
END $$;

SELECT cron.schedule('mimi-lam-moi-demo', '15 19 * * *', $$
  SELECT public.nap_du_lieu_minh_hoa(id) FROM public.companies WHERE la_demo;
  UPDATE public.bank_connections SET last_synced_at = now()
   WHERE company_id IN (SELECT id FROM public.companies WHERE la_demo) AND status = 'connected';
  DELETE FROM public.hoi_thoai_tro_ly
   WHERE company_id IN (SELECT id FROM public.companies WHERE la_demo);
$$);
