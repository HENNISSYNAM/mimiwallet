-- Cái tối thiểu để biết ra mắt có tín hiệu tốt hay không.
--
-- Hiện không có một dòng đo lường nào. Ra mắt như vậy thì "phản hồi tốt" là
-- thứ không kiểm chứng được: không phân biệt nổi "người ta dùng" với "người ta
-- thử một lần rồi bỏ", và cũng không biết họ rụng ở bước nào.
--
-- Cố ý KHÔNG dùng dịch vụ analytics bên thứ ba. Đây là ứng dụng đọc sao kê
-- ngân hàng; gắn thêm một SDK bên ngoài là mở thêm một đường dữ liệu người dùng
-- đi ra khỏi hệ thống, đổi lấy vài biểu đồ. Một bảng trong chính DB này trả lời
-- được những câu cần trả lời mà không phải đánh đổi gì.
--
-- Quy tắc: chỉ ghi TÊN sự kiện và bối cảnh không định danh. Không số tiền,
-- không số tài khoản, không mã số thuế, không nội dung giao dịch. Nếu một
-- trường nào đó có thể nhận dạng người hoặc tiền của họ thì nó không thuộc bảng
-- này — cột `props` là jsonb nên rất dễ tuồn thứ không nên vào, và chốt duy
-- nhất là kỷ luật ở chỗ gọi.

CREATE TABLE IF NOT EXISTS public.product_events (
  id bigserial PRIMARY KEY,
  -- Ai, để đếm được người dùng hoạt động. Xoá tài khoản thì sự kiện đi theo.
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Ví dụ: 'signup', 'bank_link_started', 'bank_link_succeeded',
  -- 'threshold_viewed', 'qr_created', 'invoice_created'.
  name text NOT NULL,
  -- Bối cảnh không định danh: {"step":"consent"}, {"feature":"qrpay"}.
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_events_name_time_idx
  ON public.product_events (name, created_at DESC);
CREATE INDEX IF NOT EXISTS product_events_user_time_idx
  ON public.product_events (user_id, created_at DESC);

ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY;

-- Ghi được sự kiện của chính mình, và chỉ vậy.
CREATE POLICY "Users log their own events"
  ON public.product_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Không có policy SELECT. Không ai đọc qua REST — kể cả chính chủ, vì không có
-- màn hình nào cần. Phân tích chạy trong SQL editor bằng quyền admin.

COMMENT ON TABLE public.product_events IS
  'Đo lường sản phẩm, tự lưu. Chỉ tên sự kiện và bối cảnh không định danh — không tiền, không số tài khoản, không mã số thuế.';
