-- Sổ ghi dự đoán về thị trường, để chấm điểm sau.
--
-- VÌ SAO CẦN: mọi kịch bản kinh tế đều nghe hợp lý lúc đọc. Không ghi lại trước
-- rồi đối chiếu sau thì không có cách nào biết một mô hình dự đoán — MiroFish
-- hay bất kỳ thứ gì khác — có hơn việc đoán bừa hay không. Nó chỉ sinh ra văn
-- bản thuyết phục, và văn bản thuyết phục là thứ repo này đã phải gỡ nhiều lần.
--
-- Logic chấm điểm nằm ở `src/lib/predictions.ts`, có 20 test. Bảng này chỉ lưu.
--
-- KHÔNG PHẢI DỮ LIỆU CỦA KHÁCH HÀNG. Đây là sổ nội bộ về chất lượng dự đoán,
-- không gắn với `company_id` nào và không hiện trong ứng dụng. Đó cũng là ranh
-- giới pháp lý: hiển thị dự báo thị trường cho người dùng là chuyện khác hẳn,
-- cần giấy phép mà CLI NUTRIX không có.

CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /*
   * Phát biểu phải kiểm chứng được. "Thị trường sẽ biến động" thì đúng trong
   * mọi trường hợp nên vô dụng — `laPhatBieuKiemChungDuoc()` chặn loại đó trước
   * khi ghi vào đây.
   */
  claim text NOT NULL,

  /* Xác suất tự nhận, 0–1. 0,5 nghĩa là không biết gì. */
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  /*
   * Ngày phải đối chiếu, quyết định TRƯỚC khi biết kết quả.
   *
   * Có mốc cứng thì không lảng tránh được. Không có nó, một dự đoán sai luôn có
   * thể được cứu bằng câu "chưa tới lúc" — và cứu mãi thì sổ này vô nghĩa.
   */
  resolve_on date NOT NULL,

  /*
   * Nguồn sinh ra dự đoán. Để so được các nguồn với nhau: mô phỏng có hơn suy
   * luận bằng quy tắc không, và cả hai có hơn phỏng đoán của người không.
   */
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'rule', 'mirofish', 'llm')),

  /* Tin đã dùng làm mầm, nếu có. Để truy ngược xem dự đoán dựa trên gì. */
  seed_news_id uuid REFERENCES public.macro_news(id) ON DELETE SET NULL,

  /*
   * `unresolvable` là trạng thái thật, không phải chỗ trốn: có những dự đoán tới
   * hạn mà thực tế không cho câu trả lời rõ ràng. Nhưng nó KHÔNG được tính vào
   * điểm — `daKetLuan()` chỉ nhận `correct` và `wrong`. Nếu tính, mọi dự đoán sai
   * sẽ dần được đánh lại thành `unresolvable` và điểm số đẹp lên một cách giả tạo.
   */
  outcome text NOT NULL DEFAULT 'pending'
    CHECK (outcome IN ('pending', 'correct', 'wrong', 'unresolvable')),

  resolved_at timestamptz,
  /* Bằng chứng khi kết luận: đường dẫn bài báo, số liệu công bố. */
  resolved_note text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cột này quét bằng cron/tay để tìm dự đoán đã tới hạn mà chưa ai chấm.
CREATE INDEX IF NOT EXISTS predictions_den_han_idx
  ON public.predictions (resolve_on)
  WHERE outcome = 'pending';

ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

/*
 * KHÔNG có chính sách nào cho `authenticated`.
 *
 * Bảng này chỉ truy cập được bằng service role, tức là qua edge function hoặc
 * công cụ quản trị. Người dùng ứng dụng không đọc, không ghi — vừa vì đây là sổ
 * nội bộ, vừa vì để lộ dự báo thị trường ra giao diện là bước sang lãnh địa tư
 * vấn đầu tư có điều kiện.
 */

COMMENT ON TABLE public.predictions IS
  'Sổ nội bộ chấm điểm dự đoán thị trường. Không thuộc về công ty khách hàng nào, không hiển thị trong ứng dụng.';
