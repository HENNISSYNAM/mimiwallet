import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, Phone, Play } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { CONTACT } from '@/config/company';
import { ManHinhChoDemo } from '@/components/landing/ManHinhChoDemo';
import { IconMeo } from '@/components/brand/IconMeo';
import { NutGoogle } from '@/components/auth/NutGoogle';
import Onboarding from './Onboarding';

/**
 * /register (15/10/2026, theo chủ sản phẩm): đăng ký tài khoản MỚI chỉ qua GOOGLE (một chạm, vào luôn); ai cũng xem được
 * BẢN DEMO; ai không có Google thì để lại liên hệ. Trước đó (06/10) trang này chỉ nhận liên hệ vì đăng ký đang đóng.
 *
 * Luật "chỉ Google tự mở tài khoản" nằm ở máy chủ (trigger chi_dang_ky_google trên auth.users), nên nút ở đây không phải
 * là hàng rào duy nhất. Người đã đăng nhập vẫn vào luồng cũ.
 */

const LA_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CHU: Record<string, Record<string, string>> = {
  vi: {
    tieuDe: 'Bắt đầu với MIMI',
    dan: 'Đăng ký mất vài giây bằng tài khoản Google. Muốn xem trước, vào bản demo với một cửa hàng mẫu.',
    googleTieuDe: 'Dùng MIMI cho sổ sách thật',
    googleMoTa: 'Một chạm bằng Google, không cần nhớ mật khẩu. Lần đầu vào, bạn đồng ý điều khoản và đi qua phần hướng dẫn ngắn.',
    demoTieuDe: 'Xem bản demo',
    demoMoTa: 'Vào ngay, không cần đăng ký. Mọi số liệu là dữ liệu mẫu.',
    demoNut: 'Vào bản demo',
    thatTieuDe: 'Chưa dùng Google?',
    thatMoTa: 'Để lại email và tên doanh nghiệp. MIMI liên hệ trong 1 ngày làm việc để hướng dẫn bạn.',
    email: 'Email doanh nghiệp',
    congTy: 'Tên doanh nghiệp hoặc hộ kinh doanh',
    gui: 'Gửi yêu cầu',
    daGui: 'Đã nhận yêu cầu. MIMI sẽ liên hệ với bạn sớm.',
    loiEmail: 'Email chưa đúng. Ví dụ: ten@congty.vn',
    loiGui: 'Chưa gửi được. Bạn liên hệ trực tiếp qua email hoặc điện thoại bên dưới nhé.',
    hoacLienHe: 'Hoặc liên hệ trực tiếp',
    daCoTaiKhoan: 'Đã có tài khoản?',
    dangNhap: 'Đăng nhập',
  },
  en: {
    tieuDe: 'Get started with MIMI',
    dan: 'Signing up takes seconds with your Google account. Want a look first? Open the demo with a sample shop.',
    googleTieuDe: 'Use MIMI for your real books',
    googleMoTa: 'One tap with Google, no password to remember. On your first visit you agree to the terms and take a short guided tour.',
    demoTieuDe: 'See the demo',
    demoMoTa: 'Jump straight in, no sign-up. All numbers are sample data.',
    demoNut: 'Open the demo',
    thatTieuDe: 'No Google account?',
    thatMoTa: 'Leave your email and business name. MIMI will contact you within 1 business day to help you get started.',
    email: 'Business email',
    congTy: 'Business name',
    gui: 'Send request',
    daGui: 'Request received. MIMI will be in touch soon.',
    loiEmail: 'That email does not look right. Example: name@company.com',
    loiGui: 'Could not send. Please contact us directly by email or phone below.',
    hoacLienHe: 'Or contact us directly',
    daCoTaiKhoan: 'Already have an account?',
    dangNhap: 'Log in',
  },
  ko: {
    tieuDe: 'MIMI 시작하기',
    dan: 'Google 계정으로 몇 초 만에 가입할 수 있습니다. 먼저 보고 싶다면 샘플 가게 데모를 열어 보세요.',
    googleTieuDe: '실제 장부에 MIMI 사용',
    googleMoTa: 'Google로 한 번에, 비밀번호가 필요 없습니다. 처음 들어오면 약관에 동의하고 짧은 안내를 거칩니다.',
    demoTieuDe: '데모 보기',
    demoMoTa: '가입 없이 바로 들어갑니다. 모든 숫자는 샘플 데이터입니다.',
    demoNut: '데모 열기',
    thatTieuDe: 'Google 계정이 없나요?',
    thatMoTa: '이메일과 사업체 이름을 남겨 주세요. 영업일 기준 1일 안에 연락드려 시작을 도와 드립니다.',
    email: '사업용 이메일',
    congTy: '사업체 이름',
    gui: '요청 보내기',
    daGui: '요청을 받았습니다. 곧 연락드리겠습니다.',
    loiEmail: '이메일 형식이 맞지 않습니다. 예: name@company.com',
    loiGui: '보내지 못했습니다. 아래 이메일이나 전화로 직접 연락해 주세요.',
    hoacLienHe: '또는 직접 연락하기',
    daCoTaiKhoan: '이미 계정이 있나요?',
    dangNhap: '로그인',
  },
  zh: {
    tieuDe: '开始使用 MIMI',
    dan: '用 Google 账户注册只需几秒。想先看看？可以打开示例店铺的演示版。',
    googleTieuDe: '把 MIMI 用于真实账目',
    googleMoTa: '用 Google 一键完成，无需记密码。首次进入时，您会确认条款并完成简短的引导。',
    demoTieuDe: '查看演示',
    demoMoTa: '无需注册，直接进入。所有数字均为示例数据。',
    demoNut: '打开演示',
    thatTieuDe: '没有 Google 账户？',
    thatMoTa: '请留下邮箱和企业名称，MIMI 会在 1 个工作日内联系您协助开始使用。',
    email: '企业邮箱',
    congTy: '企业或个体户名称',
    gui: '发送申请',
    daGui: '已收到申请，MIMI 会尽快联系您。',
    loiEmail: '邮箱格式不正确。例如：name@company.com',
    loiGui: '发送失败，请通过下方邮箱或电话直接联系我们。',
    hoacLienHe: '或直接联系',
    daCoTaiKhoan: '已有账户？',
    dangNhap: '登录',
  },
};

