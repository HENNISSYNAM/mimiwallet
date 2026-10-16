# MIMI Wallet — Execution Evidence (Sandbox)

Run on 16/10/2026 against production (https://www.mimiwallet.online), public demo store (fictional data, no login password), `tro-ly` deployed from commit `9341929`. Screen recordings are in the demo video; they were captured by Playwright driving the same public "Watch 2-min demo" button any visitor uses.

## Run 1 — "Forecast my cash flow for the next 3 months" (capability `du_bao_dong_tien`)
Output (rendered by MIMI, figures from deterministic code, each with "View N rows" evidence link):
- Cleaned business inflow, monthly median: 83,321,000 VND (579 source rows).
- Outflow, monthly median: 84,224,500 VND (579 rows).
- Excluded from inflows as "probably not revenue": 18,000,000 VND (6 rows: loan, capital, family, refund).
- Overdue receivables: 27,428,000 VND (2 invoices).
- Net cash flow per month, good / base / bad: +4,564,750 / −903,500 / −9,975,500 VND; three-month cumulative +13,694,250 / −2,710,500 / −29,926,500 VND.
- Alerts raised: 2 of the last 3 months outflow exceeded inflow (net monthly flow over the last three months: +3,247,000 / −1,947,000 / −7,044,000 VND); bad-scenario cumulative shortfall; overdue receivables equal to 33% of a typical month; current month on pace to exceed the median outflow (97,222,000 VND spent after 16 of 31 days).
- Disclosure printed with the answer: net-flow forecast, not a bank balance; scenarios are percentiles of the owner's own months, a risk range, not a statistical model.
- Action offered: "Remind customer to pay" (owner presses; MIMI sends nothing by itself).

## Run 2 — "Should I take a working-capital loan, and how much could I borrow?" (capability `phuong_an_tai_tro`)
- Inputs on cleaned cash flow: inflow 76,811,167 / outflow 77,728,667 / net −917,500 VND per month; 18,000,000 VND excluded as non-revenue.
- Options and verdicts:
  - Collect overdue receivables first: consider, estimated 27,428,000 VND, nothing missing.
  - Working-capital line: **not eligible**, because average net cash flow is negative, so there is nothing to repay with; borrowing would deepen the hole.
  - Invoice advance on invoices not yet due: consider, about 4,967,200 VND (70% advance assumption).
  - Equipment loan: **not eligible**; asks what equipment, price, and effect on revenue or cost.
- Disclosure: estimates use illustrative assumptions, not a lender's terms; MIMI cannot approve, lend or transfer funds.

This shows the intended behaviour: MIMI declines to recommend a loan the data cannot support, and names the cheaper first step.

## Run 3 and 4 — books check and "does my brother's transfer count as revenue?"
Recorded in the video (`ft-en-ky`, `ft-en-doanh-thu`). Revenue separation shows the exact transfer text, and nothing is subtracted until the owner confirms.

## Run 5 — natural-language delegation ("CFO command", capability `lenh_cfo`, commit 2977dec)
Asked in English: "Set my agent: at most 2 million per payment, 20 million a month, ask me above 1 million, office hours only". Also asked in Chinese with the same meaning.
- MIMI read four changes against the agent's stored policy and labelled each one: allowed hours Any time → 08:00–17:30 Mon–Fri (tighter); approval threshold "every payment needs approval" → above 1,000,000 VND (looser); cap per payment 2,000,000 VND (unchanged); cap per month 50,000,000 → 20,000,000 VND (tighter).
- It stated its assumption ("office hours" read as 08:00–17:30, Monday–Friday) instead of guessing silently.
- It replayed the new policy on the agent's 1 request in the last 62 days using the same rule engine (`xetYeuCau`): outcome unchanged, with evidence links to the row.
- Nothing was saved. The only action is "Apply new policy to <agent>", which goes through `tac-tu → luu_chinh_sach` (role check on the server, before/after log). The save is refused with 409 if the policy changed after the preview.
- Covered by 50 unit tests: Vietnamese/English/Chinese parsing; red lines (agent moving money, filing tax, signing, removing caps are refused); contradictory commands get no Apply button; viewer role sees no button; least-privilege role suggestion for people ("let my accountant draft tax forms but not approve payments" → Accountant).

## Automated evidence
- `npx vitest run`: 242 files, 2,445 tests passed (16/10/2026, after the delegation feature).
- `npm run build`: passes. `npx tsc --noEmit -p tsconfig.app.json`: clean.
- Forecast and financing tests: `supabase/functions/_shared/tai-chinh/tai-chinh.test.ts` (refuses under 3 closed months; capacity unchanged by a 500 million VND loan; routing of "does a loan count as revenue" to revenue separation).

## Known rough edges seen in this run
- The assistant's prose followed the English question, but the result cards (titles, column headers, alert sentences) are still in Vietnamese; localisation of the cards is not finished.
- Two answers show literal `**` where the model's markdown was not rendered.
