import { useState, useEffect, useRef } from 'react';

/**
 * Đếm lên tới `target` khi `start` bật.
 *
 * CHƯA CHẠY THÌ TRẢ `target`, KHÔNG TRẢ 0. Bản trước khởi tạo bằng 0, nên khối
 * số liệu ở trang chủ hiện "0/52 kiểm thử tự động", "~0 giây", "0 tháng" cho tới
 * khi người dùng cuộn tới. Hai agent đóng vai khách hàng — một founder ở TP.HCM
 * và một CFO ở Bangalore — đều đọc trang trước khi cuộn và đều báo cùng một
 * điều; bản tiếng Anh còn ghi "0/52 · All currently passing", tự mâu thuẫn ngay
 * trong một dòng.
 *
 * Ai không cuộn tới, ai bật giảm chuyển động, trình đọc màn hình và trình thu
 * thập đều rơi vào trường hợp đó. Một con số 0 đứng cạnh nhãn "đang pass hết"
 * đọc ra thành "bộ test đang hỏng" — thà không có hiệu ứng còn hơn nói sai.
 *
 * Người dùng bật "giảm chuyển động" thì không đếm: hiện thẳng số thật.
 */
const giamChuyenDong = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const useCountUp = (target: number, duration = 1500, start = false) => {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (!start || giamChuyenDong()) { setValue(target); return; }
    setValue(0);
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, start]);

  return value;
};
