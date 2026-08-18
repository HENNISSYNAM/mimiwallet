-- Widen `con_so_moc` before anything writes to it.
--
-- It was declared `integer`, which caps at 2,147,483,647 — about 2,1 tỷ đồng.
-- That held only by luck: the two values seeded on 14/08 were 500 triệu and
-- 1 tỷ, both under the ceiling. The first realistic figure to arrive broke it,
-- and it broke loudly: `integer out of range` on the 3 tỷ threshold below.
--
-- The domain makes this obvious in hindsight. This column stores Vietnamese
-- revenue thresholds in đồng, and the very law being cited has bands at 3 tỷ
-- and 50 tỷ. A type that cannot hold 50 tỷ was never going to work for a table
-- about tax thresholds; `bigint` reaches ~9,2 tỷ tỷ, which is past any figure
-- this table will ever carry.
ALTER TABLE public.legal_documents
  ALTER COLUMN con_so_moc TYPE bigint;

-- Correct the PIT row, and record the rule the cost-documentation feature rests on.
--
-- Two errors in the 14/08 seed, both found by re-reading the sources on 17/08:
--
-- 1. `ngay_hieu_luc` was 2026-01-01. The article cited in `url_nguon` reports the
--    National Assembly passing the law and states the 500 triệu threshold — it
--    never states an effective date. That date was inferred, not read, which is
--    exactly the mistake this table was built to prevent. The announcement
--    coverage (06/01/2026) gives 01/07/2026, with the business-income provisions
--    applying for tax year 2026.
--
-- 2. The row credited one law with both the VAT and the PIT exemption. They are
--    two laws on two clocks: the VAT threshold moved to 500 triệu from
--    01/01/2026, the PIT law takes effect 01/07/2026. A household reading
--    "miễn cả GTGT và TNCN từ 01/01" would have had half of it wrong.
--
-- The practical answer for a household is still "500 triệu, cả năm 2026" — but
-- the row is a citation, and a citation that rounds two dates into one is not
-- one.

UPDATE public.legal_documents
SET
  ngay_hieu_luc = '2026-07-01',
  tom_tat_de_hieu =
    'Hộ kinh doanh và cá nhân kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống '
    'không phải nộp thuế TNCN. Luật có hiệu lực 01/07/2026, nhưng phần thu nhập từ '
    'kinh doanh áp dụng cho cả kỳ tính thuế năm 2026 — nên với doanh thu năm 2026 '
    'của bạn, mốc 500 triệu đã có hiệu lực. Ngưỡng miễn thuế GTGT 500 triệu là quy '
    'định riêng của Luật Thuế GTGT, áp dụng từ 01/01/2026.',
  tom_tat_chinh_thuc =
    'Nâng mức doanh thu không chịu thuế TNCN của hộ, cá nhân kinh doanh lên 500 triệu '
    'đồng/năm. Luật Thuế TNCN 2025 có hiệu lực từ 01/07/2026; quy định về thu nhập từ '
    'kinh doanh và từ tiền lương, tiền công áp dụng từ kỳ tính thuế năm 2026.',
  url_nguon = 'https://baochinhphu.vn/nhieu-thay-doi-ve-thue-doi-voi-ca-nhan-va-ho-kinh-doanh-102260106104740091.htm'
WHERE so_hieu = 'Luật Thuế TNCN (sửa đổi) 2025';

-- The rule the whole cost-documentation feature depends on, so it is citable in
-- the product rather than living only in a planning document.
--
-- `con_so_moc` is 3 tỷ: the ceiling of the band where the taxpayer still gets to
-- CHOOSE between paying on profit and paying on a percentage of revenue. That
-- choice is the entire reason proving costs is worth money, and 500 triệu–3 tỷ
-- is where MIMI's customers actually are.
INSERT INTO public.legal_documents
  (so_hieu, ten, loai, co_quan_ban_hanh, ngay_ban_hanh, ngay_hieu_luc,
   tom_tat_de_hieu, tom_tat_chinh_thuc, doi_tuong_ap_dung, con_so_moc, don_vi_moc, url_nguon)
VALUES
(
  'Luật Thuế TNCN 2025 — cách tính thuế hộ kinh doanh',
  'Luật Thuế thu nhập cá nhân 2025: phương pháp tính thuế trên thu nhập (doanh thu trừ chi phí)',
  'luat',
  'Quốc hội',
  '2025-12-10',
  '2026-07-01',
  'Từ 2026 không còn thuế khoán. Nếu doanh thu của bạn từ 500 triệu đến 3 tỷ/năm, bạn '
  'ĐƯỢC CHỌN một trong hai cách: nộp 15% trên lợi nhuận (doanh thu trừ chi phí), hoặc '
  'nộp theo tỷ lệ phần trăm trên doanh thu. Chọn cách nào là quyền của bạn — nhưng muốn '
  'tính trên lợi nhuận thì phải chứng minh được chi phí. Không chứng minh được thì mặc '
  'nhiên phải nộp theo doanh thu, thường là số tiền lớn hơn.',
  'Bỏ phương pháp khoán thuế. Áp dụng phương pháp tính thuế trên thu nhập (doanh thu trừ '
  'chi phí hợp lệ): doanh thu trên 500 triệu đến 3 tỷ đồng/năm thuế suất 15%, được lựa '
  'chọn giữa tính trên thu nhập hoặc theo tỷ lệ trên doanh thu; trên 3 tỷ đến 50 tỷ '
  'đồng/năm thuế suất 17%; trên 50 tỷ đồng/năm thuế suất 20%.',
  ARRAY['ho_kinh_doanh', 'ca_nhan'],
  3000000000,
  'VND/năm',
  'https://baochinhphu.vn/nhieu-thay-doi-ve-thue-doi-voi-ca-nhan-va-ho-kinh-doanh-102260106104740091.htm'
);
