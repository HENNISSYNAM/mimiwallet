-- Curated law/tax reference, shown next to macro news.
--
-- Public information, not user data: the same five rows are correct for every
-- company on the platform, so this is readable by anyone signed in rather than
-- scoped by company_id like everything else in this schema.
--
-- Nothing here is writable by `authenticated`. Every row is entered by a
-- migration after a human read the primary source — the same discipline that
-- caught EXEMPTION_THRESHOLD_VND being wrong (1 tỷ instead of 500 triệu) before
-- it reached a user. A table anyone could insert into would have no such gate.

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- e.g. "Nghị định 70/2025/NĐ-CP". The thing a person searches for.
  so_hieu text NOT NULL,
  ten text NOT NULL,
  loai text NOT NULL CHECK (loai IN ('luat', 'nghi_dinh', 'thong_tu')),
  co_quan_ban_hanh text NOT NULL,
  ngay_ban_hanh date,
  ngay_hieu_luc date,
  -- Plain-language answer to "does this affect me", not legal wording.
  tom_tat_de_hieu text NOT NULL,
  -- The formal summary, for someone who wants the precise language.
  tom_tat_chinh_thuc text,
  -- 'ho_kinh_doanh' | 'doanh_nghiep' | 'ca_nhan' | 'tat_ca'
  doi_tuong_ap_dung text[] NOT NULL DEFAULT '{}',
  -- What a reader can act on today. Nullable: not every law has one.
  con_so_moc integer,
  don_vi_moc text,
  -- Required, not optional: a legal citation with no way to verify it is worse
  -- than not showing one at all.
  url_nguon text NOT NULL,
  -- Set on the record that made an earlier one stale, e.g. NĐ 356/2025 on the
  -- row for NĐ 13/2023. Lets the UI say "thay thế bởi…" instead of just vanishing
  -- an old citation someone might still search for.
  thay_the_boi uuid REFERENCES public.legal_documents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS legal_documents_hieu_luc_idx
  ON public.legal_documents (ngay_hieu_luc DESC);

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users read legal documents"
  ON public.legal_documents FOR SELECT TO authenticated
  USING (true);

-- No INSERT/UPDATE/DELETE policy. Curation happens in migrations, by someone
-- who opened the source URL — never from the browser.

COMMENT ON TABLE public.legal_documents IS
  'Curated law/tax reference. Every row requires a verified url_nguon; no user-writable policy exists on purpose.';

-- ── Seed: five documents, each checked against its primary source on 14/08/2026 ──
--
-- Deliberately not the six-plus laws a full compliance database would carry.
-- These are the ones that change what a household business or SME on MIMI
-- owes or must do, and that this product's own numbers depend on.

INSERT INTO public.legal_documents
  (so_hieu, ten, loai, co_quan_ban_hanh, ngay_ban_hanh, ngay_hieu_luc,
   tom_tat_de_hieu, tom_tat_chinh_thuc, doi_tuong_ap_dung, con_so_moc, don_vi_moc, url_nguon)
