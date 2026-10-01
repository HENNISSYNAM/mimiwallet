import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import AppErrorBoundary from "./components/AppErrorBoundary.tsx";
import "./index.css";
import i18n from "./i18n";
import { batLoiToanCuc } from "./lib/ghiLoi";
import { ganDatLaiKhiDoiNguoi } from "./lib/datLaiKhiDoiNguoi";

// Lỗi người dùng gặp phải được ghi lại (first-party, đã xoá số và email) — trước đây không ai biết.
batLoiToanCuc();

// <html lang> theo ngôn ngữ đang chọn: trình đọc màn hình và dịch tự động của trình duyệt đọc đúng tiếng.
const datLangHtml = () => { document.documentElement.lang = (i18n.resolvedLanguage ?? i18n.language ?? "vi").slice(0, 2); };
datLangHtml();
i18n.on("languageChanged", datLangHtml);
// Đổi tài khoản trong cùng tab: xoá công ty đã nhớ và bộ não MIMI của người trước (P0-1, P0-2).
ganDatLaiKhiDoiNguoi();

/*
 * Sau mỗi lần deploy, tab đang mở còn trỏ tới tệp JS cũ đã bị xoá: tải trang lazy thì hỏng (P1-4). Vite báo
 * `vite:preloadError` — tải lại trang một lần để lấy bản mới; đã thử trong 30 giây thì thôi, tránh lặp vô tận.
 */
window.addEventListener("vite:preloadError", (e) => {
  try {
    const truoc = Number(sessionStorage.getItem("mimi:tai-lai-ban-moi") ?? 0);
    if (Date.now() - truoc < 30_000) return;
    sessionStorage.setItem("mimi:tai-lai-ban-moi", String(Date.now()));
  } catch { /* không lưu được thì vẫn tải lại một lần */ }
  e.preventDefault();
  window.location.reload();
});

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
