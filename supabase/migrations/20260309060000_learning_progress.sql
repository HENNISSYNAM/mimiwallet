-- Tracks which fintech micro-lessons a company has completed, powering the
-- personalized learning path (surfaced against the company's weakest credit
-- factors) and the progress bar in LearnPage.

CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  quiz_score INT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, lesson_id)
);

CREATE INDEX learning_progress_company_idx ON public.learning_progress (company_id);

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning progress" ON public.learning_progress
  FOR SELECT USING (company_id IN (SELECT public.user_company_ids(auth.uid())));
CREATE POLICY "Users can insert own learning progress" ON public.learning_progress
  FOR INSERT WITH CHECK (company_id IN (SELECT public.user_company_ids(auth.uid())));
CREATE POLICY "Users can update own learning progress" ON public.learning_progress
  FOR UPDATE USING (company_id IN (SELECT public.user_company_ids(auth.uid())));
