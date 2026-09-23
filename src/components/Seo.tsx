import { useEffect } from 'react';
import { SITE_URL } from '@/lib/env';

/**
 * Đặt <title>, description, canonical và thẻ og cho từng route.
 *
 * VÌ SAO TỰ ĐẶT CHỨ KHÔNG DÙNG `react-helmet-async`. Bản trước bọc mọi thứ
 * trong `<Helmet>`. Đo ngày 23/09/2026 trên trang mở TRỰC TIẾP (không điều
 * hướng trong app) — ví dụ gõ thẳng `/dashboard` hoặc mở từ link chia sẻ:
 *
 *     document.title                          → vẫn là tiêu đề cũ của index.html
 *     head có 26 thẻ, không thẻ nào của Helmet
 *     link[rel=canonical]                     → không có
 *     meta[property="og:url"]                 → không có
 *     meta[name=robots]                       → KHÔNG CÓ
 *
 * trong khi nội dung trang đã hiện đầy đủ. Helmet chỉ chèn sau khi điều hướng
 * trong app, không chèn ở lần commit đầu bên trong Suspense. Ba hậu quả:
 *
 *   1. `noIndex` không bao giờ tới được trình thu thập, nên các trang sau đăng
 *      nhập có thể bị lập chỉ mục. Đây là lý do nặng nhất.
 *   2. Mọi link dán lên Zalo/Facebook đều lấy thẻ mặc định của index.html.
 *   3. `start_url` của manifest là `/dashboard/tro-ly`, tức app cài từ Play mở
 *      ra là đi đúng đường tải trực tiếp này.
 *
 * Một `useEffect` đặt thẳng vào `document.head` thì chạy ở cả hai đường, không
 * phụ thuộc thời điểm commit của thư viện, và kiểm được bằng jsdom.
 */

type Props = {
  title: string;
  description: string;
  /** Đường dẫn route, ví dụ "/dashboard". Dùng cho canonical + og:url. */
  path: string;
  /** Trang sau đăng nhập không nên nằm trong chỉ mục tìm kiếm. */
  noIndex?: boolean;
};

/** Tìm thẻ theo bộ chọn, không có thì tạo mới với các thuộc tính khoá. */
function theHead(chon: string, tao: () => HTMLElement): HTMLElement {
  const co = document.head.querySelector<HTMLElement>(chon);
  if (co) return co;
  const moi = tao();
  document.head.appendChild(moi);
  return moi;
}

function datMeta(khoa: 'name' | 'property', ten: string, noiDung: string) {
  const el = theHead(`meta[${khoa}="${ten}"]`, () => {
    const m = document.createElement('meta');
    m.setAttribute(khoa, ten);
    return m;
  });
  el.setAttribute('content', noiDung);
}

export default function Seo({ title, description, path, noIndex }: Props) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;

    document.title = title;
    datMeta('name', 'description', description);
    datMeta('property', 'og:title', title);
    datMeta('property', 'og:description', description);
    datMeta('property', 'og:url', url);
    datMeta('property', 'og:type', 'website');
    datMeta('name', 'twitter:title', title);
    datMeta('name', 'twitter:description', description);

    const canonical = theHead('link[rel="canonical"]', () => {
      const l = document.createElement('link');
      l.setAttribute('rel', 'canonical');
      return l;
    });
    canonical.setAttribute('href', url);

    /*
     * `robots` phải bị GỠ khi trang không còn noIndex, không chỉ ghi đè. Các
     * thẻ trên luôn có giá trị mới nên ghi đè là đủ; thẻ này thì có hoặc không,
     * và một trang công khai mang lại `noindex` của trang trước sẽ biến mất
     * khỏi kết quả tìm kiếm mà không ai biết.
     */
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noIndex) {
      datMeta('name', 'robots', 'noindex, nofollow');
    } else if (robots) {
      robots.remove();
    }
  }, [title, description, path, noIndex]);

  return null;
}
