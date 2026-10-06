/**
 * Điểm vào DỰNG SẴN HTML (06/10/2026) — chỉ dùng lúc build, không vào bundle trình duyệt.
 *
 * Web là SPA: máy đọc của trợ lý AI (ChatGPT, Perplexity, Claude) và nhiều máy tìm kiếm không chạy JS nên chỉ thấy
 * vỏ trống. `scripts/dung-san-html.mjs` gọi `dung(duong)` cho từng trang công khai trong sitemap và ghi HTML thật ra
 * `dist/`. Trình duyệt vẫn chạy app như cũ (hydrate lên phần đã dựng — xem `main.tsx`).
 */
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import { Writable } from 'node:stream';
import App from './App';
import { danhSachTrangCongKhai } from './lib/sitemap';

export { danhSachTrangCongKhai };

export function dung(duong: string): Promise<string> {
  return new Promise((xong, loi) => {
    let html = '';
    const ra = new Writable({
      write(chunk, _enc, cb) { html += chunk.toString(); cb(); },
      final(cb) { xong(html); cb(); },
    });
    const { pipe } = renderToPipeableStream(
      <HelmetProvider>
        <App router={({ children }) => <StaticRouter location={duong}>{children}</StaticRouter>} />
      </HelmetProvider>,
      {
        // Đợi mọi trang lazy và Suspense xong rồi mới ghi — không ghi màn hình chờ.
        onAllReady() { pipe(ra); },
        onShellError: loi,
        onError(e) { loi(e); },
      },
    );
  });
}
