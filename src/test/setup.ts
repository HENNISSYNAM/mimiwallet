import "@testing-library/jest-dom";
// Khởi tạo i18n cho test: không có nó thì t() trả về khoá và mọi assert chữ tiếng Việt đều đỏ.
import "@/i18n";
import { configure } from "@testing-library/react";

// findBy*/waitFor mặc định chờ 1 giây. Từ 21/09/2026 mỗi trang xác định "công ty đang dùng" qua
// bảng thành viên trước khi tải dữ liệu — thêm một bước bất đồng bộ — và khi cả bộ test chạy
// song song, 1 giây không đủ: mỗi lần chạy lại hỏng một ca khác nhau, chạy riêng thì ca nào cũng
// đạt. Nới thời gian CHỜ, không nới điều kiện kiểm.
configure({ asyncUtilTimeout: 5000 });

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
