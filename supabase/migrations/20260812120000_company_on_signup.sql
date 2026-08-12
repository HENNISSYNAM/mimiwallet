-- Give every new account a company, whatever door they came in through.
--
-- Until now the `companies` row was inserted by hand at the end of the five-step
-- registration form. Anyone who signed up with Google skipped that code
-- entirely and ended up authenticated with no company at all — which is not a
-- visible error, it is worse: the dashboard has nothing to query, and the
-- assistant answers "please sign in" to someone who is signed in, because the
-- only thing it can tell is that the company lookup came back empty.
--
-- Creating the row alongside the profile means the app has exactly one shape of
-- account to reason about, no matter which sign-in method produced it.

CREATE OR REPLACE FUNCTION public.create_default_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fallback text;
BEGIN
  -- A name is required by the table and shown in the greeting, so it has to be
  -- something a person recognises rather than a blank or a uuid. Their own name
  -- is the best guess available at this moment; the welcome cards let them
  -- correct it once they are inside.
  fallback := COALESCE(
    NULLIF(trim(NEW.full_name), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'Doanh nghiệp của tôi'
  );

  -- Guard against a second row if a profile is ever re-inserted: the app treats
  -- the oldest company as the active one, and a duplicate would quietly split a
  -- user's data across two of them.
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.companies (user_id, name) VALUES (NEW.user_id, fallback);
  END IF;

  RETURN NEW;
END;
$$;

-- AFTER INSERT, not BEFORE: the row needs profiles.user_id to already satisfy
-- its foreign key.
DROP TRIGGER IF EXISTS create_default_company_trg ON public.profiles;
CREATE TRIGGER create_default_company_trg
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_company();

-- Backfill anyone already stranded — in practice the Google accounts created
-- while the form was the only path that made a company.
INSERT INTO public.companies (user_id, name)
SELECT p.user_id,
       COALESCE(NULLIF(trim(p.full_name), ''), NULLIF(split_part(COALESCE(p.email, ''), '@', 1), ''), 'Doanh nghiệp của tôi')
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.user_id = p.user_id);
