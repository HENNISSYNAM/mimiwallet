# MIMI Wallet — Technical Documentation

FinTechathon 2026 · International Track · Topic E: SME Finance Copilot
Repository: https://github.com/HENNISSYNAM/mimiwallet · Live sandbox: https://www.mimiwallet.online ("Watch 2-min demo", no password)

## 1. What MIMI does

MIMI is an AI finance copilot for household businesses and micro-enterprises in Vietnam. A small-business owner's money all lands in one bank account: customer payments, family transfers, loans, capital. MIMI reads the bank statement and answers four owner tasks, each with figures that point back to the records they came from:

| Task (Topic E requirement) | Capability | What the owner gets |
|---|---|---|
| Business financial analysis | `bao_cao_tai_chinh`, `phan_tich_chenh_lech`, `dong_tien`, `chi_phi_thang` | Cash in/out by month, why a figure changed, who the money went to |
| Separate real revenue | `tien_vao_khong_phai_doanh_thu`, `nghia_vu_thue`, `chuan_bi_han_thue` | Inflows that look like loans, family money, capital or refunds, pointed out with the exact transfer text; tax obligations with legal citations |
| Cash-flow management with alerts | `du_bao_dong_tien` | Three-month net cash-flow forecast in three scenarios plus alerts (shortfall, overdue receivables, customer concentration, volatility, overspending) |
| Financing-option matching | `phuong_an_tai_tro` | Working-capital line, invoice advance, equipment loan and "collect overdue invoices first", each with an estimated capacity computed on **cleaned** cash flow and the conditions still missing |

Design rule that runs through the whole system: **agents prepare, the owner decides.** MIMI never holds money, never moves money and never files anything on the owner's behalf.

## 2. System architecture

```
Browser (React 18 + Vite + TypeScript SPA, PWA; 4 UI languages vi/en/ko/zh)   — Vercel, www.mimiwallet.online
   │  Supabase Auth (Google sign-in; JWT)         │ MIMI Assistant (prompt screen), cursors per agent
   ▼
Supabase (Postgres 17, Row-Level Security, Edge Functions on Deno)
   ├─ tro-ly          assistant: intent → deterministic capabilities → answer (model only writes the words)
   ├─ tac-tu          agent spending control: limits, time windows, recipient caps, approval queue
   ├─ to-khai         tax-form drafts (01/TKN-CNKD, 05/KK-TNCN, business-registration forms)
   ├─ sao-ke          bank-statement ingestion (file upload) and normalisation
   ├─ bank-webhook / cas-webhook   incoming-payment reconciliation (SePay / Casso)
   ├─ subscription-billing         plans, "xu" (AI credit) ledger, reconciliation of top-ups
   ├─ thong-bao       reminders (tax deadlines by tax ID)
   └─ agent-dieu-phoi cloud-agent orchestrator: plan, sign command (Ed25519), run in turns, stop for approval
                           │ signed command (60 s expiry, nonce)
                           ▼
              Vercel function /api/agent-runtime (Node + Playwright + Chromium)
              verifies signature + user JWT; no DB access, holds no secrets
```

Key properties:
- **Numbers come from code, not from the model.** The language model (via OpenRouter) only writes the sentence. Every figure, table and proposed action is computed by deterministic TypeScript in `supabase/functions/_shared/**` from the owner's own rows, and each figure carries `bang_chung` (evidence): the ids of the exact records added into it. A test (`bang-chung.test.ts`) fails the build if fewer than 95% of figures carry evidence.
- **Deterministic fallback.** If no model key is configured or the model fails, `y-dinh.ts` recognises the intent with rules and the same capabilities answer; the product degrades to fixed sentences, never to invented numbers.
- **One data contract.** `_shared/tro-ly/kieu.ts` is imported by both the Deno functions and the browser, so the screen cannot render a field the server does not produce.

## 3. Core algorithms

### 3.1 Revenue from inflows (`_shared/doanh-thu/*`)
Goal: tell the owner how much of the money that arrived is revenue, and whether they are above or below legal thresholds (1 billion VND per year under Decree 141/2026), without ever being confidently wrong.
1. Internal transfers between the owner's own accounts are matched (counter-account known = certain; same amount in/out within a few days = *guess*).
2. Each remaining inflow is classified by the owner's confirmations first; otherwise by transfer text and counterparty (`phan-loai/tien-vao.ts`: loan, capital, family, refund, deposit). A hint is only a **pointer**: nothing is subtracted from revenue until the owner confirms.
3. The system reports a **range** [lower bound = confirmed revenue, upper bound = everything not confirmed non-revenue]. If the range straddles a legal threshold, MIMI **does not state a tax obligation**; it asks exactly one question about the largest uncertain item (`do-chac-chan.ts`).
4. Money is integer VND end to end; no floating point.

