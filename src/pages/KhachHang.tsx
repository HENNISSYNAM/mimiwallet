import { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    ten: 'Hộ kinh doanh',
    van_de: 'Từ 2026, hộ doanh thu trên 01 tỷ đồng/năm phải khai thuế theo doanh thu thật, và tự lo chứng từ chi phí.',
    mimi_lam: [
      'Hỏi bốn câu khi mở ứng dụng để biết bạn khai mẫu nào',
      'Đọc doanh thu từ hoá đơn điện tử và sao kê ngân hàng',
      'Soạn sẵn mẫu 01/TKN-CNKD hoặc 01/CNKD để bạn in và tự nộp',
    ],
    href: '/giai-phap/ho-kinh-doanh',
  },
  {
    icon: Building2,
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

export default function KhachHang() {
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
            <p className="mimi-nhan-muc mb-4 text-mimi-green">Khách hàng</p>
            <h1 className="mimi-tieu-de-trang max-w-3xl text-foreground">MIMI làm việc cho ai</h1>
            <p className="mimi-doan-dan mt-5 max-w-2xl text-muted-foreground">
              MIMI đang dùng thử cùng những khách hàng đầu tiên. Chúng tôi chỉ đăng câu chuyện khách hàng khi họ đồng ý
              và số liệu kiểm được, nên trang này chưa có câu chuyện nào — chỉ có việc MIMI làm được hôm nay cho từng nhóm.
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
          <h2 className="mimi-tieu-de-muc max-w-2xl text-foreground">Bốn nhóm khách, bốn việc khác nhau</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {NHOM_KHACH.map((n) => (
              <article key={n.ten} className="flex flex-col rounded-2xl border border-border bg-card p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-muted text-foreground">
                  <n.icon size={20} strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-4 text-xl font-semibold text-foreground">{n.ten}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.van_de}</p>
                <ul className="mt-4 space-y-2 text-[15px] text-foreground">
                  {n.mimi_lam.map((v) => (
                    <li key={v} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mimi-green" />
                      {v}
                    </li>
                  ))}
                </ul>
                <Link to={n.href} className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  Xem giải pháp <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-muted/30 py-20">
        <div className="container mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="mimi-tieu-de-muc text-foreground">Trở thành khách hàng đầu tiên</h2>
          <p className="mimi-doan-dan mt-4 text-muted-foreground">
            Để lại email, đội MIMI liên hệ trực tiếp và cùng bạn nối dữ liệu. Câu chuyện của bạn chỉ lên trang này khi bạn đồng ý.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90">
              Bắt đầu miễn phí <ArrowRight size={16} />
            </Link>
            <a href="/#dang-ky" className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-[15px] font-medium text-foreground hover:bg-accent">
              Nói chuyện với đội MIMI
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
