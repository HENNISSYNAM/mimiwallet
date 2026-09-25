-- Một khoản tiền → một thông báo (25/09/2026).
--
-- Lỗi: hai thông báo "3.000.000đ có vẻ là người nhà chuyển" cho CÙNG một khoản. Gốc: khoá thông báo là
-- `tien_vao:<mã dòng>`, mà bộ nạp lại dữ liệu demo xoá và tạo lại giao dịch mỗi đêm với mã dòng mới →
-- mỗi đêm một thông báo mới cho cùng khoản tiền. Khoá mới: `tien_vao:<reference_id>` (mã tham chiếu
-- ngân hàng / sao kê / minh hoạ), xem `_shared/thong-bao/sinh.ts` → `khoaTienVao`.
--
-- KHÔNG XOÁ thông báo nào. Thông báo trỏ tới khoản đã không còn thì đánh dấu lỗi thời (giữ để truy vết).

ALTER TABLE public.thong_bao ADD COLUMN IF NOT EXISTS loi_thoi_luc timestamptz;
COMMENT ON COLUMN public.thong_bao.loi_thoi_luc IS
  'Thông báo không còn đúng (khoản tiền đã bị thay, trùng với thông báo khác). Giữ để truy vết, không hiện.';

-- 1. Thông báo tiền vào trỏ tới giao dịch không còn tồn tại → lỗi thời.
UPDATE public.thong_bao tb
   SET loi_thoi_luc = now()
 WHERE tb.loai = 'tien_vao'
   AND tb.loi_thoi_luc IS NULL
   AND tb.khoa ~ '^tien_vao:[0-9a-f-]{36}$'
   AND NOT EXISTS (SELECT 1 FROM public.transactions t WHERE t.id::text = substr(tb.khoa, 10));

-- 2. Thông báo còn sống mang khoá cũ (mã dòng) → chuyển sang khoá mới (mã tham chiếu), để lần quét
--    sau không sinh thêm một bản cho cùng khoản. Nếu khoá mới đã có (trùng) thì bản cũ thành lỗi thời.
UPDATE public.thong_bao tb
   SET loi_thoi_luc = now()
  FROM public.transactions t
 WHERE tb.loai = 'tien_vao' AND tb.loi_thoi_luc IS NULL
   AND tb.khoa = 'tien_vao:' || t.id::text AND t.reference_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.thong_bao k WHERE k.user_id = tb.user_id AND k.company_id = tb.company_id AND k.khoa = 'tien_vao:' || t.reference_id);

-- Hai dòng cũ cùng trỏ một mã tham chiếu (hiếm): giữ dòng mới nhất, dòng kia lỗi thời.
UPDATE public.thong_bao tb
   SET loi_thoi_luc = now()
  FROM public.transactions t
 WHERE tb.loai = 'tien_vao' AND tb.loi_thoi_luc IS NULL
   AND tb.khoa = 'tien_vao:' || t.id::text AND t.reference_id IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.thong_bao k JOIN public.transactions t2 ON k.khoa = 'tien_vao:' || t2.id::text
                WHERE k.user_id = tb.user_id AND k.company_id = tb.company_id AND k.loi_thoi_luc IS NULL
                  AND t2.reference_id = t.reference_id AND (k.tao_luc, k.id) > (tb.tao_luc, tb.id));

UPDATE public.thong_bao tb
   SET khoa = 'tien_vao:' || t.reference_id
  FROM public.transactions t
 WHERE tb.loai = 'tien_vao' AND tb.loi_thoi_luc IS NULL
   AND tb.khoa = 'tien_vao:' || t.id::text AND t.reference_id IS NOT NULL;

-- 3. Nhắc hạn theo LỊCH CHUNG cả nước (khoá cũ `han:<năm>-q<quý>:<ngày>`) có thể sai với chính công ty
--    nhận nó (hộ không phải khai quý vẫn nhận "Còn 7 ngày tới hạn tờ khai quý 3"). Từ nay nhắc theo lịch
--    riêng (`_shared/luat/lich-thue.ts`); bản cũ chưa xử lý thành lỗi thời, không xoá.
UPDATE public.thong_bao
   SET loi_thoi_luc = now()
 WHERE loai = 'han_thue' AND loi_thoi_luc IS NULL AND da_xu_ly_luc IS NULL
   AND khoa ~ '^han:[0-9]{4}-q[1-4]:[0-9]+$';
