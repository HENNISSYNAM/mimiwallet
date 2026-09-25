"""Sinh migration nạp danh mục tờ khai + thủ tục hành chính thuế (dữ liệu công khai đã cào)."""
import json
import os

D = os.path.dirname(os.path.abspath(__file__))
RA = 'C:/Users/NAM DINH/Downloads/mimiwallet-main/mimiwallet-main/supabase/migrations/20260925110000_thu_tuc_thue.sql'

d = json.load(open(os.path.join(D, 'tthc.json'), encoding='utf-8'))
tk = json.load(open(os.path.join(D, 'to_khai_sach.json'), encoding='utf-8'))
lay_luc = d['lay_luc']


def p(t, k):
    return (t['phan'].get(k) or '').strip() or None


thu_tuc = [{
    'ma': t['ma'],
    'ten': t['ten'],
    'cap_thuc_hien': p(t, 'Cấp thực hiện'),
    'doi_tuong': p(t, 'Đối tượng thực hiện'),
    'co_quan': p(t, 'Cơ quan thực hiện'),
    'trinh_tu': p(t, 'Trình tự thực hiện'),
    'cach_thuc': p(t, 'Cách thức thực hiện'),
    'thanh_phan_ho_so': p(t, 'Thành phần hồ sơ'),
    'ket_qua': p(t, 'Kết quả thực hiện'),
    'dieu_kien': p(t, 'Điều kiện thực hiện'),
    'can_cu_phap_ly': p(t, 'Căn cứ pháp lý'),
    'mau_to_khai': t['mau_nhac_toi'],
    'nguon': t['nguon'],
} for t in d['thu_tuc']]

for x in thu_tuc + tk:
    for v in x.values():
        assert '$du_lieu$' not in json.dumps(v, ensure_ascii=False)

