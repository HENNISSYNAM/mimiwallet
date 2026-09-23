/**
 * Public runtime config with production fallbacks so the app boots even when
 * Vite is built without a local .env (Lovable/CI/GitHub Pages/Vercel default).
 *
 * Only PUBLIC values live here — the Supabase publishable key is designed to be
 * shipped in the browser (RLS enforces access), and the demo account exists
 * precisely so anyone can try the app. No secrets, no service-role keys.
 */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://xzymxgdavepvygdcmfup.supabase.co";

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_r4reA2kLO6rzvF5EgkaYfg_Fz3UQBBt";

export const SUPABASE_PROJECT_ID =
  import.meta.env.VITE_SUPABASE_PROJECT_ID || "xzymxgdavepvygdcmfup";

/**
 * Tên miền chính thức, dùng cho canonical và og:url trong `Seo.tsx`.
 *
 * Giá trị cũ nằm cứng trong Seo.tsx là "https://mimiwallet.lovable.app" — tên
 * miền của môi trường dựng thử. Nghĩa là mọi trang đang khai với Google rằng
 * bản gốc của nó nằm ở một tên miền khác, và mọi link chia sẻ trỏ về đó.
 *
 * Đặt qua biến môi trường để khi đổi sang tên miền riêng thì không phải sửa mã.
 * Không lấy `window.location.origin`: canonical phải là MỘT tên miền cố định,
 * nếu không thì bản trên vercel.app và bản trên tên miền riêng sẽ tự nhận là
 * bản gốc của nhau.
 */
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://mimiwallet.vercel.app"
).replace(/\/+$/, "");

/**
 * Demo account. No fallback values, deliberately.
 *
 * These used to default to a real working account, which meant the "is a demo
 * configured?" check in useAuthStore was true in every build — including
 * production — and every visitor was signed straight into that one account. A
 * default here is not a convenience; it is the difference between an opt-in
 * demo and a shared login. Left unset, the demo button simply does not appear.
 */
export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || "";
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "";
