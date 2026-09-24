-- Tài khoản demo có dữ liệu phong phú — mà không một dòng giả nào lọt vào tài khoản thật.
--
-- TRƯỚC NGÀY 24/09/2026 demo hiện "Dòng tiền 0 đ, Doanh thu 0 đ, Hoá đơn chờ thanh toán 165 tỷ":
--   - 243 giao dịch của công ty demo đều do nút "Kết nối" mô phỏng sinh bằng Math.random, gắn cờ
--     `is_synthetic` nên màn hình lọc bỏ hết;
--   - còn lại đúng một hoá đơn "thật" 165 tỷ — khách vãng lai gõ vào tài khoản dùng chung;
--   - thêm ba công ty rác ("Meo meo", "fsfasfasf", "dadas") và một mã số thuế trông như số điện thoại.
--
-- CÁCH LÀM:
--   1. Cờ `companies.la_demo` — do máy chủ đặt, trình duyệt không sửa được. Dữ liệu minh hoạ
--      (`is_synthetic`) chỉ hiện trong công ty mang cờ này; công ty thật vẫn lọc như cũ.
--   2. `nap_du_lieu_minh_hoa()` sinh một cửa hàng hư cấu 12 tháng liền mạch, TẤT ĐỊNH (cùng ngày
--      ra cùng số), mọi dòng `is_synthetic = true`. Cron làm mới mỗi đêm để demo luôn là "12 tháng
--      gần nhất" chứ không cũ dần.
--   3. Dọn rác: LƯU BẢN SAO vào `luu_tru.ban_ghi` trước, rồi mới gỡ khỏi bảng chính. Lấy lại được.

-- ── 0. Lưu trữ ───────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS luu_tru;
REVOKE ALL ON SCHEMA luu_tru FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS luu_tru.ban_ghi (
  id bigserial PRIMARY KEY,
  bang text NOT NULL,
  du_lieu jsonb NOT NULL,
  ly_do text NOT NULL,
  luu_luc timestamptz NOT NULL DEFAULT now()
);

/* Chép các dòng thoả điều kiện sang lưu trữ, rồi gỡ khỏi bảng chính. Trả số dòng đã gỡ. */
CREATE OR REPLACE FUNCTION luu_tru.cat(p_bang text, p_dieu_kien text, p_ly_do text)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, luu_tru
AS $$
DECLARE n integer;
BEGIN
  EXECUTE format('INSERT INTO luu_tru.ban_ghi (bang, du_lieu, ly_do) SELECT %L, to_jsonb(t), %L FROM public.%I t WHERE %s',
                 p_bang, p_ly_do, p_bang, p_dieu_kien);
  EXECUTE format('DELETE FROM public.%I WHERE %s', p_bang, p_dieu_kien);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION luu_tru.cat(text, text, text) FROM PUBLIC, anon, authenticated;

-- ── 1. Cờ công ty demo ───────────────────────────────────────────────────────
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS la_demo boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.companies.la_demo IS
  'Công ty minh hoạ của tài khoản demo. Chỉ máy chủ đặt. Dữ liệu is_synthetic chỉ hiện trong công ty có cờ này.';

CREATE OR REPLACE FUNCTION public.giu_co_demo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    NEW.la_demo := CASE WHEN TG_OP = 'INSERT' THEN false ELSE OLD.la_demo END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS giu_co_demo ON public.companies;
CREATE TRIGGER giu_co_demo BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.giu_co_demo();

/*
 * Mọi thứ ghi vào công ty demo đều là dữ liệu minh hoạ.
 *
 * Demo dùng chung, khách vãng lai gõ được hoá đơn 150 tỷ vào đó. Không cấm gõ — thử là quyền
 * của demo — nhưng dòng họ gõ bị gắn cờ `is_synthetic`, đúng như mọi thứ khác trong demo.
 */
CREATE OR REPLACE FUNCTION public.danh_dau_minh_hoa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.companies WHERE id = NEW.company_id AND la_demo) THEN
    NEW.is_synthetic := true;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS danh_dau_minh_hoa ON public.transactions;