sql = f"""-- Danh mục tờ khai và thủ tục hành chính thuế — dữ liệu CÔNG KHAI cào từ
-- https://dichvucong.gdt.gov.vn/tthc/homelogin/tthc (không đăng nhập), lấy lúc {lay_luc}.
--
-- Vì sao: để MIMI biết mẫu tờ khai nào tồn tại, thủ tục nào cần hồ sơ gì, nộp ở đâu, kết quả là gì —
-- thay vì để mô hình ngôn ngữ nhớ (và nhớ sai).
--
-- GIỚI HẠN PHẢI NÓI RA: trang thủ tục của cổng CHẬM hơn văn bản. Ví dụ thủ tục 1.011022 ("Khai thuế
-- đối với hộ kinh doanh… phương pháp kê khai") vẫn dẫn Thông tư 40/2021 và Nghị định 126/2020, trong
-- khi năm 2026 đã có Nghị định 68/2026, Thông tư 18/2026, 50/2026, 89/2026. Căn cứ pháp lý ở đây là
-- "cổng ghi gì vào ngày lấy", KHÔNG phải luật hiện hành — luật hiện hành lấy từ kho Công báo
-- (van_ban_phap_luat). Danh mục tờ khai thì mới hơn: đã có mẫu theo Thông tư 89/2026.

CREATE TABLE IF NOT EXISTS public.danh_muc_to_khai (
  gia_tri_cong text PRIMARY KEY,          -- mã nội bộ của cổng (value trong ô chọn)
  ma text,                                -- mã mẫu, ví dụ 01/CNKD
  ten text NOT NULL,
  van_ban text,                           -- văn bản ban hành mẫu nếu tên có ghi (TT89/2026…)
  nguon text NOT NULL,
  lay_luc timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS danh_muc_to_khai_ma_idx ON public.danh_muc_to_khai (ma);

CREATE TABLE IF NOT EXISTS public.thu_tuc_thue (
  ma text PRIMARY KEY,                    -- mã thủ tục trên Cơ sở dữ liệu quốc gia về TTHC
  ten text NOT NULL,
  cap_thuc_hien text,
  doi_tuong text,
  co_quan text,
  trinh_tu text,
  cach_thuc text,
  thanh_phan_ho_so text,
  ket_qua text,
  dieu_kien text,
  can_cu_phap_ly text,
  mau_to_khai text[] NOT NULL DEFAULT '{{}}',
  nguon text NOT NULL,
  lay_luc timestamptz NOT NULL,
  -- Tính lúc nạp (array_to_string không bất biến nên không dùng được cột sinh tự động).
  tim tsvector
);
CREATE INDEX IF NOT EXISTS thu_tuc_thue_tim_idx ON public.thu_tuc_thue USING gin (tim);
CREATE INDEX IF NOT EXISTS thu_tuc_thue_mau_idx ON public.thu_tuc_thue USING gin (mau_to_khai);

ALTER TABLE public.danh_muc_to_khai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thu_tuc_thue ENABLE ROW LEVEL SECURITY;
-- Dữ liệu công khai: người đã đăng nhập đọc được; không ai ghi từ trình duyệt.
CREATE POLICY "Người dùng đọc danh_muc_to_khai" ON public.danh_muc_to_khai FOR SELECT TO authenticated USING (true);
CREATE POLICY "Người dùng đọc thu_tuc_thue" ON public.thu_tuc_thue FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.thu_tuc_thue IS
  'Thủ tục hành chính thuế, cào từ dichvucong.gdt.gov.vn (công khai). can_cu_phap_ly là điều CỔNG GHI vào lay_luc, có thể chậm hơn luật hiện hành.';
COMMENT ON TABLE public.danh_muc_to_khai IS
  'Danh mục mẫu tờ khai trên cổng dịch vụ công thuế (công khai). Một mã có thể có nhiều bản theo văn bản khác nhau.';

INSERT INTO public.danh_muc_to_khai (gia_tri_cong, ma, ten, van_ban, nguon, lay_luc)
SELECT x.gia_tri, x.ma, x.ten, x.van_ban, 'https://dichvucong.gdt.gov.vn/tthc/homelogin/tthc', '{lay_luc}'::timestamptz
FROM jsonb_to_recordset($du_lieu${json.dumps(tk, ensure_ascii=False)}$du_lieu$::jsonb)
  AS x(gia_tri text, ma text, ten text, van_ban text)
ON CONFLICT (gia_tri_cong) DO UPDATE SET ma = EXCLUDED.ma, ten = EXCLUDED.ten, van_ban = EXCLUDED.van_ban, lay_luc = EXCLUDED.lay_luc;

INSERT INTO public.thu_tuc_thue (ma, ten, cap_thuc_hien, doi_tuong, co_quan, trinh_tu, cach_thuc, thanh_phan_ho_so, ket_qua, dieu_kien, can_cu_phap_ly, mau_to_khai, nguon, lay_luc, tim)
SELECT x.ma, x.ten, x.cap_thuc_hien, x.doi_tuong, x.co_quan, x.trinh_tu, x.cach_thuc, x.thanh_phan_ho_so, x.ket_qua, x.dieu_kien, x.can_cu_phap_ly,
       coalesce(ARRAY(SELECT jsonb_array_elements_text(x.mau_to_khai)), '{{}}'), x.nguon, '{lay_luc}'::timestamptz,
       to_tsvector('simple', coalesce(x.ten, '') || ' ' || coalesce((SELECT string_agg(v, ' ') FROM jsonb_array_elements_text(x.mau_to_khai) v), '') || ' ' || coalesce(x.doi_tuong, ''))
FROM jsonb_to_recordset($du_lieu${json.dumps(thu_tuc, ensure_ascii=False)}$du_lieu$::jsonb)
  AS x(ma text, ten text, cap_thuc_hien text, doi_tuong text, co_quan text, trinh_tu text, cach_thuc text,
       thanh_phan_ho_so text, ket_qua text, dieu_kien text, can_cu_phap_ly text, mau_to_khai jsonb, nguon text)
ON CONFLICT (ma) DO UPDATE SET ten = EXCLUDED.ten, thanh_phan_ho_so = EXCLUDED.thanh_phan_ho_so, can_cu_phap_ly = EXCLUDED.can_cu_phap_ly,
  mau_to_khai = EXCLUDED.mau_to_khai, lay_luc = EXCLUDED.lay_luc, tim = EXCLUDED.tim;
"""
open(RA, 'w', encoding='utf-8', newline='\n').write(sql)
print('ok', len(sql), 'ky tu,', len(tk), 'to khai,', len(thu_tuc), 'thu tuc')
