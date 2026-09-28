import { Link, useLocation } from 'react-router-dom';
import { PauseCircle, ShieldCheck } from 'lucide-react';
import { TRANG_DONG_BANG } from '@/lib/dongBang';

/** Trang của tính năng đã đóng băng (`lib/dongBang.ts`): nói rõ vì sao, và chỉ lối tới việc chính. */
export default function TamDungPage() {
  const { pathname } = useLocation();
  const tt = TRANG_DONG_BANG[pathname] ?? { ten: 'Tính năng này', ly_do: 'Tính năng này đang tạm dừng.' };
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <PauseCircle size={32} className="mx-auto text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold text-foreground">{tt.ten} đang tạm dừng</h1>
      <p className="mt-2 text-sm text-muted-foreground">{tt.ly_do}</p>
      <Link
        to="/dashboard/kiem-truoc-khi-chuyen"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        <ShieldCheck size={16} /> Kiểm tra một khoản trước khi chuyển
      </Link>
    </div>
  );
}