CREATE TRIGGER danh_dau_minh_hoa BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.danh_dau_minh_hoa();
DROP TRIGGER IF EXISTS danh_dau_minh_hoa ON public.invoices;
CREATE TRIGGER danh_dau_minh_hoa BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.danh_dau_minh_hoa();

-- ── 2. Dọn rác (có lưu trữ) ──────────────────────────────────────────────────
DO $$
DECLARE
  demo uuid := '84ab7d1f-c8a7-4cf0-a6f6-cad92b600cd9'; -- "Công ty TNHH Thực phẩm Xanh Mekong"
  rac uuid[];
  fk record;
  n integer;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = demo) THEN
    RAISE NOTICE 'không có công ty demo (CSDL cục bộ?) — bỏ qua phần dọn';
    RETURN;
  END IF;

  -- a) Ba công ty rác của tài khoản demo: mọi công ty của người dùng is_demo, trừ công ty demo chính.
  SELECT array_agg(c.id) INTO rac
  FROM public.companies c JOIN public.profiles p ON p.user_id = c.user_id
  WHERE p.is_demo AND c.id <> demo;

  IF rac IS NOT NULL THEN
    UPDATE public.profiles SET active_company_id = demo WHERE active_company_id = ANY (rac);
    -- Lưu mọi bảng con (đều xoá dây chuyền theo companies) trước khi gỡ công ty.
    FOR fk IN
      SELECT c.conrelid::regclass::text AS bang, a.attname AS cot
      FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
      WHERE c.contype = 'f' AND c.confrelid = 'public.companies'::regclass AND c.confdeltype = 'c'
    LOOP
      EXECUTE format('INSERT INTO luu_tru.ban_ghi (bang, du_lieu, ly_do) SELECT %L, to_jsonb(t), %L FROM %s t WHERE t.%I = ANY ($1)',
                     replace(fk.bang, 'public.', ''), 'cong ty rac trong demo', fk.bang, fk.cot) USING rac;
    END LOOP;
    n := luu_tru.cat('companies', format('id = ANY (%L::uuid[])', rac), 'cong ty rac trong demo');
    RAISE NOTICE 'gỡ % công ty rác trong demo', n;
  END IF;

  -- b) Hoá đơn khách vãng lai gõ vào công ty demo (không mang cờ minh hoạ, ví dụ 165 tỷ).
  n := luu_tru.cat('invoices', format('company_id = %L AND NOT is_synthetic', demo), 'hoa don khach vang lai go vao demo');
  RAISE NOTICE 'gỡ % hoá đơn không phải minh hoạ trong demo', n;

  -- c) Dữ liệu ngẫu nhiên cũ của demo — thay bằng bộ tất định ở bước 3.
  n := luu_tru.cat('transaction_labels',
    format('transaction_id IN (SELECT id FROM public.transactions WHERE company_id = %L AND is_synthetic)', demo),
    'nhan cua giao dich ngau nhien cu trong demo');
  n := luu_tru.cat('transactions', format('company_id = %L AND is_synthetic', demo), 'giao dich ngau nhien cu trong demo (Math.random)');
  RAISE NOTICE 'gỡ % giao dịch ngẫu nhiên cũ trong demo', n;
  n := luu_tru.cat('invoices', format('company_id = %L AND is_synthetic', demo), 'hoa don seed cu trong demo');

  -- d) Giao dịch tự sinh nằm trong công ty người dùng THẬT — tàn dư nút "Kết nối" mô phỏng.
  n := luu_tru.cat('transaction_labels',
    format('transaction_id IN (SELECT id FROM public.transactions WHERE is_synthetic AND company_id <> %L)', demo),
    'nhan cua giao dich tu sinh trong cong ty that');
  n := luu_tru.cat('transactions', format('is_synthetic AND company_id <> %L', demo), 'giao dich tu sinh (open-banking mo phong) trong cong ty that');
  RAISE NOTICE 'gỡ % giao dịch tự sinh trong công ty thật', n;

  -- e) Công ty demo thành một cửa hàng hư cấu. Bỏ mã số thuế: 0312345678 có thể là của người thật.
  INSERT INTO luu_tru.ban_ghi (bang, du_lieu, ly_do)
    SELECT 'companies', to_jsonb(c), 'ho so cong ty demo truoc khi doi' FROM public.companies c WHERE id = demo;
  UPDATE public.companies SET
    la_demo = true,
    name = 'Cửa hàng thực phẩm Xanh Mekong (minh hoạ)',
    tax_id = NULL,
    account_type = 'household',
    industry = 'retail',
    province = 'Cần Thơ'
  WHERE id = demo;

  INSERT INTO public.ho_so_thue (company_id, loai_nguoi_nop, nhom_nganh, kenh)
  VALUES (demo, 'ho_kinh_doanh', ARRAY['phan_phoi_hang_hoa'], 'dia_diem_co_dinh')
  ON CONFLICT (company_id) DO UPDATE SET
    loai_nguoi_nop = EXCLUDED.loai_nguoi_nop, nhom_nganh = EXCLUDED.nhom_nganh, kenh = EXCLUDED.kenh;
