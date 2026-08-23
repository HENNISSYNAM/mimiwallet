import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ShieldAlert } from 'lucide-react';
import mimiLogo from '@/assets/mimi-cat.webp';

/**
 * Đặt lại mật khẩu — nửa sau của luồng khôi phục.
 *
 * Người dùng tới đây bằng đường dẫn trong email. Supabase đổi đường dẫn đó thành
 * một phiên tạm và bắn sự kiện `PASSWORD_RECOVERY`.
 *
 * VÌ SAO PHẢI CHỜ SỰ KIỆN CHỨ KHÔNG HIỆN Ô NHẬP NGAY:
 *
 * `updateUser({ password })` chỉ chạy khi đã có phiên. Hiện ô nhập ngay lúc trang
 * vừa mở, trong khi Supabase còn đang xử lý mã trong URL, sẽ dẫn tới người dùng
 * gõ xong mật khẩu mới rồi nhận lỗi "Auth session missing" — không hiểu vì sao,
 * và mật khẩu vẫn nguyên như cũ.
 *
 * Nên trang có ba trạng thái rõ ràng: đang kiểm tra → nhập được → link hỏng.
 * Trạng thái thứ ba là thật và hay gặp: link khôi phục có hạn, và mở lại lần thứ
 * hai thì hết hiệu lực.
 */
type TrangThai = 'dang-kiem-tra' | 'san-sang' | 'link-hong';

/** Tối thiểu 8 ký tự — dài hơn mức 6 mà `ChangePasswordModal` đang dùng.
 *  Đây là màn hình khôi phục sau khi đã mất quyền truy cập một lần; hạ chuẩn ở
 *  đúng chỗ này là kỳ lạ. Hai chỗ nên gộp về một hằng số khi có dịp. */
const DO_DAI_TOI_THIEU = 8;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [trangThai, setTrangThai] = useState<TrangThai>('dang-kiem-tra');
  const [mk, setMk] = useState('');
  const [xacNhan, setXacNhan] = useState('');
  const [dangLuu, setDangLuu] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setTrangThai('san-sang');
    });

    // Phòng trường hợp phiên đã được dựng xong trước khi listener kịp gắn.
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setTrangThai('san-sang');
      else {
        /*
         * Cho Supabase một nhịp để xử lý mã trong URL. Hết nhịp mà vẫn chưa có
         * phiên thì link hỏng hoặc đã hết hạn — nói thẳng, đừng để người dùng
         * ngồi nhìn ô nhập không bao giờ hoạt động.
         */
        const t = setTimeout(() => {
          void supabase.auth.getSession().then(({ data: d2 }) => {
            setTrangThai(d2.session ? 'san-sang' : 'link-hong');
          });
        }, 2500);
        return () => clearTimeout(t);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const luu = async () => {
    if (mk.length < DO_DAI_TOI_THIEU) {
      toast.error(`Mật khẩu cần tối thiểu ${DO_DAI_TOI_THIEU} ký tự`);
      return;
    }
    if (mk !== xacNhan) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }
    setDangLuu(true);
    const { error } = await supabase.auth.updateUser({ password: mk });
    setDangLuu(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Đã đặt lại mật khẩu. Bạn đã được đăng nhập.');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5 safe-top safe-bottom">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={mimiLogo} alt="" aria-hidden className="h-14 w-14 mb-3" />
          <h1 className="font-display font-bold text-2xl text-foreground">Đặt lại mật khẩu</h1>
        </div>

        {trangThai === 'dang-kiem-tra' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-10">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra đường dẫn…
          </div>
        )}

        {trangThai === 'link-hong' && (
          <div className="rounded-2xl border border-mimi-amber/30 bg-mimi-amber/5 p-6 text-center">
            <ShieldAlert className="w-8 h-8 text-mimi-amber mx-auto" />
            <p className="mt-3 text-sm font-medium text-foreground">Đường dẫn không còn hiệu lực</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Link khôi phục có hạn sử dụng và chỉ dùng được một lần. Hãy yêu cầu một
              link mới.
            </p>
            <button
              onClick={() => navigate('/quen-mat-khau')}
              className="mt-4 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium tap-target"
            >
              Gửi lại thư khôi phục
            </button>
          </div>
        )}

        {trangThai === 'san-sang' && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="rp-new">
                Mật khẩu mới
              </label>
              <input
                id="rp-new" type="password" autoComplete="new-password"
                value={mk} onChange={(e) => setMk(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block" htmlFor="rp-confirm">
                Nhập lại mật khẩu mới
              </label>
              <input
                id="rp-confirm" type="password" autoComplete="new-password"
                value={xacNhan} onChange={(e) => setXacNhan(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void luu(); }}
                className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tối thiểu {DO_DAI_TOI_THIEU} ký tự.
            </p>
            <button
              onClick={() => void luu()}
              disabled={dangLuu}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2 tap-target"
            >
              {dangLuu && <Loader2 className="w-4 h-4 animate-spin" />}
              Đặt lại mật khẩu
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