### 3.2 Cash-flow forecast and alerts (`_shared/tai-chinh/du-bao.ts`)
- Input: monthly business inflows (cleaned, see 3.3) and outflows from closed months (up to the last six).
- Under three closed months, MIMI refuses to forecast and says what is missing; it never fills numbers in.
- Output: net cash flow for the next three months in three scenarios taken from the percentiles of the owner's own months (good = inflow P75 / outflow P25, base = medians, bad = inflow P25 / outflow P75). This is a coarse range to expose risk, not a statistical model, and MIMI says so. Balance is not forecast because balances are not stored.
- Alerts (named thresholds in `NGUONG`): two of the last three months negative; bad-scenario cumulative shortfall; overdue receivables ≥ 25% of a typical month's inflow; one customer ≥ 40% of inflow (≥ 3 payments); inflow volatility (coefficient of variation ≥ 0.5); current month on pace to exceed median outflow by 30% (only after 30% of the month has passed).

### 3.3 Financing-option matching (`_shared/tai-chinh/phuong-an.ts`)
- Repayment capacity is computed on **cleaned** inflows: anything pointed out as loan, capital, family transfer or refund (unless the owner confirmed it as revenue) is excluded. Otherwise a past loan flatters the file for the next one. A test proves capacity is identical with or without a 500 million VND loan in the statement.
- Options: collect overdue invoices first (no cost), working-capital line, invoice advance on invoices still within terms, equipment loan. Each shows an estimated capacity range and the conditions still missing (months of statements, negative net cash flow, volatility, no purpose given).
- Assumptions are named constants (`GIA_DINH`: 30% of net cash flow for repayment, 10–18% annual rate range, 12/24-month terms, 70% advance rate) and are printed in every answer as **proposed assumptions for illustration, not any lender's criteria**. MIMI does not lend, does not earn commission and does not promise approval.

### 3.4 Other deterministic engines
- Payment reconciliation by score, not by "same amount" (`doi-soat/cham-diem.ts`).
- Abnormal-payment and scam-script detection with a fixed rule set (`bat-thuong/*`), including a hard route for "someone claiming to be police asks me to transfer money" that never answers with a reassuring scan.
- Tax-obligation rule engine with article-level citations and verbatim quotes checked against the gazette store (`luat/*`).

## 4. Security design (summary; full self-assessment in SECURITY_SELF_ASSESSMENT.md)

- **Permission tiers.** 16 actions × 5 company roles (owner, admin, approver, accountant, viewer), each action tagged `read_only`, `reversible`, `sensitive` or `regulated` (`_shared/quyen/vai-tro.ts`). Enforced in the backend of every function; hiding a button is never the check.
- **Agent spending control.** Per-agent monthly limit, allowed time window and recipient cap, enforced on the server by a pure rule function; every spend request is reconciled against the ledger.
- **Approval gates.** Any action with an outside effect waits for the owner. In the cloud runtime a step with `tac_dong: 'ngoai'` (outside effect) only runs if its index is in `da_duyet`, and the runtime also treats any button named like submit/sign/pay/OTP as outside-effect. External steps are never retried.
- **Signed commands.** The orchestrator signs each run command with Ed25519 over canonical JSON; the runtime verifies the signature, a 60-second expiry, a nonce and that the user id equals the JWT subject.
- **Isolation.** Postgres row-level security by company membership; the cloud runtime has no database access and keeps no secrets; each run uses a fresh browser context.
- **Sensitive input is handed to the human.** OTP, CAPTCHA, passwords: the runtime stops with `ban_giao` (hand over). Secrets are never sent to the model.
- **Consent record.** First sign-in records acceptance of terms and privacy policy per version and time in an append-only table (Decree 13/2023 asks that consent be demonstrable).
- **Sign-up control.** New accounts can only be created through Google (database trigger on `auth.users`); admin-invited and admin-created confirmed accounts are allowed.

## 5. Testing and measured results

- 2,362 automated tests (vitest) cover capabilities, routing, permissions, reconciliation, tax rules and UI. Run `npm run test`.
- Adversarial revenue test (`doanh-thu/adversarial.test.ts`): 1,000 held-out generated statements with ground-truth labels, not used to tune the logic. Result: **0/1,000 cases where MIMI stated the wrong side of a legal threshold, against 86/1,000 for the naive "sum every inflow" method**; classification of "confirmed revenue" 100% precise. Honest cost: MIMI stops to ask in 560/1,000 cases.
- MIMI-RevBench-VN (`scripts/bench/revbench.ts`): same statements, same labels, no owner answers, for MIMI, a keyword-rules baseline, a sum-all baseline and three frontier language models. Findings: MIMI removed 0 VND of real revenue (rules: 348 million; one frontier model: 178 million); frontier language models read vague transfer text better than MIMI's rule layer. The benchmark data is synthetic and has a known leak (a one-line "round amount" rule scores well), so these numbers are directional only. Next step: a language-model layer that proposes classifications and never subtracts on its own, validated on anonymised real statements.

## 6. Scope and honesty

- Bank data enters by statement upload and by webhook reconciliation of incoming payments; automatic bank connection through a partner is in acceptance testing and is not claimed as running.
- MIMI does not file tax returns on the owner's behalf; it drafts forms and an owner submits them. It does not connect to the tax authority's systems.
- The sandbox is a fictional shop ("Demo data"); there is no paying customer yet.
