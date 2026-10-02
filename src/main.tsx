import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import "./index.css";
import "./i18n";

/*
 * Đăng ký service worker — chỉ ở bản dựng thật, không ở máy phát triển.
 *
 * Cần cho kế hoạch lên Google Play qua TWA: Play bọc chính trang web này, và
 * không có service worker thì lúc mất mạng app mở ra trang khủng long của
 * Chrome. Xem `public/sw.js` để biết vì sao nó cố ý KHÔNG cache dữ liệu.
 *
 * Tắt ở dev vì service worker và HMR của Vite tranh nhau phục vụ cùng một tệp,
 * và triệu chứng là "sửa mã xong không thấy gì đổi" — mất hàng giờ mới lần ra.
 *
 * `import.meta.env.PROD` do Vite thay lúc dựng, không phải đọc lúc chạy.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch((e) => {
      // Không chặn app vì một service worker không đăng ký được.
      console.warn("Không đăng ký được service worker:", e);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </AppErrorBoundary>
);
