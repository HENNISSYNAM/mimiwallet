# MIMI Wallet — SME Finance Copilot (FinTechathon 2026, International Track, Topic E)

AI finance copilot for household businesses and micro-enterprises in Vietnam. It reads the owner's bank statement and invoices, separates real revenue from loans/family money/capital, forecasts three months of cash flow with alerts, and matches financing options on cleaned cash flow. **Agents prepare, the owner decides**: MIMI never moves money and never files anything.

- Live sandbox (fictional shop, no password): https://www.mimiwallet.online → "Watch 2-min demo"
- Source: https://github.com/HENNISSYNAM/mimiwallet
- Documents: `TECHNICAL_DOCUMENTATION.md`, `SECURITY_SELF_ASSESSMENT.md`, `EXECUTION_EVIDENCE.md`

## Try it in 2 minutes
1. Open the live sandbox and press **Watch 2-min demo**.
2. Ask: `MIMI, check this month's books` · `Does the money my brother sent count as revenue?` · `Forecast my cash flow for the next 3 months` · `Should I take a working-capital loan, and how much could I borrow?`
3. Each answer lists its figures with the records they came from.

## Where the Topic E logic lives
| Topic E task | Code |
|---|---|
| Financial analysis | `supabase/functions/_shared/tro-ly/tinh-toan.ts` (capability registry) |
| Revenue separation | `supabase/functions/_shared/doanh-thu/`, `_shared/phan-loai/tien-vao.ts` |
| Cash-flow forecast + alerts | `supabase/functions/_shared/tai-chinh/du-bao.ts` |
| Financing match | `supabase/functions/_shared/tai-chinh/phuong-an.ts` |
| Permission tiers | `supabase/functions/_shared/quyen/vai-tro.ts` |
| Agent spend control | `supabase/functions/tac-tu/` |
| Cloud runtime | `api/agent-runtime.ts`, `docs/CLOUD_AGENT_RUNTIME.md` |
| Benchmark | `scripts/bench/revbench.ts` |

## Run locally
Requirements: Node 20+, npm.
```bash
git clone https://github.com/HENNISSYNAM/mimiwallet.git
cd mimiwallet
npm install
cp .env.example .env     # add your own Supabase URL and anon key
npm run dev              # http://localhost:5173
```
The deterministic logic (forecast, financing, revenue separation, permissions) needs no model key and no network; it is covered by unit tests.

## Test cases
```bash
npx vitest run supabase/functions/_shared/tai-chinh   # forecast and financing
npx vitest run supabase/functions/_shared/tro-ly      # capabilities, routing, evidence coverage
npx vitest run supabase/functions/_shared/doanh-thu   # revenue separation incl. 1,000 adversarial held-out cases
npx vitest run                                        # full suite (2,362 tests)
npx tsc --noEmit -p tsconfig.app.json                 # types
npm run build                                         # production build
```
Notable test cases: forecast refuses under 3 closed months; financing capacity is identical with or without a 500 million VND loan in the statement; "does a loan count as revenue?" routes to revenue separation, not financing; every figure carries evidence ids.

## Deploy
- Web: push `main`; Vercel builds with `npm run build`.
- Backend: `npx supabase db push --linked` for migrations; `npx supabase functions deploy tro-ly --project-ref <ref>` for each function.
- Secrets (model key, signing key, webhook secrets) live in Supabase/Vercel environment, never in the repo.

## Limits stated plainly
Bank data enters by statement upload and payment webhooks; direct bank connection is not live. No electronic tax filing. No independent security audit. Financing figures are illustrative assumptions, not any lender's criteria. The benchmark is synthetic and has a known leak; treat its numbers as directional.
