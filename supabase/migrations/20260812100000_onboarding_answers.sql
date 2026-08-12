-- Room for the three questions the opening cards ask.
--
-- `industry` and `employee_count` already exist and are reused. Only the goal
-- and the "stop asking" flag are new — the point of the redesign is to ask less,
-- so adding columns for it would defeat the exercise.

ALTER TABLE public.companies
  -- What the owner said they came for. Drives which panel the dashboard leads
  -- with; not a claim about them, just their stated priority.
  ADD COLUMN IF NOT EXISTS primary_goal text,
  -- Set when the cards are answered *or* dismissed. Both mean the same thing to
  -- the UI — stop asking — and conflating them is deliberate: a person who
  -- skipped has answered the question "do you want to do this now".
  ADD COLUMN IF NOT EXISTS onboarding_done_at timestamptz;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_primary_goal_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_primary_goal_check
  CHECK (primary_goal IS NULL OR primary_goal IN ('cashflow', 'tax', 'capital', 'all'));

COMMENT ON COLUMN public.companies.onboarding_done_at IS
  'Answered or skipped — both stop the cards. Null means never shown to completion.';
