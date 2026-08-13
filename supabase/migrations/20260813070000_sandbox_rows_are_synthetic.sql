-- Every Cas row stored so far came from the sandbox, so none of it is real money.
--
-- The demo connector's rows were separated from real figures by `is_synthetic`
-- in 20260812160000. These slipped past that guard because they arrived through
-- the genuine Cas path — the flag was about *which button* produced the row,
-- when what actually matters is *which environment* answered.
--
-- The sandbox does not replay a fixed statement. It invents a fresh batch on
-- every call: three identical 7-day requests each stored 8 more rows and the
-- table grew 375 → 383, every reference distinct, no two rows sharing a
-- (date, amount, description). The descriptions are drawn from a fixed pool —
-- one appears 15 times across a year with a different amount each time.
--
-- So 383 invented transactions were being summed as this company's revenue.
-- That is the figure the 1 tỷ exemption threshold is decided by.
--
-- BANKHUB_ENV is still `sandbox`; the production keys return CLIENT_NOT_FOUND.
-- Every existing `bankhub:` row therefore came from the sandbox with no
-- exceptions to reason about. `ingest.ts` now sets the flag at write time from
-- the base URL, so this backfill is a one-off and real rows will count as real
-- the moment production credentials are in place.

UPDATE public.transactions
SET is_synthetic = true
WHERE reference_id LIKE 'bankhub:%'
  AND is_synthetic = false;
