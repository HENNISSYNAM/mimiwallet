import { useMemo } from 'react';
import MimiCat from './MimiCat';
import { khongKhi } from '@/lib/khongKhi';

/**
 * Màn hình chờ.
 *
 * Trước đây là một cái favicon 40px nhấp nháy trên nền trơn. Nó không sai, chỉ
 * là một khoảnh khắc bị bỏ phí: đây là thứ người dùng nhìn mỗi lần mở app, và
 * với một app thuế thì đó là đúng lúc họ đang căng nhất.
 *
 * Khung cảnh đổi theo giờ (`lib/khongKhi.ts`) nên người mở lúc 7h sáng và người
 * mở lúc 11h đêm thấy hai bầu trời khác nhau — và cả hai đều thấy MIMI đang làm
 * đúng việc hợp giờ đó. Đây là chi tiết không ai yêu cầu và cũng không ai nói ra
 * khi thấy, nhưng nó là thứ tạo cảm giác app "sống".
 *
 * Bầu trời là gradient CSS, không phải ảnh: vài KB, không có cú nháy lúc tải, và
 * không mang rủi ro bản quyền nào vào một sản phẩm sắp nộp App Store.
 */
export default function ManHinhCho() {
  // Tính một lần cho mỗi lần gắn. Màn hình chờ sống vài trăm mili giây — nếu
  // cho nó tự cập nhật theo đồng hồ thì chỉ tốn thêm một bộ đếm không ai thấy.
  const kk = useMemo(() => khongKhi(), []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-6"
      style={{ background: kk.troi }}
    >
      {/* `live` để cô ấy vẫn nháy mắt trong lúc chờ — trừ lúc khuya, vì pose
          `sleep` đã tự đứng ngoài vòng nháy (mèo đang ngủ mà chớp mắt thì hết
          ngủ). Quầng ngọc bích giữ lại: nền ở đây là bầu trời, và quầng đó là
          thứ tách được cái đầu cam khỏi nó. */}
      <MimiCat variant="live" pose={kk.pose} className="w-28" tilt={6} />

      <p
        className="text-sm font-medium text-center"
        style={{ color: kk.toi ? 'hsl(0 0% 100% / 0.82)' : 'hsl(220 8% 22%)' }}
      >
        {kk.cau}
      </p>
    </div>
  );
}
