import { createElement, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Câu tuyên bố cỡ lớn — giọng thứ ba của hệ chữ.
 *
 * VÌ SAO LÀ MỘT COMPONENT CHỨ KHÔNG PHẢI MẤY CLASS TIỆN TAY: luật của giọng này
 * là luật *cấm*, và một luật cấm gõ tay ở 20 chỗ thì 20 chỗ đó sẽ trôi. Đặt ở
 * đây thì `font-bold` không lọt vào được, vì không có đường nào truyền nó vào.
 *
 * BA GIỌNG, KHÔNG PHẢI MỘT:
 *
 *   serif (Playfair)      câu cảm xúc, CHỈ cỡ lớn — hero, mở đầu mục
 *   sans  (Inter)         mọi thứ thuộc giao diện — nút, nhãn, tiêu đề thẻ
 *   mono  (JetBrains)     số liệu và nhãn viết hoa cỡ nhỏ
 *
 * `font-display` trong dự án này *vẫn là Inter* và vẫn đúng — nó là giọng UI,
 * đang dùng ở 105 chỗ với đủ cỡ xuống tới `text-sm`. Đổi nó thành serif là đặt
 * Playfair lên nhãn 14px, vừa xấu vừa khó đọc. Nên giọng serif là giọng *thêm*,
 * không phải giọng *thay*.
 *
 * ĐỘ ĐẬM DỪNG Ở 500. Sức nặng của kiểu chữ này đến từ khoảng lặng, không từ nét
 * đậm — chữ mảnh ở cỡ 80px đọc ra vẻ tự tin, chữ extrabold ở cùng cỡ đọc ra vẻ
 * đang hét. Hiện trạng đang là `font-extrabold` ở mọi tiêu đề mục.
 *
 * DÒNG CAO HƠN SÁCH MẪU, VÀ CÓ LÝ DO. Sách mẫu Origin để line-height 0.9 cho
 * cỡ 96px. Con số đó đúng với tiếng Anh và SAI với tiếng Việt: "ế" "ộ" "ữ" chồng
 * hai dấu lên nhau, vượt hẳn trên chiều cao chữ hoa, nên ở 0.9 dấu của dòng dưới
 * đâm vào đuôi chữ dòng trên. Giữ *nguyên tắc* (dòng chặt tạo sức nén) và bỏ
 * *con số* — 1.0 cho hero, 1.05 cho tiêu đề mục.
 */

type Size = 'hero' | 'section' | 'card';

/**
 * Lớp CSS của từng cỡ, xuất ra ngoài để các phần tử `motion.*` dùng được.
 *
 * Không phải chỗ nào cũng bọc được bằng `<Display>`: tiêu đề hero là
 * `motion.h1` và cần giữ nguyên props hoạt ảnh. Xuất bảng cỡ ra là cách để
 * những chỗ đó vẫn ăn cùng một luật, thay vì gõ lại `clamp()` bằng tay rồi
 * trôi mỗi nơi một kiểu.
 */
export const CO_CHU: Record<Size, string> = {
  // clamp để không phải nuôi bốn breakpoint cho mỗi tiêu đề.
  hero: 'text-[clamp(2.5rem,6.5vw,5.5rem)] leading-[1.0] tracking-[-0.02em]',
  section: 'text-[clamp(1.75rem,3.6vw,2.75rem)] leading-[1.05] tracking-[-0.015em]',
  card: 'text-[clamp(1.375rem,2vw,1.75rem)] leading-[1.15] tracking-[-0.01em]',
};

type Props = {
  children: ReactNode;
  size?: Size;
  /** Thẻ HTML — mặc định h2, hero thường là h1. Cỡ chữ không quyết định cấp đề mục. */
  as?: 'h1' | 'h2' | 'h3' | 'p';
  /** 500 thay vì 400. Không có đường nào lên đậm hơn, và đó là chủ ý. */
  medium?: boolean;
  className?: string;
};

export default function Display({
  children,
  size = 'section',
  as = 'h2',
  medium = false,
  className,
}: Props) {
  return createElement(
    as,
    {
      className: cn(
        'font-serif text-balance',
        medium ? 'font-medium' : 'font-normal',
        CO_CHU[size],
        className,
      ),
    },
    children,
  );
}

/**
 * Một từ nghiêng đặt giữa câu đứng.
 *
 * Đây là thủ pháp của Origin: "Own", "Simplify" nghiêng giữa dòng roman, tạo
 * một điểm nhấn trong cùng một câu mà không cần đổi màu hay đổi cỡ. Ở tiếng Việt
 * nó ăn hơn tiếng Anh vì Playfair italic có bụng chữ hẹp hơn, nên cụm nghiêng tự
 * co lại và tách khỏi phần còn lại mà không cần thêm gì.
 *
 * Dùng thẻ <em> thật để trình đọc màn hình cũng nghe thấy nhấn mạnh, chứ không
 * phải <span class="italic"> vốn chỉ nghiêng bằng mắt.
 */
export function Nhan({ children }: { children: ReactNode }) {
  return <em className="italic">{children}</em>;
}
