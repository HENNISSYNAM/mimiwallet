import { useState } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Đăng xuất khỏi mọi thiết bị (27/09/2026). Thay hai nút "xác thực 2 lớp" và "quản lý thiết bị" chỉ
 * hiện "sẽ ra mắt sớm". Việc này có thật ở máy chủ: `signOut({ scope: 'global' })` thu hồi MỌI phiên
 * làm mới của tài khoản, nên máy khác không gia hạn được phiên nữa.
 *
 * Nói đúng giới hạn: mã truy cập đã cấp cho máy khác vẫn còn hạn tới khi hết (mặc định 1 giờ) —
 * không hứa "đăng xuất ngay lập tức".
 */
export function DangXuatMoiThietBi({ sauKhiXong }: { sauKhiXong: () => void }) {
  const [hoi, setHoi] = useState(false);
  const [dang, setDang] = useState(false);

  const lam = async () => {
    setDang(true);
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setDang(false);
    if (error) {
      toast.error(`Chưa đăng xuất được: ${error.message}. Thử lại sau ít phút.`);
      return;
    }
    toast.success('Đã đăng xuất khỏi mọi thiết bị.');
    sauKhiXong();
  };

  if (!hoi) {
    return (
      <button
        onClick={() => setHoi(true)}
        className="w-full flex items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Đăng xuất khỏi mọi thiết bị
        <ChevronRight size={14} />
      </button>
    );
  }

  return (
    <div role="group" aria-label="Xác nhận đăng xuất khỏi mọi thiết bị" className="rounded-xl border border-border bg-accent/40 p-4 my-2 text-sm">
      <p className="text-foreground font-medium">Đăng xuất khỏi mọi thiết bị, kể cả máy này?</p>
      <p className="text-muted-foreground mt-1">
        Dùng khi bạn mất máy hoặc nghi có người khác vào tài khoản. Máy khác sẽ bị đăng xuất chậm nhất trong khoảng 1 giờ.
      </p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={lam}
          disabled={dang}
          className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-destructive-foreground font-medium disabled:opacity-60"
        >
          {dang && <Loader2 size={14} className="animate-spin" />} Đăng xuất hết
        </button>
        <button onClick={() => setHoi(false)} disabled={dang} className="rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground">
          Huỷ
        </button>
      </div>
    </div>
  );
}
