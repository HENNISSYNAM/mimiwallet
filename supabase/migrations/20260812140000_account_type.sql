-- Who is this account for: a person, a household business, or a company.
--
-- Three options rather than two, because the split is not cosmetic. From
-- 01/01/2026 lump-sum tax is abolished and a hộ kinh doanh with revenue at or
-- under 1 tỷ/năm is exempt from VAT and PIT, declaring once on 31/01/2027. A
-- registered doanh nghiệp has none of that relief and files under Thông tư
-- 133/2016 regardless of turnover. The same transactions therefore produce
-- different obligations and different reports, so the product has to know which
-- one it is looking at before it can say anything useful about tax.
--
-- `cá nhân` is here for someone who only wants to see their own cash flow. No
-- tax output applies to them and the app should not offer any.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS account_type text;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_account_type_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_account_type_check
  CHECK (account_type IS NULL OR account_type IN ('personal', 'household', 'business'));

COMMENT ON COLUMN public.companies.account_type IS
  'personal | household (hộ kinh doanh) | business (doanh nghiệp). Decides which tax rules and reports apply; null means not asked yet.';
