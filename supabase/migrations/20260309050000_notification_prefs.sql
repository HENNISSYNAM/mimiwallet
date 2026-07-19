-- Real persistence for the notification toggles in SettingsPage (previously
-- static divs with a hardcoded checked state, not wired to anything).
ALTER TABLE public.profiles
  ADD COLUMN notification_prefs JSONB NOT NULL DEFAULT '{"invoice_due": true, "disbursement": true, "cashflow": false}'::jsonb;
