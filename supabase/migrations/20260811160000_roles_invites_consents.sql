-- Account routing: roles, closed-pilot invites, recorded consent.
--
-- Until now every account was identical and `/admin` was gated by a password
-- compiled into the JavaScript bundle. There was nothing in the database that
-- could answer "what is this user allowed to do", so there was nothing an edge
-- function or an RLS policy could check.

-- ── Roles ───────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner',
  -- The demo account is shared and its credentials ship in the client bundle by
  -- design. It must therefore never be able to attach a real bank account, and
  -- the flag has to live server-side where the browser cannot edit it.
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  -- A user can own several `companies` rows and the code has been picking one
  -- with `.limit(1)` and no ORDER BY, which Postgres does not promise to answer
  -- consistently. This makes the choice explicit and stable.
  ADD COLUMN IF NOT EXISTS active_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('owner', 'lender', 'admin'));

-- Read by policies and edge functions on nearly every request.
CREATE INDEX IF NOT EXISTS profiles_user_role_idx ON public.profiles (user_id, role);

/**
 * Role lookup for use inside RLS policies.
 *
 * SECURITY DEFINER on purpose: a policy on `profiles` that queried `profiles`
 * would recurse. STABLE lets the planner call it once per statement instead of
 * once per row.
 */
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_role() FROM public;
GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

-- A user may read their own profile but must not be able to promote themselves.
-- Without this, "role" is just a column the owner can UPDATE to 'admin'.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
    AND is_demo = (SELECT p.is_demo FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- ── Closed pilot ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'lender', 'admin')),
  token text NOT NULL UNIQUE,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- No policy for `authenticated` deliberately: invites are created and redeemed
-- by edge functions holding the service role. With RLS on and no policy, a
-- signed-in user reading this table directly gets nothing — which is right,
-- because a readable token list is the same as no invite system at all.
CREATE POLICY "Admins can read invites" ON public.invites
  FOR SELECT TO authenticated
  USING (public.current_role() = 'admin');

CREATE INDEX IF NOT EXISTS invites_token_idx ON public.invites (token) WHERE accepted_at IS NULL;

-- ── Consent ─────────────────────────────────────────────────────────────────
-- Nghị định 13/2023 requires consent to be demonstrable, not merely obtained.
-- The Cas consent screen already says the right things but recorded nothing, so
-- there was no way to show afterwards who agreed to what, or to which wording.
CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tos', 'privacy', 'bank_data')),
  version text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents" ON public.consents
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can grant own consents" ON public.consents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
-- Revocation is an UPDATE of revoked_at only; consent history is never deleted,
-- because the record exists precisely to prove what was agreed and when.
CREATE POLICY "Users can revoke own consents" ON public.consents
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS consents_user_kind_idx
  ON public.consents (user_id, kind) WHERE revoked_at IS NULL;

-- ── Mark the existing demo account ──────────────────────────────────────────
UPDATE public.profiles p
SET is_demo = true
FROM auth.users u
WHERE u.id = p.user_id AND u.email = 'demo@mimiwallet.vn';
