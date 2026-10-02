import { useMemo } from 'react';
import { ManHinhChoVideo } from '@/components/landing/ManHinhChoDemo';
import { khongKhi } from '@/lib/khongKhi';

/**
 * Màn hình chờ — dùng chung một video cho mọi lúc phải chờ (30/09/2026, theo yêu cầu chủ sản phẩm). Câu chào vẫn
 * đổi theo giờ (`lib/khongKhi.ts`): người mở lúc 7h sáng và lúc 11h đêm thấy hai lời khác nhau trên cùng một biển mây.
 * Tính một lần cho mỗi lần gắn — màn chờ chỉ sống vài trăm mili giây.
 */
export default function ManHinhCho() {
  const kk = useMemo(() => khongKhi(), []);
  return <ManHinhChoVideo chinh={kk.cau} phuLen={false} />;
}
