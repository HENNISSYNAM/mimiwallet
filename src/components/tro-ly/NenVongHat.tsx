import { useEffect, useRef } from 'react';
import { buocVatLy, docMauHsl, soHatTheoKhung, taoHat, viTriGoc, type Hat } from '@/lib/vongHat';

/**
 * Nền chuyển động của MIMI Assistant: vòng hạt xoay chậm, dạt ra khi chuột đi qua.
 *
 * - Chỉ trang trí: `aria-hidden`, không nhận chuột (sự kiện chuột nghe ở `window` rồi đổi
 *   sang toạ độ khung), nên không chặn ô hỏi hay nút nào phía trên.
 * - Người dùng bật "giảm chuyển động" thì vẽ một khung đứng yên, không xoay, không đẩy.
 * - Dừng vẽ khi khung ra khỏi màn hình hoặc tab bị ẩn, để không tốn pin.
 * - Màu đọc từ biến CSS `--vong-hat` (HSL) nên tự đổi theo chế độ sáng/tối.
 */
export function NenVongHat({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const giamChuyenDong = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let hat: Hat[] = [];
    let rong = 0;
    let cao = 0;
    let mau: [number, number, number] = [214, 60, 58];
    let chuot: { x: number; y: number } | null = null;
    let khung = 0;
    let dangHien = true;
    const batDau = performance.now();

    const docMau = () => {
      mau = docMauHsl(getComputedStyle(canvas).getPropertyValue('--vong-hat'));
    };

    const doKhung = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      rong = r.width;
      cao = r.height;
      canvas.width = Math.round(rong * dpr);
      canvas.height = Math.round(cao * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const can = soHatTheoKhung(rong, cao);
      if (Math.abs(can - hat.length) > 150) hat = taoHat(can);
      docMau();
    };

    const ve = (t: number) => {
      ctx.clearRect(0, 0, rong, cao);
      const cx = rong / 2;
      const cy = cao / 2;
      // Vòng lớn hơn khung ô hỏi: trên màn hẹp gần như chạm mép, trên màn rộng bao quanh tiêu đề.
      const R = Math.min(rong * 0.46, cao * 0.44, 520);
      const [h, s, l] = mau;
      for (const p of hat) {
        const g = viTriGoc(p, t, cx, cy, R);
        const gan = giamChuyenDong ? 0 : buocVatLy(p, g.x, g.y, chuot);
        const a = Math.min(1, p.doMo + gan * 0.5);
        ctx.fillStyle = `hsla(${h} ${s}% ${Math.max(0, l - gan * 12)}% / ${a})`;
        const k = p.kichThuoc * (1 + gan * 0.6);
        ctx.fillRect(g.x + p.lx - k / 2, g.y + p.ly - k / 2, k, k);
      }
    };

    const vong = () => {
      if (!dangHien) return;
      ve(performance.now() - batDau);
      khung = requestAnimationFrame(vong);
    };

    const chay = () => {
      cancelAnimationFrame(khung);
      if (giamChuyenDong) ve(0);
      else khung = requestAnimationFrame(vong);
    };

    const diChuot = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      chuot = x >= -40 && y >= -40 && x <= r.width + 40 && y <= r.height + 40 ? { x, y } : null;
    };
    const roiChuot = () => { chuot = null; };

    doKhung();
    chay();

    const ro = new ResizeObserver(() => { doKhung(); if (giamChuyenDong) ve(0); });
    ro.observe(canvas);
    const io = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([muc]) => {
        dangHien = muc.isIntersecting && document.visibilityState === 'visible';
        if (dangHien) chay();
      })
      : null;
    io?.observe(canvas);
    const doiTab = () => {
      dangHien = document.visibilityState === 'visible';
      if (dangHien) chay();
    };
    // Đổi sáng/tối là đổi class trên <html>.
    const mo = new MutationObserver(() => { docMau(); if (giamChuyenDong) ve(0); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

    if (!giamChuyenDong) {
      window.addEventListener('pointermove', diChuot, { passive: true });
      document.addEventListener('pointerleave', roiChuot);
    }
    document.addEventListener('visibilitychange', doiTab);

    return () => {
      cancelAnimationFrame(khung);
      ro.disconnect();
      io?.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', diChuot);
      document.removeEventListener('pointerleave', roiChuot);
      document.removeEventListener('visibilitychange', doiTab);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
