import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';
import mimiLogo from '@/assets/mimi-cat.png';

/**
 * Quên mật khẩu — nửa đầu của luồng khôi phục.
 *
 * TRƯỚC KHI CÓ TRANG NÀY, ỨNG DỤNG KHÔNG CÓ ĐƯỜNG KHÔI PHỤC NÀO. Chỉ có "Đổi mật
 * khẩu" trong Cài đặt, mà muốn vào Cài đặt thì phải đăng nhập được đã. Ai quên
 * mật khẩu là mất tài khoản vĩnh viễn — cùng với toàn bộ dữ liệu ngân hàng đã
 * liên kết.
 *
 * KHÔNG BAO GIỜ NÓI EMAIL CÓ TỒN TẠI HAY KHÔNG.
 *
 * Màn hình này hiện đúng một câu cho mọi trường hợp: "nếu email có trong hệ
 * thống, thư đã được gửi". Nói "email này chưa đăng ký" là biến ô nhập thành
 * công cụ dò: người lạ gõ thử một danh sách email và biết ai là khách hàng của
 * MIMI. Với sản phẩm tài chính, riêng việc lộ "ai là khách" đã là rò rỉ.
 *
 * Vì lý do đó, lỗi từ Supabase cũng không hiển thị nguyên văn.
 */
export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [daGui, setDaGui] = useState(false);

  const gui = async () => {
    if (!email.trim()) return;
    setDangGui(true);
    /*
     * Bỏ qua giá trị `error` có chủ ý — xem ghi chú đầu file. Vẫn ghi log để
     * người vận hành thấy được sự cố thật (SMTP hỏng chẳng hạn), nhưng người
     * dùng luôn nhận cùng một câu trả lời.
     */
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/dat-lai-mat-khau`,
    });
    if (error) console.error('resetPasswordForEmail:', error.message);
    setDangGui(false);
    setDaGui(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-5 safe-top safe-bottom">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img src={mimiLogo} alt="" aria-hidden className="h-14 w-14 mb-3" />
          <h1 className="font-display font-bold text-2xl text-foreground">{t('ui2.auth.quenMk')}</h1>
        </div>

        {daGui ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <MailCheck className="w-8 h-8 text-mimi-green mx-auto" />
            <p className="mt-3 text-sm text-foreground font-medium">{t('ui2.auth.daGuiThu')}</p>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {t('ui2.auth.neuEmail', { email: email.trim() })}
            </p>
            <button
              onClick={() => { setDaGui(false); setEmail(''); }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              {t('ui2.auth.guiEmailKhac')}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {t('ui2.auth.nhapEmail')}
            </p>
            <label className="text-sm text-muted-foreground mb-1 block" htmlFor="fp-email">
              Email
            </label>
            <input
              id="fp-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void gui(); }}
              placeholder="email@congty.vn"
              className="w-full h-11 px-3 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => void gui()}
              disabled={!email.trim() || dangGui}
              className="mt-4 w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 inline-flex items-center justify-center gap-2 tap-target"
            >
              {dangGui && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('ui2.auth.guiThu')}
            </button>
          </div>
        )}

        <Link
          to="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" /> {t('ui2.auth.quayLai')}
        </Link>
      </motion.div>
    </div>
  );
}
