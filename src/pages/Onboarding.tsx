import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Mail } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useAuthStore } from '@/store/useAuthStore';
import MimiCat from '@/components/brand/MimiCat';
import { duoiEmailCongTy, ghiDichSauDangNhap, laEmail } from '@/lib/sauDangNhap';

/**
 * Đăng ký MIMI: một ô email, không mật khẩu (15/09/2026).
 *
 * Người dùng dặn: "đăng kí thì chỉ cần người ta dùng mail đuôi công ty là xong, không cần
 * đăng kí lằng nhằng". Bản cũ có hai bước — họ tên, điện thoại, mật khẩu, nhập lại mật
 * khẩu, rồi tên công ty, mã số thuế, ngành, tỉnh, doanh thu, số nhân viên. Mỗi ô là một
 * chỗ chủ doanh nghiệp bỏ cuộc, và không ô nào cần cho lần mở app đầu tiên.
 *
 * Giờ: nhập email → MIMI gửi link → bấm link là vào (Supabase tạo tài khoản ở lần bấm đầu,
 * trigger `create_default_company` đặt tên công ty theo đuôi email). Mã số thuế, ngân hàng
 * bổ sung sau, đúng lúc cần — trợ lý nhắc.
 */

function dichLoi(loi: string): string {
  const l = loi.toLowerCase();
  if (l.includes('rate limit') || l.includes('security purposes') || l.includes('seconds')) {
    return i18n.t('ui2.dangKy.loiNhieu');
  }
  if (l.includes('signups not allowed') || l.includes('signup is disabled')) {
    return i18n.t('ui2.dangKy.loiMoi', { email: 'hoc.qk2@gmail.com' });
  }
  if (l.includes('invalid') && l.includes('email')) return i18n.t('ui2.dangKy.emailSai');
  return i18n.t('ui2.dangKy.chuaGui', { loi });
}

const GIAY_CHO_GUI_LAI = 60;

export default function Onboarding() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const signInWithEmailLink = useAuthStore((s) => s.signInWithEmailLink);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  // Từ khu "Mở tài khoản" ở trang chủ: /register?email=…&cong_ty=…
  const [thamSo] = useSearchParams();
  const [email, setEmail] = useState(() => (thamSo.get('email') ?? '').slice(0, 320));
  const [dangGui, setDangGui] = useState(false);
  const [daGuiToi, setDaGuiToi] = useState<string | null>(null);
  const [choGuiLai, setChoGuiLai] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    if (choGuiLai <= 0) return;
    const t = setTimeout(() => setChoGuiLai((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [choGuiLai]);

  if (isAuthenticated) return <Navigate to="/dashboard/tro-ly" replace />;

  const duoi = duoiEmailCongTy(email);
  const emailCaNhan = laEmail(email) && !duoi;

  const gui = async (dich = email) => {
    setLoi(null);
    if (!laEmail(dich)) {
      setLoi(t('ui2.dangKy.emailSai'));
      return;
    }
    setDangGui(true);
    ghiDichSauDangNhap('/dashboard/tro-ly');
    const { error } = await signInWithEmailLink(dich);
    setDangGui(false);
    if (error) {
      setLoi(dichLoi(error));
      return;
    }
    setDaGuiToi(dich.trim());
    setChoGuiLai(GIAY_CHO_GUI_LAI);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-5 h-16 w-16">
          <MimiCat variant="live" glow="none" className="w-full" />
        </div>

        {daGuiToi ? (
          <section aria-labelledby="da-gui" className="rounded-2xl border border-border bg-card p-6 text-center">
            <Mail size={28} className="mx-auto text-primary" aria-hidden />
            <h1 id="da-gui" className="mt-3 font-display text-2xl font-semibold text-foreground">{t('ui2.dangKy.kiemHopThu')}</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <Trans i18nKey="ui2.dangKy.daGuiToi" values={{ email: daGuiToi }} components={{ b: <span className="break-all font-medium text-foreground" /> }} />
            </p>
            {loi && <p className="mt-3 text-sm text-destructive" role="alert">{loi}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => void gui(daGuiToi)}
                disabled={dangGui || choGuiLai > 0}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                {dangGui && <Loader2 size={15} className="animate-spin" />}
                {choGuiLai > 0 ? t('ui2.dangKy.guiLaiSau', { so: choGuiLai }) : t('ui2.dangKy.guiLaiLink')}
              </button>
              <button type="button" onClick={() => { setDaGuiToi(null); setLoi(null); }} className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                {t('ui2.dangKy.emailKhac')}
              </button>
            </div>

            {/*
              Lối vào thứ hai, đặt ngay tại đây vì thư tự động HAY BỊ chặn: nhiều hệ thống email
              công ty giữ lại thư có link đăng nhập. Người dùng không nhận được thư thì vẫn vào
              làm việc được bằng Google, không phải chờ.
            */}
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                {t('ui2.dangKy.cho2Phut')}
              </p>
              <button
                type="button"
                onClick={async () => {
                  ghiDichSauDangNhap('/dashboard/tro-ly');
                  const { error } = await signInWithGoogle();
                  if (error) setLoi(dichLoi(error));
                }}
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-accent"
              >
                {t('ui2.auth.google')}
              </button>
            </div>
          </section>
        ) : (
          <section aria-labelledby="dang-ky" className="rounded-2xl border border-border bg-card p-6">
            <h1 id="dang-ky" className="text-center font-display text-2xl font-semibold text-foreground">{t('ui2.dangKy.batDau')}</h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              {t('ui2.dangKy.chiCanEmail')}
            </p>

            <form onSubmit={(e) => { e.preventDefault(); void gui(); }} className="mt-6 space-y-3" noValidate>
              <div>
                <label htmlFor="email-dang-ky" className="mb-1 block text-sm font-medium text-foreground">{t('ui2.dangKy.emailCongTy')}</label>
                <input
                  id="email-dang-ky"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setLoi(null); }}
                  placeholder="ten@congty.vn"
                  aria-invalid={!!loi}
                  aria-describedby="goi-y-email"
                  className="h-12 w-full rounded-lg border border-border bg-background px-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p id="goi-y-email" className="mt-1.5 min-h-[1.25rem] text-xs text-muted-foreground">
                  {duoi
                    ? t('ui2.dangKy.tenCongTy', { ten: duoi })
                    : emailCaNhan
                      ? t('ui2.dangKy.emailCaNhan')
                      : ''}
                </p>
              </div>
              {loi && <p className="text-sm text-destructive" role="alert">{loi}</p>}
              <button
                type="submit"
                disabled={dangGui || !email.trim()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[15px] font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {dangGui ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} {t('ui2.dangKy.guiLink')}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
              <span className="h-px flex-1 bg-border" /> {t('ui2.auth.hoac')} <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={async () => {
                ghiDichSauDangNhap('/dashboard/tro-ly');
                const { error } = await signInWithGoogle();
                if (error) setLoi(dichLoi(error));
              }}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-accent"
            >
              {t('ui2.auth.google')}
            </button>

            <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              <Trans i18nKey="ui2.dangKy.dongY" components={{ dk: <Link to="/terms" className="underline underline-offset-2" />, bm: <Link to="/privacy" className="underline underline-offset-2" /> }} />
            </p>
          </section>
        )}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {t('ui2.dangKy.daCoTk')} <Link to="/login" className="font-medium text-foreground underline underline-offset-4">{t('ui2.dangKy.dangNhap')}</Link>
        </p>
      </div>
    </main>
  );
}