END $$;

-- ── 3. Nạp dữ liệu minh hoạ ──────────────────────────────────────────────────

/* Số giả ngẫu nhiên TẤT ĐỊNH trong [0, 1): cùng khoá → cùng số, để demo hôm nay và mai khớp nhau. */
CREATE OR REPLACE FUNCTION public.ngau_nhien_minh_hoa(p_khoa text)
RETURNS double precision
LANGUAGE sql IMMUTABLE
AS $$ SELECT (abs(hashtext(p_khoa)::bigint) % 1000000)::double precision / 1000000 $$;

/*
 * Một cửa hàng thực phẩm hư cấu ở Cần Thơ, 12 tháng gần nhất:
 *   - bán lẻ qua QR mỗi ngày (2–3 khoản, 0,6–1 triệu), bán sỉ có hoá đơn cho hai quán quen —
 *     doanh thu thật khoảng 880 triệu một năm, DƯỚI mốc 1 tỷ;
 *   - trả nhà cung cấp hằng tuần, tiền mặt bằng, điện nước, lương hai nhân viên;
 *   - MỘT KHOẢN GIẢI NGÂN VAY 200 triệu và tiền con gửi mỗi tháng — cộng vào thì sao kê trông
 *     như đã VƯỢT 1 tỷ. Đó là câu chuyện demo phải kể: MIMI đọc
 *     nội dung chuyển khoản và tách chúng khỏi doanh thu;
 *   - học phí của con (chi cá nhân lẫn vào tài khoản kinh doanh), chuyển qua lại giữa hai tài
 *     khoản của chính chủ, và một khoản chuyển "tài khoản tạm giữ" để demo cảnh báo lừa đảo.
 * Mọi tên đều hư cấu và mang chữ "MINH HOA"; số tài khoản là 000000000x.
 */