export function LienHeDungThat() {
  const { i18n } = useTranslation();
  const c = CHU[(i18n.resolvedLanguage ?? 'vi').slice(0, 2)] ?? CHU.vi;
  const navigate = useNavigate();
  const { signInAsDemo, demoAvailable } = useAuthStore();
  const [dangDemo, setDangDemo] = useState(false);
  const [email, setEmail] = useState('');
  const [congTy, setCongTy] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [daGui, setDaGui] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const vaoDemo = async () => {
    setDangDemo(true);
    const { error } = await signInAsDemo();
    if (error) { setDangDemo(false); toast.error(error); } else navigate('/dashboard');
  };

  const gui = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim();
    if (!LA_EMAIL.test(em)) { setLoi(c.loiEmail); return; }
    setLoi(null);
    setDangGui(true);
    const p = new URLSearchParams(window.location.search);
    const { error } = await supabase.from('waitlist').insert({
      email: em.slice(0, 200),
      company_name: (congTy.trim() || em.split('@')[1]).slice(0, 200),
      utm_source: p.get('utm_source'),
      utm_medium: p.get('utm_medium'),
      utm_campaign: p.get('utm_campaign'),
    });
    setDangGui(false);
    // Gửi lại cùng email (trùng khoá) nghĩa là MIMI đã có yêu cầu này rồi — báo đã nhận, không báo lỗi.
    if (error && error.code !== '23505') { setLoi(c.loiGui); return; }
    setDaGui(true);
  };

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      {dangDemo && <ManHinhChoDemo />}
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <IconMeo size={28} /> MIMI
        </Link>
        <h1 className="font-serif text-3xl text-foreground md:text-4xl">{c.tieuDe}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{c.dan}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="flex flex-col rounded-2xl border border-primary/40 bg-card p-6 md:col-span-2">
            <h2 className="font-semibold text-foreground">{c.googleTieuDe}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.googleMoTa}</p>
            <div className="mt-5 max-w-sm"><NutGoogle /></div>
          </section>

          <section className="flex flex-col rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="font-semibold text-foreground">{c.demoTieuDe}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.demoMoTa}</p>
            <button type="button" onClick={() => void vaoDemo()} disabled={dangDemo || !demoAvailable}
              className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60">
              {dangDemo ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} {c.demoNut}
            </button>
          </section>

          <section className="flex flex-col rounded-2xl border border-border/70 bg-card p-6">
            <h2 className="font-semibold text-foreground">{c.thatTieuDe}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.thatMoTa}</p>
            {daGui ? (
              <p role="status" className="mt-5 rounded-xl bg-mimi-green/10 px-4 py-3 text-sm text-foreground">{c.daGui}</p>
            ) : (
              <form noValidate onSubmit={gui} className="mt-5 flex flex-col gap-3">
                <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setLoi(null); }} placeholder={c.email} aria-label={c.email}
                  className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
                <input value={congTy} onChange={(e) => setCongTy(e.target.value)} placeholder={c.congTy} aria-label={c.congTy}
                  className="h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
                {loi && <p role="alert" className="text-sm text-destructive">{loi}</p>}
                <button type="submit" disabled={dangGui}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 font-semibold text-primary hover:bg-primary/5 disabled:opacity-60">
                  {dangGui && <Loader2 size={15} className="animate-spin" />} {c.gui}
                </button>
              </form>
            )}
          </section>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{c.hoacLienHe}</p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {CONTACT.email && <a href={`mailto:${CONTACT.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail size={14} /> {CONTACT.email}</a>}
            {CONTACT.phone && <a href={`tel:${CONTACT.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone size={14} /> {CONTACT.phone} (Zalo)</a>}
          </div>
          <p className="mt-6">{c.daCoTaiKhoan} <Link to="/login" className="font-medium text-primary hover:underline">{c.dangNhap}</Link></p>
        </div>
      </div>
    </main>
  );
}

/** /register: đã đăng nhập (người được mời) → thiết lập như cũ; chưa → dùng thử demo hoặc liên hệ dùng bản thật. */
export default function DangKy() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Onboarding /> : <LienHeDungThat />;
}
