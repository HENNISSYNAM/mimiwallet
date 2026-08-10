import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import TeamSection from '@/components/landing/TeamSection';
import MimiCat from '@/components/brand/MimiCat';

/**
 * "Về chúng tôi" as its own route rather than a band on the landing page.
 *
 * The landing page sells the product; this page answers who is behind it. They
 * are different questions asked by different readers — an investor or a
 * competition judge arrives looking for the team and should not have to scroll
 * past nine product sections to find them.
 */
export default function About() {
  // Deep links land at the top; without this the router keeps the scroll
  // position from whatever page the visitor came from.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden mimi-hero-warm pt-32 pb-16">
        <div aria-hidden className="mimi-hero-glow" />
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-10 items-center">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-sm font-medium text-muted-foreground mb-4"
              >
                Về chúng tôi
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="font-display font-extrabold text-foreground leading-[1.06] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(2.2rem, 4vw, 3.6rem)' }}
              >
                Chúng tôi xây thứ
                <br className="hidden sm:block" /> mình muốn có
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-xl"
              >
                Mimi Wallet bắt đầu từ một quan sát đơn giản: hộ kinh doanh không phải là khách
                vay xấu, họ chỉ vô hình với ngân hàng. Không báo cáo kiểm toán, không tài sản thế
                chấp, không hồ sơ tín dụng — nên chi phí thẩm định một khoản vay nhỏ ngang với
                một khoản vay lớn, và không ai làm.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mx-auto w-[190px] sm:w-[240px] lg:w-full lg:max-w-[320px]"
            >
              <MimiCat variant="hero" className="w-full" tilt={11} />
            </motion.div>
          </div>
        </div>
      </section>

      <TeamSection />

      <Footer />
    </div>
  );
}