CREATE OR REPLACE FUNCTION public.nap_du_lieu_minh_hoa(p_company uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hom_nay date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  tu date := hom_nay - 365;
  d date;
  k integer;
  n integer;
  tien bigint;
  so integer := 0;
  thang text;
  ngay_vay date := hom_nay - 200;
  tk1 text := '0000000001';
  tk2 text := '0000000002';
  so_hd text;
  han date;
  r double precision;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company AND la_demo) THEN
    RAISE EXCEPTION 'Chỉ nạp dữ liệu minh hoạ vào công ty demo.';
  END IF;

  DELETE FROM public.transactions WHERE company_id = p_company AND reference_id LIKE 'minhhoa:%';
  DELETE FROM public.invoices WHERE company_id = p_company AND invoice_number LIKE 'MH-%';

  d := tu;
  WHILE d < hom_nay LOOP
    thang := to_char(d, 'MM/YYYY');

    -- Bán lẻ qua QR.
    n := 2 + (ngau_nhien_minh_hoa(d || 'n') < 0.5)::int;
    FOR k IN 1..n LOOP
      tien := round((600000 + ngau_nhien_minh_hoa(d || 'a' || k) * 400000) / 1000) * 1000;
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, tien, 'income', 'Bán hàng',
        'KHACH LE CK THANH TOAN DON ' || to_char(d, 'DDMM') || k,
        (ARRAY['KHACH LE', 'KHACH QUEN', 'KHACH ONLINE'])[1 + (k % 3)],
        tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':ban:' || k, true);
      so := so + 1;
    END LOOP;

    -- Bán sỉ có hoá đơn: ngày 3 và 18 mỗi tháng, cho hai quán quen.
    IF extract(day FROM d) IN (3, 18) THEN
      so_hd := 'MH-' || to_char(d, 'YYMMDD');
      tien := round((5000000 + ngau_nhien_minh_hoa(d || 'hd') * 3000000) / 1000) * 1000;
      han := d + 15;
      INSERT INTO public.invoices (company_id, invoice_number, client_name, amount, vat_rate, total, issued_date, due_date, status, is_synthetic)
      VALUES (p_company, so_hd,
        CASE WHEN extract(day FROM d) = 3 THEN 'Quán cơm A (minh hoạ)' ELSE 'Tiệm bánh B (minh hoạ)' END,
        tien, 0, tien, d, han,
        CASE WHEN han < hom_nay - 20 THEN 'paid' WHEN han < hom_nay THEN 'overdue' ELSE 'pending' END,
        true);
      IF han < hom_nay - 20 THEN
        INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
          account_number, transaction_date, source_bank, reference_id, is_synthetic)
        VALUES (p_company, tien, 'income', 'Bán hàng', 'TT HOA DON ' || so_hd,
          CASE WHEN extract(day FROM d) = 3 THEN 'QUAN COM A (MINH HOA)' ELSE 'TIEM BANH B (MINH HOA)' END,
          tk1, han - 3, 'Ngân hàng minh hoạ', 'minhhoa:' || so_hd || ':tt', true);
        so := so + 1;
      END IF;
    END IF;

    -- Nhà cung cấp: rau củ mỗi thứ Hai, gạo thứ Năm cách tuần, sữa ngày 8.
    IF extract(isodow FROM d) = 1 THEN
      tien := round((5000000 + ngau_nhien_minh_hoa(d || 'rau') * 2000000) / 1000) * 1000;
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, tien, 'expense', 'Nhập hàng', 'TT TIEN HANG RAU CU TUAN ' || to_char(d, 'IW/IYYY'),
        'NHA CUNG CAP RAU CU A (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':rau', true);
      so := so + 1;
    END IF;
    IF extract(isodow FROM d) = 4 AND extract(week FROM d)::int % 2 = 0 THEN
      tien := round((6000000 + ngau_nhien_minh_hoa(d || 'gao') * 2000000) / 1000) * 1000;
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, tien, 'expense', 'Nhập hàng', 'TT TIEN GAO DOT ' || to_char(d, 'DD/MM'),
        'NHA CUNG CAP GAO B (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':gao', true);
      so := so + 1;
    END IF;

    IF extract(day FROM d) = 1 THEN
      FOR k IN 1..2 LOOP
        INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
          account_number, transaction_date, source_bank, reference_id, is_synthetic)
        VALUES (p_company, 5500000, 'expense', 'Lương', 'LUONG THANG ' || to_char(d - 1, 'MM/YYYY') || ' NHAN VIEN ' || k,
          'NHAN VIEN BAN HANG ' || k || ' (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':luong' || k, true);
        so := so + 1;
      END LOOP;
    END IF;
    IF extract(day FROM d) = 5 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 6000000, 'expense', 'Thuê mặt bằng', 'TIEN THUE MAT BANG THANG ' || thang,
        'CHU NHA MAT BANG (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':nha', true);
      so := so + 1;
    END IF;
    IF extract(day FROM d) = 8 THEN
      tien := round((5000000 + ngau_nhien_minh_hoa(d || 'sua') * 1000000) / 1000) * 1000;
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, tien, 'expense', 'Nhập hàng', 'TT HANG SUA THANG ' || thang,
        'CONG TY SUA C (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':sua', true);
      so := so + 1;
    END IF;
    IF extract(day FROM d) = 10 THEN
      tien := round((1500000 + ngau_nhien_minh_hoa(d || 'dien') * 600000) / 1000) * 1000;
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, tien, 'expense', 'Tiện ích', 'TIEN DIEN THANG ' || thang,
        'DIEN LUC (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':dien', true);
      so := so + 1;
    END IF;
    IF extract(day FROM d) = 12 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 300000, 'expense', 'Tiện ích', 'TIEN NUOC THANG ' || thang,
        'CAP NUOC (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':nuoc', true);
      so := so + 1;
    END IF;

    -- Chi cá nhân lẫn vào tài khoản kinh doanh: học phí của con.
    IF extract(day FROM d) = 15 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 2500000, 'expense', NULL, 'HOC PHI CON THANG ' || thang,
        'TRUONG TIEU HOC (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':hocphi', true);
      so := so + 1;
    END IF;

    -- Tiền con gửi về — không phải doanh thu.
    IF extract(day FROM d) = 20 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 3000000, 'income', NULL, 'CON GUI BA ME TIEU THANG ' || thang,
        'CON GAI O SAI GON (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':con', true);
      so := so + 1;
    END IF;

    -- Khoản vay 200 triệu, trả góp mỗi ngày 25 sau đó.
    IF d = ngay_vay THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 200000000, 'income', NULL, 'GIAI NGAN HDTD 0126/HDTD-MINHHOA',
        'NGAN HANG TMCP (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':vay', true);
      so := so + 1;
    END IF;
    IF d > ngay_vay AND extract(day FROM d) = 25 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 9200000, 'expense', 'Trả nợ vay', 'TRA NO GOC LAI HDTD 0126 KY ' || thang,
        'NGAN HANG TMCP (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':travay', true);
      so := so + 1;
    END IF;

    -- Chuyển giữa hai tài khoản của chính chủ: một dòng ra ở tài khoản 1, một dòng vào ở tài khoản 2.
    IF extract(day FROM d) = 28 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, counter_account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES
        (p_company, 10000000, 'expense', NULL, 'CHUYEN TIEN SANG TK THU HAI', 'CHU HO (MINH HOA)', tk1, tk2, d,
         'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':noibo-ra', true),
        (p_company, 10000000, 'income', NULL, 'NHAN TIEN TU TK CHINH', 'CHU HO (MINH HOA)', tk2, tk1, d,
         'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':noibo-vao', true);
      so := so + 2;
    END IF;

    -- Một khoản giống lừa đảo "tài khoản tạm giữ" — để demo cảnh báo bất thường.
    IF d = hom_nay - 12 THEN
      INSERT INTO public.transactions (company_id, amount, type, category, merchant_name, counter_account_name,
        account_number, transaction_date, source_bank, reference_id, is_synthetic)
      VALUES (p_company, 45000000, 'expense', NULL, 'CHUYEN TIEN VAO TAI KHOAN TAM GIU THEO YEU CAU',
        'NGUOI NHAN LA (MINH HOA)', tk1, d, 'Ngân hàng minh hoạ', 'minhhoa:' || to_char(d, 'YYYYMMDD') || ':la', true);
      so := so + 1;
    END IF;

    d := d + 1;
  END LOOP;

  RETURN so;
END;
$$;

REVOKE ALL ON FUNCTION public.nap_du_lieu_minh_hoa(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nap_du_lieu_minh_hoa(uuid) TO service_role;

-- Nạp ngay lần đầu.
SELECT public.nap_du_lieu_minh_hoa(id) FROM public.companies WHERE la_demo;

-- Làm mới mỗi đêm 02:15 giờ Việt Nam: demo luôn là "12 tháng gần nhất", và rác khách vãng lai
-- gõ vào hôm trước (đều đã mang cờ minh hoạ) không tích luỹ trên các con số mẫu.
SELECT cron.schedule('mimi-lam-moi-demo', '15 19 * * *',
  $$SELECT public.nap_du_lieu_minh_hoa(id) FROM public.companies WHERE la_demo$$);
