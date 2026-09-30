import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MeoSong } from '@/components/mimi/MeoSong';

/** Màn chờ hiện ít nhất ngần này, để không chớp một cái rồi tắt khi đăng nhập demo quá nhanh. */
export const CHO_TOI_THIEU_MS = 2000;

const CAU: Record<string, { chinh: string; phu: string }> = {
  vi: { chinh: 'MIMI đang mở cửa hàng mẫu cho bạn…', phu: 'Số liệu trong bản demo là mẫu, không phải của doanh nghiệp nào.' },
  en: { chinh: 'MIMI is opening the sample shop for you…', phu: 'Everything in the demo is sample data, not a real business.' },
  ko: { chinh: 'MIMI가 샘플 가게를 열고 있어요…', phu: '데모의 숫자는 모두 샘플이며 실제 사업체의 것이 아닙니다.' },
  zh: { chinh: 'MIMI 正在为你打开示例店铺…', phu: '演示中的数据均为示例，不属于任何真实企业。' },
};

/**
 * MÀN CHỜ DÙNG CHUNG (30/09/2026): video biển mây toàn màn hình + mèo MIMI + một câu ngắn. Dùng cho mọi lúc phải chờ
 * (mở app, chuyển trang tải chậm, vào demo). Video tắt tiếng, tự chạy, lặp; ảnh bìa hiện ngay trong lúc video tải.
 * `noiTiep`: dùng như màn chờ trong trang (Suspense) thay vì phủ lên trên bằng portal.
 */
export function ManHinhChoVideo({ chinh, phu, phuLen = true }: { chinh: string; phu?: string; phuLen?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.setAttribute('muted', '');
    void v.play().catch(() => {});
    if (!phuLen) return;
    const cu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = cu; };
  }, [phuLen]);

  const noiDung = (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className={`${phuLen ? 'fixed z-[100]' : 'relative min-h-screen'} inset-0 flex items-center justify-center overflow-hidden bg-[#0f3b46]`}
    >
      <video
        ref={ref}
        src="/video/mimi-cho-demo.mp4"
        poster="/video/mimi-cho-demo.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/35" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-4 flex max-w-md flex-col items-center text-center text-white"
      >
        <span className="rounded-full bg-white/15 p-3 shadow-lg ring-1 ring-white/30 backdrop-blur-md">
          <MeoSong size={64} />
        </span>
        <p className="mt-5 font-display text-xl font-semibold drop-shadow sm:text-2xl">{chinh}</p>
        {phu && <p className="mt-2 text-sm text-white/80 drop-shadow">{phu}</p>}
        <span aria-hidden className="mt-6 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-white/80"
              animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
          ))}
        </span>
      </motion.div>
    </motion.div>
  );
  return phuLen ? createPortal(noiDung, document.body) : noiDung;
}

/** Màn chờ khi bấm "Xem demo": phủ toàn màn hình, câu theo ngôn ngữ đang chọn. */
export function ManHinhChoDemo() {
  const { i18n } = useTranslation();
  const cau = CAU[(i18n.resolvedLanguage ?? 'vi').slice(0, 2)] ?? CAU.vi;
  return <ManHinhChoVideo chinh={cau.chinh} phu={cau.phu} />;
}
