import { useEffect, useRef, useState } from 'react';

/**
 * Video mèo MIMI đuổi đồng xu — nền của phần đầu trang chủ (29/09/2026). Tự chạy, lặp, tắt tiếng (trình duyệt chỉ
 * cho tự chạy khi tắt tiếng; tiếng đã bỏ khi nén). Là hình nền trang trí nên ẩn với trình đọc màn hình. Người bật
 * "giảm chuyển động" chỉ thấy ảnh bìa. Ra khỏi màn hình thì dừng để không tốn pin.
 */
export default function VideoMeoMimi({ className }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [giamChuyenDong] = useState(() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  });

  useEffect(() => {
    const v = ref.current;
    if (!v || giamChuyenDong || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) void v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [giamChuyenDong]);

  return (
    <video
      ref={ref}
      src="/video/mimi-meo-dong-xu.mp4"
      poster="/video/mimi-meo-dong-xu.jpg"
      autoPlay={!giamChuyenDong}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
      tabIndex={-1}
      className={`pointer-events-none block h-full w-full object-cover ${className ?? ''}`}
    />
  );
}
