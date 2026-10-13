import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Briefcase, Building2, Rocket, Store } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import MimiCat from '@/components/brand/MimiCat';
import DaiLogo from '@/components/landing/DaiLogo';

/**
 * Khách hàng — MIMI phục vụ ai, và làm gì cho từng nhóm.
 *
 * LUẬT CỦA TRANG NÀY: không lời chứng thực, không con số "N doanh nghiệp tin dùng".
 * MIMI đang dùng thử cùng nhóm khách đầu tiên; câu chuyện khách hàng chỉ lên trang khi khách
 * đồng ý và số liệu kiểm được. Bản cũ của trang chủ từng có lời chứng thực bịa — không lặp lại.
 * Mỗi việc nêu dưới đây là chức năng đang chạy trong ứng dụng, dẫn sang trang giải pháp tương ứng.
 */

export const NHOM_KHACH = [
  {
    icon: Store,
    ma: 'ho',
    ten: 'Hộ kinh doanh',
    van_de: 'Từ 2026, hộ doanh thu trên 01 tỷ đồng/năm phải khai thuế theo doanh thu thật, và tự lo chứng từ chi phí.',
    mimi_lam: [
      'Hỏi bốn câu khi mở ứng dụng để biết bạn khai mẫu nào',
      'Ước tính doanh thu từ sao kê ngân hàng',
      'Soạn sẵn mẫu 01/TKN-CNKD hoặc 01/CNKD để bạn in và tự nộp',
    ],
    href: '/giai-phap/ho-kinh-doanh',
  },
  {
    icon: Building2,
    ma: 'sme',
    ten: 'Doanh nghiệp nhỏ và vừa',
    van_de: 'Chi tiêu đi qua nhiều người, chứng từ thất lạc, cuối kỳ mới biết khoản nào thiếu hoá đơn.',
    mimi_lam: [
      'Duyệt chi một chạm, tiền chỉ đi khi người có quyền trả',
      'Bắt khi số tài khoản người nhận bị đổi',
      'Khớp sao kê với hoá đơn, chỉ ra khoản còn thiếu chứng từ',
    ],
    href: '/giai-phap/doanh-nghiep-nho-va-vua',
  },
  {
    icon: Rocket,
    ma: 'startup',
    ten: 'Startup & công ty công nghệ',
    van_de: 'Agent AI bắt đầu tự tiêu tiền: gọi API, thuê máy chủ, mua công cụ.',
    mimi_lam: [
      'Đặt hạn mức và luật duyệt cho từng agent',
      'Nhật ký cho mọi bước agent làm',
      'Nối Claude, Cursor qua MCP trong một lệnh',
    ],
    href: '/giai-phap/startup-cong-nghe',
  },
  {
    icon: Briefcase,
    ma: 'keToan',
    ten: 'Văn phòng kế toán',
    van_de: 'Giữ sổ cho hàng chục hộ và doanh nghiệp, phần lớn vẫn gõ tay từ sao kê.',
    mimi_lam: [
      'Sổ chi phí kèm nguồn từng dòng',
      'Bản nháp tờ khai tính lại ở máy chủ từ số liệu gốc',
      'Liên hệ đội MIMI để dùng cho nhiều khách',
    ],
    href: '/giai-phap/van-phong-ke-toan',
  },
] as const;

/** Chữ của NHOM_KHACH là bản tiếng Việt gốc; màn hình đọc qua `ui2.khach.<ma>.*` (rơi về bản gốc nếu thiếu). */
export default function KhachHang() {
  const { t } = useTranslation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden mimi-hero-warm border-b border-border/60">
        <div aria-hidden className="mimi-hero-glow" />
        <div className="container relative z-10 mx-auto grid items-center gap-10 px-4 pt-32 pb-16 lg:grid-cols-[1.2fr_.8fr] lg:px-8 lg:pt-40 lg:pb-20">
          <div>
            <p className="mimi-nhan-muc mb-4 text-mimi-green">{t('ui2.khach.nhan')}</p>
            <h1 className="mimi-tieu-de-trang max-w-3xl text-foreground">{t('ui2.khach.tieuDe')}</h1>
            <p className="mimi-doan-dan mt-5 max-w-2xl text-muted-foreground">
              {t('ui2.khach.moTa')}
            </p>
          </div>
          <div className="hidden justify-center lg:flex">
            <MimiCat variant="live" pose="watch" className="h-56 w-56" />
          </div>
        </div>
      </section>

      <DaiLogo className="border-b border-border/60" />

      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="mimi-tieu-de-muc max-w-2xl text-foreground">{t('ui2.khach.bonNhom')}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {NHOM_KHACH.map((n) => (
              <article key={n.ten} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-foreground">
                  <n.icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{t(`ui2.khach.${n.ma}.ten`, { defaultValue: n.ten })}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`ui2.khach.${n.ma}.vanDe`, { defaultValue: n.van_de })}</p>
                <ul className="mt-4 space-y-2 text-[15px] text-foreground">
                  {n.mimi_lam.map((v, i) => (
                    <li key={v} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mimi-green" />
                      {t(`ui2.khach.${n.ma}.lam${i}`, { defaultValue: v })}
                    </li>
                  ))}
                </ul>
                <Link to={n.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  {t('ui2.khach.xemGiaiPhap')} <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="mimi-tieu-de-muc text-foreground">{t('ui2.khach.dauTien')}</h2>
          <p className="mimi-doan-dan mt-4 text-muted-foreground">
            {t('ui2.khach.dauTienMo')}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90">
              {t('ui2.khach.batDauMienPhi')} <ArrowRight size={16} />
            </Link>
            <a href="/#dang-ky" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-[15px] font-medium text-foreground hover:bg-accent">
              {t('ui2.khach.noiChuyen')}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
