import { Navigate, useLocation } from 'react-router-dom';
import { DUONG_TRO_LY } from '@/lib/nguCanhModule';

/**
 * `/dashboard/tro-ly` → `/dashboard` (29/09/2026): Không gian MIMI Trợ lý giờ là trang chính. Giữ nguyên truy vấn
 * (`?hoi=…` từ công cụ, cảnh báo bất thường) và state (kết quả pet mang theo) — mọi đường dẫn cũ vẫn chạy.
 */
export default function ChuyenVeKhongGian() {
  const { search, state, hash } = useLocation();
  return <Navigate to={`${DUONG_TRO_LY}${search}${hash}`} replace state={state} />;
}
