import { useEffect } from 'react';
import { ArrowDown } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { DanhSachBai } from './TaiNguyenDanhSach';

/**
 * Tuyển dụng. Vị trí lấy từ bảng `tai_nguyen` (loai = 'tuyen_dung') do admin đăng.
 *
 * "Kỳ lân tiếp theo của châu Á" là MỤC TIÊU chủ dự án đặt ra (16/09/2026), viết đúng là mục tiêu —
 * không phải định giá hay thành tích. Không dựng thẻ nhân viên kèm thành tích như trang mẫu:
 * chưa có câu chuyện thật nào để kể.
 */
export default function TuyenDung() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="mimi-hero-warm border-b border-border/60">
        <div className="container mx-auto px-4 pt-36 pb-20 text-center lg:px-8 lg:pt-44 lg:pb-24">
          <p className="mimi-nhan-muc text-mimi-green">Tuyển dụng</p>
          <h1
            className="mx-auto mt-5 max-w-5xl font-serif font-normal leading-[1.02] tracking-[-0.03em] text-foreground text-balance"
            style={{ fontSize: 'clamp(3rem, 9vw, 7.5rem)' }}
          >
            Chúng tôi chỉ tuyển người xây
          </h1>
          <p className="mimi-doan-dan mx-auto mt-6 max-w-2xl text-muted-foreground">
            Mục tiêu của MIMI là trở thành kỳ lân tiếp theo của châu Á. Đến đây để giải bài toán khó, tự làm không cần chờ ai cho phép,
            và giao những sản phẩm bạn tự hào. Nghe căng? Đúng là căng.
          </p>
          <a
            href="#vi-tri"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Xem vị trí đang mở <ArrowDown size={16} />
          </a>
        </div>
      </section>

      <section id="vi-tri" className="scroll-mt-24 py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <h2 className="mimi-tieu-de-muc text-foreground">Vị trí đang mở</h2>
          <div className="mt-10">
            <DanhSachBai loai="tuyen_dung" />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
