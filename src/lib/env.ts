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

export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || "demo@mimiwallet.vn";
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || "MimiDemo2026!";