VALUES
(
  'Luật Thuế TNCN (sửa đổi) 2025',
  'Luật Thuế thu nhập cá nhân (sửa đổi)',
  'luat',
  'Quốc hội',
  '2025-12-10',
  '2026-01-01',
  'Hộ kinh doanh và cá nhân kinh doanh có doanh thu từ 500 triệu đồng/năm trở xuống không phải nộp thuế GTGT và thuế TNCN. Dưới mức này, bạn được miễn — không phải khai, không phải nộp.',
  'Nâng mức doanh thu miễn thuế GTGT và TNCN của hộ, cá nhân kinh doanh từ 200 triệu đồng/năm (theo Luật Thuế GTGT 2024) lên 500 triệu đồng/năm.',
  ARRAY['ho_kinh_doanh', 'ca_nhan'],
  500000000,
  'VND/năm',
  'https://baochinhphu.vn/thong-qua-luat-thue-thu-nhap-ca-nhan-sua-doi-ho-kinh-doanh-thu-duoi-500-trieu-dong-nam-duoc-mien-thue-10225121011144591.htm'
),
(
  'Nghị định 70/2025/NĐ-CP',
  'Sửa đổi, bổ sung Nghị định 123/2020/NĐ-CP về hoá đơn, chứng từ',
  'nghi_dinh',
  'Chính phủ',
  '2025-03-20',
  '2025-06-01',
  'Nếu doanh thu một năm đạt từ 1 tỷ đồng trở lên, bạn phải xuất hoá đơn điện tử từ máy tính tiền, nối dữ liệu thẳng với cơ quan thuế. Đây là quy định về CÁCH ghi nhận doanh thu — không phải quy định về việc phải nộp bao nhiêu tiền thuế.',
  'Hộ, cá nhân kinh doanh có mức doanh thu hằng năm từ 01 tỷ đồng trở lên phải sử dụng hoá đơn điện tử khởi tạo từ máy tính tiền có kết nối chuyển dữ liệu điện tử với cơ quan thuế.',
  ARRAY['ho_kinh_doanh', 'ca_nhan'],
  1000000000,
  'VND/năm',
  'https://xaydungchinhsach.chinhphu.vn/mot-so-noi-dung-moi-cua-nghi-dinh-so-70-2025-nd-cp-ve-hoa-don-chung-tu-119250403074719995.htm'
),
(
  'Thông tư 133/2016/TT-BTC',
  'Hướng dẫn Chế độ kế toán doanh nghiệp nhỏ và vừa',
  'thong_tu',
  'Bộ Tài chính',
  '2016-08-26',
  '2017-01-01',
  'Nếu bạn đã đăng ký doanh nghiệp (TNHH, cổ phần...), đây là bộ quy tắc ghi sổ sách bạn phải theo — không phụ thuộc vào doanh thu cao hay thấp. Khác với hộ kinh doanh, đã lên doanh nghiệp là phải làm sổ sách đầy đủ ngay từ đầu.',
  'Hướng dẫn nguyên tắc ghi sổ kế toán, lập và trình bày Báo cáo tài chính của doanh nghiệp nhỏ và vừa, không áp dụng cho việc xác định nghĩa vụ thuế của doanh nghiệp đối với ngân sách nhà nước.',
  ARRAY['doanh_nghiep'],
  NULL,
  NULL,
  'https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Thong-tu-133-2016-TT-BTC-huong-dan-che-do-ke-toan-doanh-nghiep-nho-va-vua-284997.aspx'
),
(
  'Luật số 91/2025/QH15',
  'Luật Bảo vệ dữ liệu cá nhân',
  'luat',
  'Quốc hội',
  '2025-11-26',
  '2026-01-01',
  'Quy định quyền của bạn với dữ liệu cá nhân của chính mình — bao gồm dữ liệu tài chính. MIMI phải xin sự đồng ý rõ ràng trước khi đọc sao kê ngân hàng của bạn, và bạn có quyền rút lại sự đồng ý đó bất cứ lúc nào.',
  'Khung pháp lý toàn diện đầu tiên về bảo vệ dữ liệu cá nhân ở cấp luật, thay thế Nghị định 13/2023/NĐ-CP.',
  ARRAY['tat_ca'],
  NULL,
  NULL,
  'https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx'
),
(
  'Nghị định 356/2025/NĐ-CP',
  'Quy định chi tiết một số điều của Luật Bảo vệ dữ liệu cá nhân',
  'nghi_dinh',
  'Chính phủ',
  '2025-12-30',
  '2026-01-01',
  'Văn bản hướng dẫn thi hành cụ thể hoá Luật Bảo vệ dữ liệu cá nhân — quy định chi tiết cách MIMI phải xin phép, lưu trữ và bảo vệ dữ liệu ngân hàng mà bạn kết nối.',
  'Thay thế Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân kể từ ngày Nghị định này có hiệu lực thi hành.',
  ARRAY['tat_ca'],
  NULL,
  NULL,
  'https://thuvienphapluat.vn/phap-luat-nha-dat/toan-van-nghi-dinh-3562025ndcp-huong-dan-luat-bao-ve-du-lieu-ca-nhan-13670.html'
)
ON CONFLICT DO NOTHING;

-- Nghị định 13/2023/NĐ-CP (the decree these two rows replace) is deliberately
-- not seeded as a row. MIMI never showed it as current law, so there is no
-- stale citation to correct — only two new ones to add, which is what the
-- INSERT above does. `thay_the_boi` exists on the table for the day some other
-- row does need to point at a successor; nothing uses it yet.
