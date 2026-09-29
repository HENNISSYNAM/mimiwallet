import { useEffect, useRef } from 'react';

/** Máy tính: bản gần như nguyên chất lượng gốc (~6 MB). Điện thoại hoặc bật tiết kiệm dữ liệu: bản nhẹ (~2,5 MB). */
function chonNguon(): string {
  try {
    const tietKiem = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (!tietKiem && window.matchMedia('(min-width: 1024px)').matches) return '/video/mimi-meo-dong-xu-hq.mp4';
  } catch { /* trình duyệt cũ: dùng bản nhẹ */ }
  return '/video/mimi-meo-dong-xu.mp4';
}

const SU_KIEN_CHAM = ['pointerdown', 'touchstart', 'keydown', 'scroll'] as const;

/**
 * Video mèo MIMI đuổi đồng xu — nền của phần đầu trang chủ (29/09/2026). Luôn tự chạy, lặp, tắt tiếng (trình duyệt
 * chỉ cho tự chạy khi tắt tiếng; tiếng đã bỏ khi nén). Là hình nền trang trí nên ẩn với trình đọc màn hình.
 *
 * Tự chạy chắc chắn trên mọi trình duyệt:
 *   - Gắn cả thuộc tính `muted` lẫn property — React chỉ đặt property, iOS Safari cần thấy thuộc tính mới cho chạy.
 *   - Gọi play() ngay khi gắn; bị chặn (iPhone chế độ nguồn điện thấp…) thì chạy ở lần chạm/cuộn/bấm phím đầu tiên.
 *   - Ra khỏi màn hình thì dừng cho đỡ tốn pin, quay lại thì chạy tiếp; chuyển tab về cũng chạy tiếp.
 */
export default function VideoMeoMimi({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');

    let trongMan = true;
    const chay = () => { if (trongMan && !document.hidden && v.paused) void v.play().catch(() => {}); };

    const khiCham = () => { chay(); if (!v.paused) boCham(); };
    const boCham = () => SU_KIEN_CHAM.forEach((e) => window.removeEventListener(e, khiCham));
    SU_KIEN_CHAM.forEach((e) => window.addEventListener(e, khiCham, { passive: true }));

    const khiDoiTab = () => chay();
    document.addEventListener('visibilitychange', khiDoiTab);
    v.addEventListener('canplay', chay);

    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([e]) => {
      trongMan = e.isIntersecting;
      if (trongMan) chay(); else v.pause();
    });
    io?.observe(v);
    chay();

    return () => {
      boCham();
      document.removeEventListener('visibilitychange', khiDoiTab);
      v.removeEventListener('canplay', chay);
      io?.disconnect();
    };
  }, []);

  return (
    <video
      ref={ref}
      src={chonNguon()}
      poster="/video/mimi-meo-dong-xu.jpg"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      disablePictureInPicture
      aria-hidden
      tabIndex={-1}
      className={`pointer-events-none block h-full w-full object-cover ${className ?? ''}`}
    />
  );
}
