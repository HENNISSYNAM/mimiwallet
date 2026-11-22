/**
 * Đường dẫn trực tiếp tới một workflow (/dashboard/space/:id) — cùng không gian một trang như khi mở từ chat chính.
 */
import { useNavigate, useParams } from 'react-router-dom';
import KhongGianQuyTrinh from '@/components/quy-trinh/KhongGianQuyTrinh';

export { soSanhHieuSuat, thoiGian } from '@/components/quy-trinh/KhongGianQuyTrinh';

export default function QuyTrinhPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  return <KhongGianQuyTrinh id={id} onDong={() => navigate('/dashboard/space')} />;
}
