import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import QuanLyTaiNguyen from '@/components/tai-nguyen/QuanLyTaiNguyen';

/*
 * Trang quản trị.
 *
 * Trước 21/09/2026 trang này hiện bốn ô số (người dùng, "Active loans ₫12.4 tỷ", doanh thu
 * tháng), một phễu chuyển đổi và biểu đồ ngành — toàn bộ là số viết tay, không đọc từ đâu, và
 * có cả khoản vay dù MIMI đã bỏ mọi lời hứa cho vay từ 17/08/2026. Đã bỏ. Chỗ đó giờ là việc
 * admin thật sự làm: đăng bài Tài nguyên. Số liệu vận hành chỉ quay lại khi có truy vấn thật.
 */

export default function AdminPage() {
  /**
   * Access is decided by `profiles.role`, read from the database.
   *
   * This page used to compare a typed string against the literal 'mimi2025'
   * held in the component. That string was compiled into the JavaScript bundle
   * and served to every visitor of the site, so the lock published its own key.
   * The role lives server-side, RLS lets a user read only their own profile,
   * and a user cannot raise their own role — the UPDATE policy on `profiles`
   * pins `role` to its current value.
   *
   * The real protection for anything sensitive belongs on the data, not here:
   * this check controls what is rendered, and the queries behind it must be
   * scoped on their own.
   */
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setState('denied');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!cancelled) setState(data?.role === 'admin' ? 'allowed' : 'denied');
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={28} />
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="card-base p-6 w-full max-w-sm text-center">
          <h2 className="font-display font-bold text-xl text-foreground mb-2">Không có quyền truy cập</h2>
          <p className="text-sm text-muted-foreground">
            Trang này chỉ dành cho tài khoản quản trị. Đăng nhập bằng tài khoản có
            quyền admin để tiếp tục.
          </p>
          <Link to="/" className="inline-block mt-4 text-sm text-primary hover:underline">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="font-display font-extrabold text-2xl text-foreground">Quản trị</h1>
        <QuanLyTaiNguyen />
      </div>
    </div>
  );
}
