import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { ghiDichSauDangNhap } from '@/lib/sauDangNhap';
import { phanLoaiLoi, taiTruocGoogle, trinhDuyetNhung } from '@/lib/luongDangNhap';

/**
 * MỘT nút Google cho cả đăng nhập lẫn đăng ký (15/10/2026). Logic phân luồng ở `lib/luongDangNhap.ts`.
 *
 *  - Trình duyệt nhúng của Zalo/Facebook/…: Google chặn đăng nhập, nên thay vì để người dùng gặp trang lỗi của Google,
 *    hiện chỉ dẫn mở bằng Chrome/Safari kèm nút sao chép liên kết.
 *  - Tải trước khi rê chuột/chạm vào nút; "đang chuyển sang Google…" ngay khi bấm để không có khoảng chết.
 *  - Người tự huỷ ở Google thì không có lỗi gì để báo.
 */
export function NutGoogle({ dich = '/dashboard/tro-ly', className, ua }: {
  dich?: string;
  className?: string;
  /** Chỉ để kiểm thử. */
  ua?: string;
}) {
  const { t } = useTranslation();
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const [dang, setDang] = useState(false);
  const app = trinhDuyetNhung(ua);

  if (app) {
    return (
      <div role="alert" className="rounded-xl border border-mimi-amber/40 bg-mimi-amber/5 p-4 text-left">
        <p className="text-sm font-semibold text-foreground">{t('ui2.auth.googleNhungTieuDe')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t('ui2.auth.googleNhungMoTa', { app })}</p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              toast.success(t('ui2.auth.daSaoChepLienKet'));
            } catch {
              toast.error(window.location.href);
            }
          }}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent"
        >
          {t('ui2.auth.saoChepLienKet')}
        </button>
      </div>
    );
  }

  const bam = async () => {
    setDang(true);
    ghiDichSauDangNhap(dich);
    const { error } = await signInWithGoogle();
    // Chỉ chạy tới đây khi KHÔNG chuyển hướng được; thành công thì trình duyệt đã rời trang này.
    if (error) {
      setDang(false);
      const loai = phanLoaiLoi(error);
      if (loai === 'huy') return;
      toast.error(
        loai === 'mang' ? t('ui2.auth.loiGoogleMang')
          : loai === 'nhieu' ? t('ui2.auth.loiGoogleNhieu')
            : loai === 'khongMoDuoc' ? t('ui2.auth.loiGoogleKhongMo')
              : t('ui2.auth.loiGoogleKhac', { loi: error }),
      );
    }
  };

  return (
    <button
      type="button"
      onClick={() => void bam()}
      onPointerEnter={taiTruocGoogle}
      onFocus={taiTruocGoogle}
      onTouchStart={taiTruocGoogle}
      disabled={dang}
      className={className ?? 'flex w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60'}
    >
      {dang ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden>
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.1z" />
          <path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.4-9.1H4.3v5.7C7.9 41 15.4 46 24 46z" />
          <path fill="#FBBC05" d="M11.6 28.1c-.4-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.3A22 22 0 0 0 2 24c0 3.5.8 6.9 2.3 9.8l7.3-5.7z" />
          <path fill="#EA4335" d="M24 10.8c3.3 0 6.2 1.1 8.5 3.3l6.3-6.3C35 4.1 30 2 24 2 15.4 2 7.9 7 4.3 14.2l7.3 5.7c1.7-5.2 6.6-9.1 12.4-9.1z" />
        </svg>
      )}
      {dang ? t('ui2.auth.dangChuyenGoogle') : t('ui2.auth.google')}
    </button>
  );
}
