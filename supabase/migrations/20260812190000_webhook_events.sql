-- Raw log of every webhook Cas posts to us.
--
-- Two reasons this table exists rather than just a console.log:
--
-- 1. We do not know the exact envelope Cas sends. The acceptance test sheet
--    mentions a "TRANSACTIONS" type carrying `paymentMeta.referenceNumber` and
--    a "GRANT" type carrying codes like USER_PERMISSION_REVOKED, but there is
--    no schema in the docs we have. Storing the raw body means the first real
--    delivery teaches us the shape instead of us guessing at it — the same
--    mistake that cost four rounds on the Cas Link flow.
-- 2. The endpoint is unauthenticated by necessity: Casso's webhook form has
--    fields for name, description, URL and category, and no signing secret.
--    An append-only record of what arrived, and what we decided to do about
--    it, is what makes that endpoint auditable.
--
-- Nothing here is trusted. The handler treats a payload as a hint to go ask
-- Cas what the truth is, never as an instruction.

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  -- Whatever we managed to pull out of the body; all nullable because a
  -- payload we cannot parse still has to be recorded.
  event_type text,
  event_code text,
  grant_id text,
  payload jsonb NOT NULL,
  -- What the handler did: 'ignored', 'verified_alive', 'marked_needs_relink',
  -- 'marked_disconnected', 'unverifiable'. Free text so a new outcome does not
  -- need a migration.
  outcome text,
  note text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_received_idx
  ON public.webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS webhook_events_grant_idx
  ON public.webhook_events (grant_id) WHERE grant_id IS NOT NULL;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No policy is granted to anon or authenticated on purpose. Payloads can carry
-- account identifiers, and nobody signing in through the browser has a reason
-- to read another tenant's webhook traffic. The handler writes with the
-- service role, which bypasses RLS; admins read it through the SQL editor.

COMMENT ON TABLE public.webhook_events IS
  'Append-only record of inbound provider webhooks. Untrusted input: the handler verifies against the provider API before changing any state.';
