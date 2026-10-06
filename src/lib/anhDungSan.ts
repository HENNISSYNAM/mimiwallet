/**
 * Ảnh HTML dựng sẵn của trang đầu tiên (06/10/2026) — xem `scripts/dung-san-html.mjs`.
 *
 * Không hydrate (React đòi HTML khớp từng chữ; ngôn ngữ, giờ, trạng thái đăng nhập ở trình duyệt khác lúc build nên
 * luôn lệch). Thay vào đó app render bình thường, và trong lúc trang lazy đang tải, màn chờ hiện đúng HTML dựng sẵn
 * của đường dẫn đó — người xem không thấy nháy. Chỉ áp cho đường dẫn đã dựng; sang trang khác là màn chờ thường.
 */
let anh: { duong: string; html: string } | null = null;

export function ghiAnhDungSan(duong: string, html: string): void {
  anh = { duong, html };
}

export function layAnhDungSan(): string | null {
  if (!anh || typeof window === 'undefined') return null;
  return window.location.pathname.replace(/\/$/, '') === anh.duong.replace(/\/$/, '') ? anh.html : null;
}
