# MIMI Wallet — Security Self-Assessment

FinTechathon 2026 · International Track · Topic E: SME Finance Copilot

This is a self-assessment by the team. It has **not** been audited by an independent party. Where a control is partial, it says so.

## 1. Permission-tier implementation

Source of truth: `supabase/functions/_shared/quyen/vai-tro.ts`. Every backend function checks the role before acting; hiding a button in the UI is never the control.

Five company roles × sixteen actions. Each action carries an impact level:

| Impact level | Meaning | Who may do it | Extra gate |
|---|---|---|---|
| `read_only` | Looks at data, changes nothing | all roles including viewer | none |
| `reversible` | Changes data that can be undone (categorise, confirm a hint, draft a form) | accountant and above | audit trail |
| `sensitive` | Affects money records or sharing (approve spend, invite member, export) | owner, admin, approver | explicit approval step |
| `regulated` | Touches a legal filing or identity (tax form finalisation, signing) | owner or approver only | approval + MIMI does **not** perform it itself |

Hard limits that no role unlocks (`_shared/thuc-thi/nang-luc.ts`): MIMI does not move money, does not file taxes electronically, and does not sign tax XML. Manual submission by the owner is the only supported path.

### Agent spend control (`tac-tu`)
Per-agent monthly limit, allowed time window, recipient cap. A request that exceeds any of the three is refused by a pure rule function and logged; over-limit spends go to the approval queue, they are never silently accepted.

### Cloud-agent runtime
- Orchestrator signs each command with Ed25519 over canonical JSON; the runtime verifies signature, 60-second expiry, a nonce and that the user id equals the JWT subject.
- A step marked as having an outside effect runs only if the owner approved its index. The runtime also treats buttons named like submit, sign, pay or OTP as outside-effect even if the plan did not mark them.
- OTP, CAPTCHA and passwords are handed back to the human (`ban_giao`); they are never typed by the agent and never sent to a model.
- Outside-effect steps are never auto-retried.
- The runtime has no database access and holds no secrets; each run uses a fresh browser context.

## 2. Data protection and compliance

| Control | Status |
|---|---|
| Row-Level Security by company membership on all business tables | Implemented, tested |
| Consent record (terms, privacy, bank-data use) with version and time, append-only | Implemented 15/10/2026 |
| Sign-up only via Google (database trigger); invited/confirmed accounts allowed | Implemented, applied to production |
| Secrets in server environment only; never in client bundle or model prompts | Implemented |
| Model receives computed summaries and the user's question; no bank credentials, no OTP | Implemented |
| Data-subject rights (export / delete) | Delete and export available on request; not yet self-service for every table |
| Data residency | Supabase region and Vercel edge; not Vietnam-hosted. Gap against Decree 13/2023 cross-border rules for some enterprise customers |
| Encryption in transit / at rest | Provided by the platform (TLS, disk encryption); no customer-managed keys |

## 3. Injection and model-misuse controls

- Figures come from deterministic code with evidence ids; the model writes wording only. A citation-coverage test fails the build if under 95% of figures carry evidence.
- Capability routing is rule-based (`y-dinh.ts`); the model cannot select a capability that performs an outside effect.
- The assistant has no tool that moves money or files a document.

## 4. Known-risk list (honest)

| # | Risk | Likelihood / impact | Current mitigation | Residual gap |
|---|---|---|---|---|
| 1 | **Prompt injection through transfer memo text** (a payer writes instructions in the bank memo that the model later reads) | Medium / Medium | Memo text is data in computed rows; model cannot call effectful tools; figures not taken from model output | A crafted memo could still distort the wording of an answer. No dedicated injection classifier |
| 2 | **Benchmark is synthetic and has a leak** (round-amount rule scores high) | Certain / Medium for claims | Reported as directional only; hold-out seeds kept apart from tuning | No validation yet on real anonymised statements |
| 3 | **Rule layer misses vague memos**; frontier LLMs read them better | High / Low-Med | Hints never subtract revenue without owner confirmation; asks one question | Some inflows stay "uncertain" and cost the owner a tap |
| 4 | **No independent security audit or penetration test** | Certain / High | Self-review, automated tests, RLS tests | No external assurance; no certification (ISO 27001, SOC 2) is claimed |
| 5 | **Runtime scope not restricted by owner choice**: the owner can broaden what the agent may do | Medium / Medium | Defaults are narrow; broadening is logged and requires owner role | A careless owner can over-grant |
| 6 | **Shared public demo account** for the sandbox | Certain / Low | Fictional data only, flagged "Demo data"; no real credentials | Anyone can see the demo data and exhaust demo AI credit |
| 7 | **Third-party bank connectivity** (webhook partners, statement upload) | Medium / High | Webhook signature checks, reconciliation by score, owner confirmation | Partner compromise or mis-sent webhook could create a wrong "paid" mark; owner sees it before any filing |
| 8 | **Financing assumptions are proposals**, not lender criteria | Certain / Medium | Printed with every answer; MIMI does not lend or promise approval | Estimated capacity may differ materially from a real lender's decision |
| 9 | **Forecast is coarse** (percentile scenarios on ≥3 months) | High / Medium | Refuses under 3 closed months; labelled as a range for risk exposure, not a prediction | Seasonal businesses may be misjudged |
| 10 | **Single-owner small teams**: separation of duties often impossible | High / Medium | Roles supported; approver can be an external accountant | Many customers will run as sole owner |
| 11 | **Third-party model provider** (OpenRouter) sees question text and summaries | Certain / Medium | No credentials or full statements sent; fallback works with no model | Provider-side retention outside our control |

## 5. What we do not claim

- No external certification, no regulator approval, no bank partnership.
- No automatic bank connection in production (in partner acceptance testing).
- No electronic tax filing.
- No paying customers yet; the sandbox is fictional data.

## 6. Evidence

- Tests: `npm run test` (2,362 tests at last full run; permissions, routing, reconciliation, forecast, financing).
- Permission matrix: `supabase/functions/_shared/quyen/vai-tro.ts` and its test.
- Cloud runtime design: `docs/CLOUD_AGENT_RUNTIME.md`.
- Sandbox logs: `docs/fintechathon/EXECUTION_EVIDENCE.md`.
