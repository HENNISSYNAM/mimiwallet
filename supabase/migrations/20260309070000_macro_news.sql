-- Macro-economic headlines pulled from public RSS feeds, classified by topic and
-- by likely impact on an SME borrower.
--
-- Deliberately has no company_id: the news itself is the same for everyone, so
-- one row serves every tenant and the feed is fetched once rather than per user.
-- The per-company reading happens at request time in the edge function, which
-- joins this against the caller's own credit factors.

CREATE TABLE public.macro_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  -- Unique so re-running the fetch updates an item instead of duplicating it;
  -- the same story reappears in a feed for hours.
  url TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  published_at TIMESTAMPTZ,
  topic TEXT NOT NULL DEFAULT 'general'
    CHECK (topic IN ('interest_rate', 'credit', 'fx', 'policy', 'general')),
  impact TEXT NOT NULL DEFAULT 'neutral'
    CHECK (impact IN ('positive', 'negative', 'neutral')),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The feed is always read newest-first, and the freshness check that decides
-- whether to re-fetch sorts on this too.
CREATE INDEX macro_news_published_idx ON public.macro_news (published_at DESC NULLS LAST);
CREATE INDEX macro_news_fetched_idx ON public.macro_news (fetched_at DESC);

ALTER TABLE public.macro_news ENABLE ROW LEVEL SECURITY;

-- Read-only for signed-in users. No INSERT/UPDATE policy on purpose: writes come
-- only from the edge function using the service role, so a client cannot inject
-- headlines into what other tenants see.
CREATE POLICY "Signed-in users can read macro news" ON public.macro_news
  FOR SELECT TO authenticated USING (true);
