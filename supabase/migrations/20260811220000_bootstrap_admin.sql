-- Bootstrap the first administrator.
--
-- A role system with nobody in it locks everyone out, including the people who
-- built it: /admin currently refuses every account because `role` defaults to
-- 'owner' and nothing has ever set it otherwise. This grants the first one.
--
-- Two paths, because the account may or may not exist yet:
--   * if it already exists, promote it directly
--   * if it does not, leave an invite so the trigger from
--     20260811200000_invite_role_on_signup assigns the role at sign-up
--
-- Written so it is safe to run twice.

DO $$
DECLARE
  admin_email constant text := 'hoc.qk2@gmail.com';
  existing_user uuid;
BEGIN
  SELECT id INTO existing_user FROM auth.users WHERE lower(email) = lower(admin_email);

  IF existing_user IS NOT NULL THEN
    UPDATE public.profiles SET role = 'admin' WHERE user_id = existing_user;
    RAISE NOTICE 'Promoted existing account % to admin', admin_email;
  ELSE
    -- gen_random_uuid() as the token: this invite is redeemed by matching the
    -- email at sign-up, not by clicking a link, so the token only has to be
    -- unique. A guessable value would still be useless without the mailbox.
    INSERT INTO public.invites (email, role, token, expires_at)
    SELECT admin_email, 'admin', gen_random_uuid()::text, now() + interval '90 days'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.invites
      WHERE lower(email) = lower(admin_email) AND role = 'admin' AND accepted_at IS NULL
    );
    RAISE NOTICE 'Admin invite left for %; register with that address to claim it', admin_email;
  END IF;
END $$;
