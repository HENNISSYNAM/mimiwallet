import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Khu "Mở tài khoản" ở trang chủ.
 *
 * TRƯỚC 18/09/2026 KHU NÀY LÀ ĐƯỜNG CỤT. Nó ghi một dòng vào `waitlist` rồi hiện "Chúng tôi sẽ
 * liên hệ trong 24 giờ": không có email nào gửi cho người dùng, không có thông báo nào tới đội
 * MIMI, và người dùng vẫn đứng ở trang chủ. Lỗi ghi cũng bị bỏ qua — `.insert()` của Supabase
 * không ném lỗi, nên câu "Đã đăng ký thành công!" hiện ra được cả khi không lưu được gì.
 *
 * Giờ nút này đưa người dùng sang trang đăng ký (`/register`) với email đã nhập, nơi MIMI gửi link
 * đăng nhập thật. Tên công ty là tuỳ chọn và chỉ để lưu lại cho đội MIMI, không chặn bước tiếp.
 */

const LA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Chống bot (26/09/2026) — hai dấu hiệu rẻ mà bot đơn giản hầu như luôn để lộ:
 *   - ô bẫy `website` người thật không thấy, không tab tới được; bot điền mọi ô;
 *   - gửi dưới 1,5 giây sau khi trang hiện: người không gõ email nhanh vậy.
 * Bị nghi là bot thì KHÔNG ghi gì, nhưng vẫn đi tiếp như thường — không cho bot biết đã bị lọc.
 * Máy chủ còn một lớp nữa: ràng buộc email, email trùng, và chặn lũ toàn cục (migration 20260925180000).
 */
export const GIAY_TOI_THIEU = 1500;
export const laBot = (o: { bay: string; batDau: number; luc: number }) => o.bay.trim() !== '' || o.luc - o.batDau < GIAY_TOI_THIEU;

export default function MoTaiKhoan() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [congTy, setCongTy] = useState('');
  const [loi, setLoi] = useState<string | null>(null);
  const [dangDi, setDangDi] = useState(false);
  const [bay, setBay] = useState('');
  const batDau = useRef(Date.now());

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    const ct = congTy.trim();
    if (!LA_EMAIL.test(em)) {
      setLoi('Email chưa đúng, ví dụ ten@congty.vn.');
      return;
    }
    setLoi(null);
    setDangDi(true);
    // Lưu lại để đội MIMI biết ai đang thử; hỏng thì vẫn cho đi tiếp, không chặn người dùng.
    const p = new URLSearchParams(window.location.search);
    const nghiBot = laBot({ bay, batDau: batDau.current, luc: Date.now() });
    const { error } = nghiBot ? { error: null } : await supabase.from('waitlist').insert({
      email: em,
      company_name: ct || em.split('@')[1],
      utm_source: p.get('utm_source'),
      utm_medium: p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign'),
    });
    if (error) console.error('waitlist:', error.message);
    navigate(`/register?email=${encodeURIComponent(em)}${ct ? `&cong_ty=${encodeURIComponent(ct)}` : ''}`);
  };

  return (
    <>
      <form noValidate onSubmit={gui} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setLoi(null); }}
          aria-label="Email doanh nghiệp"
          placeholder="Email doanh nghiệp"
          className="w-full flex-1 rounded-xl border border-border bg-card px-5 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 sm:w-auto"
        />
        <input
          value={congTy}
          onChange={(e) => setCongTy(e.target.value)}
          aria-label="Tên công ty (không bắt buộc)"
          placeholder="Tên công ty (không bắt buộc)"
          className="w-full flex-1 rounded-xl border border-border bg-card px-5 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10 sm:w-auto"
        />
        {/* Ô bẫy bot: ngoài màn hình, không đọc bởi trình đọc màn hình, không tab tới. */}
        <input
          name="website" value={bay} onChange={(e) => setBay(e.target.value)}
          tabIndex={-1} autoComplete="off" aria-hidden="true"
          style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }}
        />
        <button
          type="submit"
          disabled={dangDi}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 font-display text-sm font-bold text-primary-foreground shadow-[0_8px_30px_hsla(225,100%,57%,0.25)] transition-all hover:shadow-[0_12px_40px_hsla(225,100%,57%,0.35)] disabled:opacity-60 sm:w-auto"
        >
          Bắt đầu ngay <ArrowRight size={14} />
        </button>
      </form>
      {loi && <p role="alert" className="mt-3 text-sm text-destructive">{loi}</p>}
      <p className="mt-4 text-sm text-muted-foreground">
        MIMI gửi một link vào email này — bấm link là vào làm việc, không cần mật khẩu.
      </p>
    </>
  );
}
