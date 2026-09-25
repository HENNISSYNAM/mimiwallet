-- Danh bạ khách có đường ghi từ app (25/09/2026). RLS đã chỉ cho chủ công ty ghi vào công ty mình;
-- ràng buộc dưới đây chặn phần còn lại ở MÁY CHỦ, không tin trình duyệt: tên rỗng, chuỗi dài bất
-- thường gửi thẳng vào API. NOT VALID: không đụng dòng cũ, chỉ áp cho dòng mới và dòng được sửa.
ALTER TABLE public.clients
  ADD CONSTRAINT clients_ten_hop_le CHECK (char_length(btrim(name)) BETWEEN 1 AND 200) NOT VALID,
  ADD CONSTRAINT clients_mst_hop_le CHECK (tax_code IS NULL OR tax_code ~ '^[0-9]{10}(-[0-9]{3})?$|^[0-9]{12}$') NOT VALID,
  ADD CONSTRAINT clients_do_dai CHECK (
    coalesce(char_length(address), 0) <= 500 AND coalesce(char_length(phone), 0) <= 30
    AND coalesce(char_length(email), 0) <= 254 AND coalesce(char_length(note), 0) <= 2000
  ) NOT VALID;
