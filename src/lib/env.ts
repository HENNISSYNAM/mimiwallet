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
