import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { congTyDangDung, SU_KIEN_DOI_CONG_TY } from '@/lib/congTyDangDung';

/**
 * Dải nhãn đầu mọi trang khi đang xem công ty minh hoạ của tài khoản demo.
 *
 * Demo giờ hiện đủ sổ sách 12 tháng — thứ dễ bị đọc nhầm là số liệu của một cửa hàng có thật. Nhãn
 * này nói một lần, ở chỗ luôn nhìn thấy, thay vì gắn chữ "demo" vào từng dòng. Công ty thật không
 * bao giờ thấy nó: cờ `la_demo` do máy chủ đặt, trình duyệt không sửa được.
 */
export function NhanMinhHoa() {
  const [laDemo, setLaDemo] = useState(false);

  useEffect(() => {
    let huy = false;
    const doc = async () => {
      const ct = await congTyDangDung().catch(() => null);
      if (!huy) setLaDemo(ct?.la_demo === true);
    };
    void doc();
    window.addEventListener(SU_KIEN_DOI_CONG_TY, doc);
    return () => { huy = true; window.removeEventListener(SU_KIEN_DOI_CONG_TY, doc); };
  }, []);

  if (!laDemo) return null;
  return (
    <div role="note" className="mb-4 flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground">
      <FlaskConical size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
      <p>
        <span className="font-medium">Cửa hàng minh hoạ.</span>{' '}
        <span className="text-muted-foreground">Mọi con số ở đây là dữ liệu mẫu của một cửa hàng hư cấu, không phải của doanh nghiệp nào. Dữ liệu tự làm mới mỗi đêm.</span>
      </p>
    </div>
  );
}
