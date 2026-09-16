import "@testing-library/jest-dom";
// Khởi tạo i18n cho test: không có nó thì t() trả về khoá và mọi assert chữ tiếng Việt đều đỏ.
import "@/i18n";

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
